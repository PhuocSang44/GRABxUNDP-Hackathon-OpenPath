"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  count: number;
  getLeaves: (limit: number) => Promise<GeoJSON.Feature[]>;
  onClick: () => void;
}

export default function ClusterMarker({ count, getLeaves, onClick }: Props) {
  const [thumb, setThumb] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Fetch thumbnail from first leaf that has a photo — runs once on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    getLeaves(10)
      .then((leaves) => {
        for (const leaf of leaves) {
          const firstPhoto = leaf.properties?.firstPhoto as string | undefined;
          if (firstPhoto) {
            setThumb(firstPhoto);
            break;
          }
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scale the circle based on count
  const size = count >= 50 ? 60 : count >= 20 ? 52 : count >= 10 ? 46 : 40;
  const containerSize = size + (thumb !== null ? 22 : 0);
  const gradient =
    count >= 30
      ? "linear-gradient(135deg,#1d4ed8,#1e3a8a)"
      : count >= 10
      ? "linear-gradient(135deg,#3b82f6,#2563eb)"
      : "linear-gradient(135deg,#60a5fa,#3b82f6)";

  return (
    <div
      role="button"
      aria-label={`Cluster of ${count} locations`}
      onClick={onClick}
      className="relative cursor-pointer group select-none"
      style={{ width: containerSize, height: containerSize }}
    >
      {/* Photo thumbnail */}
      {thumb && (
        <div
          className="absolute top-0 right-0 rounded-full border-2 border-white overflow-hidden shadow-lg z-10 bg-gray-100"
          style={{ width: 28, height: 28 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Main circle */}
      <div
        className="absolute bottom-0 left-0 rounded-full flex flex-col items-center justify-center border-[3px] border-white shadow-lg transition-transform duration-150 group-hover:scale-110"
        style={{ width: size, height: size, background: gradient }}
      >
        <span
          className="text-white font-bold leading-none"
          style={{ fontSize: Math.round(size * 0.24) }}
        >
          ♿
        </span>
        <span
          className="text-white font-bold leading-none tabular-nums"
          style={{ fontSize: Math.round(size * 0.26) }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}
