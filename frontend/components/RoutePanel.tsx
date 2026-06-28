"use client";

import { useState, useEffect, useRef } from "react";
import { RouteResult } from "@/lib/types";
import maplibregl from "maplibre-gl";
import * as GeoJSON from "geojson";
import { FaTaxi, FaTrainSubway, FaBus, FaPersonWalking, FaLocationDot } from "react-icons/fa6";

// ─── Fixed walk segment (Claude AI pre-analyzed) ───────────────────────────

const WALK_ORIGIN: [number, number]   = [10.877073, 106.800561]; // user start
const WALK_ENDPOINT: [number, number] = [10.877048, 106.802886]; // bus stop / transfer

// ─── Destinations ──────────────────────────────────────────────────────────

interface Destination {
  id: string;
  name: string;
  coords: [number, number]; // [lat, lng]
}

const DESTINATIONS: Destination[] = [
  { id: "cho_ray",      name: "Bệnh viện Chợ Rẫy",   coords: [10.7548, 106.6602] },
  { id: "ben_thanh",    name: "Chợ Bến Thành",        coords: [10.7725, 106.6980] },
  { id: "landmark81",   name: "Landmark 81",           coords: [10.7952, 106.7219] },
  { id: "thao_dien",    name: "Thảo Điền",            coords: [10.8024, 106.7354] },
  { id: "tan_son_nhat", name: "Sân bay Tân Sơn Nhất", coords: [10.8189, 106.6519] },
  { id: "suoi_tien",    name: "Suối Tiên",            coords: [10.8653, 106.8016] },
];

// ─── Transit planning ──────────────────────────────────────────────────────

