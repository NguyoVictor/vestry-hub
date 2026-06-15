import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle, Send, Plus, Search, ArrowLeft, RefreshCw,
  Users, MessageSquare, Megaphone, User, MoreVertical,
  Paperclip, CheckCheck, Check, Clock, X, Smile, Reply, Trash2,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { showPaywallToast } from "@/components/PaywallToast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Conversation {
  id: string; tenant_id: string; type: string; name: string | null;
  description: string | null; status: string; is_forum: boolean;
  last_message_preview: string | null; last_message_at: string | null;
  created_by: string | null; created_at: string; updated_at?: string;
  conversation_participants?: { user_id: string; unread_count: number; last_read_at: string | null }[];
}
interface MessageRow {
  id: string; conversation_id?: string | null; sender_id: string;
  recipient_id?: string | null; body: string; is_read?: boolean | null;
  read_at?: string | null; created_at: string; status?: string;
  reply_to_id?: string | null; attachment_url?: string | null;
  attachment_name?: string | null; attachment_type?: string | null;
  replyToMessage?: { id: string; body: string; sender_id: string } | null;
}
interface Member { id: string; first_name: string | null; last_name: string | null; email: string | null; status: string | null; }
interface UserRow { id: string; first_name: string | null; last_name: string | null; email: string | null; role: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["bg-orange-500", "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500", "bg-cyan-500"];
function avatarColor(name: string) { return AVATAR_COLORS[(name || "?").charCodeAt(0) % AVATAR_COLORS.length]; }
function getInitials(name: string) { return (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); }

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  return (
    <div className={cn("rounded-full flex items-center justify-center text-white font-semibold shrink-0", sz, avatarColor(name || "?"))}>
      {getInitials(name || "?")}
    </div>
  );
}

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM");
}

function isGroupedMsg(messages: MessageRow[], index: number): boolean {
  if (index === 0) return false;
  const prev = messages[index - 1];
  const curr = messages[index];
  const timeDiff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
  return prev.sender_id === curr.sender_id && timeDiff < 2 * 60 * 1000;
}

function showDateSeparator(messages: MessageRow[], index: number): boolean {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].created_at);
  const curr = new Date(messages[index].created_at);
  return prev.toDateString() !== curr.toDateString();
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM yyyy");
}

// ── MessageStatus ─────────────────────────────────────────────────────────────
function MessageStatus({ status }: { status?: string }) {
  if (status === "sending") return <Clock className="h-3 w-3 text-orange-200 animate-pulse" />;
  if (status === "sent") return <Check className="h-3 w-3 text-orange-200" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-orange-200" />;
  if (status === "read") return <CheckCheck className="h-3 w-3 text-blue-300" />;
  return <Check className="h-3 w-3 text-orange-200" />;
}

// ── TypingIndicator ───────────────────────────────────────────────────────────
const TypingIndicator = React.memo(function TypingIndicator({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-end gap-2 px-4 py-1"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-slate-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" as const }}
            />
          ))}
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mb-1">{name} is typing...</p>
    </motion.div>
  );
});

// ── Emoji reactions ───────────────────────────────────────────────────────────
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ReactionPicker = React.memo(function ReactionPicker({ messageId, onReact }: { messageId: string; onReact: (emoji: string) => void }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.5, opacity: 0, y: 8 }}
      transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
      className="absolute bottom-full mb-1 flex gap-1 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 z-50"
    >
      {QUICK_REACTIONS.map((emoji, i) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.9 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => onReact(emoji)}
          className="text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-0.5 transition-colors"
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
});

const ReactionBubbles = React.memo(function ReactionBubbles({ reactions, onToggle }: { reactions: any[]; onToggle: (emoji: string) => void }) {
  const grouped = useMemo(() => reactions.reduce((acc, r) => {
    acc[r.emoji] = acc[r.emoji] ? [...acc[r.emoji], r.user_id] : [r.user_id];
    return acc;
  }, {} as Record<string, string[]>), [reactions]);

  if (!Object.keys(grouped).length) return null;
  return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {Object.entries(grouped).map(([emoji, users]) => (
        <motion.button
          key={emoji}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onToggle(emoji)}
          className="flex items-center gap-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-2 py-0.5 text-xs shadow-sm hover:border-orange-300 transition-colors"
        >
          <span>{emoji}</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium">{(users as string[]).length}</span>
        </motion.button>
      ))}
    </div>
  );
});

// ── MessageBubble ─────────────────────────────────────────────────────────────
interface MessageBubbleProps {
  msg: MessageRow;
  isOwn: boolean;
  isGrouped: boolean;
  senderName: string;
  onReply: (msg: MessageRow) => void;
  onReact: (msgId: string, emoji: string) => void;
  onDelete: (msgId: string) => void;
  reactions: any[];
  isOnline?: boolean;
  showDateLabel?: boolean;
  dateLabel?: string;
  readOnly?: boolean;
}

