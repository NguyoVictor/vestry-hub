import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, X } from "lucide-react";
import { useState, useEffect } from "react";

export interface FilterField {
  key: string;
  label: string;
  type: "checkbox-group" | "select" | "toggle";
  options?: { label: string; value: string }[];
}

interface FilterSidebarProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onClear: () => void;
}

export const FilterSidebar = ({ fields, values, onChange, onClear }: FilterSidebarProps) => {
  const activeCount = Object.values(values).filter(v => v && (Array.isArray(v) ? v.length > 0 : v !== "")).length;

  const updateField = (key: string, val: any) => onChange({ ...values, [key]: val });

  const toggleCheckbox = (key: string, value: string) => {
    const current: string[] = values[key] || [];
    updateField(key, current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value]);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Filter className="h-4 w-4" />Filters
          {activeCount > 0 && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{activeCount}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Filters
            {activeCount > 0 && <Button variant="ghost" size="sm" onClick={onClear} className="text-xs h-7"><X className="h-3 w-3 mr-1" />Clear All</Button>}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label className="text-sm font-medium">{field.label}</Label>
              {field.type === "checkbox-group" && field.options?.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={(values[field.key] || []).includes(opt.value)}
                    onCheckedChange={() => toggleCheckbox(field.key, opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
              {field.type === "select" && (
                <Select value={values[field.key] || ""} onValueChange={v => updateField(field.key, v)}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {field.type === "toggle" && (
                <Select value={values[field.key] || ""} onValueChange={v => updateField(field.key, v)}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
