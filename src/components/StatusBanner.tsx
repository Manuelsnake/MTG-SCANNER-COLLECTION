import React from "react";
import { CheckCircle2, Clock, Globe } from "lucide-react";
import { useI18n } from "../i18n";

export const StatusBanner: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-100 text-sm sm:text-base">
                {t("statusBanner.title")}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                {t("statusBanner.connectedBadge")}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t("statusBanner.description")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>{t("statusBanner.scryfallDone")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{t("statusBanner.webcamPlanned")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{t("statusBanner.flatbedPlanned")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{t("statusBanner.aiPlanned")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{t("statusBanner.assistantPlanned")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
