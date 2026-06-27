export interface PhotoItem {
  id: string;
  url: string;
  thumbUrl: string;
  caption: string | null;
  created_at: string;
}

export interface GalleryItem {
  point: AccessibilityPoint;
  photo: PhotoItem;
}

export type PointCategory =
  | "accessible_parking"
  | "hospital"
  | "accessible_toilet"
  | "wheelchair_ramp"
  | "accessible_entrance"
  | "bus_stop"
  | "community_report"
  | "accessibility_issue"
  | "blocked_sidewalk"
  | "construction"
  | "broken_curb_ramp";

export interface AccessibilityPoint {
  id: number;
  name: string;
  category: PointCategory;
  lat: number;
  lng: number;
  accessibility_score: number;
  address: string | null;
  description: string | null;
  features: string[];
  issues: string[];
  verified: boolean;
  has_ramp: boolean;
  has_toilet: boolean;
  has_parking: boolean;
  has_elevator: boolean;
  is_community_report: boolean;
  photo_url?: string | null;
  last_updated: string | null;
}

export interface FilterState {
  categories: PointCategory[];
  minScore: number;
}

export const DEFAULT_FILTERS: FilterState = {
  categories: [],
  minScore: 0,
};

// Legacy road segment type kept for API compatibility
export interface RoadSegment {
  id: number;
  name: string | null;
  geometry: GeoJSON.LineString;
  sidewalk: boolean | null;
  sidewalk_side: string | null;
  width_m: number | null;
  surface: string | null;
  curb_ramp: boolean | null;
  obstacles: string[] | null;
  stairs: boolean | null;
  accessibility_score: number | null;
  confidence: number | null;
  source: string | null;
}
