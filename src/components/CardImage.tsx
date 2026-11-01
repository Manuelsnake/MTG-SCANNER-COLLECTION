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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    if (!scryfallId && !remoteUrl) {
      setImageSrc(null);
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
        if (remoteUrl) {
          if (isMounted) {
            setImageSrc(remoteUrl);
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
          // If IPC failed, try remote URL directly
          if (remoteUrl) {
            setImageSrc(remoteUrl);
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
        className={`bg-slate-900 border border-slate-800 rounded flex flex-col items-center justify-center text-slate-600 select-none ${className} ${cursorClass}`}
        onClick={onClick}
        title={alt}
      >
        <ImageIcon className="w-5 h-5 opacity-40 mb-1" />
        <span className="text-[10px] text-slate-400 font-mono px-1 text-center truncate max-w-full">
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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-200"
          onError={() => {
            if (imageSrc !== remoteUrl && remoteUrl) {
              setImageSrc(remoteUrl);
            } else {
              setHasError(true);
            }
          }}
          loading="lazy"
        />
      )}
    </div>
  );
};
