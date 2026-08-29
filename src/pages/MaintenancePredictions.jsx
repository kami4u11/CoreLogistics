import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import { RoleLoading } from "@/components/AccessDenied";
import AccessDenied from "@/components/AccessDenied";
import { format, differenceInDays, addDays, parseISO } from "date-fns";
import { Truck, Wrench, Gauge, Clock, AlertTriangle, CheckCircle, TrendingUp, Info } from "lucide-react";

// ── Urgency config ────────────────────────────────────────────────────────────
function urgencyConfig(daysLeft) {
  if (daysLeft === null) return { label: "Unknown", color: "#94a3b8", bg: "#f1f5f9", icon: Info };
  if (daysLeft < 0)      return { label: `${Math.abs(daysLeft)}d Overdue`, color: "#dc2626", bg: "#fee2e2", icon: AlertTriangle };
  if (daysLeft <= 7)     return { label: `${daysLeft}d left`, color: "#ea580c", bg: "#fff7ed", icon: AlertTriangle };
  if (daysLeft <= 30)    return { label: `${daysLeft}d left`, color: "#d97706", bg: "#fefce8", icon: Clock };
  return                         { label: `${daysLeft}d left`, color: "#059669", bg: "#f0fdf4", icon: CheckCircle };
}

// ── Compute avg daily km from ODO records ─────────────────────────────────────
function calcAvgDailyKm(odoRecords) {
  if (odoRecords.length < 2) return null;
  const sorted = [...odoRecords].sort((a, b) =>
    new Date(a.recorded_date) - new Date(b.recorded_date)
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = differenceInDays(parseISO(last.recorded_date), parseISO(first.recorded_date));
  const kmDiff = (last.odometer_km || 0) - (first.odometer_km || 0);
  if (days <= 0 || kmDiff <= 0) return null;
  return kmDiff / days;
}

// ── Forecast card for one service schedule ────────────────────────────────────
function ForecastCard({ schedule, avgDailyKm, latestOdoKm, latestOdoDate }) {
  const today = new Date();

  // ── KM-based forecast ──
  let kmForecast = null;
  if (schedule.next_service_km && latestOdoKm && avgDailyKm) {
    const kmRemaining = schedule.next_service_km - latestOdoKm;
    if (kmRemaining > 0) {
      const daysToService = Math.round(kmRemaining / avgDailyKm);
      const forecastDate = addDays(today, daysToService);
      kmForecast = { daysLeft: daysToService, date: forecastDate, kmRemaining: Math.round(kmRemaining) };
    } else {
      kmForecast = { daysLeft: Math.round(kmRemaining / (avgDailyKm || 1)), date: today, kmRemaining: Math.round(kmRemaining) };
    }
  }

  // ── Date-based forecast ──
  let dateForecast = null;
  if (schedule.next_service_date) {
    const daysLeft = differenceInDays(parseISO(schedule.next_service_date), today);
    dateForecast = { daysLeft, date: parseISO(schedule.next_service_date) };
  }

  // Pick the sooner of the two
  const primary = (() => {
    if (kmForecast && dateForecast) return kmForecast.daysLeft < dateForecast.daysLeft ? kmForecast : dateForecast;
    return kmForecast || dateForecast;
  })();

  const cfg = urgencyConfig(primary?.daysLeft ?? null);
  const UrgIcon = cfg.icon;

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={15} color="#64748b" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", margin: 0 }}>{schedule.service_type}</p>
            {schedule.last_service_date && (
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Last: {schedule.last_service_date}</p>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: cfg.bg, borderRadius: 20, padding: "4px 10px" }}>
          <UrgIcon size={12} color={cfg.color} />
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>

      {/* Forecast rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {kmForecast && (
          <div style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", borderRadius: 8, padding: "6px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Gauge size={12} color="#6366f1" />
              <span style={{ fontSize: 11, color: "#64748b" }}>ODO Forecast</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>
                {kmForecast.kmRemaining > 0 ? `${kmForecast.kmRemaining.toLocaleString()} km remaining` : `${Math.abs(kmForecast.kmRemaining).toLocaleString()} km overdue`}
              </span>
              <p style={{ fontSize: 10, color: "#94a3b8", margin: 0 }}>~{format(kmForecast.date, "dd MMM yyyy")}</p>
            </div>
          </div>
        )}
        {dateForecast && (
          <div style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", borderRadius: 8, padding: "6px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={12} color="#0ea5e9" />
              <span style={{ fontSize: 11, color: "#64748b" }}>Date Forecast</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1e293b" }}>
              {format(dateForecast.date, "dd MMM yyyy")}
            </span>
          </div>
        )}
        {avgDailyKm && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 4px" }}>
            <TrendingUp size={11} color="#10b981" />
            <span style={{ fontSize: 10, color: "#94a3b8" }}>
              Avg {avgDailyKm.toFixed(1)} km/day · Current ODO: {latestOdoKm?.toLocaleString() ?? "?"} km
            </span>
          </div>
        )}
        {!kmForecast && !dateForecast && (
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "6px 0" }}>
            No next service km/date set — update the Maintenance Schedule.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Vehicle Forecast Panel ────────────────────────────────────────────────────
function VehicleForecastPanel({ vehicle, odoRecords, schedules }) {
  const vOdo = odoRecords.filter(r => r.vehicle_number === vehicle.vehicle_number || r.fleet_vehicle_id === vehicle.id);
  const vSchedules = schedules.filter(s => s.vehicle_number === vehicle.vehicle_number || s.fleet_vehicle_id === vehicle.id);

  const avgDailyKm = useMemo(() => calcAvgDailyKm(vOdo), [vOdo]);

  const latestOdo = useMemo(() => {
    if (!vOdo.length) return null;
    return [...vOdo].sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date))[0];
  }, [vOdo]);

  if (!vSchedules.length) return null;

  // Sort schedules by urgency (most urgent first)
  const sortedSchedules = useMemo(() => {
    const today = new Date();
    return [...vSchedules].sort((a, b) => {
      const daysA = a.next_service_date ? differenceInDays(parseISO(a.next_service_date), today) : 9999;
      const daysB = b.next_service_date ? differenceInDays(parseISO(b.next_service_date), today) : 9999;
      return daysA - daysB;
    });
  }, [vSchedules]);

  const overdueCount = sortedSchedules.filter(s => {
    if (!s.next_service_date) return false;
    return differenceInDays(parseISO(s.next_service_date), new Date()) < 0;
  }).length;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 16 }}>
      {/* Vehicle header */}
      <div style={{ padding: "12px 16px", background: overdueCount > 0 ? "#fef2f2" : "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: overdueCount > 0 ? "#fee2e2" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Truck size={18} color={overdueCount > 0 ? "#dc2626" : "#64748b"} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", margin: 0 }}>{vehicle.vehicle_number}</p>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
              {vehicle.asset_name || vehicle.vehicle_type || "Fleet Vehicle"} · {vSchedules.length} service{vSchedules.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {overdueCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#fee2e2", borderRadius: 20, padding: "3px 9px" }}>
              <AlertTriangle size={11} color="#dc2626" />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626" }}>{overdueCount} overdue</span>
            </div>
          )}
          {avgDailyKm && (
            <p style={{ fontSize: 10, color: "#94a3b8", margin: "4px 0 0", textAlign: "right" }}>
              ~{avgDailyKm.toFixed(1)} km/day
            </p>
          )}
        </div>
      </div>

      {/* Schedules */}
      <div style={{ padding: "12px 14px" }}>
        {sortedSchedules.map(s => (
          <ForecastCard
            key={s.id}
            schedule={s}
            avgDailyKm={avgDailyKm}
            latestOdoKm={latestOdo?.odometer_km}
            latestOdoDate={latestOdo?.recorded_date}
          />
        ))}
        {!avgDailyKm && vOdo.length < 2 && (
          <div style={{ display: "flex", gap: 6, background: "#fefce8", borderRadius: 10, padding: "8px 12px", marginTop: 4 }}>
            <Info size={13} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: "#92400e", margin: 0 }}>
              Add at least 2 ODO readings to enable km-based forecasting for this vehicle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MaintenancePredictions() {
  const { isAdmin, isManagement, isFleetManager, isOperations, isAccounting, loading } = useRole();
  const canView = isAdmin || isManagement || isFleetManager || isOperations || isAccounting;

  const { data: vehicles = [], isLoading: vLoading } = useQuery({
    queryKey: ["fv_pred"],
    queryFn: () => base44.entities.FleetVehicle.list(),
  });
  const { data: odoRecords = [], isLoading: odoLoading } = useQuery({
    queryKey: ["fo_pred"],
    queryFn: () => base44.entities.FleetODO.list("-recorded_date", 500),
  });
  const { data: schedules = [], isLoading: schLoading } = useQuery({
    queryKey: ["ms_pred"],
    queryFn: () => base44.entities.MaintenanceSchedule.list(),
  });

  if (loading) return <RoleLoading />;
  if (!canView) return <AccessDenied />;

  const isLoading = vLoading || odoLoading || schLoading;

  // Only show vehicles that have at least one maintenance schedule
  const vehiclesWithSchedules = vehicles.filter(v =>
    schedules.some(s => s.vehicle_number === v.vehicle_number || s.fleet_vehicle_id === v.id)
  );

  // Summary KPIs
  const today = new Date();
  const allDueDates = schedules
    .filter(s => s.next_service_date)
    .map(s => differenceInDays(parseISO(s.next_service_date), today));

  const overdueTotal = allDueDates.filter(d => d < 0).length;
  const dueIn7 = allDueDates.filter(d => d >= 0 && d <= 7).length;
  const dueIn30 = allDueDates.filter(d => d > 7 && d <= 30).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", paddingBottom: 80 }}>
      <MobileHeader title="Maintenance Forecast" backTo="FleetMaintenance" />

      <div style={{ padding: "16px 16px 0" }}>

        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Overdue", value: overdueTotal, color: "#dc2626", bg: "#fee2e2" },
            { label: "Due ≤7d", value: dueIn7,       color: "#ea580c", bg: "#fff7ed" },
            { label: "Due ≤30d", value: dueIn30,     color: "#d97706", bg: "#fefce8" },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: k.color, margin: 0, opacity: 0.75 }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div style={{ display: "flex", gap: 8, background: "#eff6ff", borderRadius: 12, padding: "10px 14px", marginBottom: 16, border: "1px solid #bfdbfe" }}>
          <Gauge size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "#1d4ed8", margin: 0, lineHeight: 1.5 }}>
            Forecasts are computed from <strong>actual ODO readings</strong> and your Maintenance Schedule intervals — no AI credits consumed.
            The more ODO readings you add, the more accurate the daily km average becomes.
          </p>
        </div>

        {isLoading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading forecast data…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {!isLoading && vehiclesWithSchedules.length === 0 && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Wrench size={48} color="#e2e8f0" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#64748b", fontSize: 14, fontWeight: 600 }}>No Maintenance Schedules Found</p>
            <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              Go to Fleet Maintenance → Schedules tab to add service intervals for your vehicles.
            </p>
          </div>
        )}

        {!isLoading && vehiclesWithSchedules.map(v => (
          <VehicleForecastPanel
            key={v.id}
            vehicle={v}
            odoRecords={odoRecords}
            schedules={schedules}
          />
        ))}
      </div>
    </div>
  );
}