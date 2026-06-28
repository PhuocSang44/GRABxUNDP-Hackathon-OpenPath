"use client";

import { useState } from "react";
import { CATEGORY_CONFIG, SCORE_BANDS } from "@/lib/markers";

export default function Legend() {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute bottom-10 left-4 z-10 hidden md:block">
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
            {/* Categories */}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Categories
              </div>
              <div className="space-y-1">
                {(Object.entries(CATEGORY_CONFIG) as [string, (typeof CATEGORY_CONFIG)[keyof typeof CATEGORY_CONFIG]][]).map(
                  ([, cfg]) => {
                    const Icon = cfg.IconComponent;
                    return (
                      <div key={cfg.label} className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cfg.color }}
                        >
                          <Icon size={11} color={cfg.textColor} />
                        </div>
                        <span className="text-xs text-gray-600">{cfg.label}</span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
