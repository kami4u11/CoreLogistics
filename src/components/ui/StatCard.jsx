import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, color = "blue", subtitle, onClick }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    green: "from-emerald-500 to-emerald-600",
    red: "from-red-500 to-red-600",
    indigo: "from-indigo-500 to-indigo-600",
    purple: "from-purple-500 to-purple-600",
    slate: "from-slate-600 to-slate-700",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all duration-300",
        "p-3 sm:p-4",
        colors[color] || colors.blue,
        onClick && "cursor-pointer active:scale-[0.98] hover:shadow-xl"
      )}
    >
      <div className="absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 bg-white/10 rounded-full" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-1.5 gap-1">
          <p className="text-[10px] sm:text-xs font-medium text-white/80 leading-tight truncate">{title}</p>
          {Icon && (
            <div className="p-1 sm:p-1.5 bg-white/15 rounded-lg flex-shrink-0">
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          )}
        </div>
        <p className="text-lg sm:text-2xl font-bold tracking-tight leading-tight">{value}</p>
        {subtitle && <p className="text-[9px] sm:text-xs text-white/70 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}