interface TransitLeg {
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

interface TransitPlan {
  legs: TransitLeg[];
  totalMin: number;
  totalKm: number;
  rating: "good" | "moderate" | "poor";
  aiNotes: string;
}

const MODE_CONFIG = {
  taxi:  { icon: FaTaxi,          color: "#f59e0b", label: "Accessible Taxi" },
  metro: { icon: FaTrainSubway,   color: "#6366f1", label: "Metro Line 1"    },
  bus:   { icon: FaBus,           color: "#10b981", label: "Accessible Bus"  },
  walk:  { icon: FaPersonWalking, color: "#6b7280", label: "Walking"         },
} as const;

function haversineDist(c1: [number, number], c2: [number, number]): number {
  const R = 6371;
  const dLat = (c2[0] - c1[0]) * Math.PI / 180;
  const dLon = (c2[1] - c1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(c1[0]*Math.PI/180) * Math.cos(c2[0]*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const lerp = (c1: [number, number], c2: [number, number], t: number): [number, number] =>
  [c1[0] + (c2[0]-c1[0])*t, c1[1] + (c2[1]-c1[1])*t];

async function fetchLegGeom(from: [number, number], to: [number, number], mode: string): Promise<GeoJSON.LineString> {
  try {
    const profile = mode === "walk" ? "foot" : "driving";
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/${profile}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.routes?.[0]?.geometry) return data.routes[0].geometry as GeoJSON.LineString;
    }
  } catch { /* fallback to straight line */ }
  return { type: "LineString", coordinates: [[from[1], from[0]], [to[1], to[0]]] };
}

async function buildTransitPlan(to: Destination): Promise<TransitPlan> {
  // Simulate AI planning time
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

  const dist = haversineDist(WALK_ENDPOINT, to.coords);
  const d = Math.round(dist * 10) / 10;
  let legs: TransitLeg[];
  let rating: TransitPlan["rating"] = "good";
  let aiNotes: string;

  if (dist < 3) {
    // Short: single accessible taxi
    legs = [{
      mode: "taxi",
      fromName: "Trạm xe bus (điểm chuyển tiếp)",
      toName: to.name,
      fromCoords: WALK_ENDPOINT,
      toCoords: to.coords,
      durationMin: Math.round(dist * 5 + 3),
      distanceKm: d,
      accessibilityInfo: "Xe taxi có rampe cho xe lăn — gọi qua Grab Taxi Assist.",
    }];
    aiNotes = `Khoảng cách từ điểm dừng xe bus đến ${to.name} ngắn nên taxi là lựa chọn tối ưu và an toàn nhất.`;
  } else if (dist < 10) {
    // Medium: bus with walk at start
    rating = "moderate";
    const pt1 = lerp(WALK_ENDPOINT, to.coords, 0.9);
    legs = [
      {
        mode: "bus",
        fromName: "Trạm xe bus (điểm chuyển tiếp)",
        toName: `Trạm dừng gần ${to.name}`,
        fromCoords: WALK_ENDPOINT,
        toCoords: pt1,
        durationMin: Math.round(dist * 3 + 5),
        distanceKm: Math.round((d - 0.1) * 10) / 10,
        accessibilityInfo: "Xe bus sàn thấp (low-floor) với vị trí đỗ xe lăn chuyên dụng.",
        details: "Tuyến bus số 01 / 152 — khoảng cách 10–15 phút/chuyến.",
        warnings: dist > 7 ? ["Có thể cần đổi tuyến tại điểm trung chuyển."] : undefined,
      },
      {
        mode: "walk",
        fromName: `Trạm dừng gần ${to.name}`,
        toName: to.name,
        fromCoords: pt1,
        toCoords: to.coords,
        durationMin: 3,
        distanceKm: 0.1,
        accessibilityInfo: "Đường bộ hành ngắn, vỉa hè thông thoáng.",
      },
    ];
    aiNotes = `Tuyến bus sàn thấp phục vụ hành trình đến ${to.name}. Cần lưu ý: giờ cao điểm có thể tăng thời gian chờ xe.`;
  } else {
    // Long: taxi to metro + walk to destination
    const metroMid = lerp(WALK_ENDPOINT, to.coords, 0.15);
    const metroEnd = lerp(WALK_ENDPOINT, to.coords, 0.88);
    legs = [
      {
        mode: "taxi",
        fromName: "Trạm xe bus (điểm chuyển tiếp)",
        toName: "Ga Metro Bến Thành",
        fromCoords: WALK_ENDPOINT,
        toCoords: metroMid,
        durationMin: 12,
        distanceKm: 2.1,
        accessibilityInfo: "Xe taxi hỗ trợ xe lăn — gọi qua Grab Taxi Assist.",
      },
      {
        mode: "metro",
        fromName: "Ga Bến Thành",
        toName: `Ga gần ${to.name}`,
        fromCoords: metroMid,
        toCoords: metroEnd,
        durationMin: Math.round(dist * 2),
        distanceKm: Math.round((d - 2.6) * 10) / 10,
        accessibilityInfo: "Metro Line 1 — thang máy tại 100% các ga, lối lên dành riêng cho xe lăn.",
        details: "Ga Bến Thành → Suối Tiên, tần suất 5–10 phút/chuyến.",
      },
      {
        mode: "walk",
        fromName: `Lối ra ga Metro`,
        toName: to.name,
        fromCoords: metroEnd,
        toCoords: to.coords,
        durationMin: 5,
        distanceKm: 0.5,
        accessibilityInfo: "Đường bộ hành có lối đi dành riêng cho xe lăn.",
        warnings: ["Một đoạn vỉa hè có thể bị thu hẹp do công trình."],
      },
    ];
    aiNotes = `Metro Line 1 là lựa chọn tốt nhất cho hành trình dài đến ${to.name} — thiết kế tiếp cận toàn diện. Taxi Assist đảm bảo kết nối từ điểm dừng đến ga.`;
  }

  // Fetch real OSRM geometry for each leg in parallel
  await Promise.all(legs.map(async leg => {
    leg.geometry = await fetchLegGeom(leg.fromCoords, leg.toCoords, leg.mode);
  }));

  const totalMin = legs.reduce((s, l) => s + l.durationMin, 0);
  return { legs, totalMin, totalKm: d, rating, aiNotes };
}

// ─── Panel sub-components ──────────────────────────────────────────────────

function CheckpointDots({ good, moderate, poor }: { good: number; moderate: number; poor: number }) {
  const total = good + moderate + poor;
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 my-1">
      {Array.from({ length: good }).map((_, i) => (
        <span key={`g${i}`} className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" title="Good" />
      ))}
      {Array.from({ length: moderate }).map((_, i) => (
        <span key={`m${i}`} className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" title="Moderate" />
      ))}
      {Array.from({ length: poor }).map((_, i) => (
        <span key={`p${i}`} className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" title="Poor" />
      ))}
    </div>
  );
}

function WalkStep({ result }: { result: RouteResult }) {
  const { route, summary } = result;
  const pct = Math.round(summary.sidewalk_coverage * 100);
  return (
    <div className="rounded-xl border border-blue-100 overflow-hidden">
      {/* Step header */}
      <div className="bg-blue-50 px-3 py-2 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <FaPersonWalking size={12} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-800">Walking</span>
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
              </svg>
              Claude AI
            </span>
          </div>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-2 text-xs">
        {/* Route info */}
        <div className="text-gray-500">
          {route.distance_km} km · {Math.round(route.duration_min)} min
          <span className="ml-2 text-gray-400">Your Location → Bus Stop</span>
        </div>

        {/* Checkpoint dots */}
        <div>
          <CheckpointDots
            good={summary.good_count}
            moderate={summary.moderate_count}
            poor={summary.poor_count}
          />
          <div className="flex gap-3 text-[10px] mt-0.5">
            <span className="text-green-600">{summary.good_count} good</span>
            <span className="text-yellow-600">{summary.moderate_count} moderate</span>
            {summary.poor_count > 0 && <span className="text-red-600">{summary.poor_count} poor</span>}
          </div>
        </div>

        {/* Key facts */}
        <div className="space-y-1 border-t border-gray-100 pt-2">
          <div className="flex items-center gap-1.5 text-green-700">
            <span className="font-bold">✓</span>
            <span>Sidewalk {pct}% · {summary.dominant_surface}</span>
          </div>
          {summary.has_curb_ramps && (
            <div className="flex items-center gap-1.5 text-green-700">
              <span className="font-bold">✓</span>
              <span>Curb ramps at crossings</span>
            </div>
          )}
          {summary.has_narrow_sections && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <span className="font-bold">⚠</span>
              <span>Narrow sections present</span>
            </div>
          )}
          {summary.total_obstacles.length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <span className="font-bold">⚠</span>
              <span>{summary.total_obstacles.length} obstacle: {summary.total_obstacles.join(", ")}</span>
            </div>
          )}
        </div>

