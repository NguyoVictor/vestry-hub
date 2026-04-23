import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { Send, MessageCircle, ArrowLeft, ChevronLeft, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM");
}

function getInitials(name: string) {
  return (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["bg-orange-500","bg-violet-500","bg-blue-500","bg-emerald-500","bg-pink-500","bg-amber-500","bg-cyan-500"];
function avatarColor(name: string) { return AVATAR_COLORS[(name || "?").charCodeAt(0) % AVATAR_COLORS.length]; }

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <div className={cn("rounded-full flex items-center justify-center text-white font-semibold shrink-0", sz, avatarColor(name))}>
      {getInitials(name)}
    </div>
  );
}

export default function MemberMessages() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["member-conversations", member.memberId],
    queryFn: async () => {
      const { data: participantRows } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", member.memberId);

      const convIds = (participantRows || []).map((r: any) => r.conversation_id);
      if (!convIds.length) return [];

      const { data } = await (supabase as any)
        .from("conversations")
        .select("*, conversation_participants(user_id, unread_count), messages(id, body, created_at, sender_id, is_read)")
        .in("id", convIds)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    staleTime: 30_000,
    refetchInterval: 10_000,
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["member-messages", selectedConvId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConvId!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedConvId,
    refetchInterval: 3_000,
  });

  // ── Helpers — defined before useEffects that call them ───────────────────────
  const markAsRead = useCallback(async (convId: string) => {
    // Reset unread_count for this member in this conversation
    await (supabase as any)
      .from("conversation_participants")
      .update({ unread_count: 0 })
      .eq("conversation_id", convId)
      .eq("user_id", member.userId);
    // Also mark individual messages as read
    await (supabase as any)
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", convId)
      .eq("is_read", false)
      .neq("sender_id", member.userId);
    queryClient.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
  }, [member.userId, member.memberId, queryClient]);

  const selectConversation = useCallback((convId: string) => {
    setSelectedConvId(convId);
    markAsRead(convId);
  }, [markAsRead]);

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedConvId) return;
    const channel = supabase
      .channel(`member-msgs:${selectedConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["member-messages", selectedConvId] });
        queryClient.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId, queryClient, member.memberId]);

  // Reset message input when switching conversations
  useEffect(() => {
    setNewMessage("");
  }, [selectedConvId]);

  // Mark as read when messages arrive
  useEffect(() => {
    if (selectedConvId && messages.length > 0) {
      markAsRead(selectedConvId);
    }
  }, [selectedConvId, messages.length, markAsRead]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (file: File) => {
    if (!selectedConvId) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("File must be under 50MB"); return; }
    setUploading(true);
    try {
      const path = `${member.churchId}/${selectedConvId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from("message-attachments").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(data.path);
      await (supabase as any).from("messages").insert({
        tenant_id: member.churchId,
        conversation_id: selectedConvId,
        sender_id: member.userId,
        body: `📎 ${file.name}`,
        attachment_url: urlData.publicUrl,
        attachment_name: file.name,
        attachment_type: file.type,
        is_read: false,
      });
      await (supabase as any).from("conversations").update({ updated_at: new Date().toISOString(), last_message_preview: `📎 ${file.name}` }).eq("id", selectedConvId);
      // Increment unread for other participants
      const { data: convParticipants } = await (supabase as any)
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", selectedConvId)
        .neq("user_id", member.userId);
      for (const p of (convParticipants || [])) {
        await (supabase as any).rpc("increment_unread_count", {
          p_conversation_id: selectedConvId,
          p_user_id: p.user_id,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["member-messages", selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
      toast.success("File sent");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ── Send mutation ─────────────────────────────────────────────────────────────
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedConvId || !newMessage.trim()) return;
      const { error } = await (supabase as any).from("messages").insert({
        tenant_id: member.churchId,
        conversation_id: selectedConvId,
        sender_id: member.userId,
        body: newMessage.trim(),
        is_read: false,
      });
      if (error) throw error;
      await (supabase as any).from("conversations").update({
        updated_at: new Date().toISOString(),
        last_message_preview: newMessage.trim().slice(0, 100),
      }).eq("id", selectedConvId);
      // Increment unread_count for all other participants in this conversation
      const { data: convParticipants } = await (supabase as any)
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", selectedConvId)
        .neq("user_id", member.userId);
      for (const p of (convParticipants || [])) {
        await (supabase as any).rpc("increment_unread_count", {
          p_conversation_id: selectedConvId,
          p_user_id: p.user_id,
        });
      }
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["member-messages", selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
    },
    onError: () => toast.error("Failed to send message"),
  });

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedConv = conversations.find((c: any) => c.id === selectedConvId);
  const staffName = selectedConv?.staff_name || selectedConv?.name || selectedConv?.title || "Church Staff";

  return (
    <>
      <Helmet><title>Messages — Vestry</title></Helmet>
      <div className="max-w-4xl mx-auto">
        <div className={cn("flex items-center gap-3 mb-4", selectedConvId ? "hidden md:flex" : "flex")}>
          <button onClick={() => navigate("/member")}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <p className="text-xs font-medium text-slate-500">{member.churchName}</p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Messages</h1>
            <p className="text-xs text-slate-400">Direct messages from church staff</p>
          </div>
        </div>

        <div className="flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
          style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>

          {/* Left: Conversation list */}
          <div className={cn("w-full md:w-72 border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0",
            selectedConvId ? "hidden md:flex" : "flex")}>
            <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Conversations</p>
              <p className="text-xs text-slate-400 mt-0.5">Messages from your church</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {convsLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No messages yet</p>
                  <p className="text-xs text-slate-400">Church staff will reach out to you here</p>
                </div>
              ) : conversations.map((conv: any) => {
                const msgs = conv.messages || [];
                const lastMsg = msgs[msgs.length - 1];
                const myParticipant = (conv.conversation_participants || []).find((p: any) => p.user_id === member.userId);
                const unread = myParticipant?.unread_count ?? 0;
                const name = conv.staff_name || conv.name || conv.title || "Church Staff";
                const isSelected = selectedConvId === conv.id;
                return (
                  <button key={conv.id} onClick={() => selectConversation(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left border-b border-slate-50 dark:border-slate-800/60",
                      isSelected && "bg-orange-50 dark:bg-orange-900/10 border-l-2 border-l-orange-500"
                    )}>
                    <Avatar name={name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn("text-sm truncate", isSelected ? "font-semibold text-orange-600" : "font-medium text-slate-800 dark:text-white")}>{name}</p>
                        {lastMsg && <p className="text-[11px] text-slate-400 shrink-0">{formatMsgTime(lastMsg.created_at)}</p>}
                      </div>
                      {lastMsg && <p className="text-xs text-slate-400 truncate mt-0.5">{lastMsg.body || ""}</p>}
                    </div>
                    {unread > 0 && (
                      <span className="h-5 min-w-[20px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Chat panel */}
          <div className={cn("flex-1 flex flex-col min-w-0", !selectedConvId ? "hidden md:flex" : "flex")}>
            {!selectedConvId ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <MessageCircle className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Select a conversation</p>
                <p className="text-xs text-slate-400">Choose a conversation from the left to start reading</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <button className="md:hidden h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                    onClick={() => setSelectedConvId(null)}>
                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                  </button>
                  <Avatar name={staffName} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{staffName}</p>
                    <p className="text-xs text-slate-400">Church Staff</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
                  {msgsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                          <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-48" : "w-36")} />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-12">No messages yet</p>
                  ) : messages.map((msg: any) => {
                    const isMe = msg.sender_id === member.userId;
                    return (
                      <div key={msg.id} className={cn("flex gap-2 group", isMe ? "justify-end" : "justify-start")}>
                        {!isMe && <Avatar name={staffName} size="sm" />}
                        <div className="flex items-end gap-1.5">
                          {isMe && (
                            <button
                              onClick={async () => {
                                if (!confirm("Delete this message for everyone?")) return;
                                await (supabase as any).from("messages").delete().eq("id", msg.id);
                                queryClient.invalidateQueries({ queryKey: ["member-messages", selectedConvId] });
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 shrink-0 mb-1"
                              title="Delete message"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                          <div className={cn("max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm",
                            isMe
                              ? "bg-orange-500 text-white rounded-br-sm"
                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-sm border border-slate-100 dark:border-slate-700"
                          )}>
                            {(msg as any).attachment_url ? (
                              <a href={(msg as any).attachment_url} target="_blank" rel="noopener noreferrer"
                                className={cn("flex items-center gap-2 underline text-sm", isMe ? "text-white" : "text-orange-600")}>
                                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                {(msg as any).attachment_name || "Attachment"}
                              </a>
                            ) : (
                              <p className="text-sm leading-relaxed">{msg.body || ""}</p>
                            )}
                            <p className={cn("text-[11px] mt-1", isMe ? "text-orange-100" : "text-slate-400")}>
                              {format(new Date(msg.created_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
                  />
                  <button
                    className="text-slate-400 hover:text-orange-500 shrink-0 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    placeholder={uploading ? "Uploading..." : "Type a message..."}
                    className="rounded-full border-slate-200 focus:border-orange-400 focus:ring-orange-400/10"
                    disabled={uploading}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage.mutate()} />
                  <Button size="icon"
                    className="rounded-full h-10 w-10 shrink-0 bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => sendMessage.mutate()}
                    disabled={!newMessage.trim() || sendMessage.isPending || uploading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