const MessageBubble = React.memo(function MessageBubble({
  msg, isOwn, isGrouped, senderName, onReply, onReact, onDelete,
  reactions, isOnline, showDateLabel, dateLabel, readOnly,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      {showDateLabel && (
        <div className="flex items-center justify-center my-4">
          <span className="bg-white dark:bg-slate-800 text-slate-400 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
            {dateLabel}
          </span>
        </div>
      )}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
        className={cn("flex gap-2 group", isOwn ? "justify-end" : "justify-start", isGrouped ? "mt-0.5" : "mt-3")}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); setShowPicker(false); }}
      >
        {!isOwn && (
          <div className="w-8 shrink-0">
            {!isGrouped && (
              <div className="relative">
                <Avatar name={senderName} size="sm" />
                {isOnline && (
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                )}
              </div>
            )}
          </div>
        )}

        <div className={cn("flex flex-col max-w-[70%]", isOwn ? "items-end" : "items-start")}>
          {!isOwn && !isGrouped && (
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">{senderName}</p>
          )}

          {msg.reply_to_id && msg.replyToMessage && (
            <div className={cn(
              "rounded-xl px-3 py-2 mb-1 text-xs border-l-2 border-orange-400 opacity-75 max-w-full",
              isOwn ? "bg-orange-400/30 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}>
              <p className="font-semibold text-orange-500 text-[10px]">{msg.replyToMessage.sender_id === msg.sender_id ? "Replied to themselves" : senderName}</p>
              <p className="truncate">{msg.replyToMessage.body}</p>
            </div>
          )}

          <div className="relative">
            <div className={cn(
              "relative px-4 py-2.5 rounded-2xl shadow-sm",
              isOwn ? "bg-orange-500 text-white rounded-br-none" : "bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-none border border-slate-100 dark:border-slate-700",
              isGrouped && isOwn && "rounded-br-2xl",
              isGrouped && !isOwn && "rounded-bl-2xl"
            )}>
              {msg.attachment_url ? (
                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                  className={cn("flex items-center gap-2 text-sm underline", isOwn ? "text-orange-100" : "text-orange-600")}>
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  {msg.attachment_name || "Attachment"}
                </a>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
              )}
              <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-end" : "justify-start")}>
                <span className={cn("text-[10px]", isOwn ? "text-orange-200" : "text-slate-400")}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </span>
                {isOwn && <MessageStatus status={msg.status ?? "sent"} />}
              </div>
            </div>

            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
                  className={cn(
                    "absolute top-0 flex items-center gap-1 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 px-2 py-1 z-10",
                    isOwn ? "right-full mr-2" : "left-full ml-2"
                  )}
                >
                  <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setShowPicker(!showPicker)}
                    className="text-slate-400 hover:text-orange-500 transition-colors p-0.5" title="React">
                    <Smile className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                    onClick={() => onReply(msg)}
                    className="text-slate-400 hover:text-orange-500 transition-colors p-0.5" title="Reply">
                    <Reply className="h-3.5 w-3.5" />
                  </motion.button>
                  {isOwn && !readOnly && (
                    <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                      onClick={() => onDelete(msg.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-0.5" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showPicker && (
                <ReactionPicker messageId={msg.id} onReact={(emoji) => { onReact(msg.id, emoji); setShowPicker(false); }} />
              )}
            </AnimatePresence>
          </div>

          <ReactionBubbles reactions={reactions} onToggle={(emoji) => onReact(msg.id, emoji)} />
        </div>
      </motion.div>
    </>
  );
});

// ── ConversationItem ──────────────────────────────────────────────────────────
interface ConversationItemProps {
  conv: Conversation;
  isSelected: boolean;
  isOnline: boolean;
  unread: number;
  name: string;
  lastMsg: string;
  lastTime: string;
  onClick: () => void;
}

const ConversationItem = React.memo(function ConversationItem({
  conv, isSelected, isOnline, unread, name, lastMsg, lastTime, onClick,
}: ConversationItemProps) {
  return (
    <motion.button
      layout
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 dark:border-slate-800",
        isSelected ? "bg-orange-50 dark:bg-orange-900/10 border-l-2 border-l-orange-500" : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={name} size="md" />
        {isOnline && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm truncate", isSelected ? "font-semibold text-orange-600" : "font-medium text-slate-800 dark:text-white")}>
            {name}
          </p>
          <span className="text-[10px] text-slate-400 shrink-0">{lastTime}</span>
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">{lastMsg}</p>
      </div>
      {unread > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" as const, stiffness: 500 }}
          className="h-5 min-w-[20px] px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0"
        >
          {unread > 99 ? "99+" : unread}
        </motion.span>
      )}
    </motion.button>
  );
});

