import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Globe, Plus, X, Save } from "lucide-react";

export default function VisionMission() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();

  const [vision, setVision] = useState("");
  const [mission, setMission] = useState("");
  const [coreValues, setCoreValues] = useState<string[]>([""]);
  const [tagline, setTagline] = useState("");

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.TENANTS)
        .select("vision_statement, mission_statement, core_values, tagline")
        .eq(COLS.ID, tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  useEffect(() => {
    if (!tenant) return;
    setVision((tenant as any).vision_statement || "");
    setMission((tenant as any).mission_statement || "");
    const vals = (tenant as any).core_values;
    setCoreValues(Array.isArray(vals) && vals.length > 0 ? vals : [""]);
    setTagline(tenant.tagline || "");
  }, [tenant]);

  // Core values helpers
  function updateValue(i: number, v: string) {
    setCoreValues(arr => arr.map((x, idx) => idx === i ? v : x));
  }
  function addValue() { setCoreValues(arr => [...arr, ""]); }
  function removeValue(i: number) {
    setCoreValues(arr => arr.length === 1 ? [""] : arr.filter((_, idx) => idx !== i));
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        vision_statement: vision.trim() || null,
        mission_statement: mission.trim() || null,
        core_values: coreValues.map(v => v.trim()).filter(Boolean),
        tagline: tagline.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from(TABLES.TENANTS).update(payload).eq(COLS.ID, tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings", tenantId] });
      toast.success("Vision & Mission saved");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Vision & Mission — Vestry</title></Helmet>

      <div className="max-w-3xl pb-24">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          {/* Card header */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Globe className="h-5 w-5 text-orange-500" />
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Vision & Mission</h2>
            </div>
            <p className="text-xs text-slate-500">Define your church's purpose and direction</p>
          </div>

          {/* Vision Statement */}
          <div className="space-y-1.5">
            <Label>Vision Statement</Label>
            <Textarea
              placeholder="e.g., To be a community of believers transforming lives through the love of Christ..."
              value={vision}
              onChange={e => setVision(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-slate-400">What does your church aspire to become?</p>
          </div>

          {/* Mission Statement */}
          <div className="space-y-1.5">
            <Label>Mission Statement</Label>
            <Textarea
              placeholder="e.g., To make disciples of all nations by teaching, equipping, and sending..."
              value={mission}
              onChange={e => setMission(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-slate-400">What does your church do to achieve its vision?</p>
          </div>

          {/* Core Values */}
          <div className="space-y-2">
            <Label>Core Values</Label>
            <div className="space-y-2">
              {coreValues.map((val, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="e.g., Faith, Love, Community..."
                    value={val}
                    onChange={e => updateValue(i, e.target.value)}
                    className="flex-1"
                  />
                  {coreValues.length > 1 && (
                    <button
                      onClick={() => removeValue(i)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 mt-1"
              onClick={addValue}
            >
              <Plus className="h-3.5 w-3.5" /> Add Value
            </Button>
          </div>

          {/* Church Tagline */}
          <div className="space-y-1.5">
            <Label>Church Tagline</Label>
            <Input
              placeholder="e.g., Where faith meets community"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
            />
            <p className="text-xs text-slate-400">A short, memorable phrase that represents your church</p>
          </div>
        </div>
      </div>

      {/* Sticky Save */}
      <div className="fixed bottom-6 right-6 z-10">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-lg"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
