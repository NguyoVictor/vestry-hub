import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, Column } from "@/components/shared/DataTable";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, addMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Users, Clock, TrendingUp, Plus, Heart, MapPin, Award,
  ImagePlus, X, ChevronLeft, ChevronRight, List, CalendarDays, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const ACTIVITY_TYPES = [
  "street_evangelism", "prison_ministry", "hospital_visitation", "school_outreach",
  "community_service", "feeding_programme", "medical_camp", "sports_outreach", "door_to_door", "other",
];

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  street_evangelism: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  prison_ministry: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  hospital_visitation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  school_outreach: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  community_service: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  feeding_programme: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  medical_camp: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  sports_outreach: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  door_to_door: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400",
};

const IMPACT_COLORS = ["#ea580c", "#7c3aed", "#0ea5e9", "#d97706", "#059669", "#f59e0b", "#ec4899", "#84cc16", "#f97316", "#6366f1"];

function impactBadge(score: number) {
  if (score >= 100) return { label: "Platinum", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" };
  if (score >= 50) return { label: "Gold", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  if (score >= 20) return { label: "Silver", color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" };
  return { label: "Bronze", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
}

const defaultForm = {
  name: "", type: "street_evangelism", activity_date: format(new Date(), "yyyy-MM-dd"),
  start_time: "", end_time: "", location: "", description: "", target_community: "",
  volunteer_ids: [] as string[], team_leader_id: "",
  people_reached: "", salvations: "", visitors_captured: "", materials_distributed: "",
  status: "completed", report: "", follow_up_required: false, follow_up_count: "",
};

export default function Outreach() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [logSheet, setLogSheet] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["members-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name").eq(COLS.TENANT_ID, tenantId).order("first_name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["outreach-activities", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.OUTREACH_ACTIVITIES).select("*").eq(COLS.TENANT_ID, tenantId).order("activity_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const thisYear = new Date().getFullYear();
  const stats = {
    total: activities.length,
    peopleReached: activities.filter((a: any) => new Date(a.activity_date).getFullYear() === thisYear).reduce((s: number, a: any) => s + (a.people_reached || 0), 0),
    volunteers: activities.filter((a: any) => new Date(a.activity_date).getFullYear() === thisYear).reduce((s: number, a: any) => s + (a.volunteer_ids?.length || 0), 0),
    hours: activities.reduce((s: number, a: any) => {
      if (!a.start_time || !a.end_time) return s;
      const [sh, sm] = a.start_time.split(":").map(Number);
      const [eh, em] = a.end_time.split(":").map(Number);
      return s + ((eh * 60 + em - sh * 60 - sm) / 60) * (a.volunteer_ids?.length || 1);
    }, 0),
  };

  // Impact chart data
  const impactData = (() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i);
      return { month: format(d, "MMM"), start: startOfMonth(d).toISOString().split("T")[0], end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0] };
    });
    return months.map(m => ({
      month: m.month,
      "People Reached": activities.filter((a: any) => a.activity_date >= m.start && a.activity_date <= m.end).reduce((s: number, a: any) => s + (a.people_reached || 0), 0),
      "Salvations": activities.filter((a: any) => a.activity_date >= m.start && a.activity_date <= m.end).reduce((s: number, a: any) => s + (a.salvations || 0), 0),
    }));
  })();

  // Type breakdown
  const typeBreakdown = ACTIVITY_TYPES.map(t => ({
    name: t.replace(/_/g, " "),
    value: activities.filter((a: any) => a.type === t).length,
  })).filter(t => t.value > 0);

  // Year-over-Year comparison
  const yoyData = (() => {
    const thisYear = new Date().getFullYear();
    const lastYear = thisYear - 1;
    const months = Array.from({ length: 12 }, (_, i) => format(new Date(thisYear, i, 1), "MMM"));
    return months.map((month, i) => {
      const thisYearActivities = activities.filter((a: any) => {
        const d = new Date(a.activity_date);
        return d.getFullYear() === thisYear && d.getMonth() === i;
      });
      const lastYearActivities = activities.filter((a: any) => {
        const d = new Date(a.activity_date);
        return d.getFullYear() === lastYear && d.getMonth() === i;
      });
      return {
        month,
        "This Year": thisYearActivities.reduce((s: number, a: any) => s + (a.people_reached || 0), 0),
        "Last Year": lastYearActivities.reduce((s: number, a: any) => s + (a.people_reached || 0), 0),
      };
    });
  })();

  // Photo handling
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedPhotos.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }
    
    // Validate file sizes
    const invalidFiles = files.filter(f => f.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error("Some files exceed 5MB limit");
      return;
    }
    
    setSelectedPhotos(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };
  
  const openLightbox = (photos: string[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const saveActivity = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        type: form.type,
        activity_date: form.activity_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location,
        description: form.description,
        target_community: form.target_community,
        volunteer_ids: form.volunteer_ids,
        team_leader_id: form.team_leader_id || null,
        people_reached: Number(form.people_reached) || 0,
        salvations: Number(form.salvations) || 0,
        visitors_captured: Number(form.visitors_captured) || 0,
        materials_distributed: form.materials_distributed,
        status: form.status,
        report: form.report,
        follow_up_required: form.follow_up_required,
        follow_up_count: Number(form.follow_up_count) || 0,
        tenant_id: tenantId,
        created_by: userId,
        photo_urls: [] as string[],
      };
      
      let activityId = editId;
      
      if (editId) {
        const { error } = await supabase.from(TABLES.OUTREACH_ACTIVITIES).update(payload).eq(COLS.ID, editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from(TABLES.OUTREACH_ACTIVITIES).insert(payload).select("id").single();
        if (error) throw error;
        activityId = data?.id;
      }
      
      // Upload photos if any
      const uploadedUrls: string[] = [];
      if (selectedPhotos.length > 0 && activityId) {
        for (const photo of selectedPhotos) {
          try {
            const timestamp = Date.now();
            const fileName = `${timestamp}_${photo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = `${tenantId}/${activityId}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('outreach-photos')
              .upload(filePath, photo);
            
            if (uploadError) {
              console.error("Photo upload error:", uploadError);
              continue;
            }
            
            const { data: { publicUrl } } = supabase.storage
              .from('outreach-photos')
              .getPublicUrl(filePath);
            
            uploadedUrls.push(publicUrl);
          } catch (err) {
            console.error("Photo upload failed:", err);
          }
        }
        
        // Update activity with photo URLs
        if (uploadedUrls.length > 0) {
          await supabase
            .from(TABLES.OUTREACH_ACTIVITIES)
            .update({ photo_urls: uploadedUrls })
            .eq(COLS.ID, activityId);
        }
      }
      
      // Create follow-up task if required
      if (!editId && form.follow_up_required && Number(form.follow_up_count) > 0 && form.team_leader_id) {
        const followUpDate = new Date(form.activity_date);
        followUpDate.setDate(followUpDate.getDate() + 3);
        
        const followUpTask = {
          tenant_id: tenantId,
          title: `Follow up with ${form.follow_up_count} people from ${form.name}`,
          description: `Outreach activity conducted at ${form.location || "location not specified"} on ${format(new Date(form.activity_date), "dd MMM yyyy")}. ${form.follow_up_count} people require follow-up contact.`,
          assigned_to: form.team_leader_id,
          due_date: format(followUpDate, "yyyy-MM-dd"),
          status: "pending",
          created_by: userId,
        };
        
        const { error: taskError } = await supabase.from(TABLES.FOLLOW_UP_TASKS).insert(followUpTask);
        if (taskError) console.error("Failed to create follow-up task:", taskError);
      }
      
      return { 
        followUpCreated: !editId && form.follow_up_required && Number(form.follow_up_count) > 0,
        photosUploaded: uploadedUrls.length,
        photosFailed: selectedPhotos.length - uploadedUrls.length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["outreach-activities", tenantId] });
      setLogSheet(false);
      setForm(defaultForm);
      setEditId(null);
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
      
      let message = editId ? "Activity updated" : "Activity logged";
      if (data?.followUpCreated) {
        message += ". Follow-up task created and assigned to team leader";
      }
      if (data?.photosUploaded && data.photosUploaded > 0) {
        message += `. ${data.photosUploaded} photo(s) uploaded`;
      }
      if (data?.photosFailed && data.photosFailed > 0) {
        message += `. ${data.photosFailed} photo(s) failed to upload`;
      }
      
      toast.success(message);
    },
    onError: () => toast.error("Failed to save activity"),
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.OUTREACH_ACTIVITIES).delete().eq(COLS.ID, id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach-activities", tenantId] });
      toast.success("Activity deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const columns: Column<any>[] = [
    { key: "name", header: "Activity", sortable: true, render: r => (
      <div>
        <p className="font-medium text-sm">{r.name}</p>
        <Badge className={`text-xs mt-0.5 capitalize ${ACTIVITY_TYPE_COLORS[r.type] || ""}`}>{r.type?.replace(/_/g, " ")}</Badge>
      </div>
    )},
    { key: "activity_date", header: "Date", sortable: true, render: r => <span className="text-sm">{format(new Date(r.activity_date), "dd MMM yyyy")}</span> },
    { key: "location", header: "Location", sortable: true, render: r => <span className="text-sm">{r.location || "—"}</span> },
    { key: "volunteer_ids", header: "Volunteers", sortable: true, render: r => <span className="flex items-center gap-1 text-sm">👥 {r.volunteer_ids?.length || 0} volunteers</span> },
    { key: "people_reached", header: "Impact", sortable: true, render: r => (
      <div className="text-sm">
        <div>{r.salvations || 0} salvations • {r.people_reached || 0} reached</div>
      </div>
    )},
    { key: "status", header: "Status", sortable: true, render: r => <Badge className={`text-xs capitalize ${STATUS_COLORS[r.status] || ""}`}>{r.status}</Badge> },
    { key: "actions", header: "Actions", render: r => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => { setForm({ name: r.name, type: r.type, activity_date: r.activity_date, start_time: r.start_time || "", end_time: r.end_time || "", location: r.location || "", description: r.description || "", target_community: r.target_community || "", volunteer_ids: r.volunteer_ids || [], team_leader_id: r.team_leader_id || "", people_reached: String(r.people_reached || ""), salvations: String(r.salvations || ""), visitors_captured: String(r.visitors_captured || ""), materials_distributed: r.materials_distributed || "", status: r.status, report: r.report || "", follow_up_required: r.follow_up_required || false, follow_up_count: String(r.follow_up_count || "") }); setEditId(r.id); setLogSheet(true); }}>Edit</Button>
        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteActivity.mutate(r.id)}>Delete</Button>
      </div>
    )},
  ];

  return (
    <>
      <Helmet><title>Outreach & Impact — Vestry</title></Helmet>
      <PageHeader
        title="Outreach & Impact"
        subtitle="Plan, execute and measure your church's outreach activities"
        action={<Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setForm(defaultForm); setEditId(null); setLogSheet(true); setSelectedPhotos([]); setPhotoPreviewUrls([]); }}><Plus className="h-4 w-4 mr-1" />Log Outreach Activity</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Activities", value: stats.total, icon: Globe, color: "indigo" },
          { label: "People Reached This Year", value: stats.peopleReached.toLocaleString(), icon: Users, color: "emerald" },
          { label: "Volunteers Deployed", value: stats.volunteers.toLocaleString(), icon: Heart, color: "violet" },
          { label: "Total Outreach Hours", value: Math.round(stats.hours).toLocaleString(), icon: Clock, color: "amber" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                <Icon className={`h-5 w-5 text-${color}-600`} />
              </div>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="activities">
        <TabsList className="mb-4">
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="impact">Impact Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card>
            <CardContent className="p-0">
              <DataTable
                data={activities}
                columns={columns}
                loading={isLoading}
                getRowId={r => r.id}
                emptyIcon={<Globe className="h-8 w-8 text-slate-300" />}
                emptyTitle="No outreach activities yet"
                emptyDescription="Log your first outreach activity to start tracking impact"
                emptyCta={<Button onClick={() => setLogSheet(true)}><Plus className="h-4 w-4 mr-1" />Log Activity</Button>}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Impact Over Time — Last 12 Months</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={impactData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Area type="monotone" dataKey="People Reached" stroke="#4F46E5" fill="#4F46E520" strokeWidth={2} />
                  <Area type="monotone" dataKey="Salvations" stroke="#10B981" fill="#10B98120" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Activity Type Breakdown</CardTitle></CardHeader>
              <CardContent>
                {typeBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={typeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {typeBreakdown.map((_, i) => <Cell key={i} fill={IMPACT_COLORS[i % IMPACT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top Locations</CardTitle></CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(
                      activities.reduce((acc: Record<string, { count: number; reached: number }>, a: any) => {
                        if (!a.location) return acc;
                        if (!acc[a.location]) acc[a.location] = { count: 0, reached: 0 };
                        acc[a.location].count++;
                        acc[a.location].reached += a.people_reached || 0;
                        return acc;
                      }, {})
                    ).sort((a, b) => b[1].count - a[1].count).slice(0, 8).map(([loc, data]) => (
                      <div key={loc} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{loc}</span>
                        <div className="flex gap-4 text-muted-foreground">
                          <span>{data.count} activities</span>
                          <span>{data.reached} reached</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Year-over-Year: People Reached</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={yoyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="This Year" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Last Year" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Activity Sheet */}
      <Sheet open={logSheet} onOpenChange={setLogSheet}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>{editId ? "Edit Activity" : "Log Outreach Activity"}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Activity Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Activity Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.activity_date} onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Target Community</Label>
              <Input value={form.target_community} onChange={e => setForm(f => ({ ...f, target_community: e.target.value }))} placeholder="e.g. Mathare Slums" />
            </div>
            <div className="space-y-1.5">
              <Label>Team Leader</Label>
              <Select value={form.team_leader_id} onValueChange={v => setForm(f => ({ ...f, team_leader_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select team leader..." /></SelectTrigger>
                <SelectContent>
                  {members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Volunteers</Label>
              <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                {members.map((m: any) => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-sm">
                    <input
                      type="checkbox"
                      checked={form.volunteer_ids.includes(m.id)}
                      onChange={e => setForm(f => ({ ...f, volunteer_ids: e.target.checked ? [...f.volunteer_ids, m.id] : f.volunteer_ids.filter(id => id !== m.id) }))}
                      className="rounded"
                    />
                    {m.first_name} {m.last_name}
                  </label>
                ))}
              </div>
              {form.volunteer_ids.length > 0 && <p className="text-xs text-muted-foreground">{form.volunteer_ids.length} volunteer(s) selected</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>People Reached</Label>
                <Input type="number" min="0" value={form.people_reached} onChange={e => setForm(f => ({ ...f, people_reached: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Salvations</Label>
                <Input type="number" min="0" value={form.salvations} onChange={e => setForm(f => ({ ...f, salvations: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Visitors</Label>
                <Input type="number" min="0" value={form.visitors_captured} onChange={e => setForm(f => ({ ...f, visitors_captured: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Materials Distributed</Label>
              <Textarea value={form.materials_distributed} onChange={e => setForm(f => ({ ...f, materials_distributed: e.target.value }))} placeholder="e.g. 200 tracts, 50 Bibles" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Report / Notes</Label>
              <Textarea value={form.report} onChange={e => setForm(f => ({ ...f, report: e.target.value }))} rows={4} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.follow_up_required} onCheckedChange={v => setForm(f => ({ ...f, follow_up_required: v }))} />
              <Label>Follow-up Required</Label>
            </div>
            {form.follow_up_required && (
              <div className="space-y-1.5">
                <Label>Number Requiring Follow-up</Label>
                <Input type="number" min="0" value={form.follow_up_count} onChange={e => setForm(f => ({ ...f, follow_up_count: e.target.value }))} />
              </div>
            )}
            
            {/* Photo Upload Section */}
            <div className="space-y-1.5">
              <Label>Photos (optional)</Label>
              <p className="text-xs text-muted-foreground">Upload up to 5 photos from this activity</p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-border/60 bg-muted/30 p-6 text-center cursor-pointer hover:border-orange-500/40 hover:bg-muted/50 transition-colors"
              >
                <ImagePlus className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload or drag photos here</p>
                <p className="text-xs text-muted-foreground mt-1">JPEG, PNG or WebP • Max 5MB each • Up to 5 photos</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              
              {/* Photo Previews */}
              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {photoPreviewUrls.map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden relative group">
                      <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => saveActivity.mutate()} disabled={!form.name || !form.activity_date || saveActivity.isPending}>
              {saveActivity.isPending ? "Saving..." : editId ? "Update Activity" : "Log Activity"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Lightbox for viewing photos */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            {lightboxPhotos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length); }}
                  className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % lightboxPhotos.length); }}
                  className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            
            <img
              src={lightboxPhotos[lightboxIndex]}
              alt="Activity photo"
              className="max-h-[85vh] max-w-[85vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {lightboxPhotos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                {lightboxIndex + 1} / {lightboxPhotos.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
