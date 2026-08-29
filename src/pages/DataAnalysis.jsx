import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { format, subMonths, subDays, startOfDay, parseISO, isWithinInterval } from "date-fns";
import {
  TrendingUp, TrendingDown, Package, Truck, DollarSign, Users,
  CreditCard, Landmark, ChevronRight, X, MapPin, BarChart2,
  ArrowUpRight, ArrowDownRight, Navigation, Star
} from "lucide-react";

// ----------------------------------------------------------------------
// Range options – includes Today and 1 Week
// ----------------------------------------------------------------------
const RANGE_OPTIONS = [
  { label: "Today", days: 0 },                // today only
  { label: "1W", days: 7 },                    // last 7 days
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "5Y", months: 60 },
  { label: "All", months: 0 },                 // special: all data
];

const COLORS = ["#6366f1", "#10b981", "#f97316", "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#14b8a6"];

// ----------------------------------------------------------------------
// Helper: generate an array of "yyyy‑MM" strings from startDate to endDate
// ----------------------------------------------------------------------
function generateMonths(startDate, endDate = new Date()) {
  const months = [];
  const current = startOfDay(startDate);
  while (current <= endDate) {
    months.push(format(current, "yyyy-MM"));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

// ----------------------------------------------------------------------
// SectionTitle component
// ----------------------------------------------------------------------
function SectionTitle({ icon: Icon, color, title, subtitle }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-7 h-7 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// RankRow component
// ----------------------------------------------------------------------
function RankRow({ rank, name, primary, secondary, badge, badgeColor = "text-green-600", highlight }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${highlight ? "bg-indigo-50 border border-indigo-100" : "bg-slate-50"}`}>
      <span className={`text-xs font-black w-5 text-center ${rank <= 3 ? "text-amber-500" : "text-slate-300"}`}>
        {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : `#${rank}`}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{name}</p>
        {secondary && <p className="text-[10px] text-slate-400">{secondary}</p>}
      </div>
      <div className="text-right">
        <p className="text-xs font-bold text-slate-800">{primary}</p>
        {badge && <p className={`text-[10px] font-semibold ${badgeColor}`}>{badge}</p>}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Main DataAnalysis Component
// ----------------------------------------------------------------------
export default function DataAnalysis() {
  const { isAdmin, isSleepingPartner, loading: roleLoading } = useRole();
  const { fmtK, fmt, settings } = useAppSettings();
  const [selectedRange, setSelectedRange] = useState(RANGE_OPTIONS[2]); // default "1M"

  // --------------------------------------------------------------------
  // 1. Handle role loading and authorization
  // --------------------------------------------------------------------
  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isSleepingPartner) {
    // Ensure AccessDenied renders something visible (not null)
    return <AccessDenied />;
  }

  // --------------------------------------------------------------------
  // Fetch all required data
  // --------------------------------------------------------------------
  const { data: loads = [] } = useQuery({
    queryKey: ["loads_da"],
    queryFn: () => base44.entities.Load.list("-created_date", 2000),
  });
  const { data: fleetTrips = [] } = useQuery({
    queryKey: ["fleetTrips_da"],
    queryFn: () => base44.entities.FleetTrip.list("-trip_date", 1000),
  });
  const { data: fleetExpenses = [] } = useQuery({
    queryKey: ["fleetExp_da"],
    queryFn: () => base44.entities.FleetExpense.list("-expense_date", 1000),
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["assets_da"],
    queryFn: () => base44.entities.Asset.list("-purchase_date"),
  });
  const { data: installments = [] } = useQuery({
    queryKey: ["installments_da"],
    queryFn: () => base44.entities.AssetInstallment.list("-due_date", 500),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients_da"],
    queryFn: () => base44.entities.Client.list(),
  });
  const { data: ledger = [] } = useQuery({
    queryKey: ["ledger_da"],
    queryFn: () => base44.entities.TransactionLedger.list("-date", 1000),
  });
  const { data: fleetVehicles = [] } = useQuery({
    queryKey: ["fv_da"],
    queryFn: () => base44.entities.FleetVehicle.list(),
  });

  // --------------------------------------------------------------------
  // Determine startDate based on selected range
  // --------------------------------------------------------------------
  const startDate = useMemo(() => {
    const now = new Date();
    if (selectedRange.label === "All") return null; // no filter
    if (selectedRange.days !== undefined) {
      // Today: start of today
      if (selectedRange.days === 0) return startOfDay(now);
      // 1W, etc.
      return subDays(now, selectedRange.days);
    }
    if (selectedRange.months !== undefined && selectedRange.months > 0) {
      return subMonths(now, selectedRange.months);
    }
    return null;
  }, [selectedRange]);

  // --------------------------------------------------------------------
  // Filter all data by date (if startDate exists)
  // --------------------------------------------------------------------
  const periodLoads = useMemo(() => {
    if (!startDate) return loads; // All
    return loads.filter(l => {
      const dateStr = l.loading_date || l.created_date;
      if (!dateStr) return false;
      try {
        const d = parseISO(dateStr);
        return d >= startDate;
      } catch {
        return false;
      }
    });
  }, [loads, startDate]);

  const periodTrips = useMemo(() => {
    if (!startDate) return fleetTrips;
    return fleetTrips.filter(t => {
      if (!t.trip_date) return false;
      try {
        return parseISO(t.trip_date) >= startDate;
      } catch {
        return false;
      }
    });
  }, [fleetTrips, startDate]);

  const periodExpenses = useMemo(() => {
    if (!startDate) return fleetExpenses;
    return fleetExpenses.filter(e => {
      if (!e.expense_date) return false;
      try {
        return parseISO(e.expense_date) >= startDate;
      } catch {
        return false;
      }
    });
  }, [fleetExpenses, startDate]);

  const periodInstallments = useMemo(() => {
    if (!startDate) return installments;
    return installments.filter(i => {
      if (!i.due_date) return false;
      try {
        return parseISO(i.due_date) >= startDate;
      } catch {
        return false;
      }
    });
  }, [installments, startDate]);

  // --------------------------------------------------------------------
  // Generate months for charts
  // --------------------------------------------------------------------
  const months = useMemo(() => {
    if (selectedRange.label === "All") {
      // find earliest date among loads, trips, etc.
      const allDates = [
        ...loads.map(l => l.loading_date || l.created_date).filter(Boolean),
        ...fleetTrips.map(t => t.trip_date).filter(Boolean),
      ].map(d => parseISO(d)).filter(d => !isNaN(d));
      if (allDates.length === 0) return [];
      const minDate = new Date(Math.min(...allDates));
      return generateMonths(minDate, new Date());
    }
    if (startDate) {
      return generateMonths(startDate, new Date());
    }
    return [];
  }, [selectedRange, startDate, loads, fleetTrips]);

  // --------------------------------------------------------------------
  // Build chart data using filtered datasets
  // --------------------------------------------------------------------
  const loadsChart = months.map(m => {
    const mLoads = periodLoads.filter(l => (l.loading_date || l.created_date || "").substring(0, 7) === m);
    const revenue = mLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
    const tons = mLoads.reduce((s, l) => s + (l.weight_tons || 0), 0);
    return { month: m.slice(5), Bilties: mLoads.length, Revenue: revenue, Tons: tons };
  });

  const fleetChart = months.map(m => {
    const fuel = periodExpenses.filter(e => (e.expense_date || "").substring(0, 7) === m && e.expense_type === "fuel")
      .reduce((s, e) => s + (e.amount_pkr || 0), 0);
    const other = periodExpenses.filter(e => (e.expense_date || "").substring(0, 7) === m && e.expense_type !== "fuel")
      .reduce((s, e) => s + (e.amount_pkr || 0), 0);
    const income = periodTrips.filter(t => (t.trip_date || "").substring(0, 7) === m)
      .reduce((s, t) => s + (t.freight_income_pkr || 0), 0);
    const trips = periodTrips.filter(t => (t.trip_date || "").substring(0, 7) === m).length;
    return { month: m.slice(5), Income: income, Fuel: fuel, Other: other, Net: income - fuel - other, Trips: trips };
  });

  const emiChart = months.map(m => {
    const due = periodInstallments.filter(i => (i.due_date || "").substring(0, 7) === m)
      .reduce((s, i) => s + (i.amount || 0), 0);
    const paid = periodInstallments.filter(i => (i.due_date || "").substring(0, 7) === m && i.status === "paid")
      .reduce((s, i) => s + (i.amount || 0), 0);
    return { month: m.slice(5), Due: due, Paid: paid };
  });

  // --------------------------------------------------------------------
  // KPIs (using filtered data)
  // --------------------------------------------------------------------
  const totalRevenue = periodLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
  const totalBilties = periodLoads.length;
  const totalTons = periodLoads.reduce((s, l) => s + (l.weight_tons || 0), 0);
  const totalTrips = periodTrips.length;
  const totalFleetIncome = fleetChart.reduce((s, r) => s + r.Income, 0);
  const totalFleetCost = fleetChart.reduce((s, r) => s + r.Fuel + r.Other, 0);
  const totalAssetValue = assets.filter(a => a.status === "active").reduce((s, a) => s + (a.current_value || a.purchase_price || 0), 0);
  const pendingEmi = installments.filter(i => i.status === "pending").reduce((s, i) => s + (i.amount || 0), 0);

  // --- Client analysis (using filtered loads) ---
  const clientMap = {};
  periodLoads.forEach(l => {
    if (!l.client_name) return;
    if (!clientMap[l.client_name]) clientMap[l.client_name] = { name: l.client_name, revenue: 0, bilties: 0, tons: 0 };
    clientMap[l.client_name].revenue += (l.freight_amount || 0);
    clientMap[l.client_name].bilties += 1;
    clientMap[l.client_name].tons += (l.weight_tons || 0);
  });
  const clientList = Object.values(clientMap).sort((a, b) => b.revenue - a.revenue);
  const topClients = clientList.slice(0, 8);
  const bottomClients = [...clientList].sort((a, b) => a.revenue - b.revenue).slice(0, 5);

  // --- Destination analysis ---
  const destMap = {};
  periodLoads.forEach(l => {
    const dest = l.destination || "Unknown";
    if (!destMap[dest]) destMap[dest] = { name: dest, loads: 0, revenue: 0, profit: 0 };
    destMap[dest].loads += 1;
    destMap[dest].revenue += (l.freight_amount || 0);
    destMap[dest].profit += (l.freight_amount || 0) - (l.broker_hired_amount || 0) - (l.labor_charges || 0) - (l.other_charges || 0);
  });
  const topDestinations = Object.values(destMap).sort((a, b) => b.loads - a.loads).slice(0, 8);
  const topDestByProfit = Object.values(destMap).sort((a, b) => b.profit - a.profit).slice(0, 8);

  // --- Origin analysis ---
  const originMap = {};
  periodLoads.forEach(l => {
    const orig = l.origin || "Unknown";
    if (!originMap[orig]) originMap[orig] = { name: orig, loads: 0, revenue: 0 };
    originMap[orig].loads += 1;
    originMap[orig].revenue += (l.freight_amount || 0);
  });
  const topOrigins = Object.values(originMap).sort((a, b) => b.loads - a.loads).slice(0, 8);

  // --- Vehicle analysis (from loads) ---
  const vehicleLoadMap = {};
  periodLoads.forEach(l => {
    const vn = l.vehicle_number || "Unknown";
    if (!vehicleLoadMap[vn]) vehicleLoadMap[vn] = { name: vn, revenue: 0, loads: 0, profit: 0 };
    vehicleLoadMap[vn].revenue += (l.freight_amount || 0);
    vehicleLoadMap[vn].loads += 1;
    vehicleLoadMap[vn].profit += (l.freight_amount || 0) - (l.broker_hired_amount || 0) - (l.labor_charges || 0) - (l.other_charges || 0);
  });

  // Fleet vehicle performance (using filtered trips & expenses)
  const vehiclePerfList = fleetVehicles.map(v => {
    const vTrips = periodTrips.filter(t => t.fleet_vehicle_id === v.id || t.vehicle_number === v.vehicle_number);
    const income = vTrips.reduce((s, t) => s + (t.freight_income_pkr || 0), 0);
    const fuel = periodExpenses.filter(e => e.fleet_vehicle_id === v.id && e.expense_type === "fuel").reduce((s, e) => s + (e.amount_pkr || 0), 0);
    const otherExp = periodExpenses.filter(e => e.fleet_vehicle_id === v.id && e.expense_type !== "fuel").reduce((s, e) => s + (e.amount_pkr || 0), 0);
    const net = income - fuel - otherExp;
    return { name: v.vehicle_number, type: v.vehicle_type, trips: vTrips.length, income, fuel, net };
  }).filter(v => v.trips > 0);

  const topByRevenue = [...vehiclePerfList].sort((a, b) => b.income - a.income);
  const topByProfit = [...vehiclePerfList].sort((a, b) => b.net - a.net);

  // --- Route analysis ---
  const routeMap = {};
  periodLoads.forEach(l => {
    const route = `${l.origin || "?"} → ${l.destination || "?"}`;
    if (!routeMap[route]) routeMap[route] = { name: route, loads: 0, revenue: 0 };
    routeMap[route].loads += 1;
    routeMap[route].revenue += (l.freight_amount || 0);
  });
  const topRoutes = Object.values(routeMap).sort((a, b) => b.loads - a.loads).slice(0, 8);

  // --- Cargo type analysis ---
  const cargoMap = {};
  periodLoads.forEach(l => {
    const cargo = l.cargo_type || "Unknown";
    if (!cargoMap[cargo]) cargoMap[cargo] = { name: cargo, loads: 0, revenue: 0 };
    cargoMap[cargo].loads += 1;
    cargoMap[cargo].revenue += (l.freight_amount || 0);
  });
  const topCargo = Object.values(cargoMap).sort((a, b) => b.loads - a.loads).slice(0, 6);
  const cargoPie = topCargo.map(c => ({ name: c.name, value: c.revenue }));

  // --- Load status breakdown ---
  const statusMap = {};
  periodLoads.forEach(l => { const s = l.status || "unknown"; statusMap[s] = (statusMap[s] || 0) + 1; });
  const statusPie = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // --- Asset category breakdown (all assets, not filtered by date) ---
  const assetCats = {};
  assets.forEach(a => { assetCats[a.asset_category] = (assetCats[a.asset_category] || 0) + (a.current_value || a.purchase_price || 0); });
  const assetPie = Object.entries(assetCats).map(([name, value]) => ({ name, value }));

  // KPI cards array
  const kpis = [
    { label: "Sales Revenue", value: fmtK(totalRevenue), sub: `${totalBilties} bilties`, icon: DollarSign, color: "from-blue-600 to-blue-700" },
    { label: "Total Bilties", value: totalBilties, sub: `${totalTons.toFixed(0)} MT shipped`, icon: Package, color: "from-emerald-600 to-emerald-700" },
    { label: "Total Trips", value: totalTrips, sub: `Fleet trips`, icon: Truck, color: "from-orange-500 to-orange-600" },
    { label: "Fleet Net", value: fmtK(totalFleetIncome - totalFleetCost), sub: `Income: ${fmtK(totalFleetIncome)}`, icon: TrendingUp, color: totalFleetIncome - totalFleetCost >= 0 ? "from-teal-600 to-teal-700" : "from-red-500 to-red-600" },
    { label: "Assets Value", value: fmtK(totalAssetValue), sub: `${assets.filter(a => a.status === "active").length} active`, icon: Landmark, color: "from-violet-600 to-violet-700" },
    { label: "Pending EMIs", value: fmtK(pendingEmi), sub: `${installments.filter(i => i.status === "pending").length} installments`, icon: CreditCard, color: "from-red-500 to-red-600" },
    { label: "Active Clients", value: clients.filter(c => c.status === "active").length, sub: `${clients.length} total`, icon: Users, color: "from-pink-600 to-pink-700" },
    { label: "Top Client", value: topClients[0]?.name || "—", sub: topClients[0] ? fmtK(topClients[0].revenue) : "", icon: Star, color: "from-amber-500 to-amber-600" },
  ];

  return (
    <div className="pb-24">
      <MobileHeader title="Data Analysis" backTo="AdminPanel" />

      {/* Range Selector – includes Today and 1W */}
      <div className="sticky top-[57px] z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => setSelectedRange(opt)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                selectedRange.label === opt.label
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((kpi, i) => (
            <div key={i} className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-4 text-white shadow-lg`}>
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className="w-4 h-4 text-white/70" />
                <p className="text-xs text-white/70">{kpi.label}</p>
              </div>
              <p className="text-xl font-bold truncate">{kpi.value}</p>
              <p className="text-xs text-white/60 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Revenue & Bilties Monthly */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={TrendingUp} color="bg-blue-600" title="Revenue & Bilties per Month" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={loadsChart} margin={{ left: -20, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v, n) => n === "Revenue" ? [`${settings.symbol}${v.toLocaleString()}`, n] : [v, n]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="Revenue" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="Bilties" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trips per Month */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={Truck} color="bg-orange-500" title="Fleet Trips & Income per Month" />
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={fleetChart} margin={{ left: -20, right: 0 }}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v, n) => n === "Trips" ? [v, n] : [`${settings.symbol}${v.toLocaleString()}`, n]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#incGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Fuel" stroke="#f97316" fill="url(#fuelGrad)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Net" stroke="#6366f1" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* TOP CLIENTS */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={Users} color="bg-teal-600" title="Top Clients by Revenue" subtitle="Highest sales contributors" />
          <div className="space-y-2">
            {topClients.map((c, i) => (
              <RankRow key={c.name} rank={i+1} name={c.name}
                primary={fmtK(c.revenue)}
                secondary={`${c.bilties} bilties · ${c.tons.toFixed(0)} MT`}
                badge={`Avg: ${fmtK(c.revenue / (c.bilties || 1))}/bilty`}
                highlight={i === 0}
              />
            ))}
          </div>
        </div>

        {/* BOTTOM CLIENTS */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={TrendingDown} color="bg-red-500" title="Lowest Revenue Clients" subtitle="Clients with least sales" />
          <div className="space-y-2">
            {bottomClients.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 bg-red-50 rounded-xl px-3 py-2.5">
                <span className="text-xs font-bold text-red-300 w-5 text-center">#{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-400">{c.bilties} bilties</p>
                </div>
                <p className="text-xs font-bold text-red-600">{fmtK(c.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* TOP DESTINATION BY LOADS */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={MapPin} color="bg-indigo-600" title="Destinations by Load Count" subtitle="Which cities get most loads" />
          <ResponsiveContainer width="100%" height={Math.max(160, topDestinations.length * 28)}>
            <BarChart data={topDestinations} layout="vertical" margin={{ left: 5, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={85} />
              <Tooltip formatter={(v, n) => [v, n]} />
              <Bar dataKey="loads" name="Loads" fill="#6366f1" radius={[0,4,4,0]}>
                {topDestinations.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* DESTINATION WISE PROFIT */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={DollarSign} color="bg-emerald-600" title="Destination-wise Profit" subtitle="Profit from each destination" />
          <div className="space-y-2">
            {topDestByProfit.map((d, i) => (
              <RankRow key={d.name} rank={i+1} name={d.name}
                primary={fmtK(d.profit)}
                secondary={`${d.loads} loads · Rev: ${fmtK(d.revenue)}`}
                badge={d.profit >= 0 ? `+${fmtK(d.profit)}` : fmtK(d.profit)}
                badgeColor={d.profit >= 0 ? "text-green-600" : "text-red-500"}
                highlight={i === 0}
              />
            ))}
          </div>
        </div>

        {/* ORIGIN CITIES */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={Navigation} color="bg-cyan-600" title="Top Origin Cities" subtitle="Where do most loads come from" />
          <ResponsiveContainer width="100%" height={Math.max(160, topOrigins.length * 28)}>
            <BarChart data={topOrigins} layout="vertical" margin={{ left: 5, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={85} />
              <Tooltip />
              <Bar dataKey="loads" name="Loads" fill="#06b6d4" radius={[0,4,4,0]}>
                {topOrigins.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TOP ROUTES */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={ArrowUpRight} color="bg-violet-600" title="Top Routes" subtitle="Most frequent origin → destination" />
          <div className="space-y-2">
            {topRoutes.map((r, i) => (
              <RankRow key={r.name} rank={i+1} name={r.name}
                primary={`${r.loads} loads`}
                secondary={`Revenue: ${fmtK(r.revenue)}`}
                highlight={i === 0}
              />
            ))}
          </div>
        </div>

        {/* VEHICLE REVENUE RANKING */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={Truck} color="bg-blue-500" title="Vehicles by Revenue" subtitle="Which vehicle earns the most" />
          <div className="space-y-2">
            {topByRevenue.map((v, i) => (
              <RankRow key={v.name} rank={i+1} name={v.name}
                primary={fmtK(v.income)}
                secondary={`${v.trips} trips · ${v.type || ""}`}
                badge={`Net: ${fmtK(v.net)}`}
                badgeColor={v.net >= 0 ? "text-green-600" : "text-red-500"}
                highlight={i === 0}
              />
            ))}
          </div>
        </div>

        {/* VEHICLE PROFIT RANKING */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={TrendingUp} color="bg-green-600" title="Vehicles by Profit" subtitle="Net profit after fuel & expenses" />
          <div className="space-y-2">
            {topByProfit.map((v, i) => (
              <div key={v.name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i === 0 ? "bg-green-50 border border-green-100" : "bg-slate-50"}`}>
                <span className="text-xs font-black w-5 text-center text-slate-300">
                  {i <= 2 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800">{v.name}</p>
                  <p className="text-[10px] text-slate-400">{v.trips} trips · Fuel: {fmtK(v.fuel)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${v.net >= 0 ? "text-green-600" : "text-red-500"}`}>{v.net >= 0 ? "+" : ""}{fmtK(v.net)}</p>
                  <p className="text-[10px] text-slate-400">Rev: {fmtK(v.income)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARGO TYPE BREAKDOWN */}
        {topCargo.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <SectionTitle icon={Package} color="bg-amber-500" title="Cargo Type Analysis" subtitle="Revenue breakdown by cargo" />
            <div className="flex items-start gap-4">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie data={cargoPie} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                    {cargoPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${settings.symbol}${v.toLocaleString()}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 pt-2">
                {topCargo.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <p className="text-xs text-slate-600 flex-1 truncate capitalize">{item.name}</p>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{item.loads}</p>
                      <p className="text-[10px] text-slate-400">{fmtK(item.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOAD STATUS BREAKDOWN */}
        {statusPie.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <SectionTitle icon={BarChart2} color="bg-slate-600" title="Load Status Breakdown" subtitle="Distribution of load statuses" />
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={130}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" outerRadius={55} paddingAngle={3} dataKey="value">
                    {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {statusPie.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <p className="text-xs text-slate-600 flex-1 capitalize">{item.name.replace(/_/g," ")}</p>
                    <p className="text-xs font-bold text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ASSET EMI SCHEDULE */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle icon={Landmark} color="bg-violet-600" title="Asset EMI — Due vs Paid" />
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={emiChart} margin={{ left: -20, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [`${settings.symbol}${v.toLocaleString()}`, ""]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Due" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="Paid" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ASSETS BY CATEGORY */}
        {assetPie.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <SectionTitle icon={Landmark} color="bg-indigo-600" title="Assets by Category" />
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie data={assetPie} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                    {assetPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${settings.symbol}${v.toLocaleString()}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {assetPie.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <p className="text-xs text-slate-600 capitalize flex-1">{item.name}</p>
                    <p className="text-xs font-bold text-slate-800">{fmtK(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}