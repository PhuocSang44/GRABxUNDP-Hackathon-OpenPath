"use client";

import { useState, useEffect, useRef } from "react";
import { RouteResult } from "@/lib/types";
import maplibregl from "maplibre-gl";
import * as GeoJSON from "geojson";
import { FaTaxi, FaTrainSubway, FaBus, FaPersonWalking, FaLocationDot } from "react-icons/fa6";

// ─── Trip Planner types & logic ────────────────────────────────────────────

interface TripLocation {
  id: string;
  name: string;
  coords: [number, number]; // [lat, lng]
}

interface TripLeg {
  mode: "taxi" | "metro" | "bus" | "walk";
  fromName: string;
  toName: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  geometry?: GeoJSON.LineString;
  durationMin: number;
  distanceKm: number;
  accessibilityInfo: string;
  warnings?: string[];
  details?: string;
}

interface TripPlan {
  summary: { totalDurationMin: number; totalDistanceKm: number; accessibilityRating: "good" | "moderate" | "poor" };
  legs: TripLeg[];
  aiNotes: string;
}

const HCMC_LOCATIONS: TripLocation[] = [
  { id: "cho_ray",      name: "Bệnh viện Chợ Rẫy",   coords: [10.7548, 106.6602] },
  { id: "ben_thanh",    name: "Chợ Bến Thành",        coords: [10.7725, 106.6980] },
  { id: "landmark81",   name: "Landmark 81",           coords: [10.7952, 106.7219] },
  { id: "thao_dien",    name: "Thảo Điền",            coords: [10.8024, 106.7354] },
  { id: "tan_son_nhat", name: "Sân bay Tân Sơn Nhất", coords: [10.8189, 106.6519] },
  { id: "suoi_tien",    name: "Suối Tiên",            coords: [10.8653, 106.8016] },
];

const FIXED_START: TripLocation = {
  id: "my_location",
  name: "Vị trí của tôi (10.877068, 106.802883)",
  coords: [10.877068, 106.802883],
};

const MODE_CONFIG = {
  taxi:  { icon: FaTaxi,          color: "#f59e0b", label: "Accessible Taxi" },
  metro: { icon: FaTrainSubway,   color: "#6366f1", label: "Metro Line 1"    },
  bus:   { icon: FaBus,           color: "#10b981", label: "Accessible Bus"  },
  walk:  { icon: FaPersonWalking, color: "#6b7280", label: "Walking"         },
} as const;

