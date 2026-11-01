import React, { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { api } from "../services/api";

interface CardImageProps {
  scryfallId?: string | null;
  remoteUrl?: string | null;
  alt: string;
  size?: "small" | "normal" | "art_crop";
  className?: string;
  onClick?: () => void;
  showZoomCursor?: boolean;
}

export const CardImage: React.FC<CardImageProps> = ({
  scryfallId,
  remoteUrl,
  alt,
  size = "normal",
  className = "",
  onClick,
  showZoomCursor = false,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(scryfallId || remoteUrl));
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (!scryfallId && !remoteUrl) {
      setImageSrc(null);
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        if (scryfallId) {
          const cachedOrDownloaded = await api.getCardImage(
            scryfallId,
            remoteUrl || null,
            size
          );
          if (isMounted && cachedOrDownloaded) {
            setImageSrc(cachedOrDownloaded);
            setIsLoading(false);
            return;
          }
        }

        // Fallback to direct remote URL if backend image cache didn't return data
        if (remoteUrl && remoteUrl.trim()) {
          if (isMounted) {
            setImageSrc(remoteUrl.trim());
            setIsLoading(false);
            return;
          }
        }

        // Direct Scryfall CDN fallback if UUID is available
        if (scryfallId && scryfallId.trim().length === 36) {
          const cleanId = scryfallId.trim();
          const c1 = cleanId[0];
          const c2 = cleanId[1];
          const cdnSize = size === "small" ? "small" : size === "art_crop" ? "art_crop" : "normal";
          const fallbackCdn = `https://cards.scryfall.io/${cdnSize}/front/${c1}/${c2}/${cleanId}.jpg`;
          if (isMounted) {
            setImageSrc(fallbackCdn);
            setIsLoading(false);
            return;
          }
        }

        if (isMounted) {
          setImageSrc(null);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          if (remoteUrl) {
            setImageSrc(remoteUrl);
          } else if (scryfallId && scryfallId.trim().length === 36) {
            const cleanId = scryfallId.trim();
            const cdnSize = size === "small" ? "small" : "normal";
            setImageSrc(`https://cards.scryfall.io/${cdnSize}/front/${cleanId[0]}/${cleanId[1]}/${cleanId}.jpg`);
          } else {
            setHasError(true);
          }
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [scryfallId, remoteUrl, size]);

  const cursorClass = onClick || showZoomCursor ? "cursor-pointer hover:opacity-95" : "";

  if (hasError || (!imageSrc && !isLoading)) {
    return (
      <div
        className={`bg-slate-900 border border-slate-800 rounded flex flex-col items-center justify-center text-slate-500 select-none p-2 ${className} ${cursorClass}`}
        onClick={onClick}
        title={alt}
      >
        <ImageIcon className="w-6 h-6 opacity-40 mb-1 text-slate-400" />
        <span className="text-[10px] text-slate-400 font-mono text-center truncate max-w-full">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-slate-900 overflow-hidden rounded ${className} ${cursorClass}`}
      onClick={onClick}
    >
      {isLoading && !imageSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-contain transition-transform duration-200"
          onError={() => {
            if (imageSrc !== remoteUrl && remoteUrl) {
              setImageSrc(remoteUrl);
            } else if (
              scryfallId &&
              scryfallId.trim().length === 36 &&
              !imageSrc.includes("cards.scryfall.io")
            ) {
              const cleanId = scryfallId.trim();
              const cdnSize = size === "small" ? "small" : "normal";
              setImageSrc(`https://cards.scryfall.io/${cdnSize}/front/${cleanId[0]}/${cleanId[1]}/${cleanId}.jpg`);
            } else {
              setHasError(true);
            }
          }}
          loading={imageSrc.startsWith("data:") ? "eager" : "lazy"}
        />
      )}
    </div>
  );
};
