import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import {
  Send, MessageCircle, ArrowLeft, ChevronLeft, ChevronDown,
  Paperclip, Check, CheckCheck, Clock, X, Smile, Reply, Trash2,
  MoreVertical,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface MessageRow {
  id: string; conversation_id?: string; sender_id: string; body: string;
  created_at: string; status?: string; reply_to_id?: string | null;
  attachment_url?: string | null; attachment_name?: string | null; attachment_type?: string | null;
  replyToMessage?: { id: string; body: string; sender_id: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["bg-orange-500", "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500", "bg-cyan-500"];
function avatarColor(name: string) { return AVATAR_COLORS[(name || "?").charCodeAt(0) % AVATAR_COLORS.length]; }
function getInitials(name: string) { return (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); }

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
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
  const timeDiff = new Date(messages[index].created_at).getTime() - new Date(messages[index - 1].created_at).getTime();
  return messages[index - 1].sender_id === messages[index].sender_id && timeDiff < 2 * 60 * 1000;
}

function showDateSeparator(messages: MessageRow[], index: number): boolean {
  if (index === 0) return true;
  return new Date(messages[index - 1].created_at).toDateString() !== new Date(messages[index].created_at).toDateString();
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="flex items-end gap-2 px-4 py-1">
      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="h-2 w-2 rounded-full bg-slate-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" as const }} />
          ))}
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mb-1">{name} is typing...</p>
    </motion.div>
  );
});

