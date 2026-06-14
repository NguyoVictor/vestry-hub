import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useCurrency } from "@/hooks/useCurrency";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Receipt, CalendarDays, FileText, Plus, MoreHorizontal, Pencil, Trash2,
  Eye, Download, Send, Settings, AlertTriangle,
} from "lucide-react";
import { format, startOfYear, endOfYear, setMonth, setDate } from "date-fns";

// ─── Registration type options ────────────────────────────────────────────────
const REGISTRATION_TYPES = [
  { group: "Africa", options: [
    "Kenya Revenue Authority (KRA PIN)",
    "Nigeria Tax Identification Number (TIN)",
    "South Africa Tax Exempt Number (SARS)",
    "Ghana TIN (GRA)",
    "Uganda TIN (URA)",
    "Tanzania TIN (TRA)",
    "Rwanda TIN (RRA)",
    "Ethiopia TIN (ERCA)",
    "Zimbabwe TIN (ZIMRA)",
    "Zambia TPIN (ZRA)",
    "Egypt Tax Registration Number (ETA)",
    "Cameroon TIN (DGI)",
    "Ivory Coast TIN",
    "Senegal NINEA",
    "Other African Registration",
  ]},
  { group: "Europe", options: [
    "UK Charity Commission Number",
    "Germany Gemeinnützigkeit (Freistellungsbescheid)",
    "France Association Loi 1901 Number",
    "Netherlands ANBI Number",
    "Sweden Organizational Number (Skatteverket)",
    "Norway Organization Number (Skatteetaten)",
    "Denmark CVR Number",
    "Ireland Charity Registration Number (CRO)",
    "Other European Registration",
  ]},
  { group: "Other", options: [
    "EIN (US)",
    "Australian Business Number (ABN)",
    "Canadian Charity Registration Number (CRA)",
    "Other",
  ]},
];

const OTHER_TYPES = ["Other African Registration", "Other European Registration", "Other"];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaxSettingsRow {
  id?: string;
  tenant_id: string;
  registration_type: string | null;
  registration_type_other: string | null;
  registration_number: string | null;
  legal_org_name: string | null;
  tax_address: string | null;
  tax_city: string | null;
  tax_state: string | null;
  tax_postal_code: string | null;
  tax_country: string | null;
  fiscal_year_start_month: number;
  fiscal_year_start_day: number;
  signature_name: string | null;
  signature_title: string | null;
  statement_header: string | null;
  receipt_footer: string | null;
  is_configured: boolean;
}

interface DeductibleType {
  id: string;
  tenant_id: string;
  type_name: string;
  is_deductible: boolean;
  notes: string | null;
  is_system: boolean;
  sort_order: number;
}

