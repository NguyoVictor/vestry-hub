import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Video, Plus, Edit2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { detectPlatform } from "@/utils/streamPlatform";

// ─── Form Schema ──────────────────────────────────────────────────────────────
const platformSchema = z.object({
  name: z.string().min(1, "Platform name is required"),
  platform_url: z.string().url("Please enter a valid URL"),
  embed_url: z.string().url("Please enter a valid URL"),
  subscribe_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  subscribe_label: z.string().optional(),
});

type PlatformFormData = z.infer<typeof platformSchema>;

interface LivestreamConfig {
  id: string;
  tenant_id: string;
  name: string;
  platform_type: string;
  platform_url: string;
  embed_url: string;
  subscribe_url: string | null;
  subscribe_label: string | null;
  created_at: string;
  updated_at: string;
}

export default function LivestreamingSettings() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<LivestreamConfig | null>(null);

  // Fetch livestream configs
  const { data: platforms, isLoading } = useQuery({
    queryKey: ["livestream-configs", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LIVESTREAM_CONFIGS)
        .select("*")
        .eq(COLS.TENANT_ID, tenantId)
        .order(COLS.CREATED_AT, { ascending: false });
      if (error) throw error;
      return data as LivestreamConfig[];
    },
    enabled: !!tenantId,
    staleTime: 300000,
  });

  // Form
  const form = useForm<PlatformFormData>({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      name: "",
      platform_url: "",
      embed_url: "",
      subscribe_url: "",
      subscribe_label: "",
    },
  });

  // Reset form when dialog opens/closes or editing changes
  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingPlatform(null);
      form.reset({
        name: "",
        platform_url: "",
        embed_url: "",
        subscribe_url: "",
        subscribe_label: "",
      });
    }
  };

  const handleEdit = (platform: LivestreamConfig) => {
    setEditingPlatform(platform);
    form.reset({
      name: platform.name,
      platform_url: platform.platform_url,
      embed_url: platform.embed_url,
      subscribe_url: platform.subscribe_url || "",
      subscribe_label: platform.subscribe_label || "",
    });
    setDialogOpen(true);
  };

  // Save mutation (INSERT or UPDATE)
  const saveMutation = useMutation({
    mutationFn: async (data: PlatformFormData) => {
      if (readOnly) return;
      const platformInfo = detectPlatform(data.platform_url);

      const payload = {
        [COLS.TENANT_ID]: tenantId,
        name: data.name,
        [COLS.PLATFORM_TYPE]: platformInfo.type,
        [COLS.PLATFORM_URL]: data.platform_url,
        [COLS.EMBED_URL]: data.embed_url,
        [COLS.SUBSCRIBE_URL]: data.subscribe_url || null,
        [COLS.SUBSCRIBE_LABEL]: data.subscribe_label || platformInfo.subscribeLabel,
        [COLS.UPDATED_AT]: new Date().toISOString(),
      };

      if (editingPlatform) {
        // UPDATE
        const { error } = await supabase
          .from(TABLES.LIVESTREAM_CONFIGS)
          .update(payload)
          .eq(COLS.ID, editingPlatform.id);
        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase
          .from(TABLES.LIVESTREAM_CONFIGS)
          .insert({ ...payload, [COLS.CREATED_AT]: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["livestream-configs", tenantId] });
      toast.success(editingPlatform ? "Platform updated successfully" : "Platform added successfully");
      handleDialogChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save platform");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (platformId: string) => {
      const { error } = await supabase
        .from(TABLES.LIVESTREAM_CONFIGS)
        .delete()
        .eq(COLS.ID, platformId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["livestream-configs", tenantId] });
      toast.success("Platform deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete platform");
    },
  });

  const onSubmit = (data: PlatformFormData) => {
    saveMutation.mutate(data);
  };

  const getPlatformColor = (type: string) => {
    switch (type) {
      case "youtube":
        return "#FF0000";
      case "facebook":
        return "#1877F2";
      case "vimeo":
        return "#1AB7EA";
      default:
        return "#7c3aed";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Livestreaming Settings — Vestry</title>
      </Helmet>

      {/* Read-only banner */}
      {readOnly && <ReadOnlyBanner section="Livestreaming Settings" />}

      <div className="max-w-3xl space-y-6">
        {/* Livestreaming Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Video className="h-5 w-5 text-violet-500" />
                Livestreaming
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure streaming platforms for your church's live broadcasts
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <PermissionButton readOnly={readOnly} size="sm" className="bg-violet-500 hover:bg-violet-600 text-white gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Platform
                </PermissionButton>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingPlatform ? "Edit Platform" : "Add Streaming Platform"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label>
                      Platform Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...form.register("name")}
                      placeholder="e.g., YouTube Main Channel"
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      Platform URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...form.register("platform_url")}
                      placeholder="https://youtube.com/channel/..."
                    />
                    {form.formState.errors.platform_url && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.platform_url.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      Embed URL <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      {...form.register("embed_url")}
                      placeholder="https://youtube.com/embed/..."
                    />
                    {form.formState.errors.embed_url && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.embed_url.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Subscribe URL (Optional)</Label>
                    <Input
                      {...form.register("subscribe_url")}
                      placeholder="https://youtube.com/channel/...?sub_confirmation=1"
                    />
                    {form.formState.errors.subscribe_url && (
                      <p className="text-xs text-red-500">
                        {form.formState.errors.subscribe_url.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Subscribe Label (Optional)</Label>
                    <Input
                      {...form.register("subscribe_label")}
                      placeholder="e.g., Subscribe on YouTube"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-violet-500 hover:bg-violet-600 text-white"
                      disabled={saveMutation.isPending || readOnly}
                    >
                      {saveMutation.isPending
                        ? "Saving..."
                        : editingPlatform
                        ? "Update"
                        : "Add Platform"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Platform List */}
          {platforms && platforms.length > 0 ? (
            <div className="space-y-3">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${getPlatformColor(platform.platform_type)}15` }}
                    >
                      <Video
                        className="h-5 w-5"
                        style={{ color: getPlatformColor(platform.platform_type) }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {platform.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                          style={{
                            backgroundColor: `${getPlatformColor(platform.platform_type)}15`,
                            color: getPlatformColor(platform.platform_type),
                          }}
                        >
                          {platform.platform_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEdit(platform)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this platform?")) {
                          deleteMutation.mutate(platform.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Video className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                No streaming platforms configured
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Add your first streaming platform to start broadcasting live services
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
