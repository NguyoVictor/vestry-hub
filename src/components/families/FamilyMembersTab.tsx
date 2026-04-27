import { useNavigate } from 'react-router-dom';
import AnimatedList from './AnimatedList';
import EmptyFamilyState from './EmptyFamilyState';

interface FamilyMembersTabProps {
  family: any;
}

export default function FamilyMembersTab({ family }: FamilyMembersTabProps) {
  const navigate = useNavigate();
  const members = family.members || [];

  if (members.length === 0) {
    return (
      <EmptyFamilyState
        title="No members added"
        subtitle="Add family members to build this family unit"
        ctaLabel="Add First Member"
        onCtaClick={() => {
          // In a real implementation, this would open the drawer pre-filled
          console.log('Add member clicked');
        }}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <AnimatedList
        items={members}
        onItemSelect={(member) => {
          if (member.member_id) {
            navigate(`/members/${member.member_id}`);
          }
        }}
        showGradients={true}
        enableArrowNavigation={true}
        renderItem={(member, index, isSelected) => (
          <div
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              isSelected
                ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800'
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
            }`}
          >
            {/* Avatar circle with initials */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {member.first_name?.[0] || 'M'}{member.last_name?.[0] || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-jakarta truncate">
                {member.first_name} {member.last_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-jakarta">
                {member.role || 'Member'} · {member.gender || 'Unknown'}
              </p>
            </div>
            {/* Role badge */}
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                member.role === 'Head'
                  ? 'bg-violet-100 dark:bg-violet-950/40 text-violet-800 dark:text-violet-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {member.role || 'Member'}
            </span>
          </div>
        )}
      />
    </div>
  );
}
