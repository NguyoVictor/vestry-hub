import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MemberMessages() {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations this member is part of
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["member-conversations", member.memberId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("conversations")
        .select("*, messages(id, content, created_at, sender_id, is_read)")
        .or(`member_id.eq.${member.memberId},participant_ids.cs.{${member.memberId}}`)
        .order("updated_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch messages for selected conversation
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
    refetchInterval: 3000, // Poll every 3s for new messages
  });

  // Realtime subscription
  useEffect(() => {
    if (!selectedConvId) return;
    const channel = supabase
      .channel(`messages:${selectedConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["member-messages", selectedConvId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedConvId || !newMessage.trim()) return;
      const { error } = await (supabase as any).from("messages").insert({
        conversation_id: selectedConvId,
        sender_id: member.userId,
        sender_name: `${member.firstName} ${member.lastName}`,
        content: newMessage.trim(),
        is_read: false,
      });
      if (error) throw error;
      // Update conversation updated_at
      await (supabase as any).from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConvId);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["member-messages", selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
    },
    onError: () => toast.error("Failed to send message"),
  });

  const selectedConv = conversations.find((c: any) => c.id === selectedConvId);

  return (
    <>
      <Helmet><title>Messages — Vestry</title></Helmet>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>

        <div className="flex gap-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: 400 }}>
          {/* Left — Conversations list */}
          <div className={cn("w-full md:w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0", selectedConvId ? "hidden md:flex" : "flex")}>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <p className="text-sm font-semibold">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {convsLoading ? (
                <div className="p-3 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                  <MessageCircle className="h-8 w-8 mb-2 text-slate-300" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Staff members can initiate conversations with you</p>
                </div>
              ) : (
                conversations.map((conv: any) => {
                  const lastMsg = conv.messages?.[conv.messages.length - 1];
                  const unread = conv.messages?.filter((m: any) => !m.is_read && m.sender_id !== member.userId).length || 0;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left",
                        selectedConvId === conv.id && "bg-indigo-50 dark:bg-indigo-900/20"
                      )}
                    >
                      <MemberAvatar name={conv.staff_name || conv.title || "Staff"} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{conv.staff_name || conv.title || "Staff"}</p>
                          {lastMsg && <p className="text-xs text-muted-foreground shrink-0 ml-1">{formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false })}</p>}
                        </div>
                        {lastMsg && <p className="text-xs text-muted-foreground truncate">{lastMsg.content}</p>}
                      </div>
                      {unread > 0 && (
                        <span className="h-5 w-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shrink-0">{unread}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right — Chat panel */}
          <div className={cn("flex-1 flex flex-col", !selectedConvId ? "hidden md:flex" : "flex")}>
            {!selectedConvId ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="h-10 w-10 mb-3 text-slate-300" />
                <p>Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-800">
                  <button className="md:hidden text-muted-foreground" onClick={() => setSelectedConvId(null)}>←</button>
                  <MemberAvatar name={selectedConv?.staff_name || "Staff"} size="sm" />
                  <div>
                    <p className="text-sm font-semibold">{selectedConv?.staff_name || selectedConv?.title || "Staff"}</p>
                    <p className="text-xs text-muted-foreground">Church Staff</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {msgsLoading ? (
                    <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-3/4 rounded-xl" />)}</div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hello!</p>
                  ) : (
                    messages.map((msg: any) => {
                      const isMe = msg.sender_id === member.userId;
                      return (
                        <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                            isMe
                              ? "bg-indigo-600 text-white rounded-br-sm"
                              : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-bl-sm"
                          )}>
                            <p>{msg.content}</p>
                            <p className={cn("text-xs mt-1", isMe ? "text-indigo-200" : "text-muted-foreground")}>
                              {format(new Date(msg.created_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="rounded-full"
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage.mutate()}
                  />
                  <Button
                    size="icon"
                    className="rounded-full h-10 w-10 shrink-0"
                    onClick={() => sendMessage.mutate()}
                    disabled={!newMessage.trim() || sendMessage.isPending}
                  >
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
