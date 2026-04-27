import { motion } from 'framer-motion';
import CountUp from './CountUp';
import { Users, UserCheck, TrendingUp } from 'lucide-react';

interface FamiliesStatBarProps {
  families: any[];
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function FamiliesStatBar({ families }: FamiliesStatBarProps) {
  const totalFamilies = families.length;
  const totalMembers = families.reduce((sum, f) => sum + (f.memberCount || 0), 0);
  const avgPerFamily = totalFamilies > 0 ? (totalMembers / totalFamilies).toFixed(1) : '0.0';
  const familiesNeedingMembers = families.filter(f => (f.memberCount || 0) === 0).length;

  const stats = [
    {
      icon: Users,
      label: 'Total Families',
      value: totalFamilies,
      subLabel: '+1 this month',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-950/40'
    },
    {
      icon: UserCheck,
      label: 'Total Members',
      value: totalMembers,
      subLabel: 'across all families',
      color: 'text-violet-500',
      bgColor: 'bg-violet-100 dark:bg-violet-950/40'
    },
    {
      icon: TrendingUp,
      label: 'Avg per Family',
      value: avgPerFamily,
      subLabel: `${familiesNeedingMembers} families need members`,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/40',
      isDecimal: true
    }
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
    >
      {stats.map((stat, idx) => (
        <motion.div
          key={idx}
          variants={item}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 font-jakarta">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-jakarta">
                  {stat.isDecimal ? (
                    <CountUp to={parseFloat(stat.value as string)} from={0} duration={1.2} separator="," />
                  ) : (
                    <CountUp to={stat.value as number} from={0} duration={1.2} separator="," />
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-jakarta">
                {stat.subLabel}
              </p>
            </div>
            <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center shrink-0`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
