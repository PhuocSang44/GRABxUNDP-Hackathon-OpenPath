"use client";

import { AccessibilityPoint, GalleryItem } from "@/lib/types";
import ReportPhotoCard from "./ReportPhotoCard";

interface Props {
  items: GalleryItem[];
  onSelectPoint: (point: AccessibilityPoint) => void;
  onClose: () => void;
}

export default function ClusterGallery({ items, onSelectPoint, onClose }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-2xl rounded-t-2xl max-h-[55vh] flex flex-col">
      {/* Handle + header */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-3" />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Community Reports</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {items.length} photo{items.length !== 1 ? "s" : ""} in this area — click to zoom
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            aria-label="Close gallery"
          >
            ×
          </button>
        </div>
      </div>

      {/* Photo grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {items.map((item) => (
            <ReportPhotoCard
              key={`${item.point.id}-${item.photo.id}`}
              item={item}
              onClick={() => {
                onClose();
                onSelectPoint(item.point);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
