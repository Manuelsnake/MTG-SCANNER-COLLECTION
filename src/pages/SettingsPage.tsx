import React, { useState } from "react";
import { CheckCircle2, Database, Info, RefreshCw, ShieldCheck } from "lucide-react";
import type { DatabaseInfo } from "../types";

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
  const [integrityResult, setIntegrityResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Application Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          SQLite database configuration, system diagnostics, and application information.
        </p>
      </div>

      {/* Database Diagnostic Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Permanent SQLite Database</h3>
              <p className="text-xs text-slate-400">
                Operating System Local Storage with Write-Ahead Logging (WAL)
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </button>
        </div>

        {dbInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1">Database File Location</span>
                <span className="font-mono text-slate-200 break-all">{dbInfo.path}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block mb-1">Schema Migration Version</span>
                  <span className="font-mono font-bold text-indigo-400 text-base">
                    Version {dbInfo.schema_version}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Up to Date
                </span>
              </div>
            </div>

            {/* Table Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cards</span>
                <span className="font-bold text-slate-100 text-sm">{dbInfo.cards_count}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Printings</span>
                <span className="font-bold text-slate-100 text-sm">{dbInfo.printings_count}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Items</span>
                <span className="font-bold text-slate-100 text-sm">{dbInfo.inventory_count}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Copies</span>
                <span className="font-bold text-emerald-400 text-sm">{dbInfo.total_card_quantity}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Collections</span>
                <span className="font-bold text-cyan-400 text-sm">{dbInfo.collections_count}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Locations</span>
                <span className="font-bold text-purple-400 text-sm">{dbInfo.locations_count}</span>
              </div>
            </div>

            {/* Integrity Check */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Database Integrity Verification
                </span>
                <p className="text-[11px] text-slate-400">
                  Runs SQLite &ldquo;PRAGMA integrity_check&rdquo; to detect index or page corruption.
                </p>
                {integrityResult && (
                  <p className="text-xs mt-1.5 font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Status: {integrityResult}
                  </p>
                )}
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isVerifying ? "Verifying..." : "Run Integrity Check"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs">
            Connecting to SQLite database...
          </div>
        )}
      </div>

      {/* About Application Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-slate-100 text-sm">About MTG Collection Manager</h3>
        </div>

        <div className="text-xs text-slate-300 space-y-2">
          <p>
            <strong>MTG Collection Manager</strong> is a free, open-source desktop software
            released under the Apache License, Version 2.0.
          </p>
          <p className="text-slate-400">
            Current version: <span className="text-slate-200 font-mono">0.1.0 (Milestone 1)</span>.
            Built with <strong>Tauri 2</strong>, <strong>React 19</strong>, <strong>Rust</strong>,
            and <strong>bundled SQLite</strong>.
          </p>
          <p className="text-slate-400 text-[11px]">
            Wizards of the Coast, Magic: The Gathering, and their logos are trademarks of Wizards
            of the Coast LLC. MTG Collection Manager is unofficial Fan Content permitted under the
            Fan Content Policy.
          </p>
        </div>
      </div>
    </div>
  );
};
