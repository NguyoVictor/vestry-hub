import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { TABLES, COLS } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronDown, X, Globe, MapPin, GitMerge } from "lucide-react";
import { logActivity } from "@/lib/activityLogger";

const PRESET_COLORS = ["#4F46E5","#7c3aed","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#F97316","#14B8A6","#64748B","#3b82f6"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

interface GroupDrawerProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  groupTypes: any[];
  editData?: any | null;
  onSuccess: () => void;
}

export function GroupDrawer({ open, onClose, tenantId, groupTypes, editData, onSuccess }: GroupDrawerProps) {
  const qc = useQueryClient();
  const isEdit = !!editData;

  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#4F46E5");
  const [meetingType, setMeetingType] = useState<"onsite"|"online"|"hybrid">("onsite");
  const [meetingDay, setMeetingDay] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [location, setLocation] = useState("");
  const [isActive, setIsActive] = useState(true);
  // Advanced
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [maxMembers, setMaxMembers] = useState("");
  const [visibility, setVisibility] = useState<"private"|"public">("private");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editData) {
        setName(editData.name ?? "");
        setTypeId(editData.type ?? editData.group_type_id ?? ""); // Check both type and group_type_id for backward compatibility
        setDescription(editData.description ?? "");
        setColor(editData.cover_color || editData.color || "#4F46E5");
        setMeetingType(editData.meeting_type ?? "onsite");
        setMeetingDay(editData.meeting_day ?? "");
        setMeetingTime(editData.meeting_time ?? "");
        setLocation(editData.location ?? editData.meeting_location ?? "");
        setIsActive(editData.is_active ?? true);
        setMaxMembers(editData.max_members ? String(editData.max_members) : "");
        setVisibility(editData.visibility ?? "private");
        setTags(editData.tags ?? []);
      } else {
        setName(""); setTypeId(""); setDescription(""); setColor("#4F46E5");
        setMeetingType("onsite"); setMeetingDay(""); setMeetingTime(""); setLocation("");
        setIsActive(true); setMaxMembers(""); setVisibility("private"); setTags([]);
        setAdvancedOpen(false);
      }
    }
  }, [open, editData]);

  const handleClose = () => { onClose(); };

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/,$/, "");
      if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Group name is required."); return; }
    setSaving(true);
    try {
      // Generate jitsi room name if online/hybrid and not already set
      let jitsiRoom = editData?.jitsi_room_name ?? null;

      const payload: any = {
        name: name.trim(),
        type: typeId || 'other', // Use existing 'type' column instead of 'group_type_id'
        description: description.trim() || null,
        cover_color: color,
        color,
        meeting_type: meetingType,
        meeting_day: meetingDay || null,
        meeting_time: meetingTime || null,
        location: location.trim() || null,
        meeting_location: location.trim() || null,
        is_active: isActive,
        max_members: maxMembers ? parseInt(maxMembers) : null,
        visibility,
        tags: tags.length > 0 ? tags : null,
      };

      if (isEdit && editData) {
        // Generate room name if switching to online/hybrid and none exists
        if ((meetingType === "online" || meetingType === "hybrid") && !jitsiRoom) {
          jitsiRoom = `vestryhub-group-${editData.id}`;
        }
        payload.jitsi_room_name = jitsiRoom;
        const { error } = await supabase.from(TABLES.GROUPS).update(payload).eq("id", editData.id);
        if (error) throw error;
        toast.success("Group updated.");
      } else {
        const { data, error } = await supabase.from(TABLES.GROUPS)
          .insert({ ...payload, tenant_id: tenantId }).select("id").single();
        if (error) throw error;
        // Generate jitsi room name now that we have the id
        if ((meetingType === "online" || meetingType === "hybrid") && data?.id) {
          jitsiRoom = `vestryhub-group-${data.id}`;
          await supabase.from(TABLES.GROUPS).update({ jitsi_room_name: jitsiRoom }).eq("id", data.id);
        }
        toast.success("Group created.");
        logActivity({ churchId: tenantId, actionType: "new_group", description: `"${name.trim()}" group was created`, entityType: "group", entityName: name.trim() });
      }

      qc.invalidateQueries({ queryKey: ["groups", tenantId] });
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save group.");
    } finally {
      setSaving(false);
    }
  };

  const jitsiRoomPreview = editData?.jitsi_room_name || (editData?.id ? `vestryhub-group-${editData.id}` : "vestryhub-group-[id]");

  return (
    <Sheet open={open} onOpenChange={v => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto font-jakarta" side="right">
        <SheetHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <SheetTitle className="font-jakarta">{isEdit ? "Edit Group" : "Create Group"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pt-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="font-jakarta text-xs font-medium text-slate-600">Group Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning Prayer Group" className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm" />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="font-jakarta text-xs font-medium text-slate-600">Type</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger className="h-10 border-slate-200 font-jakarta text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No type</SelectItem>
                {groupTypes.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="font-jakarta text-xs font-medium text-slate-600">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What is this group about?" className="border-slate-200 focus:border-orange-500 font-jakarta text-sm resize-none" />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="font-jakarta text-xs font-medium text-slate-600">Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-slate-900 dark:border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Meeting Type segmented control */}
          <div className="space-y-2">
            <Label className="font-jakarta text-xs font-medium text-slate-600">Meeting Type</Label>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {(["onsite","online","hybrid"] as const).map(mt => {
                const icons = { onsite: MapPin, online: Globe, hybrid: GitMerge };
                const labels = { onsite: "🏢 Onsite", online: "🌐 Online", hybrid: "🔀 Hybrid" };
                const Icon = icons[mt];
                return (
                  <button key={mt} type="button" onClick={() => setMeetingType(mt)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${meetingType === mt ? "bg-orange-500 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    {labels[mt]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Day + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-jakarta text-xs font-medium text-slate-600">Meeting Day</Label>
              <Select value={meetingDay} onValueChange={setMeetingDay}>
                <SelectTrigger className="h-10 border-slate-200 font-jakarta text-sm"><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-jakarta text-xs font-medium text-slate-600">Time</Label>
              <Input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm" />
            </div>
          </div>

          {/* Location — only for onsite/hybrid */}
          <AnimatePresence>
            {(meetingType === "onsite" || meetingType === "hybrid") && (
              <motion.div key="location" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                <Label className="font-jakarta text-xs font-medium text-slate-600">Location</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Church Hall, Room 3" className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Jitsi room display — only for online/hybrid */}
          <AnimatePresence>
            {(meetingType === "online" || meetingType === "hybrid") && (
              <motion.div key="jitsi" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-1">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Meeting Room (auto-generated)</p>
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all">{jitsiRoomPreview}</p>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400">Members join via the Join Meeting button on the group page</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status */}
          <div className="flex items-center justify-between">
            <Label className="font-jakarta text-xs font-medium text-slate-600">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Advanced section */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setAdvancedOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Advanced (optional)
              <motion.div animate={{ rotate: advancedOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </motion.div>
            </button>
            <AnimatePresence>
              {advancedOpen && (
                <motion.div key="advanced" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-4 pb-4 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                    {/* Max Members */}
                    <div className="space-y-1.5">
                      <Label className="font-jakarta text-xs font-medium text-slate-600">Max Members</Label>
                      <Input type="number" value={maxMembers} onChange={e => setMaxMembers(e.target.value)} placeholder="Unlimited" className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm" />
                      <p className="text-[10px] text-slate-400">Leave empty for no member limit</p>
                    </div>
                    {/* Visibility */}
                    <div className="space-y-1.5">
                      <Label className="font-jakarta text-xs font-medium text-slate-600">Visibility</Label>
                      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {(["private","public"] as const).map(v => (
                          <button key={v} type="button" onClick={() => setVisibility(v)}
                            className={`flex-1 py-2 text-xs font-medium transition-colors ${visibility === v ? "bg-orange-500 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                            {v === "private" ? "🔒 Private" : "🌐 Public"}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400">{visibility === "private" ? "Only admins can add members" : "Members can discover and request to join"}</p>
                    </div>
                    {/* Tags */}
                    <div className="space-y-1.5">
                      <Label className="font-jakarta text-xs font-medium text-slate-600">Tags</Label>
                      <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey}
                        placeholder="Add a tag... (press Enter)" className="h-10 border-slate-200 focus:border-orange-500 font-jakarta text-sm" />
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 bg-muted rounded-full px-2.5 py-1 text-xs text-muted-foreground">
                              {tag}
                              <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-red-500 transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400">e.g. East Nairobi, Young Adults, Swahili</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-jakarta font-semibold h-11" onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Group"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
