import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePledgeCommitmentsRealtime } from "@/hooks/useFinanceRealtime";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";
import { Target, Plus, MoreHorizontal, Pencil, Trash2, Eye, Calendar, Users, TrendingUp, Sparkles, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { formatCurrencyFull } from "@/lib/format";

const CATEGORIES = ["building_fund", "missions", "equipment", "welfare", "community", "other"];

// Premium page animations
const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1], 
      staggerChildren: 0.08 
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 25 
    } 
  }
}

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const PledgeCampaigns = () => {
  const { tenantId, currency, userId } = useChurch();
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('financial_records');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "other", target_amount: "", start_date: new Date().toISOString().split("T")[0], end_date: "", status: "draft" });

  // Real-time updates for pledge campaigns
  usePledgeCommitmentsRealtime(tenantId || '', () => {
    queryClient.invalidateQueries({ queryKey: ["pledge-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["pledges-summary"] });
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["pledge-campaigns", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pledge_campaigns").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: pledgesBycamp = {} } = useQuery({
    queryKey: ["pledges-summary", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("pledges").select("campaign_id, committed_amount, fulfilled_amount").eq("tenant_id", tenantId!);
      const map: Record<string, { count: number; pledged: number; paid: number }> = {};
      (data || []).forEach((p: any) => {
        if (!map[p.campaign_id]) map[p.campaign_id] = { count: 0, pledged: 0, paid: 0 };
        map[p.campaign_id].count++;
        map[p.campaign_id].pledged += Number(p.committed_amount);
        map[p.campaign_id].paid += Number(p.fulfilled_amount);
      });
      return map;
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { tenant_id: tenantId, name: form.name, description: form.description, category: form.category, target_amount: parseFloat(form.target_amount), currency, start_date: form.start_date, end_date: form.end_date, status: form.status, created_by: userId };
      if (editingId) {
        const { error } = await supabase.from("pledge_campaigns").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pledge_campaigns").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["pledge-campaigns"] }); 
      toast.success(editingId ? "Campaign updated! 📝" : "Campaign created! 🎯", {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      }); 
      closeSheet(); 
    },
    onError: () => toast.error("Failed to save campaign", {
      duration: 4000,
      style: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        borderRadius: '12px',
        padding: '16px',
        fontWeight: '600'
      }
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("pledge_campaigns").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["pledge-campaigns"] }); 
      toast.success("Campaign deleted! 🗑️", {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      }); 
    },
  });

  const closeSheet = () => { setSheetOpen(false); setEditingId(null); setForm({ name: "", description: "", category: "other", target_amount: "", start_date: new Date().toISOString().split("T")[0], end_date: "", status: "draft" }); };

  const openEdit = (c: any) => { setEditingId(c.id); setForm({ name: c.name, description: c.description || "", category: c.category, target_amount: String(c.target_amount), start_date: c.start_date, end_date: c.end_date, status: c.status }); setSheetOpen(true); };

  return (
    <>
      <Helmet><title>Pledge Campaigns — Vestry</title></Helmet>
      
      <motion.div 
        variants={pageVariants} 
        initial="hidden" 
        animate="visible"
        className="space-y-8"
      >
        {/* Premium Page Header */}
        <motion.div
          variants={cardVariants}
          className="relative"
        >
          {/* Background gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.15, 0.1]
              }}
              transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-blue-500 rounded-full blur-3xl"
            />
          </div>

          <PageHeader 
            title="Pledge Campaigns" 
            subtitle="Run fundraising pledge drives for your church projects" 
            action={
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PermissionButton 
                  readOnly={readOnly}
                  onClick={() => setSheetOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </PermissionButton>
              </motion.div>
            } 
          />
        </motion.div>

        {readOnly && <ReadOnlyBanner section="Financial Records" />}

        {/* Premium Content */}
        {isLoading ? (
          <motion.div 
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[1,2,3].map(i => (
              <motion.div key={i} variants={cardVariants}>
                <Card className="rounded-2xl border-2 border-gray-100">
                  <CardContent className="p-6 h-64 space-y-4">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-gray-200 rounded-xl w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded-xl w-1/2"></div>
                      <div className="h-2 bg-gray-200 rounded-full w-full"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded-xl w-2/3"></div>
                        <div className="h-3 bg-gray-200 rounded-xl w-1/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : campaigns.length === 0 ? (
          <motion.div
            variants={cardVariants}
            className="relative"
          >
            <Card className="rounded-3xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50/80 to-white/40 backdrop-blur-sm">
              <CardContent className="text-center py-16">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Target className="h-10 w-10 text-purple-500" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-6">
                  Create your first pledge campaign to start fundraising for church projects
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PermissionButton 
                    permission="financial_records"
                    readOnly={readOnly}
                    onClick={() => setSheetOpen(true)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Campaign
                  </PermissionButton>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div 
            variants={gridVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {campaigns.map((c: any, index: number) => {
              const summary = pledgesBycamp[c.id] || { count: 0, pledged: 0, paid: 0 };
              const pct = c.target_amount > 0 ? Math.min(100, (summary.pledged / Number(c.target_amount)) * 100) : 0;
              
              return (
                <motion.div
                  key={c.id}
                  variants={cardVariants}
                  whileHover={{ 
                    y: -8, 
                    scale: 1.02,
                    transition: { type: 'spring', stiffness: 400, damping: 25 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="group"
                >
                  <Card className="relative h-full rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
                    {/* Glassmorphism overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    
                    {/* Campaign Header with Category Gradient */}
                    <div className={`relative h-24 bg-gradient-to-r ${
                      c.category === 'building_fund' ? 'from-blue-500 via-blue-600 to-blue-700' :
                      c.category === 'missions' ? 'from-green-500 via-green-600 to-green-700' :
                      c.category === 'equipment' ? 'from-amber-500 via-amber-600 to-amber-700' :
                      c.category === 'welfare' ? 'from-pink-500 via-pink-600 to-pink-700' :
                      'from-purple-500 via-purple-600 to-purple-700'
                    } p-5 text-white overflow-hidden`}>
                      {/* Floating particles */}
                      <div className="absolute inset-0 overflow-hidden">
                        <motion.div
                          animate={{ 
                            x: [0, 100, 0],
                            y: [0, -50, 0],
                            opacity: [0.3, 0.6, 0.3]
                          }}
                          transition={{ duration: 8, repeat: Infinity }}
                          className="absolute top-2 right-4 w-2 h-2 bg-white/40 rounded-full"
                        />
                        <motion.div
                          animate={{ 
                            x: [0, -80, 0],
                            y: [0, 30, 0],
                            opacity: [0.2, 0.5, 0.2]
                          }}
                          transition={{ duration: 6, repeat: Infinity, delay: 2 }}
                          className="absolute bottom-3 left-6 w-1.5 h-1.5 bg-white/30 rounded-full"
                        />
                      </div>

                      <div className="relative z-10 flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg leading-tight line-clamp-2">{c.name}</h3>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-xl">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                            <DropdownMenuItem disabled={readOnly} onClick={() => openEdit(c)} className="rounded-xl">
                              <Pencil className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={readOnly} className="text-red-600 rounded-xl" onClick={() => deleteMutation.mutate(c.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-6 relative">
                      {/* Status and Category Badges */}
                      <div className="flex gap-2">
                        <StatusBadge status={c.status} />
                        <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 rounded-xl">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {c.category?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                      </div>

                      {/* Target Amount */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-600">Target Amount</p>
                        <div className="text-2xl font-bold text-purple-600">
                          <NumberFlow 
                            value={Number(c.target_amount)} 
                            format={{ 
                              style: 'currency', 
                              currency: currency || 'KES',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }}
                            transformTiming={{ duration: 1000, easing: 'ease-out' }}
                          />
                        </div>
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">Progress</span>
                          <motion.span 
                            className="font-bold text-purple-600"
                            key={pct}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            {Math.round(pct)}%
                          </motion.span>
                        </div>
                        
                        <div className="relative">
                          <Progress 
                            value={pct} 
                            className="h-3 bg-gray-100 rounded-full overflow-hidden"
                          />
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-transparent rounded-full"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-600">
                              <NumberFlow 
                                value={summary.pledged} 
                                format={{ 
                                  style: 'currency', 
                                  currency: currency || 'KES',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }}
                                transformTiming={{ duration: 800, easing: 'ease-out' }}
                              />
                            </span>
                            <span className="text-gray-500">pledged</span>
                          </div>
                        </div>
                      </div>

                      {/* Campaign Stats */}
                      <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-2xl">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">
                            <NumberFlow 
                              value={summary.count} 
                              transformTiming={{ duration: 600 }}
                            /> pledges
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium text-xs">
                            {c.start_date && c.end_date ? `${format(new Date(c.start_date), "dd MMM")} — ${format(new Date(c.end_date), "dd MMM yyyy")}` : "No dates set"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Premium Sheet Modal */}
      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent className="overflow-y-auto bg-white/95 backdrop-blur-xl border-l-2 border-gray-100">
          <SheetHeader className="border-b border-gray-100 pb-4">
            <SheetTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {editingId ? "Edit Campaign" : "Create Campaign"}
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Campaign Name</Label>
              <div className="relative">
                <Input 
                  value={form.name} 
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Enter campaign name"
                  className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 pointer-events-none" />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Description</Label>
              <Textarea 
                value={form.description} 
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the campaign purpose and goals"
                className="min-h-[100px] rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm resize-none"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="rounded-xl capitalize">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span>{c.replace(/_/g, " ")}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Target Amount</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={form.target_amount} 
                  onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))}
                  placeholder="0.00"
                  className="h-14 text-xl text-center rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm shadow-inner"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 pointer-events-none" />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">Start Date</Label>
                <Input 
                  type="date" 
                  value={form.start_date} 
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-3 block">End Date</Label>
                <Input 
                  type="date" 
                  value={form.end_date} 
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm"
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Label className="text-sm font-semibold text-gray-700 mb-3 block">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-2 border-gray-100 focus:border-purple-300 bg-white/80 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 border-gray-100 bg-white/95 backdrop-blur-xl">
                  {["draft","active","completed","cancelled"].map(s => (
                    <SelectItem key={s} value={s} className="rounded-xl capitalize">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          s === 'active' ? 'bg-green-500' :
                          s === 'completed' ? 'bg-blue-500' :
                          s === 'cancelled' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`} />
                        <span>{s}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25 font-semibold text-lg" 
                onClick={() => saveMutation.mutate()} 
                disabled={!form.name || !form.target_amount || !form.end_date || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Campaign" : "Create Campaign"}
              </Button>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default PledgeCampaigns;
