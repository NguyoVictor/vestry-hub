import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Plus, Mail, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

const channelIcons: Record<string, typeof Mail> = { email: Mail, sms: MessageSquare, in_app: Send };
const statusColors: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive",
};

export default function Communications() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", recipient_type: "all_members", channel: "in_app" as string });

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ["broadcasts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const sendBroadcast = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("broadcasts").insert({
        tenant_id: tenantId,
        subject: form.subject,
        body: form.body,
        channels: [form.channel],
        recipient_type: form.recipient_type,
        status: "sent",
        sent_by: userId,
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Message sent successfully");
      setShowCompose(false);
      logActivity({ churchId: tenantId!, actionType: "new_broadcast", description: `Broadcast "${form.subject}" was sent via ${form.channel}`, entityType: "broadcast", entityName: form.subject });
      setForm({ subject: "", body: "", recipient_type: "all_members", channel: "in_app" });
    },
    onError: () => toast.error("Failed to send message"),
  });

  const sentCount = broadcasts?.filter(b => b.status === "sent").length || 0;
  const draftCount = broadcasts?.filter(b => b.status === "draft").length || 0;

  return (
    <div>
      <PageHeader title="Communications" subtitle="Send broadcast messages to your congregation" action={<Button onClick={() => setShowCompose(true)}><Plus className="mr-2 h-4 w-4" />Compose Message</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Messages Sent</p><p className="text-3xl font-bold">{sentCount}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Drafts</p><p className="text-3xl font-bold">{draftCount}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Total Broadcasts</p><p className="text-3xl font-bold">{broadcasts?.length || 0}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="sent">
        <TabsList><TabsTrigger value="sent">Sent Messages</TabsTrigger><TabsTrigger value="drafts">Drafts & Scheduled {draftCount > 0 && <Badge className="ml-1" variant="secondary">{draftCount}</Badge>}</TabsTrigger></TabsList>

        <TabsContent value="sent">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !broadcasts?.filter(b => b.status === "sent").length ? (
                <div className="text-center py-12">
                  <Send className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-lg font-medium">No messages sent yet</p>
                  <p className="text-muted-foreground text-sm">Compose your first broadcast message.</p>
                  <Button className="mt-4" onClick={() => setShowCompose(true)}>Compose Message</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broadcasts.filter(b => b.status === "sent").map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-medium">{msg.subject}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{msg.recipient_type?.replace(/_/g, " ")}</TableCell>
                        <TableCell><Badge variant="secondary">{(msg.channels as string[])?.[0] || "in_app"}</Badge></TableCell>
                        <TableCell className="text-sm">{msg.sent_at ? format(new Date(msg.sent_at), "dd MMM yyyy · HH:mm") : "—"}</TableCell>
                        <TableCell><Badge className={statusColors[msg.status || "sent"]}>{msg.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts">
          <Card>
            <CardContent className="pt-6">
              {!broadcasts?.filter(b => b.status === "draft" || b.status === "scheduled").length ? (
                <p className="text-center text-muted-foreground py-8">No drafts or scheduled messages.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broadcasts.filter(b => b.status === "draft" || b.status === "scheduled").map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="font-medium">{msg.subject}</TableCell>
                        <TableCell><Badge className={statusColors[msg.status || "draft"]}>{msg.status}</Badge></TableCell>
                        <TableCell className="text-sm">{msg.created_at ? format(new Date(msg.created_at), "dd MMM yyyy") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={showCompose} onOpenChange={setShowCompose}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Compose Message</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Message subject..." />
            </div>
            <div>
              <Label>Message Body *</Label>
              <Textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your message..." rows={8} />
              <p className="text-xs text-muted-foreground mt-1">Supports variables: {"{first_name}"}, {"{church_name}"}</p>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-App Notification</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms" disabled>SMS (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipients</Label>
              <Select value={form.recipient_type} onValueChange={(v) => setForm(f => ({ ...f, recipient_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_members">All Members</SelectItem>
                  <SelectItem value="specific_groups">Specific Groups</SelectItem>
                  <SelectItem value="staff_only">Staff Only</SelectItem>
                  <SelectItem value="visitor">Visitors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                supabase.from("broadcasts").insert({
                  tenant_id: tenantId, subject: form.subject, body: form.body,
                  channels: [form.channel], recipient_type: form.recipient_type, status: "draft", sent_by: userId,
                }).then(() => {
                  queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
                  toast.success("Saved as draft");
                  setShowCompose(false);
                });
              }}>Save Draft</Button>
              <Button className="flex-1" disabled={!form.subject || !form.body || sendBroadcast.isPending} onClick={() => sendBroadcast.mutate()}>
                <Send className="mr-2 h-4 w-4" />{sendBroadcast.isPending ? "Sending..." : "Send Now"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