// ── ChatPanel ─────────────────────────────────────────────────────────────────
function ChatPanel({ conv, userId, tenantId, userName, onBack, onClose, onlineUsers, readOnly }: {
  conv: Conversation; userId: string; tenantId: string; userName: string;
  onBack: () => void; onClose: (id: string) => void;
  onlineUsers: Set<string>; readOnly: boolean;
}) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [earlierOffset, setEarlierOffset] = useState(0);
  const [allMessages, setAllMessages] = useState<MessageRow[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteMsgId, setDeleteMsgId] = useState<string | null>(null);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState(conv.name ?? "");
  const [editGroupDesc, setEditGroupDesc] = useState(conv.description ?? "");
  const { limits, usage } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 50;
  const isGroup = conv.type === "group" || conv.is_forum;

  // Reset when conversation changes
  useEffect(() => {
    setInput("");
    setReplyTo(null);
    setTypingUser(null);
    setShowScrollBtn(false);
    setHasEarlier(false);
    setEarlierOffset(0);
    setAllMessages([]);
    setEditGroupName(conv.name ?? "");
    setEditGroupDesc(conv.description ?? "");
    setEditGroupOpen(false);
  }, [conv.id]);

  // Users/members lookup
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
  const { data: participants = [] } = useQuery({
    queryKey: ["conv-participants", conv.id],
    queryFn: async () => {
      const { data } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", conv.id);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const getSenderName = useCallback((id: string) => {
    const m = (membersList as any[]).find(m => m.id === id);
    if (m?.first_name) return `${m.first_name} ${m.last_name ?? ""}`.trim();
    const u = (users as any[]).find(u => u.id === id);
    return u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Unknown" : "Unknown";
  }, [membersList, users]);

  // Reactions query
  const { data: allReactions = [] } = useQuery({
    queryKey: ["reactions", conv.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("message_reactions").select("*").eq("conversation_id", conv.id);
      return data ?? [];
    },
    staleTime: 30_000,
  });
  const reactionMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of allReactions as any[]) {
      if (!map[r.message_id]) map[r.message_id] = [];
      map[r.message_id].push(r);
    }
    return map;
  }, [allReactions]);

  // Initial messages fetch
  const { isLoading: msgsLoading } = useQuery({
    queryKey: ["messages-conv", conv.id],
    queryFn: async () => {
      const { data, count } = await (supabase as any)
        .from("messages")
        .select("*", { count: "exact" })
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const msgs = ((data ?? []) as MessageRow[]).reverse();
      const msgMap: Record<string, MessageRow> = {};
      for (const m of msgs) msgMap[m.id] = m;
      // Enrich with reply-to messages
      const replyIds = msgs.filter(m => m.reply_to_id).map(m => m.reply_to_id as string);
      if (replyIds.length) {
        const { data: replyMsgs } = await (supabase as any).from("messages").select("id, body, sender_id").in("id", replyIds);
        const replyLookup = Object.fromEntries((replyMsgs ?? []).map((m: any) => [m.id, m]));
        for (const m of msgs) {
          if (m.reply_to_id) m.replyToMessage = replyLookup[m.reply_to_id] ?? null;
        }
      }
      setAllMessages(msgs);
      setHasEarlier((count ?? 0) > PAGE_SIZE);
      return msgs;
    },
    staleTime: Infinity,
  });

  // Realtime: messages + reactions + typing broadcast
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conv.id}`)
      .on("postgres_changes" as any, {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conv.id}`,
      }, (payload: any) => {
        const newMsg = payload.new as MessageRow;
        setAllMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
        qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
      })
      .on("postgres_changes" as any, {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conv.id}`,
      }, (payload: any) => {
        setAllMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on("postgres_changes" as any, {
        event: "*",
        schema: "public",
        table: "message_reactions",
        filter: `conversation_id=eq.${conv.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["reactions", conv.id] });
      })
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload.userId !== userId) {
          setTypingUser(payload.name);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setTypingUser(null), 2000);
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (sendTypingTimerRef.current) clearTimeout(sendTypingTimerRef.current);
    };
  }, [conv.id, tenantId, userId, qc]);

  // Scroll to bottom when messages change (unless user scrolled up)
  useEffect(() => {
    if (!showScrollBtn) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages]);

  // Scroll to bottom on first load
  useEffect(() => {
    if (!msgsLoading) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
    }
  }, [msgsLoading, conv.id]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  const sendTyping = useCallback(() => {
    if (sendTypingTimerRef.current) return;
    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "typing", payload: { userId, name: userName } });
    }
    sendTypingTimerRef.current = setTimeout(() => { sendTypingTimerRef.current = null; }, 300);
  }, [userId, userName]);

  const loadEarlierMessages = async () => {
    const newOffset = earlierOffset + PAGE_SIZE;
    const { data } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .range(newOffset, newOffset + PAGE_SIZE - 1);
    const older = ((data ?? []) as MessageRow[]).reverse();
    setAllMessages(prev => [...older, ...prev]);
    setEarlierOffset(newOffset);
    setHasEarlier((data ?? []).length === PAGE_SIZE);
  };

  const otherName = useMemo(() => {
    if (conv.type === "group" || conv.is_forum) return conv.name ?? "Group";
    const otherId = (participants as any[]).find((p: any) => p.user_id !== userId)?.user_id;
    return otherId ? getSenderName(otherId) : "Unknown";
  }, [conv, participants, userId, getSenderName]);

  // Send mutation with optimistic UI
  const sendMsg = useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await (supabase as any).from("messages").insert({
        tenant_id: tenantId,
        conversation_id: conv.id,
        sender_id: userId,
        body,
        status: "sent",
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      }).select().single();
      if (error) throw error;
      await (supabase as any).from("conversations").update({
        last_message_preview: body.slice(0, 100),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "open",
      }).eq("id", conv.id);
      await (supabase as any).rpc("batch_increment_unread_count", {
        p_conversation_id: conv.id,
        p_excluding_user_id: userId,
      });
      const recipientIds = (participants as any[])
        .filter((p: any) => p.user_id !== userId)
        .map((p: any) => p.user_id);
      
      if (recipientIds.length > 0) {
        const notifTitle = conv.type === "direct"
          ? "New Message"
          : `New message in ${conv.name ?? "Group Chat"}`;
        await (supabase as any).from("notifications").insert(
          recipientIds.map((rid: string) => ({
            tenant_id: tenantId,
            user_id: rid,
            title: notifTitle,
            body: body.slice(0, 100),
            type: "message",
            is_read: false,
          }))
        );
      }
      return data;
    },
    onMutate: async (body) => {
      const optimistic: MessageRow = {
        id: `temp-${Date.now()}`,
        body,
        sender_id: userId,
        created_at: new Date().toISOString(),
        status: "sending",
        conversation_id: conv.id,
        reply_to_id: replyTo?.id ?? null,
        replyToMessage: replyTo ? { id: replyTo.id, body: replyTo.body, sender_id: replyTo.sender_id } : null,
      };
      setAllMessages(prev => [...prev, optimistic]);
      setInput("");
      setReplyTo(null);
      return { optimisticId: optimistic.id };
    },
    onSuccess: (data, _, context) => {
      setAllMessages(prev => prev.map(m => m.id === context?.optimisticId ? { ...data, replyToMessage: m.replyToMessage } : m));
      qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
      qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
    },
    onError: (_, __, context) => {
      setAllMessages(prev => prev.filter(m => m.id !== context?.optimisticId));
      toast.error("Failed to send message");
    },
  });

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const existing = (allReactions as any[]).find(r => r.message_id === messageId && r.emoji === emoji && r.user_id === userId);
    if (existing) {
      await (supabase as any).from("message_reactions").delete().eq("id", existing.id);
    } else {
      await (supabase as any).from("message_reactions").insert({ message_id: messageId, user_id: userId, emoji, conversation_id: conv.id });
    }
    qc.invalidateQueries({ queryKey: ["reactions", conv.id] });
  }, [allReactions, userId, conv.id, qc]);

  const handleDelete = useCallback((msgId: string) => { setDeleteMsgId(msgId); }, []);

  const handleFileUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) { toast.error("File must be under 50MB"); return; }
    const fileSizeGB = file.size / (1024 * 1024 * 1024);
    if ((usage.storage_gb + fileSizeGB) > limits.storage_gb) { showPaywallToast("storage", "storage"); return; }
    setUploading(true);
    try {
      const path = `${tenantId}/${conv.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from("message-attachments").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(data.path);
      const optimistic: MessageRow = {
        id: `temp-file-${Date.now()}`,
        body: `📎 ${file.name}`,
        sender_id: userId,
        created_at: new Date().toISOString(),
        status: "sending",
        conversation_id: conv.id,
        attachment_url: urlData.publicUrl,
        attachment_name: file.name,
        attachment_type: file.type,
      };
      setAllMessages(prev => [...prev, optimistic]);
      const { data: msgData, error: msgErr } = await (supabase as any).from("messages").insert({
        tenant_id: tenantId, conversation_id: conv.id, sender_id: userId,
        body: `📎 ${file.name}`,
        attachment_url: urlData.publicUrl, attachment_name: file.name, attachment_type: file.type,
        status: "sent",
      }).select().single();
      if (msgErr) throw msgErr;
      setAllMessages(prev => prev.map(m => m.id === optimistic.id ? msgData : m));
      await (supabase as any).from("conversations").update({ last_message_preview: `📎 ${file.name}`, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conv.id);
      await (supabase as any).from(TABLES.TENANT_SUBSCRIPTIONS).update({ storage_used_gb: usage.storage_gb + fileSizeGB }).eq("tenant_id", tenantId);
      await (supabase as any).rpc("batch_increment_unread_count", { p_conversation_id: conv.id, p_excluding_user_id: userId });
      qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
      qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
      toast.success("File sent");
    } catch (err: any) {
      setAllMessages(prev => prev.filter(m => !m.id.startsWith("temp-file-")));
      toast.error(err.message || "Upload failed");
    } finally { setUploading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden text-slate-400 hover:text-slate-600"><ArrowLeft className="h-4 w-4" /></button>
          <div className="relative">
            <Avatar name={otherName} size="sm" />
            {!isGroup && onlineUsers.has((participants as any[]).find((p: any) => p.user_id !== userId)?.user_id ?? "") && (
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{otherName}</p>
            <p className="text-xs text-slate-400">
              {isGroup ? `${(participants as any[]).length} members` : "Direct Message"}
              {conv.status === "closed" && <span className="ml-2 text-slate-400 italic">• closed</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conv.status === "open" && (
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { onClose(conv.id); onBack(); }}>Close</Button>
          )}
          {conv.status === "closed" && (
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={async () => {
              await (supabase as any).from("conversations").update({ status: "open" }).eq("id", conv.id);
              qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
              qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
              toast.success("Conversation reopened");
            }}>Reopen</Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 transition-colors"><MoreVertical className="h-4 w-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isGroup && <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setEditGroupOpen(true)}>Edit Group</DropdownMenuItem>}
              <DropdownMenuItem className="text-xs cursor-pointer" onClick={async () => {
                await (supabase as any).from("conversation_participants").update({ unread_count: 1 }).eq("conversation_id", conv.id).eq("user_id", userId);
                qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
                qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
                toast.success("Marked as unread");
              }}>Mark as Unread</DropdownMenuItem>
              <DropdownMenuItem className="text-xs cursor-pointer text-red-500 focus:text-red-500" onClick={() => setDeleteConfirm(true)}>Delete Conversation</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete conversation confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold">Delete Conversation?</h3>
            <p className="text-sm text-slate-500">All messages will be permanently deleted.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={async () => {
                await (supabase as any).from("messages").delete().eq("conversation_id", conv.id);
                await (supabase as any).from("conversation_participants").delete().eq("conversation_id", conv.id);
                await (supabase as any).from("conversations").delete().eq("id", conv.id);
                qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
                qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
                toast.success("Conversation deleted");
                onBack();
                setDeleteConfirm(false);
              }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete message confirm */}
      {deleteMsgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold">Delete Message?</h3>
            <p className="text-sm text-slate-500">This message will be permanently deleted for everyone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteMsgId(null)}>Cancel</Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={async () => {
                await (supabase as any).from("messages").delete().eq("id", deleteMsgId);
                setAllMessages(prev => prev.filter(m => m.id !== deleteMsgId));
                toast.success("Message deleted");
                setDeleteMsgId(null);
              }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group modal */}
      {editGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-semibold">Update Group Chat</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Group Name</label>
                <Input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Description</label>
                <textarea value={editGroupDesc} onChange={e => setEditGroupDesc(e.target.value)} rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400" />
              </div>
              <EditGroupMembers convId={conv.id} tenantId={tenantId} userId={userId} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditGroupOpen(false)}>Cancel</Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={async () => {
                await (supabase as any).from("conversations").update({ name: editGroupName, description: editGroupDesc || null }).eq("id", conv.id);
                qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
                toast.success("Group updated");
                setEditGroupOpen(false);
              }}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50/50 dark:bg-slate-950/20 relative"
        ref={scrollContainerRef} onScroll={handleScroll}>
        {msgsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-48" : "w-36")} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {hasEarlier && (
              <div className="flex justify-center mb-4">
                <button onClick={loadEarlierMessages}
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 shadow-sm transition-colors">
                  Load earlier messages
                </button>
              </div>
            )}
            {allMessages.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No messages yet. Send the first one!</p>
            ) : allMessages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={msg.sender_id === userId}
                isGrouped={isGroupedMsg(allMessages, idx)}
                senderName={getSenderName(msg.sender_id)}
                onReply={setReplyTo}
                onReact={handleReact}
                onDelete={handleDelete}
                reactions={reactionMap[msg.id] ?? []}
                isOnline={onlineUsers.has(msg.sender_id)}
                showDateLabel={showDateSeparator(allMessages, idx)}
                dateLabel={getDateLabel(msg.created_at)}
                readOnly={readOnly}
              />
            ))}
            <AnimatePresence>
              {typingUser && <TypingIndicator name={typingUser} />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </>
        )}

        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="absolute bottom-4 right-6 bg-orange-500 text-white rounded-full px-3 py-1.5 text-xs font-medium shadow-lg flex items-center gap-1.5 hover:bg-orange-600 transition-colors z-10"
            >
              <ChevronDown className="h-3 w-3" />
              New messages
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 border-l-4 border-l-orange-500 shrink-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-orange-500">Replying to {getSenderName(replyTo.sender_id)}</p>
              <p className="text-xs text-slate-500 truncate">{replyTo.body}</p>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setReplyTo(null)}>
              <X className="h-3.5 w-3.5 text-slate-400" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <input ref={fileInputRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.mp3,.mp4"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
        />
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()} disabled={uploading || readOnly}
          className="text-slate-400 hover:text-orange-500 transition-colors shrink-0 pb-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
          <Paperclip className="h-5 w-5" />
        </motion.button>
        <div className="flex-1 relative">
          <textarea value={input}
            onChange={e => { setInput(e.target.value); sendTyping(); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim() && !readOnly) sendMsg.mutate(input.trim()); } }}
            placeholder={uploading ? "Uploading..." : readOnly ? "Read-only mode" : "Type a message..."}
            disabled={uploading || readOnly} rows={1}
            className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 transition-colors max-h-32 overflow-y-auto"
            style={{ height: "auto" }}
            onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 128)}px`; }}
          />
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { if (input.trim() && !readOnly) sendMsg.mutate(input.trim()); }}
          disabled={!input.trim() || sendMsg.isPending || uploading || readOnly}
          className="h-10 w-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-colors shadow-sm pb-0">
          <Send className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}

