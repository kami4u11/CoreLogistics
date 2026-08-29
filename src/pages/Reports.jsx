import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { useAppSettings } from "@/components/AppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area, RadarChart,
  PolarGrid, PolarAngleAxis, Radar
} from "recharts";
import {
  FileText, Download, Truck, Users, DollarSign, Fuel, TrendingUp, TrendingDown,
  Calendar, Filter, ChevronDown, ChevronUp, Package, Save, Trash2, Star,
  BarChart2, PieChart as PieIcon, Activity, Layers, ArrowUpRight, ArrowDownRight,
  Zap, Target, Award, AlertTriangle
} from "lucide-react";
import { format, subMonths } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

const REPORTS = [
  { id: "executive_dashboard", label: "Executive Dashboard", icon: BarChart2,  color: "bg-indigo-50 text-indigo-700",  desc: "Top-level KPIs, revenue streams & trends" },
  { id: "revenue_streams",    label: "Revenue Streams",    icon: DollarSign,  color: "bg-emerald-50 text-emerald-700", desc: "Transport, fleet, rental & other income" },
  { id: "financial_pl",       label: "P&L Analysis",       icon: TrendingUp,  color: "bg-blue-50 text-blue-700",       desc: "Profit & loss by client, load & month" },
  { id: "fleet_utilization",  label: "Fleet Utilization",  icon: Truck,       color: "bg-cyan-50 text-cyan-700",       desc: "Trip count, distance, income per vehicle" },
  { id: "driver_performance", label: "Driver Performance", icon: Users,       color: "bg-purple-50 text-purple-700",   desc: "Trips, income & efficiency per driver" },
  { id: "cost_breakdown",     label: "Cost Breakdown",     icon: Layers,      color: "bg-red-50 text-red-700",         desc: "Fuel, salary, maintenance & overhead split" },
  { id: "fuel_consumption",   label: "Fuel Consumption",   icon: Fuel,        color: "bg-orange-50 text-orange-700",   desc: "Fuel cost trends by vehicle and month" },
  { id: "vehicle_efficiency", label: "Vehicle Efficiency", icon: Zap,         color: "bg-yellow-50 text-yellow-700",   desc: "KM/L efficiency by vehicle" },
];

// ─── Sub-components (defined at module level, no hooks issues) ───────────────

