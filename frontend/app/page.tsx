import { fetchPoints } from "@/lib/api";
import { AccessibilityPoint } from "@/lib/types";
import AccessibilityMap from "@/components/AccessibilityMap";

export const dynamic = "force-dynamic";

export default async function Home() {
  let points: AccessibilityPoint[] = [];
  try {
    points = await fetchPoints();
  } catch {
    // Backend not running — show empty map
  }

  return (
    <main className="flex flex-col h-screen">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500 text-white font-bold text-sm">
          A
        </div>
        <div>
          <h1 className="font-bold text-gray-900 leading-none text-sm">AccessibleMap</h1>
          <p className="hidden sm:block text-xs text-gray-500 leading-none mt-0.5">
            Ho Chi Minh City — Wheelchair Accessibility
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
          <span
            className={`w-2 h-2 rounded-full ${points.length > 0 ? "bg-green-500" : "bg-red-400"}`}
          />
          {points.length > 0 ? `${points.length} locations` : "Offline"}
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <AccessibilityMap points={points} />
      </div>
    </main>
  );
}
