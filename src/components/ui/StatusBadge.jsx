import React, { memo } from "react";
import { cn } from "@/lib/utils";

const statusStyles = {
  // Load statuses
  booked: "bg-blue-50 text-blue-700 border-blue-200",
  loading: "bg-amber-50 text-amber-700 border-amber-200",
  in_transit: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  // Invoice statuses
  draft: "bg-slate-50 text-slate-600 border-slate-200",
  sent: "bg-sky-50 text-sky-700 border-sky-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  // Vehicle statuses
  available: "bg-green-50 text-green-700 border-green-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
  // Generic
  active: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  assigned: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function StatusBadge({ status, className }) {
  const style = statusStyles[status] || "bg-gray-50 text-gray-600 border-gray-200";
  const label = (status || "unknown").replace(/_/g, " ");

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border",
      style,
      className
    )}>
      {label}
    </span>
  );
}

export default memo(StatusBadge);