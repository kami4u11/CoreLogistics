import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Truck, Users, AlertTriangle,
  Award, Target, Activity, ChevronRight
} from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];
const RED = "#ef4444";

export default function DecisionDashboard() {
  const { fmt, fmtK } = useAppSettings();
  const { canSeeAccounting, canSeeAllData } = useRole();
  const [period, setPeriod] = useState("3"); // months

  const { data: loads = [] } = useQuery({
    queryKey: ["loads_dd"],
    queryFn: () => base44.entities.Load.list("-loading_date", 1000),
  });
  const { data: trips = [] } = useQuery({
    queryKey: ["fleet_trips_dd"],
    queryFn: () => base44.entities.FleetTrip.list("-trip_date", 500),
  });
  const { data: fleetExpenses = [] } = useQuery({
    queryKey: ["fleet_exp_dd"],
    queryFn: () => base44.entities.FleetExpense.list("-expense_date", 500),
  });

  const cutoff = format(subMonths(new Date(), parseInt(period)), "yyyy-MM-dd");

  const filtered = useMemo(() => loads.filter(l => (l.loading_date || l.created_date || "") >= cutoff), [loads, cutoff, period]);

  // Profit per trip
  const tripProfits = useMemo(() => {
    return filtered.map(l => {
      const income = l.freight_amount || 0;
      const cost = (l.broker_hired_amount || 0) + (l.labor_charges || 0) + (l.other_charges || 0);
      const profit = income - cost;
      const margin = income > 0 ? (profit / income) * 100 : 0;
      return { ...l, income, cost, profit, margin };
    }).sort((a, b) => b.profit - a.profit);
  }, [filtered]);

  // Profit per vehicle
  const vehicleProfits = useMemo(() => {
    const map = {};
    tripProfits.forEach(l => {
      const veh = l.vehicle_number || l.vehicle_type || "Unknown";
      if (!map[veh]) map[veh] = { vehicle: veh, income: 0, cost: 0, trips: 0 };
      map[veh].income += l.income;
      map[veh].cost += l.cost;
      map[veh].trips += 1;
    });
    return Object.values(map).map(v => ({ ...v, profit: v.income - v.cost })).sort((a, b) => b.profit - a.profit);
  }, [tripProfits]);

  // Top clients by revenue
  const clientRevenue = useMemo(() => {
    const map = {};
    tripProfits.forEach(l => {
      const c = l.client_name || "Unknown";
      if (!map[c]) map[c] = { client: c, revenue: 0, trips: 0, profit: 0 };
      map[c].revenue += l.income;
      map[c].trips += 1;
      map[c].profit += l.profit;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [tripProfits]);

  // Loss-making trips
  const lossTrips = tripProfits.filter(l => l.profit < 0).sort((a, b) => a.profit - b.profit);

  // Summary stats
  const totalRevenue = tripProfits.reduce((s, l) => s + l.income, 0);
  const totalCost = tripProfits.reduce((s, l) => s + l.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  if (!canSeeAccounting) return <AccessDenied />;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-24">
      <MobileHeader title="Decision Dashboard" backTo="Accounting" />

      {/* Period filter */}
      <div className="px-4 pt-3 flex gap-2">
        {[
          { v: "1", l: "1M" }, { v: "3", l: "3M" }, { v: "6", l: "6M" }, { v: "12", l: "1Y" }
        ].map(p => (
          <button key={p.v} onClick={() => setPeriod(p.v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${period === p.v ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
            {p.l}
          </button>
        ))}
        <span className="text-xs text-slate-400 self-center ml-auto">{filtered.length} trips</span>
      </div>

      {/* Top KPIs */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-3 mb-4">
        <div className={`rounded-2xl p-4 ${totalProfit >= 0 ? "bg-gradient-to-br from-emerald-600 to-emerald-700" : "bg-gradient-to-br from-red-600 to-red-700"} text-white`}>
          <p className="text-xs text-white/70">Total Profit</p>
          <p className="text-xl font-black mt-1">{fmtK(Math.abs(totalProfit))}</p>
          <p className={`text-xs mt-1 font-bold ${totalProfit >= 0 ? "text-emerald-200" : "text-red-200"}`}>
            {totalProfit >= 0 ? "▲ PROFIT" : "▼ LOSS"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Avg Margin</p>
          <p className={`text-xl font-black mt-1 ${parseFloat(avgMargin) >= 15 ? "text-green-700" : parseFloat(avgMargin) >= 5 ? "text-amber-700" : "text-red-700"}`}>
            {avgMargin}%
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Profit / Revenue</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Revenue</p>
          <p className="text-lg font-black text-blue-700">{fmtK(totalRevenue)}</p>
          <p className="text-[10px] text-slate-400">{filtered.length} trips</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs text-slate-500">Loss-Making Trips</p>
          <p className={`text-xl font-black mt-1 ${lossTrips.length > 0 ? "text-red-700" : "text-green-700"}`}>
            {lossTrips.length}
          </p>
          <p className="text-[10px] text-slate-400">{lossTrips.length > 0 ? "⚠ Needs attention" : "✓ All profitable"}</p>
        </div>
      </div>

      {/* Profit per vehicle chart */}
      {vehicleProfits.length > 0 && (
        <div className="px-4 mb-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-700 mb-3">Profit per Vehicle</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={vehicleProfits.slice(0, 8)} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="vehicle" tick={{ fontSize: 8 }} />
                <YAxis tick={{ fontSize: 8 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" name="Profit" radius={[3, 3, 0, 0]}
                  fill="#10b981"
                  label={false}
                >
                  {vehicleProfits.slice(0, 8).map((entry, idx) => (
                    <Cell key={idx} fill={entry.profit >= 0 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Clients */}
      <div className="px-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-300" />
            <p className="text-xs font-bold">Top Clients by Revenue</p>
          </div>
          {clientRevenue.slice(0, 10).map((c, i) => (
            <div key={c.client} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-500"}`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800">{c.client}</p>
                <p className="text-[10px] text-slate-400">{c.trips} trips</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-blue-700">{fmt(c.revenue)}</p>
                <p className={`text-[10px] font-medium ${c.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {c.profit >= 0 ? "▲" : "▼"} {fmt(Math.abs(c.profit))} profit
                </p>
              </div>
            </div>
          ))}
          {clientRevenue.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No data for selected period</p>}
        </div>
      </div>

      {/* Loss-Making Trips */}
      {lossTrips.length > 0 && (
        <div className="px-4 mb-5">
          <div className="bg-white rounded-2xl border border-red-100 overflow-hidden">
            <div className="bg-red-600 text-white px-4 py-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-xs font-bold">Loss-Making Trips ({lossTrips.length})</p>
            </div>
            {lossTrips.slice(0, 8).map(l => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3 border-b border-red-50 last:border-0">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800">{l.load_number}</p>
                  <p className="text-[10px] text-slate-400">{l.client_name} · {l.origin} → {l.destination}</p>
                  <p className="text-[10px] text-slate-400">{l.loading_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-red-600">{fmt(Math.abs(l.profit))} loss</p>
                  <p className="text-[10px] text-slate-400">Rev: {fmt(l.income)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top profitable trips */}
      <div className="px-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-emerald-700 text-white px-4 py-2.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <p className="text-xs font-bold">Most Profitable Trips</p>
          </div>
          {tripProfits.filter(l => l.profit > 0).slice(0, 8).map((l, i) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
              <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-[9px] font-black text-emerald-700">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800">{l.load_number}</p>
                <p className="text-[10px] text-slate-400">{l.client_name} · {l.vehicle_number || l.vehicle_type}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-700">{fmt(l.profit)}</p>
                <p className="text-[10px] text-green-600">{l.margin.toFixed(1)}% margin</p>
              </div>
            </div>
          ))}
          {tripProfits.filter(l => l.profit > 0).length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No profitable trips in selected period</p>
          )}
        </div>
      </div>
    </div>
  );
}