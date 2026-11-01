import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { Modal } from "./Modal";
import { CardImage } from "./CardImage";
import { api } from "../services/api";
import type {
  AddScryfallCardInput,
  CollectionSummary,
  Location,
  ScryfallSearchResult,
} from "../types";

interface ScryfallSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: CollectionSummary[];
  locations: Location[];
  onCardAdded: () => Promise<void>;
}

export const ScryfallSearchModal: React.FC<ScryfallSearchModalProps> = ({
  isOpen,
  onClose,
  collections,
  locations,
  onCardAdded,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ScryfallSearchResult[]>([]);
  const [selectedCard, setSelectedCard] = useState<ScryfallSearchResult | null>(null);

  // Printings state for the selected card
  const [printings, setPrintings] = useState<ScryfallSearchResult[]>([]);
  const [isLoadingPrintings, setIsLoadingPrintings] = useState(false);
  const [printingFilterQuery, setPrintingFilterQuery] = useState("");
  const [paperOnlyFilter, setPaperOnlyFilter] = useState(true);

  // Multi-faced / transform card support
  const [activeFaceIndex, setActiveFaceIndex] = useState<number>(0);

  // Form input fields for adding the selected card to inventory
  const [quantity, setQuantity] = useState<number>(1);
  const [language, setLanguage] = useState("en");
  const [finish, setFinish] = useState("nonfoil");
  const [condition, setCondition] = useState("NM");
  const [priceInput, setPriceInput] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced autocomplete
  const handleQueryChange = (val: string) => {
    setQuery(val);
    setErrorMsg(null);

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    if (val.trim().length >= 2) {
      autocompleteTimeoutRef.current = setTimeout(async () => {
        try {
          const items = await api.scryfallAutocomplete(val.trim());
          setSuggestions(items.slice(0, 8));
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        }
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectCard = useCallback(async (card: ScryfallSearchResult) => {
    setSelectedCard(card);
    setActiveFaceIndex(0);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPrintingFilterQuery("");

    // Auto-populate available finish
    if (card.finishes.includes("nonfoil")) {
      setFinish("nonfoil");
    } else if (card.finishes.length > 0) {
      setFinish(card.finishes[0]);
    }

    // Auto-populate price suggestion if available (in cents)
    if (card.price_eur != null) {
      setPriceInput((card.price_eur / 100).toFixed(2));
    } else if (card.price_eur_foil != null) {
      setPriceInput((card.price_eur_foil / 100).toFixed(2));
    } else {
      setPriceInput("");
    }

    // Background cache card image for instant display and offline access
    if (card.scryfall_id && (card.image_url || card.image_small)) {
      api.getCardImage(card.scryfall_id, card.image_url || card.image_small, "normal").catch(() => {});
    }

    // Fetch all printings
    setIsLoadingPrintings(true);
    try {
      let prints: ScryfallSearchResult[] = [];
      if (card.oracle_id) {
        prints = await api.scryfallGetPrintings(card.oracle_id);
      }
      if (prints.length === 0) {
        prints = await api.scryfallGetPrintingsByName(card.name);
      }
      setPrintings(prints.length > 0 ? prints : [card]);
    } catch (err) {
      console.warn("Could not load other printings:", err);
      setPrintings([card]);
    } finally {
      setIsLoadingPrintings(false);
    }
  }, []);

  const executeSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      setShowSuggestions(false);
      setIsSearching(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setSelectedCard(null);
      setPrintings([]);

      try {
        const results = await api.scryfallSearch(trimmed);
        setSearchResults(results);
        if (results.length === 0) {
          setErrorMsg(`No cards found on Scryfall for "${trimmed}".`);
        } else if (results.length === 1) {
          handleSelectCard(results[0]);
        }
      } catch (err) {
        console.error("Scryfall search failed:", err);
        setErrorMsg(String(err));
      } finally {
        setIsSearching(false);
      }
    },
    [handleSelectCard]
  );

  const handleSelectPrinting = (printing: ScryfallSearchResult) => {
    setSelectedCard(printing);
    setActiveFaceIndex(0);

    // Adapt available finish
    if (printing.finishes.includes(finish)) {
      // keep current finish
    } else if (printing.finishes.includes("nonfoil")) {
      setFinish("nonfoil");
    } else if (printing.finishes.length > 0) {
      setFinish(printing.finishes[0]);
    }

    // Update price suggestion
    if (finish === "foil" && printing.price_eur_foil != null) {
      setPriceInput((printing.price_eur_foil / 100).toFixed(2));
    } else if (printing.price_eur != null) {
      setPriceInput((printing.price_eur / 100).toFixed(2));
    }

    // Pre-cache chosen printing image
    if (printing.scryfall_id && (printing.image_url || printing.image_small)) {
      api.getCardImage(printing.scryfall_id, printing.image_url || printing.image_small, "normal").catch(() => {});
    }
  };

  const handleFinishChange = (newFinish: string) => {
    setFinish(newFinish);
    if (!selectedCard) return;

    if (newFinish === "foil" && selectedCard.price_eur_foil != null) {
      setPriceInput((selectedCard.price_eur_foil / 100).toFixed(2));
    } else if (newFinish === "nonfoil" && selectedCard.price_eur != null) {
      setPriceInput((selectedCard.price_eur / 100).toFixed(2));
    }
  };

  const handleAddCardToInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    if (quantity <= 0) {
      setErrorMsg("Quantity must be at least 1.");
      return;
    }

    let purchasePrice: number | null = null;
    if (priceInput.trim()) {
      const parsed = parseFloat(priceInput.replace(",", "."));
      if (!isNaN(parsed) && parsed >= 0) {
        purchasePrice = Math.round(parsed * 100);
      }
    }

    const payload: AddScryfallCardInput = {
      scryfall_id: selectedCard.scryfall_id,
      oracle_id: selectedCard.oracle_id,
      card_name: selectedCard.name,
      set_code: selectedCard.set_code,
      collector_number: selectedCard.collector_number,
      set_name: selectedCard.set_name,
      release_date: selectedCard.released_at,
      rarity: selectedCard.rarity,
      mana_cost: selectedCard.mana_cost,
      type_line: selectedCard.type_line,
      image_url: selectedCard.image_url,
      image_small: selectedCard.image_small,
      image_art_crop: selectedCard.image_art_crop,
      card_faces: selectedCard.card_faces,
      quantity,
      language,
      finish,
      condition,
      purchase_price: purchasePrice,
      currency: "EUR",
      location_id: selectedLocationId || null,
      notes: notes.trim() || null,
      collection_ids: selectedCollectionIds,
    };

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.addCardFromScryfall(payload);
      // Ensure image is cached in local app data directory
      if (selectedCard.scryfall_id && selectedCard.image_url) {
        api.getCardImage(selectedCard.scryfall_id, selectedCard.image_url, "normal").catch(() => {});
      }
      await onCardAdded();
      setSuccessMsg(`Added ${quantity}x "${selectedCard.name}" (${selectedCard.set_code.toUpperCase()} #${selectedCard.collector_number}) to your collection!`);
      setQuantity(1);
    } catch (err) {
      console.error("Failed to add card from Scryfall:", err);
      setErrorMsg(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCollection = (colId: string) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const formatPrice = (cents: number | null) => {
    if (cents == null) return "—";
    return `€${(cents / 100).toFixed(2)}`;
  };

  // Filter printings by paper / search filter
  const filteredPrintings = useMemo(() => {
    let list = printings;
    if (paperOnlyFilter) {
      list = list.filter((p) => p.is_paper !== false && !p.digital);
    }
    if (printingFilterQuery.trim()) {
      const q = printingFilterQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.set_code.toLowerCase().includes(q) ||
          p.set_name.toLowerCase().includes(q) ||
          p.collector_number.toLowerCase().includes(q) ||
          (p.released_at && p.released_at.includes(q))
      );
    }
    return list;
  }, [printings, paperOnlyFilter, printingFilterQuery]);

  // Parse card faces if multi-faced card
  const parsedFaces = useMemo(() => {
    if (!selectedCard?.card_faces) return null;
    try {
      const parsed = JSON.parse(selectedCard.card_faces);
      if (Array.isArray(parsed) && parsed.length > 1) {
        return parsed;
      }
    } catch {
      // not JSON
    }
    return null;
  }, [selectedCard]);

  // Current display image based on face
  const currentDisplayImage = useMemo(() => {
    if (parsedFaces && parsedFaces[activeFaceIndex]?.image_uris?.normal) {
      return parsedFaces[activeFaceIndex].image_uris.normal;
    }
    return selectedCard?.image_url || selectedCard?.image_small;
  }, [parsedFaces, activeFaceIndex, selectedCard]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search Scryfall & Catalog Magic Card"
      maxWidth="max-w-6xl"
    >
      <div className="space-y-4">
        {/* Search Bar & Autocomplete */}
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(query);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search card name (e.g. 'Lightning Bolt', 'Black Lotus') or syntax (e.g. 'c:u t:instant')..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Search</span>
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-28 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(suggestion);
                    executeSearch(suggestion);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 last:border-b-0 transition-colors"
                >
                  <span className="font-medium">{suggestion}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[560px]">
          {/* Left Column: Search Results List */}
          <div className="lg:col-span-5 border border-slate-800 rounded-xl bg-slate-950/50 p-3.5 flex flex-col h-[560px]">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80 text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                {searchResults.length > 0 ? `Results (${searchResults.length})` : "Card Results"}
              </span>
              <span className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-mono">
                <Database className="w-3 h-3 text-emerald-400" /> SQLite Sync
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin">
              {isSearching ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-400 mb-3" />
                  <p className="text-xs font-medium">Querying Scryfall API & SQLite Cache...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 text-center px-4">
                  <Search className="w-10 h-10 text-slate-700 mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Search for a Magic card above</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Try searching for <span className="text-indigo-400">"Lightning Bolt"</span>,{" "}
                    <span className="text-indigo-400">"Counterspell"</span>, or{" "}
                    <span className="text-indigo-400">"Black Lotus"</span>.
                  </p>
                </div>
              ) : (
                searchResults.map((card) => {
                  const isSelected = selectedCard?.scryfall_id === card.scryfall_id;
                  return (
                    <div
                      key={card.scryfall_id}
                      onClick={() => handleSelectCard(card)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500/50"
                          : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      {/* Card Thumbnail */}
                      <div className="w-12 h-16 bg-slate-800 rounded-md overflow-hidden shrink-0 border border-slate-700/60 shadow-xs">
                        <CardImage
                          scryfallId={card.scryfall_id}
                          remoteUrl={card.image_small || card.image_url}
                          alt={card.name}
                          size="small"
                          className="w-full h-full"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-100 truncate">{card.name}</p>
                          {card.mana_cost && (
                            <span className="text-[10px] font-mono font-bold text-indigo-300 shrink-0">
                              {card.mana_cost}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          <span className="text-indigo-400 font-mono font-bold uppercase">
                            {card.set_code}
                          </span>{" "}
                          #{card.collector_number} • {card.set_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                              card.rarity === "mythic"
                                ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                                : card.rarity === "rare"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : card.rarity === "uncommon"
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            {card.rarity}
                          </span>
                          <span className="text-[11px] text-emerald-400 font-bold ml-auto">
                            {formatPrice(card.price_eur)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Card Details, Printing Selector & Inventory Form */}
          <div className="lg:col-span-7 border border-slate-800 rounded-xl bg-slate-950/50 p-4 flex flex-col h-[560px] overflow-y-auto scrollbar-thin">
            {selectedCard ? (
              <form onSubmit={handleAddCardToInventory} className="space-y-4">
                {/* Selected Card Overview Card */}
                <div className="flex flex-col sm:flex-row gap-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
                  {/* Big Card Image */}
                  <div className="relative w-36 h-50 sm:w-32 sm:h-44 mx-auto sm:mx-0 shrink-0 rounded-lg overflow-hidden border border-slate-700 shadow-lg bg-slate-950">
                    <CardImage
                      scryfallId={selectedCard.scryfall_id}
                      remoteUrl={currentDisplayImage}
                      alt={selectedCard.name}
                      size="normal"
                      className="w-full h-full"
                    />
                    {parsedFaces && (
                      <button
                        type="button"
                        onClick={() => setActiveFaceIndex((prev) => (prev === 0 ? 1 : 0))}
                        className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 hover:bg-black text-[10px] text-indigo-300 border border-indigo-500/40 font-mono flex items-center gap-1 shadow-md"
                        title="Switch Card Face"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Face {activeFaceIndex + 1}/{parsedFaces.length}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-100 text-base leading-tight">
                          {selectedCard.name}
                        </h4>
                        {selectedCard.mana_cost && (
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold shrink-0">
                            {selectedCard.mana_cost}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{selectedCard.type_line}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        <span className="font-mono font-bold text-indigo-400 uppercase">
                          {selectedCard.set_code}
                        </span>{" "}
                        #{selectedCard.collector_number} • {selectedCard.set_name}
                        {selectedCard.released_at && ` (${selectedCard.released_at.split("-")[0]})`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 text-xs border-t border-slate-800/80 mt-2">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                        {selectedCard.rarity}
                      </span>
                      <div className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                        <span>Market:</span>
                        <span className="font-bold">{formatPrice(selectedCard.price_eur)}</span>
                        {selectedCard.price_eur_foil != null && (
                          <span className="text-amber-400 ml-1">
                            (Foil: {formatPrice(selectedCard.price_eur_foil)})
                          </span>
                        )}
                      </div>
                      {selectedCard.scryfall_uri && (
                        <a
                          href={selectedCard.scryfall_uri}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 text-[11px] ml-auto transition-colors"
                        >
                          Scryfall <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Printings & Editions Gallery */}
                <div className="border border-slate-800 rounded-xl bg-slate-900/60 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Editions & Printings ({filteredPrintings.length}
                        {filteredPrintings.length !== printings.length && ` of ${printings.length}`})
                      </label>
                      {isLoadingPrintings && (
                        <span className="text-[11px] text-indigo-400 flex items-center gap-1 font-medium">
                          <Loader2 className="w-3 h-3 animate-spin" /> Loading editions...
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPaperOnlyFilter(!paperOnlyFilter)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                          paperOnlyFilter
                            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                            : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}
                      >
                        {paperOnlyFilter ? "Paper Printings Only" : "All Editions"}
                      </button>
                      <input
                        type="text"
                        value={printingFilterQuery}
                        onChange={(e) => setPrintingFilterQuery(e.target.value)}
                        placeholder="Filter set/year..."
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 w-28 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Printings Scrollable Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                    {filteredPrintings.map((p) => {
                      const isCurrent = p.scryfall_id === selectedCard.scryfall_id;
                      const year = p.released_at ? p.released_at.split("-")[0] : "";
                      return (
                        <button
                          key={p.scryfall_id}
                          type="button"
                          onClick={() => handleSelectPrinting(p)}
                          className={`p-2 rounded-lg border text-left text-xs transition-all flex flex-col justify-between ${
                            isCurrent
                              ? "bg-indigo-600 text-white border-indigo-400 font-semibold shadow-md ring-1 ring-white/20"
                              : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono font-bold text-[11px] uppercase">
                              {p.set_code}
                            </span>
                            <span className={`text-[10px] font-mono ${isCurrent ? "text-indigo-200" : "text-slate-400"}`}>
                              #{p.collector_number}
                            </span>
                          </div>
                          <div className={`text-[11px] truncate w-full mt-0.5 ${isCurrent ? "text-white" : "text-slate-300"}`}>
                            {p.set_name}
                          </div>
                          <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-slate-800/50 text-[10px]">
                            <span className={isCurrent ? "text-indigo-200" : "text-slate-400"}>
                              {year}
                            </span>
                            <span className={`font-bold ${isCurrent ? "text-white" : "text-emerald-400"}`}>
                              {formatPrice(p.price_eur)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Configuration Fields Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Finish</label>
                    <select
                      value={finish}
                      onChange={(e) => handleFinishChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      {selectedCard.finishes.includes("nonfoil") && (
                        <option value="nonfoil">Non-foil</option>
                      )}
                      {selectedCard.finishes.includes("foil") && (
                        <option value="foil">Foil</option>
                      )}
                      {selectedCard.finishes.includes("etched") && (
                        <option value="etched">Etched</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="NM">Near Mint (NM)</option>
                      <option value="LP">Lightly Played (LP)</option>
                      <option value="MP">Moderately Played (MP)</option>
                      <option value="HP">Heavily Played (HP)</option>
                      <option value="DMG">Damaged (DMG)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                    >
                      <option value="en">English (EN)</option>
                      <option value="it">Italian (IT)</option>
                      <option value="de">German (DE)</option>
                      <option value="fr">French (FR)</option>
                      <option value="es">Spanish (ES)</option>
                      <option value="ja">Japanese (JA)</option>
                    </select>
                  </div>
                </div>

                {/* Price & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Acquisition Price (EUR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1.5 text-slate-400 text-xs">€</span>
                      <input
                        type="text"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Storage Location
                    </label>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
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

                {/* Collections Selector */}
                {collections.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Assign to Collections
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {collections.map((col) => {
                        const isAssigned = selectedCollectionIds.includes(col.id);
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => toggleCollection(col.id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                              isAssigned
                                ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-semibold"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {isAssigned && <Check className="w-3 h-3 text-cyan-400" />}
                            <span>{col.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Near mint, pack fresh, signed by artist"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Add to Inventory</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 text-center">
                <Layers className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-300">No card selected</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Select a card from the results list on the left to browse all its printings and add it to your collection.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
