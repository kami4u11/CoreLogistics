import React, { useState, useMemo } from "react";
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { useAppSettings } from "@/components/AppSettings";
import { TrendingUp, TrendingDown, Fuel, DollarSign, BarChart2, Truck, Users, Download, Printer } from "lucide-react";
import { printTable as printColorTable } from "@/utils/printUtils";

const C = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

const Card = ({ children, style={} }) => (
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:20, ...style }}>
    {children}
  </div>
);

const KpiTile = ({ label, value, sub, color, icon: Icon, trend }) => (
  <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0", padding:"16px 18px", display:"flex", flexDirection:"column", gap:8 }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <span style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
      <div style={{ width:32, height:32, borderRadius:10, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={15} color={color} />
      </div>
    </div>
    <p style={{ fontSize:22, fontWeight:800, color:"#0f172a", margin:0 }}>{value}</p>
    {sub && <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{sub}</p>}
    {trend !== undefined && (
      <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color: trend >= 0 ? "#059669" : "#dc2626" }}>
        {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
        {Math.abs(trend).toFixed(1)}% vs prev month
      </div>
    )}
  </div>
);

const customTooltip = (fmt) => ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:12, boxShadow:"0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ fontWeight:700, color:"#1e293b", marginBottom:4 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color:p.color, margin:"2px 0" }}>{p.name}: {typeof p.value === "number" ? fmt(p.value) : p.value}</p>)}
    </div>
  );
};

