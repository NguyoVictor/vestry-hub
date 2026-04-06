import { cn } from "@/lib/utils";

interface Stage {
  label: string;
  description: string;
}

interface StageProgressBarProps {
  currentStage: number; // 1–4
  stages: Stage[];
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { circle: "w-6 h-6", text: "text-[10px]", line: "h-0.5" },
  md: { circle: "w-8 h-8", text: "text-xs", line: "h-0.5" },
  lg: { circle: "w-10 h-10", text: "text-xs", line: "h-1" },
};

export function StageProgressBar({ currentStage, stages, size = "md" }: StageProgressBarProps) {
  const s = SIZE_MAP[size];

  return (
    <div className="flex items-start w-full">
      {stages.map((stage, i) => {
        const stageNum = i + 1;
        const isCompleted = stageNum < currentStage;
        const isCurrent = stageNum === currentStage;
        const isFuture = stageNum > currentStage;

        return (
          <div key={i} className="flex items-start flex-1">
            {/* Circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  s.circle,
                  "rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all",
                  isCompleted && "bg-indigo-600 text-white",
                  isCurrent && "bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-2 animate-pulse",
                  isFuture && "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
                )}
              >
                {stageNum}
              </div>
              {size !== "sm" && (
                <span className={cn(s.text, "mt-1 font-medium text-center leading-tight max-w-[60px]",
                  isFuture ? "text-slate-400" : "text-slate-700 dark:text-slate-300"
                )}>
                  {stage.label}
                </span>
              )}
            </div>

            {/* Connecting line (not after last) */}
            {i < stages.length - 1 && (
              <div className={cn(
                "flex-1 mt-3 mx-1",
                s.line,
                isCompleted ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
