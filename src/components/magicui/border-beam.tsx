import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
}

/**
 * BorderBeam — a spinning light beam that travels around the border of a container.
 * The parent must have `position: relative` and `overflow: hidden` (or `rounded-[inherit]`).
 */
export function BorderBeam({
  className,
  size = 200,
  duration = 8,
  delay = 0,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  borderWidth = 2,
}: BorderBeamProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 rounded-[inherit] z-0", className)}
      aria-hidden
    >
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          padding: borderWidth,
          background: `linear-gradient(var(--angle, 0deg), ${colorFrom}, ${colorTo}, transparent, transparent)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: `spin-border ${duration}s linear ${delay}s infinite`,
        }}
      />
      <style>{`
        @keyframes spin-border {
          from { --angle: 0deg; }
          to   { --angle: 360deg; }
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
      `}</style>
    </div>
  );
}

export default BorderBeam;
