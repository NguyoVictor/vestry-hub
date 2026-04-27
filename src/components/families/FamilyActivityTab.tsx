import AnimatedList from './AnimatedList';
import { UserPlus, FileEdit, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FamilyActivityTabProps {
  family: any;
}

export default function FamilyActivityTab({ family }: FamilyActivityTabProps) {
  // In a real implementation, this would fetch from an audit log table
  // For now, we'll create a mock activity log
  const activities = [
    {
      id: '1',
      type: 'created',
      description: 'Family created',
      timestamp: family.created_at,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-950/40'
    },
    ...(family.members || []).map((member: any, idx: number) => ({
      id: `member-${idx}`,
      type: 'member_added',
      description: `${member.first_name} ${member.last_name} added as ${member.role || 'Member'}`,
      timestamp: family.created_at,
      icon: UserPlus,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/40'
    })),
    ...(family.notes ? [{
      id: 'notes',
      type: 'notes_updated',
      description: 'Pastoral notes updated',
      timestamp: family.updated_at,
      icon: FileEdit,
      color: 'text-violet-500',
      bgColor: 'bg-violet-100 dark:bg-violet-950/40'
    }] : [])
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 font-jakarta">
          Activity Timeline
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-jakarta">
          Recent changes and updates to this family
        </p>
      </div>

      <AnimatedList
        items={activities}
        showGradients={true}
        enableArrowNavigation={false}
        renderItem={(activity, index, isSelected) => (
          <div
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              isSelected
                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
            }`}
          >
            {/* Icon */}
            <div className={`h-9 w-9 rounded-lg ${activity.bgColor} flex items-center justify-center shrink-0`}>
              <activity.icon className={`h-4 w-4 ${activity.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-jakarta">
                {activity.description}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-jakarta">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        )}
      />
    </div>
  );
}
