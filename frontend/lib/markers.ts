import { PointCategory } from "./types";
import type { ElementType } from "react";
import {
  LuSquareParking,
  LuHospital,
  LuToilet,
  LuArrowUpFromLine,
  LuDoorOpen,
  LuBus,
  LuMessageSquareWarning,
  LuTriangleAlert,
} from "react-icons/lu";

export interface CategoryConfig {
  label: string;
  color: string;
  textColor: string;
  icon: string;             // text fallback (legend, badges)
  IconComponent: ElementType;
}

export const CATEGORY_CONFIG: Record<PointCategory, CategoryConfig> = {
  accessible_parking:  { label: "Accessible Parking",   color: "#3b82f6", textColor: "#fff", icon: "P", IconComponent: LuSquareParking },
  hospital:            { label: "Hospital",              color: "#ef4444", textColor: "#fff", icon: "H", IconComponent: LuHospital },
  accessible_toilet:   { label: "Accessible Toilet",    color: "#06b6d4", textColor: "#fff", icon: "T", IconComponent: LuToilet },
  wheelchair_ramp:     { label: "Wheelchair Ramp",      color: "#22c55e", textColor: "#fff", icon: "R", IconComponent: LuArrowUpFromLine },
  accessible_entrance: { label: "Accessible Entrance",  color: "#8b5cf6", textColor: "#fff", icon: "E", IconComponent: LuDoorOpen },
  bus_stop:            { label: "Bus Stop",              color: "#f97316", textColor: "#fff", icon: "B", IconComponent: LuBus },
  community_report:    { label: "Community Report",     color: "#eab308", textColor: "#000", icon: "C", IconComponent: LuMessageSquareWarning },
  accessibility_issue: { label: "Accessibility Issue",  color: "#dc2626", textColor: "#fff", icon: "!", IconComponent: LuTriangleAlert },
  blocked_sidewalk:    { label: "Blocked Sidewalk",     color: "#dc2626", textColor: "#fff", icon: "!", IconComponent: LuTriangleAlert },
  construction:        { label: "Construction",         color: "#f97316", textColor: "#fff", icon: "C", IconComponent: LuTriangleAlert },
  broken_curb_ramp:    { label: "Broken Curb Ramp",     color: "#ef4444", textColor: "#fff", icon: "!", IconComponent: LuTriangleAlert },
  flooded:             { label: "Flooded",              color: "#3b82f6", textColor: "#fff", icon: "W", IconComponent: LuMessageSquareWarning },
  parked_motorcycles:  { label: "Parked Motorcycles",   color: "#dc2626", textColor: "#fff", icon: "M", IconComponent: LuTriangleAlert },
  newly_accessible:    { label: "Newly Accessible",     color: "#22c55e", textColor: "#fff", icon: "✓", IconComponent: LuArrowUpFromLine },
};

export const SCORE_BANDS = [
  { min: 90, max: 100, color: "#16a34a", label: "Excellent" },
  { min: 70, max: 89,  color: "#22c55e", label: "Good" },
  { min: 50, max: 69,  color: "#eab308", label: "Moderate" },
  { min: 30, max: 49,  color: "#f97316", label: "Limited" },
  { min: 0,  max: 29,  color: "#ef4444", label: "Poor" },
];

export function getScoreColor(score: number): string {
  const band = SCORE_BANDS.find((b) => score >= b.min && score <= b.max);
  return band?.color ?? "#94a3b8";
}

export function getScoreLabel(score: number): string {
  const band = SCORE_BANDS.find((b) => score >= b.min && score <= b.max);
  return band?.label ?? "Unknown";
}

export function makeSvgMarker(category: PointCategory, score: number): string {
  const { color, textColor, icon } = CATEGORY_CONFIG[category];
  const ring = getScoreColor(score);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <circle cx="16" cy="16" r="15" fill="${ring}" />
    <circle cx="16" cy="16" r="12" fill="${color}" />
    <text x="16" y="21" text-anchor="middle" font-size="12" font-weight="bold" font-family="Arial,sans-serif" fill="${textColor}">${icon}</text>
    <polygon points="10,28 22,28 16,40" fill="${ring}" />
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
