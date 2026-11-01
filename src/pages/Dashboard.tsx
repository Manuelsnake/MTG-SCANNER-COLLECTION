import React from "react";
import {
  Bot,
  Boxes,
  Camera,
  CheckCircle2,
  Cpu,
  Database,
  Image as ImageIcon,
  Layers,
  Library,
  Plus,
  Printer,
  Search,
  Sparkles,
} from "lucide-react";
import { useI18n } from "../i18n";
import type { ActiveTab, DatabaseInfo, InventoryItemDetail } from "../types";

interface DashboardProps {
  dbInfo: DatabaseInfo | null;
  inventory: InventoryItemDetail[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddCard: () => void;
  onOpenScryfallSearch: () => void;
  onOpenCreateCollection: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  dbInfo,
  inventory,
  setActiveTab,
  onOpenAddCard,
  onOpenScryfallSearch,
  onOpenCreateCollection,
}) => {
  const { t, formatNumber } = useI18n();
  const recentItems = inventory.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t("dashboard.totalCards")}
            </span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {dbInfo ? formatNumber(dbInfo.total_card_quantity) : "0"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{t("dashboard.totalCardsDesc")}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t("dashboard.uniquePrintings")}
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {dbInfo ? formatNumber(dbInfo.printings_count) : "0"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{t("dashboard.uniquePrintingsDesc")}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t("dashboard.canonicalCards")}
            </span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {dbInfo ? formatNumber(dbInfo.cards_count) : "0"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{t("dashboard.canonicalCardsDesc")}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t("dashboard.collections")}
            </span>
            <Library className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {dbInfo ? formatNumber(dbInfo.collections_count) : "0"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{t("dashboard.collectionsDesc")}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">
              {t("dashboard.storage")}
            </span>
            <Boxes className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {dbInfo ? formatNumber(dbInfo.locations_count) : "0"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{t("dashboard.storageDesc")}</p>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onOpenScryfallSearch}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20"
        >
          <Search className="w-4 h-4" />
          <span>{t("dashboard.searchScryfall")}</span>
        </button>

        <button
          onClick={onOpenAddCard}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-medium text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t("dashboard.manualEntry")}</span>
        </button>

        <button
          onClick={onOpenCreateCollection}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-medium text-sm transition-all"
        >
          <Library className="w-4 h-4 text-cyan-400" />
          <span>{t("dashboard.newCollection")}</span>
        </button>

        <button
          onClick={() => setActiveTab("locations")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-medium text-sm transition-all"
        >
          <Boxes className="w-4 h-4 text-purple-400" />
          <span>{t("dashboard.newLocation")}</span>
        </button>
      </div>

      {/* Recent Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-100">{t("dashboard.recentCards")}</h3>
            <p className="text-xs text-slate-400">{t("dashboard.recentCardsDesc")}</p>
          </div>
          <button
            onClick={() => setActiveTab("inventory")}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {t("dashboard.viewFullInventory")} ({inventory.length}) →
          </button>
        </div>

        {recentItems.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-800 rounded-lg">
            <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">{t("dashboard.noCardsYet")}</p>
            <p className="text-xs text-slate-400 mt-1">{t("dashboard.noCardsYetDesc")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5 rounded-l-lg">{t("inventory.tableCard")}</th>
                  <th className="px-4 py-2.5">{t("inventory.tableSetNumber")}</th>
                  <th className="px-4 py-2.5">{t("inventory.tableFinish")}</th>
                  <th className="px-4 py-2.5">{t("inventory.tableCondition")}</th>
                  <th className="px-4 py-2.5">{t("inventory.tableQuantity")}</th>
                  <th className="px-4 py-2.5 rounded-r-lg">{t("inventory.tableStorage")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-10 bg-slate-800 rounded overflow-hidden shrink-0 border border-slate-700/60 flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.card_name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">{item.card_name}</p>
                          {item.mana_cost && (
                            <span className="text-[10px] font-mono text-indigo-400">
                              {item.mana_cost}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      <span className="font-mono text-indigo-400 uppercase font-medium">
                        {item.set_code}
                      </span>{" "}
                      #{item.collector_number}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`capitalize px-2 py-0.5 rounded text-[10px] font-medium ${
                          item.finish === "foil"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                            : item.finish === "etched"
                            ? "bg-purple-500/10 text-purple-300 border border-purple-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {item.finish === "foil"
                          ? t("common.foil")
                          : item.finish === "etched"
                          ? t("common.etched")
                          : t("common.nonfoil")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                        {item.condition}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-200">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {item.location_name || (
                        <span className="italic text-slate-400">{t("common.unassigned")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Planned Capabilities Roadmap Preview */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5">
        <h3 className="font-semibold text-slate-100 text-sm mb-1">
          {t("dashboard.upcomingMilestones")}
        </h3>
        <p className="text-xs text-slate-400 mb-4">{t("dashboard.architectureDesc")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-semibold">Milestone 2</span>
            </div>
            <p className="text-xs font-medium text-slate-200">{t("statusBanner.scryfallDone")}</p>
            <p className="text-[11px] text-slate-400 mt-1">{t("statusBanner.description")}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Camera className="w-4 h-4" />
              <span className="text-xs font-semibold">Milestone 3</span>
            </div>
            <p className="text-xs font-medium text-slate-200">{t("dashboard.milestone3Title")}</p>
            <p className="text-[11px] text-slate-400 mt-1">{t("dashboard.milestone3Desc")}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Printer className="w-4 h-4" />
              <span className="text-xs font-semibold">Milestone 4</span>
            </div>
            <p className="text-xs font-medium text-slate-200">{t("dashboard.milestone4Title")}</p>
            <p className="text-[11px] text-slate-400 mt-1">{t("dashboard.milestone4Desc")}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Cpu className="w-4 h-4" />
              <span className="text-xs font-semibold">Milestone 5</span>
            </div>
            <p className="text-xs font-medium text-slate-200">{t("dashboard.milestone5Title")}</p>
            <p className="text-[11px] text-slate-400 mt-1">{t("dashboard.milestone5Desc")}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <Bot className="w-4 h-4" />
              <span className="text-xs font-semibold">Milestone 8</span>
            </div>
            <p className="text-xs font-medium text-slate-200">{t("dashboard.milestone8Title")}</p>
            <p className="text-[11px] text-slate-400 mt-1">{t("dashboard.milestone8Desc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
