import { useState, useRef, useEffect } from "react";
import { ChevronDown, Upload, ClipboardCheck, Monitor, Video, FileText, Layers } from "lucide-react";

interface AddResourceDropdownProps {
  onAssessment: () => void;
}

const RESOURCE_TYPES = [
  { label: "Assessment",   icon: ClipboardCheck, color: "bg-emerald-500", action: "assessment" },
  { label: "Presentation", icon: Monitor,         color: "bg-orange-500",  action: "coming" },
  { label: "Video",        icon: Video,           color: "bg-red-500",     action: "coming" },
  { label: "Passage",      icon: FileText,        color: "bg-blue-500",    action: "coming" },
  { label: "Flashcard",    icon: Layers,          color: "bg-purple-500",  action: "coming" },
];

export default function AddResourceDropdown({ onAssessment }: AddResourceDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
      >
        + Add resource <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Upload section */}
          <button
            className="w-full flex items-start gap-3 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
            onClick={() => { setOpen(false); console.log("tile: upload"); }}
          >
            <div className="h-9 w-9 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0 mt-0.5">
              <Upload className="h-4 w-4 text-pink-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Upload your own resource</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">Bring and enhance your worksheets, presentations and more</p>
            </div>
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-700 mx-4" />

          {/* Resource types */}
          <div className="py-2">
            {RESOURCE_TYPES.map(({ label, icon: Icon, color, action }) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false);
                  if (action === "assessment") onAssessment();
                  else console.log(`coming soon: ${label}`);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <div className={`${color} h-8 w-8 rounded-lg flex items-center justify-center shrink-0`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
