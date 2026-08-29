import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import MobileHeader from "@/components/ui/MobileHeader";
import StatCard from "@/components/ui/StatCard";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AccessDenied from "@/components/AccessDenied";

export default function ComprehensiveDashboard() {
  const { canSeeAccounting, canSeeFleetFinancials } = useRole();
  const { settings, fmt, fmtK } = useAppSettings();
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  if (!canSeeAccounting && !canSeeFleetFinancials) {
    return <AccessDenied />;
  }

  // Fetch all financial data
  const { data: pnlData = [] } = useQuery({
    queryKey: ["pnl"],
    queryFn: () => base44.entities.TransactionLedger?.list?.() || [],
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["entries"],
    queryFn: () => base44.entities.AccountingEntry?.list?.() || [],
  });

  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: () => base44.entities.FleetTrip?.list?.() || [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.FleetExpense?.list?.() || [],
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.FleetVehicle?.list?.() || [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice?.list?.() || [],
  });

  // Calculate financial KPIs
  const metrics = useMemo(() => {
    const yearMonths = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(parseInt(yearFilter), i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const monthlyPL = yearMonths.map((month) => {
      const monthPnL = pnlData.filter((p) => p.month === month);
      const income = monthPnL.reduce((s, p) => s + (p.quotation_pkr || 0), 0);
      const cost = monthPnL.reduce((s, p) => s + (p.total_cost_pkr || 0), 0);
      const profit = income - cost;
      return { month: month.split("-")[1], income, cost, profit };
    });

    const totalIncome = monthlyPL.reduce((s, m) => s + m.income, 0);
    const totalCost = monthlyPL.reduce((s, m) => s + m.cost, 0);
    const totalProfit = totalIncome - totalCost;
    const profitMargin = totalIncome > 0 ? ((totalProfit / totalIncome) * 100).toFixed(1) : 0;

    // Fleet metrics
    const yearTrips = trips.filter((t) => t.month?.startsWith(yearFilter));
    const yearExpenses = expenses.filter((e) => e.month?.startsWith(yearFilter));
    const fleetIncome = yearTrips.reduce((s, t) => s + (t.freight_income_pkr || 0), 0);
    const fleetExpense = yearExpenses.reduce((s, e) => s + (e.amount_pkr || 0), 0);
    const fleetProfit = fleetIncome - fleetExpense;

    // Receivables
    const pending = invoices.filter((i) => i.status === "pending" || i.status === "partial").reduce((s, i) => s + (i.balance_amount || 0), 0);

    return {
      monthlyPL,
      totalProfit,
      totalIncome,
      totalCost,
      profitMargin,
      fleetIncome,
      fleetExpense,
      fleetProfit,
      pending,
    };
  }, [pnlData, trips, expenses, yearFilter, invoices]);

  // Fleet utilization
  const fleetStats = useMemo(() => {
    const active = vehicles.filter((v) => v.status === "available" || v.status === "in_transit").length;
    const total = vehicles.length;
    return {
      active,
      total,
      utilization: total > 0 ? ((active / total) * 100).toFixed(0) : 0,
      avgIncome: trips.length > 0 ? (metrics.fleetIncome / trips.length).toFixed(0) : 0,
    };
  }, [vehicles, trips, metrics]);

  const monthlyFleetData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(parseInt(yearFilter), i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    return months.map((month) => {
      const mTrips = trips.filter((t) => t.month === month);
      const mExp = expenses.filter((e) => e.month === month);
      return {
        month: month.split("-")[1],
        income: mTrips.reduce((s, t) => s + (t.freight_income_pkr || 0), 0),
        expense: mExp.reduce((s, e) => s + (e.amount_pkr || 0), 0),
      };
    });
  }, [trips, expenses, yearFilter]);

  const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <MobileHeader title="Executive Dashboard" backTo="Accounting" />

      <div className="max-w-7xl mx-auto p-4 space-y-6 pb-20">
        {/* Year Filter */}
        <div className="flex gap-2">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Financial Summary */}
        {canSeeAccounting && (
          <>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Financial Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Revenue" value={fmtK(metrics.totalIncome)} color="emerald" />
                <StatCard label="Costs" value={fmtK(metrics.totalCost)} color="red" />
                <StatCard label="Net Profit" value={fmtK(metrics.totalProfit)} color={metrics.totalProfit >= 0 ? "emerald" : "red"} />
                <StatCard label="Margin" value={`${metrics.profitMargin}%`} color="blue" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-bold text-slate-600 mb-4">Monthly P&L Trend</p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.monthlyPL}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => `${settings.symbol}${v.toLocaleString()}`} />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-bold text-slate-600 mb-4">Income vs Costs</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.monthlyPL}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => `${settings.symbol}${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" />
                  <Bar dataKey="cost" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Fleet Operations Summary */}
        {canSeeFleetFinancials && (
          <>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Fleet Operations</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Active Vehicles" value={`${fleetStats.active}/${fleetStats.total}`} color="blue" />
                <StatCard label="Utilization" value={`${fleetStats.utilization}%`} color="emerald" />
                <StatCard label="Fleet Income" value={fmtK(metrics.fleetIncome)} color="emerald" />
                <StatCard label="Fleet Costs" value={fmtK(metrics.fleetExpense)} color="red" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-bold text-slate-600 mb-4">Monthly Fleet P&L</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyFleetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => `${settings.symbol}${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" />
                  <Bar dataKey="expense" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Receivables Summary */}
        {canSeeAccounting && metrics.pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-amber-900">Outstanding Receivables</p>
            <p className="text-2xl font-bold text-amber-700 mt-2">{fmt(metrics.pending)}</p>
          </div>
        )}
      </div>
    </div>
  );
}