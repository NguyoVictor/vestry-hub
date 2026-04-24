import { lazy, Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TABLES, COLS } from "@/lib/schema";
import { useAnnouncementNotifications } from "@/hooks/useAnnouncementNotifications";
import AttachmentDropzone from "./AttachmentDropzone";
import type {
  Announcement,
  AnnouncementType,
  AttachmentPreviewItem,
} from "@/types/announcements";
import { Calendar, Clock, Pin, MessageSquare, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Lazy-loaded TipTap editor ────────────────────────────────────────────────

const TipTapEditor = lazy(() => import("./TipTapEditor"));

// ─── Zod schema ───────────────────────────────────────────────────────────────

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  rich_body: z.string().min(1, "Body is required"),
  category_id: z.string().optional(),
  audience: z
    .enum(["all", "specific_group", "leaders_only"])
    .default("all"),
  group_id: z.string().optional(),
  is_pinned: z.boolean().default(false),
  comments_enabled: z.boolean().default(true),
  reactions_enabled: z.boolean().default(true),
  scheduled_at: z.string().optional(),
  expires_at: z.string().optional(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PostAnnouncementDrawerProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string;
  editData?: Announcement | null;
}

// ─── Audience option ──────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  {
    value: "all",
    label: "All Members",
    description: "Visible to everyone",
  },
  {
    value: "specific_group",
    label: "Specific Group",
    description: "Visible to a selected group",
  },
  {
    value: "leaders_only",
    label: "Leaders Only",
    description: "Visible to leaders and staff",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function PostAnnouncementDrawer({
  open,
  onClose,
  tenantId,
  userId,
  editData,
}: PostAnnouncementDrawerProps) {
  const qc = useQueryClient();
  const { notify } = useAnnouncementNotifications();
  const isEdit = !!editData;

  const [attachments, setAttachments] = useState<AttachmentPreviewItem[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Form ─────────────────────────────────────────────────────────────────────

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      rich_body: "",
      category_id: undefined,
      audience: "all",
      group_id: undefined,
      is_pinned: false,
      comments_enabled: true,
      reactions_enabled: true,
      scheduled_at: undefined,
      expires_at: undefined,
    },
  });

  const watchedAudience = form.watch("audience");

  // ── Populate form when editing ────────────────────────────────────────────────

  useEffect(() => {
    if (editData) {
      form.reset({
        title: editData.title,
        rich_body: editData.rich_body ?? editData.body ?? "",
        category_id: editData.category_id ?? undefined,
        audience: editData.audience ?? "all",
        group_id: editData.group_id ?? undefined,
        is_pinned: editData.is_pinned ?? false,
        comments_enabled: editData.comments_enabled ?? true,
        reactions_enabled: editData.reactions_enabled ?? true,
        scheduled_at: editData.scheduled_at ?? undefined,
        expires_at: editData.expires_at ?? undefined,
      });
      if (editData.scheduled_at) setIsScheduled(true);
    } else {
      form.reset({
        title: "",
        rich_body: "",
        category_id: undefined,
        audience: "all",
        group_id: undefined,
        is_pinned: false,
        comments_enabled: true,
        reactions_enabled: true,
        scheduled_at: undefined,
        expires_at: undefined,
      });
      setIsScheduled(false);
    }
  }, [editData, form]);

  // ── Queries ───────────────────────────────────────────────────────────────────

  const { data: announcementTypes = [] } = useQuery<AnnouncementType[]>({
    queryKey: ["announcement-types", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.ANNOUNCEMENT_TYPES)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .eq("is_active", true)
        .order("order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AnnouncementType[];
    },
    staleTime: 300_000,
    enabled: open,
  });

  const { data: groups = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["groups", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.GROUPS)
        .select("id, name")
        .eq(COLS.TENANT_ID, tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
    enabled: open && watchedAudience === "specific_group",
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleClose = () => {
    form.reset();
    setAttachments([]);
    setIsScheduled(false);
    onClose();
  };

  const onSubmit = async (values: AnnouncementFormValues) => {
    setIsSubmitting(true);
    try {
      const status = isScheduled && values.scheduled_at ? "scheduled" : "active";

      const payload = {
        tenant_id: tenantId,
        title: values.title,
        rich_body: values.rich_body,
        body: values.rich_body.replace(/<[^>]+>/g, "").trim(),
        category_id: values.category_id ?? null,
        audience: values.audience,
        group_id: values.audience === "specific_group" ? (values.group_id ?? null) : null,
        is_pinned: values.is_pinned,
        comments_enabled: values.comments_enabled,
        reactions_enabled: values.reactions_enabled,
        scheduled_at: isScheduled && values.scheduled_at ? values.scheduled_at : null,
        expires_at: values.expires_at ?? null,
        status,
        created_by: userId,
      };

      let announcementId: string;

      if (isEdit && editData) {
        // ── Update existing ────────────────────────────────────────────────
        const { error } = await supabase
          .from(TABLES.ANNOUNCEMENTS)
          .update({ ...payload, updated_at: new Date().toISOString() } as never)
          .eq("id", editData.id);
        if (error) throw error;
        announcementId = editData.id;
      } else {
        // ── Insert new ─────────────────────────────────────────────────────
        const { data: inserted, error } = await supabase
          .from(TABLES.ANNOUNCEMENTS)
          .insert(payload as never)
          .select("id")
          .single();
        if (error) throw error;
        announcementId = (inserted as { id: string }).id;
      }

      // ── Upload attachments ─────────────────────────────────────────────────
      const doneAttachments = attachments.filter(
        (a) => a.uploadStatus === "done" && a.url
      );

      if (doneAttachments.length > 0) {
        const attachmentRecords = doneAttachments.map((a, idx) => ({
          tenant_id: tenantId,
          announcement_id: announcementId,
          type: a.type,
          url: a.url!,
          filename: a.filename ?? null,
          size_bytes: a.sizeBytes ?? null,
          mime_type: a.mimeType ?? null,
          og_title: a.ogTitle ?? null,
          og_description: a.ogDescription ?? null,
          og_image_url: a.ogImageUrl ?? null,
          display_order: idx,
        }));

        const { error: attachErr } = await supabase
          .from(TABLES.ANNOUNCEMENT_ATTACHMENTS)
          .insert(attachmentRecords as never);

        if (attachErr) {
          console.error("[PostAnnouncementDrawer] Failed to insert attachments:", attachErr);
        }
      }

      // ── Increment type usage ───────────────────────────────────────────────
      if (values.category_id) {
        await supabase.rpc("increment_announcement_type_usage" as never, {
          p_type_id: values.category_id,
        } as never);
      }

      // ── Fan-out notifications (new posts only, not edits) ──────────────────
      if (!isEdit && status === "active") {
        const selectedType = announcementTypes.find(
          (t) => t.id === values.category_id
        );
        await notify(
          announcementId,
          {
            title: values.title,
            body: null,
            rich_body: values.rich_body,
            audience: values.audience,
            group_id: values.audience === "specific_group" ? (values.group_id ?? null) : null,
          },
          selectedType?.color ?? "#6366f1",
          selectedType?.label ?? "General"
        );
      }

      // ── Invalidate queries ─────────────────────────────────────────────────
      qc.invalidateQueries({ queryKey: ["announcements", tenantId] });
      qc.invalidateQueries({ queryKey: ["announcement-types", tenantId] });

      // ── Toast ──────────────────────────────────────────────────────────────
      if (isEdit) {
        toast.success("Announcement updated");
      } else if (status === "scheduled") {
        toast.success("Announcement scheduled");
      } else {
        toast.success("Announcement posted");
      }

      handleClose();
    } catch (err: unknown) {
      console.error("[PostAnnouncementDrawer] Submit error:", err);
      toast.error((err as Error)?.message ?? "Failed to save announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        side="right"
        className="font-jakarta w-full sm:max-w-xl overflow-y-auto flex flex-col p-0"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <SheetTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isEdit ? "Edit Announcement" : "Post Announcement"}
          </SheetTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEdit
              ? "Update the details of this announcement."
              : "Compose and publish an announcement to your congregation."}
          </p>
        </SheetHeader>

        {/* ── Form body ───────────────────────────────────────────────────── */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-y-auto"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Title <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Announcement title…"
                        className="h-10 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Rich body — TipTap lazy-loaded */}
              <FormField
                control={form.control}
                name="rich_body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Body <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Suspense
                        fallback={
                          <Skeleton className="h-48 w-full rounded-lg" />
                        }
                      >
                        <TipTapEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Write your announcement…"
                        />
                      </Suspense>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Category
                    </FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? undefined : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10">
                          <SelectValue placeholder="Select a category…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-slate-400">No category</span>
                        </SelectItem>
                        {announcementTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: type.color }}
                              />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Audience */}
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Audience
                    </FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-3 gap-2">
                        {AUDIENCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              field.onChange(opt.value);
                              if (opt.value !== "specific_group") {
                                form.setValue("group_id", undefined);
                              }
                            }}
                            className={cn(
                              "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left text-xs transition-all",
                              field.value === opt.value
                                ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                            )}
                          >
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-[10px] opacity-70 leading-tight">
                              {opt.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Group picker — shown when "Specific Group" is selected */}
              {watchedAudience === "specific_group" && (
                <FormField
                  control={form.control}
                  name="group_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Select Group <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10">
                            <SelectValue placeholder="Choose a group…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Attachments */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Attachments
                </p>
                <AttachmentDropzone
                  tenantId={tenantId}
                  announcementId={editData?.id ?? `draft-${Date.now()}`}
                  attachments={attachments}
                  onChange={setAttachments}
                />
              </div>

              {/* Toggle switches */}
              <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Options
                </p>

                {/* Pin */}
                <FormField
                  control={form.control}
                  name="is_pinned"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Pin className="h-4 w-4 text-slate-400" />
                          <div>
                            <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                              Pin announcement
                            </FormLabel>
                            <p className="text-xs text-slate-400">
                              Keeps this at the top of the feed
                            </p>
                          </div>
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

                {/* Enable comments */}
                <FormField
                  control={form.control}
                  name="comments_enabled"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-slate-400" />
                          <div>
                            <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                              Enable comments
                            </FormLabel>
                            <p className="text-xs text-slate-400">
                              Allow members to reply
                            </p>
                          </div>
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

                {/* Enable reactions */}
                <FormField
                  control={form.control}
                  name="reactions_enabled"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Smile className="h-4 w-4 text-slate-400" />
                          <div>
                            <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                              Enable reactions
                            </FormLabel>
                            <p className="text-xs text-slate-400">
                              Allow emoji reactions on this post
                            </p>
                          </div>
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
              </div>

              {/* Scheduling */}
              <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Schedule for later
                      </p>
                      <p className="text-xs text-slate-400">
                        Set a future publish date and time
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isScheduled}
                    onCheckedChange={(v) => {
                      setIsScheduled(v);
                      if (!v) form.setValue("scheduled_at", undefined);
                    }}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {isScheduled && (
                  <FormField
                    control={form.control}
                    name="scheduled_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Publish date &amp; time
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            className="h-10 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                            min={new Date().toISOString().slice(0, 16)}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Expiry */}
              <FormField
                control={form.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Expiry date{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        className="h-10 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                        min={new Date().toISOString().slice(0, 16)}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || undefined)
                        }
                      />
                    </FormControl>
                    <p className="text-xs text-slate-400 mt-1">
                      The announcement will be hidden from members after this date.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-white dark:bg-slate-900">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>

              {isEdit ? (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
                >
                  {isSubmitting ? "Saving…" : "Save Changes"}
                </Button>
              ) : isScheduled ? (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
                >
                  {isSubmitting ? "Scheduling…" : "Schedule Announcement"}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
                >
                  {isSubmitting ? "Posting…" : "Post Now"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
