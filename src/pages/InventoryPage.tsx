import React, { useState } from "react";
import {
  FolderPlus,
  Layers,
  Minus,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { Modal } from "../components/Modal";
import type {
  AddManualCardInput,
  CollectionSummary,
  InventoryItemDetail,
  Location,
} from "../types";

interface InventoryPageProps {
  inventory: InventoryItemDetail[];
  collections: CollectionSummary[];
  locations: Location[];
  onAddCard: (input: AddManualCardInput) => Promise<void>;
  onUpdateQuantity: (id: string, delta: number) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onAssignToCollection: (collectionId: string, inventoryItemId: string) => Promise<void>;
  onRemoveFromCollection: (collectionId: string, inventoryItemId: string) => Promise<void>;
  isAddCardModalOpen: boolean;
  setIsAddCardModalOpen: (open: boolean) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  inventory,
  collections,
  locations,
  onAddCard,
  onUpdateQuantity,
  onDeleteItem,
  onAssignToCollection,
  onRemoveFromCollection,
  isAddCardModalOpen,
  setIsAddCardModalOpen,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [assigningItem, setAssigningItem] = useState<InventoryItemDetail | null>(null);

  // Form state for adding card
  const [cardName, setCardName] = useState("");
  const [setCode, setSetCode] = useState("");
  const [setName, setSetName] = useState("");
  const [collectorNumber, setCollectorNumber] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [language, setLanguage] = useState("en");
  const [finish, setFinish] = useState("nonfoil");
  const [condition, setCondition] = useState("NM");
  const [priceInput, setPriceInput] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!cardName.trim()) {
      setFormError("Card name is required");
      return;
    }
    if (!setCode.trim()) {
      setFormError("Set code is required");
      return;
    }
    if (!collectorNumber.trim()) {
      setFormError("Collector number is required");
      return;
    }
    if (quantity <= 0) {
      setFormError("Quantity must be at least 1");
      return;
    }

    // Convert decimal price string (e.g. "12.50") to integer cents (1250)
    let purchasePrice: number | null = null;
    if (priceInput.trim()) {
      const parsed = parseFloat(priceInput.replace(",", "."));
      if (!isNaN(parsed) && parsed >= 0) {
        purchasePrice = Math.round(parsed * 100);
      }
    }

    try {
      await onAddCard({
        card_name: cardName.trim(),
        set_code: setCode.trim().toUpperCase(),
        set_name: setName.trim() || setCode.trim().toUpperCase(),
        collector_number: collectorNumber.trim(),
        quantity,
        language,
        finish,
        condition,
        purchase_price: purchasePrice,
        currency: "EUR",
        location_id: locationId || null,
        notes: notes.trim() || null,
      });

      // Reset form
      setCardName("");
      setSetCode("");
      setSetName("");
      setCollectorNumber("");
      setQuantity(1);
      setLanguage("en");
      setFinish("nonfoil");
      setCondition("NM");
      setPriceInput("");
      setLocationId("");
      setNotes("");
      setIsAddCardModalOpen(false);
    } catch (err: unknown) {
      setFormError(String(err));
    }
  };

  // Filter inventory items
  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      search.trim() === "" ||
      item.card_name.toLowerCase().includes(search.toLowerCase()) ||
      item.set_code.toLowerCase().includes(search.toLowerCase()) ||
      item.collector_number.toLowerCase().includes(search.toLowerCase());

    const matchesCollection =
      selectedCollectionId === "all" ||
      item.collection_ids.includes(selectedCollectionId);

    return matchesSearch && matchesCollection;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by card name, set code, collector #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedCollectionId}
            onChange={(e) => setSelectedCollectionId(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="all">All Collections ({inventory.length})</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name} ({col.total_quantity})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsAddCardModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Card Manually</span>
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-medium">No inventory items found</p>
            <p className="text-xs text-slate-400 mt-1">
              {inventory.length === 0
                ? "Your collection is empty. Add a card to get started."
                : "No cards match the active search or collection filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="px-4 py-3">Card Name</th>
                  <th className="px-4 py-3">Set / #</th>
                  <th className="px-4 py-3">Finish</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Lang</th>
                  <th className="px-4 py-3">Storage</th>
                  <th className="px-4 py-3">Collections</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-center">Quantity</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-100">
                      {item.card_name}
                      {item.notes && (
                        <p className="text-[11px] font-normal text-slate-400 truncate max-w-xs">
                          {item.notes}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      <span className="font-mono text-indigo-400 font-bold uppercase">
                        {item.set_code}
                      </span>{" "}
                      <span className="text-slate-400">#{item.collector_number}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`capitalize px-2 py-0.5 rounded text-[10px] font-medium ${
                          item.finish === "foil"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold"
                            : item.finish === "etched"
                            ? "bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {item.finish}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.condition === "NM"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : item.condition === "LP"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : item.condition === "MP"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {item.condition}
                      </span>
                    </td>

                    <td className="px-4 py-3 uppercase text-slate-400 font-mono">
                      {item.language}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {item.location_name || (
                        <span className="italic text-slate-400">Unassigned</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.collection_ids.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">None</span>
                        ) : (
                          item.collection_ids.map((cid) => {
                            const col = collections.find((c) => c.id === cid);
                            return (
                              <span
                                key={cid}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-cyan-300"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {col ? col.name : "Collection"}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-300">
                      {item.purchase_price !== null
                        ? `€${(item.purchase_price / 100).toFixed(2)}`
                        : "—"}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          disabled={item.quantity <= 0}
                          className="p-0.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 transition-colors"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-slate-100 min-w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="p-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setAssigningItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          title="Assign to Virtual Collections"
                        >
                          <FolderPlus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete card from inventory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Card Manually Modal */}
      <Modal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        title="Add Card Manually to Inventory"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Card Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Black Lotus, Lightning Bolt, Sol Ring"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Set Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. LEA, MH3"
                value={setCode}
                onChange={(e) => setSetCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono uppercase focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Collector # <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 232, 1"
                value={collectorNumber}
                onChange={(e) => setCollectorNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-slate-300">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Set Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Limited Edition Alpha, Modern Horizons 3"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="NM">Near Mint (NM)</option>
                <option value="LP">Lightly Played (LP)</option>
                <option value="MP">Moderately Played (MP)</option>
                <option value="HP">Heavily Played (HP)</option>
                <option value="DMG">Damaged (DMG)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Finish</label>
              <select
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="nonfoil">Non-Foil</option>
                <option value="foil">Foil</option>
                <option value="etched">Etched Foil</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="en">English (EN)</option>
                <option value="it">Italian (IT)</option>
                <option value="ja">Japanese (JA)</option>
                <option value="de">German (DE)</option>
                <option value="fr">French (FR)</option>
                <option value="es">Spanish (ES)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Purchase Price (€ EUR)
              </label>
              <input
                type="text"
                placeholder="e.g. 15.00"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Storage Location</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="">None (Unassigned)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.location_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Signed by artist, serial number, grade"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddCardModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-md shadow-indigo-600/30"
            >
              Add Card to Database
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign to Virtual Collections Modal */}
      {assigningItem && (
        <Modal
          isOpen={true}
          onClose={() => setAssigningItem(null)}
          title={`Assign "${assigningItem.card_name}" to Collections`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              A physical card item can belong to multiple virtual collections without duplicating its
              quantity in storage.
            </p>

            {collections.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                No virtual collections exist yet. Create a collection first in the Collections tab.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {collections.map((col) => {
                  const isAssigned = assigningItem.collection_ids.includes(col.id);
                  return (
                    <div
                      key={col.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800"
                    >
                      <div>
                        <span className="text-sm font-medium text-slate-200">{col.name}</span>
                        {col.description && (
                          <p className="text-[11px] text-slate-400">{col.description}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (isAssigned) {
                            await onRemoveFromCollection(col.id, assigningItem.id);
                            setAssigningItem({
                              ...assigningItem,
                              collection_ids: assigningItem.collection_ids.filter(
                                (id) => id !== col.id
                              ),
                            });
                          } else {
                            await onAssignToCollection(col.id, assigningItem.id);
                            setAssigningItem({
                              ...assigningItem,
                              collection_ids: [...assigningItem.collection_ids, col.id],
                            });
                          }
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          isAssigned
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                            : "bg-indigo-600 text-white hover:bg-indigo-500"
                        }`}
                      >
                        {isAssigned ? "Remove" : "Assign"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setAssigningItem(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
