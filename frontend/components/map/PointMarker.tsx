"use client";

import type { ElementType } from "react";

interface Props {
  color: string;
  textColor: string;
  IconComponent: ElementType;
  label: string;
  onClick: () => void;
}

export default function PointMarker({ color, textColor, IconComponent, label, onClick }: Props) {
  return (
    <div
      role="button"
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        backgroundColor: color,
        border: "2.5px solid #ffffff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.28), 0 0 0 1.5px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "scale(1.12)";
        el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.36), 0 0 0 1.5px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "scale(1)";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.28), 0 0 0 1.5px rgba(0,0,0,0.06)";
      }}
    >
      <IconComponent size={20} color={textColor} />
    </div>
  );
}
