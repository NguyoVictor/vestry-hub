import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Upload, Download, X } from "lucide-react";
import Papa from "papaparse";

const IMPORT_STATUSES = ["Visitor", "New Convert", "Member", "Worker"];

interface MemberImportModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess: () => void;
}

export function MemberImportModal({ open, onClose, tenantId, onSuccess }: MemberImportModalProps) {
  const [defaultStatus, setDefaultStatus] = useState("Member");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csv = "first_name,last_name,email,phone,gender,date_of_birth,marital_status,membership_status,address,city,country\nJohn,Doe,john@example.com,+254700000000,Male,1990-01-01,Married,Member,123 Main St,Nairobi,Kenya";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "member_import_template.csv"; a.click();
  };

  const handleFile = (f: File) => {
    setFile(f);
    Papa.parse(f, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        setRowCount(results.data.length);
        setPreview(results.data.slice(0, 5) as any[]);
      },
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let imported = 0;
        for (const row of rows) {
          if (!row.first_name || !row.last_name) continue;
          const status = (row.membership_status?.trim() || defaultStatus).toLowerCase();
          await supabase.from("members").insert({
            tenant_id: tenantId,
            first_name: row.first_name?.trim(),
            last_name: row.last_name?.trim(),
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            gender: row.gender?.trim() || null,
            date_of_birth: row.date_of_birth?.trim() || null,
            marital_status: row.marital_status?.trim() || null,
            status,
            member_type: status,
            city: row.city?.trim() || null,
            country: row.country?.trim() || null,
            address: row.address?.trim() || null,
            membership_number: `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
            join_date: new Date().toISOString().split("T")[0],
            registration_source: "import",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any);
          imported++;
        }
        toast.success(`${imported} members imported successfully!`);
        setImporting(false);
        setFile(null); setPreview([]); setRowCount(0);
        onSuccess();
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg font-jakarta">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <DialogTitle className="text-base font-semibold font-jakarta">Bulk Member Import</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium font-jakarta">Default Membership Status</Label>
            <Select value={defaultStatus} onValueChange={setDefaultStatus}>
              <SelectTrigger className="w-48 border-orange-300 font-jakarta"><SelectValue /></SelectTrigger>
              <SelectContent className="font-jakarta">
                {IMPORT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">Used when status is not specified in the file</p>
          </div>

          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 font-jakarta">
            <Download className="h-4 w-4" />Download Template
          </Button>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 transition-colors"
          >
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium mb-3">Upload an Excel or CSV file with member data</p>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-2 font-jakarta pointer-events-none">
              <Upload className="h-4 w-4" />Select File
            </Button>
            <p className="text-xs text-slate-400 mt-3">Required columns: first_name, last_name</p>
            <p className="text-xs text-slate-300 mt-1">Optional: email, phone, gender, date_of_birth, marital_status, membership_status, address, city, etc.</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {file && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 font-jakarta">{file.name} — {rowCount} rows</p>
                <button onClick={() => { setFile(null); setPreview([]); setRowCount(0); }}
                  className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>
              {preview.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>{Object.keys(preview[0]).slice(0, 5).map(k =>
                        <th key={k} className="px-3 py-2 text-left text-slate-500 font-medium">{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          {Object.values(row).slice(0, 5).map((v: any, j) =>
                            <td key={j} className="px-3 py-2 text-slate-700 truncate max-w-[100px]">{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onClose} className="font-jakarta">Cancel</Button>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
                  onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : `Import ${rowCount} Members`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
