"use client";

import { useState } from "react";
import { GalleryItem } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/markers";
import { formatRelativeTime } from "@/lib/photos";

interface Props {
  item: GalleryItem;
  onClick: () => void;
}

export default function ReportPhotoCard({ item, onClick }: Props) {
  const { point, photo } = item;
  const cfg = CATEGORY_CONFIG[point.category];
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-xl overflow-hidden border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all text-left bg-white"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbUrl}
          alt={photo.caption ?? ""}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Category badge */}
        <div
          className="absolute top-2 left-2 flex items-center justify-center w-5 h-5 rounded text-xs font-bold shadow"
          style={{ backgroundColor: cfg.color, color: cfg.textColor }}
        >
          {cfg.icon}
        </div>
      </div>

      {/* Content */}
      <div className="px-2.5 py-2 flex-1">
        <p className="text-xs font-semibold text-gray-800 line-clamp-1 leading-snug">
          {point.name}
        </p>
        {photo.caption && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-snug">
            {photo.caption}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(photo.created_at)}</p>
      </div>
    </button>
  );
}
