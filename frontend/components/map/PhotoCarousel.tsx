"use client";

import { useState } from "react";
import { PhotoItem } from "@/lib/types";
import ImageViewer from "./ImageViewer";

interface Props {
  photos: PhotoItem[];
}

export default function PhotoCarousel({ photos }: Props) {
  const [current, setCurrent] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  if (photos.length === 0) return null;

  const photo = photos[current];

  return (
    <>
      <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video w-full">
        {/* Placeholder shimmer */}
        {!loaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.url}
          src={photo.url}
          alt={photo.caption ?? ""}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className={`w-full h-full object-cover cursor-zoom-in transition-opacity ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setViewerIndex(current)}
        />

        {/* Caption overlay */}
        {photo.caption && loaded && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 px-3 py-2">
            <p className="text-white text-xs leading-snug line-clamp-2">{photo.caption}</p>
          </div>
        )}

        {/* Nav buttons */}
        {photos.length > 1 && (
          <>
            <button
              disabled={current === 0}
              onClick={() => { setLoaded(false); setCurrent((c) => c - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm disabled:opacity-30 hover:bg-black/70 transition-colors"
            >
              ‹
            </button>
            <button
              disabled={current === photos.length - 1}
              onClick={() => { setLoaded(false); setCurrent((c) => c + 1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-sm disabled:opacity-30 hover:bg-black/70 transition-colors"
            >
              ›
            </button>
          </>
        )}

        {/* Expand icon */}
        <button
          onClick={() => setViewerIndex(current)}
          className="absolute top-2 right-2 w-6 h-6 rounded bg-black/50 text-white flex items-center justify-center text-xs hover:bg-black/70 transition-colors"
          aria-label="View full size"
        >
          ⤢
        </button>
      </div>

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => { setLoaded(false); setCurrent(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === current ? "bg-blue-500 w-3" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      {viewerIndex !== null && (
        <ImageViewer
          photos={photos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
