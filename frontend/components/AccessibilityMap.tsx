"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { LuAccessibility } from "react-icons/lu";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import * as GeoJSON from "geojson";
import {
  AccessibilityCheckpoint,
  AccessibilityPoint,
  DEFAULT_FILTERS,
  FilterState,
  GalleryItem,
  PointCategory,
  RouteResult,
} from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/markers";
import { getPointPhotos } from "@/lib/photos";
import { useAuth } from "./AuthContext";
import { analyzeRoute } from "@/lib/api";
import FilterPanel from "./FilterPanel";
import PointPopup from "./PointPopup";
import CheckpointPopup from "./CheckpointPopup";
import RoutePanel from "./RoutePanel";
import Legend from "./Legend";
import ClusterGallery from "./map/ClusterGallery";
import ReportForm from "./ReportForm";
import TripPlannerPanel from "./TripPlannerPanel";

const CHECKPOINT_COLORS: Record<string, string> = {
  good:     "#22c55e",
  moderate: "#eab308",
  poor:     "#ef4444",
};

interface Props {
  points: AccessibilityPoint[];
}

const HCMC_CENTER: [number, number] = [106.7031, 10.7731];

interface MarkerEntry {
  marker: maplibregl.Marker;
}

function applyFilters(points: AccessibilityPoint[], f: FilterState): AccessibilityPoint[] {
  return points.filter((p) => {
    if (f.categories.length > 0 && !f.categories.includes(p.category)) return false;
    if (p.accessibility_score < f.minScore) return false;
    return true;
  });
}

function buildGeoJSON(points: AccessibilityPoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => {
      const photos = getPointPhotos(p);
      return {
        type: "Feature",
        id: p.id,
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          category: p.category,
          score: p.accessibility_score,
          firstPhoto: photos[0]?.thumbUrl ?? null,
          data: JSON.stringify(p),
        },
      };
    }),
  };
}

// Renders a React element into a detached node and returns the resulting HTML string.
// Called once at map load to cache icon markup — no React roots during map interactions.
function renderToHtml(element: React.ReactElement): string {
  const temp = document.createElement("span");
  document.body.appendChild(temp);
  const r = createRoot(temp);
  flushSync(() => r.render(element));
  const html = temp.innerHTML;
  r.unmount();
  document.body.removeChild(temp);
  return html;
}

function removeAll(
  clusters: Map<number, MarkerEntry>,
  points: Map<number, MarkerEntry>,
) {
  for (const { marker } of clusters.values()) marker.remove();
  for (const { marker } of points.values()) marker.remove();
  clusters.clear();
  points.clear();
}

