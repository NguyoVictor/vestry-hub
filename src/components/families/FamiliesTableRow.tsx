import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MemberAvatar } from '@/components/shared/MemberAvatar';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface FamiliesTableRowProps {
  family: any;
  index: number;
  onEdit: (family: any) => void;
  onDelete: (id: string) => void;
}

export default function FamiliesTableRow({ family, index, onEdit, onDelete }: FamiliesTableRowProps) {
  const navigate = useNavigate();

  const getStatusBadge = () => {
    const hasHead = !!family.head;
    const hasMembers = (family.memberCount || 0) > 0;

    if (hasHead && hasMembers) {
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Active</span>;
    } else if (hasHead && !hasMembers) {
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Incomplete</span>;
    } else {
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Empty</span>;
    }
  };

  const renderMemberAvatars = () => {
    const count = family.memberCount || 0;
    if (count === 0) {
      return <span className="text-sm text-slate-400 dark:text-slate-500 font-jakarta">No members</span>;
    }

    // For now, show count with avatar stack placeholder
    // In a real implementation, you'd fetch actual member data
    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs font-semibold"
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
        {count > 4 && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">+{count - 4}</span>
        )}
      </div>
    );
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      whileHover={{ backgroundColor: 'rgba(139, 92, 246, 0.03)' }}
      onClick={() => navigate(`/families/${family.id}`)}
      className="border-b border-slate-100 dark:border-slate-800 cursor-pointer"
    >
      <td className="px-4 py-3.5">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
          {family.name}
        </span>
      </td>
      <td className="px-4 py-3.5">
        {family.head ? (
          <div className="flex items-center gap-2">
            <MemberAvatar
              name={`${family.head.first_name} ${family.head.last_name}`}
              avatarUrl={family.head.avatar_url}
              size="sm"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300 font-jakarta">
              {family.head.first_name} {family.head.last_name}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-400 dark:text-slate-500 font-jakarta">—</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        {renderMemberAvatars()}
      </td>
      <td className="px-4 py-3.5">
        {getStatusBadge()}
      </td>
      <td className="px-4 py-3.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/families/${family.id}`); }}>
              View family
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(family); }}>
              <Pencil className="h-4 w-4 mr-2" />Edit family
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => { e.stopPropagation(); if (confirm('Delete this family?')) onDelete(family.id); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />Delete family
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}
