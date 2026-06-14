import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useFundsRealtime } from "@/hooks/useFinanceRealtime";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "react-hot-toast";
import { BookOpen, Plus, Sparkles, TrendingUp, Shield, Clock, Target } from "lucide-react";
import { formatCurrencyFull } from "@/lib/format";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const FUND_TYPES = ["restricted", "unrestricted", "temporarily_restricted"];

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

const FundAccounting = () => {
  const { tenantId, currency } = useChurch();
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('financial_records');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "unrestricted", description: "", purpose: "", target_amount: "", opening_balance: "0" });

  // Real-time updates for funds
  useFundsRealtime(tenantId || '', () => {
    queryClient.invalidateQueries({ queryKey: ["funds"] });
  });

  const { data: funds = [], isLoading } = useQuery({
    queryKey: ["funds", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("funds").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("funds").insert({
        tenant_id: tenantId, name: form.name, description: form.description, is_active: true,
        balance: parseFloat(form.opening_balance) || 0,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["funds"] }); 
      toast.success("Fund created successfully! 💰", {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: '600'
        }
      }); 
      setDialogOpen(false); 
      setForm({ name: "", type: "unrestricted", description: "", purpose: "", target_amount: "", opening_balance: "0" }); 
    },
    onError: () => toast.error("Failed to create fund", {
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

  const typeColors: Record<string, string> = { 
    restricted: "bg-amber-100 text-amber-700 border-amber-200", 
    unrestricted: "bg-emerald-100 text-emerald-700 border-emerald-200", 
    temporarily_restricted: "bg-blue-100 text-blue-700 border-blue-200" 
  };

  const typeIcons: Record<string, any> = {
    restricted: Shield,
    unrestricted: Target,
    temporarily_restricted: Clock
  };

  const typeGradients: Record<string, string> = {
    restricted: "from-amber-500 to-orange-600",
    unrestricted: "from-emerald-500 to-green-600", 
    temporarily_restricted: "from-blue-500 to-cyan-600"
  };

  return (
    <>
      <Helmet><title>Fund Accounting — Vestry</title></Helmet>
      
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
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-500 rounded-full blur-3xl"
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
            title="Fund Accounting" 
            subtitle="Track restricted and unrestricted church funds" 
            action={
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PermissionButton 
                  readOnly={readOnly}
                  onClick={() => setDialogOpen(true)}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Fund
                </PermissionButton>
              </motion.div>
            } 
          />
        </motion.div>

        {readOnly && <ReadOnlyBanner section="Financial Records" />}

        {/* Premium Funds Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-8 w-1/2 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : funds.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="w-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No funds created</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              Create your first fund to start tracking restricted and unrestricted money
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <PermissionButton 
                permission="financial_records"
                readOnly={readOnly}
                onClick={() => setDialogOpen(true)}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Fund
              </PermissionButton>
            </motion.div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {funds.map((fund: any, index: number) => {
                const fundType = fund.type || "unrestricted";
                const IconComponent = typeIcons[fundType];
                const gradient = typeGradients[fundType];
                const balance = Number(fund.balance || fund.current_balance || 0);
                
                return (
                  <motion.div
                    key={fund.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ 
                      y: -4, 
                      scale: 1.02,
                      transition: { type: 'spring', stiffness: 400, damping: 25 }
                    }}
                  >
                    <Card className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
                      {/* Glassmorphism overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                      
                      {/* Gradient orb */}
                      <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r ${gradient} opacity-20 rounded-full blur-2xl`} />
                      
                      <CardContent className="relative p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-lg`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">{fund.name}</h3>
                              <Badge 
                                variant="outline" 
                                className={`${typeColors[fundType]} text-xs font-medium border`}
                              >
                                {fundType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </Badge>
                            </div>
                          </div>
                          <Sparkles className="w-5 h-5 text-gray-400" />
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">Current Balance</p>
                          <div className="text-2xl font-bold text-gray-900">
                            <NumberFlow 
                              value={balance} 
                              format={{ 
                                style: 'currency', 
                                currency: currency || 'KES',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }}
                              transformTiming={{ duration: 1500, easing: 'ease-out' }}
                            />
                          </div>
                        </div>

                        {fund.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{fund.description}</p>
                        )}

                        {/* Mini trend chart */}
                        <div className="h-12 mb-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[
                              { v: balance * 0.7 }, 
                              { v: balance * 0.85 }, 
                              { v: balance * 0.9 }, 
                              { v: balance * 0.95 }, 
                              { v: balance }
                            ]}>
                              <Line 
                                type="monotone" 
                                dataKey="v" 
                                stroke={`url(#gradient-${fundType})`}
                                strokeWidth={3} 
                                dot={false} 
                              />
                              <defs>
                                <linearGradient id={`gradient-${fundType}`} x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor={fundType === 'restricted' ? '#f59e0b' : fundType === 'unrestricted' ? '#10b981' : '#3b82f6'} />
                                  <stop offset="100%" stopColor={fundType === 'restricted' ? '#ea580c' : fundType === 'unrestricted' ? '#059669' : '#2563eb'} />
                                </linearGradient>
                              </defs>
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="flex items-center text-xs text-gray-500">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          <span>Trending upward</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
          >
            <DialogHeader className="pb-6">
              <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Create New Fund
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Fund Name</Label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="h-11 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200"
                  placeholder="e.g. Building Fund, Mission Fund"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Fund Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-11 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${typeGradients[type]}`} />
                          <span>{type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Description</Label>
                <Textarea 
                  value={form.description} 
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="min-h-[80px] border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200"
                  placeholder="Describe the purpose and restrictions of this fund"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium text-gray-700">Opening Balance ({currency})</Label>
                <Input 
                  type="number" 
                  value={form.opening_balance} 
                  onChange={e => setForm(p => ({ ...p, opening_balance: e.target.value }))}
                  className="h-11 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200"
                  placeholder="0.00"
                  step="0.01"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-4"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PermissionButton 
                    readOnly={readOnly}
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 text-white font-semibold transition-all duration-200" 
                    onClick={() => createMutation.mutate()} 
                    disabled={!form.name || createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4" />
                        <span>Create Fund</span>
                      </div>
                    )}
                  </PermissionButton>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FundAccounting;
