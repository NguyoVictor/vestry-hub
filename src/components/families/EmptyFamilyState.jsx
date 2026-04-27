import { motion } from 'framer-motion';

export default function EmptyFamilyState({ title = 'No families yet', subtitle = 'Link members together as family units', ctaLabel = 'Create Family', onCtaClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-20 gap-5 text-center"
    >
      <div className="h-20 w-20 rounded-3xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="12" r="6" fill="#7c3aed" opacity="0.8"/>
          <circle cx="10" cy="18" r="4.5" fill="#7c3aed" opacity="0.5"/>
          <circle cx="30" cy="18" r="4.5" fill="#7c3aed" opacity="0.5"/>
          <path d="M6 34c0-5.523 3.134-10 7-10h14c3.866 0 7 4.477 7 10" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7"/>
          <path d="M2 34c0-3.866 1.79-7 4-7" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
          <path d="M38 34c0-3.866-1.79-7-4-7" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
        </svg>
      </div>
      <div>
        <p className="text-lg font-bold text-foreground font-jakarta">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs font-jakarta">{subtitle}</p>
      </div>
      {onCtaClick && (
        <button
          onClick={onCtaClick}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors font-jakarta"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          {ctaLabel}
        </button>
      )}
    </motion.div>
  );
}
