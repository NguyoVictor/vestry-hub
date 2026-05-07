import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { 
  Send, 
  FileText, 
  Radio, 
  TrendingUp, 
  Search, 
  Mail, 
  MessageSquare, 
  MessageCircle, 
  Bell,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 1200 }: { value: number; duration?: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: duration / 1000,
      ease: [0.25, 0.46, 0.45, 0.94],
    });
    return controls.stop;
  }, [count, value, duration]);

  return <motion.span>{rounded}</motion.span>;
};

// Animated Circular Progress Ring
const CircularProgress = ({ percentage, size = 40, strokeWidth = 3 }: { 
  percentage: number; 
  size?: number; 
  strokeWidth?: number; 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          className="text-emerald-500"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-emerald-600">{percentage}%</span>
      </div>
    </div>
  );
};

// Channel Badge Component
const ChannelBadge = ({ channel }: { channel: string }) => {
  const channelConfig = {
    email: { label: "Email", icon: Mail, className: "bg-blue-100 text-blue-700 border-blue-200" },
    sms: { label: "SMS", icon: MessageSquare, className: "bg-green-100 text-green-700 border-green-200" },
    whatsapp: { label: "WhatsApp", icon: MessageCircle, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    in_app: { label: "In-App", icon: Bell, className: "bg-purple-100 text-purple-700 border-purple-200" },
  };

  const config = channelConfig[channel as keyof typeof channelConfig] || channelConfig.in_app;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} border`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    sent: { label: "Delivered", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    failed: { label: "Failed", icon: XCircle, className: "bg-red-100 text-red-700 border-red-200" },
    pending: { label: "Pending", icon: AlertCircle, className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    draft: { label: "Draft", icon: FileText, className: "bg-gray-100 text-gray-700 border-gray-200" },
    scheduled: { label: "Scheduled", icon: Clock, className: "bg-blue-100 text-blue-700 border-blue-200" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} border`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

export const PremiumBroadcastsView = () => {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("all");
  
  // Modal states
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [deletingMessage, setDeletingMessage] = useState<any>(null);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    subject: "",
    body: "",
    recipient_type: "",
    channel: ""
  });

  // Fetch communications data
  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ["communications", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.COMMUNICATIONS)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  // Fetch broadcasts data (includes visitor follow-ups and manual broadcasts)
  const { data: broadcasts = [], isLoading: broadcastsLoading } = useQuery({
    queryKey: ["broadcasts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.BROADCASTS)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });

  // Calculate stats - combine data from both communications and broadcasts tables
  const sentMessages = [
    ...communications.filter(c => c.status === "sent"),
    ...broadcasts.filter(b => b.status === "sent")
  ];
  const draftMessages = [
    ...communications.filter(c => c.status === "draft"),
    ...broadcasts.filter(b => b.status === "draft")
  ];
  const scheduledMessages = [
    ...communications.filter(c => c.status === "scheduled"),
    ...broadcasts.filter(b => b.status === "scheduled")
  ];
  const totalBroadcasts = broadcasts.length;
  const reachRate = sentMessages.length > 0 
    ? Math.round((sentMessages.reduce((sum, msg) => sum + (msg.delivered_count || msg.recipient_count || 1), 0) / 
        sentMessages.reduce((sum, msg) => sum + (msg.sent_count || msg.recipient_count || 1), 0)) * 100)
    : 0;

  // Filter data based on active tab - combine both data sources
  const getFilteredData = () => {
    let data = activeTab === "sent" 
      ? sentMessages 
      : [...draftMessages, ...scheduledMessages];

    if (selectedChannel !== "all") {
      data = data.filter(item => {
        // Handle both communications (has 'channel' field) and broadcasts (has 'channels' array)
        const itemChannel = item.channel || (item.channels && item.channels[0]) || "in_app";
        return itemChannel === selectedChannel;
      });
    }

    if (searchQuery) {
      data = data.filter(item => 
        item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.body?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const filteredData = getFilteredData();
  const draftCount = draftMessages.length;
  const isLoading = communicationsLoading || broadcastsLoading;

  // Mutation for updating messages (Edit Draft)
  const updateMessageMutation = useMutation({
    mutationFn: async ({ messageId, updates }: { messageId: string; updates: any }) => {
      // Determine which table the message is in
      const isFromBroadcasts = broadcasts.some(b => b.id === messageId);
      const tableName = isFromBroadcasts ? TABLES.BROADCASTS : TABLES.COMMUNICATIONS;
      
      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq("id", messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["broadcasts", tenantId] });
      toast.success("Draft updated successfully!");
      setEditingMessage(null);
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update draft");
    }
  });

  // Mutation for deleting messages
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      // Determine which table the message is in
      const isFromBroadcasts = broadcasts.some(b => b.id === messageId);
      const tableName = isFromBroadcasts ? TABLES.BROADCASTS : TABLES.COMMUNICATIONS;
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communications", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["broadcasts", tenantId] });
      toast.success("Message deleted successfully!");
      setDeletingMessage(null);
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete message");
    }
  });

  // Real-time subscription for both communications and broadcasts
  useEffect(() => {
    if (!tenantId) return;

    const communicationsChannel = supabase
      .channel("communications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.COMMUNICATIONS,
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["communications", tenantId] });
          toast("Communications updated", {
            position: "bottom-right",
            duration: 3000,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.BROADCASTS,
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["broadcasts", tenantId] });
          toast("Communications updated", {
            position: "bottom-right",
            duration: 3000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(communicationsChannel);
    };
  }, [tenantId, queryClient]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const channelFilters = [
    { id: "all", label: "All" },
    { id: "email", label: "Email" },
    { id: "sms", label: "SMS" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "in_app", label: "In-App" },
  ];

  // Handler functions
  const handleSendMessage = (message: any, channel: string) => {
    // Navigate to compose page with pre-filled draft data
    const queryParams = new URLSearchParams({
      channel: channel,
      draftId: message.id,
      subject: message.subject || "",
      body: message.body || "",
      recipientType: message.recipient_type || "",
    });

    // Handle different recipient types
    if (message.recipient_config) {
      if (message.recipient_type === "visitor") {
        queryParams.set("recipientName", message.recipient_config.name || "");
        queryParams.set("recipientId", message.recipient_config.visitor_id || "");
        if (message.recipient_config.email) {
          queryParams.set("recipientEmail", message.recipient_config.email);
        }
      } else {
        queryParams.set("recipientName", message.recipient_config.name || "");
        queryParams.set("recipientId", message.recipient_config.id || "");
        if (message.recipient_config.email) {
          queryParams.set("recipientEmail", message.recipient_config.email);
        }
      }
    }
    
    navigate(`/communications/compose?${queryParams.toString()}`);
    
    toast.success(`Opening ${channel} composer with draft message...`);
  };

  const handleEditMessage = (message: any) => {
    setEditForm({
      subject: message.subject || "",
      body: message.body || "",
      recipient_type: message.recipient_type || "",
      channel: message.channel || (message.channels && message.channels[0]) || "in_app"
    });
    setEditingMessage(message);
  };

  const handleUpdateMessage = () => {
    if (!editingMessage) return;
    
    updateMessageMutation.mutate({
      messageId: editingMessage.id,
      updates: {
        subject: editForm.subject,
        body: editForm.body,
        recipient_type: editForm.recipient_type,
        channel: editForm.channel,
        channels: [editForm.channel],
        updated_at: new Date().toISOString()
      }
    });
  };

  const handleDeleteMessage = (message: any) => {
    setDeletingMessage(message);
  };

  const confirmDelete = () => {
    if (!deletingMessage) return;
    deleteMessageMutation.mutate(deletingMessage.id);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stats Cards */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Messages Sent */}
        <motion.div whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Messages Sent</p>
                  <p className="text-3xl font-bold">
                    <AnimatedCounter value={sentMessages.length} />
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Send className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Drafts */}
        <motion.div whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                  <p className="text-3xl font-bold">
                    <AnimatedCounter value={draftCount} />
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Broadcasts */}
        <motion.div whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Broadcasts</p>
                  <p className="text-3xl font-bold">
                    <AnimatedCounter value={totalBroadcasts} />
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Radio className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reach Rate */}
        <motion.div whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reach Rate</p>
                  <p className="text-3xl font-bold">{reachRate}%</p>
                </div>
                <CircularProgress percentage={reachRate} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sent">Sent Messages</TabsTrigger>
            <TabsTrigger value="drafts" className="relative">
              Drafts & Scheduled
              {draftCount > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="ml-2 inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-semibold min-w-[16px] h-4 px-1"
                >
                  {draftCount}
                </motion.span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {channelFilters.map((filter) => (
                <motion.button
                  key={filter.id}
                  onClick={() => setSelectedChannel(filter.id)}
                  whileTap={{ scale: 0.95 }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedChannel === filter.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {filter.label}
                </motion.button>
              ))}
            </div>
          </div>

          <TabsContent value="sent" className="mt-0">
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
                <Card>
                  <CardContent className="pt-6">
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : filteredData.length === 0 ? (
                      <div className="text-center py-16">
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="mb-4"
                        >
                          <Send className="mx-auto h-12 w-12 text-muted-foreground/30" />
                        </motion.div>
                        <p className="text-lg font-medium">No messages sent yet</p>
                        <p className="text-muted-foreground text-sm">
                          Messages you send via Email, SMS or WhatsApp will appear here.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject/Message</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>Sent Date</TableHead>
                            <TableHead>Delivery Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((msg, index) => (
                            <motion.tr
                              key={msg.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="group"
                            >
                              <TableCell className="font-medium">
                                <div>
                                  <p className="font-semibold">{msg.subject || "(No subject)"}</p>
                                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {msg.body?.replace(/<[^>]+>/g, "").slice(0, 60)}...
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {/* Handle both communications and broadcasts */}
                                    {msg.recipient_config?.name || "System"}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {msg.recipient_type?.replace(/_/g, " ") || "Member"}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <ChannelBadge channel={msg.channel || (msg.channels && msg.channels[0]) || "in_app"} />
                              </TableCell>
                              <TableCell className="text-sm">
                                {msg.sent_at ? format(new Date(msg.sent_at), "dd MMM yyyy, h:mm a") : "—"}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={msg.status} />
                              </TableCell>
                            </motion.tr>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="drafts" className="mt-0">
              <motion.div
                key="drafts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : filteredData.length === 0 ? (
                      <div className="text-center py-16">
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="mb-4"
                        >
                          <Inbox className="mx-auto h-12 w-12 text-muted-foreground/30" />
                        </motion.div>
                        <p className="text-lg font-medium">No drafts or scheduled messages</p>
                        <p className="text-muted-foreground text-sm">
                          Draft messages and scheduled communications will appear here.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject/Message</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Scheduled Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.map((msg, index) => (
                            <motion.tr
                              key={msg.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="group"
                            >
                              <TableCell className="font-medium">
                                <div>
                                  <p className="font-semibold">{msg.subject || "(No subject)"}</p>
                                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {msg.body?.replace(/<[^>]+>/g, "").slice(0, 60)}...
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {/* Handle both communications and broadcasts */}
                                    {msg.recipient_config?.name || "System"}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {msg.recipient_type?.replace(/_/g, " ") || "Member"}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <ChannelBadge channel={msg.channel || (msg.channels && msg.channels[0]) || "in_app"} />
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={msg.status} />
                              </TableCell>
                              <TableCell className="text-sm">
                                {msg.status === "scheduled" && msg.sent_at 
                                  ? format(new Date(msg.sent_at), "dd MMM yyyy, h:mm a") 
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      disabled={updateMessageMutation.isPending || deleteMessageMutation.isPending}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <motion.div
                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                  >
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleSendMessage(msg, "email")}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send via Email
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSendMessage(msg, "sms")}>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Send via SMS
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSendMessage(msg, "whatsapp")}>
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        Send via WhatsApp
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleEditMessage(msg)}
                                        disabled={updateMessageMutation.isPending}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Draft
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-red-600" 
                                        onClick={() => handleDeleteMessage(msg)}
                                        disabled={deleteMessageMutation.isPending}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </motion.div>
                                </DropdownMenu>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
        </Tabs>
      </motion.div>

      {/* Edit Message Modal */}
      <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Draft Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={editForm.subject}
                onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Message subject..."
              />
            </div>
            <div>
              <Label htmlFor="body">Message Body</Label>
              <Textarea
                id="body"
                value={editForm.body}
                onChange={(e) => setEditForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Message content..."
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipient_type">Recipient Type</Label>
                <Select
                  value={editForm.recipient_type}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, recipient_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_members">All Members</SelectItem>
                    <SelectItem value="visitor">Visitor</SelectItem>
                    <SelectItem value="specific_member">Specific Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="channel">Channel</Label>
                <Select
                  value={editForm.channel}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, channel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="in_app">In-App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateMessage}
              disabled={updateMessageMutation.isPending}
            >
              {updateMessageMutation.isPending ? "Updating..." : "Update Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingMessage} onOpenChange={() => setDeletingMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this message? This action cannot be undone.
          </p>
          <div className="bg-muted p-3 rounded-lg mt-4">
            <p className="font-semibold text-sm">{deletingMessage?.subject || "(No subject)"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {deletingMessage?.body?.replace(/<[^>]+>/g, "").slice(0, 100)}...
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMessage(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMessageMutation.isPending}
            >
              {deleteMessageMutation.isPending ? "Deleting..." : "Delete Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};