function haversineDist(c1: [number, number], c2: [number, number]) {
  const [lat1, lon1] = c1, [lat2, lon2] = c2;
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const lerp = (c1: [number, number], c2: [number, number], t: number): [number, number] =>
  [c1[0] + (c2[0]-c1[0])*t, c1[1] + (c2[1]-c1[1])*t];

async function fetchLegGeom(from: [number, number], to: [number, number], mode: string): Promise<GeoJSON.LineString> {
  try {
    const profile = mode === "walk" ? "foot" : "driving";
    const res = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`);
    if (res.ok) {
      const data = await res.json();
      if (data.routes?.[0]?.geometry) return data.routes[0].geometry as GeoJSON.LineString;
    }
  } catch { /* fallback */ }
  return { type: "LineString", coordinates: [[from[1], from[0]], [to[1], to[0]]] };
}

async function planTrip(from: TripLocation, to: TripLocation): Promise<TripPlan> {
  await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
  const dist = haversineDist(from.coords, to.coords);
  const d = Math.round(dist * 10) / 10;
  let legs: TripLeg[];
  let rating: TripPlan["summary"]["accessibilityRating"] = "good";
  let aiNotes: string;

  if (dist < 3) {
    legs = [{ mode: "taxi", fromName: from.name, toName: to.name, fromCoords: from.coords, toCoords: to.coords, durationMin: Math.round(dist * 5), distanceKm: d, accessibilityInfo: "Xe taxi có rampe cho xe lăn.", details: "Gọi Grab Taxi Assist qua app." }];
    aiNotes = "Khoảng cách ngắn, đi taxi là phương án an toàn và tiện lợi nhất cho xe lăn.";
  } else if (dist < 8) {
    rating = "moderate";
    const pt1 = lerp(from.coords, to.coords, 0.2), pt2 = lerp(from.coords, to.coords, 0.25), pt3 = lerp(from.coords, to.coords, 0.95);
    legs = [
      { mode: "taxi", fromName: from.name,       toName: "Trạm xe bus gần nhất",      fromCoords: from.coords, toCoords: pt1, durationMin: 10,               distanceKm: 2.1,      accessibilityInfo: "Taxi hỗ trợ lên xuống." },
      { mode: "walk", fromName: "Điểm xuống xe", toName: "Trạm chờ xe bus",           fromCoords: pt1,         toCoords: pt2, durationMin: 3,                distanceKm: 0.1,      accessibilityInfo: "Vỉa hè phẳng, có gờ hạ lề.", warnings: ["Khu vực đông người qua lại."] },
      { mode: "bus",  fromName: "Trạm xuất phát",toName: "Trạm gần " + to.name,       fromCoords: pt2,         toCoords: pt3, durationMin: Math.round(dist*3), distanceKm: d - 2.2, accessibilityInfo: "Xe bus sàn thấp, có vị trí đỗ xe lăn.", details: "Tuyến bus số 01 / 152." },
      { mode: "walk", fromName: "Trạm dừng",     toName: to.name,                     fromCoords: pt3,         toCoords: to.coords, durationMin: 2,          distanceKm: 0.1,      accessibilityInfo: "Đường đi bộ ngắn tới đích." },
    ];
    aiNotes = "Đã ưu tiên chọn các tuyến bus có sàn thấp (low-floor) hoạt động tại TP.HCM. Cần lưu ý thời gian chờ xe có thể kéo dài vào giờ cao điểm.";
  } else {
    const pt1 = lerp(from.coords, to.coords, 0.25), pt2 = lerp(from.coords, to.coords, 0.85);
    legs = [
      { mode: "taxi",  fromName: from.name,       toName: "Ga Metro Bến Thành",        fromCoords: from.coords, toCoords: pt1, durationMin: 15, distanceKm: 3.5,      accessibilityInfo: "Xe taxi hỗ trợ xe lăn." },
      { mode: "metro", fromName: "Ga Bến Thành",  toName: "Ga gần " + to.name,         fromCoords: pt1,         toCoords: pt2, durationMin: 12, distanceKm: d - 4,    accessibilityInfo: "Ga có thang máy và đường dốc chuẩn.", details: "Tuyến Metro Line 1." },
      { mode: "walk",  fromName: "Lối ra Metro",  toName: to.name,                     fromCoords: pt2,         toCoords: to.coords, durationMin: 5, distanceKm: 0.5, accessibilityInfo: "Đường bộ hành có lối đi riêng.", warnings: ["Có một đoạn vỉa hè hẹp do thi công."] },
    ];
    aiNotes = "Hệ thống Metro Line 1 được thiết kế tiếp cận toàn diện với thang máy tại 100% các ga. Đây là lựa chọn tối ưu cho quãng đường dài.";
  }

  const total = legs.reduce((s, l) => s + l.durationMin, 0);
  for (const leg of legs) leg.geometry = await fetchLegGeom(leg.fromCoords, leg.toCoords, leg.mode);
  return { summary: { totalDurationMin: total, totalDistanceKm: d, accessibilityRating: rating }, legs, aiNotes };
}

// ─── Accessibility summary sub-components ──────────────────────────────────

const RATING_BADGE: Record<string, string> = {
  good:     "bg-green-100 text-green-700 border-green-200",
  moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
  poor:     "bg-red-100 text-red-700 border-red-200",
  unknown:  "bg-gray-100 text-gray-600 border-gray-200",
};
const RATING_LABEL: Record<string, string> = { good: "Good", moderate: "Moderate", poor: "Poor", unknown: "Unknown" };

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function BulletRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 font-bold text-xs shrink-0 ${ok ? "text-green-500" : "text-amber-500"}`}>{ok ? "✓" : "⚠"}</span>
      <span className="text-gray-600 leading-snug">{text}</span>
    </div>
  );
}

