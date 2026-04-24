import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Eye } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import type { ReadReceipt } from "@/types/announcements";

interface AnnouncementReadReceiptsModalProps {
  open: boolean;
  onClose: () => void;
  announcementId: string;
  tenantId: string;
  totalAudienceCount: number;
}

const AVATAR_DISPLAY_LIMIT = 5;

export function AnnouncementReadReceiptsModal({
  open,
  onClose,
  announcementId,
  tenantId,
  totalAudienceCount,
}: AnnouncementReadReceiptsModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["read-receipts", announcementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.ANNOUNCEMENT_READ_RECEIPTS)
        .select(`*, members(first_name, last_name, avatar_url)`)
        .eq("announcement_id", announcementId)
        .order("read_at", { ascending: false });

      if (error) throw error;
      return data as ReadReceipt[];
    },
    staleTime: 60_000,
    enabled: open,
  });

  const receipts = data ?? [];
  const readCount = receipts.length;
  const hasOverflow = readCount >= AVATAR_DISPLAY_LIMIT;
  const visibleReceipts = hasOverflow
    ? receipts.slice(0, AVATAR_DISPLAY_LIMIT)
    : receipts;
  const overflowCount = readCount - AVATAR_DISPLAY_LIMIT;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-0 font-jakarta">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-slate-400" />
            <DialogTitle className="text-lg font-semibold text-slate-900 font-jakarta">
              Read Receipts
            </DialogTitle>
          </div>
          {!isLoading && (
            <p className="text-sm text-slate-500 font-jakarta mt-1">
              Seen by{" "}
              <span className="font-semibold text-slate-700">{readCount}</span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {totalAudienceCount}
              </span>{" "}
              members
            </p>
          )}
          {isLoading && <Skeleton className="h-4 w-40 mt-1" />}
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 max-h-[420px] overflow-y-auto">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && receipts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Eye className="h-10 w-10 text-slate-200" />
              <p className="text-sm font-semibold text-slate-500 font-jakarta">
                No one has read this yet
              </p>
              <p className="text-xs text-slate-400 font-jakarta">
                Members who view this announcement will appear here.
              </p>
            </div>
          )}

          {!isLoading && receipts.length > 0 && (
            <ul className="space-y-3">
              {visibleReceipts.map((receipt) => {
                const member = receipt.members;
                const fullName = member
                  ? `${member.first_name} ${member.last_name}`
                  : "Unknown Member";
                const formattedTime = receipt.read_at
                  ? format(new Date(receipt.read_at), "dd MMM, h:mm a")
                  : "";

                return (
                  <li
                    key={receipt.id}
                    className="flex items-center gap-3"
                  >
                    <MemberAvatar
                      name={fullName}
                      avatarUrl={member?.avatar_url}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 font-jakarta truncate">
                        {fullName}
                      </p>
                      <p className="text-xs text-slate-400 font-jakarta">
                        {formattedTime}
                      </p>
                    </div>
                  </li>
                );
              })}

              {hasOverflow && overflowCount > 0 && (
                <li className="flex items-center gap-3 pt-1">
                  <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 font-jakarta">
                      +{overflowCount}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-jakarta">
                    {overflowCount} more{" "}
                    {overflowCount === 1 ? "member" : "members"}
                  </p>
                </li>
              )}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
