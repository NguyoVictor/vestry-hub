import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { MessageCircle, Send, Plus, Search, ArrowLeft } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function MemberMessaging() {
  const { tenantId, userId, userName } = useChurch();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchMembers, setSearchMembers] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ["conversations", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*, conversation_participants(*)")
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name, email, role").eq("tenant_id", tenantId);
      return data || [];
    },
  });

  const { data: chatMessages, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: true })
        .limit(100);
      // Filter to only messages in this conversation
      const conv = conversations?.find(c => c.id === selectedConversation);
      const participants = (conv as any)?.conversation_participants?.map((p: any) => p.user_id) || [];
      return (data || []).filter(m => 
        participants.includes(m.sender_id) && participants.includes(m.recipient_id || m.sender_id)
      );
    },
    enabled: !!selectedConversation,
  });

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchMessages, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || !messageInput.trim()) return;
      const conv = conversations?.find(c => c.id === selectedConversation);
      const otherParticipant = (conv as any)?.conversation_participants?.find((p: any) => p.user_id !== userId);
      const { error } = await supabase.from("messages").insert({
        tenant_id: tenantId,
        sender_id: userId,
        recipient_id: otherParticipant?.user_id || userId,
        body: messageInput.trim(),
      });
      if (error) throw error;
      await supabase.from("conversations").update({
        last_message_preview: messageInput.trim().substring(0, 100),
        last_message_at: new Date().toISOString(),
      }).eq("id", selectedConversation);
    },
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => toast.error("Failed to send message"),
  });

  const startConversation = useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data: conv, error: convErr } = await supabase.from("conversations").insert({
        tenant_id: tenantId,
        type: "direct",
        created_by: userId,
      }).select().single();
      if (convErr) throw convErr;
      await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: userId },
        { conversation_id: conv.id, user_id: otherUserId },
      ]);
      return conv.id;
    },
    onSuccess: (convId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversation(convId);
      setShowNewChat(false);
    },
    onError: () => toast.error("Failed to start conversation"),
  });

  const getParticipantName = (conv: any) => {
    const otherParticipant = conv.conversation_participants?.find((p: any) => p.user_id !== userId);
    if (!otherParticipant) return "Unknown";
    const user = users?.find(u => u.id === otherParticipant.user_id);
    return user ? `${user.first_name} ${user.last_name}` : "Unknown";
  };

  const selectedConvData = conversations?.find(c => c.id === selectedConversation);

  return (
    <div>
      <PageHeader title="Member Messaging" subtitle="Direct messages between staff and members" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border rounded-lg overflow-hidden bg-card" style={{ height: "calc(100vh - 200px)" }}>
        {/* Left - Conversations List */}
        <div className={cn("border-r flex flex-col", selectedConversation ? "hidden lg:flex" : "")}>
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search conversations..." className="pl-8" />
              </div>
              <Button size="icon" variant="outline" onClick={() => setShowNewChat(true)}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {!conversations?.length ? (
              <div className="p-6 text-center">
                <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <Button size="sm" className="mt-2" onClick={() => setShowNewChat(true)}>Start a Chat</Button>
              </div>
            ) : (
              conversations.map(conv => (
                <button key={conv.id} onClick={() => setSelectedConversation(conv.id)}
                  className={cn("w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b",
                    selectedConversation === conv.id && "bg-muted"
                  )}>
                  <MemberAvatar name={getParticipantName(conv)} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{getParticipantName(conv)}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.last_message_preview || "No messages yet"}</p>
                  </div>
                  {conv.last_message_at && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                    </span>
                  )}
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Middle - Chat Window */}
        <div className={cn("lg:col-span-2 flex flex-col", !selectedConversation ? "hidden lg:flex" : "")}>
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Select a conversation</p>
                <p className="text-sm text-muted-foreground">Or start a new one</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedConversation(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <MemberAvatar name={selectedConvData ? getParticipantName(selectedConvData) : ""} size="sm" />
                <div>
                  <p className="font-medium text-sm">{selectedConvData ? getParticipantName(selectedConvData) : ""}</p>
                  <p className="text-xs text-muted-foreground">Direct Message</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {!chatMessages?.length ? (
                    <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Send the first one!</p>
                  ) : (
                    chatMessages.map(msg => {
                      const isOwn = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[70%] px-4 py-2 text-sm",
                            isOwn ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm" : "bg-muted rounded-2xl rounded-bl-sm"
                          )}>
                            <p>{msg.body}</p>
                            <p className={cn("text-xs mt-1", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                              {msg.created_at ? format(new Date(msg.created_at), "HH:mm") : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t flex items-center gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage.mutate(); } }}
                />
                <Button size="icon" disabled={!messageInput.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
          <Input placeholder="Search members..." value={searchMembers} onChange={(e) => setSearchMembers(e.target.value)} />
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {users?.filter(u => u.id !== userId && (
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchMembers.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchMembers.toLowerCase())
              )).map(user => (
                <button key={user.id} onClick={() => startConversation.mutate(user.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors">
                  <MemberAvatar name={`${user.first_name} ${user.last_name}`} size="sm" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
