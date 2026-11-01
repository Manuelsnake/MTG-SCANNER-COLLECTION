import React, { useMemo, useState } from "react";
import { ExternalLink, Layers, MapPin, Maximize2, RefreshCw, Tag } from "lucide-react";
import { Modal } from "./Modal";
import { CardImage } from "./CardImage";
import { ImageZoomModal } from "./ImageZoomModal";
import type { CollectionSummary, InventoryItemDetail, ScryfallCardFace } from "../types";

interface CardZoomModalProps {
  item: InventoryItemDetail | null;
  collections: CollectionSummary[];
  onClose: () => void;
}

export const CardZoomModal: React.FC<CardZoomModalProps> = ({
  item,
  collections,
  onClose,
}) => {
  const [activeFaceIndex, setActiveFaceIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  const itemCollections = collections.filter((c) =>
    item?.collection_ids.includes(c.id)
  );

  // Parse card faces for transform / double-faced cards
  const parsedFaces = useMemo<ScryfallCardFace[] | null>(() => {
    if (!item?.card_faces) return null;
    try {
      const parsed =
        typeof item.card_faces === "string"
          ? JSON.parse(item.card_faces)
          : item.card_faces;
      if (Array.isArray(parsed) && parsed.length > 1) {
        return parsed;
      }
    } catch {
      // not JSON
    }
    return null;
  }, [item]);

  const currentImageUrl = useMemo(() => {
    if (parsedFaces && parsedFaces[activeFaceIndex]) {
      const face = parsedFaces[activeFaceIndex];
      return (
        face.image_uris?.large ||
        face.image_uris?.normal ||
        face.image_uris?.small ||
        item?.image_url
      );
    }
    return item?.image_url || item?.image_small;
  }, [parsedFaces, activeFaceIndex, item]);

  if (!item) return null;

  const modalTitle =
    item.printed_name && item.printed_name !== item.card_name
      ? `${item.printed_name} (${item.card_name})`
      : item.card_name;

  return (
    <>
      <Modal
        isOpen={!!item}
        onClose={onClose}
        title={modalTitle}
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          {/* Card Artwork with Face Toggle & Lightbox Trigger */}
          <div
            className="relative w-64 sm:w-72 aspect-[2.5/3.5] shrink-0 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950 group cursor-pointer hover:border-indigo-500/70 transition-all"
            onClick={() => setIsLightboxOpen(true)}
            title="Click to view full high-resolution image"
          >
            <CardImage
              scryfallId={item.scryfall_id}
              remoteUrl={currentImageUrl}
              alt={item.card_name}
              size="normal"
              className="w-full h-full group-hover:scale-105 transition-transform duration-300"
            />

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none">
              <div className="p-2 rounded-full bg-black/80 text-white shadow-lg border border-white/20">
                <Maximize2 className="w-5 h-5 text-indigo-300" />
              </div>
              <span className="text-[11px] font-semibold text-white bg-black/75 px-2 py-0.5 rounded shadow">
                Full Image
              </span>
            </div>

            {/* Double-faced Flip Button */}
            {parsedFaces && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFaceIndex((prev) => (prev === 0 ? 1 : 0));
                }}
                className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-black/85 hover:bg-black text-[11px] text-indigo-300 border border-indigo-500/50 font-semibold flex items-center gap-1 shadow-lg z-10"
                title="Switch Card Face"
              >
                <RefreshCw className="w-3 h-3" />
                <span>
                  Face {activeFaceIndex + 1}/{parsedFaces.length}
                </span>
              </button>
            )}
          </div>

        {/* Card Metadata */}
        <div className="flex-1 space-y-4 text-xs w-full">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {item.printed_name || item.card_name}
                </h3>
                {item.printed_name && item.printed_name !== item.card_name && (
                  <p className="text-xs text-indigo-300 italic mt-0.5">
                    Oracle Name: <span className="text-slate-200 font-semibold">{item.card_name}</span>
                  </p>
                )}
              </div>
              {item.mana_cost && (
                <span className="font-mono text-sm px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold shrink-0">
                  {item.mana_cost}
                </span>
              )}
            </div>
            <p className="text-slate-400 mt-1">
              <span className="font-mono font-bold text-indigo-400 uppercase">
                {item.set_code}
              </span>{" "}
              #{item.collector_number} • {item.set_name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px]">Quantity</span>
              <span className="text-slate-100 font-bold text-sm">{item.quantity}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Finish</span>
              <span
                className={`capitalize font-bold text-xs ${
                  item.finish === "foil"
                    ? "text-amber-400"
                    : item.finish === "etched"
                    ? "text-purple-400"
                    : "text-slate-200"
                }`}
              >
                {item.finish}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Condition</span>
              <span className="font-bold text-emerald-400">{item.condition}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Language</span>
              <span className="font-mono uppercase text-slate-200">{item.language}</span>
            </div>
          </div>

          {item.location_name && (
            <div className="flex items-center gap-2 text-slate-300 p-2 rounded bg-slate-800/40 border border-slate-800">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Location: <strong>{item.location_name}</strong></span>
            </div>
          )}

          {itemCollections.length > 0 && (
            <div>
              <span className="text-slate-400 block text-[11px] mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Collections:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {itemCollections.map((col) => (
                  <span
                    key={col.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-indigo-950/60 border border-indigo-700/50 text-indigo-300"
                  >
                    <Tag className="w-3 h-3" />
                    {col.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.purchase_price != null && (
            <div className="text-slate-300">
              <span className="text-slate-400">Purchase Price: </span>
              <span className="font-mono font-bold text-slate-100">
                €{(item.purchase_price / 100).toFixed(2)}
              </span>
            </div>
          )}

          {item.notes && (
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-slate-300 italic text-[11px]">
              "{item.notes}"
            </div>
          )}

          {item.scryfall_id && (
            <a
              href={`https://scryfall.com/card/${item.set_code.toLowerCase()}/${item.collector_number}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors pt-2 text-xs"
            >
              <span>View on Scryfall</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </Modal>

    {/* Full Screen Lightbox Zoom Modal */}
    <ImageZoomModal
      isOpen={isLightboxOpen}
      onClose={() => setIsLightboxOpen(false)}
      cardName={item.card_name}
      printedName={item.printed_name}
      setCode={item.set_code}
      collectorNumber={item.collector_number}
      setName={item.set_name}
      lang={item.language}
      scryfallId={item.scryfall_id}
      imageUrl={currentImageUrl}
      cardFaces={item.card_faces}
    />
  </>
  );
};
