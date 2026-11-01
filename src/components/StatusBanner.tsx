import React from "react";
import { CheckCircle2, Clock, Info } from "lucide-react";

export const StatusBanner: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-100 text-sm sm:text-base">
                Milestone 1 — Desktop Foundations & Relational SQLite
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Active Database
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Data is stored permanently in the operating system application directory via SQLite
              with WAL journaling, foreign keys, versioned migrations, and integer currency units.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Scryfall API: Milestone 2</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Webcam 60 FPS: Milestone 3</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>TWAIN Flatbed: Milestone 4</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Local AI Vision: Milestone 5</span>
          </div>
        </div>
      </div>
    </div>
  );
};
