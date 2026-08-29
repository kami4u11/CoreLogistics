import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import { useTheme } from "@/context/ThemeContext";
import AccessDenied from "@/components/AccessDenied";
import { format, subMonths } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BookOpen, Building2, Users, Handshake, Truck, Wallet, CreditCard,
  UserCog, ChevronRight, TrendingUp, TrendingDown, Landmark, FileBarChart,
  Scale, BarChart3, Lock, FileText, PieChart as PieIcon, HardHat, Activity,
  Target, ListOrdered, Navigation, Wrench, Gauge, DollarSign, Package,
  ArrowUpRight, ArrowDownRight, Shield, Fuel, BarChart2, LayoutDashboard,
} from "lucide-react";

const C = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

const SS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}
.acc-root{font-family:'DM Sans','Segoe UI',system-ui,sans-serif;min-height:100vh;background:#f1f5f9;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:1100px){.g4{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr 1fr;}}
@media(max-width:640px){.g4{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr;}.g2{grid-template-columns:1fr;}.fm{padding:12px!important;}}
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
`;

const Card = ({ children, style = {}, isDark }) => (
  <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: 16, border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0"}`, padding: 20, ...style }}>
    {children}
  </div>
);

const KpiCard = ({ label, value, sub, icon: Icon, gradient, trend, page }) => {
  const inner = (
    <div style={{ background: gradient, borderRadius: 16, padding: "16px 18px", color: "#fff", position: "relative", overflow: "hidden", cursor: page ? "pointer" : "default", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { if (page) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)"; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ position: "absolute", right: 14, top: 14, opacity: 0.15 }}><Icon size={40} /></div>
      {page && <div style={{ position: "absolute", right: 12, bottom: 12, opacity: 0.5 }}><ChevronRight size={14} /></div>}
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.75, marginBottom: 5 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, margin: "0 0 2px" }}>{value}</p>
      {sub && <p style={{ fontSize: 10, opacity: 0.7, margin: 0 }}>{sub}</p>}
      {trend !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 10, fontWeight: 600 }}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          <span>{Math.abs(trend).toFixed(1)}% vs prev month</span>
        </div>
      )}
    </div>
  );
  return page ? <Link to={createPageUrl(page)} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
};

const ModuleLink = ({ icon: Icon, label, desc, page, color, isDark, textMain, textMuted }) => (
  <Link to={createPageUrl(page)}
    style={{ display: "flex", alignItems: "center", gap: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: 14, border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0"}`, padding: "12px 16px", textDecoration: "none", transition: "all 0.12s" }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.boxShadow = isDark ? "0 4px 12px rgba(16,185,129,0.2)" : "0 4px 12px rgba(16,185,129,0.1)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}>
    <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }} className={color}>
      <Icon size={18} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: textMain, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 10, color: textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</p>
    </div>
    <ChevronRight size={14} color={textMuted} />
  </Link>
);

const cTooltip = fmt => ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

const accountingMonth = (dateStr) => {
  if (!dateStr) return format(new Date(), "yyyy-MM");
  const d = new Date(dateStr);
  return d.getDate() < 5 ? format(subMonths(d, 1), "yyyy-MM") : format(d, "yyyy-MM");
};

