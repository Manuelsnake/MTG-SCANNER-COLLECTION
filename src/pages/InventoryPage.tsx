import React, { useMemo, useState } from "react";
import {
  FolderPlus,
  Grid,
  Layers,
  LayoutGrid,
  List,
  Maximize2,
  Minus,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { CardImage } from "../components/CardImage";
import { CardZoomModal } from "../components/CardZoomModal";
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
  onOpenScryfallModal: () => void;
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
  onOpenScryfallModal,
  onUpdateQuantity,
  onDeleteItem,
  onAssignToCollection,
  onRemoveFromCollection,
  isAddCardModalOpen,
  setIsAddCardModalOpen,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "compact" | "list">("grid");
  const [zoomItem, setZoomItem] = useState<InventoryItemDetail | null>(null);
  const [assigningItem, setAssigningItem] = useState<InventoryItemDetail | null>(null);

  // Form state for manual card adding
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
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        item.card_name.toLowerCase().includes(q) ||
        (item.printed_name && item.printed_name.toLowerCase().includes(q)) ||
        item.set_code.toLowerCase().includes(q) ||
        item.collector_number.toLowerCase().includes(q) ||
        (item.location_name && item.location_name.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      const matchesCollection =
        selectedCollectionId === "all" ||
        item.collection_ids.includes(selectedCollectionId);

      return matchesSearch && matchesCollection;
    });
  }, [inventory, search, selectedCollectionId]);

  // Aggregate statistics
  const totalPhysicalCopies = useMemo(
    () => filteredItems.reduce((acc, item) => acc + item.quantity, 0),
    [filteredItems]
  );

  const totalValueCents = useMemo(
    () =>
      filteredItems.reduce(
        (acc, item) => acc + (item.purchase_price ? item.purchase_price * item.quantity : 0),
        0
      ),
    [filteredItems]
  );

  const formatPrice = (cents: number | null) => {
    if (cents == null) return "—";
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-5">
      {/* Summary Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Unique Cards
            </span>
            <span className="text-xl font-bold text-slate-100">{filteredItems.length}</span>
          </div>

          <div className="border-l border-slate-800 pl-6">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Total Copies
            </span>
            <span className="text-xl font-bold text-indigo-400">{totalPhysicalCopies}</span>
          </div>

          <div className="border-l border-slate-800 pl-6">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Collection Value
            </span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              €{(totalValueCents / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === "grid"
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>

          <button
            onClick={() => setViewMode("compact")}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === "compact"
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
            title="Compact Grid View"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Compact</span>
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === "list"
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
            title="Detailed Table View"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Top Controls: Search, Collection Filter & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by card name, set code, collector #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
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

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScryfallModal}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20"
          >
            <Search className="w-4 h-4" />
            <span>Search via Scryfall</span>
          </button>

          <button
            onClick={() => setIsAddCardModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-medium text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 text-center shadow-xs">
          <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-200 font-bold text-base">No inventory cards found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {inventory.length === 0
              ? "Your inventory is currently empty. Click 'Search via Scryfall' above to search and catalog your cards."
              : "No cards match your current search query or collection filter."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* 1. GRID VIEW (Card Art Featured) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden shadow-md transition-all flex flex-col justify-between"
            >
              {/* Card Image Container with Zoom Trigger */}
              <div
                className="relative aspect-[2.5/3.5] bg-slate-950 overflow-hidden cursor-pointer"
                onClick={() => setZoomItem(item)}
                title="Click to zoom card"
              >
                <CardImage
                  scryfallId={item.scryfall_id}
                  remoteUrl={item.image_url || item.image_small}
                  alt={item.printed_name || item.card_name}
                  size="normal"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                />

                {/* Foil Shimmer Badge */}
                {item.finish === "foil" && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Sparkles className="w-2.5 h-2.5" /> FOIL
                  </div>
                )}
                {item.finish === "etched" && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-purple-600/90 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-md">
                    ETCHED
                  </div>
                )}

                {/* Condition Badge */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                  {item.condition}
                </div>

                {/* Hover Zoom Icon */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="p-2 rounded-full bg-black/70 text-white shadow-lg">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Card Details & Controls */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <h4
                        className="font-bold text-slate-100 text-xs truncate leading-tight cursor-pointer hover:text-indigo-400 transition-colors"
                        onClick={() => setZoomItem(item)}
                        title={item.printed_name ? `${item.printed_name} (${item.card_name})` : item.card_name}
                      >
                        {item.printed_name || item.card_name}
                      </h4>
                      {item.printed_name && item.printed_name !== item.card_name && (
                        <p className="text-[10px] text-slate-400 truncate italic">
                          {item.card_name}
                        </p>
                      )}
                    </div>
                    {item.mana_cost && (
                      <span className="font-mono text-[10px] text-indigo-300 font-semibold shrink-0">
                        {item.mana_cost}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    <span className="font-mono font-bold text-indigo-400 uppercase">
                      {item.set_code}
                    </span>{" "}
                    #{item.collector_number} • {item.set_name}
                  </p>

                  <div className="flex items-center justify-between text-[11px] mt-1 text-slate-400">
                    <span className="uppercase font-mono text-[10px]">{item.language}</span>
                    <span className="font-bold text-slate-200 font-mono">
                      {formatPrice(item.purchase_price)}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Action Bar */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      disabled={item.quantity <= 0}
                      className="text-slate-400 hover:text-rose-400 disabled:opacity-30 transition-colors p-0.5"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs text-slate-100 min-w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="text-slate-400 hover:text-emerald-400 transition-colors p-0.5"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAssigningItem(item)}
                      className="p-1 text-slate-400 hover:text-cyan-400 rounded transition-colors"
                      title="Manage collections"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                      title="Delete card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "compact" ? (
        /* 2. COMPACT GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between"
            >
              <div
                className="relative aspect-[2.5/3.5] bg-slate-950 overflow-hidden cursor-pointer"
                onClick={() => setZoomItem(item)}
                title="Click to zoom card"
              >
                <CardImage
                  scryfallId={item.scryfall_id}
                  remoteUrl={item.image_small || item.image_url}
                  alt={item.printed_name || item.card_name}
                  size="small"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-1 right-1 px-1.5 py-0.2 rounded bg-black/85 text-[10px] font-bold text-indigo-300 border border-slate-700">
                  x{item.quantity}
                </div>
                {item.finish === "foil" && (
                  <div className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-md ring-1 ring-white/50" title="Foil" />
                )}
              </div>

              <div className="p-2 text-[11px]">
                <p
                  className="font-bold text-slate-100 truncate cursor-pointer hover:text-indigo-400"
                  onClick={() => setZoomItem(item)}
                  title={item.printed_name ? `${item.printed_name} (${item.card_name})` : item.card_name}
                >
                  {item.printed_name || item.card_name}
                </p>
                <div className="flex items-center justify-between text-slate-400 text-[10px] mt-0.5">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-indigo-400 uppercase">{item.set_code}</span>
                    <span className="font-mono uppercase text-[9px] text-slate-400">[{item.language}]</span>
                  </div>
                  <span className="font-mono text-slate-300">{formatPrice(item.purchase_price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 3. LIST VIEW (Detailed Table) */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="px-4 py-3">Card</th>
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
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-14 bg-slate-800 rounded-md overflow-hidden shrink-0 border border-slate-700/60 shadow-xs cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                          onClick={() => setZoomItem(item)}
                          title="Click to zoom card image"
                        >
                          <CardImage
                            scryfallId={item.scryfall_id}
                            remoteUrl={item.image_small || item.image_url}
                            alt={item.printed_name || item.card_name}
                            size="small"
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="font-bold text-slate-100 cursor-pointer hover:text-indigo-400 transition-colors"
                              onClick={() => setZoomItem(item)}
                            >
                              {item.printed_name || item.card_name}
                            </span>
                            {item.printed_name && item.printed_name !== item.card_name && (
                              <span className="text-[11px] text-slate-400 italic">
                                ({item.card_name})
                              </span>
                            )}
                            {item.mana_cost && (
                              <span className="text-[10px] font-mono text-indigo-400 shrink-0 font-bold">
                                {item.mana_cost}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {item.rarity && (
                              <span className="text-[9px] uppercase font-bold text-slate-400">
                                {item.rarity}
                              </span>
                            )}
                            {item.notes && (
                              <p className="text-[11px] font-normal text-slate-400 truncate max-w-xs">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      <span className="font-mono text-indigo-400 uppercase font-bold">
                        {item.set_code}
                      </span>{" "}
                      #{item.collector_number}
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
        </div>
      )}

      {/* Card Zoom Modal */}
      <CardZoomModal
        item={zoomItem}
        collections={collections}
        onClose={() => setZoomItem(null)}
      />

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
              placeholder="e.g. Lightning Bolt"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Set Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. LEA, MH2"
                value={setCode}
                onChange={(e) => setSetCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 uppercase placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Collector # <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 161, 267a"
                value={collectorNumber}
                onChange={(e) => setCollectorNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Set Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Modern Horizons 2"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Quantity</label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Finish</label>
              <select
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="nonfoil">Non-foil</option>
                <option value="foil">Foil</option>
                <option value="etched">Etched</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="NM">Near Mint (NM)</option>
                <option value="LP">Lightly Played (LP)</option>
                <option value="MP">Moderately Played (MP)</option>
                <option value="HP">Heavily Played (HP)</option>
                <option value="DMG">Damaged (DMG)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="en">English (EN)</option>
                <option value="it">Italian (IT)</option>
                <option value="de">German (DE)</option>
                <option value="fr">French (FR)</option>
                <option value="es">Spanish (ES)</option>
                <option value="ja">Japanese (JA)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Storage Location</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.location_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Purchase Price (EUR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
              <input
                type="text"
                placeholder="0.00"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Signed by artist, bought at local store"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddCardModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-md shadow-indigo-600/20"
            >
              Add Card
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign to Collection Modal */}
      {assigningItem && (
        <Modal
          isOpen={true}
          onClose={() => setAssigningItem(null)}
          title={`Collections for ${assigningItem.card_name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Assign or remove <span className="text-slate-200 font-semibold">{assigningItem.card_name}</span>{" "}
              ({assigningItem.set_code} #{assigningItem.collector_number}) from your virtual collections:
            </p>

            {collections.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No collections created yet. Go to Collections tab to create one.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {collections.map((col) => {
                  const isAssigned = assigningItem.collection_ids.includes(col.id);
                  return (
                    <div
                      key={col.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800"
                    >
                      <div>
                        <div className="font-medium text-sm text-slate-200">{col.name}</div>
                        {col.description && (
                          <div className="text-xs text-slate-400">{col.description}</div>
                        )}
                      </div>
                      <button
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
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          isAssigned
                            ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {isAssigned ? "Remove" : "Assign"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAssigningItem(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
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
