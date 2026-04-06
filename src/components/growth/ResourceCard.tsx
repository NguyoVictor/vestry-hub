import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Video, Music, File, Link, Download, Eye, UserPlus } from "lucide-react";

export interface DiscipleshipResource {
  id: string;
  title: string;
  type: "pdf" | "video" | "audio" | "document" | "external_link";
  category: string;
  description?: string | null;
  duration_label?: string | null;
  is_downloadable: boolean;
  assignment_count: number;
  recommended_stages?: number[];
}

interface ResourceCardProps {
  resource: DiscipleshipResource;
  onAssign?: () => void;
  onDownload?: () => void;
  onView?: () => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  video: Video,
  audio: Music,
  document: File,
  external_link: Link,
};

const TYPE_COLORS: Record<string, string> = {
  pdf: "text-red-500 bg-red-50 dark:bg-red-900/20",
  video: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
  audio: "text-violet-500 bg-violet-50 dark:bg-violet-900/20",
  document: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  external_link: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
};

export function ResourceCard({ resource, onAssign, onDownload, onView }: ResourceCardProps) {
  const Icon = TYPE_ICONS[resource.type] || File;
  const colorClass = TYPE_COLORS[resource.type] || TYPE_COLORS.document;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2">{resource.title}</h3>
          {resource.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{resource.description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-xs capitalize">{resource.category?.replace(/_/g, " ")}</Badge>
        {resource.duration_label && (
          <Badge variant="outline" className="text-xs">{resource.duration_label}</Badge>
        )}
        {resource.recommended_stages?.map(s => (
          <Badge key={s} variant="outline" className="text-xs">Stage {s}</Badge>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Assigned to {resource.assignment_count} convert{resource.assignment_count !== 1 ? "s" : ""}
      </p>

      <div className="flex gap-2 mt-auto">
        {onView && (
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onView}>
            <Eye className="h-3 w-3" /> View
          </Button>
        )}
        {onAssign && (
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onAssign}>
            <UserPlus className="h-3 w-3" /> Assign
          </Button>
        )}
        {onDownload && resource.is_downloadable && (
          <Button size="sm" variant="outline" className="gap-1" onClick={onDownload}>
            <Download className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
