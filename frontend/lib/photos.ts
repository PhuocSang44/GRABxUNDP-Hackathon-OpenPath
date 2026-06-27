import { PhotoItem, AccessibilityPoint } from "./types";

const PHOTO_CAPTIONS = [
  "Blocked sidewalk reported by community member",
  "Inaccessible entrance with steps — no ramp alternative",
  "Narrow footpath obstacle preventing wheelchair access",
  "Broken curb ramp hazard — edge collapsed",
  "Flooded pavement making passage impossible",
  "Missing handrail on ramp creates fall risk",
  "Vehicles parked blocking the only accessible path",
  "Severely deteriorated surface condition",
  "Construction debris covering entire footpath",
  "Drain grate gaps wide enough to trap wheelchair wheels",
];

const PHOTO_CATEGORIES = [
  "community_report",
  "accessibility_issue",
  "blocked_sidewalk",
  "construction",
  "broken_curb_ramp",
];

export function getPointPhotos(point: AccessibilityPoint): PhotoItem[] {
  if (point.photo_url) {
    const fullUrl = point.photo_url.startsWith("http")
      ? point.photo_url
      : `http://localhost:8000${point.photo_url}`;
    return [{
      id: `${point.id}-uploaded`,
      url: fullUrl,
      thumbUrl: fullUrl,
      caption: point.description || "Community Report Image",
      created_at: point.last_updated || new Date().toISOString(),
    }];
  }

  if (!PHOTO_CATEGORIES.includes(point.category)) return [];

  const pointId = point.id;
  const count = (pointId % 3) + 1; // 1–3 photos, deterministic per point

  return Array.from({ length: count }, (_, i) => {
    const seed = `hcmc-access-${pointId}-${i}`;
    const captionIdx = (pointId + i) % PHOTO_CAPTIONS.length;
    const msAgo = (pointId * 3_600_000 + i * 1_800_000) % (7 * 24 * 3_600_000);
    return {
      id: `${pointId}-photo-${i}`,
      url: `https://picsum.photos/seed/${seed}/800/500`,
      thumbUrl: `https://picsum.photos/seed/${seed}/200/200`,
      caption: PHOTO_CAPTIONS[captionIdx],
      created_at: new Date(Date.now() - msAgo).toISOString(),
    };
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