function SummaryCard({ result }: { result: RouteResult }) {
  const { route, summary } = result;
  const pct = Math.round(summary.sidewalk_coverage * 100);
  const rating = summary.accessibility_rating;
  return (
    <div className="space-y-3">
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
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Overall Accessibility</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${RATING_BADGE[rating]}`}>{RATING_LABEL[rating]}</span>
      </div>
      <div className="flex gap-1.5">
        {summary.total_checkpoints > 0 && (
          <>
            <div className="h-2 rounded-full bg-green-400 transition-all"  style={{ flex: summary.good_count }}     title={`${summary.good_count} good`} />
            <div className="h-2 rounded-full bg-yellow-400 transition-all" style={{ flex: summary.moderate_count }} title={`${summary.moderate_count} moderate`} />
            <div className="h-2 rounded-full bg-red-400 transition-all"    style={{ flex: summary.poor_count }}     title={`${summary.poor_count} poor`} />
          </>
        )}
      </div>
      <div className="flex gap-2 text-xs">
        <span className="text-green-600">{summary.good_count} good</span>
        <span className="text-yellow-600">{summary.moderate_count} moderate</span>
        <span className="text-red-600">{summary.poor_count} poor</span>
        <span className="text-gray-400 ml-auto">{summary.total_checkpoints} checkpoints</span>
      </div>
      <div className="text-sm space-y-1.5 pt-1 border-t border-gray-100">
        <BulletRow ok={pct >= 70} text={`Sidewalk: ${pct}% of route`} />
        <BulletRow ok={summary.dominant_surface.includes("smooth")} text={`Surface: ${capitalize(summary.dominant_surface)}`} />
        {summary.has_curb_ramps   && <BulletRow ok text="Curb ramps at major crossings" />}
        {summary.has_narrow_sections && <BulletRow ok={false} text="Narrow sections present" />}
        {summary.total_obstacles.length > 0 && <BulletRow ok={false} text={`Obstacles: ${summary.total_obstacles.map(capitalize).join(", ")}`} />}
      </div>
      <p className="text-xs text-gray-400 pt-1">Click any checkpoint on the map for details.</p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

type Tab = "accessibility" | "trip";

interface Props {
  isRoutingMode: boolean;
  onToggleRoutingMode: () => void;
  destination: { lat: number; lng: number } | null;
  onClearDestination: () => void;
  onAnalyze: () => Promise<void>;
  onAnalyzeDemoRoute: () => Promise<void>;
  routeResult: RouteResult | null;
  onClearRoute: () => void;
  map?: maplibregl.Map | null;
}

export default function RoutePanel({
  isRoutingMode, onToggleRoutingMode, destination, onClearDestination,
  onAnalyze, onAnalyzeDemoRoute, routeResult, onClearRoute, map,
}: Props) {
  const [tab, setTab] = useState<Tab>("accessibility");

  // Accessibility analysis state
  const [loading, setLoading]         = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Trip planner state
  const [toLoc, setToLoc]           = useState<TripLocation | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [plan, setPlan]             = useState<TripPlan | null>(null);
  const [tripError, setTripError]   = useState<string | null>(null);
  const tripInitRef = useRef(false);

  // Init trip-plan map source once the map is ready
  useEffect(() => {
    if (!map || tripInitRef.current) return;
    const init = () => {
      if (map.getSource("trip-plan-source")) return;
      map.addSource("trip-plan-source", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "trip-plan-layer", type: "line", source: "trip-plan-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 5, "line-opacity": 0.9,
          "line-dasharray": ["case", ["==", ["get", "mode"], "walk"], ["literal", [1, 2]], ["literal", [1, 0]]],
        },
      });
      tripInitRef.current = true;
    };
    if (map.isStyleLoaded()) init(); else map.once("load", init);
    return () => {
      const src = map.getSource("trip-plan-source");
      if (src) (src as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
    };
  }, [map]);

  // Draw trip plan on map when plan updates
  useEffect(() => {
    if (!map || !plan) return;
    const src = map.getSource("trip-plan-source");
    if (!src) return;
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = plan.legs.map(leg => ({
      type: "Feature",
      geometry: leg.geometry ?? { type: "LineString", coordinates: [[leg.fromCoords[1], leg.fromCoords[0]], [leg.toCoords[1], leg.toCoords[0]]] },
      properties: { mode: leg.mode, color: MODE_CONFIG[leg.mode].color },
    }));
    (src as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features });

    const bounds = new maplibregl.LngLatBounds();
    plan.legs.forEach(l => { bounds.extend([l.fromCoords[1], l.fromCoords[0]]); bounds.extend([l.toCoords[1], l.toCoords[0]]); });
    const mobile = typeof window !== "undefined" && window.innerWidth < 768;
    map.fitBounds(bounds, { padding: { top: 80, bottom: mobile ? 350 : 80, left: mobile ? 40 : 420, right: 40 } });
  }, [plan, map]);

  // Clear trip lines when panel closes or tab switches back
  useEffect(() => {
    if (tab === "accessibility" && map) {
      const src = map.getSource("trip-plan-source");
      if (src) (src as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
    }
  }, [tab, map]);

  const handleAnalyze = async () => {
    setLoading(true); setError(null);
    try { await onAnalyze(); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  };

  const handleDemo = async () => {
    setLoadingDemo(true); setError(null);
    try { await onAnalyzeDemoRoute(); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoadingDemo(false); }
  };

  const handlePlanTrip = async () => {
    if (!toLoc) { setTripError("Vui lòng chọn điểm đến."); return; }
    setTripError(null); setIsPlanning(true); setPlan(null);
    try { setPlan(await planTrip(FIXED_START, toLoc)); }
    catch { setTripError("Có lỗi xảy ra khi tạo kế hoạch chuyến đi."); }
    finally { setIsPlanning(false); }
  };

  const handleClose = () => {
    onClearRoute();
    onClearDestination();
    if (isRoutingMode) onToggleRoutingMode();
    setError(null);
    // Clear trip state
    setPlan(null);
    setTripError(null);
    if (map) {
      const src = map.getSource("trip-plan-source");
      if (src) (src as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
    }
  };

  // ── Idle state: single entry button ────────────────────────────────────────
  if (!isRoutingMode && !routeResult) {
    return (
      <button
        onClick={onToggleRoutingMode}
        className="absolute top-14 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl shadow-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        title="AI Route Analysis & Trip Planner"
      >
        <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
        </svg>
        AI Route
      </button>
    );
  }

  // ── Open panel ─────────────────────────────────────────────────────────────
  return (
    <>
      {routeResult && (
        <div className="md:hidden fixed inset-0 bg-black/10 z-[5]" onClick={handleClose} aria-hidden="true" />
      )}

      {/* Map hint — only when accessibility tab is active and no destination set yet */}
      {isRoutingMode && !destination && !routeResult && tab === "accessibility" && (
        <div className="absolute bottom-24 md:bottom-16 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
          Click anywhere on the map to set your destination
        </div>
      )}

      <div className={`
        absolute z-20 bg-white shadow-2xl overflow-hidden
        ${routeResult
          ? "bottom-0 left-0 right-0 md:top-4 md:right-4 md:bottom-auto md:left-auto md:w-80 md:rounded-2xl rounded-t-2xl max-h-[85vh] md:max-h-[calc(100vh-6rem)] overflow-y-auto"
          : "top-14 left-4 right-4 md:left-4 md:right-auto md:w-80 rounded-2xl"
        }
      `}>
        {/* Mobile drag handle */}
        {routeResult && (
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
            </svg>
            <span className="font-semibold text-gray-800 text-sm">
              {routeResult ? "Route Accessibility" : "AI Route Analysis"}
            </span>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
        </div>

        {/* Tab bar — only in planning mode */}
        {!routeResult && (
          <div className="flex border-b border-gray-100 shrink-0">
            <button
              onClick={() => setTab("accessibility")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === "accessibility" ? "text-purple-600 border-b-2 border-purple-500 bg-purple-50/40" : "text-gray-500 hover:text-gray-700"}`}
            >
              Accessibility
            </button>
            <button
              onClick={() => setTab("trip")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === "trip" ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/40" : "text-gray-500 hover:text-gray-700"}`}
            >
              Trip Planner
            </button>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────────────── */}
        {routeResult ? (
          <div className="px-4 py-3 space-y-3">
            <SummaryCard result={routeResult} />
          </div>
        ) : tab === "accessibility" ? (
          /* ── Accessibility tab ─────────────────────────────────────────── */
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-gray-500 italic">Current / default location</span>
            </div>
            <div className="ml-1 pl-0.5 border-l-2 border-dashed border-gray-300 h-3" />
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              {destination ? (
                <div className="flex items-center justify-between flex-1 gap-1">
                  <span className="text-gray-700 font-mono text-xs">{destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}</span>
                  <button onClick={onClearDestination} className="text-gray-400 hover:text-gray-600 text-xs" aria-label="Clear">×</button>
                </div>
              ) : (
                <span className="text-gray-400 italic">Click the map to set destination</span>
              )}
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              onClick={handleAnalyze}
              disabled={!destination || loading || loadingDemo}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Getting GPS & analyzing…</>
              ) : "Analyze Accessibility"}
            </button>

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
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Loading demo…</>
              ) : (
                <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/></svg>Demo Route (Claude AI)</>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center -mt-1">Pre-analyzed with real Claude Vision AI</p>
          </div>
        ) : (
          /* ── Trip Planner tab ──────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 bg-gray-50/50 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">From</p>
                <div className="w-full bg-gray-100 border border-gray-200 rounded-xl text-sm p-2.5 text-gray-700 flex items-center font-medium opacity-80 cursor-not-allowed">
                  <span className="shrink-0 mr-2 text-emerald-600"><FaLocationDot /></span>
                  {FIXED_START.name}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">To</p>
                <select
                  className="w-full bg-white border border-gray-200 rounded-xl text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-shadow text-gray-700"
                  value={toLoc?.id ?? ""}
                  onChange={e => setToLoc(HCMC_LOCATIONS.find(l => l.id === e.target.value) ?? null)}
                >
                  <option value="">Select destination…</option>
                  {HCMC_LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {tripError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{tripError}</p>}
              <button
                onClick={handlePlanTrip}
                disabled={isPlanning || !toLoc}
                className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isPlanning ? (
                  <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>AI is planning…</>
                ) : "Plan My Trip"}
              </button>
            </div>

            {plan && (
              <div className="border-t border-gray-100">
                {/* Trip summary */}
                <div className="px-4 py-3 bg-white flex gap-4 border-b border-gray-100">
                  <div>
                    <div className="text-xl font-bold text-gray-900">{plan.summary.totalDurationMin} <span className="text-sm font-normal text-gray-500">min</span></div>
                    <div className="text-xs text-gray-500 mt-0.5">Duration</div>
                  </div>
                  <div className="w-px bg-gray-200" />
                  <div>
                    <div className="text-xl font-bold text-gray-900">{plan.summary.totalDistanceKm} <span className="text-sm font-normal text-gray-500">km</span></div>
                    <div className="text-xs text-gray-500 mt-0.5">Distance</div>
                  </div>
                  <div className="w-px bg-gray-200" />
                  <div>
                    <div className={`text-xl font-bold ${plan.summary.accessibilityRating === "good" ? "text-emerald-600" : "text-amber-500"}`}>
                      {plan.summary.accessibilityRating === "good" ? "Good" : "Moderate"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Accessibility</div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="px-4 py-4 space-y-0 relative">
                  <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gray-200 z-0" />
                  <div className="flex gap-4 items-center relative z-10 mb-4">
                    <div className="w-8 flex justify-center"><div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow-sm" /></div>
                    <div className="font-semibold text-sm text-gray-900">{FIXED_START.name}</div>
                  </div>

                  {plan.legs.map((leg, idx) => {
                    const cfg = MODE_CONFIG[leg.mode];
                    const Icon = cfg.icon;
                    return (
                      <div key={idx} className="flex gap-4 relative z-10 mb-6">
                        <div className="w-8 flex justify-center shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm" style={{ backgroundColor: cfg.color }}>
                            <Icon size={14} color="#fff" />
                          </div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{leg.durationMin} min</span>
                          </div>
                          <div className="text-xs text-gray-600 mb-2">{leg.fromName} → {leg.toName} ({leg.distanceKm} km)</div>
                          <div className="flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                            <span className="shrink-0 mt-0.5">♿</span>
                            <span>{leg.accessibilityInfo}</span>
                          </div>
                          {leg.details && <div className="text-xs text-gray-500 mt-2 flex gap-1.5"><span className="shrink-0">ℹ️</span><span>{leg.details}</span></div>}
                          {leg.warnings?.map((w, i) => (
                            <div key={i} className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                              <span className="shrink-0 mt-0.5">⚠️</span><span>{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-4 items-center relative z-10">
                    <div className="w-8 flex justify-center">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center">
                        <FaLocationDot size={8} color="#fff" />
                      </div>
                    </div>
                    <div className="font-semibold text-sm text-gray-900">{toLoc?.name}</div>
                  </div>
                </div>

                {/* AI notes */}
                <div className="p-4 bg-blue-50/50 border-t border-blue-100">
                  <div className="flex items-start gap-2">
                    <span className="text-xl leading-none">💡</span>
                    <div>
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">AI Recommendation</h4>
                      <p className="text-xs text-blue-800 leading-relaxed">{plan.aiNotes}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
