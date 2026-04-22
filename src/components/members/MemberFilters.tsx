import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const ALL_STATUSES = [
  "All Statuses","Pending Approval","Visitor","New Convert","Member","Worker",
  "Counselor","Deacon","Deaconess","Pastor","Assistant Pastor","Senior Pastor",
  "General Overseer","Archbishop","Vice Archbishop","Bishop","Vice Bishop",
  "Overseer","Vice Overseer","Archdeacon","Vice Archdeacon","Treasurer General",
  "Vice Treasurer General","Elder In Charge","Vice Elder In Charge","Vice Deacon",
  "Secretary General","Vice Secretary General","Minister","Evangelist","Preacher",
  "Prophet","Branch Deacon","Branch Treasurer","Branch Secretary","Branch Security",
  "Women Fellowship Leader","Other",
];

export const ALL_GENDERS = ["All Genders","Male","Female","Other"];
export const ALL_SEGMENTS = ["All Segments","Men","Women","Elders (65+)","Seniors (50+)","Adults (18-64)","Youth (13-17)","Children (<13)"];
export const ALL_MARITAL = ["All Marital Status","Single","Married","Divorced","Widowed"];
export const ALL_BAPTISM = ["All Baptism","Baptized","Not Baptized"];
export const ALL_JOIN_DATES = ["All Join Dates","Joined This Month","Joined This Year","Last 30 Days","Last 90 Days"];
export const ALL_ORDER = ["Default Order","Member # (A→Z / 1→9)","Member # (Z→A / 9→1)","Name (A→Z)","Name (Z→A)","Newest First","Oldest First"];

function FilterDropdown({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void;
}) {
  const isActive = value !== options[0];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(
        "h-8 text-xs rounded-lg border font-jakarta min-w-[120px]",
        isActive ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600"
      )}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="font-jakarta text-xs max-h-64">
        {options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export interface MemberFilterValues {
  status: string;
  gender: string;
  segment: string;
  marital: string;
  branch: string;
  baptism: string;
  joinDate: string;
  order: string;
}

interface MemberFiltersProps {
  values: MemberFilterValues;
  onChange: (patch: Partial<MemberFilterValues>) => void;
  branches: { id: string; name: string }[];
}

export function MemberFilters({ values, onChange, branches }: MemberFiltersProps) {
  const branchOptions = ["All Branches", "No Branch", ...branches.map(b => b.name)];

  return (
    <div className="flex flex-wrap gap-2">
      <FilterDropdown options={ALL_STATUSES} value={values.status} onChange={v => onChange({ status: v })} />
      <FilterDropdown options={ALL_GENDERS} value={values.gender} onChange={v => onChange({ gender: v })} />
      <FilterDropdown options={ALL_SEGMENTS} value={values.segment} onChange={v => onChange({ segment: v })} />
      <FilterDropdown options={ALL_MARITAL} value={values.marital} onChange={v => onChange({ marital: v })} />
      <FilterDropdown options={branchOptions} value={values.branch} onChange={v => onChange({ branch: v })} />
      <FilterDropdown options={ALL_BAPTISM} value={values.baptism} onChange={v => onChange({ baptism: v })} />
      <FilterDropdown options={ALL_JOIN_DATES} value={values.joinDate} onChange={v => onChange({ joinDate: v })} />
      <FilterDropdown options={ALL_ORDER} value={values.order} onChange={v => onChange({ order: v })} />
    </div>
  );
}
