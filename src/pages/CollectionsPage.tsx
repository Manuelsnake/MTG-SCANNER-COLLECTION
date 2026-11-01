import React, { useState } from "react";
import {
  Edit2,
  FolderOpen,
  Library,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { useI18n } from "../i18n";
import type { CollectionSummary, InventoryItemDetail } from "../types";

interface CollectionsPageProps {
  collections: CollectionSummary[];
  inventory: InventoryItemDetail[];
  onCreateCollection: (name: string, description?: string) => Promise<void>;
  onRenameCollection: (id: string, name: string, description?: string) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onRemoveFromCollection: (collectionId: string, inventoryItemId: string) => Promise<void>;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const CollectionsPage: React.FC<CollectionsPageProps> = ({
  collections,
  inventory,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onRemoveFromCollection,
  isCreateModalOpen,
  setIsCreateModalOpen,
}) => {
  const { t, formatNumber } = useI18n();
  const [selectedCollection, setSelectedCollection] = useState<CollectionSummary | null>(null);
  const [renamingCollection, setRenamingCollection] = useState<CollectionSummary | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [formError, setFormError] = useState("");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError(t("collectionsPage.nameRequired"));
      return;
    }

    try {
      await onCreateCollection(name.trim(), description.trim() || undefined);
      setName("");
      setDescription("");
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      setFormError(String(err));
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingCollection) return;
    setFormError("");

    if (!renameName.trim()) {
      setFormError(t("collectionsPage.nameRequired"));
      return;
    }

    try {
      await onRenameCollection(
        renamingCollection.id,
        renameName.trim(),
        renameDescription.trim() || undefined
      );
      setRenamingCollection(null);
    } catch (err: unknown) {
      setFormError(String(err));
    }
  };

  // Get items assigned to the selected collection
  const collectionCards = selectedCollection
    ? inventory.filter((item) => item.collection_ids.includes(selectedCollection.id))
    : [];

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            {t("collectionsPage.title")}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{t("collectionsPage.subtitle")}</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>{t("collectionsPage.newCollection")}</span>
        </button>
      </div>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Library className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">
            {t("collectionsPage.noCollectionsTitle")}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {t("collectionsPage.noCollectionsDesc")}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
          >
            {t("collectionsPage.createBtn")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => {
            const isSelected = selectedCollection?.id === col.id;
            return (
              <div
                key={col.id}
                className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-all ${
                  isSelected
                    ? "border-indigo-500 shadow-lg shadow-indigo-500/10"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Tag className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-slate-100 text-base">{col.name}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRenamingCollection(col);
                          setRenameName(col.name);
                          setRenameDescription(col.description || "");
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                        title={t("common.rename")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (
                            confirm(
                              t("collectionsPage.deleteCollectionConfirm", { name: col.name })
                            )
                          ) {
                            if (selectedCollection?.id === col.id) {
                              setSelectedCollection(null);
                            }
                            onDeleteCollection(col.id);
                          }
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 min-h-8">
                    {col.description || (
                      <span className="italic">{t("common.none")}</span>
                    )}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-medium text-slate-300">
                      <strong className="text-indigo-400 font-bold">
                        {formatNumber(col.total_items)}
                      </strong>{" "}
                      {t("collectionsPage.itemsCount")}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="font-medium text-slate-300">
                      <strong className="text-emerald-400 font-bold">
                        {formatNumber(col.total_quantity)}
                      </strong>{" "}
                      {t("dashboard.totalCards").toLowerCase()}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      setSelectedCollection(isSelected ? null : col)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{isSelected ? t("common.close") : t("collectionsPage.cardsInCollection")}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Collection Card Explorer Drawer */}
      {selectedCollection && (
        <div className="bg-slate-900 border border-indigo-500/50 rounded-xl p-5 shadow-xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
                  {t("collectionsPage.title")}
                </span>
                <span className="text-slate-600">•</span>
                <h3 className="font-bold text-slate-100 text-base">{selectedCollection.name}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedCollection.description || t("common.none")}
              </p>
            </div>

            <button
              onClick={() => setSelectedCollection(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {collectionCards.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {t("collectionsPage.noCardsInCollection")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5 rounded-l-lg">{t("inventory.tableCard")}</th>
                    <th className="px-4 py-2.5">{t("inventory.tableSetNumber")}</th>
                    <th className="px-4 py-2.5">{t("inventory.tableCondition")}</th>
                    <th className="px-4 py-2.5">{t("inventory.tableFinish")}</th>
                    <th className="px-4 py-2.5">{t("inventory.tableQuantity")}</th>
                    <th className="px-4 py-2.5 rounded-r-lg text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {collectionCards.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-medium text-slate-200">{item.card_name}</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">
                        {item.set_code} #{item.collector_number}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{item.condition}</td>
                      <td className="px-4 py-2.5 text-slate-300 capitalize">{item.finish}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-100">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => onRemoveFromCollection(selectedCollection.id, item.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                        >
                          {t("inventory.removeBtn")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Collection Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t("collectionsPage.createTitle")}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              {t("collectionsPage.nameLabel")} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t("collectionsPage.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              {t("collectionsPage.descLabel")}
            </label>
            <textarea
              rows={3}
              placeholder={t("collectionsPage.descPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-md shadow-indigo-600/30"
            >
              {t("collectionsPage.createBtn")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Rename Collection Modal */}
      {renamingCollection && (
        <Modal
          isOpen={true}
          onClose={() => setRenamingCollection(null)}
          title={t("collectionsPage.renameTitle", { name: renamingCollection.name })}
        >
          <form onSubmit={handleRenameSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                {t("collectionsPage.nameLabel")} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                {t("collectionsPage.descLabel")}
              </label>
              <textarea
                rows={3}
                value={renameDescription}
                onChange={(e) => setRenameDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRenamingCollection(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-md shadow-indigo-600/30"
              >
                {t("common.save")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
