"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import maplibregl from "maplibre-gl";
import {
  AccessibilityPoint,
  DEFAULT_FILTERS,
  FilterState,
  GalleryItem,
} from "@/lib/types";
import { CATEGORY_CONFIG, getScoreColor, makeSvgMarker } from "@/lib/markers";
import { getPointPhotos } from "@/lib/photos";
import FilterPanel from "./FilterPanel";
import PointPopup from "./PointPopup";
import Legend from "./Legend";
import ClusterMarker from "./map/ClusterMarker";
import ClusterGallery from "./map/ClusterGallery";
import ReportForm from "./ReportForm";

interface Props {
  points: AccessibilityPoint[];
}

const HCMC_CENTER: [number, number] = [106.7031, 10.7731];
const CATEGORIES = Object.keys(CATEGORY_CONFIG) as (keyof typeof CATEGORY_CONFIG)[];

interface ClusterEntry {
  marker: maplibregl.Marker;
  root: Root;
  count: number;
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
      const photos = getPointPhotos(p);
      return {
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
          firstPhoto: photos[0]?.thumbUrl ?? null,
          data: JSON.stringify(p),
        },
      };
    }),
  };
}

export default function AccessibilityMap({ points }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const clusterMarkersRef = useRef(new Map<number, ClusterEntry>());

  const [selected, setSelected] = useState<AccessibilityPoint | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [reportLocation, setReportLocation] = useState<{lat: number, lng: number} | null>(null);

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

    map.on("load", async () => {
      // Pre-load category icons for individual point symbols
      await Promise.all(
        CATEGORIES.map(
          (cat) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                if (!map.hasImage(`marker-${cat}`)) map.addImage(`marker-${cat}`, img);
                resolve();
              };
              img.onerror = () => resolve();
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

      // ── Individual point layers (unclustered) ──────────────────────────────
      map.addLayer({
        id: "unclustered-ring",
        type: "circle",
        source: "points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "scoreColor"],
          "circle-radius": 14,
        },
      });

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

      // ── Point click ────────────────────────────────────────────────────────
      map.on("click", "unclustered-point", (e) => {
        const feature = e.features?.[0];
        if (!feature?.properties?.data) return;
        const point: AccessibilityPoint = JSON.parse(feature.properties.data);
        setGalleryItems([]);
        setReportLocation(null);
        setSelected(point);
      });

      // ── Hover ──────────────────────────────────────────────────────────────
      map.on("mouseenter", "unclustered-point", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const id = e.features?.[0]?.id;
        if (id != null) map.setFilter("unclustered-hover", ["==", ["id"], id]);
      });
      map.on("mouseleave", "unclustered-point", () => {
        map.getCanvas().style.cursor = "";
        map.setFilter("unclustered-hover", ["==", ["id"], -1]);
      });

      // ── Cluster DOM markers via render event ───────────────────────────────
      const syncClusterMarkers = () => {
        if (!map.isSourceLoaded("points")) return;

        const features = map.querySourceFeatures("points", {
          filter: ["has", "point_count"],
        });

        const seenIds = new Set<number>();

        for (const feature of features) {
          const props = feature.properties!;
          const clusterId = props.cluster_id as number;
          const count = props.point_count as number;
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

          seenIds.add(clusterId);

          const existing = clusterMarkersRef.current.get(clusterId);

          if (!existing) {
            const container = document.createElement("div");
            const root = createRoot(container);
            const source = map.getSource("points") as maplibregl.GeoJSONSource;

            const handleClusterClick = async () => {
              // Zoom into cluster
              try {
                const zoom = await source.getClusterExpansionZoom(clusterId);
                map.easeTo({ center: coords, zoom, duration: 500 });
              } catch {}

              // Build gallery from leaves that have photos
              try {
                const leaves = await source.getClusterLeaves(clusterId, 100, 0);
                const items: GalleryItem[] = leaves.flatMap((leaf) => {
                  if (!leaf.properties?.data) return [];
                  const point: AccessibilityPoint = JSON.parse(leaf.properties.data);
                  const photos = getPointPhotos(point);
                  return photos.length > 0 ? [{ point, photo: photos[0] }] : [];
                });
                setSelected(null);
                if (items.length > 0) setGalleryItems(items);
              } catch {}
            };

            root.render(
              <ClusterMarker
                count={count}
                getLeaves={(limit) => source.getClusterLeaves(clusterId, limit, 0)}
                onClick={handleClusterClick}
              />
            );

            const marker = new maplibregl.Marker({ element: container, anchor: "center" })
              .setLngLat(coords)
              .addTo(map);

            clusterMarkersRef.current.set(clusterId, { marker, root, count });
          }
        }

        // Remove stale cluster markers
        for (const [id, entry] of clusterMarkersRef.current) {
          if (!seenIds.has(id)) {
            entry.root.unmount();
            entry.marker.remove();
            clusterMarkersRef.current.delete(id);
          }
        }
      };

      map.on("render", syncClusterMarkers);

      mapLoadedRef.current = true;
      mapRef.current = map;

      // Apply initial filtered data
      (map.getSource("points") as maplibregl.GeoJSONSource).setData(
        buildGeoJSON(applyFilters(points, DEFAULT_FILTERS))
      );

      // Handle map clicks to create reports
      map.on("click", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered-point"] });
        if (features.length > 0) return; // Handled by point click

        setSelected(null);
        setReportLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    });

    return () => {
      mapLoadedRef.current = false;
      for (const { marker, root } of clusterMarkersRef.current.values()) {
        root.unmount();
        marker.remove();
      }
      clusterMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update source when filters change ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;
    // Clear existing cluster markers — they'll be recreated by syncClusterMarkers
    for (const { marker, root } of clusterMarkersRef.current.values()) {
      root.unmount();
      marker.remove();
    }
    clusterMarkersRef.current.clear();
    (mapRef.current.getSource("points") as maplibregl.GeoJSONSource).setData(
      buildGeoJSON(filtered)
    );
  }, [filtered]);

  const handleCurrentLocationReport = () => {
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
        setReportLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        alert("Unable to retrieve your location. Please check your browser permissions.");
      }
    );
  };

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

      <button
        onClick={handleCurrentLocationReport}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 hover:shadow-xl transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Report at Current Location
      </button>

      {reportLocation && (
        <div className="absolute top-4 right-4 z-10">
          <ReportForm
            lat={reportLocation.lat}
            lng={reportLocation.lng}
            onClose={() => setReportLocation(null)}
            onSubmitSuccess={() => {
              setReportLocation(null);
              window.location.reload();
            }}
          />
        </div>
      )}
    </div>
  );
}
