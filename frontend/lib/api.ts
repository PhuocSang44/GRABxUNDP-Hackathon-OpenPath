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

export async function fetchUnverifiedReports(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/reports/unverified`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch unverified reports");
  return res.json();
}

export async function verifyReport(id: number, token: string) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${id}/verify`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to verify report");
  return res.json();
}

export async function rejectReport(id: number, token: string) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to reject report");
  return res.json();
}

export async function fetchVerifiedReports(token: string) {
  const res = await fetch(`${API_BASE_URL}/api/reports/verified`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch verified reports");
  return res.json();
}

export async function hideReport(id: number, token: string) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${id}/hide`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to hide report");
  return res.json();
}
