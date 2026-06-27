import { AccessibilityPoint, RoadSegment } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchPoints(): Promise<AccessibilityPoint[]> {
  const res = await fetch(`${BASE_URL}/api/points`);
  if (!res.ok) throw new Error("Failed to fetch points");
  return res.json();
}

export async function fetchSegments(): Promise<RoadSegment[]> {
  const res = await fetch(`${BASE_URL}/api/segments`);
  if (!res.ok) throw new Error("Failed to fetch segments");
  return res.json();
}
