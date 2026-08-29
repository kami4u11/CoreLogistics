import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Truck, Users, Package, FileText, TrendingUp, AlertTriangle,
  Shield, ArrowRight, Route, BarChart2, Weight, Calculator,
  Navigation, HardHat, BookCheck, MapPin, ChevronDown, ChevronUp,
  LogOut, Phone,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import AdvancedAnalyticsWidgets from "@/components/AdvancedAnalyticsWidgets";
import GlobalSearch from "@/components/GlobalSearch";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths, startOfMonth, parseISO, isValid } from "date-fns";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

// ─── CLIENT PORTAL ────────────────────────────────────────────────────────────
function ClientPortal({ user }) {
  const [loads, setLoads]       = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [client, setClient]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [activeTab, setActiveTab] = useState("loads");

  const STATUS_COLOR = {
    booked:     "bg-blue-100 text-blue-700",
    loading:    "bg-yellow-100 text-yellow-700",
    in_transit: "bg-purple-100 text-purple-700",
    delivered:  "bg-green-100 text-green-700",
    completed:  "bg-emerald-100 text-emerald-700",
    cancelled:  "bg-red-100 text-red-700",
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const clients = await base44.entities.Client.list();
        const myClient = clients.find(c =>
          c.portal_email === user.email ||
          c.email === user.email ||
          (Array.isArray(c.portal_users) && c.portal_users.some(u => u.email === user.email))
        );
        setClient(myClient || null);
        if (myClient) {
          const [allLoads, allInvoices] = await Promise.all([
            base44.entities.Load.list("-loading_date", 200),
            base44.entities.Invoice?.list("-created_date", 100).catch(() => []),
          ]);
          setLoads(allLoads.filter(l =>
            l.client_id === myClient.id || l.client_name === myClient.name
          ));
          setInvoices((allInvoices || []).filter(i =>
            i.client_id === myClient.id || i.client_name === myClient.name
          ));
        }
      } catch (err) {
        console.error("ClientPortal error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const activeLoads = useMemo(
    () => loads.filter(l => ["booked", "loading", "in_transit"].includes(l.status)),
    [loads]
  );
  const pendingAmount = useMemo(
    () => invoices
      .filter(i => ["sent", "partial", "overdue"].includes(i.status))
      .reduce((s, i) => s + (i.balance_amount || 0), 0),
    [invoices]
  );
  const paidAmount = useMemo(
    () => invoices
      .filter(i => i.status === "paid")
      .reduce((s, i) => s + (i.total_amount || 0), 0),
    [invoices]
  );

  const safeFormatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = parseISO(dateStr);
      return isValid(d) ? format(d, "dd MMM yyyy") : null;
    } catch { return null; }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading your portal...</p>
      </div>
    </div>
  );

  if (!client) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-sm border border-slate-100">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-2">Account Not Linked</h2>
        <p className="text-sm text-slate-400 mb-2">Your account hasn't been linked to a client yet.</p>
        <p className="text-xs text-slate-400 mb-6">
          Please contact your logistics manager.<br />
          Logged in as: <span className="font-semibold">{user?.email}</span>
        </p>
        <button
          onClick={() => base44.auth.logout()}
          className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1.5 mx-auto"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 px-4 pt-10 pb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-blue-200 text-xs mb-1">Client Portal</p>
            <h1 className="text-2xl font-bold text-white">{client.name}</h1>
            {client.contact_person && <p className="text-blue-300 text-sm mt-0.5">{client.contact_person}</p>}
          </div>
          <button onClick={() => base44.auth.logout()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{activeLoads.length}</p>
            <p className="text-blue-200 text-xs mt-0.5">Active</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{loads.length}</p>
            <p className="text-blue-200 text-xs mt-0.5">Total Loads</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 text-center">
            <p className="text-lg font-bold text-white">
              {pendingAmount > 0 ? `₨${(pendingAmount / 1000).toFixed(0)}K` : "✅"}
            </p>
            <p className="text-blue-200 text-xs mt-0.5">{pendingAmount > 0 ? "Pending" : "All Clear"}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-2 flex gap-2">
        {[
          { key: "loads",    label: "📦 Shipments" },
          { key: "invoices", label: "🧾 Invoices" },
          { key: "summary",  label: "📊 Summary" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            {t.label}
            {t.key === "invoices" && pendingAmount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">!</span>
            )}
          </button>
        ))}
      </div>

      {/* Loads Tab */}
      {activeTab === "loads" && (
        <div className="px-4 space-y-2.5 mt-2">
          {loads.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
              <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No shipments yet</p>
            </div>
          ) : loads.map(load => {
            const isOpen = expanded === load.id;
            const formattedDate = safeFormatDate(load.loading_date);
            return (
              <div key={load.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <button className="w-full text-left p-4" onClick={() => setExpanded(isOpen ? null : load.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{load.load_number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[load.status] || "bg-slate-100 text-slate-600"}`}>
                          {(load.status || "").replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{load.origin}</span>
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span className="truncate">{load.destination}</span>
                      </div>
                      {formattedDate && <p className="text-xs text-slate-400 mt-0.5">{formattedDate}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      {load.freight_amount > 0 && (
                        <p className="text-sm font-bold text-blue-700">₨{load.freight_amount.toLocaleString()}</p>
                      )}
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-slate-300 mt-1 ml-auto" />
                        : <ChevronDown className="w-4 h-4 text-slate-300 mt-1 ml-auto" />
                      }
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-2 text-xs">
                    {load.vehicle_number && <div className="flex justify-between"><span className="text-slate-400">Vehicle</span><span className="font-semibold">🚛 {load.vehicle_number}</span></div>}
                    {load.driver_name    && <div className="flex justify-between"><span className="text-slate-400">Driver</span><span className="font-semibold">{load.driver_name}</span></div>}
                    {load.weight_tons    && <div className="flex justify-between"><span className="text-slate-400">Weight</span><span className="font-semibold">{load.weight_tons} tons</span></div>}
                    {load.commodity      && <div className="flex justify-between"><span className="text-slate-400">Commodity</span><span className="font-semibold">{load.commodity}</span></div>}
                    {load.remarks        && <div className="mt-1 p-2 bg-white rounded-lg text-slate-500 italic">"{load.remarks}"</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <div className="px-4 space-y-2.5 mt-2">
          {invoices.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No invoices yet</p>
            </div>
          ) : invoices.map(inv => (
            <div key={inv.id} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900">{inv.invoice_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      inv.status === "paid" ? "bg-green-100 text-green-700"
                      : inv.status === "overdue" ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                    }`}>{inv.status}</span>
                  </div>
                  {inv.due_date    && <p className="text-xs text-slate-400">Due: {inv.due_date}</p>}
                  {inv.load_number && <p className="text-xs text-slate-400">Load: {inv.load_number}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">₨{(inv.total_amount || 0).toLocaleString()}</p>
                  {inv.balance_amount > 0 && (
                    <p className="text-xs text-red-500 font-semibold mt-0.5">Balance: ₨{inv.balance_amount.toLocaleString()}</p>
                  )}
                  {inv.status === "paid" && <p className="text-xs text-green-600 font-semibold mt-0.5">✅ Paid</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === "summary" && (
        <div className="px-4 mt-2 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Account Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3"><p className="text-xs text-blue-500 mb-1">Total Shipments</p><p className="text-xl font-bold text-blue-700">{loads.length}</p></div>
              <div className="bg-purple-50 rounded-xl p-3"><p className="text-xs text-purple-500 mb-1">Active Now</p><p className="text-xl font-bold text-purple-700">{activeLoads.length}</p></div>
              <div className="bg-green-50 rounded-xl p-3"><p className="text-xs text-green-500 mb-1">Total Paid</p><p className="text-base font-bold text-green-700">₨{paidAmount.toLocaleString()}</p></div>
              <div className={`${pendingAmount > 0 ? "bg-red-50" : "bg-emerald-50"} rounded-xl p-3`}>
                <p className={`text-xs mb-1 ${pendingAmount > 0 ? "text-red-500" : "text-emerald-500"}`}>Outstanding</p>
                <p className={`text-base font-bold ${pendingAmount > 0 ? "text-red-700" : "text-emerald-700"}`}>
                  {pendingAmount > 0 ? `₨${pendingAmount.toLocaleString()}` : "Clear ✅"}
                </p>
              </div>
            </div>
          </div>
          {client.phone && (
            <div className="bg-white rounded-2xl p-4 border border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Contact Info</h3>
              <a href={`tel:${client.phone}`} className="flex items-center gap-3 py-2 text-blue-600">
                <Phone className="w-4 h-4" /><span className="text-sm font-medium">{client.phone}</span>
              </a>
            </div>
          )}
          <button
            onClick={() => base44.auth.logout()}
            className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
// ─── END CLIENT PORTAL ────────────────────────────────────────────────────────

export default function Dashboard() {
  // ── ALL hooks unconditionally at the top ──────────────────────────────────
  const {
    user, role, loading: roleLoading,
    isAdmin, isManagement, isAccounting, isSleepingPartner,
    isFleetManager, isDriver, isSupervisor, isLabourSupervisor, isClient,
    isPendingUser,
    canSeeAccounting, canAddLoad,
  } = useRole();

  const { fmt, fmtK, settings } = useAppSettings();
  const { isDark, palette } = useTheme();
  const [dateRange, setDateRange] = useState("6m");

  const canSeeFreightRates     = isAdmin || isManagement || isAccounting || isSleepingPartner;
  const isPureLabourSupervisor = isLabourSupervisor && !isAdmin && !isManagement
                                 && !isAccounting && !isSleepingPartner && !isFleetManager;

  const STAFF_ROLES = ["admin","management","sleeping_partner","operations",
                       "supervisor","accounting","fleet_manager","driver","labour_supervisor"];

  // All queries declared unconditionally — gated with `enabled`
  const { data: loads = [], isLoading: loadsLoading } = useQuery({
    queryKey: ["loads"],
    queryFn: () => base44.entities.Load.list("-created_date", 300),
    enabled: !roleLoading && !isClient && !isDriver,
  });
  const { data: fleet = [] } = useQuery({
    queryKey: ["fleet"],
    queryFn: () => base44.entities.FleetVehicle.list(),
    enabled: !roleLoading && !isClient,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
    enabled: !roleLoading && !isClient && !isDriver && !isFleetManager,
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 100),
    enabled: !roleLoading && !isClient && canSeeAccounting,
  });
  const { data: trips = [] } = useQuery({
    queryKey: ["fleetTrips"],
    queryFn: () => base44.entities.FleetTrip.list("-trip_date", 100),
    enabled: !roleLoading && !isClient,
  });

  // Company profile from localStorage — safe parse
  const companyProfile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; }
  }, []);

  // Date filter
  const dateFrom = useMemo(() => {
    if (dateRange === "all") return null;
    const monthsBack = { "1m": 0, "3m": 2, "6m": 5, "1y": 11, "5y": 59 }[dateRange] ?? 5;
    return startOfMonth(subMonths(new Date(), monthsBack));
  }, [dateRange]);

  // Safe filtered loads
  const filteredLoads = useMemo(() => {
    if (!dateFrom) return loads;
    return loads.filter(l => {
      if (!l.loading_date) return false;
      try { const d = parseISO(l.loading_date); return isValid(d) && d >= dateFrom; }
      catch { return false; }
    });
  }, [loads, dateFrom]);

  // Safe filtered trips
  const filteredTrips = useMemo(() => {
    if (!dateFrom) return trips;
    return trips.filter(t => {
      if (!t.trip_date) return false;
      try { const d = parseISO(t.trip_date); return isValid(d) && d >= dateFrom; }
      catch { return false; }
    });
  }, [trips, dateFrom]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const numMonths = { "1m":1,"3m":3,"6m":6,"1y":12,"5y":60,"all":24 }[dateRange] || 6;
    return Array.from({ length: numMonths }, (_, i) => {
      const d = subMonths(new Date(), numMonths - 1 - i);
      const key   = format(d, "yyyy-MM");
      const label = format(d, "MMM yy");
      const mLoads = loads.filter(l => l.loading_date?.startsWith(key));
      const mTrips = trips.filter(t => t.trip_date?.startsWith(key));
      const revenue = mLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
      const tons    = mLoads.reduce((s, l) => s + (l.weight_tons    || 0), 0);
      return { label, loads: mLoads.length, revenue, tons: Math.round(tons * 10) / 10, trips: mTrips.length };
    });
  }, [loads, trips, dateRange]);

  // Vehicle performance
  const vehiclePerf = useMemo(() =>
    fleet.map(v => {
      const vTrips = filteredTrips.filter(t => t.vehicle_number === v.vehicle_number);
      const vLoads = filteredLoads.filter(l => l.vehicle_number === v.vehicle_number);
      return {
        name: v.vehicle_number,
        trips: vTrips.length,
        revenue: vLoads.reduce((s, l) => s + (l.freight_amount || 0), 0),
      };
    }).filter(v => v.trips > 0 || v.revenue > 0).slice(0, 8),
  [fleet, filteredTrips, filteredLoads]);

  // Stats
  const stats = useMemo(() => ({
    activeLoads:     filteredLoads.filter(l => ["booked","loading","in_transit"].includes(l.status)),
    totalRevenue:    filteredLoads.reduce((s, l) => s + (l.freight_amount || 0), 0),
    totalTons:       filteredLoads.reduce((s, l) => s + (l.weight_tons    || 0), 0),
    totalDispatched: filteredLoads.filter(l => ["in_transit","delivered","completed"].includes(l.status)).length,
    paidInvoices:    invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount   || 0), 0),
    pendingPayments: invoices.filter(i => ["sent","partial","overdue"].includes(i.status))
                             .reduce((s, i) => s + (i.balance_amount || 0), 0),
  }), [filteredLoads, invoices]);

  const myVehicle = isDriver && user?.assigned_vehicle_id
    ? fleet.find(v => v.id === user.assigned_vehicle_id) : null;
  const myTrips = isDriver
    ? trips.filter(t => t.vehicle_number === user?.assigned_vehicle_number) : [];

  const roleLabel = {
    admin:"Administrator", management:"Management", operations:"Operations",
    accounting:"Accounting", fleet_manager:"Fleet Manager", driver:"Driver",
    supervisor:"Supervisor", labour_supervisor:"Labour Supervisor",
    sleeping_partner:"Sleeping Partner",
  }[role] || (role || "").replace(/_/g, " ");

  const DATE_OPTIONS = [
    {v:"1m",l:"1M"},{v:"3m",l:"3M"},{v:"6m",l:"6M"},
    {v:"1y",l:"1Y"},{v:"5y",l:"5Y"},{v:"all",l:"All"},
  ];

  // ── Guard: wait for role to load ────────────────────────────────────────────
  if (roleLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  );

  // ── New user (role=user / pending) — waiting for admin to assign role ───
  if (isPendingUser) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-sm border border-slate-100">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-2">Account Pending</h2>
        <p className="text-sm text-slate-400 mb-2">Your account is registered but not yet activated.</p>
        <p className="text-sm text-slate-400 mb-6">Please contact your administrator to assign your role and activate your access.</p>
        <p className="text-xs text-slate-300 mb-4">Logged in as: <span className="font-semibold text-slate-500">{user?.email}</span></p>
        <button onClick={() => base44.auth.logout()} className="text-xs text-red-400 hover:text-red-600 font-medium flex items-center gap-1.5 mx-auto">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>
    </div>
  );

  // ── Client portal ─────────────────────────────────────────────────────────
  // Never show portal to staff roles even if isClient flag is somehow true
  if (isClient && !STAFF_ROLES.includes(user?.role)) return <ClientPortal user={user} />;

  // ── Labour supervisor only dashboard ──────────────────────────────────────
  if (isPureLabourSupervisor) return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-amber-600 to-amber-800 px-6 pt-12 pb-10 text-white">
        <p className="text-amber-100 text-base">Welcome back</p>
        <h1 className="text-3xl font-bold mt-1">{user?.full_name || "Labour Supervisor"}</h1>
        <p className="text-amber-200 mt-2">Your labour management dashboard</p>
      </div>
      <div className="px-6 pt-10 grid gap-6 sm:grid-cols-3">
        <Link to={createPageUrl("LabourEntry")} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-amber-200 overflow-hidden flex flex-col">
          <div className="bg-amber-50 p-10 flex justify-center"><HardHat size={56} className="text-amber-600" /></div>
          <div className="p-6 text-center"><h2 className="text-xl font-bold text-slate-800 mb-2">Labour Entries</h2><p className="text-slate-600">Add and view your daily labour records</p></div>
        </Link>
        <Link to={createPageUrl("LabourAnalytics")} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-indigo-200 overflow-hidden flex flex-col">
          <div className="bg-indigo-50 p-10 flex justify-center"><BarChart2 size={56} className="text-indigo-600" /></div>
          <div className="p-6 text-center"><h2 className="text-xl font-bold text-slate-800 mb-2">Labour Analytics</h2><p className="text-slate-600">Your earnings overview & trends</p></div>
        </Link>
        <Link to={createPageUrl("LabourLedger")} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-green-200 overflow-hidden flex flex-col">
          <div className="bg-green-50 p-10 flex justify-center"><BookCheck size={56} className="text-green-600" /></div>
          <div className="p-6 text-center"><h2 className="text-xl font-bold text-slate-800 mb-2">Labour Ledger</h2><p className="text-slate-600">View your labour payment records</p></div>
        </Link>
      </div>
      <p className="text-center text-slate-500 mt-12 px-6 text-sm">
        This dashboard is dedicated to Labour Supervisor role.<br />Only labour-related features are available.
      </p>
    </div>
  );

  const dashBg    = isDark ? "#060b14" : "#f1f5f9";
  const cardBg    = isDark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const cardBorder= isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const textMain  = isDark ? "#f1f5f9" : "#0f172a";
  const chartGrid = isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9";
  const headerGrad= isDark
    ? "linear-gradient(135deg,#0a0f1e,#0d1a2e)"
    : `linear-gradient(135deg,#1e3a5f,${palette.primary})`;

  // ── Full dashboard ────────────────────────────────────────────────────────
  return (
    <div className="pb-24" style={{ background: dashBg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: headerGrad }} className="px-4 pt-8 pb-6">
        {companyProfile?.logo_url && (
          <div className="flex items-center gap-3 mb-4">
            <img src={companyProfile.logo_url} alt="Company Logo" className="h-20 w-auto bg-white/90 rounded-xl p-1.5 shadow-lg" />
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">{companyProfile.company_name}</h2>
              {companyProfile.address && <p className="text-blue-200 text-xs">{companyProfile.address}</p>}
            </div>
          </div>
        )}
        <p className="text-blue-200 text-sm">Welcome back,</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">
          {user?.full_name || "User"}
          <span className="ml-2 text-sm font-medium text-blue-300 capitalize">({roleLabel})</span>
        </h1>
        <div className="mt-4 flex items-center gap-3">
          {isAdmin && (
            <Link to={createPageUrl("AdminPanel")} className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors rounded-xl px-4 py-2.5">
              <Shield className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-semibold">Admin Panel</span>
            </Link>
          )}
          <GlobalSearch />
        </div>
      </div>

      {/* Driver dashboard */}
      {isDriver && (
        <div className="px-4 pt-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-400 mb-2">MY VEHICLE</p>
            {myVehicle ? (
              <div>
                <p className="text-lg font-bold text-slate-900">{myVehicle.vehicle_number}</p>
                <p className="text-sm text-slate-500">{myVehicle.make_model || myVehicle.vehicle_type}</p>
                <span className={`mt-2 inline-block text-xs px-2 py-1 rounded-full font-medium ${myVehicle.status === "available" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {myVehicle.status?.replace(/_/g, " ")}
                </span>
              </div>
            ) : <p className="text-sm text-slate-400">No vehicle assigned. Contact your fleet manager.</p>}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">My Recent Trips</p>
            {myTrips.slice(0, 5).map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-100 p-3 mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.origin} → {t.destination}</p>
                    <p className="text-xs text-slate-400">{t.trip_date} · {t.client_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main dashboard (non-driver) */}
      {!isDriver && (
        <>
          {/* Date range filter */}
          <div className="px-4 pt-4 pb-1">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {DATE_OPTIONS.map(o => (
                <button
                  key={o.v}
                  onClick={() => setDateRange(o.v)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${dateRange === o.v ? "bg-white shadow text-blue-700" : "text-slate-500"}`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Stat cards — 4 per row on tablet+, 2 per row on mobile */}
          <div className="px-4 mt-4 mb-3">
            {/* Row 1: always 4 cards */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-2">
              {!isFleetManager ? (
                <>
                  <StatCard title="Active" value={stats.activeLoads.length} icon={Package} color="blue"
                    subtitle={`${filteredLoads.length} total`} onClick={() => window.location.href = createPageUrl("Loads")} />
                  <StatCard title="Dispatched" value={stats.totalDispatched} icon={Route} color="green"
                    subtitle="In transit" onClick={() => window.location.href = createPageUrl("Loads")} />
                  {!isSupervisor ? (
                    <StatCard title="Revenue" value={fmtK(stats.totalRevenue)} icon={TrendingUp} color="indigo"
                      subtitle="Billed" onClick={() => window.location.href = createPageUrl("Loads")} />
                  ) : (
                    <StatCard title="Fleet" value={fleet.length} icon={Truck} color="green"
                      subtitle="Vehicles" onClick={() => window.location.href = createPageUrl("Fleet")} />
                  )}
                  <StatCard title="Tons" value={`${Math.round(stats.totalTons)}T`} icon={Weight} color="purple" subtitle="Moved" />
                </>
              ) : (
                <>
                  <StatCard title="Fleet" value={fleet.length} icon={Truck} color="green"
                    subtitle="Vehicles" onClick={() => window.location.href = createPageUrl("Fleet")} />
                  <StatCard title="Trips" value={filteredTrips.length} icon={Route} color="blue" subtitle="This period" />
                  {canSeeAccounting && (
                    <StatCard title="Revenue" value={fmtK(stats.paidInvoices)} icon={TrendingUp} color="indigo"
                      subtitle="Paid invoices" onClick={() => window.location.href = createPageUrl("Accounting")} />
                  )}
                  <StatCard title="Pending" value={fmtK(stats.pendingPayments)} icon={AlertTriangle} color="amber"
                    subtitle="Unpaid" onClick={() => window.location.href = createPageUrl("Accounting")} />
                </>
              )}
            </div>
            {/* Row 2: up to 3 cards equally spread */}
            {!isFleetManager && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <StatCard title="Fleet" value={fleet.length} icon={Truck} color="green"
                  subtitle="Vehicles" onClick={() => window.location.href = createPageUrl("Fleet")} />
                {canSeeAccounting ? (
                  <>
                    <StatCard title="Invoice Rev" value={fmtK(stats.paidInvoices)} icon={TrendingUp} color="indigo"
                      subtitle="Paid invoices" onClick={() => window.location.href = createPageUrl("Accounting")} />
                    <StatCard title="Pending" value={fmtK(stats.pendingPayments)} icon={AlertTriangle} color="amber"
                      subtitle="Unpaid" onClick={() => window.location.href = createPageUrl("Accounting")} />
                  </>
                ) : (
                  <>
                    <StatCard title="Clients" value={clients.length} icon={Users} color="purple"
                      onClick={() => window.location.href = createPageUrl("Clients")} />
                    <StatCard title="Total Loads" value={filteredLoads.length} icon={Package} color="blue"
                      subtitle="All statuses" onClick={() => window.location.href = createPageUrl("Loads")} />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Charts — admin, management, sleeping partner only */}
          {(isAdmin || isManagement || isSleepingPartner) && (
            <div className="px-4 space-y-4 mb-4">
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}` }} className="rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 style={{ color: textMain }} className="text-sm font-bold">📦 Monthly Loads</h3>
                  <BarChart2 className="w-4 h-4 text-slate-300" />
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="label" tick={{fontSize:10}} />
                    <YAxis tick={{fontSize:10}} />
                    <Tooltip formatter={(val, name) => [name === "revenue" ? `₨${val.toLocaleString()}` : val, name === "revenue" ? "Revenue" : "Loads"]} />
                    <Bar dataKey="loads" fill="#3b82f6" radius={[4,4,0,0]} name="Loads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}` }} className="rounded-2xl p-4">
                <h3 style={{ color: textMain }} className="text-sm font-bold mb-3">💰 Monthly Revenue</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={palette.primary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={palette.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="label" tick={{fontSize:10}} />
                    <YAxis tick={{fontSize:10}} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={val => [`₨${val.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="url(#colorRev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}` }} className="rounded-2xl p-4">
                <h3 style={{ color: textMain }} className="text-sm font-bold mb-3">⚖️ Monthly Tons Dispatched</h3>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="label" tick={{fontSize:10}} />
                    <YAxis tick={{fontSize:10}} />
                    <Tooltip formatter={val => [`${val} T`, "Tons"]} />
                    <Bar dataKey="tons" fill="#8b5cf6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {vehiclePerf.length > 0 && (
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}` }} className="rounded-2xl p-4">
                  <h3 style={{ color: textMain }} className="text-sm font-bold mb-3">🚛 Vehicle Performance</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={vehiclePerf} layout="vertical" margin={{top:0,right:10,left:10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis type="number" tick={{fontSize:10}} />
                      <YAxis dataKey="name" type="category" tick={{fontSize:9}} width={60} />
                      <Tooltip />
                      <Bar dataKey="trips" fill="#22c55e" radius={[0,4,4,0]} name="Trips" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Advanced Analytics Widgets — admin, management, sleeping partner */}
          {(isAdmin || isManagement || isSleepingPartner) && (
            <div className="px-4 mb-4">
              <h2 style={{ color: textMain }} className="text-base font-bold mb-3">🔍 Advanced Analytics</h2>
              <AdvancedAnalyticsWidgets isDark={isDark} />
            </div>
          )}

          {/* Recent Loads */}
          {!isFleetManager && (
            <div className="px-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 style={{ color: textMain }} className="text-base font-bold">Recent Loads</h2>
                <Link to={createPageUrl("Loads")} className="flex items-center text-sm text-blue-600 font-medium">
                  View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
              <div className="space-y-2.5">
                {loadsLoading
                  ? Array(3).fill(0).map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48 mb-2" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))
                  : loads.slice(0, 5).map(load => {
                      let formattedDate = "";
                      if (load.loading_date) {
                        try {
                          const d = parseISO(load.loading_date);
                          if (isValid(d)) formattedDate = format(d, "dd MMM");
                        } catch {}
                      }
                      return (
                        <Link
                          key={load.id}
                          to={createPageUrl(`LoadDetail?id=${load.id}`)}
                          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                          className="block rounded-2xl p-4 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-bold text-slate-900">#{load.load_number}</p>
                                <StatusBadge status={load.status} />
                                {load.payment_type && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${load.payment_type === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                    {load.payment_type === "paid" ? "PAID" : "TO PAY"}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">{load.origin} → {load.destination}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {load.client_name}{formattedDate ? ` • ${formattedDate}` : ""}
                              </p>
                            </div>
                            {canSeeFreightRates && load.freight_amount > 0 && !(isSupervisor && load.payment_type === "paid") && (
                              <p className="text-sm font-bold text-slate-700 ml-3">{fmt(load.freight_amount)}</p>
                            )}
                          </div>
                        </Link>
                      );
                    })
                }
              </div>
            </div>
          )}

          {/* Recent Trips (fleet manager) */}
          {isFleetManager && (
            <div className="px-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900">Recent Trips</h2>
                <Link to={createPageUrl("FleetTrips")} className="flex items-center text-sm text-blue-600 font-medium">
                  View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
              {trips.slice(0, 5).map(t => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-100 p-3 mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{t.vehicle_number}</p>
                      <p className="text-xs text-slate-500">{t.origin} → {t.destination}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="px-4 mt-2">
            <h2 style={{ color: textMain }} className="text-base font-bold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-4 gap-2">
              {isSupervisor ? (
                <Link to={createPageUrl("Loads")} style={{ background: cardBg, border: `1px solid ${cardBorder}` }} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Package className="w-4 h-4" /></div>
                  <span className="text-xs font-medium text-slate-600">Loads</span>
                </Link>
              ) : canAddLoad && (
                <Link to={createPageUrl("Loads")} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-100">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Package className="w-4 h-4" /></div>
                  <span className="text-xs font-medium text-slate-600">New Load</span>
                </Link>
              )}
              {(isAdmin || isManagement || role === "operations") && (
                <Link to={createPageUrl("Clients")} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-100">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><Users className="w-4 h-4" /></div>
                  <span className="text-xs font-medium text-slate-600">Clients</span>
                </Link>
              )}
              {(isAdmin || isFleetManager) && (
                <Link to={createPageUrl("Fleet")} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-100">
                  <div className="p-2.5 rounded-xl bg-green-50 text-green-600"><Truck className="w-4 h-4" /></div>
                  <span className="text-xs font-medium text-slate-600">Fleet</span>
                </Link>
              )}
              {canSeeAccounting && (
                <Link to={createPageUrl("Accounting")} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-100">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><FileText className="w-4 h-4" /></div>
                  <span className="text-xs font-medium text-slate-600">Accounting</span>
                </Link>
              )}
              {isFleetManager && (
                <Link to={createPageUrl("FleetTrips")} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-100">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Route className="w-4 h-4" /></div>
                  <span className="text-xs font-medium text-slate-600">Trips</span>
                </Link>
              )}
              {(isAdmin || role === "operations" || isManagement) && settings?.code === "pakistan" && (
                <Link to={createPageUrl("TripCostCalculator")} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-100">
                  <div className="p-2.5 rounded-xl bg-green-50 text-green-600"><Calculator className="w-4 h-4" /></div>
                  <span className="text-xs font-medium text-slate-600">Cost Calc</span>
                </Link>
              )}
              {(isAdmin || role === "operations" || isManagement || isFleetManager) && ["usa","eu","gb"].includes(settings?.code) && (
                <Link to={createPageUrl("RoutePlanner")} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-100">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700"><Navigation className="w-4 h-4" /></div>
                  <span className="text-xs font-medium text-slate-600">Routes</span>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}