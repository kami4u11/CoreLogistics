import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAppSettings } from "@/components/AppSettings";
import AdminDashboard from "@/components/AdminDashboard";
import { format, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ComposedChart,
} from "recharts";
import {
  Users, Truck, MapPin, Layers, Handshake, Package, ChevronRight, UserCog,
  BarChart2, Store, TrendingUp, TrendingDown, Activity, Settings, BookOpen,
  Calculator, Bell, FileBarChart, Wrench, Fuel, Shield, Navigation,
  DollarSign, Zap, Target, ArrowUpRight, ArrowDownRight, Globe, Cpu,
  PieChart as PieIcon, CreditCard, Building2, Wallet, Lock, Sun, Moon, Palette,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import FleetDocAlertsBanner from "@/components/FleetDocAlertsBanner";

const LOGO = null;
const C = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const SS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}
.ap-root{font-family:'DM Sans','Segoe UI',system-ui,sans-serif;min-height:100vh;background:#060b14;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.gml{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;}
@media(max-width:1100px){.g4{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr 1fr;}}
@media(max-width:640px){.g4{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr;}.g2{grid-template-columns:1fr;}.gml{grid-template-columns:1fr 1fr;}}
::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px;}
::-webkit-scrollbar-track{background:transparent;}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)}50%{box-shadow:0 0 0 8px rgba(99,102,241,0)}}
@keyframes fade-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.fade-up{animation:fade-up 0.4s ease forwards;}
`;

// Theme-aware card (reads CSS vars set by ThemeContext)
const DCard = ({ children, style = {}, glow }) => (
  <div style={{
    background: "var(--theme-card-bg, rgba(255,255,255,0.03))",
    backdropFilter: "blur(12px)",
    borderRadius: 16,
    border: "1px solid var(--theme-border, rgba(255,255,255,0.07))",
    padding: 20, ...style,
    ...(glow ? { boxShadow: "0 0 0 1px rgba(99,102,241,0.2), 0 8px 32px rgba(99,102,241,0.08)" } : {}),
  }}>
    {children}
  </div>
);

// KPI tile
const KpiTile = ({ label, value, sub, icon: Icon, gradient, trend, onClick }) => (
  <div onClick={onClick} style={{
    background: gradient, borderRadius: 16, padding: "16px 18px", color: "#fff",
    position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : "default",
    border: "1px solid rgba(255,255,255,0.08)", transition: "transform 0.15s",
  }}
    onMouseEnter={e => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
    onMouseLeave={e => (e.currentTarget.style.transform = "none")}
  >
    <div style={{ position: "absolute", right: 12, top: 12, opacity: 0.12 }}><Icon size={42} /></div>
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.1)" }} />
    <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.65, marginBottom: 6 }}>{label}</p>
    <p style={{ fontSize: 22, fontWeight: 800, margin: "0 0 3px", lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontSize: 10, opacity: 0.6, margin: 0 }}>{sub}</p>}
    {trend !== undefined && (
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 10, fontWeight: 600, opacity: 0.85 }}>
        {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
        <span>{Math.abs(trend).toFixed(1)}% vs prev</span>
      </div>
    )}
  </div>
);

// Theme-aware tooltip
const DTooltip = (fmt) => ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--theme-tooltip-bg, #0f172a)", border: "1px solid var(--theme-border, rgba(255,255,255,0.1))", borderRadius: 10, padding: "10px 14px", fontSize: 11 }}>
      <p style={{ color: "var(--theme-text-muted, #94a3b8)", marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color || "var(--theme-text, #e2e8f0)", margin: "2px 0" }}>{p.name}: <strong>{typeof p.value === "number" && p.value > 999 ? fmt(p.value) : p.value}</strong></p>)}
    </div>
  );
};

// Theme-aware section link
const SectionLink = ({ icon: Icon, label, page, color }) => (
  <Link to={createPageUrl(page)}
    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--theme-border, rgba(255,255,255,0.06))", background: "var(--theme-surface, rgba(255,255,255,0.02))", textDecoration: "none", transition: "all 0.12s" }}
    onMouseEnter={e => { e.currentTarget.style.background = "var(--theme-card-bg)"; e.currentTarget.style.borderColor = "var(--theme-primary)"; }}
    onMouseLeave={e => { e.currentTarget.style.background = "var(--theme-surface)"; e.currentTarget.style.borderColor = "var(--theme-border)"; }}
  >
    <div className={`p-2 rounded-lg ${color}`} style={{ flexShrink: 0 }}><Icon size={14} /></div>
    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--theme-text, #cbd5e1)", flex: 1 }}>{label}</span>
    <ChevronRight size={12} color="var(--theme-text-muted, rgba(255,255,255,0.2))" />
  </Link>
);

const accountingMonth = (d) => {
  if (!d) return format(new Date(), "yyyy-MM");
  const dt = new Date(d);
  return dt.getDate() < 5 ? format(subMonths(dt, 1), "yyyy-MM") : format(dt, "yyyy-MM");
};

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("analytics");
  const { fmt, fmtK, settings } = useAppSettings();
  const { isDark, toggleMode, palette } = useTheme();

  // Theme-aware overrides
  const apBg   = isDark ? "#060b14"                      : "#f1f5f9";
  const cardBg  = isDark ? "rgba(255,255,255,0.03)"       : "#ffffff";
  const border  = isDark ? "rgba(255,255,255,0.07)"       : "#e2e8f0";
  const textMain = isDark ? "#f1f5f9"                    : "#0f172a";
  const textMuted= isDark ? "#64748b"                    : "#64748b";
  const chartGrid= isDark ? "rgba(255,255,255,0.04)"      : "#f1f5f9";
  const tooltipBg= isDark ? "#0f172a"                    : "#ffffff";
  const headerBg = isDark
    ? "linear-gradient(135deg,#0a0f1e 0%,#0d1a2e 50%,#080c1a 100%)"
    : `linear-gradient(135deg,#1e3a5f 0%,${palette.primary} 100%)`;

  const { data: loads = [] }        = useQuery({ queryKey: ["loads"],        queryFn: () => base44.entities.Load.list("-created_date", 500) });
  const { data: fleetExpenses = [] } = useQuery({ queryKey: ["fleetExpenses"], queryFn: () => base44.entities.FleetExpense.list("-expense_date", 500) });
  const { data: fleetVehicles = [] } = useQuery({ queryKey: ["fv_ap"],        queryFn: () => base44.entities.FleetVehicle.list() });
  const { data: fleetTrips = [] }   = useQuery({ queryKey: ["ft_ap"],         queryFn: () => base44.entities.FleetTrip.list("-trip_date", 500) });
  const { data: invoices = [] }     = useQuery({ queryKey: ["invoices_ap"],   queryFn: () => base44.entities.Invoice.list("-created_date", 200) });
  const { data: clients = [] }      = useQuery({ queryKey: ["clients_ap"],    queryFn: () => base44.entities.Client.list() });
  const { data: maintenance = [] }  = useQuery({ queryKey: ["fm_ap"],         queryFn: () => base44.entities.FleetMaintenance.list("-service_date", 200).catch(() => []) });

  // ── Derived months ────────────────────────────────────────────────────────
  const months12 = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), 11 - i);
    return { key: format(d, "yyyy-MM"), label: format(d, "MMM yy") };
  }), []);

  const now  = format(new Date(), "yyyy-MM");
  const prev = format(subMonths(new Date(), 1), "yyyy-MM");

  // ── Fleet monthly data ─────────────────────────────────────────────────────
  const fleetMonthly = useMemo(() => months12.map(({ key, label }) => {
    const mTrips = fleetTrips.filter(t => accountingMonth(t.trip_date) === key);
    const rev    = mTrips.reduce((s, t) => s + (t.total_revenue || t.freight_income_pkr || 0), 0);
    const cost   = mTrips.reduce((s, t) => s + (t.total_trip_expense || 0), 0)
                 + fleetExpenses.filter(e => accountingMonth(e.expense_date) === key).reduce((s, e) => s + (e.amount_pkr || 0), 0)
                 + maintenance.filter(m => accountingMonth(m.service_date) === key).reduce((s, m) => s + (m.cost || 0), 0);
    return { label, rev, cost, net: rev - cost, trips: mTrips.length };
  }), [months12, fleetTrips, fleetExpenses, maintenance]);

  // ── Loads monthly ─────────────────────────────────────────────────────────
  const loadsMonthly = useMemo(() => months12.map(({ key, label }) => ({
    label,
    loads:    loads.filter(l => (l.loading_date || "").startsWith(key)).length,
    revenue:  loads.filter(l => (l.loading_date || "").startsWith(key)).reduce((s, l) => s + (l.freight_amount || 0), 0),
  })), [months12, loads]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const thisMonthLoads   = loads.filter(l => (l.loading_date || "").startsWith(now)).length;
  const prevMonthLoads   = loads.filter(l => (l.loading_date || "").startsWith(prev)).length;
  const loadsTrend       = prevMonthLoads > 0 ? ((thisMonthLoads - prevMonthLoads) / prevMonthLoads) * 100 : 0;

  const thisFleetRev     = fleetMonthly[11]?.rev   || 0;
  const prevFleetRev     = fleetMonthly[10]?.rev   || 0;
  const fleetRevTrend    = prevFleetRev > 0 ? ((thisFleetRev - prevFleetRev) / prevFleetRev) * 100 : 0;
  const thisFleetNet     = fleetMonthly[11]?.net   || 0;

  const totalFleetRev12  = fleetMonthly.reduce((s, m) => s + m.rev, 0);
  const totalFleetNet12  = fleetMonthly.reduce((s, m) => s + m.net, 0);
  const totalLoadsRev12  = loadsMonthly.reduce((s, m) => s + m.revenue, 0);
  const paidInvoices     = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0);
  const pendingInvoices  = invoices.filter(i => ["sent","partial","overdue"].includes(i.status)).reduce((s, i) => s + (i.balance_amount || 0), 0);

  const activeVehicles   = fleetVehicles.filter(v => v.status === "available" || v.status === "active").length;
  const overdueMain      = maintenance.filter(m => m.status === "overdue").length;

  // ── Vehicle performance ───────────────────────────────────────────────────
  const vehiclePerf = useMemo(() => fleetVehicles.map(v => {
    const vTrips = fleetTrips.filter(t => t.fleet_vehicle_id === v.id || t.vehicle_number === v.vehicle_number);
    const rev    = vTrips.reduce((s, t) => s + (t.total_revenue || t.freight_income_pkr || 0), 0);
    const tripExp= vTrips.reduce((s, t) => s + (t.total_trip_expense || 0), 0);
    const addl   = fleetExpenses.filter(e => e.fleet_vehicle_id === v.id || e.vehicle_number === v.vehicle_number).reduce((s, e) => s + (e.amount_pkr || 0), 0);
    return { name: v.vehicle_number, trips: vTrips.length, rev, net: rev - tripExp - addl };
  }).filter(v => v.trips > 0).sort((a, b) => b.rev - a.rev).slice(0, 8), [fleetVehicles, fleetTrips, fleetExpenses]);

  // ── Fleet expense breakdown ───────────────────────────────────────────────
  const expTypePie = useMemo(() => {
    const agg = {};
    fleetExpenses.forEach(e => { const t = e.expense_type || "other"; agg[t] = (agg[t] || 0) + (e.amount_pkr || 0); });
    return Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name: name.replace(/_/g," "), value }));
  }, [fleetExpenses]);

  // ── Load status pie ───────────────────────────────────────────────────────
  const loadStatusPie = useMemo(() => {
    const agg = {};
    loads.forEach(l => { const s = l.status || "unknown"; agg[s] = (agg[s] || 0) + 1; });
    return Object.entries(agg).map(([name, value]) => ({ name, value }));
  }, [loads]);

  // ── Invoice status pie ────────────────────────────────────────────────────
  const invPie = useMemo(() => [
    { name: "Paid",    value: invoices.filter(i => i.status === "paid").length },
    { name: "Pending", value: invoices.filter(i => i.status === "sent").length },
    { name: "Overdue", value: invoices.filter(i => i.status === "overdue").length },
    { name: "Draft",   value: invoices.filter(i => i.status === "draft").length },
  ].filter(x => x.value > 0), [invoices]);

  // ── Radar — ops health ────────────────────────────────────────────────────
  const totalTrips = fleetTrips.length;
  const completedTrips = fleetTrips.filter(t => t.status === "completed").length;
  const completionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;
  const paidInvRate = invoices.length > 0 ? Math.round((invoices.filter(i => i.status === "paid").length / invoices.length) * 100) : 0;
  const activeFleetRate = fleetVehicles.length > 0 ? Math.round((activeVehicles / fleetVehicles.length) * 100) : 0;
  const maintHealthRate = fleetVehicles.length > 0 ? Math.round(Math.max(0, 100 - (overdueMain / fleetVehicles.length) * 100)) : 100;
  const radarData = [
    { subject: "Trip Completion", A: completionRate },
    { subject: "Invoice Recovery", A: paidInvRate },
    { subject: "Fleet Utilization", A: activeFleetRate },
    { subject: "Maintenance Health", A: maintHealthRate },
    { subject: "Revenue Growth", A: Math.min(100, Math.max(0, 50 + fleetRevTrend / 2)) },
  ];

  const activeCompany = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("company_profile") || "null");
      return stored;
    } catch { return null; }
  }, []);

  // ── SECTION LINKS ─────────────────────────────────────────────────────────
  const SECTIONS = [
    { title: "Master Data", color: "#6366f1", items: [
      { label: "Vehicle Types",        icon: Layers,       page: "AdminVehicleTypes",   color: "bg-indigo-900 text-indigo-300" },
      { label: "Fixed Stations",       icon: MapPin,       page: "AdminStations",       color: "bg-blue-900 text-blue-300" },
    ]},
    { title: "People", color: "#8b5cf6", items: [
      { label: "Clients",              icon: Users,        page: "Clients",             color: "bg-purple-900 text-purple-300" },
      { label: "Brokers",              icon: Handshake,    page: "Brokers",             color: "bg-teal-900 text-teal-300" },
      { label: "Vendors",              icon: Store,        page: "Vendors",             color: "bg-orange-900 text-orange-300" },
      { label: "Staff & Users",        icon: UserCog,      page: "AdminUsers",          color: "bg-amber-900 text-amber-300" },
    ]},
    { title: "Operations", color: "#10b981", items: [
      { label: "Vehicles (Pool)",      icon: Truck,        page: "Vehicles",            color: "bg-green-900 text-green-300" },
      { label: "Fleet (Own)",          icon: Truck,        page: "Fleet",               color: "bg-emerald-900 text-emerald-300" },
      { label: "Loads / Bilties",      icon: Package,      page: "Loads",               color: "bg-rose-900 text-rose-300" },
      { label: "Trip Cost Calc",       icon: Calculator,   page: "TripCostCalculator",  color: "bg-yellow-900 text-yellow-300" },
      { label: "Fleet Trips",          icon: Navigation,   page: "FleetTrips",          color: "bg-cyan-900 text-cyan-300" },
      { label: "Fleet Maintenance",    icon: Wrench,       page: "FleetMaintenance",    color: "bg-amber-900 text-amber-300" },
      { label: "Fleet Documents",      icon: Shield,       page: "FleetDocs",           color: "bg-blue-900 text-blue-300" },
      { label: "Fleet Installments",   icon: CreditCard,   page: "FleetInstallments",   color: "bg-purple-900 text-purple-300" },
      { label: "ODO & Fuel",           icon: Activity,     page: "FleetODOTracking",    color: "bg-sky-900 text-sky-300" },
      { label: "Fuel Rates",           icon: Fuel,         page: "FuelRateManager",     color: "bg-orange-900 text-orange-300" },
      { label: "GPS Tracking",         icon: MapPin,       page: "GPSTracking",         color: "bg-teal-900 text-teal-300" },
      { label: "Saved Trip Templates", icon: Zap,          page: "SavedTripExpenses",   color: "bg-amber-900 text-amber-300" },
    ]},
    { title: "Finance", color: "#f59e0b", items: [
      { label: "Accounting Module",    icon: BookOpen,     page: "Accounting",          color: "bg-blue-900 text-blue-300" },
      { label: "Fleet P&L",           icon: BarChart2,    page: "FleetPnL",            color: "bg-cyan-900 text-cyan-300" },
      { label: "Invoices",             icon: CreditCard,   page: "Invoices",            color: "bg-purple-900 text-purple-300" },
      { label: "Bank Accounts",        icon: Building2,    page: "BankAccounts",        color: "bg-green-900 text-green-300" },
      { label: "General Ledger",       icon: Wallet,       page: "GeneralLedger",       color: "bg-indigo-900 text-indigo-300" },
      { label: "Assets Register",      icon: Target,       page: "Assets",              color: "bg-rose-900 text-rose-300" },
      { label: "Own Fleet Ledger",     icon: BookOpen,     page: "OwnFleetLedger",      color: "bg-emerald-900 text-emerald-300" },
      { label: "Expense Master",       icon: DollarSign,   page: "ExpenseMasterLedger", color: "bg-amber-900 text-amber-300" },
      { label: "Cashbook",             icon: Wallet,       page: "CashbookManager",     color: "bg-sky-900 text-sky-300" },
      { label: "Cash Flow",            icon: Activity,     page: "CashFlowDashboard",   color: "bg-teal-900 text-teal-300" },
      { label: "Trial Balance",        icon: BarChart2,    page: "TrialBalance",        color: "bg-violet-900 text-violet-300" },
      { label: "Balance Sheet",        icon: FileBarChart, page: "BalanceSheet",        color: "bg-blue-900 text-blue-300" },
      { label: "P&L Report",           icon: TrendingUp,   page: "ProfitLoss",          color: "bg-green-900 text-green-300" },
      { label: "Chart of Accounts",    icon: Layers,       page: "ChartOfAccounts",     color: "bg-indigo-900 text-indigo-300" },
      { label: "Monthly Closing",      icon: Lock,         page: "MonthlyClosing",      color: "bg-red-900 text-red-300" },
    ]},
    { title: "HR & Payroll", color: "#8b5cf6", items: [
      { label: "HR & Payroll",         icon: Users,        page: "HRPayroll",           color: "bg-purple-900 text-purple-300" },
      { label: "Employees",            icon: UserCog,      page: "Employees",           color: "bg-violet-900 text-violet-300" },
      { label: "Labour Entry",         icon: Calculator,   page: "LabourEntry",         color: "bg-amber-900 text-amber-300" },
      { label: "Labour Ledger",        icon: BookOpen,     page: "LabourLedger",        color: "bg-teal-900 text-teal-300" },
      { label: "Labour Analytics",     icon: BarChart2,    page: "LabourAnalytics",     color: "bg-blue-900 text-blue-300" },
    ]},
    { title: "Master Settings", color: "#64748b", items: [
      { label: "Reports",              icon: FileBarChart, page: "Reports",             color: "bg-teal-900 text-teal-300" },
      { label: "Decision Dashboard",   icon: Cpu,          page: "DecisionDashboard",   color: "bg-cyan-900 text-cyan-300" },
      { label: "Notifications",        icon: Bell,         page: "Notifications",       color: "bg-yellow-900 text-yellow-300" },
      { label: "Companies & Theme",    icon: Palette,      page: "AppSettingsPage",     color: "bg-indigo-900 text-indigo-300" },
      { label: "Region / Stations",    icon: Settings,     page: "AdminSettings",       color: "bg-slate-700 text-slate-300" },
      { label: "Documentation",        icon: BookOpen,     page: "Documentation",       color: "bg-emerald-900 text-emerald-300" },
      { label: "User Guide",           icon: Globe,        page: "UserGuide",           color: "bg-blue-900 text-blue-300" },
    ]},
  ];

  const TABS = [
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "panel",     label: "Control Panel", icon: Globe },
    { id: "users",     label: "Users", icon: Users },
  ];

  return (
    <div className="ap-root" style={{ background: apBg }}>
      <style>{SS + `.ap-root{background:${apBg}!important;}`}</style>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{ background: headerBg, padding: "0 22px", borderBottom: `1px solid ${border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Truck size={16} color="#6366f1" /></div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: 0 }}>Admin Control Panel</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0 }}>{format(new Date(), "dd MMM yyyy")} · {settings.currency}</p>
          </div>
          <div style={{ flex: 1 }} />

          {/* Live stats bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {[
              { l: "Fleet", v: `${fleetVehicles.length}v`, c: "#10b981" },
              { l: "Active", v: `${activeVehicles}`, c: "#6366f1" },
              { l: "Clients", v: clients.length, c: "#f59e0b" },
              { l: "Alerts", v: overdueMain, c: overdueMain > 0 ? "#ef4444" : "#10b981" },
            ].map(x => (
              <div key={x.l} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: x.c, margin: 0 }}>{x.v}</p>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", margin: 0 }}>{x.l}</p>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 3, gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: activeTab === t.id ? "#6366f1" : "transparent", color: activeTab === t.id ? "#fff" : "rgba(255,255,255,0.5)", transition: "all 0.15s" }}>
                <t.icon size={13} />{t.label}
              </button>
            ))}
          </div>

          <button onClick={toggleMode} title={isDark ? "Light Mode" : "Dark Mode"}
            style={{ display:"flex", alignItems:"center", justifyContent:"center", width:34, height:34, borderRadius:10, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"#fff", cursor:"pointer", flexShrink:0 }}>
            {isDark ? <Sun size={15}/> : <Moon size={15}/>}
          </button>
          <Link to={createPageUrl("AppSettingsPage")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
            <Settings size={15} />
          </Link>
        </div>
      </div>

      <main style={{ padding: "20px 22px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ══════════════════════════════════════════════════════════════════
            ANALYTICS TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <div className="fade-up">

            {/* Fleet Document Renewal Alerts — stays until resolved */}
            <FleetDocAlertsBanner />

            {/* Row 1 — 8 KPI tiles */}
            <div className="g4" style={{ marginBottom: 16 }}>
              <KpiTile label="Fleet Vehicles"       value={fleetVehicles.length}  sub={`${activeVehicles} active`}             icon={Truck}        gradient="linear-gradient(135deg,#1e3a5f,#2563eb)"   onClick={()=>window.location.href=createPageUrl("Fleet")}/>
              <KpiTile label="This Month Revenue"   value={fmtK(thisFleetRev)}    sub={`${fleetMonthly[11]?.trips||0} trips`}  icon={Navigation}   gradient="linear-gradient(135deg,#064e3b,#10b981)"   trend={fleetRevTrend} onClick={()=>window.location.href=createPageUrl("FleetTrips")}/>
              <KpiTile label="Net Profit (month)"   value={fmtK(thisFleetNet)}    sub="Fleet net"                              icon={DollarSign}   gradient={thisFleetNet>=0?"linear-gradient(135deg,#065f46,#059669)":"linear-gradient(135deg,#7f1d1d,#dc2626)"} onClick={()=>window.location.href=createPageUrl("FleetPnL")}/>
              <KpiTile label="12M Fleet Revenue"    value={fmtK(totalFleetRev12)} sub={`Net: ${fmtK(totalFleetNet12)}`}        icon={TrendingUp}   gradient="linear-gradient(135deg,#1e1b4b,#7c3aed)"   onClick={()=>window.location.href=createPageUrl("FleetPnL")}/>
            </div>
            <div className="g4" style={{ marginBottom: 20 }}>
              <KpiTile label="This Month Loads"     value={thisMonthLoads}        sub="Bilties dispatched"                     icon={Package}      gradient="linear-gradient(135deg,#1a2340,#3b82f6)"   trend={loadsTrend} onClick={()=>window.location.href=createPageUrl("Loads")}/>
              <KpiTile label="Paid Invoices (12M)"  value={fmtK(paidInvoices)}    sub={`${invoices.filter(i=>i.status==="paid").length} invoices`}  icon={CreditCard}  gradient="linear-gradient(135deg,#064e3b,#0d9488)" onClick={()=>window.location.href=createPageUrl("Invoices")}/>
              <KpiTile label="Pending Invoices"     value={fmtK(pendingInvoices)} sub="Outstanding balance"                   icon={FileBarChart} gradient="linear-gradient(135deg,#78350f,#f59e0b)"   onClick={()=>window.location.href=createPageUrl("ClientAccounts")}/>
              <KpiTile label="Maintenance Alerts"   value={overdueMain}           sub="Overdue services"                      icon={Wrench}       gradient={overdueMain>0?"linear-gradient(135deg,#7f1d1d,#ef4444)":"linear-gradient(135deg,#042f2e,#0d9488)"} onClick={()=>window.location.href=createPageUrl("FleetMaintenance")}/>
            </div>

            {/* Row 2 — 12M area chart + radar */}
            <div className="g2" style={{ marginBottom: 16 }}>
              <DCard glow>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
                  Fleet Revenue vs Cost — 12 Months
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={fleetMonthly} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-chart-grid,rgba(255,255,255,0.04))"/>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--theme-text-muted,#64748b)" }}/>
                    <YAxis tick={{ fontSize: 9, fill: "var(--theme-text-muted,#64748b)" }} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                    <Tooltip content={DTooltip(fmt)}/>
                    <Legend wrapperStyle={{ fontSize: 10, color: "var(--theme-text-muted,#94a3b8)" }}/>
                    <Area type="monotone" dataKey="rev"  name="Revenue" stroke={palette.primary}   fill="url(#gRev)"  strokeWidth={2} dot={false}/>
                    <Area type="monotone" dataKey="cost" name="Cost"    stroke="#ef4444"            fill="url(#gCost)" strokeWidth={2} dot={false}/>
                    <Area type="monotone" dataKey="net"  name="Net P&L" stroke="#10b981"            fill="url(#gNet)"  strokeWidth={2} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </DCard>

              <DCard>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                  Operational Health Score
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)"/>
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 9 }}/>
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#475569", fontSize: 8 }}/>
                    <Radar dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2}/>
                    <Tooltip formatter={v => [`${v}%`, "Score"]}/>
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {radarData.map(r => (
                    <div key={r.subject} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 1, background: r.A >= 70 ? "#10b981" : r.A >= 40 ? "#f59e0b" : "#ef4444" }} />
                      <span style={{ fontSize: 9, color: "#64748b" }}>{r.subject.split(" ")[0]}: <strong style={{ color: "#e2e8f0" }}>{r.A}%</strong></span>
                    </div>
                  ))}
                </div>
              </DCard>
            </div>

            {/* Row 3 — Vehicle performance + expense breakdown */}
            <div className="g2" style={{ marginBottom: 16 }}>
              <DCard>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 14 }}>🚛 Vehicle Revenue Ranking</p>
                {vehiclePerf.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={vehiclePerf} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                      <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} width={55}/>
                      <Tooltip content={DTooltip(fmt)}/>
                      <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }}/>
                      <Bar dataKey="rev" name="Revenue" fill="#6366f1" radius={[0,4,4,0]}/>
                      <Bar dataKey="net" name="Net P&L" fill="#10b981" radius={[0,4,4,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: "30px 0" }}>No trip data yet</p>}
              </DCard>

              <DCard>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 14 }}>💸 Fleet Expense Breakdown</p>
                {expTypePie.length > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={expTypePie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                          {expTypePie.map((_, i) => <Cell key={i} fill={C[i % C.length]}/>)}
                        </Pie>
                        <Tooltip formatter={v => fmt(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                      {expTypePie.map((r, i) => (
                        <div key={r.name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C[i % C.length], display: "block" }}/>
                            <span style={{ fontSize: 10, color: "#64748b", textTransform: "capitalize" }}>{r.name}</span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#e2e8f0" }}>{fmtK(r.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <p style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: "30px 0" }}>No expense data yet</p>}
              </DCard>
            </div>

            {/* Row 4 — Monthly loads bar + invoice + load status pies */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
              <DCard>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 14 }}>📦 Monthly Loads & Revenue</p>
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={loadsMonthly} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }}/>
                    <YAxis yAxisId="left"  tick={{ fontSize: 9, fill: "#64748b" }}/>
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                    <Tooltip content={DTooltip(fmt)}/>
                    <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }}/>
                    <Bar      yAxisId="left"  dataKey="loads"   name="Loads"   fill="#6366f1" radius={[4,4,0,0]}/>
                    <Line     yAxisId="right" dataKey="revenue" name="Revenue" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: "#f59e0b" }}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </DCard>

              <DCard>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 14 }}>🧾 Invoices</p>
                {invPie.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={invPie} cx="50%" cy="50%" innerRadius={35} outerRadius={52} dataKey="value">
                          {invPie.map((_, i) => <Cell key={i} fill={["#10b981","#6366f1","#ef4444","#475569"][i % 4]}/>)}
                        </Pie>
                        <Tooltip/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      {invPie.map((r, i) => (
                        <div key={r.name} style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: ["#10b981","#6366f1","#ef4444","#475569"][i % 4], display: "block" }}/>
                            <span style={{ fontSize: 10, color: "#64748b" }}>{r.name}</span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#e2e8f0" }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p style={{ color: "#475569", fontSize: 11, textAlign: "center", padding: "16px 0" }}>No data</p>}
              </DCard>

              <DCard>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 14 }}>📦 Load Status</p>
                {loadStatusPie.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={loadStatusPie} cx="50%" cy="50%" innerRadius={35} outerRadius={52} dataKey="value">
                          {loadStatusPie.map((_, i) => <Cell key={i} fill={C[i % C.length]}/>)}
                        </Pie>
                        <Tooltip/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      {loadStatusPie.map((r, i) => (
                        <div key={r.name} style={{ display: "flex", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C[i % C.length], display: "block" }}/>
                            <span style={{ fontSize: 10, color: "#64748b", textTransform: "capitalize" }}>{r.name.replace(/_/g," ")}</span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#e2e8f0" }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p style={{ color: "#475569", fontSize: 11, textAlign: "center", padding: "16px 0" }}>No data</p>}
              </DCard>
            </div>

            {/* Row 5 — Net P&L line + trips per vehicle */}
            <div className="g2" style={{ marginBottom: 16 }}>
              <DCard>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 14 }}>📈 Net Fleet Profit Line (12M)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={fleetMonthly} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }}/>
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                    <Tooltip content={DTooltip(fmt)}/>
                    <Line type="monotone" dataKey="net" name="Net Profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981" }}/>
                  </LineChart>
                </ResponsiveContainer>
              </DCard>
              <DCard>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0", marginBottom: 14 }}>🏎 Trips per Vehicle</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={vehiclePerf.slice(0,8)} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }}/>
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }}/>
                    <Tooltip content={DTooltip(fmt)}/>
                    <Bar dataKey="trips" name="Trips" radius={[4,4,0,0]}>
                      {vehiclePerf.slice(0,8).map((_, i) => <Cell key={i} fill={C[i % C.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </DCard>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CONTROL PANEL TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "panel" && (
          <div className="fade-up space-y-6">
            {/* Brand header */}
            <div style={{ background: `linear-gradient(135deg,${palette.primary}20 0%,${palette.secondary}15 100%)`, border: `1px solid ${palette.primary}30`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              {activeCompany?.logo_url && (
                <img src={activeCompany.logo_url} alt="Logo" style={{ height: 48, borderRadius: 10, background: "#fff", padding: 4 }} />
              )}
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--theme-text,#fff)", margin: 0 }}>{activeCompany?.company_name || "Transport Management System"}</p>
                <p style={{ fontSize: 11, color: "var(--theme-text-muted,rgba(255,255,255,0.4))", margin: "2px 0 0" }}>Admin Control Panel · {settings.currency} · {settings.flag}</p>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { l: "Total Loads", v: loads.length, c: "#6366f1" },
                  { l: "Fleet", v: fleetVehicles.length, c: "#10b981" },
                  { l: "Clients", v: clients.length, c: "#f59e0b" },
                ].map(x => (
                  <div key={x.l} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "8px 14px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: x.c, margin: 0 }}>{x.v}</p>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", margin: 0 }}>{x.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {SECTIONS.map(sec => (
              <div key={sec.title}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: sec.color }} />
                  <p style={{ fontSize: 11, fontWeight: 800, color: "var(--theme-text-muted,#94a3b8)", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{sec.title}</p>
                </div>
                <div className="gml">
                  {sec.items.map(item => <SectionLink key={item.page} {...item} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            USERS TAB
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="fade-up" style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
            <AdminDashboard />
          </div>
        )}

      </main>
    </div>
  );
}