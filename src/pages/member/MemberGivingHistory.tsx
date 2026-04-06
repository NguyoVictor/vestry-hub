import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { TABLES, COLS } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, Column } from "@/components/shared/DataTable";
import { formatCurrencyFull } from "@/lib/format";
import { format } from "date-fns";
import { Download } from "lucide-react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

export default function MemberGivingHistory() {
  const member = useMemberPortal();

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["member-all-giving", member.memberId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.GIVING_RECORDS).select("*").eq("member_id", member.memberId).order(COLS.GIVING_DATE, { ascending: false });
      return data || [];
    },
  });

  const yearlyTotals = donations.reduce((acc: Record<number, number>, d: any) => {
    const year = new Date(d.given_at).getFullYear();
    acc[year] = (acc[year] || 0) + Number(d.amount);
    return acc;
  }, {});

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
    toast.success(`${year} giving statement downloaded`);
  };

  const columns: Column<any>[] = [
    { key: "given_at", header: "Date", render: r => <span className="text-sm">{format(new Date(r.given_at), "dd MMM yyyy")}</span> },
    { key: "giving_type", header: "Category", render: r => <Badge variant="secondary" className="text-xs capitalize">{r.giving_type?.replace(/_/g, " ")}</Badge> },
    { key: "amount", header: "Amount", render: r => <span className="font-semibold text-emerald-600">{formatCurrencyFull(Number(r.amount), r.currency || "KES")}</span> },
    { key: "payment_method", header: "Method", render: r => <span className="text-sm capitalize text-muted-foreground">{r.payment_method?.replace(/_/g, " ")}</span> },
  ];

  return (
    <>
      <Helmet><title>Giving History — Vestry</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Giving History</h1>
          <Button variant="outline" className="rounded-full gap-1.5" onClick={exportCSV}><Download className="h-4 w-4" />Export</Button>
        </div>

        {/* Annual Summaries */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(yearlyTotals).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 3).map(([year, total]) => (
            <Card key={year} className="rounded-2xl">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{formatCurrencyFull(total as number, "KES")}</p>
                <p className="text-xs text-muted-foreground mt-1">{year}</p>
                <Button size="sm" variant="outline" className="mt-2 rounded-full gap-1 w-full text-xs" onClick={() => downloadStatement(Number(year))}>
                  <Download className="h-3 w-3" />Statement
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Full Table */}
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            {isLoading ? <Skeleton className="h-64 w-full rounded-2xl" /> : (
              <DataTable data={donations} columns={columns} getRowId={r => r.id} emptyTitle="No giving history" searchPlaceholder="Search donations..." />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
