"use client";

import { useEffect } from "react";
import { PhotoItem } from "@/lib/types";

interface Props {
  photos: PhotoItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

export default function ImageViewer({ photos, index, onIndexChange, onClose }: Props) {
  const photo = photos[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < photos.length - 1) onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, photos.length, onClose, onIndexChange]);

  return (
    <div
      className="fixed inset-0 bg-black/92 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-4xl z-10 leading-none p-2 -m-2"
        aria-label="Close"
      >
        ×
      </button>

      {/* Prev */}
      {index > 0 && (
        <button
          className="absolute left-2 sm:left-4 text-white/60 hover:text-white text-5xl z-10 px-2 sm:px-3 py-8 select-none"
          onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1); }}
          aria-label="Previous"
        >
          ‹
        </button>
      )}

      {/* Image */}
      <div className="max-w-5xl w-full px-12 sm:px-16" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption ?? ""}
          className="max-h-[80vh] w-full object-contain rounded-xl shadow-2xl"
        />
        {photo.caption && (
          <p className="text-white/80 text-sm text-center mt-3">{photo.caption}</p>
        )}
        <p className="text-white/40 text-xs text-center mt-1">
          {index + 1} / {photos.length}
        </p>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onIndexChange(i)}
                className={`w-12 h-8 rounded overflow-hidden border-2 transition-all ${
                  i === index ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Next */}
      {index < photos.length - 1 && (
        <button
          className="absolute right-2 sm:right-4 text-white/60 hover:text-white text-5xl z-10 px-2 sm:px-3 py-8 select-none"
          onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1); }}
          aria-label="Next"
        >
          ›
        </button>
      )}
    </div>
  );
}