// ── New Message Modal — UNCHANGED ─────────────────────────────────────────────
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
    queryKey: ["members-for-newmsg", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name, email, status").eq("tenant_id", tenantId).eq("status", "active").order("first_name");
      return (data ?? []) as Member[];
    },
    staleTime: 0, enabled: open,
  });

  const { data: users = [] } = useQuery<UserRow[]>({
    queryKey: ["users-for-newmsg", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name, email, role").eq("tenant_id", tenantId).eq("status", "active");
      return (data ?? []) as UserRow[];
    },
    staleTime: 0, enabled: open,
  });

  const reset = () => { setMessage(""); setSelectedMemberId(""); setSendTo("forum"); };

  const allUsers = [
    ...users.filter(u => u.id !== userId),
    ...(members as Member[]).filter(m => !users.find(u => u.id === m.id)),
  ];
  const memberCount = allUsers.length;

  const handleSend = async () => {
    if (!message.trim()) { toast.error("Message is required."); return; }
    setSending(true);
    try {
      if (sendTo === "forum") {
        let { data: forum } = await (supabase as any).from("conversations").select("id").eq("tenant_id", tenantId).eq("is_forum", true).maybeSingle();
        if (!forum) {
          const { data: newForum } = await supabase.from("conversations").insert({ tenant_id: tenantId, type: "group", name: "Church Forum", description: "Main church community forum where all members can connect", is_forum: true, created_by: userId, status: "open" } as any).select("id").single();
          forum = newForum;
        }
        if (!forum) throw new Error("Could not create forum");
        await supabase.from("messages").insert({ tenant_id: tenantId, conversation_id: forum.id, sender_id: userId, body: message.trim() } as any);
        await supabase.from("conversations").update({ last_message_preview: message.trim().slice(0, 100), last_message_at: new Date().toISOString() }).eq("id", forum.id);
        const notifs = users.filter(u => u.id !== userId).map(u => ({ tenant_id: tenantId, user_id: u.id, type: "broadcast", title: `${userName} posted in Church Forum`, body: message.trim().slice(0, 50), is_read: false }));
        if (notifs.length) await supabase.from(TABLES.NOTIFICATIONS).insert(notifs as any);
        qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
        qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
        toast.success("✅ Posted to Church Forum");
        onConversationCreated(forum.id);
        onClose(); reset();
      } else if (sendTo === "all") {
        let count = 0;
        for (const u of allUsers) {
          const myParticipations = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", userId);
          const theirParticipations = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", u.id);
          const myIds = new Set((myParticipations.data || []).map((r: any) => r.conversation_id));
          const sharedId = (theirParticipations.data || []).find((r: any) => myIds.has(r.conversation_id))?.conversation_id;
          let convId = sharedId;
          if (!convId) {
            const { data: newConv } = await supabase.from("conversations").insert({ tenant_id: tenantId, type: "direct", created_by: userId, status: "open" } as any).select("id").single();
            convId = newConv?.id;
            if (convId) await supabase.from("conversation_participants").insert([{ conversation_id: convId, user_id: userId }, { conversation_id: convId, user_id: u.id }]);
          }
          if (convId) {
            await supabase.from("messages").insert({ tenant_id: tenantId, conversation_id: convId, sender_id: userId, body: message.trim() } as any);
            await supabase.from("conversations").update({ last_message_preview: message.trim().slice(0, 100), last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", convId);
            count++;
          }
        }
        qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
        toast.success(`✅ Message sent to ${count} members`);
        onClose(); reset();
      } else if (sendTo === "specific") {
        if (!selectedMemberId) { toast.error("Select a member."); setSending(false); return; }
        const targetUser = allUsers.find((u: any) => u.id === selectedMemberId);
        const myParticipations = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", userId);
        const theirParticipations = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", selectedMemberId);
        const myIds = new Set((myParticipations.data || []).map((r: any) => r.conversation_id));
        const sharedId = (theirParticipations.data || []).find((r: any) => myIds.has(r.conversation_id))?.conversation_id;
        let convId = sharedId;
        if (!convId) {
          const { data: newConv } = await supabase.from("conversations").insert({ tenant_id: tenantId, type: "direct", created_by: userId, status: "open" } as any).select("id").single();
          convId = newConv?.id;
          if (convId) await supabase.from("conversation_participants").insert([{ conversation_id: convId, user_id: userId }, { conversation_id: convId, user_id: selectedMemberId }]);
        }
        if (!convId) throw new Error("Could not create conversation");
        const { error: msgErr } = await supabase.from("messages").insert({ tenant_id: tenantId, conversation_id: convId, sender_id: userId, body: message.trim() } as any);
        if (msgErr) throw msgErr;
        await supabase.from("conversations").update({ last_message_preview: message.trim().slice(0, 100), last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", convId);
        qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
        const name = targetUser ? `${(targetUser as any).first_name ?? ""} ${(targetUser as any).last_name ?? ""}`.trim() : "member";
        toast.success(`✅ Message sent to ${name}`);
        onConversationCreated(convId);
        onClose(); reset();
      }
    } catch (err: unknown) { toast.error((err as Error)?.message ?? "Failed to send."); }
    finally { setSending(false); }
  };

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
          {sendTo === "forum" && <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-700">📢 This message will be posted to the <strong>Church Forum</strong> where all members can see it publicly.</div>}
          {sendTo === "all" && <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600">This message will be sent to all {memberCount} church members. Each member will receive it as a direct message in their inbox.</div>}
          {sendTo === "specific" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Select Member <span className="text-red-500">*</span></Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="focus:ring-orange-400 focus:border-orange-400"><SelectValue placeholder="Choose a member..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {allUsers.map((u: any) => <SelectItem key={u.id} value={u.id}>{`${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || (u as any).email || "—"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
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

// ── EditGroupMembers — UNCHANGED ──────────────────────────────────────────────
function EditGroupMembers({ convId, tenantId, userId }: { convId: string; tenantId: string; userId: string }) {
  const qc = useQueryClient();
  const [addSearch, setAddSearch] = useState("");
  const { data: participants = [], refetch: refetchParticipants } = useQuery({
    queryKey: ["conv-participants-edit", convId],
    queryFn: async () => {
      const { data } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", convId);
      return data ?? [];
    },
    staleTime: 0,
  });
  const { data: allMembers = [] } = useQuery({
    queryKey: ["members-for-group", tenantId],
    queryFn: async () => {
      const { data: m } = await supabase.from("members").select("id, first_name, last_name, email").eq("tenant_id", tenantId).order("first_name");
      const { data: u } = await supabase.from("users").select("id, first_name, last_name, email").eq("tenant_id", tenantId);
      const members = m ?? [];
      const users2 = (u ?? []).filter((u: any) => !members.find((m: any) => m.id === u.id));
      return [...members, ...users2];
    },
    staleTime: 0,
  });
  const participantIds = new Set((participants as any[]).map(p => (p as any).user_id));
  const getName = (p: any) => `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "—";
  const currentMembers = allMembers.filter((m: any) => participantIds.has(m.id));
  const addableMembers = allMembers.filter((m: any) => !participantIds.has(m.id) && (!addSearch || getName(m).toLowerCase().includes(addSearch.toLowerCase()) || (m.email ?? "").toLowerCase().includes(addSearch.toLowerCase())));
  const removeMember = async (memberId: string) => {
    if (memberId === userId) { toast.error("You cannot remove yourself"); return; }
    await supabase.from("conversation_participants").delete().eq("conversation_id", convId).eq("user_id", memberId);
    refetchParticipants();
    qc.invalidateQueries({ queryKey: ["conv-participants", convId] });
  };
  const addMember = async (memberId: string) => {
    await supabase.from("conversation_participants").insert({ conversation_id: convId, user_id: memberId });
    refetchParticipants();
    qc.invalidateQueries({ queryKey: ["conv-participants", convId] });
    setAddSearch("");
  };
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-600 block">Members ({currentMembers.length})</label>
      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-36 overflow-y-auto">
        {currentMembers.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2"><Avatar name={getName(m)} size="sm" /><span className="text-sm text-slate-700">{getName(m)}</span></div>
            {m.id !== userId && <button onClick={() => removeMember(m.id)} className="text-slate-300 hover:text-red-400 transition-colors"><X className="h-3.5 w-3.5" /></button>}
          </div>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <Input placeholder="Search to add members..." value={addSearch} onChange={e => setAddSearch(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>
      {addSearch && addableMembers.length > 0 && (
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-32 overflow-y-auto">
          {addableMembers.map((m: any) => (
            <button key={m.id} onClick={() => addMember(m.id)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 text-left transition-colors">
              <Avatar name={getName(m)} size="sm" /><span className="text-sm text-slate-700">{getName(m)}</span>
              <span className="ml-auto text-xs text-orange-500 font-medium">Add</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DirectMessagesTab ─────────────────────────────────────────────────────────
function DirectMessagesTab({ tenantId, userId, userName, onlineUsers }: { tenantId: string; userId: string; userName: string; onlineUsers: Set<string> }) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('communication_tools');
  const [filter, setFilter] = useState<"all" | "unread" | "open" | "closed">("all");
  const [search, setSearch] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newMsgOpen, setNewMsgOpen] = useState(false);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations-dm", tenantId],
    queryFn: async () => {
      const { data: participantRows } = await (supabase as any)
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);
      const myConvIds = (participantRows || []).map((r: any) => r.conversation_id);
      if (!myConvIds.length) return [];
      const { data } = await (supabase as any)
        .from("conversations")
        .select("*, conversation_participants(user_id, unread_count, last_read_at)")
        .in("id", myConvIds)
        .eq("tenant_id", tenantId)
        .eq("type", "direct")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      return (data ?? []) as unknown as Conversation[];
    },
    staleTime: 60_000,
  });

  // Realtime conversation list updates
  useEffect(() => {
    const channel = supabase
      .channel(`conversations-dm-${tenantId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "conversations", filter: `tenant_id=eq.${tenantId}` }, () => {
        qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, qc]);

  const { data: users = [] } = useQuery({
    queryKey: ["users-messaging", tenantId],
    queryFn: async () => { const { data } = await supabase.from("users").select("id, first_name, last_name, role").eq("tenant_id", tenantId); return data ?? []; },
    staleTime: 300_000,
  });
  const { data: membersList = [] } = useQuery({
    queryKey: ["members-messaging-dm", tenantId],
    queryFn: async () => { const { data } = await supabase.from("members").select("id, first_name, last_name").eq("tenant_id", tenantId); return data ?? []; },
    staleTime: 300_000,
  });

  const getOtherUser = useCallback((conv: Conversation) => {
    const other = conv.conversation_participants?.find(p => p.user_id !== userId);
    if (!other) return null;
    const fromMembers = (membersList as any[]).find(m => m.id === other.user_id);
    if (fromMembers?.first_name) return fromMembers;
    return (users as any[]).find(u => u.id === other.user_id) ?? null;
  }, [membersList, users, userId]);

  const getUnread = (conv: Conversation) => conv.conversation_participants?.find(p => p.user_id === userId)?.unread_count ?? 0;

  const filtered = conversations.filter(c => {
    const other = getOtherUser(c);
    const name = other ? `${other.first_name ?? ""} ${other.last_name ?? ""}`.toLowerCase() : "";
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "unread" && getUnread(c) > 0) || (filter === "open" && c.status === "open") || (filter === "closed" && c.status === "closed");
    return matchSearch && matchFilter;
  });

  const closeConversation = async (id: string) => {
    await (supabase as any).from("conversations").update({ status: "closed" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
    toast.success("Conversation closed.");
  };

  const selectConversation = useCallback(async (convId: string) => {
    setSelectedConvId(convId);
    await (supabase as any).from("conversation_participants").update({ unread_count: 0 }).eq("conversation_id", convId).eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] });
  }, [userId, tenantId, qc]);

  const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 260px)", minHeight: 500 }}>
      <div className="flex h-full">
        {/* Left */}
        <div className={cn("flex flex-col border-r border-slate-100 dark:border-slate-700", selectedConvId ? "hidden lg:flex lg:w-[35%]" : "w-full lg:w-[35%]")}>
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><MessageCircle className="h-4 w-4 text-orange-500" /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Member Messaging</p>
                  <p className="text-xs text-slate-500">Direct messages with church members</p>
                </div>
              </div>
              <PermissionButton permission="communication_tools" readOnly={readOnly} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1" onClick={() => setNewMsgOpen(true)}><Plus className="h-3.5 w-3.5" />New</PermissionButton>
            </div>
            {readOnly && <ReadOnlyBanner section="Communication Tools" />}
            <div className="flex items-center gap-1 mb-2">
              {(["all", "unread", "open", "closed"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors", filter === f ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{f}</button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Search by member name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <MessageCircle className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No conversations yet</p>
                <PermissionButton permission="communication_tools" readOnly={readOnly} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1 mt-1" onClick={() => setNewMsgOpen(true)}><Plus className="h-3.5 w-3.5" />New Message</PermissionButton>
              </div>
            ) : filtered.map(conv => {
              const other = getOtherUser(conv);
              const name = other ? `${other.first_name ?? ""} ${other.last_name ?? ""}`.trim() : "Unknown";
              const unread = getUnread(conv);
              const otherId = conv.conversation_participants?.find(p => p.user_id !== userId)?.user_id ?? "";
              return (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isSelected={selectedConvId === conv.id}
                  isOnline={onlineUsers.has(otherId)}
                  unread={unread}
                  name={name}
                  lastMsg={conv.last_message_preview ?? "No messages yet"}
                  lastTime={conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false }) : ""}
                  onClick={() => selectConversation(conv.id)}
                />
              );
            })}
          </ScrollArea>
        </div>
        {/* Right */}
        <div className={cn("flex-1 flex flex-col", !selectedConvId ? "hidden lg:flex" : "")}>
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <MessageCircle className="h-14 w-14 opacity-20" />
              <p className="text-base font-medium">Select a conversation</p>
              <p className="text-sm">Or start a new one</p>
            </div>
          ) : (
            <ChatPanel conv={selectedConv} userId={userId} tenantId={tenantId} userName={userName} onBack={() => setSelectedConvId(null)} onClose={closeConversation} onlineUsers={onlineUsers} readOnly={readOnly} />
          )}
        </div>
      </div>
      <NewMessageModal open={newMsgOpen} onClose={() => setNewMsgOpen(false)} tenantId={tenantId} userId={userId} userName={userName} onConversationCreated={id => { setSelectedConvId(id); qc.invalidateQueries({ queryKey: ["conversations-dm", tenantId] }); }} />
    </div>
  );
}