export default function Accounting() {
  const { fmt, fmtK } = useAppSettings();
  const { canSeeAccounting, isAdmin } = useRole();
  const { isDark } = useTheme();

  // Theme colors
  const bgRoot   = isDark ? "#060b14" : "#f1f5f9";
  const bgCard   = isDark ? "rgba(255,255,255,0.03)" : "#fff";
  const border   = isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const textMain = isDark ? "#f1f5f9" : "#1e293b";
  const textMuted= isDark ? "#94a3b8" : "#64748b";
  const headerBg = isDark ? "linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f2744 100%)" : "linear-gradient(135deg,#e0e7ff 0%,#f0f4ff 50%,#dbeafe 100%)";

  const { data: entries = [] }      = useQuery({ queryKey: ["accounting_entries"],  queryFn: () => base44.entities.AccountingEntry.list("-date", 500) });
  const { data: banks = [] }        = useQuery({ queryKey: ["bank_accounts"],       queryFn: () => base44.entities.BankAccount.list() });
  const { data: cashbooks = [] }    = useQuery({ queryKey: ["cashbooks"],           queryFn: () => base44.entities.Cashbook.list() });
  const { data: trips = [] }        = useQuery({ queryKey: ["ft_acc"],              queryFn: () => base44.entities.FleetTrip.list("-trip_date", 500) });
  const { data: expenses = [] }     = useQuery({ queryKey: ["fe_acc"],              queryFn: () => base44.entities.FleetExpense.list("-expense_date", 300) });
  const { data: loads = [] }        = useQuery({ queryKey: ["loads_acc"],           queryFn: () => base44.entities.Load.list("-loading_date", 300) });
  const { data: invoices = [] }     = useQuery({ queryKey: ["invoices_acc"],        queryFn: () => base44.entities.Invoice.list("-created_date", 200) });
  const { data: vehicles = [] }     = useQuery({ queryKey: ["fv_acc"],              queryFn: () => base44.entities.FleetVehicle.list() });
  const { data: maintenance = [] }  = useQuery({ queryKey: ["fm_acc"],              queryFn: () => base44.entities.FleetMaintenance.list("-service_date", 200).catch(() => []) });

  // ── Core financial KPIs ──────────────────────────────────────────────────
  const totalBankBalance  = banks.reduce((s, b) => s + (b.current_balance || 0), 0);
  const totalCash         = cashbooks.reduce((s, c) => s + (c.current_balance || 0), 0);
  const totalReceivable   = Math.max(0, entries.filter(e => e.account_type === "client").reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0));
  const totalPayable      = Math.max(0, entries.filter(e => e.account_type === "vendor").reduce((s, e) => s + (e.credit || 0) - (e.debit || 0), 0));
  const paidInvoices      = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0);
  const pendingInvoices   = invoices.filter(i => ["sent","partial","overdue"].includes(i.status)).reduce((s, i) => s + (i.balance_amount || 0), 0);

  // ── Fleet KPIs ───────────────────────────────────────────────────────────
  const now  = format(new Date(), "yyyy-MM");
  const prev = format(subMonths(new Date(), 1), "yyyy-MM");
  const thisMonthTrips    = trips.filter(t => accountingMonth(t.trip_date) === now);
  const prevMonthTrips    = trips.filter(t => accountingMonth(t.trip_date) === prev);
  const thisFleetRev      = thisMonthTrips.reduce((s, t) => s + (t.total_revenue || t.freight_income_pkr || 0), 0);
  const prevFleetRev      = prevMonthTrips.reduce((s, t) => s + (t.total_revenue || t.freight_income_pkr || 0), 0);
  const fleetRevTrend     = prevFleetRev > 0 ? ((thisFleetRev - prevFleetRev) / prevFleetRev) * 100 : 0;
  const thisFleetExp      = thisMonthTrips.reduce((s, t) => s + (t.total_trip_expense || 0), 0)
                          + expenses.filter(e => accountingMonth(e.expense_date) === now).reduce((s, e) => s + (e.amount_pkr || 0), 0)
                          + maintenance.filter(m => accountingMonth(m.service_date) === now).reduce((s, m) => s + (m.cost || 0), 0);
  const fleetNetProfit    = thisFleetRev - thisFleetExp;

  // ── 12-month chart data ───────────────────────────────────────────────────
  const months12 = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m    = format(subMonths(new Date(), 11 - i), "yyyy-MM");
    const label = format(subMonths(new Date(), 11 - i), "MMM yy");
    const mTrips = trips.filter(t => accountingMonth(t.trip_date) === m);
    const fleetRev = mTrips.reduce((s, t) => s + (t.total_revenue || t.freight_income_pkr || 0), 0);
    const fleetCost= mTrips.reduce((s, t) => s + (t.total_trip_expense || 0), 0)
                   + expenses.filter(e => accountingMonth(e.expense_date) === m).reduce((s, e) => s + (e.amount_pkr || 0), 0);
    const biltyRev = loads.filter(l => (l.loading_date || "").startsWith(m)).reduce((s, l) => s + (l.freight_amount || 0), 0);
    const invRev   = invoices.filter(iv => (iv.invoice_date || "").startsWith(m) && iv.status === "paid").reduce((s, iv) => s + (iv.total_amount || 0), 0);
    return { label, fleetRev, fleetCost, biltyRev, invRev, net: fleetRev - fleetCost };
  }), [trips, expenses, loads, invoices]);

  // ── Revenue breakdown pie ─────────────────────────────────────────────────
  const totalFleetRevAll  = trips.reduce((s, t) => s + (t.total_revenue || t.freight_income_pkr || 0), 0);
  const totalBiltyRevAll  = loads.reduce((s, l) => s + (l.freight_amount || 0), 0);
  const revPie = [
    { name: "Fleet Trips", value: totalFleetRevAll },
    { name: "Bilty Revenue", value: totalBiltyRevAll },
    { name: "Paid Invoices", value: paidInvoices },
  ].filter(x => x.value > 0);

  // ── Invoice status pie ────────────────────────────────────────────────────
  const invStatusPie = [
    { name: "Paid",    value: invoices.filter(i => i.status === "paid").length },
    { name: "Sent",    value: invoices.filter(i => i.status === "sent").length },
    { name: "Overdue", value: invoices.filter(i => i.status === "overdue").length },
    { name: "Draft",   value: invoices.filter(i => i.status === "draft").length },
  ].filter(x => x.value > 0);

  // ── Fleet expense breakdown ───────────────────────────────────────────────
  const expTypePie = useMemo(() => {
    const agg = {};
    expenses.forEach(e => { const t = e.expense_type || "other"; agg[t] = (agg[t] || 0) + (e.amount_pkr || 0); });
    return Object.entries(agg).sort((a,b) => b[1]-a[1]).slice(0,7).map(([name,value]) => ({ name, value }));
  }, [expenses]);

  // ── Loads per month bar ────────────────────────────────────────────────────
  const loadsPerMonth = useMemo(() => months12.map(m => ({
    label: m.label,
    loads: loads.filter(l => (l.loading_date||"").startsWith(format(subMonths(new Date(), 11 - months12.indexOf(m)), "yyyy-MM"))).length,
  })), [months12, loads]);

  const MODULE_GROUPS = [
    {
      title: "🎯 Decision Intelligence",
      color: "#7c3aed",
      items: [
        { label: "Decision Dashboard", desc: "Profit/trip, top clients, loss trips", icon: Target, page: "DecisionDashboard", color: "bg-purple-50 text-purple-700" },
        { label: "Cash Flow Dashboard", desc: "Daily position, bank & cashbook", icon: Activity, page: "CashFlowDashboard", color: "bg-emerald-50 text-emerald-700" },
        { label: "Data Analysis", desc: "Deep-dive analytics across all data", icon: BarChart2, page: "DataAnalysis", color: "bg-indigo-50 text-indigo-700" },
      ]
    },
    {
      title: "📊 Financial Statements",
      color: "#2563eb",
      items: [
        { label: "P&L Statement", desc: "Income, expenses & net profit", icon: BarChart3, page: "ProfitLoss", color: "bg-emerald-50 text-emerald-700" },
        { label: "Balance Sheet", desc: "Assets, liabilities & equity", icon: Scale, page: "BalanceSheet", color: "bg-blue-50 text-blue-700" },
        { label: "Trial Balance", desc: "All accounts debit vs credit", icon: PieIcon, page: "TrialBalance", color: "bg-indigo-50 text-indigo-700" },
        { label: "Monthly Closing", desc: "Close periods & lock entries", icon: Lock, page: "MonthlyClosing", color: "bg-purple-50 text-purple-700" },
      ]
    },
    {
      title: "📒 Ledgers & Accounts",
      color: "#059669",
      items: [
        { label: "General Ledger", desc: "Double-entry journal", icon: BookOpen, page: "GeneralLedger", color: "bg-blue-50 text-blue-600" },
        { label: "Cashbooks", desc: "Office, Petty, Driver Cash", icon: Wallet, page: "CashbookManager", color: "bg-indigo-50 text-indigo-600" },
        { label: "Bank Accounts", desc: "Manage banks & balances", icon: Building2, page: "BankAccounts", color: "bg-green-50 text-green-600" },
        { label: "Client Accounts", desc: "Receivables & client ledger", icon: Users, page: "ClientAccounts", color: "bg-purple-50 text-purple-600" },
        { label: "Vendor Accounts", desc: "Payables & vendor ledger", icon: Wallet, page: "VendorAccounts", color: "bg-orange-50 text-orange-600" },
        { label: "Broker Accounts", desc: "Broker payments & ledger", icon: Handshake, page: "BrokerAccounts", color: "bg-teal-50 text-teal-600" },
        { label: "Driver Accounts", desc: "Driver advances & payments", icon: Truck, page: "DriverAccounts", color: "bg-cyan-50 text-cyan-600" },
        { label: "Own Fleet Ledger", desc: "Payable to own fleet per trip", icon: Truck, page: "OwnFleetLedger", color: "bg-orange-50 text-orange-600" },
        { label: "Labour Ledger", desc: "Labour charges by month", icon: HardHat, page: "LabourLedger", color: "bg-amber-50 text-amber-600" },
        { label: "Expense Master", desc: "All bilty additional expenses", icon: CreditCard, page: "ExpenseMasterLedger", color: "bg-red-50 text-red-600" },
        { label: "Chart of Accounts", desc: "COA — assets, liabilities etc.", icon: ListOrdered, page: "ChartOfAccounts", color: "bg-slate-50 text-slate-600" },
        { label: "Invoices", desc: "Multi-load invoices & payments", icon: FileText, page: "Invoices", color: "bg-sky-50 text-sky-600" },
      ]
    },
    {
      title: "🚛 Fleet Management",
      color: "#10b981",
      items: [
        { label: "Fleet Hub", desc: "Overview, vehicles & alerts", icon: Truck, page: "Fleet", color: "bg-green-50 text-green-600" },
        { label: "Fleet Trips", desc: "Manage & track all trips", icon: Navigation, page: "FleetTrips", color: "bg-emerald-50 text-emerald-600" },
        { label: "Fleet Expenses", desc: "Vehicle expenses & approvals", icon: CreditCard, page: "FleetExpenses", color: "bg-red-50 text-red-600" },
        { label: "Fleet P&L", desc: "Fleet profit & loss analysis", icon: BarChart3, page: "FleetPnL", color: "bg-purple-50 text-purple-600" },
        { label: "Fleet Maintenance", desc: "Service records & schedule", icon: Wrench, page: "FleetMaintenance", color: "bg-amber-50 text-amber-600" },
        { label: "Fleet Documents", desc: "Certs, permits, insurance", icon: Shield, page: "FleetDocs", color: "bg-blue-50 text-blue-600" },
        { label: "ODO & Fuel", desc: "Odometer & fuel consumption", icon: Gauge, page: "FleetODOTracking", color: "bg-teal-50 text-teal-600" },
        { label: "Fleet Installments", desc: "Vehicle EMI schedule & KPIs", icon: DollarSign, page: "FleetInstallments", color: "bg-indigo-50 text-indigo-600" },
        { label: "Fuel Analytics", desc: "KM/L efficiency & fuel drops", icon: Fuel, page: "FuelAnalytics", color: "bg-orange-50 text-orange-600" },
        { label: "Fuel Rates", desc: "Manage fuel pricing", icon: Fuel, page: "FuelRateManager", color: "bg-sky-50 text-sky-600" },
      ]
    },
    {
      title: "👷 HR & Operations",
      color: "#f59e0b",
      items: [
        { label: "HR & Payroll", desc: "Hire/fire, salaries, attendance", icon: UserCog, page: "HRPayroll", color: "bg-rose-50 text-rose-600" },
        { label: "Assets Register", desc: "Assets, purchases, EMI schedule", icon: Landmark, page: "Assets", color: "bg-indigo-50 text-indigo-600" },
        { label: "Expense Ledger", desc: "All company expenses", icon: CreditCard, page: "AdminLedger", color: "bg-amber-50 text-amber-600" },
        { label: "Reports & Export", desc: "Fleet, driver, P&L, fuel reports", icon: FileBarChart, page: "Reports", color: "bg-teal-50 text-teal-700" },
        { label: "Loads / Bilties", desc: "All loads and bilties", icon: Package, page: "Loads", color: "bg-blue-50 text-blue-600" },
      ]
    },
  ];

  if (!canSeeAccounting) return <AccessDenied />;

  return (
    <div className="acc-root" style={{ background: bgRoot }}>
      <style>{SS}</style>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ background: headerBg, padding: "20px 24px 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BookOpen size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: isDark ? "#fff" : "#0f172a", margin: 0 }}>Accounting & Finance</h1>
              <p style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.45)", margin: 0 }}>Corporate Dashboard · {format(new Date(), "dd MMMM yyyy")}</p>
            </div>
            {isAdmin && (
              <Link to={createPageUrl("AdminPanel")}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", borderRadius: 12, textDecoration: "none", fontSize: 12, fontWeight: 800, border: "1px solid rgba(167,139,250,0.3)", boxShadow: "0 2px 12px rgba(124,58,237,0.4)", flexShrink: 0 }}>
                <LayoutDashboard size={14} color="#fff" />
                Dashboard
              </Link>
            )}
          </div>

          {/* Top KPIs */}
          <div className="g4">
            <KpiCard label="Bank Balance"       value={fmtK(totalBankBalance)} sub={`${banks.length} accounts`}           icon={Building2}  gradient="linear-gradient(135deg,#1e3a5f,#2563eb)"   page="BankAccounts"/>
            <KpiCard label="Cash in Hand"       value={fmtK(totalCash)}        sub={`${cashbooks.length} cashbooks`}       icon={Wallet}     gradient="linear-gradient(135deg,#1e1b4b,#7c3aed)"   page="CashbookManager"/>
            <KpiCard label="Total Receivable"   value={fmtK(totalReceivable)}  sub="Client balances due"                   icon={TrendingUp}  gradient="linear-gradient(135deg,#064e3b,#10b981)"   page="ClientAccounts"/>
            <KpiCard label="Total Payable"      value={fmtK(totalPayable)}     sub="Vendor & broker dues"                  icon={TrendingDown} gradient="linear-gradient(135deg,#7f1d1d,#dc2626)"  page="VendorAccounts"/>
          </div>
        </div>
      </div>

      <main style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }} className="fm">

        {/* ── Row 2 KPIs ─────────────────────────────────────────────────── */}
        <div className="g4" style={{ marginBottom: 20 }}>
          <KpiCard label="Fleet Revenue (Month)" value={fmtK(thisFleetRev)}  sub={`${thisMonthTrips.length} trips`}         icon={Navigation}  gradient="linear-gradient(135deg,#064e3b,#059669)"  trend={fleetRevTrend} page="FleetTrips"/>
          <KpiCard label="Fleet Net Profit"       value={fmtK(fleetNetProfit)} sub={`Cost: ${fmtK(thisFleetExp)}`}           icon={DollarSign}  gradient={fleetNetProfit>=0?"linear-gradient(135deg,#065f46,#10b981)":"linear-gradient(135deg,#7f1d1d,#dc2626)"} page="FleetPnL"/>
          <KpiCard label="Paid Invoices"          value={fmtK(paidInvoices)}  sub={`${invoices.filter(i=>i.status==="paid").length} invoices`}  icon={FileText}   gradient="linear-gradient(135deg,#1e3a5f,#0369a1)" page="Invoices"/>
          <KpiCard label="Pending Invoices"       value={fmtK(pendingInvoices)} sub={`${invoices.filter(i=>["sent","partial","overdue"].includes(i.status)).length} outstanding`} icon={FileBarChart} gradient="linear-gradient(135deg,#78350f,#f59e0b)" page="ClientAccounts"/>
        </div>

        {/* ── 12-Month Area Chart ─────────────────────────────────────────── */}
        <Card isDark={isDark} style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 800, fontSize: 14, color: textMain, marginBottom: 16 }}>📈 12-Month Revenue & Profit Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={months12} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gFleet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gBilty" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}/>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: textMuted }}/>
              <YAxis tick={{ fontSize: 10, fill: textMuted }} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
              <Tooltip content={cTooltip(fmt)}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Area type="monotone" dataKey="fleetRev" name="Fleet Revenue" stroke="#10b981" fill="url(#gFleet)" strokeWidth={2}/>
              <Area type="monotone" dataKey="biltyRev" name="Bilty Revenue" stroke="#3b82f6" fill="url(#gBilty)" strokeWidth={2}/>
              <Area type="monotone" dataKey="net"      name="Fleet Net P&L" stroke="#8b5cf6" fill="url(#gNet)"   strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="g3" style={{ marginBottom: 20 }}>

          {/* Revenue Breakdown Pie */}
          <Card isDark={isDark}>
            <p style={{ fontWeight: 700, fontSize: 13, color: textMain, marginBottom: 14 }}>Revenue Breakdown</p>
            {revPie.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ResponsiveContainer width="55%" height={150}>
                  <PieChart>
                    <Pie data={revPie} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value">
                      {revPie.map((_, i) => <Cell key={i} fill={C[i % C.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                {revPie.map((r, i) => (
                 <div key={r.name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"}` }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                     <span style={{ width: 8, height: 8, borderRadius: "50%", background: C[i % C.length], display: "block" }}/>
                     <span style={{ fontSize: 10, color: textMuted }}>{r.name}</span>
                   </div>
                   <span style={{ fontSize: 10, fontWeight: 700, color: textMain }}>{fmtK(r.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No revenue data</p>}
          </Card>

          {/* Invoice Status Pie */}
          <Card isDark={isDark}>
            <p style={{ fontWeight: 700, fontSize: 13, color: textMain, marginBottom: 14 }}>Invoice Status</p>
            {invStatusPie.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ResponsiveContainer width="55%" height={150}>
                  <PieChart>
                    <Pie data={invStatusPie} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value">
                      {invStatusPie.map((_, i) => <Cell key={i} fill={["#10b981","#3b82f6","#ef4444","#94a3b8"][i % 4]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                   {invStatusPie.map((r, i) => (
                     <div key={r.name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"}` }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                         <span style={{ width: 8, height: 8, borderRadius: "50%", background: ["#10b981","#3b82f6","#ef4444","#94a3b8"][i % 4], display: "block" }}/>
                         <span style={{ fontSize: 10, color: textMuted }}>{r.name}</span>
                       </div>
                       <span style={{ fontSize: 10, fontWeight: 700, color: textMain }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No invoice data</p>}
          </Card>

          {/* Fleet Expense Breakdown Pie */}
          <Card isDark={isDark}>
            <p style={{ fontWeight: 700, fontSize: 13, color: textMain, marginBottom: 14 }}>Fleet Expense Types</p>
            {expTypePie.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ResponsiveContainer width="55%" height={150}>
                  <PieChart>
                    <Pie data={expTypePie} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value">
                      {expTypePie.map((_, i) => <Cell key={i} fill={C[i % C.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {expTypePie.slice(0, 5).map((r, i) => (
                     <div key={r.name} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"}` }}>
                       <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                         <span style={{ width: 7, height: 7, borderRadius: "50%", background: C[i % C.length], display: "block" }}/>
                         <span style={{ fontSize: 10, color: textMuted, textTransform: "capitalize" }}>{r.name.replace(/_/g, " ")}</span>
                       </div>
                       <span style={{ fontSize: 10, fontWeight: 700, color: textMain }}>{fmtK(r.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No expense data</p>}
          </Card>
        </div>

        {/* ── Bar Charts Row ─────────────────────────────────────────────── */}
        <div className="g2" style={{ marginBottom: 20 }}>
          {/* Monthly Fleet Revenue vs Cost bar */}
          <Card isDark={isDark}>
            <p style={{ fontWeight: 700, fontSize: 13, color: textMain, marginBottom: 14 }}>Fleet Revenue vs Cost (12M)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={months12} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}/>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: textMuted }}/>
                <YAxis tick={{ fontSize: 9, fill: textMuted }} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={cTooltip(fmt)}/>
                <Legend wrapperStyle={{ fontSize: 10 }}/>
                <Bar dataKey="fleetRev"  name="Revenue" fill="#10b981" radius={[4,4,0,0]}/>
                <Bar dataKey="fleetCost" name="Cost"    fill="#ef4444" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Net P&L Line Chart */}
          <Card isDark={isDark}>
            <p style={{ fontWeight: 700, fontSize: 13, color: textMain, marginBottom: 14 }}>Net Fleet Profit Line (12M)</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={months12} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}/>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: textMuted }}/>
                <YAxis tick={{ fontSize: 9, fill: textMuted }} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={cTooltip(fmt)}/>
                <Line type="monotone" dataKey="net" name="Net Profit" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: "#8b5cf6" }}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ── Recent Entries ──────────────────────────────────────────────── */}
        <Card isDark={isDark} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: textMain, margin: 0 }}>Recent Accounting Entries</p>
            <Link to={createPageUrl("GeneralLedger")} style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700, textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.07)" : "#f1f5f9"}` }}>
                  {["Date","Account","Type","Source","Debit","Credit"].map(h => (
                    <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase", color: textMuted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 8).map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"}`, background: i % 2 === 0 ? "transparent" : isDark ? "rgba(255,255,255,0.02)" : "#fafafa" }}>
                    <td style={{ padding: "8px 12px", color: textMuted }}>{e.date}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: textMain }}>{e.account_name}</td>
                    <td style={{ padding: "8px 12px" }}><span style={{ background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textMuted, fontSize: 10, padding: "1px 7px", borderRadius: 99, textTransform: "capitalize" }}>{e.account_type}</span></td>
                    <td style={{ padding: "8px 12px", color: textMuted, fontSize: 11 }}>{e.payment_source || "—"}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#ef4444" }}>{e.debit > 0 ? fmt(e.debit) : "—"}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#10b981" }}>{e.credit > 0 ? fmt(e.credit) : "—"}</td>
                  </tr>
                ))}
                {entries.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: textMuted }}>No entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Module Links ────────────────────────────────────────────────── */}
        {MODULE_GROUPS.map(grp => (
          <div key={grp.title} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 3, height: 18, borderRadius: 2, background: grp.color }}/>
              <p style={{ fontSize: 12, fontWeight: 800, color: textMain, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{grp.title}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
              {grp.items.map(mod => <ModuleLink key={mod.page} {...mod} />)}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}