export default function AccessibilityMap({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const clusterMarkersRef = useRef(new Map<number, MarkerEntry>());
  const pointMarkersRef = useRef(new Map<number, MarkerEntry>());
  const checkpointMarkersRef = useRef(new Map<string, MarkerEntry>());
  const previewMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pointIconHtmlRef = useRef<Record<string, string>>({});
  const router = useRouter();
  const { user } = useAuth();

  const [selected, setSelected] = useState<AccessibilityPoint | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [reportLocation, setReportLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [reportCategory, setReportCategory] = useState<PointCategory>("community_report");
  const [isTripPlannerOpen, setIsTripPlannerOpen] = useState(false);

  // ── Route state ────────────────────────────────────────────────────────────
  const [isRoutingMode, setIsRoutingMode] = useState(false);
  const isRoutingModeRef = useRef(false);  // stable ref readable inside map closures
  const [routeDest, setRouteDest] = useState<{ lat: number; lng: number } | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<AccessibilityCheckpoint | null>(null);

  // Fixed demo route coordinates — must match seed_demo_route.py
  const DEMO_ORIGIN = { lat: 10.877073, lng: 106.800561 };
  const DEMO_DEST   = { lat: 10.877044, lng: 106.802880 };

  const filtered = useMemo(() => applyFilters(points, filters), [points, filters]);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: HCMC_CENTER,
      zoom: 14,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", () => {
      // Pre-render every icon to an HTML string once at startup.
      // Individual and cluster markers are then built from pure DOM,
      // with no React root created per marker.
      const clusterIconHtml = renderToHtml(<LuAccessibility size={22} color="white" />);
      const pointIconHtml: Record<string, string> = {};
      for (const [cat, cfg] of Object.entries(CATEGORY_CONFIG)) {
        const Icon = cfg.IconComponent;
        pointIconHtml[cat] = renderToHtml(<Icon size={20} color={cfg.textColor} />);
      }
      pointIconHtmlRef.current = pointIconHtml;

      map.addSource("points", {
        type: "geojson",
        data: buildGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Invisible layer — MapLibre only loads source tiles when a layer references
      // the source. Without it, querySourceFeatures always returns nothing.
      map.addLayer({
        id: "points-tile-loader",
        type: "circle",
        source: "points",
        paint: { "circle-radius": 0, "circle-opacity": 0 },
      });

      // syncMarkers runs on render: after every animation completes and all tiles
      // have loaded. At that point querySourceFeatures returns a single consistent
      // zoom-level snapshot — no overlap between clustered and unclustered features
      // from transitional tile sets, and no markers floating mid-animation.
      const syncMarkers = () => {
        if (!map.isSourceLoaded("points")) return;

        const source = map.getSource("points") as maplibregl.GeoJSONSource;

        // ── Cluster markers ──────────────────────────────────────────────────
        const clusterFeatures = map.querySourceFeatures("points", {
          filter: ["has", "point_count"],
        });

        const seenClusterIds = new Set<number>();

        for (const feature of clusterFeatures) {
          const props = feature.properties!;
          const clusterId = props.cluster_id as number;
          const count = props.point_count as number;
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

          if (seenClusterIds.has(clusterId)) continue;
          seenClusterIds.add(clusterId);
          if (clusterMarkersRef.current.has(clusterId)) continue;

          const circleSize = count >= 50 ? 60 : count >= 20 ? 52 : count >= 10 ? 46 : 40;
          const thumbSize = 28;
          const thumbOverflow = Math.floor(thumbSize / 2);
          const gradA = count >= 30 ? "#1d4ed8" : count >= 10 ? "#3b82f6" : "#60a5fa";
          const gradB = count >= 30 ? "#1e3a8a" : count >= 10 ? "#2563eb" : "#3b82f6";

          const wrapper = document.createElement("div");
          wrapper.style.cssText = `width:${circleSize}px;height:${circleSize}px;opacity:0;transition:opacity 0.2s ease;`;

          const circle = document.createElement("div");
          circle.style.cssText = [
            `position:relative;overflow:visible;`,
            `width:${circleSize}px;height:${circleSize}px;`,
            `border-radius:50%;`,
            `background:linear-gradient(135deg,${gradA},${gradB});`,
            `border:3px solid #fff;`,
            `display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;`,
            `box-shadow:0 4px 16px rgba(0,0,0,0.28);`,
            `cursor:pointer;user-select:none;`,
            `transition:transform 0.15s ease;`,
          ].join("");

          const iconEl = document.createElement("span");
          iconEl.innerHTML = clusterIconHtml;
          iconEl.style.cssText = `display:flex;align-items:center;justify-content:center;line-height:1;pointer-events:none;`;

          const countEl = document.createElement("span");
          countEl.textContent = String(count);
          countEl.style.cssText = `font-size:${Math.round(circleSize * 0.28)}px;line-height:1;color:#fff;font-weight:700;font-variant-numeric:tabular-nums;pointer-events:none;`;

          circle.appendChild(iconEl);
          circle.appendChild(countEl);

          const thumbDiv = document.createElement("div");
          thumbDiv.style.cssText = [
            `position:absolute;top:-${thumbOverflow}px;right:-${thumbOverflow}px;`,
            `width:${thumbSize}px;height:${thumbSize}px;`,
            `border-radius:50%;border:2px solid #fff;`,
            `overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3);`,
            `z-index:10;background:#d1d5db;display:none;`,
          ].join("");
          circle.appendChild(thumbDiv);
          wrapper.appendChild(circle);

          wrapper.addEventListener("mouseenter", () => { circle.style.transform = "scale(1.1)"; });
          wrapper.addEventListener("mouseleave", () => { circle.style.transform = ""; });

          wrapper.addEventListener("click", async (e) => {
            e.stopPropagation();
            try {
              const zoom = await source.getClusterExpansionZoom(clusterId);
              map.easeTo({ center: coords, zoom, duration: 500 });
            } catch { /* ignore */ }
            try {
              const leaves = await source.getClusterLeaves(clusterId, 100, 0);
              const items: GalleryItem[] = leaves.flatMap((leaf) => {
                if (!leaf.properties?.data) return [];
                const pt: AccessibilityPoint = JSON.parse(leaf.properties.data);
                const photos = getPointPhotos(pt);
                return photos.length > 0 ? [{ point: pt, photo: photos[0] }] : [];
              });
              setSelected(null);
              setReportLocation(null);
              if (items.length > 0) setGalleryItems(items);
            } catch { /* ignore */ }
          });

          const clusterMarker = new maplibregl.Marker({ element: wrapper, anchor: "center" })
            .setLngLat(coords)
            .addTo(map);

          clusterMarkersRef.current.set(clusterId, { marker: clusterMarker });
          requestAnimationFrame(() => { wrapper.style.opacity = "1"; });

          source.getClusterLeaves(clusterId, 10, 0).then((leaves) => {
            for (const leaf of leaves) {
              const firstPhoto = leaf.properties?.firstPhoto as string | undefined;
              if (firstPhoto) {
                const img = document.createElement("img");
                img.alt = "";
                img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
                img.loading = "lazy";
                img.onload = () => { thumbDiv.appendChild(img); thumbDiv.style.display = "block"; };
                img.src = firstPhoto;
                break;
              }
            }
          }).catch(() => {});
        }

        for (const [id, { marker }] of clusterMarkersRef.current) {
          if (!seenClusterIds.has(id)) {
            clusterMarkersRef.current.delete(id);
            const el = marker.getElement();
            el.style.opacity = "0";
            setTimeout(() => marker.remove(), 220);
          }
        }

        // ── Individual point markers (pure DOM, pre-rendered icons) ──────────
        const pointFeatures = map.querySourceFeatures("points", {
          filter: ["!", ["has", "point_count"]],
        });

        const seenPointIds = new Set<number>();

        for (const feature of pointFeatures) {
          const featureId = feature.id as number;
          if (featureId == null) continue;

          const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
          const props = feature.properties!;

          if (seenPointIds.has(featureId)) continue;
          seenPointIds.add(featureId);
          if (pointMarkersRef.current.has(featureId)) continue;

          const pt: AccessibilityPoint = JSON.parse(props.data);
          const cfg = CATEGORY_CONFIG[pt.category];
          if (!cfg) continue; // skip if backend returns a category not in our config

          const wrapper = document.createElement("div");
          wrapper.style.cssText = "width:40px;height:40px;opacity:0;transition:opacity 0.2s ease;";

          const circle = document.createElement("div");
          circle.setAttribute("role", "button");
          circle.setAttribute("aria-label", cfg.label);
          circle.style.cssText = [
            `width:40px;height:40px;`,
            `border-radius:50%;`,
            `background:${cfg.color};`,
            `border:2.5px solid #fff;`,
            `box-shadow:0 2px 8px rgba(0,0,0,0.28),0 0 0 1.5px rgba(0,0,0,0.06);`,
            `display:flex;align-items:center;justify-content:center;`,
            `cursor:pointer;user-select:none;`,
            `transition:transform 0.15s ease,box-shadow 0.15s ease;`,
          ].join("");

          const iconEl = document.createElement("span");
          iconEl.innerHTML = pointIconHtml[pt.category] ?? "";
          iconEl.style.cssText = "display:flex;align-items:center;justify-content:center;pointer-events:none;";
          circle.appendChild(iconEl);
          wrapper.appendChild(circle);

          wrapper.addEventListener("mouseenter", () => {
            circle.style.transform = "scale(1.12)";
            circle.style.boxShadow = "0 4px 16px rgba(0,0,0,0.36),0 0 0 1.5px rgba(0,0,0,0.08)";
          });
          wrapper.addEventListener("mouseleave", () => {
            circle.style.transform = "";
            circle.style.boxShadow = "0 2px 8px rgba(0,0,0,0.28),0 0 0 1.5px rgba(0,0,0,0.06)";
          });
          wrapper.addEventListener("click", (e) => {
            e.stopPropagation();
            setGalleryItems([]);
            setReportLocation(null);
            setSelected(pt);
          });

          const marker = new maplibregl.Marker({ element: wrapper, anchor: "center" })
            .setLngLat(coords)
            .addTo(map);

          pointMarkersRef.current.set(featureId, { marker });
          requestAnimationFrame(() => { wrapper.style.opacity = "1"; });
        }

        for (const [id, { marker }] of pointMarkersRef.current) {
          if (!seenPointIds.has(id)) {
            pointMarkersRef.current.delete(id);
            const el = marker.getElement();
            el.style.opacity = "0";
            setTimeout(() => marker.remove(), 220);
          }
        }
      };

      let syncNeeded = true;

      const trySync = () => {
        if (!syncNeeded || map.isMoving() || !map.isSourceLoaded("points")) return;
        syncNeeded = false;
        syncMarkers();
      };

      map.on("render", trySync);
      map.on("movestart", () => { syncNeeded = true; });
      map.on("sourcedata", (e) => {
        if (e.sourceId === "points") syncNeeded = true;
      });

      // Route line source + layers (added once; data updated when routeResult changes)
      map.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "route-outline",
        type: "line",
        source: "route",
        paint: { "line-color": "#1d4ed8", "line-width": 8, "line-opacity": 0.25 },
        layout: { "line-join": "round", "line-cap": "round" },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: { "line-color": "#3b82f6", "line-width": 4, "line-opacity": 0.9 },
        layout: { "line-join": "round", "line-cap": "round" },
      });

      // Map click: routing mode → set destination; otherwise open report form
      map.on("click", (e) => {
        // isRoutingMode is captured via ref so the closure always reads the latest value
        if (isRoutingModeRef.current) {
          setRouteDest({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          return;
        }
        setSelected(null);
        setGalleryItems([]);
        setReportLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      mapLoadedRef.current = true;
      mapRef.current = map;

      (map.getSource("points") as maplibregl.GeoJSONSource).setData(
        buildGeoJSON(applyFilters(points, DEFAULT_FILTERS))
      );

      // Focus on user's current location if permitted
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            map.flyTo({ center: [longitude, latitude], zoom: 15, duration: 1500 });
          },
          () => {
            // Silently fallback to HCMC_CENTER if permission denied or error
          }
        );
      }
    });

    const currentClusterMarkers = clusterMarkersRef.current;
    const currentPointMarkers = pointMarkersRef.current;

    return () => {
      if (previewMarkerRef.current) {
        previewMarkerRef.current.remove();
        previewMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      for (const { marker } of checkpointMarkersRef.current.values()) marker.remove();
      checkpointMarkersRef.current.clear();
      mapLoadedRef.current = false;
      removeAll(currentClusterMarkers, currentPointMarkers);
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update source when filters change ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;
    removeAll(clusterMarkersRef.current, pointMarkersRef.current);
    (mapRef.current.getSource("points") as maplibregl.GeoJSONSource).setData(
      buildGeoJSON(filtered)
    );
  }, [filtered]);

  // Keep isRoutingModeRef in sync so map click closures read the live value.
  useEffect(() => {
    isRoutingModeRef.current = isRoutingMode;
  }, [isRoutingMode]);

  // ── Destination marker ─────────────────────────────────────────────────────
  useEffect(() => {
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
    if (!routeDest || !mapRef.current || !mapLoadedRef.current) return;

    const el = document.createElement("div");
    el.style.cssText = [
      "width:20px;height:20px;border-radius:50%;",
      "background:#ef4444;border:3px solid #fff;",
      "box-shadow:0 2px 8px rgba(0,0,0,0.4);",
    ].join("");

    destMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([routeDest.lng, routeDest.lat])
      .addTo(mapRef.current);
  }, [routeDest]);

  // ── Origin marker ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
    if (!routeOrigin || !mapRef.current || !mapLoadedRef.current) return;

    const el = document.createElement("div");
    el.style.cssText = [
      "width:20px;height:20px;border-radius:50%;",
      "background:#3b82f6;border:3px solid #fff;",
      "box-shadow:0 2px 8px rgba(0,0,0,0.4);",
    ].join("");

    originMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([routeOrigin.lng, routeOrigin.lat])
      .addTo(mapRef.current);
  }, [routeOrigin]);

  // ── Route line + checkpoint markers ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;
    const map = mapRef.current;

    // Clear previous checkpoint markers
    for (const { marker } of checkpointMarkersRef.current.values()) marker.remove();
    checkpointMarkersRef.current.clear();

    if (!routeResult) {
      (map.getSource("route") as maplibregl.GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features: [],
      });
      return;
    }

    // Draw route line
    (map.getSource("route") as maplibregl.GeoJSONSource).setData({
      type: "Feature",
      geometry: routeResult.route.geometry,
      properties: {},
    });

    // Fit map to route bounds
    const coords = routeResult.route.geometry.coordinates as [number, number][];
    if (coords.length > 1) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 800 });
    }

    // Add checkpoint markers
    for (const cp of routeResult.checkpoints) {
      const color = CHECKPOINT_COLORS[cp.accessibility] ?? "#6b7280";
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "width:18px;height:18px;";

      const dot = document.createElement("div");
      dot.style.cssText = [
        "width:18px;height:18px;border-radius:50%;",
        `background:${color};border:2px solid #fff;`,
        "box-shadow:0 1px 4px rgba(0,0,0,0.3);",
        "cursor:pointer;transition:transform 0.12s ease;",
      ].join("");

      dot.addEventListener("mouseenter", () => { dot.style.transform = "scale(1.35)"; });
      dot.addEventListener("mouseleave", () => { dot.style.transform = ""; });
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelected(null);
        setReportLocation(null);
        setSelectedCheckpoint(cp);
      });

      wrapper.appendChild(dot);

      const marker = new maplibregl.Marker({ element: wrapper, anchor: "center" })
        .setLngLat([cp.lng, cp.lat])
        .addTo(map);

      checkpointMarkersRef.current.set(cp.id, { marker });
    }
  }, [routeResult]);

  // ── Preview marker for in-progress report ──────────────────────────────────
  useEffect(() => {
    if (previewMarkerRef.current) {
      previewMarkerRef.current.remove();
      previewMarkerRef.current = null;
    }
    if (!reportLocation || !mapRef.current || !mapLoadedRef.current) return;

    const cfg = CATEGORY_CONFIG[reportCategory];
    const iconHtml = pointIconHtmlRef.current[reportCategory] ?? "";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:relative;width:52px;height:52px;pointer-events:none;";

    const ring = document.createElement("div");
    ring.style.cssText = [
      `position:absolute;inset:0;border-radius:50%;`,
      `background:${cfg.color};`,
      `animation:preview-ping 1.4s cubic-bezier(0,0,0.2,1) infinite;`,
    ].join("");

    const circle = document.createElement("div");
    circle.style.cssText = [
      `position:absolute;top:6px;left:6px;width:40px;height:40px;`,
      `border-radius:50%;`,
      `background:${cfg.color};`,
      `border:3px solid #fff;`,
      `box-shadow:0 4px 20px rgba(0,0,0,0.38),0 0 0 2px ${cfg.color}50;`,
      `display:flex;align-items:center;justify-content:center;`,
    ].join("");

    const iconEl = document.createElement("span");
    iconEl.innerHTML = iconHtml;
    iconEl.style.cssText = "display:flex;align-items:center;justify-content:center;pointer-events:none;";
    circle.appendChild(iconEl);
    wrapper.appendChild(ring);
    wrapper.appendChild(circle);

    previewMarkerRef.current = new maplibregl.Marker({ element: wrapper, anchor: "center" })
      .setLngLat([reportLocation.lng, reportLocation.lat])
      .addTo(mapRef.current);
  }, [reportLocation, reportCategory]);

  const handleCurrentLocationReport = () => {
    if (!user) {
      router.push("/profile");
      return;
    }
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapRef.current) {
          mapRef.current.easeTo({ center: [longitude, latitude], zoom: 16, duration: 600 });
        }
        setSelected(null);
        setGalleryItems([]);
        setReportLocation({ lat: latitude, lng: longitude });
      },
      () => {
        alert("Unable to retrieve your location. Please check your browser permissions.");
      }
    );
  };

  // ── Route analysis ──────────────────────────────────────────────────────────
  const handleAnalyzeRoute = async () => {
    if (!routeDest) return;

    const getOrigin = (): Promise<{ lat: number; lng: number }> =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ lat: HCMC_CENTER[1], lng: HCMC_CENTER[0] });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: HCMC_CENTER[1], lng: HCMC_CENTER[0] }),
          { timeout: 5000, maximumAge: 30_000 },
        );
      });

    const origin = await getOrigin();
    setRouteOrigin(origin);
    const result = await analyzeRoute(origin.lat, origin.lng, routeDest.lat, routeDest.lng);
    setRouteResult(result);
    setIsRoutingMode(false);
  };

  const handleAnalyzeDemoRoute = async () => {
    setRouteOrigin(DEMO_ORIGIN);
    setRouteDest(DEMO_DEST);
    setIsRoutingMode(false);
    // Load pre-generated static JSON — no live API or OSRM call during the demo
    const resp = await fetch("/demo/demo_route.json");
    if (!resp.ok) throw new Error("Demo route data not found — run seed_demo_manual.py first");
    const result: RouteResult = await resp.json();
    setRouteResult(result);
  };

  const handleClearRoute = () => {
    setRouteResult(null);
    setSelectedCheckpoint(null);
    setRouteOrigin(null);
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
    setRouteDest(null);
  };

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.minScore > 0;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Filter toggle */}
      <button
        onClick={() => setFiltersVisible((v) => !v)}
        className={`absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl shadow-md text-sm font-medium transition-colors ${
          filtersVisible ? "bg-blue-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        Filters
        {hasActiveFilters && (
          <span className="bg-white text-blue-500 rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
            •
          </span>
        )}
      </button>

      {!filtersVisible && (
        <div className="absolute top-4 left-28 z-10 bg-white rounded-xl shadow-md px-3 py-2 text-xs text-gray-500">
          {filtered.length} / {points.length} locations
        </div>
      )}

      <FilterPanel
        filters={filters}
        onChange={setFilters}
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        total={points.length}
        filtered={filtered.length}
      />

      <PointPopup point={selected} onClose={() => setSelected(null)} />

      <ClusterGallery
        items={galleryItems}
        onSelectPoint={(point) => {
          setGalleryItems([]);
          setSelected(point);
          if (mapRef.current) {
            mapRef.current.easeTo({ center: [point.lng, point.lat], zoom: 16, duration: 600 });
          }
        }}
        onClose={() => setGalleryItems([])}
      />

      <Legend />

      {/* Trip Planner FAB */}
      <button
        onClick={() => setIsTripPlannerOpen(true)}
        className="absolute bottom-6 left-4 md:left-6 z-10 bg-emerald-600 text-white px-4 md:px-5 py-3 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 hover:shadow-xl transition-all"
      >
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span className="hidden md:inline">Plan Trip</span>
        <span className="md:hidden">Trip</span>
      </button>

      {/* Route panel + checkpoint popup */}
      <RoutePanel
        isRoutingMode={isRoutingMode}
        onToggleRoutingMode={() => {
          setIsRoutingMode((v) => !v);
          setSelected(null);
          setReportLocation(null);
        }}
        destination={routeDest}
        onClearDestination={() => setRouteDest(null)}
        onAnalyze={handleAnalyzeRoute}
        onAnalyzeDemoRoute={handleAnalyzeDemoRoute}
        routeResult={routeResult}
        onClearRoute={handleClearRoute}
      />
      <CheckpointPopup
        checkpoint={selectedCheckpoint}
        onClose={() => setSelectedCheckpoint(null)}
      />

      {/* Routing mode hint */}
      {isRoutingMode && !routeDest && (
        <div className="absolute bottom-24 md:bottom-16 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Click anywhere on the map to set your destination
        </div>
      )}

      {/* Report at current location — desktop pill (hidden on mobile) */}
      <button
        onClick={handleCurrentLocationReport}
        className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm items-center gap-2 hover:bg-blue-700 hover:shadow-xl transition-all"
      >
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Report at Current Location
      </button>

      {/* Report at current location — mobile round FAB (hidden on desktop) */}
      <button
        onClick={handleCurrentLocationReport}
        aria-label="Report at current location"
        className="md:hidden absolute bottom-36 right-3 z-10 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {reportLocation && (
        <>
          {/* Mobile backdrop for report form */}
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-[5]"
            onClick={() => {
              setReportLocation(null);
              setReportCategory("community_report");
            }}
            aria-hidden="true"
          />
          <div className="absolute bottom-0 left-0 right-0 md:top-4 md:right-4 md:bottom-auto md:left-auto z-10">
          <ReportForm
            lat={reportLocation.lat}
            lng={reportLocation.lng}
            onClose={() => {
              setReportLocation(null);
              setReportCategory("community_report");
            }}
            onCategoryChange={setReportCategory}
            onSubmitSuccess={() => {
              setReportLocation(null);
              setReportCategory("community_report");
              window.location.reload();
            }}
          />
          </div>
        </>
      )}

      {/* Trip Planner Panel */}
      {isTripPlannerOpen && (
        <TripPlannerPanel map={mapRef.current} onClose={() => setIsTripPlannerOpen(false)} />
      )}
    </div>
  );
}
