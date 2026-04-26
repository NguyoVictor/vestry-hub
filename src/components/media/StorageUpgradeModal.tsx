import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCircle, Info, Loader2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import { formatBytes } from "./StorageBar";
import type { StoragePlan } from "@/types/media";

interface StorageUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId: string;
  plans: StoragePlan[];
  onRequestUpgrade: (planId: string) => Promise<void>;
}

export function StorageUpgradeModal({
  isOpen,
  onClose,
  currentPlanId,
  plans,
  onRequestUpgrade,
}: StorageUpgradeModalProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRequest = async (planId: string) => {
    setLoadingPlanId(planId);
    try {
      await onRequestUpgrade(planId);
      setSuccess(true);
    } catch {
      // error handled by parent
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    onClose();
  };

  const sortedPlans = [...plans].sort((a, b) => a.sort_order - b.sort_order);
  const currentPlanOrder = plans.find(p => p.id === currentPlanId)?.sort_order ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-2xl p-0 rounded-2xl overflow-hidden font-jakarta">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Upgrade Storage</h2>
            <p className="text-sm text-slate-500 mt-0.5">Choose a plan that fits your church's media needs</p>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 gap-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                >
                  <CheckCircle className="h-16 w-16 text-emerald-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Upgrade Request Sent!</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  We'll be in touch within 24 hours to process your upgrade.
                </p>
                <Button onClick={handleClose} className="mt-2 bg-orange-500 hover:bg-orange-600 text-white">
                  Close
                </Button>
              </motion.div>
            ) : (
              <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Plan cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  {sortedPlans.map((plan, i) => {
                    const isCurrent = plan.id === currentPlanId;
                    const isLower = plan.sort_order < currentPlanOrder;
                    const isPopular = plan.name === "Pro";
                    const features = Array.isArray(plan.features) ? plan.features : [];

                    return (
                      <BlurFadeIn key={plan.id} delay={i * 0.1}>
                        <div
                          className={`relative rounded-xl border p-4 transition-all ${
                            isCurrent
                              ? "border-violet-400 dark:border-violet-600 ring-2 ring-violet-400/30"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isPopular && (
                            <span className="absolute -top-2.5 right-3 inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                              Most Popular
                            </span>
                          )}
                          <div className="mb-3">
                            <p className="font-bold text-base text-slate-900 dark:text-slate-100">{plan.name}</p>
                            <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
                              {formatBytes(plan.storage_limit)}
                            </p>
                            <p className="text-sm text-slate-500 mt-0.5">
                              {plan.price_usd === 0 ? "Free" : `$${plan.price_usd.toFixed(2)} / month`}
                            </p>
                          </div>
                          <ul className="space-y-1.5 mb-4">
                            {features.map((f, fi) => (
                              <li key={fi} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          {isCurrent ? (
                            <Button variant="outline" disabled className="w-full text-xs">
                              Current Plan
                            </Button>
                          ) : isLower ? (
                            <Button variant="outline" disabled className="w-full text-xs opacity-50">
                              Downgrade
                            </Button>
                          ) : (
                            <Button
                              className="w-full text-xs bg-violet-600 hover:bg-violet-700 text-white"
                              onClick={() => handleRequest(plan.id)}
                              disabled={!!loadingPlanId}
                            >
                              {loadingPlanId === plan.id ? (
                                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Requesting...</>
                              ) : (
                                "Request Upgrade"
                              )}
                            </Button>
                          )}
                        </div>
                      </BlurFadeIn>
                    );
                  })}
                </div>

                {/* Info box */}
                <div className="flex items-start gap-3 rounded-xl bg-muted p-4">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    After requesting an upgrade, our team will contact you to process payment.
                    Your storage will be increased within 24 hours of payment confirmation.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