// ── ReactionPicker ────────────────────────────────────────────────────────────
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ReactionPicker = React.memo(function ReactionPicker({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.5, opacity: 0, y: 8 }}
      transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
      className="absolute bottom-full mb-1 flex gap-1 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 z-50"
    >
      {QUICK_REACTIONS.map((emoji, i) => (
        <motion.button key={emoji} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
          transition={{ delay: i * 0.03 }} onClick={() => onReact(emoji)}
          className="text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-0.5 transition-colors">
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
});

// ── ReactionBubbles ───────────────────────────────────────────────────────────
const ReactionBubbles = React.memo(function ReactionBubbles({ reactions, onToggle }: { reactions: any[]; onToggle: (emoji: string) => void }) {
  const grouped = useMemo(() => reactions.reduce((acc, r) => {
    acc[r.emoji] = acc[r.emoji] ? [...acc[r.emoji], r.user_id] : [r.user_id];
    return acc;
  }, {} as Record<string, string[]>), [reactions]);
  if (!Object.keys(grouped).length) return null;
  return (
    <div className="flex gap-1 mt-1 flex-wrap">
      {Object.entries(grouped).map(([emoji, users]) => (
        <motion.button key={emoji} initial={{ scale: 0 }} animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => onToggle(emoji)}
          className="flex items-center gap-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-2 py-0.5 text-xs shadow-sm hover:border-orange-300 transition-colors">
          <span>{emoji}</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium">{(users as string[]).length}</span>
        </motion.button>
      ))}
    </div>
  );
});

// ── MessageBubble ─────────────────────────────────────────────────────────────
interface MsgBubbleProps {
  msg: MessageRow; isOwn: boolean; isGrouped: boolean; senderName: string;
  isOnline?: boolean; showDateLabel?: boolean; dateLabel?: string;
  onReply: (msg: MessageRow) => void;
  onReact: (msgId: string, emoji: string) => void;
  onDelete: (msgId: string) => void;
  reactions: any[];
}

const MessageBubble = React.memo(function MessageBubble({
  msg, isOwn, isGrouped, senderName, isOnline, showDateLabel, dateLabel,
  onReply, onReact, onDelete, reactions,
}: MsgBubbleProps) {
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
                {isOnline && <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />}
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
              <p className="font-semibold text-orange-500 text-[10px]">{senderName}</p>
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
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
                  className={cn(
                    "absolute top-0 flex items-center gap-1 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 px-2 py-1 z-10",
                    isOwn ? "right-full mr-2" : "left-full ml-2"
                  )}
                >
                  <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setShowPicker(!showPicker)}
                    className="text-slate-400 hover:text-orange-500 transition-colors p-0.5">
                    <Smile className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                    onClick={() => onReply(msg)}
                    className="text-slate-400 hover:text-orange-500 transition-colors p-0.5">
                    <Reply className="h-3.5 w-3.5" />
                  </motion.button>
                  {isOwn && (
                    <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                      onClick={() => onDelete(msg.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-0.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showPicker && (
                <ReactionPicker onReact={(emoji) => { onReact(msg.id, emoji); setShowPicker(false); }} />
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
const ConversationItem = React.memo(function ConversationItem({
  conv, isSelected, unread, name, lastMsg, lastTime, onClick, isOnline,
}: {
  conv: any; isSelected: boolean; unread: number; name: string;
  lastMsg: string; lastTime: string; onClick: () => void; isOnline?: boolean;
}) {
  return (
    <motion.button layout whileTap={{ scale: 0.99 }} onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 dark:border-slate-800",
        isSelected ? "bg-orange-50 dark:bg-orange-900/10 border-l-2 border-l-orange-500" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
      )}>
      <div className="relative shrink-0">
        <Avatar name={name} />
        {isOnline && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={cn("text-sm truncate", isSelected ? "font-semibold text-orange-600" : "font-medium text-slate-800 dark:text-white")}>{name}</p>
          <span className="text-[10px] text-slate-400 shrink-0">{lastTime}</span>
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">{lastMsg}</p>
      </div>
      {unread > 0 && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring" as const, stiffness: 500 }}
          className="h-5 min-w-[20px] px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          {unread > 99 ? "99+" : unread}
        </motion.span>
      )}
    </motion.button>
  );
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function MemberMessages() {
  const member = useMemberPortal();
  const memberName = `${member.firstName} ${member.lastName}`.trim() || "Me";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [allMessages, setAllMessages] = useState<MessageRow[]>([]);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [earlierOffset, setEarlierOffset] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [deleteConvConfirm, setDeleteConvConfirm] = useState(false);
  const [closeConvConfirm, setCloseConvConfirm] = useState(false);
  const [deleteMsgConfirm, setDeleteMsgConfirm] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 50;

  // ── Conversations query ───────────────────────────────────────────────────
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
        .select("*, conversation_participants(user_id, unread_count)")
        .in("id", convIds)
        .eq("is_staff_directory", false)
        .order("updated_at", { ascending: false });
      const convList = data || [];
      
      // Fetch admin names for direct message conversations
      const otherUserIds = convList.flatMap((conv: any) =>
        (conv.conversation_participants || [])
          .filter((p: any) => p.user_id !== member.memberId)
          .map((p: any) => p.user_id)
      );
      const uniqueOtherIds = [...new Set(otherUserIds)] as string[];
      let userMap: Record<string, string> = {};
      if (uniqueOtherIds.length > 0) {
        const { data: userProfiles } = await (supabase as any)
          .from("users")
          .select("id, first_name, last_name")
          .in("id", uniqueOtherIds);
        userMap = Object.fromEntries(
          (userProfiles || []).map((u: any) => [
            u.id,
            `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Staff",
          ])
        );
      }
      
      return convList.map((conv: any) => {
        if (conv.type === "group" || conv.is_forum) return conv;
        const otherId = (conv.conversation_participants || [])
          .find((p: any) => p.user_id !== member.memberId)?.user_id;
        return {
          ...conv,
          staff_name: otherId ? userMap[otherId] : undefined,
        };
      });
    },
    staleTime: 60_000,
  });

  const { data: staffThreads = [] } = useQuery({
    queryKey: ["staff-directory", member.tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("conversations")
        .select("*, conversation_participants(user_id, unread_count)")
        .eq("tenant_id", member.tenantId)
        .eq("is_staff_directory", true)
        .order("updated_at", { ascending: false });
      const convList = data || [];
      const staffUserIds = convList.map((c: any) => c.staff_user_id).filter(Boolean);
      let staffMap: Record<string, any> = {};
      if (staffUserIds.length > 0) {
        const { data: staffUsers } = await (supabase as any)
          .from("users")
          .select("id, first_name, last_name, role, status")
          .in("id", staffUserIds);
        staffMap = Object.fromEntries((staffUsers || []).map((u: any) => [u.id, u]));
      }
      return convList.map((conv: any) => ({
        ...conv,
        staff_user: staffMap[conv.staff_user_id] || null,
      }));
    },
    staleTime: 60_000,
  });

  const { data: chatUsers = [] } = useQuery({
    queryKey: ["users-messaging", member.tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("users")
        .select("id, first_name, last_name")
        .eq("tenant_id", member.tenantId);
      return data ?? [];
    },
    staleTime: 300_000,
    enabled: !!member.tenantId,
  });

  const { data: chatMembers = [] } = useQuery({
    queryKey: ["members-messaging-dm", member.tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("members")
        .select("id, first_name, last_name")
        .eq("tenant_id", member.tenantId);
      return data ?? [];
    },
    staleTime: 300_000,
    enabled: !!member.tenantId,
  });

  const getSenderName = (id: string) => {
    const m = (chatMembers as any[]).find((m: any) => m.id === id);
    if (m?.first_name) return `${m.first_name} ${m.last_name ?? ""}`.trim();
    const u = (chatUsers as any[]).find((u: any) => u.id === id);
    return u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Staff" : "Staff";
  };

  const joinStaffThread = async (convId: string) => {
    const { data: existing } = await (supabase as any)
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", convId)
      .eq("user_id", member.memberId)
      .maybeSingle();
    if (!existing) {
      await (supabase as any).from("conversation_participants").insert({
        conversation_id: convId,
        user_id: member.memberId,
        unread_count: 0,
        joined_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
    }
    selectConversation(convId);
  };

  // ── Reactions query ───────────────────────────────────────────────────────
  const { data: allReactions = [] } = useQuery({
    queryKey: ["member-reactions", selectedConvId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("message_reactions").select("*").eq("conversation_id", selectedConvId!);
      return data ?? [];
    },
    enabled: !!selectedConvId,
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

  // ── Initial messages fetch ────────────────────────────────────────────────
  const { isLoading: msgsLoading } = useQuery({
    queryKey: ["member-messages", selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return [];
      const { data, count } = await (supabase as any)
        .from("messages")
        .select("*", { count: "exact" })
        .eq("conversation_id", selectedConvId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const msgs = ((data ?? []) as MessageRow[]).reverse();
      const replyIds = msgs.filter(m => m.reply_to_id).map(m => m.reply_to_id as string);
      if (replyIds.length) {
        const { data: replyMsgs } = await (supabase as any).from("messages").select("id, body, sender_id").in("id", replyIds);
        const replyLookup = Object.fromEntries((replyMsgs ?? []).map((m: any) => [m.id, m]));
        for (const m of msgs) { if (m.reply_to_id) m.replyToMessage = replyLookup[m.reply_to_id] ?? null; }
      }
      setAllMessages(msgs);
      setHasEarlier((count ?? 0) > PAGE_SIZE);
      setEarlierOffset(0);
      return msgs;
    },
    enabled: !!selectedConvId,
    staleTime: Infinity,
  });

  // ── Presence tracking ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!member.churchId || !member.userId) return;
    const presenceChannel = supabase.channel(`presence:${member.churchId}`, {
      config: { presence: { key: member.userId } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ userId: member.userId, name: memberName, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(presenceChannel); };
  }, [member.churchId, member.userId, memberName]);

  // ── Realtime: conversation list updates ───────────────────────────────────
  useEffect(() => {
    if (!member.memberId) return;
    const channel = supabase
      .channel(`member-convs:${member.memberId}`)
      .on("postgres_changes" as any, {
        event: "*", schema: "public", table: "conversations",
        filter: `tenant_id=eq.${member.churchId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [member.memberId, member.churchId, qc]);

  // ── Realtime: messages + reactions + typing ───────────────────────────────
  useEffect(() => {
    if (!selectedConvId) return;
    const channel = supabase
      .channel(`member-chat:${selectedConvId}`)
      .on("postgres_changes" as any, {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${selectedConvId}`,
      }, (payload: any) => {
        const newMsg = payload.new as MessageRow;
        setAllMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        qc.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
        markAsRead(selectedConvId);
      })
      .on("postgres_changes" as any, {
        event: "DELETE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${selectedConvId}`,
      }, (payload: any) => {
        setAllMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on("postgres_changes" as any, {
        event: "*", schema: "public", table: "message_reactions",
        filter: `conversation_id=eq.${selectedConvId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["member-reactions", selectedConvId] });
      })
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload.userId !== member.userId) {
          setTypingUser(payload.name ?? "Staff");
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
  }, [selectedConvId, member.memberId, member.userId, qc]);

  // Reset when switching conversations
  useEffect(() => {
    setInput(""); setReplyTo(null); setTypingUser(null); setShowScrollBtn(false);
  }, [selectedConvId]);

  // Scroll to bottom
  useEffect(() => {
    if (!showScrollBtn) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages]);

  useEffect(() => {
    if (!msgsLoading && selectedConvId) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
    }
  }, [msgsLoading, selectedConvId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (convId: string) => {
    await (supabase as any).from("conversation_participants")
      .update({ unread_count: 0 }).eq("conversation_id", convId).eq("user_id", member.userId);
    await (supabase as any).from("messages").update({ is_read: true })
      .eq("conversation_id", convId).eq("is_read", false).neq("sender_id", member.userId);
    qc.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
  }, [member.userId, member.memberId, qc]);

  const selectConversation = useCallback((convId: string) => {
    setSelectedConvId(convId);
    markAsRead(convId);
  }, [markAsRead]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  const sendTyping = useCallback(() => {
    if (sendTypingTimerRef.current) return;
    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "typing", payload: { userId: member.userId, name: memberName } });
    }
    sendTypingTimerRef.current = setTimeout(() => { sendTypingTimerRef.current = null; }, 300);
  }, [member.userId, memberName]);

  const loadEarlierMessages = async () => {
    if (!selectedConvId) return;
    const newOffset = earlierOffset + PAGE_SIZE;
    const { data } = await (supabase as any)
      .from("messages").select("*").eq("conversation_id", selectedConvId)
      .order("created_at", { ascending: false }).range(newOffset, newOffset + PAGE_SIZE - 1);
    const older = ((data ?? []) as MessageRow[]).reverse();
    setAllMessages(prev => [...older, ...prev]);
    setEarlierOffset(newOffset);
    setHasEarlier((data ?? []).length === PAGE_SIZE);
  };

  // ── Send mutation ─────────────────────────────────────────────────────────
  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      if (!selectedConvId) throw new Error("No conversation");
      const { data, error } = await (supabase as any).from("messages").insert({
        tenant_id: member.churchId,
        conversation_id: selectedConvId,
        sender_id: member.userId,
        body,
        status: "sent",
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      }).select().single();
      if (error) throw error;
      await (supabase as any).from("conversations").update({
        updated_at: new Date().toISOString(),
        last_message_preview: body.slice(0, 100),
      }).eq("id", selectedConvId);
      await (supabase as any).rpc("batch_increment_unread_count", {
        p_conversation_id: selectedConvId,
        p_excluding_user_id: member.userId,
      });
      return data;
    },
    onMutate: async (body) => {
      const optimistic: MessageRow = {
        id: `temp-${Date.now()}`,
        body,
        sender_id: member.userId,
        created_at: new Date().toISOString(),
        status: "sending",
        conversation_id: selectedConvId ?? undefined,
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
      qc.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
    },
    onError: (_, __, context) => {
      setAllMessages(prev => prev.filter(m => m.id !== context?.optimisticId));
      toast.error("Failed to send message");
    },
  });

  // ── React handler ─────────────────────────────────────────────────────────
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const existing = (allReactions as any[]).find(r => r.message_id === messageId && r.emoji === emoji && r.user_id === member.userId);
    if (existing) {
      await (supabase as any).from("message_reactions").delete().eq("id", existing.id);
    } else {
      await (supabase as any).from("message_reactions").insert({ message_id: messageId, user_id: member.userId, emoji, conversation_id: selectedConvId });
    }
    qc.invalidateQueries({ queryKey: ["member-reactions", selectedConvId] });
  }, [allReactions, member.userId, selectedConvId, qc]);

  // ── Delete message (actual DB delete, not local hide) ─────────────────────
  const handleDeleteMsg = useCallback(async (msgId: string) => {
    await (supabase as any).from("messages").delete().eq("id", msgId).eq("sender_id", member.userId);
    setAllMessages(prev => prev.filter(m => m.id !== msgId));
    setDeleteMsgConfirm(null);
  }, [member.userId]);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!selectedConvId) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("File must be under 50MB"); return; }
    setUploading(true);
    try {
      const path = `${member.churchId}/${selectedConvId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from("message-attachments").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(data.path);
      const optimistic: MessageRow = {
        id: `temp-file-${Date.now()}`,
        body: `📎 ${file.name}`,
        sender_id: member.userId,
        created_at: new Date().toISOString(),
        status: "sending",
        conversation_id: selectedConvId,
        attachment_url: urlData.publicUrl,
        attachment_name: file.name,
        attachment_type: file.type,
      };
      setAllMessages(prev => [...prev, optimistic]);
      const { data: msgData, error: msgErr } = await (supabase as any).from("messages").insert({
        tenant_id: member.churchId, conversation_id: selectedConvId, sender_id: member.userId,
        body: `📎 ${file.name}`,
        attachment_url: urlData.publicUrl, attachment_name: file.name, attachment_type: file.type,
        status: "sent",
      }).select().single();
      if (msgErr) throw msgErr;
      setAllMessages(prev => prev.map(m => m.id === optimistic.id ? msgData : m));
      await (supabase as any).from("conversations").update({ updated_at: new Date().toISOString(), last_message_preview: `📎 ${file.name}` }).eq("id", selectedConvId);
      await (supabase as any).rpc("batch_increment_unread_count", { p_conversation_id: selectedConvId, p_excluding_user_id: member.userId });
      qc.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
      toast.success("File sent");
    } catch (err: any) {
      setAllMessages(prev => prev.filter(m => !m.id.startsWith("temp-file-")));
      toast.error(err.message || "Upload failed");
    } finally { setUploading(false); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedConv =
    conversations.find((c: any) => c.id === selectedConvId) ||
    staffThreads.find((c: any) => c.id === selectedConvId);
  const staffUser = (selectedConv as any)?.staff_user;
  const staffName =
    selectedConv?.staff_name ||
    (staffUser ? `${staffUser.first_name || ""} ${staffUser.last_name || ""}`.trim() : null) ||
    selectedConv?.name ||
    "Church Staff";

  // ── Render ────────────────────────────────────────────────────────────────
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
              ) : conversations.length === 0 && staffThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No messages yet</p>
                  <p className="text-xs text-slate-400">Church staff will reach out to you here</p>
                </div>
              ) : (
                <>
                  {staffThreads.length > 0 && (
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Church Staff
                      </p>
                      <div className="flex flex-col gap-1">
                        {staffThreads.map((conv: any) => {
                          const staff = conv.staff_user;
                          const isInactive = staff?.status === "inactive";
                          const staffName = staff
                            ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Staff"
                            : "Staff";
                          const staffRole = staff?.role
                            ? staff.role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
                            : "";
                          const myParticipant = (conv.conversation_participants || [])
                            .find((p: any) => p.user_id === member.memberId);
                          const unread = myParticipant?.unread_count ?? 0;
                          return (
                            <button
                              key={conv.id}
                              onClick={() => joinStaffThread(conv.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                                selectedConvId === conv.id
                                  ? "bg-orange-50 dark:bg-orange-900/10"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-700/50",
                                isInactive && "opacity-50"
                              )}
                            >
                              <div className="relative shrink-0">
                                <Avatar name={staffName} size="sm" />
                                {onlineUsers.has(conv.staff_user_id) && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={cn(
                                    "text-sm font-medium truncate",
                                    isInactive ? "text-slate-400" : "text-slate-800 dark:text-white"
                                  )}>
                                    {staffName}
                                  </p>
                                  {isInactive && (
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                {staffRole && (
                                  <p className="text-[11px] text-slate-400 truncate">{staffRole}</p>
                                )}
                              </div>
                              {unread > 0 && (
                                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {unread}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {conversations.map((conv: any) => {
                    const myParticipant = (conv.conversation_participants || []).find((p: any) => p.user_id === member.userId);
                    const unread = myParticipant?.unread_count ?? 0;
                    const name = conv.staff_name || conv.name || conv.title || "Church Staff";
                    const preview = conv.last_message_preview ?? "";
                    const time = conv.updated_at ? formatMsgTime(conv.updated_at) : "";
                    return (
                      <ConversationItem
                        key={conv.id} conv={conv}
                        isSelected={selectedConvId === conv.id}
                        isOnline={onlineUsers.has(
                          (conv.conversation_participants || [])
                            .find((p: any) => p.user_id !== member.memberId)?.user_id ?? ""
                        )}
                        unread={unread} name={name} lastMsg={preview} lastTime={time}
                        onClick={() => selectConversation(conv.id)}
                      />
                    );
                  })}
                </>
              )}
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
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                  <button className="md:hidden h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                    onClick={() => setSelectedConvId(null)}>
                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                  </button>
                  <div className="relative">
                    <Avatar name={staffName} size="sm" />
                    {onlineUsers.has(selectedConv?.created_by ?? "") && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{staffName}</p>
                    <p className="text-xs text-slate-400">Church Staff</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-sm">
                      <DropdownMenuItem onClick={() => setCloseConvConfirm(true)}>Close Conversation</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={() => setDeleteConvConfirm(true)}>Delete Conversation</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50/50 dark:bg-slate-950/20 relative"
                  onScroll={handleScroll}>
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
                        <p className="text-center text-sm text-slate-400 py-12">No messages yet</p>
                      ) : allMessages.map((msg, idx) => (
                        <MessageBubble
                          key={msg.id} msg={msg}
                          isOwn={msg.sender_id === member.userId}
                          isGrouped={isGroupedMsg(allMessages, idx)}
                          senderName={
                            msg.sender_id === member.userId
                              ? (memberName ?? "You")
                              : (selectedConv?.type === "direct" || (selectedConv as any)?.is_staff_directory)
                                ? staffName
                                : getSenderName(msg.sender_id)
                          }
                          isOnline={onlineUsers.has(msg.sender_id)}
                          showDateLabel={showDateSeparator(allMessages, idx)}
                          dateLabel={getDateLabel(msg.created_at)}
                          onReply={setReplyTo}
                          onReact={handleReact}
                          onDelete={(id) => setDeleteMsgConfirm(id)}
                          reactions={reactionMap[msg.id] ?? []}
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
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                        onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                        className="absolute bottom-4 right-6 bg-orange-500 text-white rounded-full px-3 py-1.5 text-xs font-medium shadow-lg flex items-center gap-1.5 hover:bg-orange-600 transition-colors z-10">
                        <ChevronDown className="h-3 w-3" />
                        New messages
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Reply preview */}
                <AnimatePresence>
                  {replyTo && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 border-l-4 border-l-orange-500 shrink-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-orange-500">
                          Replying to {replyTo.sender_id === member.userId ? "yourself" : staffName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{replyTo.body}</p>
                      </div>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setReplyTo(null)}>
                        <X className="h-3.5 w-3.5 text-slate-400" />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input area */}
                <div className="flex items-end gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.mp3,.mp4"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
                  />
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="text-slate-400 hover:text-orange-500 transition-colors shrink-0 pb-2.5">
                    <Paperclip className="h-5 w-5" />
                  </motion.button>
                  <div className="flex-1 relative">
                    <textarea value={input}
                      onChange={e => { setInput(e.target.value); sendTyping(); }}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) sendMessage.mutate(input.trim()); } }}
                      placeholder={uploading ? "Uploading..." : "Type a message..."}
                      disabled={uploading} rows={1}
                      className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 transition-colors max-h-32 overflow-y-auto"
                      style={{ height: "auto" }}
                      onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 128)}px`; }}
                    />
                  </div>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => { if (input.trim()) sendMessage.mutate(input.trim()); }}
                    disabled={!input.trim() || sendMessage.isPending || uploading}
                    className="h-10 w-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-colors shadow-sm">
                    <Send className="h-4 w-4" />
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete message confirm */}
      <AlertDialog open={!!deleteMsgConfirm} onOpenChange={v => !v && setDeleteMsgConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>This message will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMsgConfirm && handleDeleteMsg(deleteMsgConfirm)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close conversation confirm */}
      <AlertDialog open={closeConvConfirm} onOpenChange={setCloseConvConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this conversation?</AlertDialogTitle>
            <AlertDialogDescription>The conversation will be marked as closed. You can still view the messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!selectedConvId) return;
              await (supabase as any).from("conversations").update({ status: "closed" }).eq("id", selectedConvId);
              qc.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
              setCloseConvConfirm(false);
              setSelectedConvId(null);
              toast.success("Conversation closed");
            }}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete conversation confirm */}
      <AlertDialog open={deleteConvConfirm} onOpenChange={setDeleteConvConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>All messages will be permanently deleted and cannot be recovered.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={async () => {
              if (!selectedConvId) return;
              await (supabase as any).from("messages").delete().eq("conversation_id", selectedConvId);
              await (supabase as any).from("conversation_participants").delete().eq("conversation_id", selectedConvId);
              await (supabase as any).from("conversations").delete().eq("id", selectedConvId);
              qc.invalidateQueries({ queryKey: ["member-conversations", member.memberId] });
              setDeleteConvConfirm(false);
              setSelectedConvId(null);
              toast.success("Conversation deleted");
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
