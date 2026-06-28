"use client";

import { useState } from "react";
import { RouteResult, RouteSummary } from "@/lib/types";

interface Props {
  isRoutingMode: boolean;
  onToggleRoutingMode: () => void;
  destination: { lat: number; lng: number } | null;
  onClearDestination: () => void;
  onAnalyze: () => Promise<void>;
  onAnalyzeDemoRoute: () => Promise<void>;
  routeResult: RouteResult | null;
  onClearRoute: () => void;
}

const RATING_BADGE: Record<string, string> = {
  good:     "bg-green-100 text-green-700 border-green-200",
  moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  poor:     "bg-red-100 text-red-700 border-red-200",
  unknown:  "bg-gray-100 text-gray-600 border-gray-200",
};

const RATING_LABEL: Record<string, string> = {
  good: "Good", moderate: "Moderate", poor: "Poor", unknown: "Unknown",
};

function SummaryCard({ result }: { result: RouteResult }) {
  const { route, summary } = result;
  const pct = Math.round(summary.sidewalk_coverage * 100);
  const rating = summary.accessibility_rating;

  return (
    <div className="space-y-3">
      {/* Distance + time */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <div className="font-bold text-gray-900 text-base">{route.distance_km} km</div>
          <div className="text-gray-500 text-xs mt-0.5">Distance</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <div className="font-bold text-gray-900 text-base">{Math.round(route.duration_min)} min</div>
          <div className="text-gray-500 text-xs mt-0.5">Est. Time</div>
        </div>
      </div>

      {/* Overall rating */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Overall Accessibility</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${RATING_BADGE[rating]}`}>
          {RATING_LABEL[rating]}
        </span>
      </div>

      {/* Checkpoint distribution */}
      <div className="flex gap-1.5">
        {summary.total_checkpoints > 0 && (
          <>
            <div
              className="h-2 rounded-full bg-green-400 transition-all"
              style={{ flex: summary.good_count }}
              title={`${summary.good_count} good`}
            />
            <div
              className="h-2 rounded-full bg-yellow-400 transition-all"
              style={{ flex: summary.moderate_count }}
              title={`${summary.moderate_count} moderate`}
            />
            <div
              className="h-2 rounded-full bg-red-400 transition-all"
              style={{ flex: summary.poor_count }}
              title={`${summary.poor_count} poor`}
            />
          </>
        )}
      </div>
      <div className="flex gap-2 text-xs">
        <span className="text-green-600">{summary.good_count} good</span>
        <span className="text-yellow-600">{summary.moderate_count} moderate</span>
        <span className="text-red-600">{summary.poor_count} poor</span>
        <span className="text-gray-400 ml-auto">{summary.total_checkpoints} checkpoints</span>
      </div>

      {/* Detail bullets */}
      <div className="text-sm space-y-1.5 pt-1 border-t border-gray-100">
        <BulletRow
          ok={pct >= 70}
          text={`Sidewalk: ${pct}% of route`}
        />
        <BulletRow
          ok={summary.dominant_surface.includes("smooth")}
          text={`Surface: ${capitalize(summary.dominant_surface)}`}
        />
        {summary.has_curb_ramps && (
          <BulletRow ok text="Curb ramps at major crossings" />
        )}
        {summary.has_narrow_sections && (
          <BulletRow ok={false} text="Narrow sections present" />
        )}
        {summary.total_obstacles.length > 0 && (
          <BulletRow
            ok={false}
            text={`Obstacles: ${summary.total_obstacles.map(capitalize).join(", ")}`}
          />
        )}
      </div>

      <p className="text-xs text-gray-400 pt-1">
        Click any checkpoint on the map for details.
      </p>
    </div>
  );
}

function BulletRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 font-bold text-xs shrink-0 ${ok ? "text-green-500" : "text-amber-500"}`}>
        {ok ? "✓" : "⚠"}
      </span>
      <span className="text-gray-600 leading-snug">{text}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function RoutePanel({
  isRoutingMode,
  onToggleRoutingMode,
  destination,
  onClearDestination,
  onAnalyze,
  onAnalyzeDemoRoute,
  routeResult,
  onClearRoute,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      await onAnalyze();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoadingDemo(true);
    setError(null);
    try {
      await onAnalyzeDemoRoute();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleClose = () => {
    onClearRoute();
    onClearDestination();
    if (isRoutingMode) onToggleRoutingMode();
    setError(null);
  };

  if (!isRoutingMode && !routeResult) {
    return (
      <button
        onClick={onToggleRoutingMode}
        className="absolute top-14 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl shadow-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        title="Plan accessible route"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Route
      </button>
    );
  }

  return (
    <>
      {/* Mobile backdrop when result is shown */}
      {routeResult && (
        <div className="md:hidden fixed inset-0 bg-black/10 z-[5]" onClick={handleClose} aria-hidden="true" />
      )}

      <div className={`
        absolute z-20 bg-white shadow-2xl overflow-hidden
        ${routeResult
          ? "bottom-0 left-0 right-0 md:top-4 md:right-4 md:bottom-auto md:left-auto md:w-80 md:rounded-2xl rounded-t-2xl max-h-[85vh] md:max-h-[calc(100vh-6rem)] overflow-y-auto"
          : "top-14 left-4 right-4 md:left-4 md:right-auto md:w-80 rounded-2xl"
        }
      `}>
        {/* Mobile drag handle (only when expanded) */}
        {routeResult && (
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
        )}

        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="font-semibold text-gray-800 text-sm">
              {routeResult ? "Route Accessibility" : "Plan Route"}
            </span>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">
            ×
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {!routeResult && (
            <>
              {/* Origin — always fixed to map centre for MVP */}
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-gray-500 italic">Current / default location</span>
              </div>

              {/* Dashed connector */}
              <div className="ml-1 pl-0.5 border-l-2 border-dashed border-gray-300 h-3" />

              {/* Destination */}
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                {destination ? (
                  <div className="flex items-center justify-between flex-1 gap-1">
                    <span className="text-gray-700 font-mono text-xs">
                      {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
                    </span>
                    <button
                      onClick={onClearDestination}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                      aria-label="Clear destination"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400 italic">Click the map to set destination</span>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!destination || loading || loadingDemo}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Getting GPS &amp; analyzing…
                  </>
                ) : "Analyze Accessibility"}
              </button>

              {/* Demo route divider + button */}
              <div className="relative flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 shrink-0">or try a preset</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={handleDemo}
                disabled={loading || loadingDemo}
                className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loadingDemo ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading demo…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
                    </svg>
                    Demo Route  (Claude AI)
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center -mt-1">
                Pre-analyzed with real Claude Vision AI
              </p>
            </>
          )}

          {routeResult && <SummaryCard result={routeResult} />}
        </div>
      </div>
    </>
  );
}
