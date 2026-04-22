import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const AVATAR_GRADIENTS = [
  "from-orange-400 to-pink-500", "from-violet-500 to-purple-600",
  "from-blue-400 to-cyan-500", "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500", "from-rose-400 to-red-500",
  "from-indigo-400 to-blue-500", "from-green-400 to-emerald-500",
];

export function avatarGradient(name: string) {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export function initials(first: string, last: string) {
  return `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}`;
}

const STATUS_COLORS: Record<string, string> = {
  member: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  visitor: "bg-slate-100 text-slate-600",
  "pending approval": "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  "new convert": "bg-blue-100 text-blue-700",
  worker: "bg-purple-100 text-purple-700",
  "senior pastor": "bg-orange-100 text-orange-700",
  pastor: "bg-orange-100 text-orange-700",
  inactive: "bg-red-100 text-red-600",
};

export function StatusPill({ status }: { status: string }) {
  const key = (status ?? "").toLowerCase();
  const cls = STATUS_COLORS[key] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize font-jakarta", cls)}>
      {status}
    </span>
  );
}

interface MemberCardProps {
  member: {
    id: string; first_name: string; last_name: string; email: string;
    phone: string | null; status: string; join_date: string;
    avatar_url: string | null; gender: string | null;
    member_type: string | null; city: string | null;
    membership_number: string | null;
  };
  index: number;
  onClick: () => void;
}

export function MemberCard({ member, index, onClick }: MemberCardProps) {
  const name = `${member.first_name} ${member.last_name}`;
  const grad = avatarGradient(name);
  const ini = initials(member.first_name, member.last_name);
  const displayStatus = member.member_type || member.status || "member";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 cursor-pointer transition-shadow font-jakarta"
    >
      {/* Avatar + name */}
      <div className="flex flex-col items-center text-center mb-4">
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-white font-bold text-lg mb-3 shadow-sm", grad)}>
          {ini}
        </div>
        <p className="font-semibold text-slate-800 text-sm leading-tight">{name.toUpperCase()}</p>
        {member.membership_number && (
          <p className="text-xs text-slate-400 mt-0.5">#{member.membership_number}</p>
        )}
        <div className="mt-2">
          <StatusPill status={displayStatus} />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-slate-500">
        {member.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-orange-400 shrink-0" />
            <span className="truncate">{member.phone}</span>
          </div>
        )}
        {member.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-orange-400 shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
        )}
        {member.city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-orange-400 shrink-0" />
            <span className="truncate">{member.city}</span>
          </div>
        )}
        {member.join_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-orange-400 shrink-0" />
            <span>{format(new Date(member.join_date), "dd MMM yyyy")}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
