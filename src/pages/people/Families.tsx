import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Download } from "lucide-react";
import Papa from "papaparse";
import { AnimatePresence } from "framer-motion";
import FamiliesStatBar from "@/components/families/FamiliesStatBar";
import FamiliesTable from "@/components/families/FamiliesTable";
import CreateFamilyDrawer from "@/components/families/CreateFamilyDrawer";
import EmptyFamilyState from "@/components/families/EmptyFamilyState";

const Families = () => {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<any | null>(null);

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
    setEditingFamily(null);
    setDrawerOpen(true);
  };

  const openEdit = async (family: any) => {
    // Load existing family members
    const { data: existing } = await supabase.from("family_members").select("*").eq("family_id", family.id);
    const members = (existing || []).map((m: any) => ({
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
    setEditingFamily({ ...family, members });
    setDrawerOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async (data: { name: string; members: any[] }) => {
      let familyId = editingFamily?.id;

      if (editingFamily) {
        // Update family name
        const { error } = await supabase.from("families").update({ name: data.name, updated_at: new Date().toISOString() } as any).eq("id", editingFamily.id);
        if (error) throw error;
        // Delete existing members and re-insert
        await supabase.from("family_members").delete().eq("family_id", editingFamily.id);
      } else {
        // Create new family
        const { data: newFamily, error } = await supabase.from("families").insert({
          id: crypto.randomUUID(),
          name: data.name,
          tenant_id: tenantId!,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any).select().single();
        if (error) throw error;
        familyId = newFamily.id;
      }

      // Insert family member rows (only non-empty ones)
      const validRows = data.members.filter(r => r.first_name.trim() || r.last_name.trim());
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
          member_id: null,
        }));
        await supabase.from("family_members").insert(inserts as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["families"] });
      toast.success(editingFamily ? "Family updated" : "Family created");
      setDrawerOpen(false);
      setEditingFamily(null);
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

  const exportFamiliesCsv = async () => {
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

  return (
    <>
      <Helmet><title>Families — Vestry</title></Helmet>
      <div className="font-jakarta">
        <PageHeader title="Families" subtitle="Link members together as family units" />
        <div className="flex justify-end mb-4 -mt-8 gap-2">
          <Button variant="outline" size="sm" onClick={exportFamiliesCsv}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="h-4 w-4 mr-2" />Create Family
          </Button>
        </div>

        {families.length > 0 && <FamiliesStatBar families={families} />}

        {families.length === 0 && !isLoading ? (
          <EmptyFamilyState onCtaClick={openCreate} />
        ) : (
          <FamiliesTable
            families={families}
            loading={isLoading}
            onEdit={openEdit}
            onDelete={(id) => deleteMut.mutate(id)}
          />
        )}

        <AnimatePresence>
          {drawerOpen && (
            <CreateFamilyDrawer
              onClose={() => {
                setDrawerOpen(false);
                setEditingFamily(null);
              }}
              onSuccess={(data) => saveMut.mutate(data)}
              initialData={editingFamily}
              isEdit={!!editingFamily}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Families;