function KPICard({ title, value, sub, icon: Icon, trend, color = "indigo", delay = 0 }) {
  const up = trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${color}-50`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400 font-medium mb-0.5">{title}</p>
      <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

function SectionTitle({ title, icon: Icon, color = "text-slate-700" }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5">
      <Icon className={`w-4 h-4 ${color}`} />
      <p className="text-sm font-black text-slate-800 tracking-tight">{title}</p>
    </div>
  );
}

function TableRow({ cells, header }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 text-xs ${header ? "bg-slate-800 text-white font-bold rounded-t-xl" : "border-b border-slate-50 hover:bg-slate-50"}`}>
      {cells.map((c, i) => <div key={i} className={`${i === 0 ? "flex-1 min-w-0 truncate" : "w-24 text-right flex-shrink-0"}`}>{c}</div>)}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, sym }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 999 ? `${sym}${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Reports() {
  // ─── ALL HOOKS BEFORE ANY EARLY RETURN ───────────────────────────────────
  const { isAdmin, isSleepingPartner, canSeeAccounting } = useRole();
  const { fmt, fmtK, settings } = useAppSettings();
  const queryClient = useQueryClient();

  const [selectedReport, setSelectedReport] = useState("executive_dashboard");
  const [dateFrom,      setDateFrom]      = useState(format(subMonths(new Date(), 5), "yyyy-MM-dd"));
  const [dateTo,        setDateTo]        = useState(format(new Date(), "yyyy-MM-dd"));
  const [groupBy,       setGroupBy]       = useState("client");
  const [showFilters,   setShowFilters]   = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [configName,    setConfigName]    = useState("");
  const [showConfigs,   setShowConfigs]   = useState(false);

  const { data: loads = [] }        = useQuery({ queryKey: ["loads_rep"],      queryFn: () => base44.entities.Load.list("-loading_date", 1000) });
  const { data: fleetTrips = [] }   = useQuery({ queryKey: ["trips_rep"],      queryFn: () => base44.entities.FleetTrip.list("-trip_date", 1000) });
  const { data: fleetExpenses = [] }= useQuery({ queryKey: ["exp_rep"],        queryFn: () => base44.entities.FleetExpense.list("-expense_date", 500) });
  const { data: fleetVehicles = [] }= useQuery({ queryKey: ["fv_rep"],         queryFn: () => base44.entities.FleetVehicle.list() });
  const { data: fleetODO = [] }     = useQuery({ queryKey: ["odo_rep"],        queryFn: () => base44.entities.FleetODO.list("-month", 500) });
  const { data: overheads = [] }    = useQuery({ queryKey: ["oh_rep"],         queryFn: () => base44.entities.MonthlyOverhead.list("-month", 200) });
  const { data: payrolls = [] }     = useQuery({ queryKey: ["pay_rep"],        queryFn: () => base44.entities.Payroll.list("-month", 200) });
  const { data: laborEntries = [] } = useQuery({ queryKey: ["lab_rep"],        queryFn: () => base44.entities.LaborEntry.list("-date", 500) });
  const { data: configs = [] }      = useQuery({ queryKey: ["report_configs"], queryFn: () => base44.entities.ReportConfig.list("-created_date", 50) });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ReportConfig.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["report_configs"] }); setShowSaveModal(false); setConfigName(""); toast.success("Saved!"); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReportConfig.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["report_configs"] }),
  });
  // ─── END HOOKS ────────────────────────────────────────────────────────────

  // Access guard — AFTER all hooks
  if (!isAdmin && !isSleepingPartner && !canSeeAccounting) return <AccessDenied />;

  const sym = settings.symbol;

  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= new Date(dateFrom) && d <= new Date(dateTo + "T23:59:59");
  };

  const filteredLoads     = loads.filter(l => inRange(l.loading_date || l.created_date));
  const filteredTrips     = fleetTrips.filter(t => inRange(t.trip_date));
  const filteredExpenses  = fleetExpenses.filter(e => inRange(e.expense_date));
  const filteredOverheads = overheads.filter(o => {
    const m = o.month; if (!m) return false;
    return m >= dateFrom.slice(0, 7) && m <= dateTo.slice(0, 7);
  });
  const filteredPayrolls  = payrolls.filter(p => {
    const m = p.month; if (!m) return false;
    return m >= dateFrom.slice(0, 7) && m <= dateTo.slice(0, 7);
  });

  // ── Revenue Streams ──────────────────────────────────────────────────────
  const transportRevenue  = filteredLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
  const fleetIncome       = filteredTrips.reduce((s, t) => s + (t.freight_income_pkr || 0), 0);
  const totalRevenue      = transportRevenue + fleetIncome;
  const totalExpensesAll  = filteredExpenses.reduce((s, e) => s + (e.amount_pkr || 0), 0);
  const totalOverheadCost = filteredOverheads.reduce((s, o) => s + (o.amount_pkr || 0), 0);
  const totalPayrollCost  = filteredPayrolls.reduce((s, p) => s + (p.net_salary || 0), 0);
  const transportCost     = filteredLoads.reduce((s, l) => s + (l.broker_hired_amount || 0) + (l.labor_charges || 0) + (l.other_charges || 0), 0);
  const totalCosts        = transportCost + totalExpensesAll + totalOverheadCost + totalPayrollCost;
  const netProfit         = totalRevenue - totalCosts;

  const revenueStreamData = [
    { name: "Transport", value: transportRevenue },
    { name: "Own Fleet", value: fleetIncome },
  ].filter(d => d.value > 0);

  const costStreamData = [
    { name: "Fleet Ops",  value: totalExpensesAll },
    { name: "Transport",  value: transportCost },
    { name: "Payroll",    value: totalPayrollCost },
    { name: "Overhead",   value: totalOverheadCost },
  ].filter(d => d.value > 0);

  // ── Monthly Trend ─────────────────────────────────────────────────────────
  const monthlyTrend = useMemo(() => {
    const months = [];
    let cur = new Date(dateFrom);
    const end = new Date(dateTo);
    while (cur <= end) {
      const m = format(cur, "yyyy-MM");
      const mLoads = loads.filter(l => (l.loading_date || l.created_date || "").startsWith(m));
      const mTrips = fleetTrips.filter(t => (t.trip_date || "").startsWith(m));
      const mExp   = fleetExpenses.filter(e => (e.expense_date || "").startsWith(m));
      const mOH    = overheads.filter(o => o.month === m);
      const mPay   = payrolls.filter(p => p.month === m);
      const rev  = mLoads.reduce((s, l) => s + (l.freight_amount || 0), 0) + mTrips.reduce((s, t) => s + (t.freight_income_pkr || 0), 0);
      const cost = mLoads.reduce((s, l) => s + (l.broker_hired_amount || 0) + (l.labor_charges || 0) + (l.other_charges || 0), 0)
        + mExp.reduce((s, e) => s + (e.amount_pkr || 0), 0)
        + mOH.reduce((s, o) => s + (o.amount_pkr || 0), 0)
        + mPay.reduce((s, p) => s + (p.net_salary || 0), 0);
      months.push({ month: format(cur, "MMM yy"), Revenue: rev, Cost: cost, Profit: rev - cost });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return months;
  }, [loads, fleetTrips, fleetExpenses, overheads, payrolls, dateFrom, dateTo]);

  // ── Fleet ────────────────────────────────────────────────────────────────
  const fleetReport = useMemo(() => fleetVehicles.map(v => {
    const vTrips   = filteredTrips.filter(t => t.fleet_vehicle_id === v.id || t.vehicle_number === v.vehicle_number);
    const income   = vTrips.reduce((s, t) => s + (t.freight_income_pkr || 0), 0);
    const fuelCost = filteredExpenses.filter(e => e.fleet_vehicle_id === v.id && e.expense_type === "fuel").reduce((s, e) => s + (e.amount_pkr || 0), 0);
    const otherCost= filteredExpenses.filter(e => e.fleet_vehicle_id === v.id && e.expense_type !== "fuel").reduce((s, e) => s + (e.amount_pkr || 0), 0);
    return { name: v.vehicle_number, trips: vTrips.length, income, fuelCost, otherCost, net: income - fuelCost - otherCost };
  }).filter(v => v.trips > 0).sort((a, b) => b.income - a.income), [filteredTrips, filteredExpenses, fleetVehicles]);

  // ── Driver ────────────────────────────────────────────────────────────────
  const driverReport = useMemo(() => {
    const map = {};
    filteredTrips.forEach(t => {
      const d = t.driver_name || "Unknown";
      if (!map[d]) map[d] = { name: d, trips: 0, income: 0 };
      map[d].trips++;
      map[d].income += (t.freight_income_pkr || 0);
    });
    return Object.values(map).sort((a, b) => b.income - a.income);
  }, [filteredTrips]);

  // ── P&L By Client ─────────────────────────────────────────────────────────
  const plByClient = useMemo(() => {
    const map = {};
    filteredLoads.forEach(l => {
      const k = groupBy === "client" ? (l.client_name || "Unknown") : (l.load_number || l.id);
      if (!map[k]) map[k] = { name: k, revenue: 0, cost: 0, loads: 0 };
      map[k].revenue += (l.freight_amount || 0);
      map[k].cost    += (l.broker_hired_amount || 0) + (l.labor_charges || 0) + (l.other_charges || 0);
      map[k].loads++;
    });
    return Object.values(map)
      .map(r => ({ ...r, profit: r.revenue - r.cost, margin: r.revenue > 0 ? (((r.revenue - r.cost) / r.revenue) * 100).toFixed(1) : "0" }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  }, [filteredLoads, groupBy]);

  // ── Fuel ──────────────────────────────────────────────────────────────────
  const fuelByVehicle = useMemo(() => fleetVehicles.map(v => {
    const fuel = filteredExpenses.filter(e => e.fleet_vehicle_id === v.id && e.expense_type === "fuel").reduce((s, e) => s + (e.amount_pkr || 0), 0);
    return { name: v.vehicle_number, fuel };
  }).filter(v => v.fuel > 0).sort((a, b) => b.fuel - a.fuel), [filteredExpenses, fleetVehicles]);

  const fuelMonthly = useMemo(() => {
    const months = [];
    let cur = new Date(dateFrom);
    const end = new Date(dateTo);
    while (cur <= end) {
      const m = format(cur, "yyyy-MM");
      const fuel = fleetExpenses.filter(e => e.month === m && e.expense_type === "fuel").reduce((s, e) => s + (e.amount_pkr || 0), 0);
      months.push({ month: format(cur, "MMM"), Fuel: fuel });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return months;
  }, [fleetExpenses, dateFrom, dateTo]);

  // ── Cost Breakdown ────────────────────────────────────────────────────────
  const expenseByType = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => { const t = e.expense_type || "other"; map[t] = (map[t] || 0) + (e.amount_pkr || 0); });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // ── Vehicle Efficiency ────────────────────────────────────────────────────
  const vehicleEfficiency = useMemo(() => fleetVehicles.map(v => {
    const odoRecords  = fleetODO.filter(o => (o.vehicle_id === v.id || o.vehicle_number === v.vehicle_number) && o.status === "recorded");
    const fuelRecords = filteredExpenses.filter(e => (e.fleet_vehicle_id === v.id || e.vehicle_number === v.vehicle_number) && e.expense_type === "fuel");
    if (!odoRecords.length || !fuelRecords.length) return null;
    const totalKm      = odoRecords.reduce((sum, o, idx) => idx === 0 ? 0 : sum + Math.max(0, o.odo_reading - (odoRecords[idx - 1]?.odo_reading || 0)), 0);
    const totalLiters  = fuelRecords.reduce((sum, e) => sum + Math.round((e.amount_pkr || 0) / 180), 0);
    const avgKmL       = totalLiters > 0 ? parseFloat((totalKm / totalLiters).toFixed(2)) : 0;
    return { name: v.vehicle_number, avgKmL, totalKm, totalLiters, fuelCost: fuelRecords.reduce((s, e) => s + (e.amount_pkr || 0), 0) };
  }).filter(Boolean).sort((a, b) => b.avgKmL - a.avgKmL), [fleetVehicles, fleetODO, filteredExpenses]);

  // ── Export ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rowSets = {
      executive_dashboard: { rows: [["Metric","Value"],["Total Revenue",totalRevenue],["Net Profit",netProfit],["Transport Revenue",transportRevenue],["Fleet Income",fleetIncome],["Total Costs",totalCosts]], fn: "executive_dashboard.csv" },
      revenue_streams:     { rows: [["Stream","Revenue"],...revenueStreamData.map(r=>[r.name,r.value])], fn: "revenue_streams.csv" },
      financial_pl:        { rows: [["Name","Loads","Revenue","Cost","Profit","Margin%"],...plByClient.map(r=>[r.name,r.loads,r.revenue,r.cost,r.profit,r.margin])], fn: "pl_analysis.csv" },
      fleet_utilization:   { rows: [["Vehicle","Trips","Income","Fuel","Other","Net"],...fleetReport.map(r=>[r.name,r.trips,r.income,r.fuelCost,r.otherCost,r.net])], fn: "fleet_utilization.csv" },
      driver_performance:  { rows: [["Driver","Trips","Income"],...driverReport.map(r=>[r.name,r.trips,r.income])], fn: "driver_performance.csv" },
      cost_breakdown:      { rows: [["Type","Amount"],...expenseByType.map(r=>[r.name,r.value])], fn: "cost_breakdown.csv" },
      fuel_consumption:    { rows: [["Vehicle","Fuel Cost"],...fuelByVehicle.map(r=>[r.name,r.fuel])], fn: "fuel_consumption.csv" },
      vehicle_efficiency:  { rows: [["Vehicle","KM/L","Total KM","Liters","Fuel Cost"],...vehicleEfficiency.map(r=>[r.name,r.avgKmL,r.totalKm,r.totalLiters,r.fuelCost])], fn: "vehicle_efficiency.csv" },
    };
    const { rows, fn } = rowSets[selectedReport] || { rows: [], fn: "report.csv" };
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = fn; a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const rpt = REPORTS.find(r => r.id === selectedReport);
    doc.setFontSize(16); doc.text(rpt?.label || "Report", 14, 18);
    doc.setFontSize(10); doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 26);
    doc.setFontSize(9);
    let y = 36;
    const line = (txt) => { doc.text(txt, 14, y); y += 6; if (y > 270) { doc.addPage(); y = 20; } };
    if (selectedReport === "executive_dashboard") {
      line(`Total Revenue: ${sym}${totalRevenue.toLocaleString()}`);
      line(`Net Profit: ${sym}${netProfit.toLocaleString()}`);
      line(`Transport Revenue: ${sym}${transportRevenue.toLocaleString()}`);
      line(`Fleet Income: ${sym}${fleetIncome.toLocaleString()}`);
      line(`Total Costs: ${sym}${totalCosts.toLocaleString()}`);
    } else if (selectedReport === "financial_pl") {
      line("Name | Loads | Revenue | Profit | Margin");
      plByClient.forEach(r => line(`${r.name} | ${r.loads} | ${sym}${r.revenue.toLocaleString()} | ${sym}${r.profit.toLocaleString()} | ${r.margin}%`));
    } else if (selectedReport === "fleet_utilization") {
      line("Vehicle | Trips | Income | Net");
      fleetReport.forEach(r => line(`${r.name} | ${r.trips} | ${sym}${r.income.toLocaleString()} | ${sym}${r.net.toLocaleString()}`));
    }
    doc.save(`${selectedReport}_${dateFrom}_${dateTo}.pdf`);
  };

  const currentReport = REPORTS.find(r => r.id === selectedReport);
  const profitMargin  = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";
  const prevPeriodLoads = loads.filter(l => {
    const d = new Date(l.loading_date || l.created_date);
    const from2 = new Date(dateFrom); const to2 = new Date(dateTo);
    const diff  = to2 - from2;
    return d >= new Date(from2 - diff) && d < from2;
  });
  const prevRevenue = prevPeriodLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
  const revTrend    = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;

  return (
    <div className="pb-28 bg-slate-50 min-h-screen">
      <MobileHeader title="Reports & Analytics" backTo="Accounting" />

      <div className="px-4 py-4 space-y-3">

        {/* Report selector */}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Report</p>
        <div className="grid grid-cols-2 gap-2">
          {REPORTS.map(r => {
            const Icon = r.icon;
            const sel  = selectedReport === r.id;
            return (
              <button key={r.id} onClick={() => setSelectedReport(r.id)}
                className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all ${sel ? "border-slate-900 bg-white shadow-md" : "border-slate-100 bg-white hover:border-slate-300"}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${r.color}`}><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-slate-800 leading-tight">{r.label}</p></div>
                {sel && <div className="w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0"><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <button onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-slate-500" /><span className="text-sm font-bold text-slate-700">Date Range & Filters</span></div>
          {showFilters ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 overflow-hidden shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-slate-500 mb-1.5">From</p><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-xl h-9 text-sm" /></div>
                <div><p className="text-xs text-slate-500 mb-1.5">To</p><Input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rounded-xl h-9 text-sm" /></div>
              </div>
              {selectedReport === "financial_pl" && (
                <div><p className="text-xs text-slate-500 mb-1.5">Group By</p>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">By Client</SelectItem>
                      <SelectItem value="load">By Load</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2">
                {["1m","3m","6m","1y"].map(p => {
                  const months = { "1m":1,"3m":3,"6m":6,"1y":12 }[p];
                  return (
                    <button key={p} onClick={() => { setDateFrom(format(subMonths(new Date(), months), "yyyy-MM-dd")); setDateTo(format(new Date(), "yyyy-MM-dd")); }}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-colors">
                      {p.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={() => setShowConfigs(!showConfigs)} variant="outline" className="flex-1 rounded-xl h-10 text-xs gap-1.5"><Save className="w-3.5 h-3.5" /> Saved ({configs.length})</Button>
          <Button onClick={() => setShowSaveModal(true)} variant="outline" className="flex-1 rounded-xl h-10 text-xs gap-1.5"><Star className="w-3.5 h-3.5" /> Save</Button>
          <Button onClick={exportCSV} variant="outline" className="flex-1 rounded-xl h-10 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> CSV</Button>
          <Button onClick={exportPDF} className="flex-1 rounded-xl h-10 bg-slate-900 text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> PDF</Button>
        </div>

        {/* Saved configs */}
        <AnimatePresence>
          {showConfigs && configs.length > 0 && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100"><p className="text-xs font-bold text-slate-700">Saved Configurations</p></div>
              {configs.map(cfg => (
                <div key={cfg.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700">{cfg.config_name}</p>
                    <p className="text-[10px] text-slate-400">{cfg.report_type?.replace(/_/g," ")} • {cfg.date_from} → {cfg.date_to}</p>
                  </div>
                  <button onClick={() => { setSelectedReport(cfg.report_type); setDateFrom(cfg.date_from); setDateTo(cfg.date_to); if (cfg.filters?.groupBy) setGroupBy(cfg.filters.groupBy); setShowConfigs(false); }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 text-blue-600 font-bold hover:bg-blue-100">Load</button>
                  <button onClick={() => deleteMutation.mutate(cfg.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════ REPORT OUTPUT ════════════════════ */}
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className={`flex items-center gap-2 px-4 py-3.5 ${currentReport?.color || "bg-slate-50 text-slate-700"}`}>
            {currentReport && React.createElement(currentReport.icon, { className: "w-4 h-4" })}
            <p className="text-sm font-black">{currentReport?.label}</p>
            <span className="text-[10px] ml-auto opacity-60">{dateFrom} → {dateTo}</span>
          </div>

          <div className="p-4 space-y-4">

            {/* ─── EXECUTIVE DASHBOARD ─── */}
            {selectedReport === "executive_dashboard" && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Key Performance Indicators</p>
                <div className="grid grid-cols-2 gap-3">
                  <KPICard title="Total Revenue"  value={fmtK(totalRevenue)}      sub="Transport + Fleet"     icon={DollarSign} color="emerald" trend={revTrend} delay={0} />
                  <KPICard title="Net Profit"      value={fmtK(netProfit)}          sub={`${profitMargin}% margin`} icon={TrendingUp}  color="indigo" delay={0.05} />
                  <KPICard title="Total Loads"     value={filteredLoads.length}     sub="In selected period"   icon={Package}    color="blue"   delay={0.1} />
                  <KPICard title="Fleet Trips"     value={filteredTrips.length}     sub="Own fleet"            icon={Truck}      color="cyan"   delay={0.15} />
                  <KPICard title="Total Costs"     value={fmtK(totalCosts)}         sub="All cost centers"     icon={TrendingDown} color="red"  delay={0.2} />
                  <KPICard title="Profit Margin"   value={`${profitMargin}%`}       sub="Revenue - Costs"      icon={Target}     color="purple" delay={0.25} />
                </div>

                <SectionTitle title="Revenue vs Cost vs Profit (Monthly)" icon={Activity} color="text-indigo-500" />
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyTrend} margin={{ left:-15,right:5,top:5,bottom:0 }}>
                    <defs>
                      <linearGradient id="gRev"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gCost"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip sym={sym} />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="Revenue" stroke="#10b981" fill="url(#gRev)"    strokeWidth={2} dot={{ r:2 }} />
                    <Area type="monotone" dataKey="Cost"    stroke="#ef4444" fill="url(#gCost)"   strokeWidth={2} dot={{ r:2 }} />
                    <Area type="monotone" dataKey="Profit"  stroke="#6366f1" fill="url(#gProfit)" strokeWidth={2} dot={{ r:2 }} />
                  </AreaChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Revenue Mix</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={revenueStreamData.length ? revenueStreamData : [{name:"No data",value:1}]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                          {(revenueStreamData.length ? revenueStreamData : [{name:"No data",value:1}]).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => [`${sym}${v.toLocaleString()}`, ""]} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cost Mix</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={costStreamData.length ? costStreamData : [{name:"No data",value:1}]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                          {(costStreamData.length ? costStreamData : [{name:"No data",value:1}]).map((_, i) => <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => [`${sym}${v.toLocaleString()}`, ""]} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <SectionTitle title="Top Clients by Revenue" icon={Award} color="text-amber-500" />
                <TableRow header cells={["Client","Loads","Revenue","Margin"]} />
                {plByClient.slice(0, 8).map(r => <TableRow key={r.name} cells={[r.name, r.loads, fmtK(r.revenue), `${r.margin}%`]} />)}
                {plByClient.length === 0 && <p className="text-center text-slate-400 text-xs py-6">No load data in range</p>}
              </div>
            )}

            {/* ─── REVENUE STREAMS ─── */}
            {selectedReport === "revenue_streams" && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 mb-1">Transport Revenue</p>
                    <p className="text-xl font-black text-emerald-800">{fmtK(transportRevenue)}</p>
                    <p className="text-[10px] text-emerald-500">{filteredLoads.length} loads</p>
                  </motion.div>
                  <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:0.05}} className="bg-cyan-50 rounded-2xl p-4 border border-cyan-100">
                    <p className="text-[10px] font-bold text-cyan-600 mb-1">Own Fleet Income</p>
                    <p className="text-xl font-black text-cyan-800">{fmtK(fleetIncome)}</p>
                    <p className="text-[10px] text-cyan-500">{filteredTrips.length} trips</p>
                  </motion.div>
                  <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:0.1}} className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 col-span-2">
                    <p className="text-[10px] font-bold text-indigo-600 mb-1">Combined Revenue</p>
                    <p className="text-2xl font-black text-indigo-800">{fmt(totalRevenue)}</p>
                  </motion.div>
                </div>
                <SectionTitle title="Revenue by Stream" icon={PieIcon} color="text-emerald-500" />
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={revenueStreamData.length ? revenueStreamData : [{name:"No data",value:1}]} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {(revenueStreamData.length ? revenueStreamData : [{name:"No data",value:1}]).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [`${sym}${v.toLocaleString()}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <SectionTitle title="Monthly Revenue Trend" icon={TrendingUp} color="text-blue-500" />
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyTrend} margin={{ left:-15,right:5,top:5,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip sym={sym} />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Revenue" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="Profit"  fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <SectionTitle title="Revenue per Client" icon={Users} color="text-indigo-500" />
                <TableRow header cells={["Client","Loads","Revenue","Avg/Load"]} />
                {plByClient.map(r => <TableRow key={r.name} cells={[r.name, r.loads, fmtK(r.revenue), fmtK(Math.round(r.revenue/(r.loads||1)))]} />)}
                {plByClient.length === 0 && <p className="text-center text-slate-400 text-xs py-6">No data in range</p>}
              </div>
            )}

            {/* ─── FINANCIAL P&L ─── */}
            {selectedReport === "financial_pl" && (
              <div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[{l:"Revenue",v:totalRevenue,c:"emerald"},{l:"Total Cost",v:transportCost,c:"red"},{l:"Profit",v:transportRevenue-transportCost,c:"indigo"}].map((k,i)=>(
                    <motion.div key={k.l} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                      className={`bg-${k.c}-50 rounded-2xl p-3 border border-${k.c}-100 text-center`}>
                      <p className={`text-[9px] font-bold text-${k.c}-600`}>{k.l}</p>
                      <p className={`text-base font-black text-${k.c}-800`}>{fmtK(k.v)}</p>
                    </motion.div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyTrend} margin={{ left:-15,right:5,top:5,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip sym={sym} />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Revenue" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="Cost"    fill="#ef4444" radius={[4,4,0,0]} />
                    <Bar dataKey="Profit"  fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <SectionTitle title={groupBy === "client" ? "Top Clients" : "Load Details"} icon={TrendingUp} color="text-blue-500" />
                <TableRow header cells={[groupBy === "client" ? "Client" : "Load #","Loads","Revenue","Margin"]} />
                {plByClient.map(r => <TableRow key={r.name} cells={[r.name, r.loads, fmtK(r.revenue), `${r.margin}%`]} />)}
                {plByClient.length === 0 && <p className="text-center text-slate-400 text-xs py-6">No data in range</p>}
              </div>
            )}

            {/* ─── FLEET UTILIZATION ─── */}
            {selectedReport === "fleet_utilization" && (
              <div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[{l:"Active Vehicles",v:fleetReport.length},{l:"Total Trips",v:filteredTrips.length},{l:"Fleet Income",v:fmtK(fleetIncome)}].map((k,i)=>(
                    <motion.div key={k.l} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className="bg-cyan-50 rounded-2xl p-3 border border-cyan-100 text-center">
                      <p className="text-[9px] font-bold text-cyan-600">{k.l}</p>
                      <p className="text-base font-black text-cyan-800">{k.v}</p>
                    </motion.div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={fleetReport.slice(0,8)} layout="vertical" margin={{ left:5,right:10,top:5,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={65} />
                    <Tooltip content={<CustomTooltip sym={sym} />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="income" name="Income" fill="#06b6d4" radius={[0,4,4,0]} />
                    <Bar dataKey="net"    name="Net"    fill="#6366f1" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <SectionTitle title="Vehicle Breakdown" icon={Truck} color="text-cyan-500" />
                <TableRow header cells={["Vehicle","Trips","Income","Net"]} />
                {fleetReport.map(r => <TableRow key={r.name} cells={[r.name, r.trips, fmtK(r.income), fmtK(r.net)]} />)}
                {fleetReport.length === 0 && <p className="text-center text-slate-400 text-xs py-6">No fleet data in range</p>}
              </div>
            )}

            {/* ─── DRIVER PERFORMANCE ─── */}
            {selectedReport === "driver_performance" && (
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={driverReport.slice(0,10)} layout="vertical" margin={{ left:5,right:10,top:5,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                    <Tooltip content={<CustomTooltip sym={sym} />} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="trips" name="Trips" fill="#8b5cf6" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <SectionTitle title="Driver Stats" icon={Users} color="text-purple-500" />
                <TableRow header cells={["Driver","Trips","Income","Avg/Trip"]} />
                {driverReport.map(r => <TableRow key={r.name} cells={[r.name, r.trips, fmtK(r.income), fmtK(Math.round(r.income/(r.trips||1)))]} />)}
                {driverReport.length === 0 && <p className="text-center text-slate-400 text-xs py-6">No driver data in range</p>}
              </div>
            )}

            {/* ─── COST BREAKDOWN ─── */}
            {selectedReport === "cost_breakdown" && (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[{l:"Fleet Ops",v:totalExpensesAll,c:"red"},{l:"Transport",v:transportCost,c:"orange"},{l:"Payroll",v:totalPayrollCost,c:"purple"},{l:"Overhead",v:totalOverheadCost,c:"slate"}].map((k,i)=>(
                    <motion.div key={k.l} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:i*0.06}}
                      className={`bg-${k.c}-50 rounded-2xl p-3 border border-${k.c}-100`}>
                      <p className={`text-[10px] font-bold text-${k.c}-500`}>{k.l}</p>
                      <p className={`text-lg font-black text-${k.c}-800`}>{fmtK(k.v)}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expense Type Split</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={expenseByType.length ? expenseByType : [{name:"No data",value:1}]} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                          {(expenseByType.length ? expenseByType : [{name:"No data",value:1}]).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v=>[`${sym}${v.toLocaleString()}`]} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cost Center Split</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={costStreamData.length ? costStreamData : [{name:"No data",value:1}]} cx="50%" cy="50%" innerRadius={30} outerRadius={70} dataKey="value">
                          {(costStreamData.length ? costStreamData : [{name:"No data",value:1}]).map((_,i) => <Cell key={i} fill={COLORS[(i+3)%COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v=>[`${sym}${v.toLocaleString()}`]} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <SectionTitle title="Fleet Expense by Type" icon={AlertTriangle} color="text-red-500" />
                <TableRow header cells={["Expense Type","Amount","% of Total"]} />
                {expenseByType.map(r => {
                  const total = expenseByType.reduce((s,e)=>s+e.value,0);
                  return <TableRow key={r.name} cells={[r.name, fmt(r.value), total > 0 ? `${((r.value/total)*100).toFixed(1)}%` : "—"]} />;
                })}
                {expenseByType.length === 0 && <p className="text-center text-slate-400 text-xs py-6">No expense data in range</p>}
              </div>
            )}

            {/* ─── FUEL CONSUMPTION ─── */}
            {selectedReport === "fuel_consumption" && (
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={fuelMonthly} margin={{ left:-15,right:5,top:5,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={v=>[`${sym}${v.toLocaleString()}`,"Fuel"]} />
                    <Line type="monotone" dataKey="Fuel" stroke="#f97316" strokeWidth={2.5} dot={{ r:3 }} activeDot={{ r:5 }} />
                  </LineChart>
                </ResponsiveContainer>
                <SectionTitle title="Fuel by Vehicle" icon={Fuel} color="text-orange-500" />
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={fuelByVehicle.length ? fuelByVehicle : [{name:"No data",value:1}]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="fuel" nameKey="name">
                      {(fuelByVehicle.length ? fuelByVehicle : [{name:"No data",value:1}]).map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v=>[`${sym}${v.toLocaleString()}`,"Fuel Cost"]} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                  </PieChart>
                </ResponsiveContainer>
                <TableRow header cells={["Vehicle","Fuel Cost","% of Total"]} />
                {fuelByVehicle.map(r => {
                  const total = fuelByVehicle.reduce((s,v)=>s+v.fuel,0);
                  return <TableRow key={r.name} cells={[r.name, fmt(r.fuel), total>0 ? `${((r.fuel/total)*100).toFixed(1)}%` : "—"]} />;
                })}
                {fuelByVehicle.length === 0 && <p className="text-center text-slate-400 text-xs py-6">No fuel data in range</p>}
              </div>
            )}

            {/* ─── VEHICLE EFFICIENCY ─── */}
            {selectedReport === "vehicle_efficiency" && (
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={vehicleEfficiency} layout="vertical" margin={{ left:5,right:10,top:5,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={65} />
                    <Tooltip formatter={v=>[`${v.toFixed(2)} KM/L`]} />
                    <Bar dataKey="avgKmL" name="Avg KM/L" fill="#eab308" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <TableRow header cells={["Vehicle","KM/L","Total KM","Fuel Cost"]} />
                {vehicleEfficiency.map(r => <TableRow key={r.name} cells={[r.name, r.avgKmL.toFixed(2), r.totalKm.toFixed(0), fmt(r.fuelCost)]} />)}
                {vehicleEfficiency.length === 0 && <p className="text-center text-slate-400 text-xs py-6">No efficiency data (need ODO & fuel records)</p>}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-end bg-black/40">
            <motion.div initial={{y:100}} animate={{y:0}} exit={{y:100}} className="w-full bg-white rounded-t-3xl p-4 space-y-4">
              <p className="text-sm font-bold text-slate-900">Save Report Configuration</p>
              <Input type="text" placeholder="e.g. Fleet Monthly Q1 2026" value={configName} onChange={e => setConfigName(e.target.value)} className="rounded-xl" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSaveModal(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button
                  onClick={() => { if (!configName.trim()) return; saveMutation.mutate({ config_name: configName, report_type: selectedReport, date_from: dateFrom, date_to: dateTo, filters: { groupBy }, is_favorite: false }); }}
                  disabled={!configName.trim() || saveMutation.isPending}
                  className="flex-1 rounded-xl bg-slate-900">
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}