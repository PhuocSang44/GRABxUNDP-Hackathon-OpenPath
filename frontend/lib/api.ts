import { AccessibilityPoint, RoadSegment } from "./types";
import { API_BASE_URL } from "./config";

export async function fetchPoints(): Promise<AccessibilityPoint[]> {
  const res = await fetch(`${API_BASE_URL}/api/points`);
  if (!res.ok) throw new Error("Failed to fetch points");
  return res.json();
}

export async function fetchSegments(): Promise<RoadSegment[]> {
  const res = await fetch(`${API_BASE_URL}/api/segments`);
  if (!res.ok) throw new Error("Failed to fetch segments");
  return res.json();
}
