import React, { useState } from "react";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { useI18n } from "../i18n";
import type { CreateLocationInput, Location } from "../types";

interface LocationsPageProps {
  locations: Location[];
  onCreateLocation: (input: CreateLocationInput) => Promise<void>;
  onDeleteLocation: (id: string) => Promise<void>;
}

export const LocationsPage: React.FC<LocationsPageProps> = ({
  locations,
  onCreateLocation,
  onDeleteLocation,
}) => {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [locationType, setLocationType] = useState("Binder");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError(t("locationsPage.nameRequired"));
      return;
    }

    try {
      await onCreateLocation({
        name: name.trim(),
        location_type: locationType,
        parent_id: parentId || null,
        description: description.trim() || null,
      });

      setName("");
      setLocationType("Binder");
      setParentId("");
      setDescription("");
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(String(err));
    }
  };

  const getLocationTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case "binder":
        return t("locationsPage.typeBinder");
      case "box":
      case "box / container":
        return t("locationsPage.typeBox");
      case "drawer":
      case "slot":
      case "slot / pocket":
        return t("locationsPage.typeDrawer");
      case "shelf":
      case "page":
      case "binder page":
        return t("locationsPage.typeShelf");
      case "deckbox":
        return t("locationsPage.typeDeckbox");
      default:
        return type || t("locationsPage.typeOther");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            {t("locationsPage.title")}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{t("locationsPage.subtitle")}</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>{t("locationsPage.newLocation")}</span>
        </button>
      </div>

      {/* Locations List */}
      {locations.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Boxes className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">
            {t("locationsPage.noLocationsTitle")}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {t("locationsPage.noLocationsDesc")}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
          >
            {t("locationsPage.newLocation")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => {
            const parent = locations.find((l) => l.id === loc.parent_id);
            return (
              <div
                key={loc.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {getLocationTypeLabel(loc.location_type)}
                      </span>
                      <h3 className="font-semibold text-slate-100 text-sm">{loc.name}</h3>
                    </div>

                    <button
                      onClick={() => {
                        if (
                          confirm(
                            t("locationsPage.deleteLocationConfirm", { name: loc.name })
                          )
                        ) {
                          onDeleteLocation(loc.id);
                        }
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {parent && (
                    <p className="text-[11px] text-slate-400 mb-1">
                      Inside: <span className="text-slate-300 font-medium">{parent.name}</span>
                    </p>
                  )}

                  <p className="text-xs text-slate-400">
                    {loc.description || (
                      <span className="italic">{t("common.none")}</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Location Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("locationsPage.createTitle")}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              {t("locationsPage.nameLabel")} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t("locationsPage.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                {t("locationsPage.typeLabel")}
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="Binder">{t("locationsPage.typeBinder")}</option>
                <option value="Box">{t("locationsPage.typeBox")}</option>
                <option value="Drawer">{t("locationsPage.typeDrawer")}</option>
                <option value="Shelf">{t("locationsPage.typeShelf")}</option>
                <option value="Deckbox">{t("locationsPage.typeDeckbox")}</option>
                <option value="Other">{t("locationsPage.typeOther")}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Parent Location</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="">{t("common.none")}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({getLocationTypeLabel(loc.location_type)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              {t("locationsPage.descriptionLabel")}
            </label>
            <textarea
              rows={2}
              placeholder={t("locationsPage.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-md shadow-indigo-600/30"
            >
              {t("locationsPage.createBtn")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