interface TaxStatement {
  id: string;
  tenant_id: string;
  member_id: string;
  year: number;
  total_giving: number;
  deductible_total: number;
  non_deductible_total: number;
  status: string;
  generated_at: string;
  sent_at: string | null;
  statement_data: Record<string, unknown> | null;
  members?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, subtitle, action }: {
  icon: React.ElementType; title: string; subtitle: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
          <Icon className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── TAX SETTINGS TAB ────────────────────────────────────────────────────────
function TaxSettingsTab({ tenantId, onSaved }: { tenantId: string; onSaved: () => void }) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [regType,       setRegType]       = useState("");
  const [regTypeOther,  setRegTypeOther]  = useState("");
  const [regNumber,     setRegNumber]     = useState("");
  const [legalName,     setLegalName]     = useState("");
  const [address,       setAddress]       = useState("");
  const [city,          setCity]          = useState("");
  const [state,         setState]         = useState("");
  const [postal,        setPostal]        = useState("");
  const [country,       setCountry]       = useState("");
  const [fyMonth,       setFyMonth]       = useState("1");
  const [fyDay,         setFyDay]         = useState("1");
  const [sigName,       setSigName]       = useState("");
  const [sigTitle,      setSigTitle]      = useState("");
  const [stmtHeader,    setStmtHeader]    = useState("");
  const [footer,        setFooter]        = useState("");

  const { data: settings, isLoading } = useQuery<TaxSettingsRow | null>({
    queryKey: ["tax-settings", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.TAX_SETTINGS)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data as TaxSettingsRow | null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!settings) return;
    setRegType(settings.registration_type ?? "");
    setRegTypeOther(settings.registration_type_other ?? "");
    setRegNumber(settings.registration_number ?? "");
    setLegalName(settings.legal_org_name ?? "");
    setAddress(settings.tax_address ?? "");
    setCity(settings.tax_city ?? "");
    setState(settings.tax_state ?? "");
    setPostal(settings.tax_postal_code ?? "");
    setCountry(settings.tax_country ?? "");
    setFyMonth(String(settings.fiscal_year_start_month ?? 1));
    setFyDay(String(settings.fiscal_year_start_day ?? 1));
    setSigName(settings.signature_name ?? "");
    setSigTitle(settings.signature_title ?? "");
    setStmtHeader(settings.statement_header ?? "");
    setFooter(settings.receipt_footer ?? "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      const isConfigured = !!(regType && regNumber.trim() && legalName.trim());
      const payload = {
        tenant_id: tenantId,
        registration_type: regType || null,
        registration_type_other: OTHER_TYPES.includes(regType) ? regTypeOther.trim() || null : null,
        registration_number: regNumber.trim() || null,
        legal_org_name: legalName.trim() || null,
        tax_address: address.trim() || null,
        tax_city: city.trim() || null,
        tax_state: state.trim() || null,
        tax_postal_code: postal.trim() || null,
        tax_country: country.trim() || null,
        fiscal_year_start_month: parseInt(fyMonth) || 1,
        fiscal_year_start_day: parseInt(fyDay) || 1,
        signature_name: sigName.trim() || null,
        signature_title: sigTitle.trim() || null,
        statement_header: stmtHeader.trim() || null,
        receipt_footer: footer.trim() || null,
        is_configured: isConfigured,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from(TABLES.TAX_SETTINGS)
        .upsert(payload as never, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-settings", tenantId] });
      toast.success("✅ Tax settings saved successfully.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-4">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-32 w-full rounded-xl"/>)}</div>;

  const showOther = OTHER_TYPES.includes(regType);

  return (
    <div className="space-y-5 pb-24">
      {readOnly && <ReadOnlyBanner section="Tax Settings" />}
      
      {/* Card 1: Registration */}
      <Card>
        <CardHeader icon={Receipt} title="Tax Registration Information" subtitle="Configure your church's tax-exempt registration details for generating official tax receipts" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Registration Type</Label>
            <Select value={regType} onValueChange={setRegType}>
              <SelectTrigger><SelectValue placeholder="Select registration type" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {REGISTRATION_TYPES.map(group => (
                  <div key={group.group}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">{group.group}</div>
                    {group.options.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {showOther && (
              <div className="pt-1">
                <Label className="text-xs text-slate-500">Specify <span className="text-red-500">*</span></Label>
                <Input className="mt-1" placeholder="Enter your registration type" value={regTypeOther} onChange={e => setRegTypeOther(e.target.value)} />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Registration Number</Label>
            <Input placeholder="e.g., 12-3456789" value={regNumber} onChange={e => setRegNumber(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Legal Organization Name</Label>
          <Input placeholder="Official registered name" value={legalName} onChange={e => setLegalName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Tax Address</Label>
          <Input placeholder="Street address" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5"><Label className="text-sm font-medium">City</Label><Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-sm font-medium">State/Province</Label><Input placeholder="State" value={state} onChange={e => setState(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-sm font-medium">Postal Code</Label><Input placeholder="Postal" value={postal} onChange={e => setPostal(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-sm font-medium">Country</Label><Input placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} /></div>
        </div>
      </Card>

      {/* Card 2: Fiscal Year */}
      <Card>
        <CardHeader icon={CalendarDays} title="Fiscal Year Configuration" subtitle="Define your fiscal year for annual tax statements" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Fiscal Year Start Month</Label>
            <Select value={fyMonth} onValueChange={setFyMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i+1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Fiscal Year Start Day</Label>
            <Input type="number" min="1" max="28" value={fyDay} onChange={e => setFyDay(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Card 3: Statement Customization */}
      <Card>
        <CardHeader icon={FileText} title="Statement Customization" subtitle="Customize the appearance and content of tax statements" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label className="text-sm font-medium">Authorized Signature Name</Label><Input placeholder="e.g., John Smith" value={sigName} onChange={e => setSigName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-sm font-medium">Signature Title</Label><Input placeholder="e.g., Church Treasurer" value={sigTitle} onChange={e => setSigTitle(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Statement Header Text</Label>
          <Textarea placeholder="Text to appear at the top of tax statements" value={stmtHeader} onChange={e => setStmtHeader(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Receipt Footer Text</Label>
          <Textarea placeholder="e.g., No goods or services were provided in exchange for this contribution." value={footer} onChange={e => setFooter(e.target.value)} rows={3} />
        </div>
      </Card>

      {/* Sticky save */}
      <div className="fixed bottom-6 right-6 z-10">
        <PermissionButton
          readOnly={readOnly}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Settings className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Tax Settings"}
        </PermissionButton>
      </div>
    </div>
  );
}

// ─── DEDUCTIBILITY TAB ───────────────────────────────────────────────────────
const SYSTEM_DEDUCTIBLE = [
  { type_name: "Tithe",        sort_order: 0 },
  { type_name: "Thanksgiving", sort_order: 1 },
  { type_name: "Offering",     sort_order: 2 },
];

interface DeductibleModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editData?: DeductibleType | null;
  onSuccess: () => void;
}

function DeductibleModal({ open, onClose, tenantId, editData, onSuccess }: DeductibleModalProps) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const isEdit = !!editData;
  const [typeName,      setTypeName]      = useState(editData?.type_name ?? "");
  const [isDeductible,  setIsDeductible]  = useState(editData?.is_deductible ?? true);
  const [notes,         setNotes]         = useState(editData?.notes ?? "");
  const [submitting,    setSubmitting]    = useState(false);

  const handleClose = () => { if (!isEdit) { setTypeName(""); setIsDeductible(true); setNotes(""); } onClose(); };

  const handleSubmit = async () => {
    if (readOnly) return;
    if (!typeName.trim()) { toast.error("Type name is required."); return; }
    setSubmitting(true);
    try {
      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.TAX_DEDUCTIBLE_TYPES)
          .update({ type_name: typeName.trim(), is_deductible: isDeductible, notes: notes.trim() || null } as never)
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("✅ Deductible type updated.");
      } else {
        const { data: existing } = await supabase.from(TABLES.TAX_DEDUCTIBLE_TYPES).select("sort_order").eq("tenant_id", tenantId).order("sort_order", { ascending: false }).limit(1);
        const nextOrder = ((existing?.[0]?.sort_order ?? -1) as number) + 1;
        const { error } = await supabase.from(TABLES.TAX_DEDUCTIBLE_TYPES)
          .insert({ tenant_id: tenantId, type_name: typeName.trim(), is_deductible: isDeductible, notes: notes.trim() || null, is_system: false, sort_order: nextOrder } as never);
        if (error) throw error;
        toast.success("✅ Deductible type added.");
      }
      qc.invalidateQueries({ queryKey: ["tax-deductible-types", tenantId] });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit Deductible Type" : "Add Custom Deductible Type"}</DialogTitle>
          <p className="text-xs text-slate-500">Create a new giving type for tax deductibility tracking</p>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Type Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g., Capital Campaign, Benevolence Fund" value={typeName} onChange={e => setTypeName(e.target.value)} className="focus:ring-orange-400 focus:border-orange-400" autoFocus />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Tax Deductible</p>
              <p className="text-xs text-slate-500">Is this contribution type tax-deductible?</p>
            </div>
            <Switch checked={isDeductible} onCheckedChange={setIsDeductible} className="data-[state=checked]:bg-orange-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Notes (Optional)</Label>
            <Textarea placeholder="Additional notes about this giving type" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Update" : "Add Type"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeductibilityTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [addOpen,   setAddOpen]   = useState(false);
  const [editType,  setEditType]  = useState<DeductibleType | null>(null);
  const [deleteType,setDeleteType]= useState<DeductibleType | null>(null);
  const [seeding,   setSeeding]   = useState(false);

  const { data: types = [], isLoading } = useQuery<DeductibleType[]>({
    queryKey: ["tax-deductible-types", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.TAX_DEDUCTIBLE_TYPES).select("*").eq("tenant_id", tenantId).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeductibleType[];
    },
    staleTime: 300_000,
  });

  const handleSeedDefaults = async () => {
    if (readOnly) return;
    setSeeding(true);
    try {
      const rows = SYSTEM_DEDUCTIBLE.map(d => ({ ...d, tenant_id: tenantId, is_deductible: true, is_system: true }));
      const { error } = await supabase.from(TABLES.TAX_DEDUCTIBLE_TYPES).insert(rows as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["tax-deductible-types", tenantId] });
      toast.success("Default deductible types added.");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed.");
    } finally {
      setSeeding(false);
    }
  };

  const toggleDeductible = async (type: DeductibleType) => {
    const newVal = !type.is_deductible;
    const { error } = await supabase.from(TABLES.TAX_DEDUCTIBLE_TYPES).update({ is_deductible: newVal } as never).eq("id", type.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tax-deductible-types", tenantId] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.TAX_DEDUCTIBLE_TYPES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-deductible-types", tenantId] }); setDeleteType(null); toast.success("Type deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={Receipt}
          title="Giving Type Deductibility"
          subtitle="Configure which giving types are tax-deductible. This affects how donations appear on tax statements."
          action={
            <PermissionButton
              readOnly={readOnly}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
              size="sm"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add Custom Type
            </PermissionButton>
          }
        />

        {isLoading ? (
          <div className="space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
        ) : types.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
            <p className="text-sm">No deductible types yet.</p>
            <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>{seeding ? "Adding..." : "Add Default Types"}</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Giving Type</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax Deductible</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Notes</th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {types.map((t, idx) => (
                  <tr key={t.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${idx === types.length-1 ? "border-b-0" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{t.type_name}</td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={t.is_deductible}
                        onCheckedChange={() => toggleDeductible(t)}
                        disabled={readOnly}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                      {t.is_deductible ? "Will appear on tax statements as deductible" : "Will not appear on tax statements"}
                    </td>
                    <td className="px-3 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-500 transition-colors"><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setEditType(t)}><Pencil className="h-3.5 w-3.5" />Edit</DropdownMenuItem>
                          {!t.is_system && (
                            <DropdownMenuItem className="gap-2 cursor-pointer text-red-500 focus:text-red-500" onClick={() => setDeleteType(t)}><Trash2 className="h-3.5 w-3.5" />Delete</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DeductibleModal open={addOpen} onClose={() => setAddOpen(false)} tenantId={tenantId} onSuccess={() => {}} />
      <DeductibleModal open={!!editType} onClose={() => setEditType(null)} tenantId={tenantId} editData={editType} onSuccess={() => {}} />

      <AlertDialog open={!!deleteType} onOpenChange={v => !v && setDeleteType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteType?.type_name}"?</AlertDialogTitle>
            <AlertDialogDescription>Delete this deductible type? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteType && deleteMutation.mutate(deleteType.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── STATEMENTS TAB ──────────────────────────────────────────────────────────
function StatementsTab({ tenantId, isConfigured, taxSettings, currency }: {
  tenantId: string;
  isConfigured: boolean;
  taxSettings: TaxSettingsRow | null;
  currency: string;
}) {
  const qc = useQueryClient();
  const { symbol } = useCurrency();
  const [genOpen,       setGenOpen]       = useState(false);
  const [selYear,       setSelYear]       = useState(String(new Date().getFullYear()));
  const [genFor,        setGenFor]        = useState("all");
  const [memberSearch,  setMemberSearch]  = useState("");
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [generating,    setGenerating]    = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Fetch statements
  const { data: statements = [], isLoading } = useQuery<TaxStatement[]>({
    queryKey: ["tax-statements", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TAX_STATEMENTS)
        .select("*, members(first_name, last_name, email)")
        .eq("tenant_id", tenantId)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TaxStatement[];
    },
    staleTime: 60_000,
  });

  // Fetch members with giving in selected year (for member selection)
  const { data: membersWithGiving = [] } = useQuery<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]>({
    queryKey: ["members-with-giving", tenantId, selYear],
    queryFn: async () => {
      const fyMonth = (taxSettings?.fiscal_year_start_month ?? 1) - 1;
      const fyDay = taxSettings?.fiscal_year_start_day ?? 1;
      const startDate = format(setDate(setMonth(new Date(parseInt(selYear), 0, 1), fyMonth), fyDay), "yyyy-MM-dd");
      const endDate = format(setDate(setMonth(new Date(parseInt(selYear) + 1, 0, 1), fyMonth), fyDay - 1), "yyyy-MM-dd");

      const { data } = await supabase
        .from("giving_records")
        .select("member_id, members(id, first_name, last_name, email)")
        .eq("tenant_id", tenantId)
        .gte("given_at", startDate)
        .lte("given_at", endDate);

      const seen = new Set<string>();
      const result: { id: string; first_name: string | null; last_name: string | null; email: string | null }[] = [];
      for (const row of (data ?? [])) {
        const m = (row as any).members;
        if (m && !seen.has(m.id)) { seen.add(m.id); result.push(m); }
      }
      return result;
    },
    enabled: genOpen && genFor === "selected",
    staleTime: 60_000,
  });

  // Fetch deductible types
  const { data: deductibleTypes = [] } = useQuery<DeductibleType[]>({
    queryKey: ["tax-deductible-types", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.TAX_DEDUCTIBLE_TYPES).select("*").eq("tenant_id", tenantId);
      return (data ?? []) as DeductibleType[];
    },
    staleTime: 300_000,
  });

  const filteredMembers = membersWithGiving.filter(m => {
    const q = memberSearch.toLowerCase();
    return `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  });

  const handleGenerate = async () => {
    if (!isConfigured) return;
    setGenerating(true);
    try {
      const fyMonth = (taxSettings?.fiscal_year_start_month ?? 1) - 1;
      const fyDay = taxSettings?.fiscal_year_start_day ?? 1;
      const yearNum = parseInt(selYear);
      const startDate = format(setDate(setMonth(new Date(yearNum, 0, 1), fyMonth), fyDay), "yyyy-MM-dd");
      const endDate = format(setDate(setMonth(new Date(yearNum + 1, 0, 1), fyMonth), fyDay - 1), "yyyy-MM-dd");

      // Get all giving records for the period
      let query = supabase
        .from("giving_records")
        .select("member_id, amount, giving_type, given_at, members(id, first_name, last_name, email)")
        .eq("tenant_id", tenantId)
        .gte("given_at", startDate)
        .lte("given_at", endDate);

      if (genFor === "selected" && selectedIds.size > 0) {
        query = query.in("member_id", Array.from(selectedIds));
      }

      const { data: givingData, error } = await query;
      if (error) throw error;

      // Group by member
      const byMember = new Map<string, { member: any; records: any[] }>();
      for (const row of (givingData ?? [])) {
        const m = (row as any).members;
        if (!m) continue;
        if (!byMember.has(m.id)) byMember.set(m.id, { member: m, records: [] });
        byMember.get(m.id)!.records.push(row);
      }

      const deductibleNames = new Set(deductibleTypes.filter(t => t.is_deductible).map(t => t.type_name.toLowerCase()));

      const upsertRows = Array.from(byMember.values()).map(({ member, records }) => {
        const total = records.reduce((s, r) => s + (r.amount ?? 0), 0);
        const deductible = records.filter(r => deductibleNames.has((r.giving_type ?? "").toLowerCase())).reduce((s, r) => s + (r.amount ?? 0), 0);
        return {
          tenant_id: tenantId,
          member_id: member.id,
          year: yearNum,
          total_giving: total,
          deductible_total: deductible,
          non_deductible_total: total - deductible,
          status: "generated",
          generated_at: new Date().toISOString(),
          statement_data: { records, member, taxSettings, year: yearNum, startDate, endDate },
        };
      });

      if (upsertRows.length === 0) { toast.info("No giving records found for the selected period."); setGenerating(false); return; }

      const { error: upsertErr } = await supabase
        .from(TABLES.TAX_STATEMENTS)
        .upsert(upsertRows as never, { onConflict: "tenant_id,member_id,year" });
      if (upsertErr) throw upsertErr;

      qc.invalidateQueries({ queryKey: ["tax-statements", tenantId] });
      setGenOpen(false);
      toast.success(`✅ ${upsertRows.length} tax statement${upsertRows.length !== 1 ? "s" : ""} generated successfully.`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to generate statements.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (stmt: TaxStatement) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 20;
      const pw = doc.internal.pageSize.getWidth();
      const mw = pw - margin * 2;

      const memberName = stmt.members ? `${stmt.members.first_name ?? ""} ${stmt.members.last_name ?? ""}`.trim() : "Member";
      const ts = taxSettings;

      doc.setFontSize(10); doc.setTextColor(150);
      doc.text(ts?.legal_org_name ?? "Church", margin, 15);
      doc.text(`Annual Giving Statement — ${stmt.year}`, pw - margin, 15, { align: "right" });
      doc.setDrawColor(220); doc.line(margin, 18, pw - margin, 18);

      if (ts?.statement_header) {
        doc.setFontSize(9); doc.setTextColor(80);
        doc.text(ts.statement_header, margin, 26);
      }

      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(30);
      doc.text("Annual Giving Statement", margin, 36);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80);
      doc.text(`Year: ${stmt.year}`, margin, 43);
      if (ts?.registration_type) doc.text(`${ts.registration_type}: ${ts.registration_number ?? ""}`, margin, 49);

      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30);
      doc.text(memberName, margin, 62);
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80);
      if (stmt.members?.email) doc.text(stmt.members.email, margin, 68);
      doc.text(`Generated: ${format(new Date(stmt.generated_at), "MMMM d, yyyy")}`, margin, 74);

      // Summary
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30);
      doc.text("Giving Summary", margin, 86);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Total Giving: ${symbol} ${stmt.total_giving.toLocaleString()}`, margin, 93);
      doc.text(`Tax-Deductible: ${symbol} ${stmt.deductible_total.toLocaleString()}`, margin, 99);
      doc.text(`Non-Deductible: ${symbol} ${stmt.non_deductible_total.toLocaleString()}`, margin, 105);

      // Records
      const records = (stmt.statement_data as any)?.records ?? [];
      if (records.length > 0) {
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30);
        doc.text("Transaction Detail", margin, 118);
        let y = 125;
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(80);
        for (const r of records) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(r.given_at ? format(new Date(r.given_at), "MMM d, yyyy") : "—", margin, y);
          doc.text(r.giving_type ?? "—", margin + 35, y);
          doc.text(`${symbol} ${(r.amount ?? 0).toLocaleString()}`, pw - margin, y, { align: "right" });
          y += 6;
        }
      }

      if (ts?.receipt_footer) {
        doc.setFontSize(8); doc.setTextColor(120);
        const footerLines = doc.splitTextToSize(ts.receipt_footer, mw);
        doc.text(footerLines, margin, 260);
      }
      if (ts?.signature_name) {
        doc.setFontSize(9); doc.setTextColor(50);
        doc.text(`${ts.signature_name}${ts.signature_title ? `, ${ts.signature_title}` : ""}`, margin, 272);
      }

      doc.save(`Vestry Hub - Tax Statement - ${memberName} - ${stmt.year}.pdf`);
      toast.success("📄 Statement downloaded.");
    } catch (err) {
      toast.error("Failed to generate PDF.");
    }
  };

  const handleSend = async (stmt: TaxStatement) => {
    if (!stmt.members?.email) { toast.error("Member has no email address."); return; }
    const { error } = await supabase.from(TABLES.TAX_STATEMENTS).update({ status: "sent", sent_at: new Date().toISOString() } as never).eq("id", stmt.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tax-statements", tenantId] });
    toast.success(`✅ Statement sent to ${stmt.members.email}`);
  };

  const memberName = (s: TaxStatement) => s.members ? `${s.members.first_name ?? ""} ${s.members.last_name ?? ""}`.trim() : "—";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={FileText}
          title="Tax Statements"
          subtitle="Generate and manage annual giving statements for members"
          action={
            <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0" size="sm" onClick={() => setGenOpen(true)}>
              <Plus className="h-4 w-4" /> Generate Statements
            </Button>
          }
        />

        {isLoading ? (
          <div className="space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
        ) : statements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <FileText className="h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium">No tax statements generated yet</p>
            <p className="text-xs">Click 'Generate Statements' to create annual giving statements</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {["Member Name","Year","Total Giving","Status","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statements.map((s, idx) => (
                  <tr key={s.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${idx === statements.length-1 ? "border-b-0" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{memberName(s)}</td>
                    <td className="px-4 py-3 text-slate-600">{s.year}</td>
                    <td className="px-4 py-3 text-slate-600">{symbol} {s.total_giving.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.status === "sent" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                        {s.status === "sent" ? "Sent" : "Generated"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button title="Download" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" onClick={() => handleDownload(s)}><Download className="h-4 w-4" /></button>
                        <button title="Send" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" onClick={() => handleSend(s)}><Send className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Generate Modal */}
      <Dialog open={genOpen} onOpenChange={v => !v && setGenOpen(false)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Generate Tax Statements</DialogTitle>
            <p className="text-xs text-slate-500">Generate annual giving statements for members</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pt-1">
            {!isConfigured && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">Please configure tax settings before generating statements.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Statement Year</Label>
              <Select value={selYear} onValueChange={setSelYear}>
                <SelectTrigger className="focus:ring-orange-400"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Generate For</Label>
              <Select value={genFor} onValueChange={v => { setGenFor(v); setSelectedIds(new Set()); }}>
                <SelectTrigger className="focus:ring-orange-400"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members with Giving</SelectItem>
                  <SelectItem value="selected">Selected Members Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {genFor === "selected" && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search members by name or email..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <div className="rounded-lg border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No members with giving in {selYear}</p>
                  ) : filteredMembers.map(m => {
                    const isSelected = selectedIds.has(m.id);
                    const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—";
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedIds(prev => { const n = new Set(prev); isSelected ? n.delete(m.id) : n.add(m.id); return n; })}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? "bg-orange-50 border-l-2 border-l-orange-500" : "hover:bg-slate-50"}`}
                      >
                        <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300"}`}>
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600 shrink-0">
                          {(m.first_name?.[0] ?? "") + (m.last_name?.[0] ?? "")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{name}</p>
                          <p className="text-xs text-slate-400">{m.email ?? "—"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedIds.size > 0 && <p className="text-xs text-orange-600 font-medium">{selectedIds.size} member{selectedIds.size !== 1 ? "s" : ""} selected</p>}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setGenOpen(false)} disabled={generating}>Cancel</Button>
            <Button
              className={`gap-2 ${isConfigured ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
              onClick={handleGenerate}
              disabled={!isConfigured || generating || (genFor === "selected" && selectedIds.size === 0)}
            >
              {generating ? "Generating..." : "Generate Statements"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TaxSettingsPage() {
  const { tenantId, currency } = useChurch();
  const [isConfigured, setIsConfigured] = useState(false);

  const { data: taxSettings } = useQuery<TaxSettingsRow | null>({
    queryKey: ["tax-settings", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.TAX_SETTINGS).select("*").eq("tenant_id", tenantId).maybeSingle();
      return data as TaxSettingsRow | null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (taxSettings?.is_configured) setIsConfigured(true);
  }, [taxSettings]);

  return (
    <>
      <Helmet><title>Tax Settings — Vestry</title></Helmet>
      <div className="max-w-3xl">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-lg w-auto mb-5">
            <TabsTrigger value="settings" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Tax Settings</TabsTrigger>
            <TabsTrigger value="deductibility" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Deductibility</TabsTrigger>
            <TabsTrigger value="statements" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Statements</TabsTrigger>
          </TabsList>
          <TabsContent value="settings">
            <TaxSettingsTab tenantId={tenantId} onSaved={() => setIsConfigured(true)} />
          </TabsContent>
          <TabsContent value="deductibility">
            <DeductibilityTab tenantId={tenantId} />
          </TabsContent>
          <TabsContent value="statements">
            <StatementsTab tenantId={tenantId} isConfigured={isConfigured} taxSettings={taxSettings ?? null} currency={currency} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
