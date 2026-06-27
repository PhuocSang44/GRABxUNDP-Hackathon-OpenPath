"use client";

import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col pb-16 overflow-hidden">{children}</div>
      <BottomNav />
    </div>
  );
}
