import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_MEMBERS = 100;

interface MemberStatsProps {
  count: number;
}

export function MemberUsageBanner({ count }: MemberStatsProps) {
  const pct = Math.min(100, (count / MAX_MEMBERS) * 100);

  return (
    <div className="rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4 mb-5 font-jakarta">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 shrink-0">
            <Users className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-orange-700">Member Usage</p>
            <p className="text-xs text-orange-600/80 mt-0.5">
              You have {count} of {MAX_MEMBERS} member slots. Upgrade anytime for unlimited.
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-orange-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-orange-500"
                />
              </div>
              <span className="text-xs font-semibold text-orange-600 shrink-0">{count}/{MAX_MEMBERS}</span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-orange-300 text-orange-600 hover:bg-orange-50 font-jakarta text-xs"
        >
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}
