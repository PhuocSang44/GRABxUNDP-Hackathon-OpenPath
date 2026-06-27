"use client";

import { AccessibilityPoint } from "@/lib/types";
import { CATEGORY_CONFIG, getScoreColor, getScoreLabel, SCORE_BANDS } from "@/lib/markers";
import { getPointPhotos } from "@/lib/photos";
import PhotoCarousel from "./map/PhotoCarousel";

interface Props {
  point: AccessibilityPoint | null;
  onClose: () => void;
}

export default function PointPopup({ point, onClose }: Props) {
  if (!point) return null;

  const cfg = CATEGORY_CONFIG[point.category];
  const scoreColor = getScoreColor(point.accessibility_score);
  const scoreLabel = getScoreLabel(point.accessibility_score);
  const photos = getPointPhotos(point.id, point.category);

  const lastUpdated = point.last_updated
    ? new Date(point.last_updated).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="absolute top-4 right-4 z-10 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: `3px solid ${cfg.color}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
              style={{ backgroundColor: cfg.color }}
            >
              <cfg.IconComponent size={15} color={cfg.textColor} />
            </div>
            <span className="text-xs font-medium" style={{ color: cfg.color }}>
              {cfg.label}
              {point.verified && (
                <span className="ml-1.5 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full text-xs">
                  ✓ Verified
                </span>
              )}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0"
          >
            ×
          </button>
        </div>
        <h2 className="mt-2 font-bold text-gray-900 text-sm leading-snug">
          {point.name}
        </h2>
        {point.address && (
          <p className="mt-0.5 text-xs text-gray-500">{point.address}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Score */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={scoreColor} strokeWidth="3"
                  strokeDasharray={`${point.accessibility_score} ${100 - point.accessibility_score}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-900">
                  {point.accessibility_score}
                </span>
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: scoreColor }}>
                {scoreLabel}
              </div>
              <div className="text-xs text-gray-500">Accessibility score</div>
              {lastUpdated && (
                <div className="text-xs text-gray-400 mt-0.5">
                  Updated {lastUpdated}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Photo carousel */}
        {photos.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Community Photos ({photos.length})
            </div>
            <PhotoCarousel photos={photos} />
          </div>
        )}

        {/* Description */}
        {point.description && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">{point.description}</p>
          </div>
        )}

        {/* Feature pills */}
        {point.features.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Accessibility Features
            </div>
            <div className="flex flex-wrap gap-1.5">
              {point.features.map((f) => (
                <span
                  key={f}
                  className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs"
                >
                  <span>✓</span>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Issues */}
        {point.issues.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Current Issues
            </div>
            <div className="space-y-1">
              {point.issues.map((issue) => (
                <div
                  key={issue}
                  className="flex items-start gap-1.5 text-xs text-red-600"
                >
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amenity badges */}
        <div className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {point.has_ramp && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                ♿ Ramp
              </span>
            )}
            {point.has_toilet && (
              <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full text-xs">
                🚻 Accessible Toilet
              </span>
            )}
            {point.has_parking && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                🅿 Parking
              </span>
            )}
            {point.has_elevator && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">
                🛗 Elevator
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 shrink-0 flex gap-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 rounded-lg text-xs font-semibold text-white text-center transition-opacity hover:opacity-90"
          style={{ backgroundColor: cfg.color }}
        >
          Navigate
        </a>
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Report Issue
        </button>
      </div>
    </div>
  );
}
