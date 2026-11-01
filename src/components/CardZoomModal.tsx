import React from "react";
import { ExternalLink, Layers, MapPin, Tag } from "lucide-react";
import { Modal } from "./Modal";
import { CardImage } from "./CardImage";
import type { CollectionSummary, InventoryItemDetail } from "../types";

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
  if (!item) return null;

  const itemCollections = collections.filter((c) =>
    item.collection_ids.includes(c.id)
  );

  const modalTitle =
    item.printed_name && item.printed_name !== item.card_name
      ? `${item.printed_name} (${item.card_name})`
      : item.card_name;

  return (
    <Modal
      isOpen={!!item}
      onClose={onClose}
      title={modalTitle}
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        {/* Card Artwork */}
        <div className="w-64 h-[358px] shrink-0 rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950">
          <CardImage
            scryfallId={item.scryfall_id}
            remoteUrl={item.image_url}
            alt={item.card_name}
            size="normal"
            className="w-full h-full"
          />
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
  );
};
