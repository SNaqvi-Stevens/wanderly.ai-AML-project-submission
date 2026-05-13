import React from "react";

const colorMap = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-50 text-emerald-700",
  coral: "bg-orange-50 text-orange-600",
  aqua: "bg-cyan-50 text-cyan-700",
};

export default function ScoreBadge({ label, value, color = "primary" }) {
  const classes = colorMap[color] || colorMap.primary;
  return (
    <div className={`flex-1 rounded-lg px-2 py-1.5 text-center ${classes}`}>
      <div className="text-xs font-inter font-medium opacity-70">{label}</div>
      <div className="text-sm font-inter font-bold">{value || 0}</div>
    </div>
  );
}