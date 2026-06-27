"use client";

import { useState, useRef } from "react";
import { PointCategory } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/markers";

const ISSUE_CATEGORIES: PointCategory[] = [
  "community_report",
  "accessibility_issue",
  "blocked_sidewalk",
  "construction",
  "broken_curb_ramp",
];

const POI_CATEGORIES: PointCategory[] = [
  "wheelchair_ramp",
  "accessible_parking",
  "accessible_toilet",
  "accessible_entrance",
  "bus_stop",
  "hospital",
];

interface Props {
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmitSuccess: () => void;
  onCategoryChange?: (cat: PointCategory) => void;
}

export default function ReportForm({ lat, lng, onClose, onSubmitSuccess, onCategoryChange }: Props) {
  const [category, setCategory] = useState<PointCategory>("community_report");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCategoryChange = (cat: PointCategory) => {
    setCategory(cat);
    onCategoryChange?.(cat);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const removePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("lat", lat.toString());
    formData.append("lng", lng.toString());
    formData.append("category", category);
    formData.append("description", description);
    if (file) formData.append("photo", file);

    try {
      const res = await fetch("http://localhost:8000/api/reports", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to submit report");
      onSubmitSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cfg = CATEGORY_CONFIG[category];

  return (
    <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:w-80 overflow-hidden max-h-[90vh] md:max-h-[calc(100vh-6rem)] flex flex-col">
      {/* Mobile drag handle */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>
      {/* Category-coloured accent bar */}
      <div className="h-1 shrink-0 transition-colors duration-200" style={{ backgroundColor: cfg.color }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200"
            style={{ backgroundColor: cfg.color }}
          >
            <cfg.IconComponent size={17} color={cfg.textColor} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight">Submit a Report</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5 shrink-0 p-2 -m-2"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="px-4 pb-4 space-y-3.5">

          {/* Issue type picker */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Issue</p>
            <div className="grid grid-cols-5 gap-1">
              {ISSUE_CATEGORIES.map((cat) => {
                const c = CATEGORY_CONFIG[cat];
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    title={c.label}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all duration-150 ${
                      active
                        ? "shadow-sm bg-white"
                        : "border-transparent hover:border-gray-100 hover:bg-gray-50"
                    }`}
                    style={active ? { borderColor: c.color } : {}}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity duration-150"
                      style={{ backgroundColor: c.color, opacity: active ? 1 : 0.45 }}
                    >
                      <c.IconComponent size={14} color={c.textColor} />
                    </div>
                    <span
                      className="text-[9px] leading-tight text-center line-clamp-2 transition-colors duration-150"
                      style={{ color: active ? c.color : "#9ca3af" }}
                    >
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location / POI type picker */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Location</p>
            <div className="grid grid-cols-6 gap-1">
              {POI_CATEGORIES.map((cat) => {
                const c = CATEGORY_CONFIG[cat];
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    title={c.label}
                    className={`flex flex-col items-center gap-1 py-1.5 rounded-xl border-2 transition-all duration-150 ${
                      active
                        ? "shadow-sm bg-white"
                        : "border-transparent hover:border-gray-100 hover:bg-gray-50"
                    }`}
                    style={active ? { borderColor: c.color } : {}}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity duration-150"
                      style={{ backgroundColor: c.color, opacity: active ? 1 : 0.45 }}
                    >
                      <c.IconComponent size={12} color={c.textColor} />
                    </div>
                  </button>
                );
              })}
            </div>
            <p
              className="text-[11px] text-center mt-1.5 font-medium transition-colors duration-150"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </p>
          </div>

          {/* Photo */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Photo</p>
            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden aspect-video shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm leading-none transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl py-3.5 text-sm text-gray-400 hover:text-gray-500 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Add Photo
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl text-sm p-2.5 resize-none focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-300"
              style={{ "--tw-ring-color": cfg.color } as React.CSSProperties}
              rows={2}
              placeholder="Optional details…"
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: cfg.color, color: cfg.textColor }}
          >
            {isSubmitting ? "Submitting…" : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
