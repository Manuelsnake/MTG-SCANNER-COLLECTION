import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  GalleryHorizontal,
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
  X,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { CardImage } from "../components/CardImage";
import { CardZoomModal } from "../components/CardZoomModal";
import { ImageZoomModal } from "../components/ImageZoomModal";
import { useI18n } from "../i18n";
import type {
  AddManualCardInput,
  CollectionSummary,
  InventoryItemDetail,
  Location,
} from "../types";

export type CollectionViewMode = "grid" | "compact" | "list" | "gallery";
export type CollectionSortField =
  | "name"
  | "set"
  | "collector_number"
  | "price"
  | "quantity"
  | "date";
export type SortDirection = "asc" | "desc";

const VIEW_MODE_STORAGE_KEY = "mtg_collection_view_mode";
const SORT_FIELD_STORAGE_KEY = "mtg_collection_sort_field";
const SORT_DIR_STORAGE_KEY = "mtg_collection_sort_direction";
const PAGE_SIZE_STORAGE_KEY = "mtg_collection_page_size";

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
  const { t, formatPrice, formatNumber } = useI18n();

  const [search, setSearch] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");

  // Persistent display settings (localStorage)
  const [viewMode, setViewMode] = useState<CollectionViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (
        saved === "grid" ||
        saved === "compact" ||
        saved === "list" ||
        saved === "gallery"
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return "grid";
  });

  const [sortField, setSortField] = useState<CollectionSortField>(() => {
    try {
      const saved = localStorage.getItem(
        SORT_FIELD_STORAGE_KEY
      ) as CollectionSortField;
      if (
        [
          "name",
          "set",
          "collector_number",
          "price",
          "quantity",
          "date",
        ].includes(saved)
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return "name";
  });

  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    try {
      const saved = localStorage.getItem(
        SORT_DIR_STORAGE_KEY
      ) as SortDirection;
      if (saved === "asc" || saved === "desc") return saved;
    } catch {
      // ignore
    }
    return "asc";
  });

  const [pageSize, setPageSize] = useState<number | "all">(() => {
    try {
      const saved = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      if (saved === "all") return "all";
      if (saved) {
        const num = parseInt(saved, 10);
        if ([24, 48, 96].includes(num)) return num;
      }
    } catch {
      // ignore
    }
    return 48;
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const galleryRef = useRef<HTMLDivElement>(null);

  const [zoomItem, setZoomItem] = useState<InventoryItemDetail | null>(null);
  const [lightboxItem, setLightboxItem] = useState<InventoryItemDetail | null>(null);
  const [hoveredItem, setHoveredItem] = useState<InventoryItemDetail | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [assigningItem, setAssigningItem] = useState<InventoryItemDetail | null>(null);

  // Preference persistence helpers
  const handleViewModeChange = (mode: CollectionViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  };

  const handleSortFieldChange = (field: CollectionSortField) => {
    setSortField(field);
    try {
      localStorage.setItem(SORT_FIELD_STORAGE_KEY, field);
    } catch {
      // ignore
    }
  };

  const handleToggleSortDirection = () => {
    const nextDir = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(nextDir);
    try {
      localStorage.setItem(SORT_DIR_STORAGE_KEY, nextDir);
    } catch {
      // ignore
    }
  };

  const handleSortColumnClick = (field: CollectionSortField) => {
    if (sortField === field) {
      handleToggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection("asc");
      try {
        localStorage.setItem(SORT_FIELD_STORAGE_KEY, field);
        localStorage.setItem(SORT_DIR_STORAGE_KEY, "asc");
      } catch {
        // ignore
      }
    }
  };

  const handlePageSizeChange = (size: number | "all") => {
    setPageSize(size);
    setCurrentPage(1);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      // ignore
    }
  };

  // Gallery horizontal scroll helper
  const scrollGallery = (direction: "left" | "right") => {
    if (galleryRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      galleryRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleGalleryWheel = (e: React.WheelEvent) => {
    if (galleryRef.current && Math.abs(e.deltaY) > 0) {
      galleryRef.current.scrollLeft += e.deltaY;
    }
  };

  // Gallery keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    if (viewMode !== "gallery") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft") {
        scrollGallery("left");
      } else if (e.key === "ArrowRight") {
        scrollGallery("right");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode]);

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
      setFormError(t("inventory.cardNameReq"));
      return;
    }
    if (!setCode.trim()) {
      setFormError(t("inventory.setCodeReq"));
      return;
    }
    if (!collectorNumber.trim()) {
      setFormError(t("inventory.collectorNumberReq"));
      return;
    }
    if (quantity <= 0) {
      setFormError(t("inventory.quantityMin"));
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

  // Sort filtered items
  const sortedAndFilteredItems = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": {
          const nameA = (a.printed_name || a.card_name).toLowerCase();
          const nameB = (b.printed_name || b.card_name).toLowerCase();
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case "set": {
          const setCmp = a.set_code.localeCompare(b.set_code);
          if (setCmp !== 0) {
            cmp = setCmp;
          } else {
            const numA = parseInt(a.collector_number, 10);
            const numB = parseInt(b.collector_number, 10);
            if (!isNaN(numA) && !isNaN(numB)) {
              cmp = numA - numB;
            } else {
              cmp = a.collector_number.localeCompare(b.collector_number);
            }
          }
          break;
        }
        case "collector_number": {
          const numA = parseInt(a.collector_number, 10);
          const numB = parseInt(b.collector_number, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            cmp = numA - numB;
          } else {
            cmp = a.collector_number.localeCompare(b.collector_number);
          }
          break;
        }
        case "price": {
          const priceA = a.purchase_price ?? -1;
          const priceB = b.purchase_price ?? -1;
          cmp = priceA - priceB;
          break;
        }
        case "quantity": {
          cmp = a.quantity - b.quantity;
          break;
        }
        case "date": {
          const dateA = a.acquisition_date || a.created_at || "";
          const dateB = b.acquisition_date || b.created_at || "";
          cmp = dateA.localeCompare(dateB);
          break;
        }
        default:
          cmp = 0;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return items;
  }, [filteredItems, sortField, sortDirection]);

  // Aggregate statistics
  const totalPhysicalCopies = useMemo(
    () => sortedAndFilteredItems.reduce((acc, item) => acc + item.quantity, 0),
    [sortedAndFilteredItems]
  );

  const totalValueCents = useMemo(
    () =>
      sortedAndFilteredItems.reduce(
        (acc, item) =>
          acc + (item.purchase_price ? item.purchase_price * item.quantity : 0),
        0
      ),
    [sortedAndFilteredItems]
  );

  // Pagination calculation for high performance with large collections
  const totalItems = sortedAndFilteredItems.length;
  const totalPages = useMemo(() => {
    if (pageSize === "all" || pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }, [totalItems, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const pagedItems = useMemo(() => {
    if (viewMode === "gallery" || pageSize === "all") {
      return sortedAndFilteredItems;
    }
    const start = (currentPage - 1) * pageSize;
    return sortedAndFilteredItems.slice(start, start + pageSize);
  }, [sortedAndFilteredItems, currentPage, pageSize, viewMode]);

  const startIndex =
    typeof pageSize === "number" ? (currentPage - 1) * pageSize : 0;
  const endIndex =
    typeof pageSize === "number"
      ? Math.min(startIndex + pageSize, totalItems)
      : totalItems;

  return (
    <div className="space-y-5">
      {/* Summary Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              {t("inventory.uniqueCards")}
            </span>
            <span className="text-xl font-bold text-slate-100">
              {formatNumber(sortedAndFilteredItems.length)}
            </span>
          </div>

          <div className="border-l border-slate-800 pl-6">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              {t("inventory.totalCopies")}
            </span>
            <span className="text-xl font-bold text-indigo-400">
              {formatNumber(totalPhysicalCopies)}
            </span>
          </div>

          <div className="border-l border-slate-800 pl-6">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              {t("inventory.collectionValue")}
            </span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {formatPrice(totalValueCents)}
            </span>
          </div>
        </div>

        {/* View Mode Switcher (4 Custom Display Modes with Persistence) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shadow-inner">
          <button
            onClick={() => handleViewModeChange("grid")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === "grid"
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
            title={t("inventory.viewGrid")}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">{t("inventory.viewGrid")}</span>
          </button>

          <button
            onClick={() => handleViewModeChange("compact")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === "compact"
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
            title={t("inventory.viewCompact")}
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">{t("inventory.viewCompact")}</span>
          </button>

          <button
            onClick={() => handleViewModeChange("list")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === "list"
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
            title={t("inventory.viewList")}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">{t("inventory.viewList")}</span>
          </button>

          <button
            onClick={() => handleViewModeChange("gallery")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === "gallery"
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
            }`}
            title={t("inventory.viewGallery")}
          >
            <GalleryHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">{t("inventory.viewGallery")}</span>
          </button>
        </div>
      </div>

      {/* Top Controls: Search, Collection Filter, Sort Controls & Action Buttons */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search & Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("inventory.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-200 rounded"
                title={t("inventory.clearSearch")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedCollectionId}
            onChange={(e) => setSelectedCollectionId(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="all">
              {t("inventory.allCollections", { count: inventory.length })}
            </option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name} ({col.total_quantity})
              </option>
            ))}
          </select>

          {/* Sort Controls */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-inner">
            <span className="text-xs text-slate-400 font-medium">{t("inventory.sortBy")}:</span>
            <select
              value={sortField}
              onChange={(e) =>
                handleSortFieldChange(e.target.value as CollectionSortField)
              }
              className="bg-transparent text-xs text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="name" className="bg-slate-900">
                {t("inventory.sortName")}
              </option>
              <option value="set" className="bg-slate-900">
                {t("inventory.sortSet")}
              </option>
              <option value="collector_number" className="bg-slate-900">
                {t("inventory.sortCollectorNumber")}
              </option>
              <option value="price" className="bg-slate-900">
                {t("inventory.sortPrice")}
              </option>
              <option value="quantity" className="bg-slate-900">
                {t("inventory.sortQuantity")}
              </option>
              <option value="date" className="bg-slate-900">
                {t("inventory.sortDate")}
              </option>
            </select>
            <button
              onClick={handleToggleSortDirection}
              className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
              title={
                sortDirection === "asc"
                  ? t("inventory.sortAscending")
                  : t("inventory.sortDescending")
              }
            >
              {sortDirection === "asc" ? (
                <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenScryfallModal}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20"
          >
            <Search className="w-4 h-4" />
            <span>{t("inventory.searchScryfall")}</span>
          </button>

          <button
            onClick={() => setIsAddCardModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-medium text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t("inventory.manualEntry")}</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 text-center shadow-xs">
          <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-200 font-bold text-base">{t("inventory.noCardsFound")}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {inventory.length === 0
              ? t("inventory.emptyInventoryPrompt")
              : t("inventory.noFilterMatchPrompt")}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* 1. GRID VIEW (Card Art Featured) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pagedItems.map((item) => (
            <div
              key={item.id}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden shadow-md transition-all flex flex-col justify-between"
            >
              {/* Card Image Container with Zoom Trigger */}
              <div
                className="relative aspect-[2.5/3.5] bg-slate-950 overflow-hidden cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setHoveredItem(null);
                  setLightboxItem(item);
                }}
                onMouseEnter={(e) => {
                  setHoveredItem(item);
                  setHoverPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  setHoverPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredItem(null)}
                title={t("inventory.clickToZoom")}
              >
                <CardImage
                  scryfallId={item.scryfall_id}
                  remoteUrl={item.image_url || item.image_small}
                  alt={item.printed_name || item.card_name}
                  size="normal"
                  fit="cover"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                />

                {/* Foil Shimmer Badge */}
                {item.finish === "foil" && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <Sparkles className="w-2.5 h-2.5" /> {t("common.foil").toUpperCase()}
                  </div>
                )}
                {item.finish === "etched" && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-purple-600/90 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-md">
                    {t("common.etched").toUpperCase()}
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
                        title={
                          item.printed_name
                            ? `${item.printed_name} (${item.card_name})`
                            : item.card_name
                        }
                      >
                        {item.printed_name || item.card_name}
                      </h4>
                      {item.printed_name &&
                        item.printed_name !== item.card_name && (
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
                    <span className="uppercase font-mono text-[10px]">
                      {item.language}
                    </span>
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
                      title={t("inventory.decreaseQty")}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs text-slate-100 min-w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="text-slate-400 hover:text-emerald-400 transition-colors p-0.5"
                      title={t("inventory.increaseQty")}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoomItem(item)}
                      className="p-1 text-slate-400 hover:text-indigo-400 rounded transition-colors"
                      title={t("inventory.viewDetails")}
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setAssigningItem(item)}
                      className="p-1 text-slate-400 hover:text-cyan-400 rounded transition-colors"
                      title={t("inventory.manageCollections")}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t("inventory.deleteCardConfirm"))) {
                          onDeleteItem(item.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                      title={t("common.delete")}
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
        /* 2. COMPACT GRID VIEW (Dense Collection Browser) */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5">
          {pagedItems.map((item) => (
            <div
              key={item.id}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between"
            >
              <div
                className="relative aspect-[2.5/3.5] bg-slate-950 overflow-hidden cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setHoveredItem(null);
                  setLightboxItem(item);
                }}
                onMouseEnter={(e) => {
                  setHoveredItem(item);
                  setHoverPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  setHoverPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredItem(null)}
                title={t("inventory.clickToZoom")}
              >
                <CardImage
                  scryfallId={item.scryfall_id}
                  remoteUrl={item.image_url || item.image_small}
                  alt={item.printed_name || item.card_name}
                  size="normal"
                  fit="cover"
                  className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-1 right-1 px-1.5 py-0.2 rounded bg-black/85 text-[10px] font-bold text-indigo-300 border border-slate-700 shadow-md">
                  x{item.quantity}
                </div>
                {item.finish === "foil" && (
                  <div
                    className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-md ring-1 ring-white/50"
                    title={t("common.foil")}
                  />
                )}
                {item.finish === "etched" && (
                  <div
                    className="absolute top-1 left-1 px-1 py-0.2 rounded bg-purple-600 text-[8px] font-extrabold text-white shadow-md"
                    title={t("common.etched")}
                  >
                    E
                  </div>
                )}
              </div>

              <div className="p-2 text-[11px]">
                <p
                  className="font-bold text-slate-100 truncate cursor-pointer hover:text-indigo-400"
                  onClick={() => setZoomItem(item)}
                  title={
                    item.printed_name
                      ? `${item.printed_name} (${item.card_name})`
                      : item.card_name
                  }
                >
                  {item.printed_name || item.card_name}
                </p>
                <div className="flex items-center justify-between text-slate-400 text-[10px] mt-0.5">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-indigo-400 uppercase">
                      {item.set_code}
                    </span>
                    <span className="font-mono uppercase text-[9px] text-slate-400">
                      [{item.language}]
                    </span>
                  </div>
                  <span className="font-mono text-slate-300">
                    {formatPrice(item.purchase_price)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "list" ? (
        /* 3. LIST / TEXT VIEW (Detailed Inventory Table) */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700/80">
                <tr>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-slate-200 select-none transition-colors"
                    onClick={() => handleSortColumnClick("name")}
                    title={t("inventory.sortName")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{t("inventory.tableCard")}</span>
                      {sortField === "name" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  <th
                    className="px-4 py-3 cursor-pointer hover:text-slate-200 select-none transition-colors"
                    onClick={() => handleSortColumnClick("set")}
                    title={t("inventory.sortSet")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{t("inventory.tableSetNumber")}</span>
                      {sortField === "set" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  <th className="px-4 py-3">{t("inventory.tableFinish")}</th>
                  <th className="px-4 py-3">{t("inventory.tableCondition")}</th>
                  <th className="px-4 py-3">{t("inventory.tableLang")}</th>
                  <th className="px-4 py-3">{t("inventory.tableStorage")}</th>
                  <th className="px-4 py-3">{t("inventory.tableCollections")}</th>

                  <th
                    className="px-4 py-3 cursor-pointer hover:text-slate-200 select-none transition-colors"
                    onClick={() => handleSortColumnClick("price")}
                    title={t("inventory.sortPrice")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{t("inventory.tablePrice")}</span>
                      {sortField === "price" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  <th
                    className="px-4 py-3 text-center cursor-pointer hover:text-slate-200 select-none transition-colors"
                    onClick={() => handleSortColumnClick("quantity")}
                    title={t("inventory.sortQuantity")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{t("inventory.tableQuantity")}</span>
                      {sortField === "quantity" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right">{t("inventory.tableActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pagedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-14 bg-slate-800 rounded-md overflow-hidden shrink-0 border border-slate-700/60 shadow-xs cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHoveredItem(null);
                            setLightboxItem(item);
                          }}
                          onMouseEnter={(e) => {
                            setHoveredItem(item);
                            setHoverPosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => {
                            setHoverPosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredItem(null)}
                          title={t("inventory.clickToZoom")}
                        >
                          <CardImage
                            scryfallId={item.scryfall_id}
                            remoteUrl={item.image_url || item.image_small}
                            alt={item.printed_name || item.card_name}
                            size="small"
                            fit="cover"
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
                            {item.printed_name &&
                              item.printed_name !== item.card_name && (
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
                        {item.finish === "foil"
                          ? t("common.foil")
                          : item.finish === "etched"
                          ? t("common.etched")
                          : t("common.nonfoil")}
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
                        <span className="italic text-slate-400">
                          {t("common.unassigned")}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.collection_ids.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">
                            {t("common.none")}
                          </span>
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
                      {formatPrice(item.purchase_price)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          disabled={item.quantity <= 0}
                          className="p-0.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 transition-colors"
                          title={t("inventory.decreaseQty")}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-slate-100 min-w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="p-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                          title={t("inventory.increaseQty")}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setLightboxItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                          title={t("inventory.clickToZoom")}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setZoomItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title={t("inventory.viewDetails")}
                        >
                          <Tag className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setAssigningItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          title={t("inventory.manageCollections")}
                        >
                          <FolderPlus className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(t("inventory.deleteCardConfirm"))) {
                              onDeleteItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title={t("common.delete")}
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
      ) : (
        /* 4. GALLERY / CAROUSEL VIEW (Large Horizontal Showroom) */
        <div className="space-y-3">
          {/* Gallery Navigation Controls Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <GalleryHorizontal className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-slate-200">
                {t("inventory.galleryBrowsing", { count: sortedAndFilteredItems.length })}
              </span>
              <span className="hidden sm:inline text-slate-400 text-[11px]">
                {t("inventory.galleryHint")}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollGallery("left")}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:text-white transition-all shadow-xs"
                title={`${t("inventory.prev")} (←)`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollGallery("right")}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:text-white transition-all shadow-xs"
                title={`${t("inventory.next")} (→)`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Carousel Track */}
          <div
            ref={galleryRef}
            onWheel={handleGalleryWheel}
            className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2 scrollbar-thin snap-x snap-mandatory focus:outline-hidden"
            tabIndex={0}
          >
            {sortedAndFilteredItems.map((item) => (
              <div
                key={item.id}
                className="w-72 sm:w-80 shrink-0 snap-start bg-slate-900 border border-slate-800 hover:border-indigo-500/80 rounded-2xl overflow-hidden shadow-2xl transition-all flex flex-col justify-between group"
              >
                {/* Large Card Image Container */}
                <div
                  className="relative aspect-[2.5/3.5] bg-slate-950 overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredItem(null);
                    setLightboxItem(item);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredItem(item);
                    setHoverPosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setHoverPosition({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                  title={t("inventory.clickToZoom")}
                >
                  <CardImage
                    scryfallId={item.scryfall_id}
                    remoteUrl={item.image_url || item.image_small}
                    alt={item.printed_name || item.card_name}
                    size="large"
                    fit="cover"
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Foil Shimmer Badge */}
                  {item.finish === "foil" && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-amber-500/90 text-black text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-lg">
                      <Sparkles className="w-3 h-3" /> {t("common.foil").toUpperCase()}
                    </div>
                  )}
                  {item.finish === "etched" && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-purple-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg">
                      {t("common.etched").toUpperCase()}
                    </div>
                  )}

                  {/* Condition Badge */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/85 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 shadow-lg">
                    {item.condition}
                  </div>

                  {/* Hover Overlay Zoom Icon */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                    <div className="p-3 rounded-full bg-black/80 text-white shadow-2xl border border-white/20">
                      <Maximize2 className="w-6 h-6 text-indigo-300" />
                    </div>
                  </div>
                </div>

                {/* Gallery Card Bottom Details Panel */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-bold text-slate-100 text-sm truncate hover:text-indigo-400 cursor-pointer transition-colors"
                          onClick={() => setZoomItem(item)}
                          title={
                            item.printed_name
                              ? `${item.printed_name} (${item.card_name})`
                              : item.card_name
                          }
                        >
                          {item.printed_name || item.card_name}
                        </h3>
                        {item.printed_name &&
                          item.printed_name !== item.card_name && (
                            <p className="text-xs text-slate-400 truncate italic">
                              {item.card_name}
                            </p>
                          )}
                      </div>
                      {item.mana_cost && (
                        <span className="font-mono text-xs text-indigo-300 font-semibold shrink-0">
                          {item.mana_cost}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1 truncate">
                      <span className="font-mono font-bold text-indigo-400 uppercase">
                        {item.set_code}
                      </span>{" "}
                      #{item.collector_number} • {item.set_name}
                    </p>

                    <div className="flex items-center justify-between text-xs mt-1.5 text-slate-400">
                      <span className="uppercase font-mono text-[11px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60">
                        {item.language}
                      </span>
                      <span className="font-bold text-slate-100 font-mono text-sm">
                        {formatPrice(item.purchase_price)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls & Action Bar */}
                  <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        disabled={item.quantity <= 0}
                        className="text-slate-400 hover:text-rose-400 disabled:opacity-30 transition-colors p-0.5"
                        title={t("inventory.decreaseQty")}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-xs text-slate-100 min-w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="text-slate-400 hover:text-emerald-400 transition-colors p-0.5"
                        title={t("inventory.increaseQty")}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setZoomItem(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                        title={t("inventory.viewDetails")}
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAssigningItem(item)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                        title={t("inventory.manageCollections")}
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t("inventory.deleteCardConfirm"))) {
                            onDeleteItem(item.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination & Range Indicator Bar (for Grid, Compact, List views) */}
      {viewMode !== "gallery" && totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 shadow-xs">
          <div className="flex items-center gap-2">
            <span>
              {t("inventory.showingRange", {
                start: startIndex + 1,
                end: endIndex,
                total: totalItems,
              })}
            </span>
            {pageSize !== "all" && totalPages > 1 && (
              <span className="text-slate-400">
                {t("inventory.pageOf", { current: currentPage, total: totalPages })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">{t("inventory.perPage")}:</span>
              <select
                value={String(pageSize)}
                onChange={(e) => {
                  const val = e.target.value;
                  handlePageSizeChange(
                    val === "all" ? "all" : parseInt(val, 10)
                  );
                }}
                className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="24" className="bg-slate-900">
                  24
                </option>
                <option value="48" className="bg-slate-900">
                  48
                </option>
                <option value="96" className="bg-slate-900">
                  96
                </option>
                <option value="all" className="bg-slate-900">
                  {t("common.all")}
                </option>
              </select>
            </div>

            {/* Page Navigation Buttons */}
            {pageSize !== "all" && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700/80 transition-colors flex items-center gap-1 font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{t("inventory.prev")}</span>
                </button>

                <div className="px-2 py-1 font-mono text-slate-300 font-bold">
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700/80 transition-colors flex items-center gap-1 font-medium"
                >
                  <span>{t("inventory.next")}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Hover Card Preview Tooltip */}
      {hoveredItem && hoverPosition && !lightboxItem && !zoomItem && (
        <div
          className="fixed z-50 pointer-events-none transition-all duration-75 ease-out animate-in fade-in"
          style={{
            left: `${Math.min(
              Math.max(16, hoverPosition.x > window.innerWidth - 280 ? hoverPosition.x - 250 : hoverPosition.x + 18),
              window.innerWidth - 260
            )}px`,
            top: `${Math.min(
              Math.max(16, hoverPosition.y - 100),
              Math.max(16, window.innerHeight - 380)
            )}px`,
          }}
        >
          <div className="w-56 bg-slate-900/95 border border-indigo-500/60 rounded-2xl p-2.5 shadow-2xl shadow-black/80 backdrop-blur-md flex flex-col gap-2">
            <div className="relative aspect-[2.5/3.5] w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-inner">
              <CardImage
                scryfallId={hoveredItem.scryfall_id}
                remoteUrl={hoveredItem.image_url || hoveredItem.image_small}
                alt={hoveredItem.printed_name || hoveredItem.card_name}
                size="normal"
                fit="cover"
                className="w-full h-full"
              />
              {hoveredItem.finish === "foil" && (
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Sparkles className="w-2.5 h-2.5" /> {t("common.foil").toUpperCase()}
                </div>
              )}
              {hoveredItem.finish === "etched" && (
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-purple-600/90 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-md">
                  {t("common.etched").toUpperCase()}
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                {hoveredItem.condition}
              </div>
            </div>
            <div className="px-1 text-slate-200">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-bold truncate">
                  {hoveredItem.printed_name || hoveredItem.card_name}
                </p>
                {hoveredItem.mana_cost && (
                  <span className="font-mono text-[10px] text-indigo-300 font-semibold shrink-0">
                    {hoveredItem.mana_cost}
                  </span>
                )}
              </div>
              {hoveredItem.printed_name && hoveredItem.printed_name !== hoveredItem.card_name && (
                <p className="text-[10px] text-slate-400 truncate italic">
                  {hoveredItem.card_name}
                </p>
              )}
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span className="text-indigo-400 font-bold uppercase">
                  {hoveredItem.set_code} #{hoveredItem.collector_number}
                </span>
                <span className="text-emerald-400 font-bold">
                  {formatPrice(hoveredItem.purchase_price)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Details / Management Zoom Modal */}
      <CardZoomModal
        item={zoomItem}
        collections={collections}
        onClose={() => setZoomItem(null)}
      />

      {/* High-Resolution Dedicated Image Zoom Modal */}
      {lightboxItem && (
        <ImageZoomModal
          isOpen={!!lightboxItem}
          onClose={() => setLightboxItem(null)}
          cardName={lightboxItem.card_name}
          printedName={lightboxItem.printed_name}
          setCode={lightboxItem.set_code}
          collectorNumber={lightboxItem.collector_number}
          setName={lightboxItem.set_name}
          lang={lightboxItem.language}
          scryfallId={lightboxItem.scryfall_id}
          imageUrl={lightboxItem.image_url || lightboxItem.image_small}
          cardFaces={lightboxItem.card_faces}
        />
      )}

      {/* Add Card Manually Modal */}
      <Modal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        title={t("inventory.addManualTitle")}
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
              {t("inventory.cardName")} <span className="text-rose-400">*</span>
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
                {t("inventory.setCode")} <span className="text-rose-400">*</span>
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
                {t("inventory.collectorNumber")} <span className="text-rose-400">*</span>
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
            <label className="text-xs font-medium text-slate-300">
              {t("inventory.setName")}
            </label>
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
              <label className="text-xs font-medium text-slate-300">
                {t("common.quantity")}
              </label>
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
              <label className="text-xs font-medium text-slate-300">
                {t("common.finish")}
              </label>
              <select
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="nonfoil">{t("common.nonfoil")}</option>
                <option value="foil">{t("common.foil")}</option>
                <option value="etched">{t("common.etched")}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                {t("common.condition")}
              </label>
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
              <label className="text-xs font-medium text-slate-300">
                {t("common.language")}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500 uppercase font-mono"
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
              <label className="text-xs font-medium text-slate-300">
                {t("common.location")}
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-hidden focus:border-indigo-500"
              >
                <option value="">{t("common.unassigned")}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.location_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              {t("inventory.purchasePriceEur")}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
              <input
                type="text"
                placeholder="0.00"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              {t("inventory.notesOptional")}
            </label>
            <input
              type="text"
              placeholder={t("inventory.notesPlaceholder")}
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
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-md shadow-indigo-600/20"
            >
              {t("inventory.addCardBtn")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign to Collection Modal */}
      {assigningItem && (
        <Modal
          isOpen={true}
          onClose={() => setAssigningItem(null)}
          title={t("inventory.collectionsForCard", { name: assigningItem.card_name })}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              {t("inventory.assignPrompt", {
                name: assigningItem.card_name,
                set: assigningItem.set_code,
                number: assigningItem.collector_number,
              })}
            </p>

            {collections.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                {t("inventory.noCollectionsCreated")}
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
                        {isAssigned ? t("inventory.removeBtn") : t("inventory.assignBtn")}
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
                {t("common.done")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
