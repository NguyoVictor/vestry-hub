import { motion } from "framer-motion";
import { MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { avatarGradient, initials, StatusPill } from "./MemberCard";

interface MemberRowProps {
  member: {
    id: string; first_name: string; last_name: string; email: string;
    phone: string | null; status: string; join_date: string;
    avatar_url: string | null; gender: string | null;
    member_type: string | null; city: string | null;
    membership_number: string | null;
    department: string | null;
  };
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export function MemberRow({ member, index, selected, onSelect, onClick, onDelete }: MemberRowProps) {
  const name = `${member.first_name} ${member.last_name}`;
  const grad = avatarGradient(name);
  const ini = initials(member.first_name, member.last_name);
  const displayStatus = member.member_type || member.status || "member";

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={cn("border-b border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer font-jakarta", selected && "bg-orange-50/40")}
    >
      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3 w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(member.id)}
          onClick={e => e.stopPropagation()}
          className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
        />
      </td>

      {/* Member */}
      <td className="px-3 py-3" onClick={onClick}>
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-white font-bold text-sm shrink-0", grad)}>
            {ini}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
            <p className="text-xs text-slate-400 truncate">{member.gender ?? "Not Specified"}</p>
          </div>
        </div>
      </td>

      {/* Member # */}
      <td className="px-3 py-3 text-xs text-slate-500" onClick={onClick}>
        {member.membership_number ?? "—"}
      </td>

      {/* Contact */}
      <td className="px-3 py-3" onClick={onClick}>
        <div className="text-xs text-slate-600 space-y-0.5">
          {member.phone && <p>{member.phone}</p>}
          {member.email && <p className="text-slate-400 truncate max-w-[160px]">{member.email}</p>}
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3" onClick={onClick}>
        <StatusPill status={displayStatus} />
      </td>

      {/* Branch */}
      <td className="px-3 py-3 text-xs text-slate-500" onClick={onClick}>—</td>

      {/* Department */}
      <td className="px-3 py-3 text-xs text-slate-500" onClick={onClick}>
        {member.department ?? "—"}
      </td>

      {/* City */}
      <td className="px-3 py-3 text-xs text-slate-500" onClick={onClick}>
        {member.city ?? "—"}
      </td>

      {/* Joined */}
      <td className="px-3 py-3 text-xs text-slate-500" onClick={onClick}>
        {member.join_date ? format(new Date(member.join_date), "dd MMM yyyy") : "—"}
      </td>

      {/* Actions */}
      <td className="px-3 py-3 w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="font-jakarta text-sm">
            <DropdownMenuItem onClick={onClick}>
              <Eye className="h-4 w-4 mr-2" />View Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={e => { e.stopPropagation(); onDelete(member.id); }}>
              <Trash2 className="h-4 w-4 mr-2" />Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}
