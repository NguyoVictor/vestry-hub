import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, Column } from "@/components/shared/DataTable";
import NumberFlow from "@/components/finance/AnimatedNumber";
import { formatCurrencyFull } from "@/lib/format";
import { format } from "date-fns";
import { 
  Download, 
  Smartphone, 
  Banknote, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Sparkles,
  FileText,
  Shield
} from "lucide-react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "react-hot-toast";

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

const floatingVariants = {
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
}

export default function MemberGivingHistory() {
  const member = useMemberPortal();

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["member-all-giving", member.memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.GIVING_RECORDS)
        .select("*")
        .eq("member_id", member.memberId)
        .in("payment_status", ["confirmed", "cancelled"])
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const yearlyTotals = donations.reduce((acc: Record<number, number>, d: any) => {
    const year = new Date(d.given_at).getFullYear();
    acc[year] = (acc[year] || 0) + Number(d.amount);
    return acc;
  }, {});

  const totalAllTime = donations.reduce((sum: number, d: any) => sum + Number(d.amount), 0);
  const currentYear = new Date().getFullYear();
  const totalThisYear = yearlyTotals[currentYear] || 0;
  const donationCount = donations.length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  };

  const getMethodIcon = (method: string) => {
    return method === 'mpesa' ? (
      <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-200">
        <Smartphone className="w-4 h-4 text-green-600" />
        <span className="text-green-700 font-semibold text-sm">M-Pesa</span>
      </div>
    ) : (
      <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
        <Banknote className="w-4 h-4 text-gray-500" />
        <span className="text-gray-600 font-semibold text-sm">Cash</span>
      </div>
    );
  };

  const exportCSV = () => {
    const csv = Papa.unparse(donations.map((d: any) => ({ Date: d.donation_date, Category: d.giving_type, Amount: d.amount, Currency: d.currency, Method: d.payment_method })));
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "giving-history.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadStatement = async (year: number) => {
    const yearDonations = donations.filter((d: any) => new Date(d.given_at).getFullYear() === year);
    const total = yearDonations.reduce((s: number, d: any) => s + Number(d.amount), 0);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.setFontSize(18);
    pdf.text("Annual Giving Statement", 20, 25);
    pdf.setFontSize(12);
    pdf.text(`Member: ${member.firstName} ${member.lastName}`, 20, 38);
    pdf.text(`Year: ${year}`, 20, 46);
    pdf.text(`Church: ${member.churchName}`, 20, 54);
    pdf.setLineWidth(0.5);
    pdf.line(20, 60, 190, 60);

    let y = 70;
    pdf.setFontSize(10);
    pdf.text("Date", 20, y);
    pdf.text("Category", 60, y);
    pdf.text("Method", 110, y);
    pdf.text("Amount", 160, y);
    y += 6;
    pdf.line(20, y, 190, y);
    y += 6;

    yearDonations.forEach((d: any) => {
      if (y > 270) { pdf.addPage(); y = 20; }
      pdf.text(d.given_at || "—", 20, y);
      pdf.text((d.giving_type || "—").replace(/_/g, " "), 60, y);
      pdf.text((d.payment_method || "—").replace(/_/g, " "), 110, y);
      pdf.text(formatCurrencyFull(Number(d.amount), d.currency || "KES"), 160, y);
      y += 7;
    });

    y += 4;
    pdf.line(20, y, 190, y);
    y += 8;
    pdf.setFontSize(12);
    pdf.text(`Total Given in ${year}: ${formatCurrencyFull(total, "KES")}`, 20, y);

    pdf.save(`giving-statement-${year}.pdf`);
    toast.success(`${year} giving statement downloaded! 📄`, {
      duration: 4000,
      style: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        borderRadius: '12px',
        padding: '16px',
        fontWeight: '600'
      }
    });
  };

  const columns: Column<any>[] = [
    { 
      key: "given_at", 
      header: "Date", 
      render: r => (
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">
            {new Date(r.created_at).toLocaleString('en-KE', {
              timeZone: 'Africa/Nairobi',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </span>
        </div>
      ) 
    },
    { 
      key: "giving_type", 
      header: "Category", 
      render: r => (
        <Badge variant="secondary" className="text-xs capitalize bg-purple-100 text-purple-700 border border-purple-200 rounded-xl">
          <Sparkles className="w-3 h-3 mr-1" />
          {r.giving_type?.replace(/_/g, " ")}
        </Badge>
      ) 
    },
    { 
      key: "amount", 
      header: "Amount", 
      render: r => (
        <span className="text-lg font-bold text-emerald-600">
          <NumberFlow 
            value={Number(r.amount)} 
            format={{ 
              style: 'currency', 
              currency: r.currency || 'KES',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }}
            transformTiming={{ duration: 600, easing: 'ease-out' }}
          />
        </span>
      ) 
    },
    { 
      key: "payment_method", 
      header: "Method", 
      render: r => getMethodIcon(r.payment_method || 'cash')
    },
    { 
      key: "payment_status", 
      header: "Status", 
      render: r => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(r.payment_status || 'confirmed')}
          <Badge 
            variant="secondary" 
            className={`text-xs border rounded-xl ${getStatusColor(r.payment_status || 'confirmed')}`}
          >
            {r.payment_status || 'confirmed'}
          </Badge>
        </div>
      )
    },
    { 
      key: "mpesa_receipt", 
      header: "Receipt", 
      render: r => r.mpesa_receipt ? (
        <div className="flex items-center space-x-2">
          <Shield className="w-3 h-3 text-green-600" />
          <span className="font-mono text-xs text-gray-600 bg-green-50 px-2 py-1 rounded-xl border border-green-200">
            {r.mpesa_receipt}
          </span>
        </div>
      ) : (
        <span className="text-gray-400 text-xs">—</span>
      )
    },
  ];

  return (
    <>
      <Helmet><title>Giving History — Vestry</title></Helmet>
      <motion.div 
        variants={pageVariants} 
        initial="hidden" 
        animate="visible"
        className="max-w-5xl mx-auto space-y-8"
      >
        {/* Premium Header */}
        <motion.div
          variants={cardVariants}
          className="relative flex items-center justify-between py-6"
        >
          {/* Background Gradient Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              variants={floatingVariants}
              animate="animate"
              className="absolute top-4 left-1/4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"
            />
            <motion.div
              variants={floatingVariants}
              animate="animate"
              style={{ animationDelay: '2s' }}
              className="absolute top-8 right-1/3 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"
            />
          </div>

          <div className="relative">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"
            >
              Giving History
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-600 mt-1"
            >
              Track your generosity and download statements
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="outline" 
              className="rounded-2xl border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 bg-white/80 backdrop-blur-sm font-semibold h-12 px-6" 
              onClick={exportCSV}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </motion.div>
        </motion.div>

        {/* Premium Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <motion.div
            variants={cardVariants}
            whileHover={{ 
              y: -4, 
              scale: 1.02,
              transition: { type: 'spring', stiffness: 400, damping: 25 }
            }}
          >
            <Card className="relative rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-emerald-50/90 to-green-50/60 backdrop-blur-md shadow-xl shadow-emerald-500/10">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              
              {/* Floating gradient orb */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
              
              <CardContent className="relative p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-700 mb-2">This Year</h3>
                  <div className="text-3xl font-bold text-emerald-800">
                    <NumberFlow 
                      value={totalThisYear} 
                      format={{ 
                        style: 'currency', 
                        currency: 'KES',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }}
                      transformTiming={{ duration: 1500, easing: 'ease-out' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileHover={{ 
              y: -4, 
              scale: 1.02,
              transition: { type: 'spring', stiffness: 400, damping: 25 }
            }}
          >
            <Card className="relative rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-purple-50/90 to-indigo-50/60 backdrop-blur-md shadow-xl shadow-purple-500/10">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              
              {/* Floating gradient orb */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl" />
              
              <CardContent className="relative p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-purple-700 mb-2">All Time Total</h3>
                  <div className="text-3xl font-bold text-purple-800">
                    <NumberFlow 
                      value={totalAllTime} 
                      format={{ 
                        style: 'currency', 
                        currency: 'KES',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }}
                      transformTiming={{ duration: 2000, easing: 'ease-out' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileHover={{ 
              y: -4, 
              scale: 1.02,
              transition: { type: 'spring', stiffness: 400, damping: 25 }
            }}
          >
            <Card className="relative rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-blue-50/90 to-cyan-50/60 backdrop-blur-md shadow-xl shadow-blue-500/10">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              
              {/* Floating gradient orb */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
              
              <CardContent className="relative p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-2">Total Donations</h3>
                  <div className="text-3xl font-bold text-blue-800">
                    <NumberFlow 
                      value={donationCount} 
                      transformTiming={{ duration: 1000, easing: 'ease-out' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Premium Annual Statements */}
        <motion.div variants={cardVariants}>
          <Card className="relative rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            {/* Floating gradient orb */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
            
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Annual Statements
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-6">
              <p className="text-gray-600">
                Download official giving statements for tax purposes and personal records
              </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(yearlyTotals)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .slice(0, 3)
                  .map(([year, total], index) => (
                    <motion.div
                      key={year}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      whileHover={{ 
                        y: -4, 
                        scale: 1.02,
                        transition: { type: 'spring', stiffness: 400, damping: 25 }
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card className="relative rounded-2xl border-2 border-gray-100 hover:border-purple-200 transition-all duration-300 bg-gradient-to-br from-white/80 to-gray-50/40 backdrop-blur-sm cursor-pointer group">
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        <CardContent className="relative p-6 text-center space-y-4">
                          <div className="space-y-2">
                            <div className="text-2xl font-bold text-emerald-600">
                              <NumberFlow 
                                value={total as number} 
                                format={{ 
                                  style: 'currency', 
                                  currency: 'KES',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }}
                                transformTiming={{ duration: 1000, easing: 'ease-out' }}
                              />
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <p className="text-lg font-semibold text-gray-700">{year}</p>
                            </div>
                          </div>
                          
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full rounded-2xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white/80 backdrop-blur-sm font-semibold h-10" 
                              onClick={() => downloadStatement(Number(year))}
                            >
                              <Download className="h-3 w-3 mr-2" />
                              Download PDF
                            </Button>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </div>
              
              {Object.keys(yearlyTotals).length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No annual statements available yet</p>
                  <p className="text-sm text-gray-400 mt-1">Statements will appear after your first donation</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Premium Data Table */}
        <motion.div variants={cardVariants}>
          <Card className="relative rounded-3xl overflow-hidden border-2 border-white/20 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-md shadow-xl shadow-black/5">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <CardHeader className="relative border-b border-gray-100/50 bg-gradient-to-r from-gray-50/80 to-white/40 backdrop-blur-sm">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent">
                  All Donations
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative p-0">
              {isLoading ? (
                <div className="p-8">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <Skeleton className="h-12 w-full rounded-2xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                  </motion.div>
                </div>
              ) : donations.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <DollarSign className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No donations yet</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-6">
                    Your giving history will appear here once you make your first donation
                  </p>
                  <Button 
                    className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 shadow-lg shadow-purple-500/25 font-semibold"
                    onClick={() => window.location.href = '/member/give'}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Make Your First Gift
                  </Button>
                </motion.div>
              ) : (
                <div className="overflow-hidden">
                  <DataTable 
                    data={donations} 
                    columns={columns} 
                    getRowId={r => r.id} 
                    emptyTitle="No giving history" 
                    searchPlaceholder="Search donations..." 
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
