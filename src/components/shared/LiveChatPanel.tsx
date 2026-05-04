import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMemberPortal } from "@/contexts/MemberPortalContext";

interface LiveChatPanelProps {
  streamId: string;
  tenantId: string;
  chatEnabled: boolean;
}

interface ChatMessage {
  id: string;
  stream_id: string;
  tenant_id: string;
  member_id: string | null;
  member_name: string;
  member_avatar: string | null;
  message: string;
  reaction: string | null;
  is_pinned: boolean;
  is_admin: boolean;
  created_at: string;
}

export const LiveChatPanel = ({
  streamId,
  tenantId,
  chatEnabled
}: LiveChatPanelProps) => {
  const member = useMemberPortal();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  const { data: initialMessages } = useQuery({
    queryKey: ['chat_messages', streamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data as ChatMessage[];
    },
    staleTime: 300000
  });

  // Set initial messages
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          tenant_id: tenantId,
          member_id: member.id,
          member_name: member.name || 'Anonymous',
          member_avatar: member.avatar || null,
          message: messageText,
          reaction: null,
          is_pinned: false,
          is_admin: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ['chat_messages', streamId] });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  });

  // Send reaction mutation
  const sendReactionMutation = useMutation({
    mutationFn: async (reaction: string) => {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          tenant_id: tenantId,
          member_id: member.id,
          member_name: member.name || 'Anonymous',
          member_avatar: member.avatar || null,
          message: '',
          reaction: reaction,
          is_pinned: false,
          is_admin: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat_messages', streamId] });
    },
    onError: (error) => {
      console.error('Error sending reaction:', error);
      toast.error('Failed to send reaction');
    }
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !chatEnabled) return;
    sendMessageMutation.mutate(messageInput.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = (reaction: string) => {
    if (!chatEnabled) return;
    sendReactionMutation.mutate(reaction);
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get gradient color based on first letter
  const getGradientColor = (name: string) => {
    const firstLetter = name[0]?.toUpperCase() || 'A';
    const charCode = firstLetter.charCodeAt(0);
    
    if (charCode >= 65 && charCode <= 68) return 'from-orange-400 to-orange-500';
    if (charCode >= 69 && charCode <= 72) return 'from-violet-500 to-purple-600';
    if (charCode >= 73 && charCode <= 76) return 'from-blue-400 to-blue-600';
    if (charCode >= 77 && charCode <= 80) return 'from-emerald-400 to-green-500';
    if (charCode >= 81 && charCode <= 84) return 'from-pink-400 to-rose-500';
    return 'from-amber-400 to-yellow-500';
  };

  // Count online users (unique member_ids in last 5 minutes)
  const onlineCount = messages
    .filter(m => {
      const messageTime = new Date(m.created_at).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return messageTime > fiveMinutesAgo;
    })
    .reduce((acc, m) => {
      if (m.member_id && !acc.includes(m.member_id)) {
        acc.push(m.member_id);
      }
      return acc;
    }, [] as string[])
    .length;

  const reactions = [
    { emoji: '🙏', label: 'Amen' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '🔥', label: 'Fire' },
    { emoji: '🙌', label: 'Praise' }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
          Live Chat
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Users className="h-3.5 w-3.5" />
          <span className="font-medium">{onlineCount} online</span>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ maxHeight: 'calc(100% - 180px)' }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`flex gap-2 ${msg.is_pinned ? 'bg-amber-50 dark:bg-amber-900/10 -mx-2 px-2 py-2 rounded-lg border border-amber-200 dark:border-amber-800' : ''}`}
            >
              {/* Avatar */}
              {msg.member_avatar ? (
                <img
                  src={msg.member_avatar}
                  alt={msg.member_name}
                  className="h-6 w-6 rounded-full flex-shrink-0"
                />
              ) : (
                <div
                  className={`h-6 w-6 rounded-full bg-gradient-to-br ${getGradientColor(msg.member_name)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
                >
                  {getInitials(msg.member_name)}
                </div>
              )}

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
                    {msg.member_name}
                  </span>
                  {msg.is_admin && (
                    <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                      Host
                    </span>
                  )}
                  {msg.is_pinned && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      📌 Pinned
                    </span>
                  )}
                </div>
                
                {msg.reaction ? (
                  <div className="text-2xl mt-0.5">{msg.reaction}</div>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 break-words font-jakarta">
                    {msg.message}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Reactions Bar */}
      {chatEnabled && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {reactions.map((reaction) => (
              <motion.button
                key={reaction.emoji}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReaction(reaction.emoji)}
                disabled={sendReactionMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                title={reaction.label}
              >
                <span className="text-lg">{reaction.emoji}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium hidden sm:inline">
                  {reaction.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        {chatEnabled ? (
          <div className="flex items-center gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sendMessageMutation.isPending}
              className="flex-1 h-9 text-sm font-jakarta"
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sendMessageMutation.isPending}
              className="h-9 px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 py-2 font-jakarta">
            Chat is disabled for this stream
          </p>
        )}
      </div>
    </div>
  );
};
