import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import { useAppSettings } from "@/components/AppSettings";
import AccessDenied from "@/components/AccessDenied";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { startOfDay, subDays, subMonths, subYears, startOfYear, format, parseISO, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { TrendingUp, TrendingDown, CalendarDays, Truck, IndianRupee, Award, AlertCircle } from "lucide-react";

const COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

const RANGES = [
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
  { label: "YTD", value: "ytd" },
];

function getStartDate(range) {
  const now = new Date();
  switch (range) {
    case "1d": return subDays(now, 1);
    case "1w": return subDays(now, 7);
    case "1m": return subMonths(now, 1);
    case "3m": return subMonths(now, 3);
    case "1y": return subYears(now, 1);
    case "5y": return subYears(now, 5);
    case "ytd": return startOfYear(now);
    default: return subMonths(now, 1);
  }
}

export default function LabourAnalytics() {
  const { isAdmin, isManagement, isLabourSupervisor, isAccounting } = useRole();
  const { fmt } = useAppSettings();
  const canAccess = isAdmin || isManagement || isLabourSupervisor || isAccounting;
  const [range, setRange] = useState("1m");

  const { data: entries = [] } = useQuery({
  queryKey: ["labour_entries_all"],
  queryFn: async () => {
    const list = await base44.entities.LaborEntry.list("-date", 2000);
    return list.filter(e => !e.notes?.startsWith("__PAYMENT__"));
  },
});

  const filtered = useMemo(() => {
    const start = getStartDate(range);
    return entries.filter(e => e.date && new Date(e.date) >= start);
  }, [entries, range]);

  // Daily aggregation
  const byDay = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      if (!map[e.date]) map[e.date] = { date: e.date, total: 0, count: 0 };
      map[e.date].total += e.labor_charges || 0;
      map[e.date].count += 1;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      label: format(parseISO(d.date), range === "1d" || range === "1w" ? "dd MMM" : range === "1m" ? "dd" : "MMM dd"),
    }));
  }, [filtered, range]);

  // Vehicle type breakdown
  const byVehicleType = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const vt = e.vehicle_type || "Unknown";
      if (!map[vt]) map[vt] = { name: vt, count: 0, total: 0 };
      map[vt].count += 1;
      map[vt].total += e.labor_charges || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Most / Least work days
  const sortedDays = useMemo(() => [...byDay].sort((a, b) => b.total - a.total), [byDay]);
  const mostMoneyDay = sortedDays[0];
  const leastMoneyDay = sortedDays[sortedDays.length - 1];
  const mostWorkDay = [...byDay].sort((a, b) => b.count - a.count)[0];
  const leastWorkDay = [...byDay].sort((a, b) => a.count - b.count)[0];

  const totalEarnings = filtered.reduce((s, e) => s + (e.labor_charges || 0), 0);
  const totalJobs = filtered.length;
  const avgPerDay = byDay.length > 0 ? totalEarnings / byDay.length : 0;

  if (!canAccess) return <AccessDenied />;

  return (
    <div className="pb-24">
      <MobileHeader title="Labour Analytics" backTo="LabourEntry" />

      {/* Range Selector */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${range === r.value ? "bg-amber-500 text-white shadow" : "bg-white text-slate-500 border border-slate-200"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 grid grid-cols-3 gap-2 mb-4">
        <div className="bg-amber-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-amber-600 font-medium">Total Earnings</p>
          <p className="text-sm font-bold text-amber-700">{fmt(totalEarnings)}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-blue-600 font-medium">Total Jobs</p>
          <p className="text-sm font-bold text-blue-700">{totalJobs}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-green-600 font-medium">Avg/Day</p>
          <p className="text-sm font-bold text-green-700">{fmt(avgPerDay)}</p>
        </div>
      </div>

      {/* Labour Charges Over Time */}
      {byDay.length > 0 && (
        <div className="mx-4 bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Labour Charges Over Time</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byDay}>
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} width={50} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => fmt(v)} labelStyle={{ fontSize: 10 }} />
              <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Job Count Over Time */}
      {byDay.length > 0 && (
        <div className="mx-4 bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Daily Job Count</h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={byDay}>
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} width={30} allowDecimals={false} />
              <Tooltip labelStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Vehicle Type Breakdown */}
      {byVehicleType.length > 0 && (
        <div className="mx-4 bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Most Loaded Vehicle Types</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={byVehicleType} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 9 }}>
                {byVehicleType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {byVehicleType.map((vt, i) => (
              <div key={vt.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-slate-700">{vt.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800">{vt.count} jobs</span>
                  <span className="text-xs text-slate-400 ml-2">{fmt(vt.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      <div className="mx-4 grid grid-cols-2 gap-3 mb-4">
        {mostMoneyDay && (
          <div className="bg-green-50 rounded-2xl p-3 border border-green-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-[10px] font-bold text-green-700">BEST EARNING DAY</span>
            </div>
            <p className="text-sm font-bold text-green-800">{fmt(mostMoneyDay.total)}</p>
            <p className="text-xs text-green-600">{mostMoneyDay.date}</p>
          </div>
        )}
        {leastMoneyDay && (
          <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-[10px] font-bold text-red-600">LEAST EARNING DAY</span>
            </div>
            <p className="text-sm font-bold text-red-700">{fmt(leastMoneyDay.total)}</p>
            <p className="text-xs text-red-500">{leastMoneyDay.date}</p>
          </div>
        )}
        {mostWorkDay && (
          <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-bold text-blue-700">BUSIEST DAY</span>
            </div>
            <p className="text-sm font-bold text-blue-800">{mostWorkDay.count} jobs</p>
            <p className="text-xs text-blue-600">{mostWorkDay.date}</p>
          </div>
        )}
        {leastWorkDay && (
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500">SLOWEST DAY</span>
            </div>
            <p className="text-sm font-bold text-slate-700">{leastWorkDay.count} jobs</p>
            <p className="text-xs text-slate-500">{leastWorkDay.date}</p>
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BarChart className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No data for selected period</p>
        </div>
      )}
    </div>
  );
}