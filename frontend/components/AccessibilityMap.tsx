"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { AccessibilityPoint, DEFAULT_FILTERS, FilterState } from "@/lib/types";
import { CATEGORY_CONFIG, getScoreColor, makeSvgMarker } from "@/lib/markers";
import FilterPanel from "./FilterPanel";
import PointPopup from "./PointPopup";
import Legend from "./Legend";

interface Props {
  points: AccessibilityPoint[];
}

const HCMC_CENTER: [number, number] = [106.7031, 10.7731];
const CATEGORIES = Object.keys(CATEGORY_CONFIG) as (keyof typeof CATEGORY_CONFIG)[];

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
    features: points.map((p) => ({
      type: "Feature",
      id: p.id,
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        category: p.category,
        categoryColor: CATEGORY_CONFIG[p.category].color,
        scoreColor: getScoreColor(p.accessibility_score),
        score: p.accessibility_score,
        verified: p.verified,
        data: JSON.stringify(p),
      },
    })),
  };
}

export default function AccessibilityMap({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const [selected, setSelected] = useState<AccessibilityPoint | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);

  const filtered = useMemo(() => applyFilters(points, filters), [points, filters]);

  // Init map once
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

    map.on("load", async () => {
      // Pre-load one icon per category
      await Promise.all(
        CATEGORIES.map(
          (cat) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                if (!map.hasImage(`marker-${cat}`)) map.addImage(`marker-${cat}`, img);
                resolve();
              };
              img.src = makeSvgMarker(cat, 75);
            })
        )
      );

      map.addSource("points", {
        type: "geojson",
        data: buildGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // ── Cluster circle ──────────────────────────────────────────────────────
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "points",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#60a5fa", 5,
            "#3b82f6", 15,
            "#1d4ed8",
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            22, 5, 30, 15, 38,
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#fff",
        },
      });

      // ── Cluster count ───────────────────────────────────────────────────────
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "points",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 13,
        },
        paint: { "text-color": "#fff" },
      });

      // ── Individual point: score ring ────────────────────────────────────────
      map.addLayer({
        id: "unclustered-ring",
        type: "circle",
        source: "points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "scoreColor"],
          "circle-radius": 14,
          "circle-opacity": 1,
        },
      });

      // ── Individual point: category fill ────────────────────────────────────
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "categoryColor"],
          "circle-radius": 10,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      // ── Hover highlight ─────────────────────────────────────────────────────
      map.addLayer({
        id: "unclustered-hover",
        type: "circle",
        source: "points",
        filter: ["==", ["id"], -1],
        paint: {
          "circle-color": "transparent",
          "circle-radius": 16,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#fff",
          "circle-stroke-opacity": 0.9,
        },
      });

      // ── Cluster click: zoom in ──────────────────────────────────────────────
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0].properties?.cluster_id;
        const src = map.getSource("points") as maplibregl.GeoJSONSource;
        src.getClusterExpansionZoom(clusterId).then((zoom) => {
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoom + 1 });
        });
      });

      // ── Point click: open popup ─────────────────────────────────────────────
      map.on("click", "unclustered-point", (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties?.data) return;
        const point: AccessibilityPoint = JSON.parse(feature.properties.data);
        setSelected(point);
      });

      // ── Cursor styles ───────────────────────────────────────────────────────
      map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "unclustered-point", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const id = e.features?.[0]?.id;
        if (id != null) map.setFilter("unclustered-hover", ["==", ["id"], id]);
      });
      map.on("mouseleave", "unclustered-point", () => {
        map.getCanvas().style.cursor = "";
        map.setFilter("unclustered-hover", ["==", ["id"], -1]);
      });

      mapLoadedRef.current = true;
      mapRef.current = map;

      // Apply initial data
      (map.getSource("points") as maplibregl.GeoJSONSource).setData(
        buildGeoJSON(applyFilters(points, DEFAULT_FILTERS))
      );
    });

    return () => {
      mapLoadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update source when filters change
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;
    (mapRef.current.getSource("points") as maplibregl.GeoJSONSource).setData(
      buildGeoJSON(filtered)
    );
  }, [filtered]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Filter toggle button */}
      <button
        onClick={() => setFiltersVisible((v) => !v)}
        className={`absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl shadow-md text-sm font-medium transition-colors ${
          filtersVisible
            ? "bg-blue-500 text-white"
            : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        Filters
        {(filters.categories.length > 0 || filters.minScore > 0 || filters.verifiedOnly ||
          filters.hasRamp || filters.hasToilet || filters.hasParking || filters.hasElevator ||
          filters.communityReportsOnly) && (
          <span className="bg-white text-blue-500 rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
            •
          </span>
        )}
      </button>

      {/* Filter count badge */}
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
      <Legend />
    </div>
  );
}
