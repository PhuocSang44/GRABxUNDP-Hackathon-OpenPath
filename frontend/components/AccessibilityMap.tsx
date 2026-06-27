"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { LuAccessibility } from "react-icons/lu";
import maplibregl from "maplibre-gl";
import * as GeoJSON from "geojson";
import {
  AccessibilityPoint,
  DEFAULT_FILTERS,
  FilterState,
  GalleryItem,
} from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/markers";
import { getPointPhotos } from "@/lib/photos";
import FilterPanel from "./FilterPanel";
import PointPopup from "./PointPopup";
import Legend from "./Legend";
import ClusterGallery from "./map/ClusterGallery";

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
    if (f.verifiedOnly && !p.verified) return false;
    if (f.hasRamp && !p.has_ramp) return false;
    if (f.hasToilet && !p.has_toilet) return false;
    if (f.hasParking && !p.has_parking) return false;
    if (f.hasElevator && !p.has_elevator) return false;
    if (f.communityReportsOnly && !p.is_community_report) return false;
    return true;
  });
}

function buildGeoJSON(points: AccessibilityPoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => {
      const photos = getPointPhotos(p.id, p.category);
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

  const [selected, setSelected] = useState<AccessibilityPoint | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);

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

      // syncMarkers runs on idle: after every animation completes and all tiles
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

          // wrapper: the element MapLibre controls. MapLibre sets transform:translate()
          // on this element — opacity transition is safe here because MapLibre never
          // touches opacity on non-draggable markers.
          const wrapper = document.createElement("div");
          wrapper.style.cssText = `width:${circleSize}px;height:${circleSize}px;opacity:0;transition:opacity 0.2s ease;`;

          // circle: the visible element inside the wrapper. Hover scale and transitions
          // live here so they never collide with MapLibre's translate on the wrapper.
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

          // Thumbnail overflows the circle via absolute positioning without
          // affecting the wrapper's dimensions or anchor calculation.
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

          // Hover and click on wrapper; scale applied to circle only.
          wrapper.addEventListener("mouseenter", () => { circle.style.transform = "scale(1.1)"; });
          wrapper.addEventListener("mouseleave", () => { circle.style.transform = ""; });

          wrapper.addEventListener("click", async () => {
            try {
              const zoom = await source.getClusterExpansionZoom(clusterId);
              map.easeTo({ center: coords, zoom, duration: 500 });
            } catch { /* ignore */ }
            try {
              const leaves = await source.getClusterLeaves(clusterId, 100, 0);
              const items: GalleryItem[] = leaves.flatMap((leaf) => {
                if (!leaf.properties?.data) return [];
                const pt: AccessibilityPoint = JSON.parse(leaf.properties.data);
                const photos = getPointPhotos(pt.id, pt.category);
                return photos.length > 0 ? [{ point: pt, photo: photos[0] }] : [];
              });
              setSelected(null);
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

          // wrapper: MapLibre sets transform:translate() here to position the marker.
          // opacity transition is safe — MapLibre never touches opacity on static markers.
          const wrapper = document.createElement("div");
          wrapper.style.cssText = "width:40px;height:40px;opacity:0;transition:opacity 0.2s ease;";

          // circle: the visible element. Transitions and hover scale live here so
          // they never overwrite MapLibre's translate on the wrapper.
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

          // Hover and click on wrapper; scale applied to circle only.
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

      // Sync on the earliest render frame where the map has stopped moving
      // AND the GeoJSON source has recomputed its tiles. Using render-frame
      // polling avoids the gap between moveend and the sourcedata event that
      // made clustering updates feel delayed.
      let syncNeeded = true;

      const trySync = () => {
        if (!syncNeeded || map.isMoving() || !map.isSourceLoaded("points")) return;
        syncNeeded = false;
        syncMarkers();
      };

      map.on("render", trySync);
      // Flag a sync whenever the camera moves or source data changes.
      map.on("movestart", () => { syncNeeded = true; });
      map.on("sourcedata", (e) => {
        if (e.sourceId === "points") syncNeeded = true;
      });

      mapLoadedRef.current = true;
      mapRef.current = map;

      (map.getSource("points") as maplibregl.GeoJSONSource).setData(
        buildGeoJSON(applyFilters(points, DEFAULT_FILTERS))
      );
    });

    return () => {
      mapLoadedRef.current = false;
      removeAll(clusterMarkersRef.current, pointMarkersRef.current);
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

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.minScore > 0 ||
    filters.verifiedOnly ||
    filters.hasRamp ||
    filters.hasToilet ||
    filters.hasParking ||
    filters.hasElevator ||
    filters.communityReportsOnly;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

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
    </div>
  );
}