// ── CreateGroupModal — UNCHANGED ──────────────────────────────────────────────
function CreateGroupModal({ open, onClose, tenantId, userId, onCreated }: { open: boolean; onClose: () => void; tenantId: string; userId: string; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const { data: users = [] } = useQuery({
    queryKey: ["users-for-group", tenantId],
    queryFn: async () => { const { data } = await supabase.from("users").select("id, first_name, last_name, email, role").eq("tenant_id", tenantId).eq("status", "active"); return data ?? []; },
    staleTime: 0, enabled: open,
  });
  const { data: membersList = [] } = useQuery({
    queryKey: ["members-for-group", tenantId],
    queryFn: async () => { const { data } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name, email").eq("tenant_id", tenantId).eq("status", "active").order("first_name"); return data ?? []; },
    staleTime: 0, enabled: open,
  });
  const allPeople = [...membersList, ...(users as any[]).filter(u => !(membersList as any[]).find((m: any) => m.id === u.id))].filter((p: any) => p.id !== userId);
  const filtered = allPeople.filter((u: any) => { const q = memberSearch.toLowerCase(); return `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q); });
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
              <button onClick={() => setSelectedIds(new Set(allPeople.map((u: any) => u.id)))} className="text-xs text-orange-500 hover:underline">Select All ({allPeople.length})</button>
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

// ── GroupChatsTab ─────────────────────────────────────────────────────────────
function GroupChatsTab({ tenantId, userId, userName, onlineUsers }: { tenantId: string; userId: string; userName: string; onlineUsers: Set<string> }) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('communication_tools');
  const [search, setSearch] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations-group", tenantId],
    queryFn: async () => {
      const { data: myParticipations } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", userId);
      const myConvIds = (myParticipations || []).map((r: any) => r.conversation_id);
      if (!myConvIds.length) return [];
      const { data } = await (supabase as any).from("conversations")
        .select("*, conversation_participants(user_id, unread_count)")
        .eq("tenant_id", tenantId).eq("type", "group").in("id", myConvIds)
        .order("is_forum", { ascending: false })
        .order("last_message_at", { ascending: false, nullsFirst: false });
      return (data ?? []) as unknown as Conversation[];
    },
    staleTime: 60_000,
  });

  // Realtime updates for group conversations
  useEffect(() => {
    const channel = supabase
      .channel(`conversations-group-${tenantId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "conversations", filter: `tenant_id=eq.${tenantId}` }, () => {
        qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, qc]);

  const filtered = conversations.filter(c => !search || (c.name ?? "").toLowerCase().includes(search.toLowerCase()));
  const selectedConv = conversations.find(c => c.id === selectedConvId) ?? null;

  const closeConversation = async (id: string) => {
    await (supabase as any).from("conversations").update({ status: "closed" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
  };

  const selectGroupConv = useCallback(async (convId: string) => {
    setSelectedConvId(convId);
    await (supabase as any).from("conversation_participants").update({ unread_count: 0 }).eq("conversation_id", convId).eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] });
  }, [userId, tenantId, qc]);

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
                  <p className="text-xs text-slate-500">Connect &amp; chat with your community</p>
                </div>
              </div>
              <PermissionButton permission="communication_tools" readOnly={readOnly} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" />New</PermissionButton>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <Users className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No groups yet</p>
                <PermissionButton permission="communication_tools" readOnly={readOnly} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1 mt-1" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" />New Group</PermissionButton>
              </div>
            ) : filtered.map(conv => {
              const memberCount = conv.conversation_participants?.length ?? 0;
              const myParticipant = (conv.conversation_participants || []).find((p: any) => p.user_id === userId);
              const groupUnread = myParticipant?.unread_count ?? 0;
              const groupName = conv.name ?? "Group";
              return (
                <motion.button key={conv.id} whileTap={{ scale: 0.99 }}
                  onClick={() => selectGroupConv(conv.id)}
                  className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 dark:border-slate-700/50",
                    selectedConvId === conv.id ? "bg-orange-50 dark:bg-orange-900/20 border-l-2 border-l-orange-500" : "hover:bg-slate-50 dark:hover:bg-slate-700/50")}>
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold text-sm shrink-0", conv.is_forum ? "bg-orange-500" : avatarColor(groupName))}>
                    {conv.is_forum ? "⛪" : groupName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{groupName}</p>
                      {conv.is_forum && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">System</span>}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{conv.description ?? "No description"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{conv.last_message_at ? `Active ${formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}` : "No activity yet"} · {memberCount} members</p>
                  </div>
                  {groupUnread > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-semibold shrink-0">{groupUnread}</span>
                  )}
                </motion.button>
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
            <ChatPanel conv={selectedConv} userId={userId} tenantId={tenantId} userName={userName} onBack={() => setSelectedConvId(null)} onClose={closeConversation} onlineUsers={onlineUsers} readOnly={readOnly} />
          )}
        </div>
      </div>
      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} tenantId={tenantId} userId={userId} onCreated={id => { setSelectedConvId(id); qc.invalidateQueries({ queryKey: ["conversations-group", tenantId] }); }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MemberMessaging() {
  const { tenantId, userId, userName } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('communication_tools');
  const [activeTab, setActiveTab] = useState<"dm" | "groups">("dm");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Realtime presence
  useEffect(() => {
    if (!tenantId || !userId) return;
    const presenceChannel = supabase.channel(`presence:${tenantId}`, {
      config: { presence: { key: userId } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ userId, name: userName, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [tenantId, userId, userName]);

  const TABS = [
    { id: "dm" as const, icon: "💬", label: "Direct Messages" },
    { id: "groups" as const, icon: "👥", label: "Group Chats" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id ? "bg-orange-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700")}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "dm" && <DirectMessagesTab tenantId={tenantId} userId={userId} userName={userName} onlineUsers={onlineUsers} />}
          {activeTab === "groups" && <GroupChatsTab tenantId={tenantId} userId={userId} userName={userName} onlineUsers={onlineUsers} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
