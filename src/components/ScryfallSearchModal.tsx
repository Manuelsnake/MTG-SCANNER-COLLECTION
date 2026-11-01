import React, { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { Modal } from "./Modal";
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

  const executeSearch = useCallback(async (searchQuery: string) => {
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
        // Automatically select the single result
        handleSelectCard(results[0]);
      }
    } catch (err) {
      console.error("Scryfall search failed:", err);
      setErrorMsg(String(err));
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectCard = async (card: ScryfallSearchResult) => {
    setSelectedCard(card);
    setErrorMsg(null);
    setSuccessMsg(null);

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

    // Fetch all printings if oracle_id is available
    if (card.oracle_id) {
      setIsLoadingPrintings(true);
      try {
        const prints = await api.scryfallGetPrintings(card.oracle_id);
        setPrintings(prints);
      } catch (err) {
        console.warn("Could not load other printings:", err);
        setPrintings([card]);
      } finally {
        setIsLoadingPrintings(false);
      }
    } else {
      setPrintings([card]);
    }
  };

  const handleSelectPrinting = (printing: ScryfallSearchResult) => {
    setSelectedCard(printing);

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
  };

  // Switch price suggestion when toggling between foil and nonfoil
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
      await onCardAdded();
      setSuccessMsg(`Added ${quantity}x "${selectedCard.name}" (${selectedCard.set_code})!`);
      // Reset form quantity
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search & Add Card via Scryfall"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
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
                placeholder="Search by card name, syntax (e.g. t:creature c:u), or set..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-24 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(suggestion);
                    executeSearch(suggestion);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 last:border-b-0"
                >
                  <span>{suggestion}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[380px]">
          {/* Left Column: Search Results List */}
          <div className="md:col-span-5 border border-slate-800 rounded-lg bg-slate-950/40 p-3 flex flex-col h-[460px]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                {searchResults.length > 0 ? `Results (${searchResults.length})` : "Card Results"}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" /> SQLite Cached
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isSearching ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
                  <p className="text-xs">Querying Scryfall API & Cache...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 text-center px-4">
                  <Search className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs">Search for a Magic: The Gathering card above.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Try typing "Lightning Bolt", "Sol Ring", or "Atraxa".
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
                          ? "bg-indigo-600/15 border-indigo-500/60 shadow-xs"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-14 bg-slate-800 rounded overflow-hidden shrink-0 border border-slate-700/50 flex items-center justify-center">
                        {card.image_small || card.image_url ? (
                          <img
                            src={card.image_small || card.image_url || ""}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-100 truncate">{card.name}</p>
                          {card.mana_cost && (
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {card.mana_cost}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          <span className="text-indigo-400 font-mono font-medium">{card.set_code}</span>{" "}
                          #{card.collector_number} • {card.set_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {card.rarity}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-medium">
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

          {/* Right Column: Card Details & Add to Inventory Form */}
          <div className="md:col-span-7 border border-slate-800 rounded-lg bg-slate-950/40 p-4 flex flex-col h-[460px] overflow-y-auto">
            {selectedCard ? (
              <form onSubmit={handleAddCardToInventory} className="space-y-4">
                {/* Selected Card Header & Image */}
                <div className="flex gap-4 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="w-20 h-28 bg-slate-800 rounded-md overflow-hidden shrink-0 border border-slate-700 shadow-md">
                    {selectedCard.image_url ? (
                      <img
                        src={selectedCard.image_url}
                        alt={selectedCard.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-100 text-sm leading-tight">
                          {selectedCard.name}
                        </h4>
                        {selectedCard.mana_cost && (
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold shrink-0">
                            {selectedCard.mana_cost}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{selectedCard.type_line}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        <span className="font-mono text-indigo-400 font-medium">
                          {selectedCard.set_code}
                        </span>{" "}
                        #{selectedCard.collector_number} • {selectedCard.set_name}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                      <span className="capitalize px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                        {selectedCard.rarity}
                      </span>
                      <div className="text-emerald-400 font-medium text-[11px]">
                        Market EUR:{" "}
                        <span className="font-bold">{formatPrice(selectedCard.price_eur)}</span>
                        {selectedCard.price_eur_foil != null && (
                          <span className="text-amber-400 ml-1.5">
                            (Foil: {formatPrice(selectedCard.price_eur_foil)})
                          </span>
                        )}
                      </div>
                      {selectedCard.scryfall_uri && (
                        <a
                          href={selectedCard.scryfall_uri}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 text-[11px] ml-auto"
                        >
                          Scryfall <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Printings / Editions Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                      Select Printing / Edition
                    </label>
                    {isLoadingPrintings && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading printings...
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {printings.map((p) => {
                      const isCurrent = p.scryfall_id === selectedCard.scryfall_id;
                      return (
                        <button
                          key={p.scryfall_id}
                          type="button"
                          onClick={() => handleSelectPrinting(p)}
                          className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                            isCurrent
                              ? "bg-indigo-600 text-white border-indigo-500 font-semibold shadow-xs"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80"
                          }`}
                        >
                          <div className="font-mono text-[11px] uppercase">{p.set_code} #{p.collector_number}</div>
                          <div className={`text-[10px] truncate max-w-[110px] ${isCurrent ? "text-indigo-100" : "text-slate-400"}`}>
                            {p.set_name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Configuration Fields Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Finish</label>
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
                    <label className="block text-xs font-medium text-slate-300 mb-1">Condition</label>
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
                    <label className="block text-xs font-medium text-slate-300 mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
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
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Acquisition Price (EUR)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1.5 text-slate-400 text-xs">€</span>
                      <input
                        type="text"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
                                ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Near mint, signed by artist, bought at local store"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
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
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 text-center">
                <Layers className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs">No card selected.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select a card from the results list on the left to configure finish, condition, and
                  inventory destination.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