        <p className="text-[10px] text-gray-400 italic">Tap checkpoints on the map for photos &amp; details</p>
      </div>
    </div>
  );
}

function TransitStep({ leg, index }: { leg: TransitLeg; index: number }) {
  const cfg = MODE_CONFIG[leg.mode];
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: `${cfg.color}15` }}>
        <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.color }}>{index}</span>
        <Icon size={12} style={{ color: cfg.color }} />
        <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="ml-auto text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{leg.durationMin} min</span>
      </div>
      <div className="px-3 py-2 space-y-1.5 text-xs">
        <div className="text-gray-500">{leg.fromName} → {leg.toName} ({leg.distanceKm} km)</div>
        <div className="flex items-start gap-1.5 text-emerald-700 bg-emerald-50 p-1.5 rounded-lg">
          <span className="shrink-0">♿</span>
          <span>{leg.accessibilityInfo}</span>
        </div>
        {leg.details && (
          <div className="flex gap-1.5 text-gray-500">
            <span className="shrink-0">ℹ️</span><span>{leg.details}</span>
          </div>
        )}
        {leg.warnings?.map((w, i) => (
          <div key={i} className="flex items-start gap-1.5 text-amber-700 bg-amber-50 p-1.5 rounded-lg">
            <span className="shrink-0">⚠️</span><span>{w}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

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
  const [toDest, setToDest] = useState<Destination | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [transit, setTransit] = useState<TransitPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tripInitRef = useRef(false);

  // ── Init trip-plan map source once map is ready ─────────────────────────
  useEffect(() => {
    if (!map || tripInitRef.current) return;
    const init = () => {
      if (map.getSource("trip-plan-source")) { tripInitRef.current = true; return; }
      map.addSource("trip-plan-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "trip-plan-layer", type: "line", source: "trip-plan-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 5, "line-opacity": 0.9,
          "line-dasharray": ["case", ["==", ["get", "mode"], "walk"],
            ["literal", [1, 2]], ["literal", [1, 0]]],
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

  // ── Draw transit lines + fit to full journey when transit plan updates ──
  useEffect(() => {
    if (!map || !transit) return;
    const src = map.getSource("trip-plan-source");
    if (!src) return;

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = transit.legs.map(leg => ({
      type: "Feature",
      geometry: leg.geometry ?? {
        type: "LineString",
        coordinates: [[leg.fromCoords[1], leg.fromCoords[0]], [leg.toCoords[1], leg.toCoords[0]]],
      },
      properties: { mode: leg.mode, color: MODE_CONFIG[leg.mode].color },
    }));
    (src as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features });

    // Fit bounds to encompass walking segment + all transit legs
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([WALK_ORIGIN[1],   WALK_ORIGIN[0]]);
    bounds.extend([WALK_ENDPOINT[1], WALK_ENDPOINT[0]]);
    // Also include walking route geometry if available
    if (routeResult) {
      for (const c of routeResult.route.geometry.coordinates) bounds.extend(c as [number, number]);
    }
    transit.legs.forEach(l => {
      bounds.extend([l.fromCoords[1], l.fromCoords[0]]);
      bounds.extend([l.toCoords[1], l.toCoords[0]]);
    });

    const mobile = typeof window !== "undefined" && window.innerWidth < 768;
    map.fitBounds(bounds, {
      padding: { top: 60, bottom: mobile ? 320 : 80, left: mobile ? 20 : 360, right: 60 },
      maxZoom: 14, duration: 800,
    });
  }, [transit, map, routeResult]);

  // ── Clear transit lines when panel closes ───────────────────────────────
  const clearTransit = () => {
    if (map) {
      const src = map.getSource("trip-plan-source");
      if (src) (src as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
    }
    setTransit(null);
  };

  const handlePlanTrip = async () => {
    if (!toDest) { setError("Please select a destination"); return; }
    setError(null);
    setIsPlanning(true);
    clearTransit();

    try {
      // Run walk AI load + transit planning in parallel
      const [transitResult] = await Promise.all([
        buildTransitPlan(toDest),
        onAnalyzeDemoRoute(),         // loads demo_route.json → sets routeResult in parent
      ]);
      setTransit(transitResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to plan trip");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleClose = () => {
    onClearRoute();
    onClearDestination();
    if (isRoutingMode) onToggleRoutingMode();
    clearTransit();
    setError(null);
    setToDest(null);
  };

  // ── Idle state: entry button ─────────────────────────────────────────────
  if (!isRoutingMode && !routeResult) {
    return (
      <button
        onClick={onToggleRoutingMode}
        className="absolute top-14 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl shadow-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        title="AI Route Analysis — Accessibility + Trip Planner"
      >
        <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
        </svg>
        AI Route
      </button>
    );
  }

  // ── Have result: show combined view ─────────────────────────────────────
  const hasResult = routeResult !== null && transit !== null;
  const showResult = hasResult && !isPlanning;

  const totalMin = showResult ? Math.round(routeResult.route.duration_min) + transit!.totalMin : 0;
  const totalKm  = showResult ? Math.round((routeResult.route.distance_km + transit!.totalKm) * 10) / 10 : 0;
  const overallRating = showResult
    ? (routeResult.summary.accessibility_rating === "poor" || transit!.rating === "poor" ? "poor"
      : routeResult.summary.accessibility_rating === "moderate" || transit!.rating === "moderate" ? "moderate"
      : "good")
    : "unknown";

  const RATING_STYLE: Record<string, { badge: string; label: string }> = {
    good:     { badge: "bg-green-100 text-green-700 border-green-200",   label: "Good"     },
    moderate: { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Moderate" },
    poor:     { badge: "bg-red-100 text-red-700 border-red-200",         label: "Poor"     },
    unknown:  { badge: "bg-gray-100 text-gray-600 border-gray-200",      label: "—"        },
  };

  return (
    <>
      {/* Mobile backdrop when result is open */}
      {showResult && (
        <div className="md:hidden fixed inset-0 bg-black/10 z-[5]" onClick={handleClose} aria-hidden="true" />
      )}

      <div className={`
        absolute z-20 bg-white shadow-2xl overflow-hidden
        ${showResult
          ? "bottom-0 left-0 right-0 md:top-4 md:right-4 md:bottom-auto md:left-auto md:w-80 md:rounded-2xl rounded-t-2xl max-h-[85vh] md:max-h-[calc(100vh-6rem)] overflow-y-auto"
          : "top-14 left-4 right-4 md:left-4 md:right-auto md:w-80 rounded-2xl"
        }
      `}>
        {/* Mobile drag handle */}
        {showResult && (
          <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
            </svg>
            <span className="font-semibold text-gray-800 text-sm">AI Route Analysis</span>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
        </div>

        {/* ── Planning form ─────────────────────────────────────────────── */}
        {!showResult && (
          <div className="px-4 py-4 space-y-4">
            {/* FROM */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">From</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 cursor-not-allowed">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="font-mono text-xs">10.877073, 106.800561</span>
                <span className="ml-auto text-[10px] text-gray-400 shrink-0">Your location</span>
              </div>
            </div>

            {/* TO */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">To</p>
              <select
                className="w-full bg-white border border-gray-200 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-shadow text-gray-700"
                value={toDest?.id ?? ""}
                onChange={e => setToDest(DESTINATIONS.find(d => d.id === e.target.value) ?? null)}
                disabled={isPlanning}
              >
                <option value="">Select destination…</option>
                {DESTINATIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {/* Plan button */}
            <button
              onClick={handlePlanTrip}
              disabled={!toDest || isPlanning}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: (!toDest || isPlanning) ? undefined : "linear-gradient(135deg, #7c3aed, #2563eb)" }}
            >
              {isPlanning ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Analyzing &amp; Planning…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
                  </svg>
                  Plan Accessible Trip
                </>
              )}
            </button>

            {isPlanning && (
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                  Loading Claude AI route analysis…
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" style={{ animationDelay: "0.3s" }} />
                  Planning accessible transit route…
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Combined result ───────────────────────────────────────────── */}
        {showResult && routeResult && transit && (
          <div className="px-4 py-3 space-y-3">
            {/* Overview strip */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <div className="font-bold text-gray-900 text-base">{totalMin}</div>
                <div className="text-gray-500 text-[10px] mt-0.5">min total</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <div className="font-bold text-gray-900 text-base">{totalKm}</div>
                <div className="text-gray-500 text-[10px] mt-0.5">km total</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <div className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${RATING_STYLE[overallRating].badge}`}>
                  {RATING_STYLE[overallRating].label}
                </div>
                <div className="text-gray-500 text-[10px] mt-0.5">access.</div>
              </div>
            </div>

            {/* Destination label */}
            {toDest && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FaLocationDot size={12} className="text-purple-500 shrink-0" />
                <span className="font-medium truncate">{toDest.name}</span>
              </div>
            )}

            {/* Step 1: Walk (AI) */}
            <WalkStep result={routeResult} />

            {/* Transfer note */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="shrink-0 px-2 py-0.5 bg-gray-100 rounded-full">Transfer at bus stop</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Transit steps */}
            {transit.legs.map((leg, i) => (
              <TransitStep key={i} leg={leg} index={i + 2} />
            ))}

            {/* AI recommendation */}
            <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
                </svg>
                <div>
                  <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-1">AI Recommendation</p>
                  <p className="text-xs text-purple-900 leading-relaxed">{transit.aiNotes}</p>
                </div>
              </div>
            </div>

            {/* Attribution */}
            <p className="text-[10px] text-gray-400 text-center pb-1">
              Walking segment analyzed by Claude Vision AI · Transit simulated
            </p>
          </div>
        )}
      </div>
    </>
  );
}
