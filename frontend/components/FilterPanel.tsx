"use client";

import { CATEGORY_CONFIG } from "@/lib/markers";
import { DEFAULT_FILTERS, FilterState, PointCategory } from "@/lib/types";

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  visible: boolean;
  onClose: () => void;
  total: number;
  filtered: number;
}

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as PointCategory[];

export default function FilterPanel({ filters, onChange, visible, onClose, total, filtered }: Props) {
  if (!visible) return null;

  function toggleCategory(cat: PointCategory) {
    const has = filters.categories.includes(cat);
    onChange({
      ...filters,
      categories: has
        ? filters.categories.filter((c) => c !== cat)
        : [...filters.categories, cat],
    });
  }

  const allSelected = filters.categories.length === 0;

  return (
    <div className="absolute top-0 left-0 h-full w-72 bg-white shadow-2xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="font-bold text-gray-900 text-sm">Filters</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {filtered} of {total} locations
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Categories */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Categories
            </span>
            <button
              onClick={() => onChange({ ...filters, categories: [] })}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              All
            </button>
          </div>
          <div className="space-y-1.5">
            {ALL_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const active =
                allSelected || filters.categories.includes(cat);
              return (
                <label
                  key={cat}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleCategory(cat)}
                    className="sr-only"
                  />
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-opacity ${
                      active ? "opacity-100" : "opacity-30"
                    }`}
                    style={{ backgroundColor: cfg.color }}
                  >
                    <cfg.IconComponent size={14} color={cfg.textColor} />
                  </div>
                  <span
                    className={`text-sm transition-colors ${
                      active ? "text-gray-800" : "text-gray-400"
                    }`}
                  >
                    {cfg.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Score slider */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Min Score
            </span>
            <span className="text-sm font-bold text-gray-900">
              {filters.minScore}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={filters.minScore}
            onChange={(e) =>
              onChange({ ...filters, minScore: Number(e.target.value) })
            }
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 shrink-0">
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Reset all filters
        </button>
      </div>
    </div>
  );
}
