"use client";

import { useState } from "react";
import { CATEGORY_CONFIG, SCORE_BANDS } from "@/lib/markers";

export default function Legend() {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute bottom-10 left-4 z-10">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <span>Legend</span>
          <span className="text-gray-400">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
            {/* Score colors */}
            <div>
              <div className="text-xs font-medium text-gray-500 mt-2 mb-1.5 uppercase tracking-wide">
                Score Ring
              </div>
              <div className="space-y-1">
                {SCORE_BANDS.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="text-xs text-gray-600">
                      {b.min}–{b.max} {b.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Categories
              </div>
              <div className="space-y-1">
                {(Object.entries(CATEGORY_CONFIG) as [string, (typeof CATEGORY_CONFIG)[keyof typeof CATEGORY_CONFIG]][]).map(
                  ([, cfg]) => (
                    <div key={cfg.label} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: cfg.color, color: cfg.textColor }}
                      >
                        {cfg.icon}
                      </div>
                      <span className="text-xs text-gray-600">{cfg.label}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
