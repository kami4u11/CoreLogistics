import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/components/useRole";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function ODOReminder() {
  const { isAdmin, isAccounting, isOperations, isFleetManager, isManagement, loading } = useRole();
  const [showReminder, setShowReminder] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Check if today is the last day of the month
  const isLastDayOfMonth = () => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    return tomorrow.getDate() === 1;
  };

  const currentMonth = new Date().toISOString().slice(0, 7); // "yyyy-MM"

  // Fetch fleet vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ["odo_reminder_vehicles"],
    queryFn: () => base44.entities.FleetVehicle?.list?.().catch(() => []) ?? [],
    enabled: !loading && (isAdmin || isAccounting || isOperations || isFleetManager || isManagement),
  });

  // Fetch ODO records for current month using .list() — correct base44 API
  // FleetODO entity stores "month" as "yyyy-MM" string
  const { data: odoRecords = [] } = useQuery({
    queryKey: ["odo_reminder_records", currentMonth],
    queryFn: () =>
      base44.entities.FleetODO?.list("-recorded_date", 200).catch(() => []) ?? [],
    enabled: !loading && (isAdmin || isAccounting || isOperations || isFleetManager || isManagement),
  });

  useEffect(() => {
    // Only show on last day of month
    if (!isLastDayOfMonth()) return;
    // Only show to relevant roles
    if (!isAdmin && !isAccounting && !isOperations && !isFleetManager && !isManagement) return;
    // Don't show if data not loaded
    if (!vehicles.length) return;

    // Filter ODO records to current month, then find vehicles without a reading
    const thisMonthRecords = odoRecords.filter(r => r.month === currentMonth);
    const recordedVehicleIds = new Set(thisMonthRecords.map(r => r.vehicle_id).filter(Boolean));
    const pending = vehicles.filter(v => !recordedVehicleIds.has(v.id)).length;

    if (pending > 0) {
      setPendingCount(pending);
      // Only show once per day per browser session
      const todayKey = `odo-reminder-${new Date().toDateString()}`;
      const hasSeenToday = localStorage.getItem(todayKey);
      if (!hasSeenToday) {
        setShowReminder(true);
        localStorage.setItem(todayKey, "1");
      }
    }
  }, [vehicles, odoRecords, isAdmin, isAccounting, isOperations, isFleetManager, isManagement, currentMonth]);

  if (!showReminder || pendingCount === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 max-w-sm z-40 animate-in slide-in-from-bottom">
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900">Month-End ODO Submission</p>
              <p className="text-sm text-red-800 mt-1">
                {pendingCount} vehicle{pendingCount !== 1 ? "s" : ""} pending ODO
                reading for{" "}
                {new Date().toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowReminder(false)}
            className="text-red-600 hover:bg-red-100 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Link to={createPageUrl("FleetODOTracking")} className="block mt-3">
          <Button className="w-full bg-red-700 hover:bg-red-800 rounded-xl text-sm">
            Go to ODO Tracking
          </Button>
        </Link>
      </div>
    </div>
  );
}