import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { TABLES } from "@/lib/schema";
import type { AnnouncementType } from "@/types/announcements";

// ─── Schema ───────────────────────────────────────────────────────────────────

const announcementTypeSchema = z.object({
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .default("#6366f1"),
  icon: z.string().min(1, "Icon is required"),
  is_active: z.boolean().default(true),
});

type AnnouncementTypeFormValues = z.infer<typeof announcementTypeSchema>;

// ─── Common Lucide icon names for the selector ────────────────────────────────

const COMMON_ICONS = [
  "megaphone",
  "church",
  "calendar",
  "banknote",
  "alert-triangle",
  "bell",
  "book-open",
  "heart",
  "star",
  "users",
  "music",
  "gift",
  "globe",
  "home",
  "info",
  "mail",
  "map-pin",
  "mic",
  "phone",
  "shield",
  "smile",
  "sun",
  "target",
  "zap",
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AnnouncementTypeDrawerProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editData?: AnnouncementType | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnnouncementTypeDrawer({
  open,
  onClose,
  tenantId,
  editData,
}: AnnouncementTypeDrawerProps) {
  const qc = useQueryClient();
  const isEdit = !!editData;

  const form = useForm<AnnouncementTypeFormValues>({
    resolver: zodResolver(announcementTypeSchema),
    defaultValues: {
      label: "",
      description: "",
      color: "#6366f1",
      icon: "megaphone",
      is_active: true,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (editData) {
      form.reset({
        label: editData.label,
        description: editData.description ?? "",
        color: editData.color,
        icon: editData.icon,
        is_active: editData.is_active,
      });
    } else {
      form.reset({
        label: "",
        description: "",
        color: "#6366f1",
        icon: "megaphone",
        is_active: true,
      });
    }
  }, [editData, form]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const onSubmit = async (values: AnnouncementTypeFormValues) => {
    try {
      if (isEdit && editData) {
        const { error } = await supabase
          .from(TABLES.ANNOUNCEMENT_TYPES)
          .update({
            label: values.label,
            description: values.description?.trim() || null,
            color: values.color,
            icon: values.icon,
            is_active: values.is_active,
          } as never)
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("Announcement type updated");
      } else {
        // Get next order value
        const { data: existing } = await supabase
          .from(TABLES.ANNOUNCEMENT_TYPES)
          .select("order")
          .eq("tenant_id", tenantId)
          .order("order", { ascending: false })
          .limit(1);
        const nextOrder = (((existing?.[0] as { order?: number })?.order ?? -1)) + 1;

        const { error } = await supabase
          .from(TABLES.ANNOUNCEMENT_TYPES)
          .insert({
            tenant_id: tenantId,
            label: values.label,
            description: values.description?.trim() || null,
            color: values.color,
            icon: values.icon,
            is_active: values.is_active,
            is_default: false,
            usage_count: 0,
            order: nextOrder,
          } as never);
        if (error) throw error;
        toast.success("Announcement type saved");
      }

      qc.invalidateQueries({ queryKey: ["announcement-types", tenantId] });
      handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save announcement type");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-md font-jakarta overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <SheetTitle className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit Announcement Type" : "Add Announcement Type"}
          </SheetTitle>
          <p className="text-xs text-slate-500">
            {isEdit
              ? "Update the details of this announcement type."
              : "Create a new category for organizing announcements."}
          </p>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 pt-5"
          >
            {/* Label */}
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-600">
                    Label <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., General, Urgent, Finance"
                      className="h-10 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-600">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this announcement type..."
                      rows={3}
                      className="border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-600">
                    Color
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-10 w-12 cursor-pointer rounded-md border border-slate-200 p-1"
                      />
                      <Input
                        placeholder="#6366f1"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-10 flex-1 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-600">
                    Icon <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        placeholder="Search icon name..."
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-10 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                        list="icon-suggestions"
                      />
                      <datalist id="icon-suggestions">
                        {COMMON_ICONS.map((icon) => (
                          <option key={icon} value={icon} />
                        ))}
                      </datalist>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_ICONS.filter((i) =>
                          i.includes(field.value.toLowerCase())
                        )
                          .slice(0, 12)
                          .map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => field.onChange(icon)}
                              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                                field.value === icon
                                  ? "border-orange-400 bg-orange-50 text-orange-600"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              {icon}
                            </button>
                          ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active toggle */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <FormLabel className="text-sm font-medium text-slate-800">
                        Active
                      </FormLabel>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Enable this type for use in announcements
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            {/* Default type note */}
            {isEdit && editData?.is_default && (
              <p className="text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                This is a default type. Label, description, color, and icon can
                be edited, but it cannot be deleted.
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEdit
                  ? "Update"
                  : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
