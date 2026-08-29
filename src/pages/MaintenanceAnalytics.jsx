import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { useAppSettings } from "@/components/AppSettings";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { Wrench, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const MAINTENANCE_LABELS = {
  oil_change: "Oil Change", tire_rotation: "Tire Rotation", brake_inspection: "Brake Inspection",
  engine_service: "Engine Service", battery_check: "Battery Check", ac_service: "AC Service",
  general_service: "General Service", custom: "Custom"
};

const DEFECT_LABELS = {
  engine: "Engine", brakes: "Brakes", tyres: "Tyres", lights: "Lights", electrical: "Electrical",
  body_damage: "Body Damage", suspension: "Suspension", fuel_system: "Fuel System", ac_cooling: "AC/Cooling", other: "Other"
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1"];

function StatCard({ icon: Icon, label, value, sub, color = "blue" }) {
  const bg = { blue: "bg-blue-50", green: "bg-green-50", amber: "bg-amber-50", red: "bg-red-50" };
  const ic = { blue: "text-blue-600", green: "text-green-600", amber: "text-amber-600", red: "text-red-600" };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className={`w-9 h-9 ${bg[color]} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${ic[color]}`} />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function MaintenanceAnalytics() {
  const { isAdmin, isFleetManager, isOperations, isAccounting } = useRole();
  const canView = isAdmin || isFleetManager || isOperations || isAccounting;
  if (!canView) return <AccessDenied />;

  const { fmt } = useAppSettings();
  const [vehicleFilter, setVehicleFilter] = useState("all");

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["maintenanceRecords"],
    queryFn: () => base44.entities.MaintenanceRecord.list("-completion_date", 500),
  });

  const { data: defects = [], isLoading: loadingDefects } = useQuery({
    queryKey: ["defectReports"],
    queryFn: () => base44.entities.DefectReport.list("-report_date", 500),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["fleet"],
    queryFn: () => base44.entities.FleetVehicle.list(),
  });

  const vehicleNumbers = useMemo(() => [...new Set(records.map(r => r.vehicle_number).filter(Boolean))], [records]);

  const filteredRecords = useMemo(() =>
    vehicleFilter === "all" ? records : records.filter(r => r.vehicle_number === vehicleFilter),
    [records, vehicleFilter]
  );

  // 1. Cost per vehicle
  const costPerVehicle = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      if (!r.vehicle_number) return;
      map[r.vehicle_number] = (map[r.vehicle_number] || 0) + (r.cost_pkr || 0);
    });
    return Object.entries(map)
      .map(([vehicle, cost]) => ({ vehicle, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [filteredRecords]);

  // 2. Most frequent maintenance types
  const typeFrequency = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const label = r.maintenance_type === "custom" ? (r.custom_type_label || "Custom") : (MAINTENANCE_LABELS[r.maintenance_type] || r.maintenance_type);
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // 3. Average interval between maintenance per type
  const avgInterval = useMemo(() => {
    const byType = {};
    filteredRecords.forEach(r => {
      const label = r.maintenance_type === "custom" ? (r.custom_type_label || "Custom") : (MAINTENANCE_LABELS[r.maintenance_type] || r.maintenance_type);
      if (!byType[label]) byType[label] = [];
      if (r.completion_date) byType[label].push(r.completion_date);
    });
    return Object.entries(byType).map(([type, dates]) => {
      if (dates.length < 2) return { type, avgDays: 0 };
      const sorted = [...dates].sort();
      let totalDiff = 0, count = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalDiff += differenceInDays(parseISO(sorted[i]), parseISO(sorted[i - 1]));
        count++;
      }
      return { type, avgDays: count ? Math.round(totalDiff / count) : 0 };
    }).filter(x => x.avgDays > 0).sort((a, b) => a.avgDays - b.avgDays);
  }, [filteredRecords]);

  // 4. Defect trends by category
  const defectByCategory = useMemo(() => {
    const map = {};
    defects.forEach(d => {
      const label = DEFECT_LABELS[d.defect_category] || d.defect_category || "Other";
      if (!map[label]) map[label] = { total: 0, open: 0, resolved: 0 };
      map[label].total++;
      if (d.status === "open" || d.status === "in_progress") map[label].open++;
      if (d.status === "resolved") map[label].resolved++;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);
  }, [defects]);

  // 5. Monthly cost trend
  const monthlyCost = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      if (!r.completion_date) return;
      const month = r.completion_date.slice(0, 7);
      map[month] = (map[month] || 0) + (r.cost_pkr || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, cost]) => ({ month: month.slice(2), cost }));
  }, [filteredRecords]);

  // KPIs
  const totalCost = filteredRecords.reduce((s, r) => s + (r.cost_pkr || 0), 0);
  const totalRecords = filteredRecords.length;
  const openDefectsCount = defects.filter(d => d.status === "open" || d.status === "in_progress").length;
  const avgCostPerService = totalRecords > 0 ? Math.round(totalCost / totalRecords) : 0;

  if (loadingRecords || loadingDefects) return (
    <div className="pb-24">
      <MobileHeader title="Maintenance Analytics" backTo="FleetMaintenance" />
      <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading data...</div>
    </div>
  );

  return (
    <div className="pb-28">
      <MobileHeader title="Maintenance Analytics" backTo="FleetMaintenance" />

      <div className="px-4 py-4 space-y-6">

        {/* Vehicle Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setVehicleFilter("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${vehicleFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
            All Vehicles
          </button>
          {vehicleNumbers.map(vn => (
            <button key={vn} onClick={() => setVehicleFilter(vn)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${vehicleFilter === vn ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
              {vn}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Wrench} label="Total Maintenance Cost" value={fmt(totalCost)} color="blue" />
          <StatCard icon={Calendar} label="Total Services" value={totalRecords} sub="maintenance records" color="green" />
          <StatCard icon={TrendingUp} label="Avg Cost / Service" value={fmt(avgCostPerService)} color="amber" />
          <StatCard icon={AlertTriangle} label="Open Defects" value={openDefectsCount} color="red" />
        </div>

        {/* Monthly Cost Trend */}
        {monthlyCost.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-bold text-slate-800 mb-1">Monthly Maintenance Cost</p>
            <p className="text-xs text-slate-400 mb-4">Last 12 months</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyCost}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [fmt(v), "Cost"]} />
                <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost Per Vehicle */}
        {costPerVehicle.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-bold text-slate-800 mb-1">Total Cost per Vehicle</p>
            <p className="text-xs text-slate-400 mb-4">All-time maintenance spend</p>
            <ResponsiveContainer width="100%" height={costPerVehicle.length * 36 + 20}>
              <BarChart data={costPerVehicle} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="vehicle" tick={{ fontSize: 10 }} width={70} />
                <Tooltip formatter={(v) => [fmt(v), "Total Cost"]} />
                <Bar dataKey="cost" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Most Frequent Types */}
        {typeFrequency.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-bold text-slate-800 mb-1">Most Frequent Maintenance Types</p>
            <p className="text-xs text-slate-400 mb-4">Number of times performed</p>
            <div className="flex gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={typeFrequency} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                    {typeFrequency.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[180px]">
                {typeFrequency.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-slate-600 truncate max-w-[90px]">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800">{item.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Average Interval */}
        {avgInterval.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-bold text-slate-800 mb-1">Avg. Days Between Services</p>
            <p className="text-xs text-slate-400 mb-4">Per maintenance type</p>
            <ResponsiveContainer width="100%" height={avgInterval.length * 36 + 20}>
              <BarChart data={avgInterval} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} unit=" d" />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v) => [`${v} days`, "Avg Interval"]} />
                <Bar dataKey="avgDays" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Defect Trends */}
        {defectByCategory.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-bold text-slate-800 mb-1">Defect Trends by Category</p>
            <p className="text-xs text-slate-400 mb-4">Open vs resolved issues</p>
            <ResponsiveContainer width="100%" height={defectByCategory.length * 40 + 20}>
              <BarChart data={defectByCategory} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open" name="Open" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Defect Severity Pie */}
        {defects.length > 0 && (() => {
          const sev = { critical: 0, major: 0, minor: 0 };
          defects.forEach(d => { if (sev[d.severity] !== undefined) sev[d.severity]++; });
          const sevData = [
            { name: "Critical", value: sev.critical, color: "#ef4444" },
            { name: "Major", value: sev.major, color: "#f97316" },
            { name: "Minor", value: sev.minor, color: "#f59e0b" },
          ].filter(x => x.value > 0);
          return (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-bold text-slate-800 mb-1">Defect Severity Breakdown</p>
              <p className="text-xs text-slate-400 mb-4">All reported defects</p>
              <div className="flex gap-4 items-center">
                <ResponsiveContainer width="50%" height={140}>
                  <PieChart>
                    <Pie data={sevData} dataKey="value" cx="50%" cy="50%" outerRadius={60} paddingAngle={3}>
                      {sevData.map((item, i) => <Cell key={i} fill={item.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {sevData.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-slate-600">{item.name}</span>
                      <span className="text-xs font-bold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {records.length === 0 && defects.length === 0 && (
          <div className="text-center py-16">
            <Wrench className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No maintenance data yet.</p>
            <p className="text-slate-300 text-xs mt-1">Start logging maintenance records to see analytics.</p>
          </div>
        )}
      </div>
    </div>
  );
}