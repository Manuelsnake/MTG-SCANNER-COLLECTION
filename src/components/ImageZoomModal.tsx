import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import { CardImage } from "./CardImage";
import type { ScryfallCardFace } from "../types";

export interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  printedName?: string | null;
  setCode: string;
  collectorNumber: string;
  setName?: string | null;
  lang?: string | null;
  scryfallId?: string | null;
  imageUrl?: string | null;
  cardFaces?: ScryfallCardFace[] | string | null;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  isOpen,
  onClose,
  cardName,
  printedName,
  setCode,
  collectorNumber,
  setName,
  lang,
  scryfallId,
  imageUrl,
  cardFaces,
}) => {
  const [activeFaceIndex, setActiveFaceIndex] = useState<number>(0);

  // Reset face index when card changes or modal opens
  useEffect(() => {
    setActiveFaceIndex(0);
  }, [scryfallId, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Parse card faces for double-faced / transform cards
  const parsedFaces = useMemo<ScryfallCardFace[] | null>(() => {
    if (!cardFaces) return null;
    if (Array.isArray(cardFaces) && cardFaces.length > 1) {
      return cardFaces;
    }
    if (typeof cardFaces === "string") {
      try {
        const parsed = JSON.parse(cardFaces);
        if (Array.isArray(parsed) && parsed.length > 1) {
          return parsed;
        }
      } catch {
        // Not JSON
      }
    }
    return null;
  }, [cardFaces]);

  // Determine current image URL based on active face
  const currentImageUrl = useMemo(() => {
    if (parsedFaces && parsedFaces[activeFaceIndex]) {
      const face = parsedFaces[activeFaceIndex];
      return (
        face.image_uris?.large ||
        face.image_uris?.normal ||
        face.image_uris?.small ||
        imageUrl
      );
    }
    return imageUrl;
  }, [parsedFaces, activeFaceIndex, imageUrl]);

  // Active face name
  const currentDisplayName = useMemo(() => {
    if (parsedFaces && parsedFaces[activeFaceIndex]) {
      const face = parsedFaces[activeFaceIndex];
      return face.printed_name || face.name;
    }
    return printedName || cardName;
  }, [parsedFaces, activeFaceIndex, printedName, cardName]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full flex flex-col items-center max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="w-full flex items-center justify-between pb-3 text-slate-200">
          <div className="min-w-0 pr-2">
            <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate">
              {currentDisplayName}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              <span className="text-indigo-400 font-bold uppercase">{setCode}</span>{" "}
              #{collectorNumber}
              {setName && ` • ${setName}`}
              {lang && ` • [${lang.toUpperCase()}]`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0 shadow-md"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Image Display Area - Preserving 2.5:3.5 Aspect Ratio */}
        <div className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-[2.5/3.5] max-h-[75vh] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950 flex items-center justify-center">
          <CardImage
            scryfallId={scryfallId}
            remoteUrl={currentImageUrl}
            alt={currentDisplayName}
            size="normal"
            className="w-full h-full object-contain"
          />

          {/* Double-faced Flip Button */}
          {parsedFaces && (
            <button
              type="button"
              onClick={() =>
                setActiveFaceIndex((prev) => (prev === 0 ? 1 : 0))
              }
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/85 hover:bg-black text-xs text-indigo-300 border border-indigo-500/50 font-semibold flex items-center gap-1.5 shadow-xl transition-all hover:scale-105"
              title="Flip Card Face"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin-hover" />
              <span>
                Face {activeFaceIndex + 1}/{parsedFaces.length}
              </span>
            </button>
          )}
        </div>

        {/* Footer Link */}
        <div className="w-full flex items-center justify-between pt-3 text-xs text-slate-400">
          <span className="text-[11px] text-slate-400">
            Click outside or press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">Esc</kbd> to close
          </span>
          {scryfallId && (
            <a
              href={`https://scryfall.com/card/${setCode.toLowerCase()}/${collectorNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline transition-colors text-xs"
            >
              <span>View on Scryfall</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