export default function FleetTripsAnalytics({ trips, fleetVehicles }) {
  const { fmt } = useAppSettings();

  const [reportDateFrom, setReportDateFrom] = useState(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
  const [reportDateTo,   setReportDateTo]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportVehicle,  setReportVehicle]  = useState("");
  const [reportDriver,   setReportDriver]   = useState("");

  // ── Derived analytics ────────────────────────────────────────────────────
  const completedTrips = useMemo(() => trips.filter(t => t.status === "completed"), [trips]);

  const avgTripRevenue  = completedTrips.length ? completedTrips.reduce((s,t) => s + (t.total_revenue||t.freight_income_pkr||0), 0) / completedTrips.length : 0;
  const avgTripExpense  = completedTrips.length ? completedTrips.reduce((s,t) => s + (t.total_trip_expense||0), 0) / completedTrips.length : 0;
  const avgTripProfit   = avgTripRevenue - avgTripExpense;
  const avgFuelCost     = completedTrips.length ? completedTrips.reduce((s,t) => s + (t.fuel_cost||0), 0) / completedTrips.length : 0;
  const profitMarginPct = avgTripRevenue > 0 ? (avgTripProfit / avgTripRevenue) * 100 : 0;

  // This month vs prev month trend
  const now  = format(new Date(), "yyyy-MM");
  const prev = format(subMonths(new Date(), 1), "yyyy-MM");
  const thisMonthRev = trips.filter(t => (t.trip_date||"").slice(0,7) === now).reduce((s,t) => s+(t.total_revenue||t.freight_income_pkr||0), 0);
  const prevMonthRev = trips.filter(t => (t.trip_date||"").slice(0,7) === prev).reduce((s,t) => s+(t.total_revenue||t.freight_income_pkr||0), 0);
  const revTrend = prevMonthRev > 0 ? ((thisMonthRev - prevMonthRev) / prevMonthRev) * 100 : 0;

  // ── Monthly trend (12m) ───────────────────────────────────────────────────
  const months12 = useMemo(() => Array.from({ length:12 }, (_,i) => {
    const m = format(subMonths(new Date(), 11-i), "yyyy-MM");
    const mT = trips.filter(t => (t.trip_date||"").slice(0,7) === m);
    const rev = mT.reduce((s,t) => s+(t.total_revenue||t.freight_income_pkr||0), 0);
    const exp = mT.reduce((s,t) => s+(t.total_trip_expense||0), 0);
    return { month: m.slice(5), revenue: rev, expense: exp, profit: rev-exp, count: mT.length };
  }), [trips]);

  // ── Expense breakdown (pie) ───────────────────────────────────────────────
  const expBreakdown = useMemo(() => {
    const agg = {
      Fuel:       completedTrips.reduce((s,t) => s+(t.fuel_cost||0), 0),
      Driver:     completedTrips.reduce((s,t) => s+(t.driver_allowance||0), 0),
      Toll:       completedTrips.reduce((s,t) => s+(t.toll_charges||0), 0),
      Loading:    completedTrips.reduce((s,t) => s+(t.loading_expense||0)+(t.unloading_expense||0), 0),
      Broker:     completedTrips.reduce((s,t) => s+(t.broker_commission||0), 0),
      Repair:     completedTrips.reduce((s,t) => s+(t.repair_on_road||0), 0),
      Other:      completedTrips.reduce((s,t) => s+(t.other_expense||0), 0),
    };
    return Object.entries(agg).filter(([,v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [completedTrips]);

  // ── Per-driver analytics ──────────────────────────────────────────────────
  const driverStats = useMemo(() => {
    const map = {};
    trips.forEach(t => {
      const d = t.driver_name || "Unknown";
      if (!map[d]) map[d] = { driver: d, trips: 0, revenue: 0, expense: 0 };
      map[d].trips++;
      map[d].revenue  += t.total_revenue||t.freight_income_pkr||0;
      map[d].expense  += t.total_trip_expense||0;
    });
    return Object.values(map)
      .map(d => ({ ...d, net: d.revenue - d.expense, avg: d.trips > 0 ? (d.revenue - d.expense) / d.trips : 0 }))
      .sort((a,b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [trips]);

  // ── Route analytics ───────────────────────────────────────────────────────
  const routeStats = useMemo(() => {
    const map = {};
    trips.forEach(t => {
      const key = `${t.origin||"?"} → ${t.destination||"?"}`;
      if (!map[key]) map[key] = { route: key, trips: 0, revenue: 0, expense: 0 };
      map[key].trips++;
      map[key].revenue += t.total_revenue||t.freight_income_pkr||0;
      map[key].expense += t.total_trip_expense||0;
    });
    return Object.values(map)
      .map(r => ({ ...r, net: r.revenue - r.expense, avgRevenue: r.trips > 0 ? r.revenue / r.trips : 0 }))
      .sort((a,b) => b.trips - a.trips)
      .slice(0, 8);
  }, [trips]);

  // ── Filtered report data ──────────────────────────────────────────────────
  const reportData = useMemo(() => {
    return trips.filter(t => {
      const d = t.trip_date || "";
      const inRange   = d >= reportDateFrom && d <= reportDateTo;
      const inVehicle = !reportVehicle || t.vehicle_number === reportVehicle;
      const inDriver  = !reportDriver  || (t.driver_name||"").toLowerCase().includes(reportDriver.toLowerCase());
      return inRange && inVehicle && inDriver;
    });
  }, [trips, reportDateFrom, reportDateTo, reportVehicle, reportDriver]);

  const reportTotals = useMemo(() => ({
    trips:   reportData.length,
    revenue: reportData.reduce((s,t) => s+(t.total_revenue||t.freight_income_pkr||0), 0),
    expense: reportData.reduce((s,t) => s+(t.total_trip_expense||0), 0),
    net:     reportData.reduce((s,t) => s+(t.trip_net_profit||0), 0),
    fuel:    reportData.reduce((s,t) => s+(t.fuel_cost||0), 0),
  }), [reportData]);

  const drivers = useMemo(() => [...new Set(trips.map(t => t.driver_name).filter(Boolean))].sort(), [trips]);

  const printReport = () => {
    printColorTable(
      `Fleet Trips Report: ${reportDateFrom} to ${reportDateTo}`,
      ["Date","Vehicle","Driver","Route","Revenue","Expense","Net","Status"],
      reportData.map(t => [
        t.trip_date, t.vehicle_number||"—", t.driver_name||"—",
        `${t.origin||""}→${t.destination||""}`,
        fmt(t.total_revenue||t.freight_income_pkr||0),
        fmt(t.total_trip_expense||0),
        fmt(t.trip_net_profit||0),
        t.status
      ]),
      {
        subtitle: `${reportData.length} trips · Vehicle: ${reportVehicle||"All"} · Driver: ${reportDriver||"All"}`,
        summary: [
          { label:"Total Revenue", value: fmt(reportTotals.revenue) },
          { label:"Total Expense", value: fmt(reportTotals.expense) },
          { label:"Net Profit",    value: fmt(reportTotals.net)     },
          { label:"Fuel Cost",     value: fmt(reportTotals.fuel)    },
        ]
      }
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── KPI Tiles ─────────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
        <KpiTile label="Avg Trip Revenue"  value={fmt(avgTripRevenue)}  color="#10b981" icon={DollarSign} sub={`${completedTrips.length} completed trips`} trend={revTrend}/>
        <KpiTile label="Avg Trip Expense"  value={fmt(avgTripExpense)}  color="#ef4444" icon={BarChart2}  sub="Per completed trip"/>
        <KpiTile label="Avg Trip Profit"   value={fmt(avgTripProfit)}   color={avgTripProfit>=0?"#059669":"#dc2626"} icon={TrendingUp} sub={`${profitMarginPct.toFixed(1)}% margin`}/>
        <KpiTile label="Avg Fuel / Trip"   value={fmt(avgFuelCost)}     color="#f59e0b" icon={Fuel}       sub={`${expBreakdown.find(e=>e.name==="Fuel")? ((expBreakdown.find(e=>e.name==="Fuel").value / (completedTrips.reduce((s,t)=>s+(t.total_trip_expense||0),0)||1))*100).toFixed(0) : 0}% of expenses`}/>
        <KpiTile label="Profit Margin"     value={`${profitMarginPct.toFixed(1)}%`}  color="#8b5cf6" icon={TrendingUp} sub="On completed trips"/>
        <KpiTile label="Unique Drivers"    value={drivers.length}       color="#06b6d4" icon={Users}       sub={`${fleetVehicles.length} fleet vehicles`}/>
      </div>

      {/* ── Revenue & Profit Trend (12m) ──────────────────────────────── */}
      <Card>
        <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:14 }}>Revenue & Profit Trend — 12 Months</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={months12} margin={{ top:0, right:0, left:-10, bottom:0 }}>
            <defs>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="month" tick={{ fontSize:10 }}/>
            <YAxis tick={{ fontSize:10 }} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
            <Tooltip content={customTooltip(fmt)}/>
            <Legend wrapperStyle={{ fontSize:11 }}/>
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="url(#gradRev)" strokeWidth={2}/>
            <Area type="monotone" dataKey="profit"  name="Net Profit" stroke="#3b82f6" fill="url(#gradProfit)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Expense Breakdown + Trip Count ────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card>
          <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:14 }}>Expense Breakdown (Completed Trips)</p>
          {expBreakdown.length === 0 ? (
            <p style={{ color:"#94a3b8", fontSize:12, textAlign:"center", padding:"20px 0" }}>No expense data</p>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <ResponsiveContainer width="55%" height={160}>
                <PieChart>
                  <Pie data={expBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value">
                    {expBreakdown.map((_,i) => <Cell key={i} fill={C[i%C.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {expBreakdown.map((e,i) => (
                  <div key={e.name} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid #f8fafc" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:8, height:8, borderRadius:"50%", background:C[i%C.length], display:"block" }}/>
                      <span style={{ fontSize:11, color:"#64748b" }}>{e.name}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:"#1e293b" }}>{fmt(e.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:14 }}>Trips Per Month</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={months12} margin={{ top:0, right:0, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="month" tick={{ fontSize:10 }}/>
              <YAxis tick={{ fontSize:10 }} allowDecimals={false}/>
              <Tooltip/>
              <Bar dataKey="count" name="Trips" fill="#8b5cf6" radius={[4,4,0,0]}>
                {months12.map((_,i) => <Cell key={i} fill={C[i%C.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Driver Performance ───────────────────────────────────────── */}
      <Card>
        <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:14 }}>Driver Performance</p>
        {driverStats.length === 0 ? (
          <p style={{ color:"#94a3b8", fontSize:12, textAlign:"center", padding:"20px 0" }}>No driver data</p>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #f1f5f9" }}>
                  {["Driver","Trips","Total Revenue","Total Expense","Net Profit","Avg Net/Trip"].map(h => (
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, fontSize:10, textTransform:"uppercase", color:"#94a3b8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {driverStats.map((d,i) => (
                  <tr key={d.driver} style={{ borderBottom:"1px solid #f8fafc", background:i%2===0?"transparent":"#fafafa" }}>
                    <td style={{ padding:"9px 12px", fontWeight:700, color:"#1e293b" }}>{d.driver}</td>
                    <td style={{ padding:"9px 12px", color:"#64748b" }}>{d.trips}</td>
                    <td style={{ padding:"9px 12px", fontWeight:700, color:"#059669" }}>{fmt(d.revenue)}</td>
                    <td style={{ padding:"9px 12px", color:"#dc2626" }}>{fmt(d.expense)}</td>
                    <td style={{ padding:"9px 12px", fontWeight:800, color:d.net>=0?"#059669":"#dc2626" }}>{fmt(d.net)}</td>
                    <td style={{ padding:"9px 12px", color:"#64748b" }}>{fmt(d.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Top Routes ───────────────────────────────────────────────── */}
      <Card>
        <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:14 }}>Top Routes by Trip Count</p>
        {routeStats.length === 0 ? (
          <p style={{ color:"#94a3b8", fontSize:12, textAlign:"center", padding:"20px 0" }}>No route data</p>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #f1f5f9" }}>
                  {["Route","Trips","Total Revenue","Total Expense","Net Profit","Avg Revenue/Trip"].map(h => (
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, fontSize:10, textTransform:"uppercase", color:"#94a3b8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {routeStats.map((r,i) => (
                  <tr key={r.route} style={{ borderBottom:"1px solid #f8fafc", background:i%2===0?"transparent":"#fafafa" }}>
                    <td style={{ padding:"9px 12px", fontWeight:700, color:"#1e293b" }}>{r.route}</td>
                    <td style={{ padding:"9px 12px" }}><span style={{ background:"#ede9fe", color:"#7c3aed", fontWeight:700, padding:"2px 8px", borderRadius:99, fontSize:11 }}>{r.trips}</span></td>
                    <td style={{ padding:"9px 12px", fontWeight:700, color:"#059669" }}>{fmt(r.revenue)}</td>
                    <td style={{ padding:"9px 12px", color:"#dc2626" }}>{fmt(r.expense)}</td>
                    <td style={{ padding:"9px 12px", fontWeight:800, color:r.net>=0?"#059669":"#dc2626" }}>{fmt(r.net)}</td>
                    <td style={{ padding:"9px 12px", color:"#64748b" }}>{fmt(r.avgRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Custom Report Builder ─────────────────────────────────────── */}
      <Card style={{ border:"2px solid #e0e7ff" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div>
            <p style={{ fontWeight:800, fontSize:14, color:"#1e293b", margin:0 }}>📊 Custom Report Builder</p>
            <p style={{ fontSize:11, color:"#64748b", margin:"3px 0 0" }}>Filter by date range, vehicle, and driver — then print</p>
          </div>
          <button onClick={printReport} disabled={reportData.length === 0}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", background:"#4f46e5", color:"#fff", border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor:reportData.length===0?"not-allowed":"pointer", opacity:reportData.length===0?0.5:1 }}>
            <Printer size={14}/>Print Report ({reportData.length} trips)
          </button>
        </div>

        {/* Filters */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10, marginBottom:16 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>From Date</label>
            <input type="date" value={reportDateFrom} onChange={e=>setReportDateFrom(e.target.value)}
              style={{ width:"100%", height:36, border:"1px solid #e2e8f0", borderRadius:8, padding:"0 10px", fontSize:12, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>To Date</label>
            <input type="date" value={reportDateTo} onChange={e=>setReportDateTo(e.target.value)}
              style={{ width:"100%", height:36, border:"1px solid #e2e8f0", borderRadius:8, padding:"0 10px", fontSize:12, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Vehicle</label>
            <select value={reportVehicle} onChange={e=>setReportVehicle(e.target.value)}
              style={{ width:"100%", height:36, border:"1px solid #e2e8f0", borderRadius:8, padding:"0 10px", fontSize:12, outline:"none", background:"#fff", boxSizing:"border-box" }}>
              <option value="">All Vehicles</option>
              {fleetVehicles.map(v => <option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4, textTransform:"uppercase" }}>Driver</label>
            <select value={reportDriver} onChange={e=>setReportDriver(e.target.value)}
              style={{ width:"100%", height:36, border:"1px solid #e2e8f0", borderRadius:8, padding:"0 10px", fontSize:12, outline:"none", background:"#fff", boxSizing:"border-box" }}>
              <option value="">All Drivers</option>
              {drivers.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Report summary tiles */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10, marginBottom:16 }}>
          {[
            { l:"Trips",    v:reportTotals.trips,   color:"#3b82f6" },
            { l:"Revenue",  v:fmt(reportTotals.revenue), color:"#10b981" },
            { l:"Expense",  v:fmt(reportTotals.expense), color:"#ef4444" },
            { l:"Net P&L",  v:fmt(reportTotals.net),     color:reportTotals.net>=0?"#059669":"#dc2626" },
            { l:"Fuel",     v:fmt(reportTotals.fuel),    color:"#f59e0b" },
          ].map(k => (
            <div key={k.l} style={{ background:"#f8fafc", borderRadius:10, padding:"10px 14px", border:"1px solid #e2e8f0" }}>
              <p style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase", margin:"0 0 4px" }}>{k.l}</p>
              <p style={{ fontSize:16, fontWeight:800, color:k.color, margin:0 }}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Report preview table */}
        {reportData.length > 0 ? (
          <div style={{ overflowX:"auto", maxHeight:320, overflowY:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead style={{ position:"sticky", top:0, background:"#fff", zIndex:1 }}>
                <tr style={{ borderBottom:"2px solid #f1f5f9" }}>
                  {["Date","Vehicle","Driver","Route","Revenue","Expense","Net","Status"].map(h => (
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, fontSize:10, textTransform:"uppercase", color:"#94a3b8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.slice(0,50).map((t,i) => {
                  const rev = t.total_revenue||t.freight_income_pkr||0;
                  const net = t.trip_net_profit||0;
                  return (
                    <tr key={t.id} style={{ borderBottom:"1px solid #f8fafc", background:i%2===0?"transparent":"#fafafa" }}>
                      <td style={{ padding:"8px 12px", color:"#64748b" }}>{t.trip_date}</td>
                      <td style={{ padding:"8px 12px", fontWeight:700, color:"#1e293b" }}>{t.vehicle_number||"—"}</td>
                      <td style={{ padding:"8px 12px", color:"#64748b" }}>{t.driver_name||"—"}</td>
                      <td style={{ padding:"8px 12px", color:"#1e293b" }}>{t.origin} → {t.destination}</td>
                      <td style={{ padding:"8px 12px", fontWeight:700, color:"#059669" }}>{fmt(rev)}</td>
                      <td style={{ padding:"8px 12px", color:"#dc2626" }}>{fmt(t.total_trip_expense||0)}</td>
                      <td style={{ padding:"8px 12px", fontWeight:800, color:net>=0?"#059669":"#dc2626" }}>{fmt(net)}</td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ background:t.status==="completed"?"#d1fae5":t.status==="cancelled"?"#fee2e2":"#fef3c7", color:t.status==="completed"?"#059669":t.status==="cancelled"?"#dc2626":"#d97706", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99 }}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {reportData.length > 50 && <p style={{ textAlign:"center", fontSize:11, color:"#94a3b8", padding:"8px 0" }}>Showing 50 of {reportData.length} — print to see all</p>}
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"24px 0", color:"#94a3b8" }}>
            <BarChart2 size={32} style={{ margin:"0 auto 8px", display:"block", opacity:0.3 }}/>
            <p style={{ fontSize:12 }}>No trips match the selected filters</p>
          </div>
        )}
      </Card>
    </div>
  );
}