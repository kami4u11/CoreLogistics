import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAppSettings } from "@/components/AppSettings";
import { format, subMonths, startOfMonth, parseISO, isValid, differenceInDays } from "date-fns";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Truck, Package, DollarSign, AlertTriangle, Target, Activity } from "lucide-react";

const C = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

function Card({ title, children, style = {} }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 16, ...style }}>
      {title && <p style={{ fontSize: 12, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>{title}</p>}
      {children}
    </div>
  );
}

function KpiChip({ label, value, prev, icon: Icon, color = "#6366f1" }) {
  const trend = prev > 0 ? ((value - prev) / prev) * 100 : 0;
  const up = trend >= 0;
  return (
    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0 }}>{value}</p>
      </div>
      {prev > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, color: up ? "#10b981" : "#ef4444", fontSize: 10, fontWeight: 700 }}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export default function AdvancedAnalyticsWidgets({ isDark }) {
  const { fmt, fmtK } = useAppSettings();

  const { data: loads = [] }    = useQuery({ queryKey: ["loads"],       queryFn: () => base44.entities.Load.list("-created_date", 500) });
  const { data: fleet = [] }    = useQuery({ queryKey: ["fleet"],       queryFn: () => base44.entities.FleetVehicle.list() });
  const { data: trips = [] }    = useQuery({ queryKey: ["fleetTrips"],  queryFn: () => base44.entities.FleetTrip.list("-trip_date", 300) });
  const { data: expenses = [] } = useQuery({ queryKey: ["fleetExpenses"], queryFn: () => base44.entities.FleetExpense.list("-expense_date", 300).catch(() => []) });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"],    queryFn: () => base44.entities.Invoice.list("-created_date", 200).catch(() => []) });
  const { data: docs = [] }     = useQuery({ queryKey: ["fleetDocs"],   queryFn: () => base44.entities.FleetDocument.list().catch(() => []) });

  const now  = format(new Date(), "yyyy-MM");
  const prev = format(subMonths(new Date(), 1), "yyyy-MM");

  // This month vs last month loads
  const thisMonthLoads  = useMemo(() => loads.filter(l => l.loading_date?.startsWith(now)), [loads, now]);
  const prevMonthLoads  = useMemo(() => loads.filter(l => l.loading_date?.startsWith(prev)), [loads, prev]);
  const thisMonthRev    = thisMonthLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
  const prevMonthRev    = prevMonthLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
  const thisMonthTrips  = trips.filter(t => t.trip_date?.startsWith(now));
  const prevMonthTrips  = trips.filter(t => t.trip_date?.startsWith(prev));

  // Monthly stacked revenue vs cost (6m)
  const stackedData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const m    = format(subMonths(new Date(), 5 - i), "yyyy-MM");
    const mLbl = format(subMonths(new Date(), 5 - i), "MMM");
    const mLoads   = loads.filter(l => l.loading_date?.startsWith(m));
    const mTrips   = trips.filter(t => t.trip_date?.startsWith(m));
    const mExp     = expenses.filter(e => e.expense_date?.startsWith(m));
    const revenue  = mLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
    const tripCost = mTrips.reduce((s, t) => s + (t.total_trip_expense || 0), 0);
    const addlCost = mExp.reduce((s, e) => s + (e.amount_pkr || 0), 0);
    return { month: mLbl, Revenue: Math.round(revenue / 1000), Cost: Math.round((tripCost + addlCost) / 1000), Profit: Math.round((revenue - tripCost - addlCost) / 1000) };
  }), [loads, trips, expenses]);

  // Load status distribution
  const statusPie = useMemo(() => {
    const agg = {};
    loads.forEach(l => { const s = l.status || "unknown"; agg[s] = (agg[s] || 0) + 1; });
    return Object.entries(agg).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [loads]);

  // Fleet health radar
  const activeVehicles  = fleet.filter(v => ["available","active"].includes(v.status)).length;
  const completedTrips  = trips.filter(t => t.status === "completed").length;
  const paidInvoices    = invoices.filter(i => i.status === "paid").length;
  const today           = new Date();
  const expiredDocs     = docs.filter(d => d.expiry_date && new Date(d.expiry_date) < today).length;
  const radarData = [
    { subject: "Fleet Active", A: fleet.length ? Math.round((activeVehicles / fleet.length) * 100) : 0 },
    { subject: "Trip Completion", A: trips.length ? Math.round((completedTrips / trips.length) * 100) : 0 },
    { subject: "Invoice Recovery", A: invoices.length ? Math.round((paidInvoices / invoices.length) * 100) : 0 },
    { subject: "Doc Compliance", A: docs.length ? Math.round(((docs.length - expiredDocs) / docs.length) * 100) : 100 },
    { subject: "Load Delivery", A: loads.length ? Math.round((loads.filter(l => ["delivered","completed","payment_received"].includes(l.status)).length / loads.length) * 100) : 0 },
  ];

  // Top clients by revenue
  const topClients = useMemo(() => {
    const agg = {};
    loads.forEach(l => { if (l.client_name) agg[l.client_name] = (agg[l.client_name] || 0) + (l.freight_amount || 0); });
    return Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, rev]) => ({ name, rev }));
  }, [loads]);

  // Document expiry alerts
  const urgentDocs = useMemo(() => docs.filter(d => {
    if (!d.expiry_date) return false;
    const diff = differenceInDays(new Date(d.expiry_date), today);
    return diff >= 0 && diff <= 30;
  }).slice(0, 5), [docs]);

  const expiredDocsList = useMemo(() => docs.filter(d => d.expiry_date && new Date(d.expiry_date) < today).slice(0, 3), [docs]);

  const cardBg    = isDark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const cardBorder= isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const textMain  = isDark ? "#f1f5f9" : "#1e293b";
  const textMuted = isDark ? "#64748b" : "#94a3b8";
  const bg2       = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc";
  const chartGridColor = isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── KPI Chips row ─────────────────────────────────────────────── */}
      <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, padding: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: textMain, marginBottom: 10 }}>📊 This Month vs Last Month</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <KpiChip label="Loads" value={thisMonthLoads.length} prev={prevMonthLoads.length} icon={Package} color="#3b82f6" />
          <KpiChip label="Revenue" value={fmtK(thisMonthRev)} prev={prevMonthRev} icon={DollarSign} color="#10b981" />
          <KpiChip label="Trips" value={thisMonthTrips.length} prev={prevMonthTrips.length} icon={Truck} color="#8b5cf6" />
          <KpiChip label="Active Fleet" value={activeVehicles} prev={0} icon={Activity} color="#f59e0b" />
        </div>
      </div>

      {/* ── Revenue vs Cost Stacked Bar ───────────────────────────────── */}
      <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, padding: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: textMain, marginBottom: 10 }}>💰 Revenue vs Cost (6M · PKR K)</p>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={stackedData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: textMuted }} />
            <YAxis tick={{ fontSize: 10, fill: textMuted }} />
            <Tooltip formatter={(v, n) => [`${v}K`, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Revenue" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
            <Bar dataKey="Cost"    stackId="b" fill="#ef4444" radius={[0,0,0,0]} />
            <Bar dataKey="Profit"  fill="#6366f1" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Ops Health Radar + Load Status Pie ───────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: textMain, marginBottom: 8 }}>🎯 Ops Health</p>
          <ResponsiveContainer width="100%" height={160}>
            <RadarChart data={radarData} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
              <PolarGrid stroke={chartGridColor} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: textMuted }} />
              <PolarRadiusAxis angle={30} domain={[0,100]} tick={false} axisLine={false} />
              <Radar dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip formatter={v => [`${v}%`]} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: textMain, marginBottom: 8 }}>📦 Load Status</p>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" innerRadius={28} outerRadius={45} dataKey="value">
                {statusPie.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
            {statusPie.slice(0, 4).map((s, i) => (
              <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: C[i % C.length], display: "block" }} />
                  <span style={{ fontSize: 10, color: textMuted, textTransform: "capitalize" }}>{s.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: textMain }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Clients ───────────────────────────────────────────────── */}
      {topClients.length > 0 && (
        <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: textMain, marginBottom: 10 }}>🏆 Top Clients by Revenue</p>
          {topClients.map((c, i) => {
            const pct = topClients[0].rev > 0 ? (c.rev / topClients[0].rev) * 100 : 0;
            return (
              <div key={c.name} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: textMain }}>{i + 1}. {c.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>{fmtK(c.rev)}</span>
                </div>
                <div style={{ height: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: 99 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: C[i % C.length], borderRadius: 99, transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Document Alerts ───────────────────────────────────────────── */}
      {(urgentDocs.length > 0 || expiredDocsList.length > 0) && (
        <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: textMain, marginBottom: 10 }}>⚠️ Document Alerts</p>
          {expiredDocsList.map(d => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fef2f2", borderRadius: 8, marginBottom: 5 }}>
              <AlertTriangle size={13} color="#ef4444" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", margin: 0 }}>{d.vehicle_number} — {d.document_type}</p>
                <p style={{ fontSize: 10, color: "#ef4444", margin: 0 }}>Expired: {d.expiry_date}</p>
              </div>
            </div>
          ))}
          {urgentDocs.map(d => {
            const diff = differenceInDays(new Date(d.expiry_date), today);
            return (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fffbeb", borderRadius: 8, marginBottom: 5 }}>
                <AlertTriangle size={13} color="#f59e0b" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#d97706", margin: 0 }}>{d.vehicle_number} — {d.document_type}</p>
                  <p style={{ fontSize: 10, color: "#f59e0b", margin: 0 }}>Expires in {diff} days ({d.expiry_date})</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}