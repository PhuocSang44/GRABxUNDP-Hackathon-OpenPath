"use client";

import React, { useState, useEffect } from "react";
import { FaTaxi, FaTrainSubway, FaBus, FaPersonWalking, FaLocationDot } from "react-icons/fa6";
import maplibregl from "maplibre-gl";

// --- TYPES ---
export interface Location {
  id: string;
  name: string;
  coords: [number, number]; // [lat, lng]
}

export interface TripLeg {
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

export interface TripPlan {
  summary: {
    totalDurationMin: number;
    totalDistanceKm: number;
    accessibilityRating: "good" | "moderate" | "poor";
  };
  legs: TripLeg[];
  aiNotes: string;
}

// --- MOCK DATA ---
const HCMC_LOCATIONS: Location[] = [
  { id: "cho_ray", name: "Bệnh viện Chợ Rẫy", coords: [10.7548, 106.6602] },
  { id: "ben_thanh", name: "Chợ Bến Thành", coords: [10.7725, 106.6980] },
  { id: "landmark81", name: "Landmark 81", coords: [10.7952, 106.7219] },
  { id: "thao_dien", name: "Thảo Điền", coords: [10.8024, 106.7354] },
  { id: "tan_son_nhat", name: "Sân bay Tân Sơn Nhất", coords: [10.8189, 106.6519] },
  { id: "suoi_tien", name: "Suối Tiên", coords: [10.8653, 106.8016] },
];

const MODE_CONFIG = {
  taxi: { icon: FaTaxi, color: "#f59e0b", label: "Accessible Taxi" },
  metro: { icon: FaTrainSubway, color: "#6366f1", label: "Metro Line 1" },
  bus: { icon: FaBus, color: "#10b981", label: "Accessible Bus" },
  walk: { icon: FaPersonWalking, color: "#6b7280", label: "Walking" },
};

// --- SIMULATOR LOGIC ---
function calculateDistance(coords1: [number, number], coords2: [number, number]) {
  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const interpolate = (c1: [number, number], c2: [number, number], fraction: number): [number, number] => {
  return [
    c1[0] + (c2[0] - c1[0]) * fraction,
    c1[1] + (c2[1] - c1[1]) * fraction,
  ];
};

async function fetchRouteGeometry(
  coords1: [number, number], // [lat, lng]
  coords2: [number, number],
  profile: "driving" | "foot" = "driving"
): Promise<GeoJSON.LineString> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/${profile}/${coords1[1]},${coords1[0]};${coords2[1]},${coords2[0]}?overview=full&geometries=geojson`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
        return data.routes[0].geometry;
      }
    }
  } catch (e) {
    console.error("OSRM fetch failed, falling back to straight line");
  }
  return {
    type: "LineString",
    coordinates: [
      [coords1[1], coords1[0]],
      [coords2[1], coords2[0]]
    ]
  };
}

const simulateTripPlan = async (from: Location, to: Location): Promise<TripPlan> => {
  // Fake "AI thinking" delay
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

  const distance = calculateDistance(from.coords, to.coords);
  const distRounded = Math.round(distance * 10) / 10;

  let legs: TripLeg[] = [];
  let summary: {
    totalDurationMin: number;
    totalDistanceKm: number;
    accessibilityRating: "good" | "moderate" | "poor";
  } = {
    totalDurationMin: 0,
    totalDistanceKm: distRounded,
    accessibilityRating: "good",
  };
  let aiNotes = "";

  if (distance < 3) {
    summary.totalDurationMin = Math.round(distance * 5);
    legs = [
      {
        mode: "taxi",
        fromName: from.name,
        toName: to.name,
        fromCoords: from.coords,
        toCoords: to.coords,
        durationMin: Math.round(distance * 5),
        distanceKm: distRounded,
        accessibilityInfo: "Xe taxi có rampe cho xe lăn.",
        details: "Gọi Grab Taxi Assist qua app.",
      }
    ];
    aiNotes = "Khoảng cách ngắn, đi taxi là phương án an toàn và tiện lợi nhất cho xe lăn.";
  } else if (distance >= 3 && distance < 8) {
    const pt1 = interpolate(from.coords, to.coords, 0.2);
    const pt2 = interpolate(from.coords, to.coords, 0.25);
    const pt3 = interpolate(from.coords, to.coords, 0.95);
    summary.totalDurationMin = Math.round(distance * 4) + 15;
    summary.accessibilityRating = "moderate";
    legs = [
      {
        mode: "taxi",
        fromName: from.name,
        toName: "Trạm xe bus gần nhất",
        fromCoords: from.coords,
        toCoords: pt1,
        durationMin: 10,
        distanceKm: 2.1,
        accessibilityInfo: "Taxi hỗ trợ lên xuống.",
      },
      {
        mode: "walk",
        fromName: "Điểm xuống xe",
        toName: "Trạm chờ xe bus",
        fromCoords: pt1,
        toCoords: pt2,
        durationMin: 3,
        distanceKm: 0.1,
        accessibilityInfo: "Vỉa hè phẳng, có gờ hạ lề.",
        warnings: ["Khu vực đông người qua lại."],
      },
      {
        mode: "bus",
        fromName: "Trạm xuất phát",
        toName: "Trạm gần " + to.name,
        fromCoords: pt2,
        toCoords: pt3,
        durationMin: Math.round(distance * 3),
        distanceKm: distRounded - 2.2,
        accessibilityInfo: "Xe bus sàn thấp, có vị trí đỗ xe lăn.",
        details: "Tuyến bus số 01 / 152.",
      },
      {
        mode: "walk",
        fromName: "Trạm dừng",
        toName: to.name,
        fromCoords: pt3,
        toCoords: to.coords,
        durationMin: 2,
        distanceKm: 0.1,
        accessibilityInfo: "Đường đi bộ ngắn tới đích.",
      }
    ];
    aiNotes = "Đã ưu tiên chọn các tuyến bus có sàn thấp (low-floor) hoạt động tại TP.HCM. Cần lưu ý thời gian chờ xe có thể kéo dài vào giờ cao điểm.";
  } else {
    const pt1 = interpolate(from.coords, to.coords, 0.25);
    const pt2 = interpolate(from.coords, to.coords, 0.85);
    summary.totalDurationMin = Math.round(distance * 3) + 20;
    legs = [
      {
        mode: "taxi",
        fromName: from.name,
        toName: "Ga Metro Bến Thành",
        fromCoords: from.coords,
        toCoords: pt1,
        durationMin: 15,
        distanceKm: 3.5,
        accessibilityInfo: "Xe taxi hỗ trợ xe lăn.",
      },
      {
        mode: "metro",
        fromName: "Ga Bến Thành",
        toName: "Ga gần " + to.name,
        fromCoords: pt1,
        toCoords: pt2,
        durationMin: 12,
        distanceKm: distRounded - 4,
        accessibilityInfo: "Ga có thang máy và đường dốc chuẩn.",
        details: "Tuyến Metro Line 1.",
      },
      {
        mode: "walk",
        fromName: "Lối ra Metro",
        toName: to.name,
        fromCoords: pt2,
        toCoords: to.coords,
        durationMin: 5,
        distanceKm: 0.5,
        accessibilityInfo: "Đường bộ hành có lối đi riêng.",
        warnings: ["Có một đoạn vỉa hè hẹp do thi công."],
      }
    ];
    aiNotes = "Hệ thống Metro Line 1 được thiết kế tiếp cận toàn diện với thang máy tại 100% các ga. Đây là lựa chọn tối ưu cho quãng đường dài.";
  }

  // Fetch real route geometry for each leg using OSRM
  for (const leg of legs) {
    const profile = leg.mode === "walk" ? "foot" : "driving";
    leg.geometry = await fetchRouteGeometry(leg.fromCoords, leg.toCoords, profile);
  }

  return { summary, legs, aiNotes };
};

// --- COMPONENT ---
interface Props {
  onClose: () => void;
  map: maplibregl.Map | null;
}

export default function TripPlannerPanel({ onClose, map }: Props) {
  const [fromLoc, setFromLoc] = useState<Location | null>(null);
  const [toLoc, setToLoc] = useState<Location | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Khởi tạo Source và Layer trên bản đồ
  useEffect(() => {
    if (!map) return;

    if (!map.getSource("trip-plan-source")) {
      map.addSource("trip-plan-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      
      map.addLayer({
        id: "trip-plan-layer",
        type: "line",
        source: "trip-plan-source",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["==", ["get", "mode"], "walk"], 4, 6],
          "line-opacity": 0.9,
          "line-dasharray": ["case", ["==", ["get", "mode"], "walk"], ["literal", [1, 2]], ["literal", [1, 0]]]
        }
      });
    }

    return () => {
      // Khi đóng panel, xoá data tuyến đường
      if (map.getSource("trip-plan-source")) {
        (map.getSource("trip-plan-source") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
      }
    };
  }, [map]);

  // Cập nhật đường đi lên bản đồ khi có kết quả
  useEffect(() => {
    if (!map || !map.getSource("trip-plan-source")) return;
    
    if (!plan) {
      (map.getSource("trip-plan-source") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = plan.legs.map(leg => ({
      type: "Feature",
      geometry: leg.geometry || {
        type: "LineString",
        // Fallback: MapLibre dùng [lng, lat]
        coordinates: [
          [leg.fromCoords[1], leg.fromCoords[0]],
          [leg.toCoords[1], leg.toCoords[0]]
        ]
      },
      properties: {
        mode: leg.mode,
        color: MODE_CONFIG[leg.mode].color
      }
    }));

    (map.getSource("trip-plan-source") as maplibregl.GeoJSONSource).setData({ 
      type: "FeatureCollection", 
      features 
    });

    // Zoom bản đồ vừa với lộ trình
    const bounds = new maplibregl.LngLatBounds();
    plan.legs.forEach(leg => {
      bounds.extend([leg.fromCoords[1], leg.fromCoords[0]]);
      bounds.extend([leg.toCoords[1], leg.toCoords[0]]);
    });
    
    // Padding để không bị panel che khuất (tuỳ chỉnh cho mobile vs desktop)
    const isMobile = window.innerWidth < 768;
    map.fitBounds(bounds, { 
      padding: { 
        top: 80, 
        bottom: isMobile ? 350 : 80, 
        left: isMobile ? 40 : 420, 
        right: 40 
      } 
    });

  }, [plan, map]);

  const handlePlanTrip = async () => {
    if (!fromLoc || !toLoc) {
      setError("Vui lòng chọn đầy đủ điểm đi và điểm đến.");
      return;
    }
    if (fromLoc.id === toLoc.id) {
      setError("Điểm đi và điểm đến không được trùng nhau.");
      return;
    }

    setError(null);
    setIsPlanning(true);
    setPlan(null);

    try {
      const result = await simulateTripPlan(fromLoc, toLoc);
      setPlan(result);
    } catch (err) {
      setError("Có lỗi xảy ra khi tạo kế hoạch chuyến đi.");
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/20 z-[20]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute bottom-0 left-0 right-0 md:top-4 md:left-4 md:bottom-auto md:w-[380px] bg-white md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[85vh] md:max-h-[calc(100vh-2rem)] flex flex-col z-[25]">
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        
        {/* Accent bar */}
        <div className="h-1 shrink-0 bg-emerald-500" />

        {/* Header */}
        <div className="px-4 pt-3 md:pt-4 pb-3 shrink-0 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
              <FaBus size={16} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm leading-snug">Trip Planner</h2>
              <p className="text-xs text-gray-500">Accessible Multi-modal Routing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Input Section */}
          <div className="p-4 bg-gray-50/50 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">From</p>
              <select 
                className="w-full bg-white border border-gray-200 rounded-xl text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-shadow text-gray-700"
                value={fromLoc?.id || ""}
                onChange={(e) => setFromLoc(HCMC_LOCATIONS.find(l => l.id === e.target.value) || null)}
              >
                <option value="">Select starting point...</option>
                {HCMC_LOCATIONS.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">To</p>
              <select 
                className="w-full bg-white border border-gray-200 rounded-xl text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-shadow text-gray-700"
                value={toLoc?.id || ""}
                onChange={(e) => setToLoc(HCMC_LOCATIONS.find(l => l.id === e.target.value) || null)}
              >
                <option value="">Select destination...</option>
                {HCMC_LOCATIONS.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>
            )}

            <button
              onClick={handlePlanTrip}
              disabled={isPlanning || !fromLoc || !toLoc}
              className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isPlanning ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI is planning...
                </>
              ) : (
                "Plan My Trip"
              )}
            </button>
          </div>

          {/* Results Section */}
          {plan && (
            <div className="border-t border-gray-100">
              {/* Summary */}
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
                  <div className={`text-xl font-bold ${plan.summary.accessibilityRating === 'good' ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {plan.summary.accessibilityRating === 'good' ? 'Good' : 'Moderate'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Accessibility</div>
                </div>
              </div>

              {/* Timeline */}
              <div className="px-4 py-4 space-y-0 relative">
                <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-gray-200 z-0" />
                
                {/* Start Point */}
                <div className="flex gap-4 items-center relative z-10 mb-4">
                  <div className="w-8 flex justify-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow-sm" />
                  </div>
                  <div className="font-semibold text-sm text-gray-900">{fromLoc?.name}</div>
                </div>

                {/* Legs */}
                {plan.legs.map((leg, idx) => {
                  const cfg = MODE_CONFIG[leg.mode];
                  const Icon = cfg.icon;
                  return (
                    <div key={idx} className="flex gap-4 relative z-10 mb-6 group">
                      <div className="w-8 flex justify-center shrink-0">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                          style={{ backgroundColor: cfg.color }}
                        >
                          <Icon size={14} color="#fff" />
                        </div>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {leg.durationMin} min
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          {leg.fromName} → {leg.toName} ({leg.distanceKm} km)
                        </div>
                        <div className="flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                          <span className="shrink-0 mt-0.5">♿</span>
                          <span>{leg.accessibilityInfo}</span>
                        </div>
                        {leg.details && (
                          <div className="text-xs text-gray-500 mt-2 flex gap-1.5">
                            <span className="shrink-0">ℹ️</span>
                            <span>{leg.details}</span>
                          </div>
                        )}
                        {leg.warnings && leg.warnings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {leg.warnings.map((w, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                                <span className="shrink-0 mt-0.5">⚠️</span>
                                <span>{w}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* End Point */}
                <div className="flex gap-4 items-center relative z-10">
                  <div className="w-8 flex justify-center">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center">
                      <FaLocationDot size={8} color="#fff" />
                    </div>
                  </div>
                  <div className="font-semibold text-sm text-gray-900">{toLoc?.name}</div>
                </div>
              </div>

              {/* AI Notes */}
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
      </div>
    </>
  );
}
