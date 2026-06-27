export function scoreColor(score: number | null): string {
  if (score === null) return "#94a3b8"; // gray — unknown
  if (score >= 75) return "#22c55e";   // green — accessible
  if (score >= 40) return "#f59e0b";   // amber — limited
  return "#ef4444";                    // red — not accessible
}

export function scoreLabel(score: number | null): string {
  if (score === null) return "Unknown";
  if (score >= 75) return "Accessible";
  if (score >= 40) return "Limited accessibility";
  return "Not accessible";
}
