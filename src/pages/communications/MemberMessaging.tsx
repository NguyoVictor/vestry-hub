import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  MessageCircle, Send, Plus, Search, ArrowLeft, RefreshCw,
  Users, MessageSquare, Megaphone, User, MoreVertical,
  Paperclip, CheckCheck, Check, X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Conversation {
  id: string; tenant_id: string; type: string; name: string | null;
  description: string | null; status: string; is_forum: boolean;
  last_message_preview: string | null; last_message_at: string | null;
  created_by: string | null; created_at: string;
  conversation_participants?: { user_id: string; unread_count: number; last_read_at: string | null }[];
}
interface Message {
  id: string; conversation_id: string | null; sender_id: string;
  recipient_id: string | null; body: string; is_read: boolean;
  read_at: string | null; created_at: string;
}
interface Member { id: string; first_name: string | null; last_name: string | null; email: string | null; status: string | null; }
interface UserRow { id: string; first_name: string | null; last_name: string | null; email: string | null; role: string; }

// ── Avatar helper ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["bg-orange-500", "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500", "bg-cyan-500"];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  return (
    <div className={cn("rounded-full flex items-center justify-center text-white font-semibold shrink-0", sz, avatarColor(name || "?"))}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

// ── New Message Modal ─────────────────────────────────────────────────────────
function NewMessageModal({ open, onClose, tenantId, userId, userName, onConversationCreated }: {
  open: boolean; onClose: () => void; tenantId: string; userId: string; userName: string;
  onConversationCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [sendTo, setSendTo] = useState<"forum" | "all" | "specific">("forum");
  const [message, setMessage] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [sending, setSending] = useState(false);

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members-messaging", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name, email, status").eq("tenant_id", tenantId).order("first_name");
      return (data ?? []) as Member[];
    },
    staleTime: 300_000, enabled: open,
  });

  const { data: users = [] } = useQuery<UserRow[]>({
    queryKey: ["users-messaging", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name, email, role").eq("tenant_id", tenantId);
      return (data ?? []) as UserRow[];
    },
    staleTime: 300_000, enabled: open,
  });

  const reset = () => { setMessage(""); setSelectedMemberId(""); setSendTo("forum"); };

  const handleSend = async () => {
    if (!message.trim()) { toast.error("Message is required."); return; }
    setSending(true);
    try {
      if (sendTo === "forum") {
        // Find or create Church Forum conversation
        let { data: forum } = await supabase.from("conversations").select("id").eq("tenant_id", tenantId).eq("is_forum", true).maybeSingle();
        if (!forum) {
          const { data: newForum } = await supabase.from("conversations").insert({ tenant_id: tenantId, type: "group", name: "Church Forum", description: "Main church community forum where all members can connect", is_forum: true, created_by: userId, status: "open" } as any).select("id").single();
          forum = newForum;
        }
        if (!forum) throw new Error("Could not create forum");
        await supabase.from("messages").insert({ tenant_id: tenantId, conversation_id: forum.id, sender_id: userId, body: message.trim() } as any);
        await supabase.from("conversations").update({ last_message_preview: message.trim().slice(0, 100), last_message_at: new Date().toISOString() }).eq("id", forum.id);
        // Notify all members
        const notifs = users.filter(u => u.id !== userId).map(u => ({ tenant_id: tenantId, user_id: u.id, type: "broadcast", title: `${userName} posted in Church Forum`, body: message.trim().slice(0, 50), is_read: false }));
        if (notifs.length) await supabase.from(TABLES.NOTIFICATIONS).insert(notifs as any);
        qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
        qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
        toast.success("✅ Posted to Church Forum");
        onConversationCreated(forum.id);
        onClose(); reset();

      } else if (sendTo === "all") {
        // Send to each member individually
        let count = 0;
        for (const u of users.filter(u => u.id !== userId)) {
          const { data: existing } = await supabase.from("conversations").select("id, conversation_participants!inner(user_id)").eq("tenant_id", tenantId).eq("type", "direct").eq("conversation_participants.user_id", u.id).maybeSingle();
          let convId = existing?.id;
          if (!convId) {
            const { data: newConv } = await supabase.from("conversations").insert({ tenant_id: tenantId, type: "direct", created_by: userId, status: "open" } as any).select("id").single();
            convId = newConv?.id;
            if (convId) {
              await supabase.from("conversation_participants").insert([{ conversation_id: convId, user_id: userId }, { conversation_id: convId, user_id: u.id }]);
            }
          }
          if (convId) {
            await supabase.from("messages").insert({ tenant_id: tenantId, conversation_id: convId, sender_id: userId, recipient_id: u.id, body: message.trim() } as any);
            await supabase.from("conversations").update({ last_message_preview: message.trim().slice(0, 100), last_message_at: new Date().toISOString() }).eq("id", convId);
            await supabase.from(TABLES.NOTIFICATIONS).insert({ tenant_id: tenantId, user_id: u.id, type: "message", title: `New message from ${userName}`, body: message.trim().slice(0, 50), is_read: false } as any);
            count++;
          }
        }
        qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
        toast.success(`✅ Message sent to ${count} members`);
        onClose(); reset();

      } else if (sendTo === "specific") {
        if (!selectedMemberId) { toast.error("Select a member."); setSending(false); return; }
        const targetUser = users.find(u => u.id === selectedMemberId) ?? members.find(m => m.id === selectedMemberId);
        // Check for existing direct conversation
        const { data: existing } = await supabase.from("conversations").select("id, conversation_participants!inner(user_id)").eq("tenant_id", tenantId).eq("type", "direct").eq("conversation_participants.user_id", selectedMemberId).maybeSingle();
        let convId = existing?.id;
        if (!convId) {
          const { data: newConv } = await supabase.from("conversations").insert({ tenant_id: tenantId, type: "direct", created_by: userId, status: "open" } as any).select("id").single();
          convId = newConv?.id;
          if (convId) {
            await supabase.from("conversation_participants").insert([{ conversation_id: convId, user_id: userId }, { conversation_id: convId, user_id: selectedMemberId }]);
          }
        }
        if (!convId) throw new Error("Could not create conversation");
        await supabase.from("messages").insert({ tenant_id: tenantId, conversation_id: convId, sender_id: userId, recipient_id: selectedMemberId, body: message.trim() } as any);
        await supabase.from("conversations").update({ last_message_preview: message.trim().slice(0, 100), last_message_at: new Date().toISOString() }).eq("id", convId);
        await supabase.from(TABLES.NOTIFICATIONS).insert({ tenant_id: tenantId, user_id: selectedMemberId, type: "message", title: `New message from ${userName}`, body: message.trim().slice(0, 50), is_read: false } as any);
        qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
        const name = targetUser ? `${(targetUser as any).first_name ?? ""} ${(targetUser as any).last_name ?? ""}`.trim() : "member";
        toast.success(`✅ Message sent to ${name}`);
        onConversationCreated(convId);
        onClose(); reset();
      }
    } catch (err: unknown) { toast.error((err as Error)?.message ?? "Failed to send."); }
    finally { setSending(false); }
  };

  const allUsers = users.filter(u => u.id !== userId);
  const memberCount = allUsers.length;

  const sendToOptions: { key: "forum" | "all" | "specific"; icon: React.ElementType; label: string }[] = [
    { key: "forum", icon: Megaphone, label: "Church Forum" },
    { key: "all", icon: Users, label: `All Members (${memberCount})` },
    { key: "specific", icon: User, label: "Specific Member" },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><MessageSquare className="h-4 w-4 text-orange-500" /></div>
            <div>
              <DialogTitle className="text-base font-semibold">New Message</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Send a message to the church forum, all members, or a specific member</p>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Send To */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Send To</Label>
            <div className="grid grid-cols-2 gap-2">
              {sendToOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.key} onClick={() => setSendTo(opt.key)} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors", sendTo === opt.key ? "bg-orange-500 text-white border-orange-500" : "border-slate-200 text-slate-700 hover:bg-slate-50")}>
                    <Icon className="h-4 w-4 shrink-0" />{opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info box */}
          {sendTo === "forum" && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-700">
              📢 This message will be posted to the <strong>Church Forum</strong> where all members can see it publicly.
            </div>
          )}
          {sendTo === "all" && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600">
              This message will be sent to all {memberCount} church members. Each member will receive it as a direct message in their inbox.
            </div>
          )}

          {/* Specific member selector */}
          {sendTo === "specific" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Select Member <span className="text-red-500">*</span></Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="focus:ring-orange-400 focus:border-orange-400"><SelectValue placeholder="Choose a member..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {allUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {`${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Message <span className="text-red-500">*</span></Label>
            <Textarea placeholder="Type your message here..." value={message} onChange={e => setMessage(e.target.value)} rows={5} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSend} disabled={sending || !message.trim() || (sendTo === "specific" && !selectedMemberId)}>
            {sending ? "Sending..." : sendTo === "forum" ? "Post to Forum" : sendTo === "all" ? `Send to All (${memberCount})` : "Send Message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ conv, userId, tenantId, userName, onBack, onClose }: {
  conv: Conversation; userId: string; tenantId: string; userName: string;
  onBack: () => void; onClose: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], refetch } = useQuery<Message[]>({
    queryKey: ["messages-conv", conv.id],
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true }).limit(200);
      return (data ?? []) as Message[];
    },
    staleTime: 10_000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["conv-participants", conv.id],
    queryFn: async () => {
      const { data } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", conv.id);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-messaging", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name, role").eq("tenant_id", tenantId);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: membersList = [] } = useQuery({
    queryKey: ["members-messaging-dm", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name").eq("tenant_id", tenantId);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const getUserName = (id: string) => {
    const m = (membersList as any[]).find(m => m.id === id);
    if (m?.first_name) return `${m.first_name} ${m.last_name ?? ""}`.trim();
    const u = (users as any[]).find(u => u.id === id);
    return u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Unknown" : "Unknown";
  };
  useEffect(() => {
    const channel = supabase.channel(`conv-${conv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` }, () => {
        refetch();
        qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
        qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conv.id, tenantId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMsg = useMutation({
    mutationFn: async () => {
      if (!input.trim()) return;
      const { error } = await supabase.from("messages").insert({
        tenant_id: tenantId,
        conversation_id: conv.id,
        sender_id: userId,
        body: input.trim(),
      } as any);
      if (error) throw error;
      await supabase.from("conversations").update({
        last_message_preview: input.trim().slice(0, 100),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", conv.id);
      // Notify other participants
      for (const p of participants.filter((p: any) => p.user_id !== userId)) {
        await supabase.from(TABLES.NOTIFICATIONS).insert({ tenant_id: tenantId, user_id: (p as any).user_id, type: "message", title: conv.type === "group" ? `${userName} in ${conv.name ?? "Group"}` : `New message from ${userName}`, body: input.trim().slice(0, 50), is_read: false } as any);
      }
    },
    onSuccess: () => { setInput(""); refetch(); qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] }); },
    onError: (err: any) => toast.error(err.message || "Failed to send message"),
  });

  const otherName = conv.type === "group" || conv.is_forum ? (conv.name ?? "Group") : getUserName(participants.find((p: any) => p.user_id !== userId)?.user_id ?? "");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden text-slate-400 hover:text-slate-600"><ArrowLeft className="h-4 w-4" /></button>
          <Avatar name={otherName} size="sm" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{otherName}</p>
            <p className="text-xs text-slate-400">{conv.type === "group" || conv.is_forum ? `${participants.length} members` : "Direct Message"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conv.status === "open" && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onClose(conv.id)}>Close Conversation</Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><MoreVertical className="h-4 w-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 cursor-pointer text-xs">View Member Profile</DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer text-xs">Mark as Unread</DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer text-xs text-red-500 focus:text-red-500">Delete Conversation</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No messages yet. Send the first one!</p>
          ) : messages.map(msg => {
            const isOwn = msg.sender_id === userId;
            const senderName = getUserName(msg.sender_id);
            return (
              <div key={msg.id} className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
                {(conv.type === "group" || conv.is_forum) && !isOwn && (
                  <p className="text-[10px] text-slate-400 mb-0.5 ml-1">{senderName}</p>
                )}
                <div className={cn("max-w-[70%] px-4 py-2.5 rounded-2xl text-sm", isOwn ? "bg-orange-500 text-white rounded-br-sm" : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm")}>
                  <p className="leading-relaxed">{msg.body}</p>
                  <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
                    <span className={cn("text-[10px]", isOwn ? "text-orange-200" : "text-slate-400")}>
                      {msg.created_at ? format(new Date(msg.created_at), "HH:mm") : ""}
                    </span>
                    {isOwn && (
                      msg.read_at
                        ? <CheckCheck className="h-3 w-3 text-blue-300" />
                        : <Check className="h-3 w-3 text-orange-200" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-700">
        <button className="text-slate-400 hover:text-slate-600 shrink-0"><Paperclip className="h-4 w-4" /></button>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 text-sm"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg.mutate(); } }}
        />
        <button
          onClick={() => sendMsg.mutate()}
          disabled={!input.trim() || sendMsg.isPending}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Direct Messages Tab ───────────────────────────────────────────────────────
function DirectMessagesTab({ tenantId, userId, userName }: { tenantId: string; userId: string; userName: string }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread" | "open" | "closed">("all");
  const [search, setSearch] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newMsgOpen, setNewMsgOpen] = useState(false);

  const { data: conversations = [], isLoading, refetch } = useQuery<Conversation[]>({
    queryKey: ["conversations-dm", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("conversations").select("*, conversation_participants(user_id, unread_count, last_read_at)").eq("tenant_id", tenantId).eq("type", "direct").order("last_message_at", { ascending: false, nullsFirst: false });
      return (data ?? []) as Conversation[];
    },
    staleTime: 30_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-messaging", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name, role").eq("tenant_id", tenantId);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: membersList = [] } = useQuery({
    queryKey: ["members-messaging-dm", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name").eq("tenant_id", tenantId);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // Merged lookup: check members table first (portal users), then users table (admin users)
  const getOtherUser = (conv: Conversation) => {
    const other = conv.conversation_participants?.find(p => p.user_id !== userId);
    if (!other) return null;
    const fromMembers = (membersList as any[]).find(m => m.id === other.user_id);
    if (fromMembers?.first_name) return fromMembers;
    return (users as any[]).find(u => u.id === other.user_id) ?? null;
  };

  const getUnread = (conv: Conversation) => {
    const p = conv.conversation_participants?.find(p => p.user_id === userId);
    return p?.unread_count ?? 0;
  };

  const filtered = conversations.filter(c => {
    const other = getOtherUser(c);
    const name = other ? `${other.first_name ?? ""} ${other.last_name ?? ""}`.toLowerCase() : "";
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "unread" && getUnread(c) > 0) || (filter === "open" && c.status === "open") || (filter === "closed" && c.status === "closed");
    return matchSearch && matchFilter;
  });

  const closeConversation = async (id: string) => {
    await supabase.from("conversations").update({ status: "closed" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
    toast.success("Conversation closed.");
  };

  const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 260px)", minHeight: 500 }}>
      <div className="flex h-full">
        {/* Left: conversation list */}
        <div className={cn("flex flex-col border-r border-slate-100 dark:border-slate-700", selectedConvId ? "hidden lg:flex lg:w-[35%]" : "w-full lg:w-[35%]")}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><MessageCircle className="h-4 w-4 text-orange-500" /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Member Messaging</p>
                  <p className="text-xs text-slate-500">Direct messages with church members</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /></Button>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1" onClick={() => setNewMsgOpen(true)}><Plus className="h-3.5 w-3.5" />New Message</Button>
              </div>
            </div>
            {/* Filter tabs */}
            <div className="flex items-center gap-1 mb-2">
              {(["all", "unread", "open", "closed"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors", filter === f ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{f}</button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Search by member name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <MessageCircle className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs">Start a conversation with a member</p>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1 mt-1" onClick={() => setNewMsgOpen(true)}><Plus className="h-3.5 w-3.5" />New Message</Button>
              </div>
            ) : filtered.map(conv => {
              const other = getOtherUser(conv);
              const name = other ? `${other.first_name ?? ""} ${other.last_name ?? ""}`.trim() : "Unknown";
              const unread = getUnread(conv);
              const isSelected = selectedConvId === conv.id;
              return (
                <button key={conv.id} onClick={() => setSelectedConvId(conv.id)} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50", isSelected && "bg-orange-50 dark:bg-orange-900/20 border-l-2 border-l-orange-500")}>
                  <div className="relative shrink-0">
                    <Avatar name={name} size="md" />
                    <div className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white", conv.status === "open" ? "bg-emerald-500" : "bg-slate-400")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</p>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">{conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false }) : ""}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{conv.last_message_preview ?? "No messages yet"}</p>
                  </div>
                  {unread > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-semibold shrink-0">{unread}</span>}
                </button>
              );
            })}
          </ScrollArea>
        </div>

        {/* Right: chat panel */}
        <div className={cn("flex-1 flex flex-col", !selectedConvId ? "hidden lg:flex" : "")}>
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <MessageCircle className="h-14 w-14 opacity-20" />
              <p className="text-base font-medium">Select a conversation</p>
              <p className="text-sm">Or start a new one</p>
            </div>
          ) : (
            <ChatPanel conv={selectedConv} userId={userId} tenantId={tenantId} userName={userName} onBack={() => setSelectedConvId(null)} onClose={closeConversation} />
          )}
        </div>
      </div>

      <NewMessageModal open={newMsgOpen} onClose={() => setNewMsgOpen(false)} tenantId={tenantId} userId={userId} userName={userName} onConversationCreated={id => { setSelectedConvId(id); qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] }); }} />
    </div>
  );
}

// ── Create Group Modal ────────────────────────────────────────────────────────
function CreateGroupModal({ open, onClose, tenantId, userId, onCreated }: { open: boolean; onClose: () => void; tenantId: string; userId: string; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["users-messaging", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name, email, role").eq("tenant_id", tenantId);
      return data ?? [];
    },
    staleTime: 300_000, enabled: open,
  });

  const others = users.filter((u: any) => u.id !== userId);
  const filtered = others.filter((u: any) => {
    const q = memberSearch.toLowerCase();
    return `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  const toggle = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Group name is required."); return; }
    if (selectedIds.size === 0) { toast.error("Add at least one member."); return; }
    setCreating(true);
    try {
      const { data: conv } = await supabase.from("conversations").insert({ tenant_id: tenantId, type: "group", name: name.trim(), description: description.trim() || null, created_by: userId, status: "open" } as any).select("id").single();
      if (!conv) throw new Error("Failed to create group");
      const participants = [userId, ...Array.from(selectedIds)].map(uid => ({ conversation_id: conv.id, user_id: uid }));
      await supabase.from("conversation_participants").insert(participants);
      qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
      toast.success("✅ Group created successfully");
      onCreated(conv.id);
      onClose();
      setName(""); setDescription(""); setSelectedIds(new Set()); setMemberSearch("");
    } catch (err: unknown) { toast.error((err as Error)?.message ?? "Failed to create group."); }
    finally { setCreating(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><Users className="h-4 w-4 text-orange-500" /></div>
            <div>
              <DialogTitle className="text-base font-semibold">Create Group Chat</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Create a new group and add members to start chatting</p>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Group Name <span className="text-red-500">*</span></Label>
            <Input placeholder="Enter group name..." value={name} onChange={e => setName(e.target.value)} className="focus:ring-orange-400 focus:border-orange-400" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Textarea placeholder="What's this group about?" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Add Members <span className="text-red-500">*</span></Label>
              <button onClick={() => setSelectedIds(new Set(others.map((u: any) => u.id)))} className="text-xs text-orange-500 hover:underline">Select All ({others.length})</button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Search members..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <div className="rounded-lg border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100">
              {filtered.map((u: any) => {
                const uname = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—";
                const sel = selectedIds.has(u.id);
                return (
                  <button key={u.id} onClick={() => toggle(u.id)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors", sel ? "bg-orange-50" : "hover:bg-slate-50")}>
                    <div className={cn("h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors", sel ? "border-orange-500 bg-orange-500" : "border-slate-300")}>
                      {sel && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                    <Avatar name={uname} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{uname}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email ?? "—"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedIds.size > 0 && <p className="text-xs text-orange-600 font-medium">{selectedIds.size} member{selectedIds.size !== 1 ? "s" : ""} selected</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleCreate} disabled={creating || !name.trim() || selectedIds.size === 0}>
            {creating ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Group Chats Tab ───────────────────────────────────────────────────────────
function GroupChatsTab({ tenantId, userId, userName }: { tenantId: string; userId: string; userName: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: conversations = [], isLoading, refetch } = useQuery<Conversation[]>({
    queryKey: ["conversations-group", tenantId],
    queryFn: async () => {
      // Ensure Church Forum exists
      const { data: existing } = await supabase.from("conversations").select("id").eq("tenant_id", tenantId).eq("is_forum", true).maybeSingle();
      if (!existing) {
        const { data: forum } = await supabase.from("conversations").insert({ tenant_id: tenantId, type: "group", name: "Church Forum", description: "Main church community forum where all members can connect", is_forum: true, created_by: userId, status: "open" } as any).select("id").single();
        if (forum) {
          // Add all users as participants
          const { data: allUsers } = await supabase.from("users").select("id").eq("tenant_id", tenantId);
          if (allUsers?.length) {
            await supabase.from("conversation_participants").insert(allUsers.map(u => ({ conversation_id: forum.id, user_id: u.id })));
          }
        }
      }
      const { data } = await supabase.from("conversations").select("*, conversation_participants(user_id, unread_count)").eq("tenant_id", tenantId).in("type", ["group"]).order("is_forum", { ascending: false }).order("last_message_at", { ascending: false, nullsFirst: false });
      return (data ?? []) as Conversation[];
    },
    staleTime: 30_000,
  });

  const filtered = conversations.filter(c => !search || (c.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null;

  const closeConversation = async (id: string) => {
    await supabase.from("conversations").update({ status: "closed" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 260px)", minHeight: 500 }}>
      <div className="flex h-full">
        {/* Left */}
        <div className={cn("flex flex-col border-r border-slate-100 dark:border-slate-700", selectedConvId ? "hidden lg:flex lg:w-[35%]" : "w-full lg:w-[35%]")}>
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><Users className="h-4 w-4 text-orange-500" /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Group Chats ✨</p>
                  <p className="text-xs text-slate-500">Connect & chat with your community ✨</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /></Button>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" />New Group</Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filtered.map(conv => {
              const memberCount = conv.conversation_participants?.length ?? 0;
              const isSelected = selectedConvId === conv.id;
              const groupName = conv.name ?? "Group";
              return (
                <button key={conv.id} onClick={() => setSelectedConvId(conv.id)} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50", isSelected && "bg-orange-50 dark:bg-orange-900/20 border-l-2 border-l-orange-500")}>
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold text-sm shrink-0", conv.is_forum ? "bg-orange-500" : avatarColor(groupName))}>
                    {conv.is_forum ? "⛪" : groupName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{groupName}</p>
                      {conv.is_forum && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">System</span>}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{conv.description ?? "No description"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{conv.last_message_at ? `Active ${formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}` : "No activity yet"} · {memberCount} members</p>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </div>

        {/* Right */}
        <div className={cn("flex-1 flex flex-col", !selectedConvId ? "hidden lg:flex" : "")}>
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Users className="h-14 w-14 opacity-20" />
              <p className="text-base font-medium">Select a group</p>
              <p className="text-sm">Or create a new one</p>
            </div>
          ) : (
            <ChatPanel conv={selectedConv} userId={userId} tenantId={tenantId} userName={userName} onBack={() => setSelectedConvId(null)} onClose={closeConversation} />
          )}
        </div>
      </div>
      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} tenantId={tenantId} userId={userId} onCreated={id => { setSelectedConvId(id); qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] }); }} />
    </div>
  );
}

// ── WhatsApp Tab ──────────────────────────────────────────────────────────────
function WhatsAppTab() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 flex flex-col items-center text-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10">
        <span className="text-3xl">💚</span>
      </div>
      <div>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">WhatsApp Conversations</p>
        <p className="text-sm text-slate-500 mt-0.5">View and respond to member WhatsApp messages</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 max-w-md w-full">
        <p className="text-base font-semibold text-slate-700 mb-2">💚 WhatsApp Integration Coming Soon</p>
        <p className="text-sm text-slate-500 leading-relaxed">Connect your WhatsApp Business Account to message members directly through WhatsApp from Vestry Hub.</p>
        <p className="text-xs text-slate-400 mt-3">Stay tuned for updates.</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MemberMessaging() {
  const { tenantId, userId, userName } = useChurch();
  const [activeTab, setActiveTab] = useState<"dm" | "groups" | "whatsapp">("dm");

  const TABS = [
    { id: "dm" as const, icon: "💬", label: "Direct Messages" },
    { id: "groups" as const, icon: "👥", label: "Group Chats" },
    { id: "whatsapp" as const, icon: "💚", label: "WhatsApp" },
  ];

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === tab.id ? "bg-orange-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700")}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "dm" && <DirectMessagesTab tenantId={tenantId} userId={userId} userName={userName} />}
      {activeTab === "groups" && <GroupChatsTab tenantId={tenantId} userId={userId} userName={userName} />}
      {activeTab === "whatsapp" && <WhatsAppTab />}
    </div>
  );
}
