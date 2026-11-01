import React from "react";
import {
  Boxes,
  Database,
  Layers,
  LayoutDashboard,
  Library,
  Settings,
  Sparkles,
} from "lucide-react";
import type { ActiveTab, DatabaseInfo } from "../types";
import { useI18n } from "../i18n";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  dbInfo: DatabaseInfo | null;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  dbInfo,
  onRefresh,
}) => {
  const { language, setLanguage, t } = useI18n();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: t("nav.dashboard"), icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "inventory", label: t("nav.inventory"), icon: <Layers className="w-4 h-4" /> },
    { id: "collections", label: t("nav.collections"), icon: <Library className="w-4 h-4" /> },
    { id: "locations", label: t("nav.locations"), icon: <Boxes className="w-4 h-4" /> },
    { id: "settings", label: t("nav.settings"), icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 tracking-tight text-base sm:text-lg">
                  {t("common.appName")}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {t("nav.m1Badge")}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {t("common.appSubtitle")}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Visible Language Switcher & Database Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Always-Visible Compact Language Switcher: [ IT ] [ EN ] */}
            <div
              className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 shadow-inner"
              role="group"
              aria-label="Language selector"
            >
              <button
                type="button"
                onClick={() => setLanguage("it")}
                aria-pressed={language === "it"}
                className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  language === "it"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title="Italiano (Italian)"
              >
                IT
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                aria-pressed={language === "en"}
                className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  language === "en"
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
                title="English (US)"
              >
                EN
              </button>
            </div>

            {/* Database Status Indicator */}
            <button
              onClick={onRefresh}
              title={`Database: ${dbInfo ? dbInfo.path : t("common.loading")}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">
                {dbInfo
                  ? t("nav.databaseConnected", { version: dbInfo.schema_version })
                  : t("nav.databaseConnecting")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
