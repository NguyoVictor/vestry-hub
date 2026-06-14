import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageTransition } from "@/components/ui/PageTransition";
import { AnnouncementTypeDrawer } from "@/components/announcements/AnnouncementTypeDrawer";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";
import type { AnnouncementType } from "@/types/announcements";

// ─── Default seed data ────────────────────────────────────────────────────────

const DEFAULT_TYPES = [
  {
    label: "General",
    description: "General church announcements",
    color: "#6366f1",
    icon: "megaphone",
    order: 0,
  },
  {
    label: "Service",
    description: "Service-related announcements",
    color: "#f59e0b",
    icon: "church",
    order: 1,
  },
  {
    label: "Event",
    description: "Upcoming events and activities",
    color: "#10b981",
    icon: "calendar",
    order: 2,
  },
  {
    label: "Finance",
    description: "Financial updates and giving campaigns",
    color: "#3b82f6",
    icon: "banknote",
    order: 3,
  },
  {
    label: "Urgent",
    description: "Time-sensitive and urgent notices",
    color: "#ef4444",
    icon: "alert-triangle",
    order: 4,
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnnouncementTypesPage() {
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const qc = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editType, setEditType] = useState<AnnouncementType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [rows, setRows] = useState<AnnouncementType[]>([]);

  // ─── Query ──────────────────────────────────────────────────────────────────

  const { data: types = [], isLoading } = useQuery<AnnouncementType[]>({
    queryKey: ["announcement-types", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.ANNOUNCEMENT_TYPES)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AnnouncementType[];
    },
    staleTime: 300_000,
  });

  // Keep local rows in sync with query data
  useEffect(() => {
    setRows(types);
  }, [types]);

  // Auto-seed defaults when tenant has zero types
  useEffect(() => {
    if (!isLoading && types.length === 0 && !seeding) {
      handleSeedDefaults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, types.length]);

  // ─── Seed defaults ──────────────────────────────────────────────────────────

  const handleSeedDefaults = async () => {
    if (readOnly) return;
    setSeeding(true);
    try {
      const records = DEFAULT_TYPES.map((d) => ({
        ...d,
        tenant_id: tenantId,
        is_default: true,
        is_active: true,
        usage_count: 0,
      }));
      const { error } = await supabase
        .from(TABLES.ANNOUNCEMENT_TYPES)
        .insert(records as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["announcement-types", tenantId] });
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to seed default types");
    } finally {
      setSeeding(false);
    }
  };

  // ─── Optimistic active toggle ───────────────────────────────────────────────

  const toggleActive = async (type: AnnouncementType) => {
    if (readOnly) return;
    const newVal = !type.is_active;
    // Optimistic update
    setRows((prev) =>
      prev.map((r) => (r.id === type.id ? { ...r, is_active: newVal } : r))
    );
    const { error } = await supabase
      .from(TABLES.ANNOUNCEMENT_TYPES)
      .update({ is_active: newVal } as never)
      .eq("id", type.id);
    if (error) {
      toast.error(error.message);
      // Revert on error
      setRows((prev) =>
        prev.map((r) => (r.id === type.id ? { ...r, is_active: !newVal } : r))
      );
    } else {
      qc.invalidateQueries({ queryKey: ["announcement-types", tenantId] });
    }
  };

  // ─── Drag-to-reorder ────────────────────────────────────────────────────────

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...rows];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setRows(reordered);
    setDragIdx(idx);
  };

  const handleDrop = async () => {
    setDragIdx(null);
    // Persist updated order values
    const updates = rows.map((r, i) => ({ id: r.id, order: i }));
    for (const u of updates) {
      await supabase
        .from(TABLES.ANNOUNCEMENT_TYPES)
        .update({ order: u.order } as never)
        .eq("id", u.id);
    }
    qc.invalidateQueries({ queryKey: ["announcement-types", tenantId] });
  };

  // ─── Delete / Archive ───────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (readOnly) return;
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.usage_count === 0) {
        // Permanent delete
        const { error } = await supabase
          .from(TABLES.ANNOUNCEMENT_TYPES)
          .delete()
          .eq("id", deleteTarget.id);
        if (error) throw error;
        toast.success("Announcement type deleted");
      } else {
        // Archive — set is_active: false
        const { error } = await supabase
          .from(TABLES.ANNOUNCEMENT_TYPES)
          .update({ is_active: false } as never)
          .eq("id", deleteTarget.id);
        if (error) throw error;
        toast.info(
          "This type is in use and has been archived instead of deleted"
        );
      }
      qc.invalidateQueries({ queryKey: ["announcement-types", tenantId] });
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to delete type");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <Helmet>
        <title>Announcement Types — Vestry</title>
      </Helmet>

      {/* Read-only banner */}
      {readOnly && <ReadOnlyBanner section="Announcement Types" />}

      <div className="font-jakarta max-w-3xl">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Card header */}
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Announcement Types
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage categories used to organise announcements
              </p>
            </div>
            <PermissionButton
              readOnly={readOnly}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0"
              size="sm"
              onClick={() => {
                setEditType(null);
                setDrawerOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Type
            </PermissionButton>
          </div>

          {/* Table */}
          {isLoading || seeding ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <p className="text-sm font-medium">No announcement types yet.</p>
              <PermissionButton
                readOnly={readOnly}
                variant="outline"
                size="sm"
                onClick={handleSeedDefaults}
                disabled={seeding}
              >
                {seeding ? "Adding..." : "Add Default Types"}
              </PermissionButton>
            </div>
          ) : (
            <table className="w-full text-sm font-jakarta">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="w-8 px-3 py-3" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Description
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Active
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((type, idx) => (
                  <tr
                    key={type.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={handleDrop}
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors ${
                      dragIdx === idx ? "opacity-50" : ""
                    }`}
                  >
                    {/* Drag handle */}
                    <td className="px-3 py-3 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                    </td>

                    {/* Color swatch + label */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {type.label}
                        </span>
                        {type.is_default && (
                          <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600">
                            Default
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-[240px]">
                      <p className="truncate">{type.description || "—"}</p>
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={() => toggleActive(type)}
                        className="data-[state=checked]:bg-orange-500"
                        disabled={readOnly}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit */}
                        <button
                          title="Edit"
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          onClick={() => {
                            setEditType(type);
                            setDrawerOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Delete — disabled for default types */}
                        {!type.is_default && (
                          <button
                            title={
                              type.usage_count > 0
                                ? "Archive type (in use)"
                                : "Delete type"
                            }
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            onClick={() => setDeleteTarget(type)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Drawer */}
      <AnnouncementTypeDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditType(null);
        }}
        tenantId={tenantId}
        editData={editType}
      />

      {/* Delete / Archive Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={
          deleteTarget?.usage_count === 0
            ? `Delete "${deleteTarget?.label}"?`
            : `Archive "${deleteTarget?.label}"?`
        }
        description={
          deleteTarget?.usage_count === 0
            ? "This will permanently remove this announcement type. This cannot be undone."
            : `This type has been used in ${deleteTarget?.usage_count} announcement(s) and cannot be permanently deleted. It will be archived (set to inactive) instead.`
        }
        confirmLabel={deleteTarget?.usage_count === 0 ? "Delete" : "Archive"}
        destructive={deleteTarget?.usage_count === 0}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
      />
    </PageTransition>
  );
}
