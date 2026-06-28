"use client";

import { useState } from "react";
import { AccessibilityCheckpoint } from "@/lib/types";

interface Props {
  checkpoint: AccessibilityCheckpoint | null;
  onClose: () => void;
}

const WIDTH_LABELS: Record<string, string> = {
  narrow: "Narrow  (~0.9 m)",
  medium: "Medium  (~1.8 m)",
  wide:   "Wide  (~2.5 m+)",
};

const RATING_STYLES: Record<string, { bar: string; label: string; badge: string }> = {
  good:     { bar: "bg-green-500",  label: "Good",     badge: "bg-green-100 text-green-700 border-green-200" },
  moderate: { bar: "bg-yellow-400", label: "Moderate", badge: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  poor:     { bar: "bg-red-500",    label: "Poor",     badge: "bg-red-100 text-red-700 border-red-200" },
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Row({ icon, positive, label, value }: {
  icon: string; positive: boolean; label: string; value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`mt-0.5 font-bold shrink-0 ${positive ? "text-green-500" : "text-red-400"}`}>
        {icon}
      </span>
      <div>
        <span className="font-medium text-gray-700">{label}: </span>
        <span className="text-gray-600">{value}</span>
      </div>
    </div>
  );
}

export default function CheckpointPopup({ checkpoint, onClose }: Props) {
  const [imgError, setImgError] = useState(false);

  if (!checkpoint) return null;

  const style = RATING_STYLES[checkpoint.accessibility] ?? RATING_STYLES.moderate;
  const hasPhoto = Boolean(checkpoint.street_view_url) && !imgError;
  const isDemoImage = checkpoint.street_view_url?.startsWith("/demo/");
  const isAI = checkpoint.confidence >= 0.80 || isDemoImage;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/20 z-[5]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute bottom-0 left-0 right-0 md:top-4 md:right-4 md:bottom-auto md:left-auto md:w-80 bg-white md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden z-20 flex flex-col max-h-[90vh] md:max-h-[calc(100vh-6rem)]">
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Coloured top bar */}
        <div className={`h-1 shrink-0 ${style.bar}`} />

        {/* Street View photo */}
        {checkpoint.street_view_url && (
          <div className="relative w-full shrink-0 bg-gray-100 overflow-hidden" style={{ height: hasPhoto ? 160 : 0 }}>
            {!imgError && (
              <img
                src={checkpoint.street_view_url}
                alt="Street view at this checkpoint"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
            {/* Claude AI badge overlaid on photo */}
            {isAI && hasPhoto && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
                </svg>
                Claude AI
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="px-4 pt-3 pb-3 flex items-start justify-between gap-2 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">Accessibility Checkpoint</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${style.badge}`}>
                {style.label}
              </span>
              {/* AI badge when no photo */}
              {isAI && !hasPhoto && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
                  </svg>
                  Claude AI
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {checkpoint.lat.toFixed(5)},&nbsp;{checkpoint.lng.toFixed(5)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5 shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Detail rows */}
        <div className="px-4 py-3 space-y-2.5 overflow-y-auto">
          <Row
            icon={checkpoint.sidewalk ? "✓" : "✗"}
            positive={checkpoint.sidewalk}
            label="Sidewalk"
            value={checkpoint.sidewalk ? "Available" : "Not available"}
          />
          <Row
            icon="↔"
            label="Estimated Width"
            value={WIDTH_LABELS[checkpoint.width] ?? checkpoint.width}
            positive={checkpoint.width !== "narrow"}
          />
          <Row
            icon="≡"
            label="Surface"
            value={capitalize(checkpoint.surface)}
            positive={checkpoint.surface.includes("smooth") || checkpoint.surface === "asphalt"}
          />
          <Row
            icon={checkpoint.curb_ramp ? "✓" : "✗"}
            label="Curb Ramp"
            value={checkpoint.curb_ramp ? "Detected" : "Not detected"}
            positive={checkpoint.curb_ramp}
          />
          {checkpoint.obstacles.length > 0 && (
            <Row
              icon="⚠"
              label="Obstacles"
              value={checkpoint.obstacles.map(capitalize).join(", ")}
              positive={false}
            />
          )}

          {/* Confidence bar */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>AI confidence</span>
              <span className="font-semibold">{Math.round(checkpoint.confidence * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  checkpoint.confidence >= 0.8 ? "bg-green-400" :
                  checkpoint.confidence >= 0.6 ? "bg-yellow-400" : "bg-gray-400"
                }`}
                style={{ width: `${Math.round(checkpoint.confidence * 100)}%` }}
              />
            </div>
          </div>

          {checkpoint.analyzed_at && (
            <p className="text-xs text-gray-400">
              Analyzed&nbsp;
              {new Date(checkpoint.analyzed_at).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
