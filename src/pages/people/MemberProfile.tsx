import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Edit, Camera } from "lucide-react";
import { format } from "date-fns";

const MEMBERSHIP_STATUSES = [
  "Pending Approval", "Visitor", "New Convert", "Member", "Worker",
  "Counselor", "Deacon", "Deaconess", "Pastor", "Assistant Pastor",
  "General Overseer", "Archbishop", "Vice Archbishop", "Bishop", "Vice Bishop",
  "Overseer", "Vice Overseer", "Archdeacon", "Vice Arch Deacon",
  "Treasurer General", "Vice Treasurer General", "Elder In Charge",
  "Vice Elder In Charge", "Vice Deacon", "Secretary General",
  "Vice Secretary General", "Minister", "Evangelist", "Preacher", "Prophet",
  "Branch Deacon", "Branch Treasurer", "Branch Security",
  "Women Fellowship Leader", "Choir Leader", "Youth Leader",
  "Sunday School Leader", "Other",
];

const MemberProfile = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", memberId],
    queryFn: async () => {
      const { data: memberData } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId!)
        .maybeSingle();
      if (memberData) return memberData;
      const { data, error } = await supabase
        .from("users")
        .select("id, tenant_id, email, role, first_name, last_name, phone, date_of_birth, join_date, status, gender, avatar_url, created_at, updated_at")
        .eq("id", memberId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
    staleTime: 300000,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["member-groups", memberId],
    queryFn: async () => {
      const { data } = await supabase.from("group_members").select("*, groups(name, type)").eq("member_id", memberId!) as any;
      return data || [];
    },
    enabled: !!memberId,
  });

  const openEdit = () => {
    if (!member) return;
    setEditForm({
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      gender: member.gender || "",
      date_of_birth: member.date_of_birth || "",
      marital_status: member.marital_status || "",
      occupation: member.occupation || "",
      phone: member.phone || "",
      email: member.email || "",
      street: member.street || "",
      city: member.city || "",
      state: member.state || "",
      postal_code: member.postal_code || "",
      country: member.country || "",
      membership_status: member.membership_status || "Member",
      is_counselor: member.is_counselor || false,
      join_date: member.join_date || "",
      salvation_date: member.salvation_date || "",
      baptism_date: member.baptism_date || "",
      communication_prefs: member.communication_prefs || {
        email: true, sms: true, push: true, events: true, newsletter: true,
      },
      pastoral_notes: member.pastoral_notes || "",
      notes: member.notes || "",
    });
    setEditOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("members").update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        gender: editForm.gender || null,
        date_of_birth: editForm.date_of_birth || null,
        marital_status: editForm.marital_status || null,
        occupation: editForm.occupation || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        street: editForm.street || null,
        city: editForm.city || null,
        state: editForm.state || null,
        postal_code: editForm.postal_code || null,
        country: editForm.country || null,
        membership_status: editForm.membership_status || null,
        is_counselor: editForm.is_counselor,
        join_date: editForm.join_date || null,
        salvation_date: editForm.salvation_date || null,
        baptism_date: editForm.baptism_date || null,
        communication_prefs: editForm.communication_prefs,
        pastoral_notes: editForm.pastoral_notes || null,
        notes: editForm.notes || null,
        updated_at: new Date().toISOString(),
      } as any).eq("id", memberId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", memberId] });
      toast.success("Member updated successfully");
      setEditOpen(false);
    },
    onError: () => toast.error("Failed to update member"),
  });

  if (isLoading) return <div className="space-y-4 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!member) return <div className="p-6 text-center text-muted-foreground">Member not found</div>;

  const name = `${member.first_name || ""} ${member.last_name || ""}`.trim();
  const initials = `${(member.first_name || "?")[0]}${(member.last_name || "?")[0]}`.toUpperCase();

  return (
    <>
      <Helmet><title>{name} — Vestry</title></Helmet>
      <Button variant="ghost" size="sm" onClick={() => navigate("/members")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />Back to Members
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left profile card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 text-center space-y-4">
            {member.membership_status === "Pending Approval" && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
                ⏳ Pending Approval — registered via QR code
              </div>
            )}
            <MemberAvatar name={name} avatarUrl={member.avatar_url} size="lg" className="mx-auto" />
            <div>
              <h2 className="text-xl font-bold">{name}</h2>
              <StatusBadge status={member.status} className="mt-1" />
              {member.membership_status && member.membership_status !== "Member" && (
                <p className="text-xs text-muted-foreground mt-1">{member.membership_status}</p>
              )}
            </div>
            <div className="text-sm text-muted-foreground space-y-2 text-left">
              {member.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" />{member.email}</div>}
              {member.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" />{member.phone}</div>}
              {member.city && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{member.city}{member.country ? `, ${member.country}` : ""}</div>}
              {member.join_date && <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Joined {format(new Date(member.join_date), "dd MMM yyyy")}</div>}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" size="sm" onClick={openEdit}>
                <Edit className="h-4 w-4 mr-1" />Edit
              </Button>
              <Button className="flex-1" size="sm">
                <Mail className="h-4 w-4 mr-1" />Message
              </Button>
            </div>
            {member.membership_status === "Pending Approval" && (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
                onClick={async () => {
                  await supabase.from("members").update({ membership_status: "Member", status: "active" } as any).eq("id", memberId!);
                  queryClient.invalidateQueries({ queryKey: ["member", memberId] });
                  toast.success("Member approved");
                }}
              >
                ✓ Approve Member
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Right content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="giving">Giving</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Gender</span><p className="font-medium capitalize">{member.gender || "—"}</p></div>
                  <div><span className="text-muted-foreground">Date of Birth</span><p className="font-medium">{member.date_of_birth ? format(new Date(member.date_of_birth), "dd MMM yyyy") : "—"}</p></div>
                  <div><span className="text-muted-foreground">Marital Status</span><p className="font-medium capitalize">{member.marital_status || "—"}</p></div>
                  <div><span className="text-muted-foreground">Occupation</span><p className="font-medium">{member.occupation || "—"}</p></div>
                  <div><span className="text-muted-foreground">Membership #</span><p className="font-medium font-mono text-xs">{member.membership_number || "—"}</p></div>
                  <div><span className="text-muted-foreground">Baptism Date</span><p className="font-medium">{member.baptism_date ? format(new Date(member.baptism_date), "dd MMM yyyy") : "—"}</p></div>
                  <div><span className="text-muted-foreground">Membership Status</span><p className="font-medium">{member.membership_status || "Member"}</p></div>
                  {member.is_counselor && <div><span className="text-muted-foreground">Role</span><p className="font-medium text-indigo-600">Counselor</p></div>}
                </CardContent>
              </Card>
              {member.notes && (
                <Card><CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader><CardContent><p className="text-sm">{member.notes}</p></CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="groups" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Groups ({groups.length})</CardTitle></CardHeader>
                <CardContent>
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Not in any groups yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {groups.map((g: any) => (
                        <div key={g.group_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{g.groups?.name || "Group"}</span>
                          <Badge variant="secondary" className="capitalize">{g.groups?.type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="giving" className="mt-4">
              <Card><CardContent className="py-8 text-center text-muted-foreground">Giving history will appear here once records are added.</CardContent></Card>
            </TabsContent>
            <TabsContent value="attendance" className="mt-4">
              <Card><CardContent className="py-8 text-center text-muted-foreground">Attendance history will appear here.</CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Edit Member Modal ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="edit-member-desc"
        >
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>

          {editForm && (
            <div className="space-y-6" id="edit-member-desc">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                    {member.avatar_url
                      ? <img src={member.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                      : initials}
                  </div>
                  <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-orange-500 flex items-center justify-center text-white shadow">
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input value={editForm.first_name} onChange={e => setEditForm((f: any) => ({ ...f, first_name: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input value={editForm.last_name} onChange={e => setEditForm((f: any) => ({ ...f, last_name: e.target.value }))} className="rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Gender *</Label>
                  <Select value={editForm.gender || undefined} onValueChange={v => setEditForm((f: any) => ({ ...f, gender: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={editForm.date_of_birth} onChange={e => setEditForm((f: any) => ({ ...f, date_of_birth: e.target.value }))} className="rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Marital Status</Label>
                  <Select value={editForm.marital_status || undefined} onValueChange={v => setEditForm((f: any) => ({ ...f, marital_status: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Occupation</Label>
                  <Input value={editForm.occupation} onChange={e => setEditForm((f: any) => ({ ...f, occupation: e.target.value }))} placeholder="e.g. Software Engineer" className="rounded-xl" />
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Contact Information */}
              <h3 className="font-bold text-lg">Contact Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone *</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Address Line</Label>
                <Input value={editForm.street} onChange={e => setEditForm((f: any) => ({ ...f, street: e.target.value }))} placeholder="123 Main Street, Apt 4B" className="rounded-xl" />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={editForm.city} onChange={e => setEditForm((f: any) => ({ ...f, city: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>State/Region</Label>
                  <Input value={editForm.state} onChange={e => setEditForm((f: any) => ({ ...f, state: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Post Code</Label>
                  <Input value={editForm.postal_code} onChange={e => setEditForm((f: any) => ({ ...f, postal_code: e.target.value }))} placeholder="e.g. 12345" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={editForm.country} onChange={e => setEditForm((f: any) => ({ ...f, country: e.target.value }))} className="rounded-xl" />
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Church Information — ADMIN ONLY */}
              <h3 className="font-bold text-lg">Church Information</h3>

              <div className="space-y-1.5">
                <Label>Membership Status *</Label>
                <Select value={editForm.membership_status || undefined} onValueChange={v => setEditForm((f: any) => ({ ...f, membership_status: v }))}>
                  <SelectTrigger className="rounded-xl border-orange-300 focus:ring-orange-400">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {MEMBERSHIP_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${editForm.is_counselor ? "border-orange-300 bg-orange-50 dark:bg-orange-900/20" : "border-slate-200 dark:border-slate-700"}`}
                onClick={() => setEditForm((f: any) => ({ ...f, is_counselor: !f.is_counselor }))}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${editForm.is_counselor ? "border-orange-500 bg-orange-500" : "border-slate-300"}`}>
                  {editForm.is_counselor && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Designate as Counselor</p>
                  <p className="text-xs text-muted-foreground">Can be selected for counseling appointments</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Joined Church Date</Label>
                <Input type="date" value={editForm.join_date} onChange={e => setEditForm((f: any) => ({ ...f, join_date: e.target.value }))} className="rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Salvation Date</Label>
                  <Input type="date" value={editForm.salvation_date} onChange={e => setEditForm((f: any) => ({ ...f, salvation_date: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Baptism Date</Label>
                  <Input type="date" value={editForm.baptism_date} onChange={e => setEditForm((f: any) => ({ ...f, baptism_date: e.target.value }))} className="rounded-xl" />
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Communication Preferences */}
              <div>
                <h3 className="font-bold text-lg mb-1">Communication Preferences</h3>
                <p className="text-sm text-muted-foreground mb-4">Choose how you want to receive updates from the church</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
                    { key: "sms", label: "SMS Notifications", desc: "Receive updates via text message" },
                    { key: "push", label: "Push Notifications", desc: "Receive in-app push alerts" },
                    { key: "events", label: "Event Reminders", desc: "Reminders for upcoming events" },
                    { key: "newsletter", label: "Church Newsletter", desc: "Subscribe to the church newsletter" },
                  ].map(({ key, label, desc }) => {
                    const checked = editForm.communication_prefs?.[key] !== false;
                    return (
                      <div
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? "border-orange-300 bg-orange-50 dark:bg-orange-900/20" : "border-slate-200 dark:border-slate-700"}`}
                        onClick={() => setEditForm((f: any) => ({ ...f, communication_prefs: { ...f.communication_prefs, [key]: !checked } }))}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${checked ? "bg-orange-500" : "bg-slate-200 dark:bg-slate-700"}`}>
                          {checked && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Pastoral Notes — admin only */}
              <div>
                <h3 className="font-bold text-lg mb-1">Pastoral Notes</h3>
                <p className="text-sm text-muted-foreground mb-3">Private notes visible only to Church Admins and Pastors</p>
                <Textarea
                  value={editForm.pastoral_notes}
                  onChange={e => setEditForm((f: any) => ({ ...f, pastoral_notes: e.target.value }))}
                  placeholder="Add private pastoral notes here..."
                  rows={4}
                  className="rounded-xl"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Saving..." : "Update Member"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MemberProfile;
