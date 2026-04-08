import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, HeartHandshake, Trash2, Pencil, MoreHorizontal, Info, Download } from "lucide-react";
import Papa from "papaparse";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const ROLES = ["Head","Spouse","Child","Parent","Sibling","Other"];
const CLASSIFICATIONS = ["Member","Visitor","Unassigned"];
const GENDERS = ["Male","Female","Other"];

interface FamilyMemberRow {
  id?: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  gender: string;
  role: string;
  birth_month: string;
  birth_day: string;
  birth_year: string;
  classification: string;
}

const emptyMember = (): FamilyMemberRow => ({
  first_name: "", middle_name: "", last_name: "", suffix: "",
  gender: "", role: "", birth_month: "", birth_day: "", birth_year: "",
  classification: "Unassigned",
});

const familySchema = z.object({ name: z.string().min(1, "Family name is required") });

const Families = () => {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberRows, setMemberRows] = useState<FamilyMemberRow[]>([emptyMember(), emptyMember(), emptyMember(), emptyMember()]);

  const form = useForm<z.infer<typeof familySchema>>({
    resolver: zodResolver(familySchema),
    defaultValues: { name: "" },
  });

  const { data: families = [], isLoading } = useQuery({
    queryKey: ["families", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("families").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false }) as any;
      if (error) throw error;
      if (!data?.length) return [];
      // Fetch family member counts
      const familyIds = data.map((f: any) => f.id);
      const { data: fmData } = await supabase.from("family_members").select("family_id").in("family_id", familyIds);
      const counts: Record<string, number> = {};
      (fmData || []).forEach((fm: any) => { counts[fm.family_id] = (counts[fm.family_id] || 0) + 1; });
      // Fetch head member details
      const headIds = [...new Set(data.map((f: any) => f.head_of_household_id).filter(Boolean))];
      let headMap: Record<string, any> = {};
      if (headIds.length) {
        const { data: heads } = await supabase.from("members").select("id, first_name, last_name, avatar_url").in("id", headIds as string[]);
        headMap = Object.fromEntries((heads || []).map(h => [h.id, h]));
      }
      return data.map((f: any) => ({ ...f, head: headMap[f.head_of_household_id] || null, memberCount: counts[f.id] || 0 }));
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: "" });
    setMemberRows([emptyMember(), emptyMember(), emptyMember(), emptyMember()]);
    setDialogOpen(true);
  };

  const openEdit = async (family: any) => {
    setEditingId(family.id);
    form.reset({ name: family.name });
    // Load existing family members
    const { data: existing } = await supabase.from("family_members").select("*").eq("family_id", family.id);
    if (existing?.length) {
      const rows = existing.map((m: any) => ({
        id: m.id,
        first_name: m.first_name || "",
        middle_name: m.middle_name || "",
        last_name: m.last_name || "",
        suffix: m.suffix || "",
        gender: m.gender || "",
        role: m.role || "",
        birth_month: m.birth_month ? String(m.birth_month) : "",
        birth_day: m.birth_day ? String(m.birth_day) : "",
        birth_year: m.birth_year ? String(m.birth_year) : "",
        classification: m.classification || "Unassigned",
      }));
      // Pad to at least 4 rows
      while (rows.length < 4) rows.push(emptyMember());
      setMemberRows(rows);
    } else {
      setMemberRows([emptyMember(), emptyMember(), emptyMember(), emptyMember()]);
    }
    setDialogOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async (values: z.infer<typeof familySchema>) => {
      let familyId = editingId;

      if (editingId) {
        // Update family name
        const { error } = await supabase.from("families").update({ name: values.name, updated_at: new Date().toISOString() } as any).eq("id", editingId);
        if (error) throw error;
        // Delete existing members and re-insert
        await supabase.from("family_members").delete().eq("family_id", editingId);
      } else {
        // Create new family
        const { data, error } = await supabase.from("families").insert({
          id: crypto.randomUUID(),
          name: values.name,
          tenant_id: tenantId!,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any).select().single();
        if (error) throw error;
        familyId = data.id;
      }

      // Insert family member rows (only non-empty ones)
      const validRows = memberRows.filter(r => r.first_name.trim() || r.last_name.trim());
      if (validRows.length && familyId) {
        const inserts = validRows.map(r => ({
          family_id: familyId,
          first_name: r.first_name || null,
          middle_name: r.middle_name || null,
          last_name: r.last_name || null,
          suffix: r.suffix || null,
          gender: r.gender || null,
          role: r.role || null,
          birth_month: r.birth_month ? parseInt(r.birth_month) : null,
          birth_day: r.birth_day ? parseInt(r.birth_day) : null,
          birth_year: r.birth_year ? parseInt(r.birth_year) : null,
          classification: r.classification || "Unassigned",
          // Also create a member record if classification is Member or Visitor
          member_id: null,
        }));
        await supabase.from("family_members").insert(inserts as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["families"] });
      toast.success(editingId ? "Family updated" : "Family created");
      setDialogOpen(false);
      setEditingId(null);
      form.reset();
      setMemberRows([emptyMember(), emptyMember(), emptyMember(), emptyMember()]);
    },
    onError: (err: any) => toast.error(err.message || "Failed to save family"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("family_members").delete().eq("family_id", id);
      const { error } = await supabase.from("families").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["families"] }); toast.success("Family deleted"); },
  });

  const updateRow = (idx: number, field: keyof FamilyMemberRow, value: string) => {
    setMemberRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const exportFamiliesCsv = async () => {
    // Fetch all family members for all families
    const familyIds = families.map((f: any) => f.id);
    if (!familyIds.length) return;
    const { data: allMembers } = await supabase
      .from("family_members")
      .select("*")
      .in("family_id", familyIds);

    const membersByFamily: Record<string, any[]> = {};
    (allMembers || []).forEach((m: any) => {
      if (!membersByFamily[m.family_id]) membersByFamily[m.family_id] = [];
      membersByFamily[m.family_id].push(m);
    });

    const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
    const rows: Record<string, string>[] = [];

    families.forEach((f: any) => {
      const members = membersByFamily[f.id] || [];
      if (members.length === 0) {
        rows.push({
          "Family Name": f.name,
          "First Name": "", "Middle Name": "", "Last Name": "", "Suffix": "",
          "Gender": "", "Role": "",
          "Birth Month": "", "Birth Day": "", "Birth Year": "",
          "Classification": "",
        });
      } else {
        members.forEach((m: any) => {
          rows.push({
            "Family Name": f.name,
            "First Name": m.first_name || "",
            "Middle Name": m.middle_name || "",
            "Last Name": m.last_name || "",
            "Suffix": m.suffix || "",
            "Gender": m.gender || "",
            "Role": m.role || "",
            "Birth Month": m.birth_month ? MONTH_NAMES[m.birth_month] : "",
            "Birth Day": m.birth_day ? String(m.birth_day) : "",
            "Birth Year": m.birth_year ? String(m.birth_year) : "",
            "Classification": m.classification || "",
          });
        });
      }
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "families.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<any>[] = [
    {
      key: "name", header: "Family Name", sortable: true,
      render: (r) => <span className="font-semibold">{r.name}</span>,
      exportValue: (r) => r.name,
    },
    {
      key: "head", header: "Family Head",
      render: (r) => r.head ? (
        <div className="flex items-center gap-2">
          <MemberAvatar name={`${r.head.first_name} ${r.head.last_name}`} avatarUrl={r.head.avatar_url} size="sm" />
          <span className="text-sm">{r.head.first_name} {r.head.last_name}</span>
        </div>
      ) : <span className="text-muted-foreground text-sm">—</span>,
      exportValue: (r) => r.head ? `${r.head.first_name} ${r.head.last_name}` : "",
    },
    { key: "memberCount", header: "Members", render: (r) => <span className="text-sm">{r.memberCount}</span>, exportValue: (r) => String(r.memberCount) },
    {
      key: "actions", header: "",
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => deleteMut.mutate(r.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <Helmet><title>Families — Vestry</title></Helmet>
      <PageHeader title="Families" subtitle="Link members together as family units" />
      <div className="flex justify-end mb-4 -mt-8">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Family</Button>
      </div>

      <DataTable
        data={families}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.id}
        hideExport
        emptyIcon={<HeartHandshake className="h-12 w-12 text-muted-foreground/40" />}
        emptyTitle="No families yet"
        emptyDescription="Create family units to link members together."
        emptyCta={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Family</Button>}
        toolbarActions={
          <Button variant="outline" size="sm" onClick={exportFamiliesCsv}>
            <Download className="h-4 w-4 mr-1" />Export
          </Button>
        }
      />

      {/* Centered Dialog with blurred background */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditingId(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" aria-describedby="family-dialog-desc">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Family" : "Create Family"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => saveMut.mutate(v))} className="space-y-6">
              {/* Family Name */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Family Name *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. The Kamau Family" className="max-w-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Family Members section */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Family Members</h3>
                <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    You may create family members now or add them later. All entries will become new person records.
                  </p>
                </div>

                {/* Header row */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        {["FIRST","MIDDLE","LAST","SUFFIX","GENDER","ROLE","BIRTH MONTH","BIRTH DAY","BIRTH YEAR","CLASSIFICATION"].map(h => (
                          <th key={h} className="text-left py-2 px-1.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {memberRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-1.5 px-1"><Input value={row.first_name} onChange={e => updateRow(idx, "first_name", e.target.value)} className="h-8 text-xs w-20" /></td>
                          <td className="py-1.5 px-1"><Input value={row.middle_name} onChange={e => updateRow(idx, "middle_name", e.target.value)} className="h-8 text-xs w-20" /></td>
                          <td className="py-1.5 px-1"><Input value={row.last_name} onChange={e => updateRow(idx, "last_name", e.target.value)} className="h-8 text-xs w-20" /></td>
                          <td className="py-1.5 px-1"><Input value={row.suffix} onChange={e => updateRow(idx, "suffix", e.target.value)} className="h-8 text-xs w-14" placeholder="Jr." /></td>
                          <td className="py-1.5 px-1">
                            <Select value={row.gender || undefined} onValueChange={v => updateRow(idx, "gender", v)}>
                              <SelectTrigger className="h-8 text-xs w-20"><SelectValue placeholder="Sel" /></SelectTrigger>
                              <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="py-1.5 px-1">
                            <Select value={row.role || undefined} onValueChange={v => updateRow(idx, "role", v)}>
                              <SelectTrigger className="h-8 text-xs w-20"><SelectValue placeholder="Sele" /></SelectTrigger>
                              <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="py-1.5 px-1">
                            <Select value={row.birth_month || undefined} onValueChange={v => updateRow(idx, "birth_month", v)}>
                              <SelectTrigger className="h-8 text-xs w-24"><SelectValue placeholder="Unkno" /></SelectTrigger>
                              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="py-1.5 px-1">
                            <Select value={row.birth_day || undefined} onValueChange={v => updateRow(idx, "birth_day", v)}>
                              <SelectTrigger className="h-8 text-xs w-16"><SelectValue placeholder="Un" /></SelectTrigger>
                              <SelectContent>{Array.from({length:31},(_,i)=>i+1).map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="py-1.5 px-1"><Input value={row.birth_year} onChange={e => updateRow(idx, "birth_year", e.target.value)} className="h-8 text-xs w-16" placeholder="Year" maxLength={4} /></td>
                          <td className="py-1.5 px-1">
                            <Select value={row.classification || undefined} onValueChange={v => updateRow(idx, "classification", v)}>
                              <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                              <SelectContent>{CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setMemberRows(r => [...r, emptyMember()])}
                >
                  <Plus className="h-3.5 w-3.5" />Add Another Family Member
                </Button>
              </div>

              <div className="flex gap-3 pt-2 border-t">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving..." : editingId ? "Update Family" : "Create Family"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Families;
