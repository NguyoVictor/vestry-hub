import { Calendar, MapPin, Users, MoreVertical, Clock } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const EVENT_TYPE_COLORS: Record<string, string> = {
  conference: "border-l-violet-500",
  outreach: "border-l-emerald-500",
  youth: "border-l-amber-500",
  womens: "border-l-pink-500",
  mens: "border-l-blue-500",
  childrens: "border-l-orange-500",
  prayer: "border-l-indigo-500",
  social: "border-l-cyan-500",
  fundraiser: "border-l-emerald-600",
  other: "border-l-slate-500",
};

const EVENT_TYPE_BG: Record<string, string> = {
  conference: "bg-violet-500",
  outreach: "bg-emerald-500",
  youth: "bg-amber-500",
  womens: "bg-pink-500",
  mens: "bg-blue-500",
  childrens: "bg-orange-500",
  prayer: "bg-indigo-500",
  social: "bg-cyan-500",
  fundraiser: "bg-emerald-600",
  other: "bg-slate-500",
};

interface EventCardProps {
  event: {
    id: string;
    title: string;
    type?: string;
    event_date: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    description?: string;
    banner_image_url?: string;
    capacity_limit?: number;
    status?: string;
    rsvp_count?: number;
  };
  onClick: () => void;
  variant?: "compact" | "full";
  onEdit?: () => void;
  onDelete?: () => void;
  bannerColor?: string;
}

export function EventCard({ event, onClick, variant = "compact", onEdit, onDelete, bannerColor }: EventCardProps) {
  const eventType = (event.type as string) || "other";
  const borderColor = EVENT_TYPE_COLORS[eventType] || EVENT_TYPE_COLORS.other;
  const bgColor = bannerColor || EVENT_TYPE_BG[eventType] || EVENT_TYPE_BG.other;

  if (variant === "compact") {
    return (
      <Card
        className={`p-4 border-l-4 ${borderColor} cursor-pointer hover:shadow-md transition-shadow`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{event.title}</h4>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(event.event_date), "EEE, dd MMM yyyy")}</span>
              {event.start_time && (
                <>
                  <Clock className="h-3.5 w-3.5 ml-1" />
                  <span>{event.start_time?.slice(0, 5)}</span>
                </>
              )}
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {event.rsvp_count !== undefined && (
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {event.rsvp_count}
              </Badge>
            )}
            {event.status && (
              <Badge variant={event.status === "published" ? "default" : "secondary"} className="text-xs capitalize">
                {event.status}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group" onClick={onClick}>
      <div className={`h-32 ${bgColor} relative flex items-center justify-center`}>
        {event.banner_image_url ? (
          <img src={event.banner_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Calendar className="h-12 w-12 text-white/40" />
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="absolute bottom-2 left-3 bg-white dark:bg-slate-800 rounded-lg p-1.5 text-center shadow-md min-w-[48px]">
          <div className="text-[10px] uppercase font-semibold text-primary">
            {format(new Date(event.event_date), "MMM")}
          </div>
          <div className="text-lg font-bold text-foreground leading-tight">
            {format(new Date(event.event_date), "dd")}
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs capitalize">{eventType.replace(/_/g, " ")}</Badge>
          {event.status && event.status !== "published" && (
            <Badge variant="secondary" className="text-xs capitalize">{event.status}</Badge>
          )}
        </div>
        <h3 className="font-semibold text-foreground mt-1 line-clamp-1">{event.title}</h3>
        {event.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
        )}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {event.start_time?.slice(0, 5) || "TBD"}
          </div>
          {event.location && (
            <div className="flex items-center gap-1 truncate max-w-[120px]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          {event.rsvp_count !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.rsvp_count}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
