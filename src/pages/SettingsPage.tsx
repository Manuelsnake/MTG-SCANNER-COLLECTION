import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Database,
  Globe,
  HardDrive,
  Info,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";
import { useI18n } from "../i18n";
import type { DatabaseInfo, ImageCacheStats } from "../types";

interface SettingsPageProps {
  dbInfo: DatabaseInfo | null;
  onRefresh: () => void;
  onVerifyIntegrity: () => Promise<string>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  dbInfo,
  onRefresh,
  onVerifyIntegrity,
}) => {
  const { language, setLanguage, detectedSystemLanguage, t, formatNumber } = useI18n();

  const [integrityResult, setIntegrityResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cacheStats, setCacheStats] = useState<ImageCacheStats | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  const loadCacheStats = async () => {
    try {
      const stats = await api.getCardImageCacheStats();
      setCacheStats(stats);
    } catch {
      // cache stats error
    }
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const handleClearCache = async () => {
    if (!window.confirm(t("settings.purgeConfirm"))) {
      return;
    }
    setIsClearingCache(true);
    setClearMessage(null);
    try {
      const count = await api.clearCardImageCache();
      setClearMessage(`Purged ${count} cached card images.`);
      await loadCacheStats();
    } catch (err) {
      setClearMessage(`Error: ${String(err)}`);
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await onVerifyIntegrity();
      setIntegrityResult(res);
    } catch (err) {
      setIntegrityResult(`Check failed: ${String(err)}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">
          {t("settings.title")}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{t("settings.subtitle")}</p>
      </div>

      {/* Language Preferences Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                {t("settings.languageTitle")}
              </h3>
              <p className="text-xs text-slate-400">{t("settings.languageSubtitle")}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
              {t("settings.detectedSystemLanguage", { lang: detectedSystemLanguage })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Italian Option */}
          <button
            type="button"
            onClick={() => setLanguage("it")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
              language === "it"
                ? "bg-indigo-600/10 border-indigo-500 text-slate-100 shadow-sm"
                : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl" role="img" aria-label="Italiano">
                🇮🇹
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Italiano</p>
                <p className="text-xs text-slate-400">{t("settings.langItalian")}</p>
              </div>
            </div>
            {language === "it" && (
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
          </button>

          {/* English Option */}
          <button
            type="button"
            onClick={() => setLanguage("en")}
            className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
              language === "en"
                ? "bg-indigo-600/10 border-indigo-500 text-slate-100 shadow-sm"
                : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl" role="img" aria-label="English">
                🇬🇧
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">English</p>
                <p className="text-xs text-slate-400">{t("settings.langEnglish")}</p>
              </div>
            </div>
            {language === "en" && (
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
          </button>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>{t("settings.languageNote")}</span>
        </div>
      </div>

      {/* Database Diagnostic Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                {t("settings.databaseTitle")}
              </h3>
              <p className="text-xs text-slate-400">{t("settings.databaseSubtitle")}</p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("settings.refreshStats")}</span>
          </button>
        </div>

        {dbInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">{t("settings.dbPath")}</span>
                <span className="font-mono text-slate-200 break-all">{dbInfo.path}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block mb-1">
                    {t("settings.migrationVersion")}
                  </span>
                  <span className="font-mono font-bold text-indigo-400 text-base">
                    Version {dbInfo.schema_version}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t("settings.upToDate")}
                </span>
              </div>
            </div>

            {/* Table Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("settings.statCards")}
                </span>
                <span className="font-bold text-slate-100 text-sm">
                  {formatNumber(dbInfo.cards_count)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("settings.statPrintings")}
                </span>
                <span className="font-bold text-slate-100 text-sm">
                  {formatNumber(dbInfo.printings_count)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("settings.statItems")}
                </span>
                <span className="font-bold text-slate-100 text-sm">
                  {formatNumber(dbInfo.inventory_count)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("settings.statCopies")}
                </span>
                <span className="font-bold text-emerald-400 text-sm">
                  {formatNumber(dbInfo.total_card_quantity)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("settings.statCollections")}
                </span>
                <span className="font-bold text-cyan-400 text-sm">
                  {formatNumber(dbInfo.collections_count)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("settings.statLocations")}
                </span>
                <span className="font-bold text-purple-400 text-sm">
                  {formatNumber(dbInfo.locations_count)}
                </span>
              </div>
            </div>

            {/* Integrity Check */}
            <div className="pt-2 flex flex-col sm:row items-start sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  {t("settings.integrityTitle")}
                </span>
                <p className="text-[11px] text-slate-400">{t("settings.integrityDesc")}</p>
                {integrityResult && (
                  <p className="text-xs mt-1.5 font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("settings.integrityStatus", { result: integrityResult })}
                  </p>
                )}
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifying ? t("settings.verifying") : t("settings.runIntegrityBtn")}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs">
            {t("settings.connectingDb")}
          </div>
        )}
      </div>

      {/* Local Image Cache Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                {t("settings.cacheTitle")}
              </h3>
              <p className="text-xs text-slate-400">{t("settings.cacheSubtitle")}</p>
            </div>
          </div>

          <button
            onClick={loadCacheStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t("settings.refreshStats")}</span>
          </button>
        </div>

        {cacheStats ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">{t("settings.cachedImages")}</span>
                <span className="font-mono font-bold text-indigo-400 text-base">
                  {formatNumber(cacheStats.total_images)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">{t("settings.diskSpaceUsed")}</span>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  {formatBytes(cacheStats.total_bytes)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">{t("settings.cacheDir")}</span>
                <span className="font-mono text-slate-300 break-all text-[11px]">
                  {cacheStats.cache_dir}
                </span>
              </div>
            </div>

            {clearMessage && (
              <p className="p-2.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs">
                {clearMessage}
              </p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleClearCache}
                disabled={isClearingCache || cacheStats.total_images === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 disabled:opacity-40 text-rose-300 text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isClearingCache ? t("settings.purging") : t("settings.purgeCacheBtn")}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-400 text-xs">
            {t("settings.loadingCacheStats")}
          </div>
        )}
      </div>

      {/* About Application Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-100 text-sm">{t("settings.aboutTitle")}</h3>
        </div>

        <div className="text-xs text-slate-300 space-y-2">
          <p>{t("settings.aboutDesc1")}</p>
          <p className="text-slate-400">{t("settings.aboutDesc2")}</p>
          <p className="text-slate-400 text-[11px]">{t("settings.aboutWotcDisclaimer")}</p>
        </div>
      </div>
    </div>
  );
};
