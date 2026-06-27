"use client";

import { RoadSegment } from "@/lib/types";
import { scoreColor, scoreLabel } from "@/lib/accessibility";

interface Props {
  segment: RoadSegment | null;
  onClose: () => void;
}

function YesNo({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-gray-400">Unknown</span>;
  return value ? (
    <span className="text-green-600 font-medium">Yes</span>
  ) : (
    <span className="text-red-500 font-medium">No</span>
  );
}

export default function InfoPanel({ segment, onClose }: Props) {
  if (!segment) return null;

  const color = scoreColor(segment.accessibility_score);
  const label = scoreLabel(segment.accessibility_score);

  return (
    <div className="absolute top-4 right-4 z-10 w-80 bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm leading-snug">
          {segment.name ?? "Road Segment"}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Score */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ backgroundColor: color }}
          >
            {segment.accessibility_score ?? "?"}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{label}</div>
            <div className="text-xs text-gray-500">
              Confidence: {segment.confidence != null ? `${Math.round(segment.confidence * 100)}%` : "N/A"}
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Details */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Sidewalk</dt>
          <dd><YesNo value={segment.sidewalk} /></dd>

          {segment.sidewalk && (
            <>
              <dt className="text-gray-500">Side</dt>
              <dd className="capitalize text-gray-800">{segment.sidewalk_side ?? "—"}</dd>

              <dt className="text-gray-500">Width</dt>
              <dd className="text-gray-800">
                {segment.width_m != null ? `${segment.width_m} m` : "Unknown"}
              </dd>
            </>
          )}

          <dt className="text-gray-500">Surface</dt>
          <dd className="capitalize text-gray-800">{segment.surface ?? "Unknown"}</dd>

          <dt className="text-gray-500">Curb ramp</dt>
          <dd><YesNo value={segment.curb_ramp} /></dd>

          <dt className="text-gray-500">Stairs</dt>
          <dd><YesNo value={segment.stairs} /></dd>
        </dl>

        {segment.obstacles && segment.obstacles.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Obstacles</div>
              <div className="flex flex-wrap gap-1">
                {segment.obstacles.map((o) => (
                  <span
                    key={o}
                    className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs capitalize"
                  >
                    {o.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="text-xs text-gray-400 pt-1">
          Source: {segment.source ?? "manual"}
        </div>
      </div>
    </div>
  );
}
