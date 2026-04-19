import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  updated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, subtitle, updated, children }: Props) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #f0eeff 0%, #fff3ec 100%)" }} className="border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold text-slate-800">Vestry Hub</span>
            <button
              onClick={() => navigate("/data-compliance")}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
            <p className="text-xs text-slate-400">Last updated: {updated}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {children}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-6 text-center space-y-1">
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Vestry Hub. All rights reserved.</p>
        <p className="text-xs text-slate-400 italic">This document is for informational purposes and does not constitute legal advice.</p>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
