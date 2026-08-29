import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, subMonths, parseISO } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts";
import { Fuel, TrendingDown, TrendingUp, ChevronLeft, AlertTriangle, Gauge, Activity } from "lucide-react";

const SS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}
.fp{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:960px){.g4{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr 1fr;}.g2{grid-template-columns:1fr;}}
@media(max-width:600px){.g4{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr;}.fm{padding:12px!important;}}
::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
.pulse{animation:pulse 2s infinite;}
`;

const Card = ({ children, style = {} }) => (
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:20, ...style }}>{children}</div>
);

const fmt = (n) => n != null ? `${parseFloat(n).toFixed(2)} km/L` : "—";

// Drop threshold to flag sudden efficiency drops
const DROP_THRESHOLD = 15; // % drop triggers alert

export default function FuelAnalytics() {
  const { fmt: fmtMoney } = useAppSettings();
  const { isDriver, loading: roleLoading } = useRole();
  const [selectedVehicle, setSelectedVehicle] = useState("all");

  const { data: odoRecords = [] } = useQuery({
    queryKey: ["odo_fuel_analytics"],
    queryFn: () => base44.entities.FleetODO.list("-recorded_date", 500).catch(() => []),
  });
  const { data: fleetVehicles = [] } = useQuery({
    queryKey: ["fv_fuel_analytics"],
    queryFn: () => base44.entities.FleetVehicle.list(),
  });
  const { data: fuelRates = [] } = useQuery({
    queryKey: ["fr_fuel_analytics"],
    queryFn: () => base44.entities.FuelRate?.list("-effective_date", 50).catch(() => []) ?? Promise.resolve([]),
  });

  // Per-vehicle efficiency stats — all hooks before returns
  const vehicleStats = useMemo(() => {
    return fleetVehicles.map(v => {
      const recs = odoRecords
        .filter(o => o.vehicle_id === v.id || o.vehicle_number === v.vehicle_number)
        .sort((a, b) => (a.recorded_date || "").localeCompare(b.recorded_date || ""));

      const odoRecs  = recs.filter(r => r.odo_reading != null && r.fuel_litres > 0);

      // Build per-fill efficiency series
      const series = [];
      for (let i = 1; i < odoRecs.length; i++) {
        const cur  = odoRecs[i];
        const prev = odoRecs[i - 1];
        const km   = (cur.odo_reading || 0) - (prev.odo_reading || 0);
        const L    = cur.fuel_litres || 0;
        if (km > 0 && L > 0) {
          series.push({
            date:     cur.recorded_date,
            month:    cur.month || cur.recorded_date?.slice(0, 7),
            kmPerL:   parseFloat((km / L).toFixed(2)),
            km,
            litres:   L,
            cost:     cur.fuel_cost_pkr || 0,
            rate:     cur.fuel_rate_per_litre || 0,
          });
        }
      }

      const avgKmPerL = series.length > 0
        ? parseFloat((series.reduce((s, x) => s + x.kmPerL, 0) / series.length).toFixed(2))
        : null;

      const totalFuelLitres = recs.filter(r => r.fuel_litres > 0).reduce((s, r) => s + (r.fuel_litres || 0), 0);
      const totalFuelCost   = recs.filter(r => r.fuel_cost_pkr > 0).reduce((s, r) => s + (r.fuel_cost_pkr || 0), 0);

      // Detect sudden drops: compare last reading to rolling avg of prior 3
      let dropAlert = null;
      if (series.length >= 3) {
        const last = series[series.length - 1];
        const prior3Avg = series.slice(-4, -1).reduce((s, x) => s + x.kmPerL, 0) / Math.min(series.slice(-4, -1).length, 3);
        const dropPct = prior3Avg > 0 ? ((prior3Avg - last.kmPerL) / prior3Avg) * 100 : 0;
        if (dropPct >= DROP_THRESHOLD) {
          dropAlert = { dropPct: dropPct.toFixed(1), last, prior3Avg: prior3Avg.toFixed(2) };
        }
      }

      return { v, series, avgKmPerL, totalFuelLitres, totalFuelCost, dropAlert };
    }).filter(s => s.series.length > 0);
  }, [fleetVehicles, odoRecords]);

  // Fuel rate history chart
  const rateHistory = useMemo(() => {
    return [...fuelRates]
      .filter(r => r.fuel_type === "Diesel" || r.fuel_type === "HSD")
      .sort((a, b) => (a.effective_date || "").localeCompare(b.effective_date || ""))
      .slice(-12)
      .map(r => ({ date: r.effective_date?.slice(0, 7) || "—", rate: r.rate_per_litre, type: r.fuel_type }));
  }, [fuelRates]);

  // Fleet-wide monthly KM/L
  const monthlyFleetEff = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), "yyyy-MM"));
    return months.map(m => {
      const monthSeries = vehicleStats.flatMap(s => s.series.filter(x => x.month === m));
      const avg = monthSeries.length > 0
        ? parseFloat((monthSeries.reduce((s, x) => s + x.kmPerL, 0) / monthSeries.length).toFixed(2))
        : null;
      return { month: m.slice(5), avg, fills: monthSeries.length };
    });
  }, [vehicleStats]);

  if (roleLoading) return (
    <div className="fp" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
      <style>{SS}</style>
      <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid #e2e8f0", borderTopColor:"#f97316", animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (isDriver) return <AccessDenied />;

  const alerts      = vehicleStats.filter(s => s.dropAlert);
  const displayStats = selectedVehicle === "all" ? vehicleStats : vehicleStats.filter(s => s.v.vehicle_number === selectedVehicle);
  const fleetAvgKmL  = vehicleStats.filter(s => s.avgKmPerL).length > 0
    ? (vehicleStats.filter(s => s.avgKmPerL).reduce((s, x) => s + x.avgKmPerL, 0) / vehicleStats.filter(s => s.avgKmPerL).length).toFixed(2)
    : null;
  const latestDieselRate = fuelRates.find(r => r.fuel_type === "Diesel" || r.fuel_type === "HSD")?.rate_per_litre;

  const COLORS = ["#f97316","#10b981","#3b82f6","#8b5cf6","#ef4444","#06b6d4","#f59e0b"];

  return (
    <div className="fp">
      <style>{SS}</style>

      {/* TOP BAR */}
      <div style={{ background:"rgba(15,23,42,0.97)", padding:"0 22px", display:"flex", alignItems:"center", height:50, gap:14, position:"sticky", top:0, zIndex:100 }}>
        <Link to={createPageUrl("Fleet")} style={{ display:"flex", alignItems:"center", gap:6, color:"#64748b", textDecoration:"none", fontSize:12, fontWeight:600 }}>
          <ChevronLeft size={14}/>Fleet Hub
        </Link>
        <div style={{ width:1, height:20, background:"rgba(255,255,255,0.1)" }}/>
        <Fuel size={14} color="#f97316"/>
        <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Fuel Analytics</span>
        {latestDieselRate && <span style={{ background:"rgba(249,115,22,0.15)", color:"#f97316", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99 }}>Diesel ₨{latestDieselRate}/L</span>}
        {alerts.length > 0 && (
          <span className="pulse" style={{ background:"#dc2626", color:"#fff", fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:99 }}>
            ⚠ {alerts.length} efficiency drop{alerts.length > 1 ? "s" : ""} detected
          </span>
        )}
        <div style={{ flex:1 }}/>
        <Link to={createPageUrl("FleetODOTracking")} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"rgba(255,255,255,0.1)", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:600, textDecoration:"none" }}>
          <Gauge size={13}/>ODO & Fuel
        </Link>
      </div>

      <main style={{ padding:"20px 22px", maxWidth:1400, margin:"0 auto" }} className="fm">

        {/* KPIs */}
        <div className="g4" style={{ marginBottom:20 }}>
          {[
            { l:"Fleet Avg km/L", v:fleetAvgKmL ? `${fleetAvgKmL} km/L` : "—", g:"linear-gradient(135deg,#7c2d12,#f97316)" },
            { l:"Vehicles Tracked", v:vehicleStats.length, g:"linear-gradient(135deg,#1e3a5f,#2563eb)" },
            { l:"Efficiency Alerts", v:alerts.length, g:alerts.length > 0 ? "linear-gradient(135deg,#7f1d1d,#dc2626)" : "linear-gradient(135deg,#064e3b,#10b981)" },
            { l:"Fuel Rate (Diesel)", v:latestDieselRate ? `₨${latestDieselRate}/L` : "—", g:"linear-gradient(135deg,#1e1b4b,#7c3aed)" },
          ].map(k => (
            <div key={k.l} style={{ background:k.g, borderRadius:16, padding:"16px 18px", color:"#fff" }}>
              <p style={{ fontSize:11, fontWeight:700, opacity:0.75, textTransform:"uppercase", margin:"0 0 6px" }}>{k.l}</p>
              <p style={{ fontSize:22, fontWeight:800, margin:0 }}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Efficiency Drop Alerts */}
        {alerts.length > 0 && (
          <Card style={{ marginBottom:20, borderColor:"#fecaca", background:"#fff5f5" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <AlertTriangle size={18} color="#dc2626"/>
              <p style={{ fontWeight:800, fontSize:14, color:"#dc2626", margin:0 }}>Sudden Efficiency Drops Detected</p>
              <span style={{ fontSize:11, color:"#64748b" }}>— drop of ≥{DROP_THRESHOLD}% vs rolling 3-fill average</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {alerts.map(s => (
                <div key={s.v.id} style={{ display:"flex", alignItems:"center", gap:14, background:"#fff", borderRadius:12, padding:"12px 16px", border:"1px solid #fecaca" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#dc2626", flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:800, color:"#1e293b", margin:0 }}>{s.v.vehicle_number}</p>
                    <p style={{ fontSize:11, color:"#64748b", margin:"3px 0 0" }}>
                      Last fill: <strong style={{ color:"#dc2626" }}>{s.dropAlert.last.kmPerL} km/L</strong> vs avg <strong>{s.dropAlert.prior3Avg} km/L</strong> · Date: {s.dropAlert.last.date}
                    </p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <span style={{ background:"#fee2e2", color:"#dc2626", fontSize:12, fontWeight:800, padding:"4px 12px", borderRadius:99 }}>
                      ↓ {s.dropAlert.dropPct}% drop
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Fleet monthly efficiency + Fuel rate history */}
        <div className="g2" style={{ marginBottom:20 }}>
          <Card>
            <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:14 }}>Fleet Average Efficiency — 6 Months (km/L)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyFleetEff} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{ fontSize:10 }}/>
                <YAxis tick={{ fontSize:10 }} tickFormatter={v => `${v}`}/>
                <Tooltip formatter={(v, n) => [`${v} km/L`, "Avg Efficiency"]}/>
                <Bar dataKey="avg" name="km/L" radius={[4,4,0,0]}>
                  {monthlyFleetEff.map((m, i) => <Cell key={i} fill={m.avg ? "#f97316" : "#e2e8f0"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:14 }}>Diesel Rate History (₨/L)</p>
            {rateHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={rateHistory} margin={{ top:0, right:10, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="date" tick={{ fontSize:10 }}/>
                  <YAxis tick={{ fontSize:10 }}/>
                  <Tooltip formatter={v => [`₨${v}`, "Rate/L"]}/>
                  <Line type="monotone" dataKey="rate" stroke="#f97316" strokeWidth={2} dot={{ r:4, fill:"#f97316" }}/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign:"center", padding:"32px 0", color:"#94a3b8" }}>
                <Fuel size={32} style={{ margin:"0 auto 8px", display:"block", opacity:0.4 }}/>
                <p style={{ fontSize:12 }}>No fuel rate history yet.<br/>Add rates in <Link to={createPageUrl("FuelRateManager")} style={{ color:"#f97316" }}>Fuel Rate Manager</Link>.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Vehicle filter */}
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>Vehicle:</span>
          <button onClick={() => setSelectedVehicle("all")} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, border:"none", cursor:"pointer", background:selectedVehicle==="all"?"#f97316":"#f1f5f9", color:selectedVehicle==="all"?"#fff":"#64748b" }}>All</button>
          {vehicleStats.map(s => (
            <button key={s.v.id} onClick={() => setSelectedVehicle(s.v.vehicle_number)}
              style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, border:"none", cursor:"pointer", background:selectedVehicle===s.v.vehicle_number?"#f97316":"#f1f5f9", color:selectedVehicle===s.v.vehicle_number?"#fff":"#64748b",
                boxShadow:s.dropAlert?"0 0 0 2px #dc2626":"none" }}>
              {s.v.vehicle_number}{s.dropAlert ? " ⚠" : ""}
            </button>
          ))}
        </div>

        {/* Vehicle efficiency comparison bar */}
        {vehicleStats.filter(s => s.avgKmPerL).length > 0 && (
          <Card style={{ marginBottom:20 }}>
            <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:14 }}>Vehicle Efficiency Comparison (km/L)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={vehicleStats.filter(s => s.avgKmPerL).map(s => ({
                  vehicle: s.v.vehicle_number,
                  kmPerL: s.avgKmPerL,
                  hasAlert: !!s.dropAlert,
                }))}
                margin={{ top:0, right:10, left:-10, bottom:30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="vehicle" tick={{ fontSize:10, angle:-20, textAnchor:"end" }} interval={0}/>
                <YAxis tick={{ fontSize:10 }} tickFormatter={v => `${v}`}/>
                <Tooltip formatter={v => [`${v} km/L`, "Avg Efficiency"]}/>
                {fleetAvgKmL && <ReferenceLine y={parseFloat(fleetAvgKmL)} stroke="#64748b" strokeDasharray="4 4" label={{ value:"Fleet avg", position:"insideTopRight", fontSize:10, fill:"#64748b" }}/>}
                <Bar dataKey="kmPerL" name="km/L" radius={[4,4,0,0]}>
                  {vehicleStats.filter(s => s.avgKmPerL).map((s, i) => (
                    <Cell key={i} fill={s.dropAlert ? "#ef4444" : s.avgKmPerL >= parseFloat(fleetAvgKmL || 0) ? "#10b981" : "#f97316"}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", gap:16, marginTop:8 }}>
              {[{ c:"#10b981", l:"Above fleet avg" }, { c:"#f97316", l:"Below fleet avg" }, { c:"#ef4444", l:"Efficiency drop alert" }].map(x => (
                <div key={x.l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#64748b" }}>
                  <span style={{ width:10, height:10, borderRadius:3, background:x.c, display:"block" }}/>{x.l}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Per-vehicle detail */}
        {displayStats.map((s, vi) => (
          <Card key={s.v.id} style={{ marginBottom:16, borderColor:s.dropAlert ? "#fecaca" : "#e2e8f0" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <p style={{ fontWeight:800, fontSize:15, color:"#1e293b", margin:0 }}>{s.v.vehicle_number}</p>
                  {s.dropAlert && <span className="pulse" style={{ background:"#fee2e2", color:"#dc2626", fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:99 }}>⚠ DROP DETECTED</span>}
                </div>
                <p style={{ fontSize:11, color:"#64748b", margin:"3px 0 0" }}>{s.v.vehicle_type || "—"} · {s.v.driver_name || "No driver"}</p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                {[
                  { l:"Avg km/L", v:`${s.avgKmPerL} km/L`, c:"#f97316", b:"#fff7ed" },
                  { l:"Total Fuel", v:`${s.totalFuelLitres.toLocaleString()} L`, c:"#2563eb", b:"#eff6ff" },
                  { l:"Fuel Cost", v:fmtMoney(s.totalFuelCost), c:"#dc2626", b:"#fff5f5" },
                ].map(k => (
                  <div key={k.l} style={{ background:k.b, borderRadius:10, padding:"6px 14px", textAlign:"center" }}>
                    <p style={{ fontSize:10, color:"#94a3b8", margin:0, fontWeight:700 }}>{k.l}</p>
                    <p style={{ fontSize:14, fontWeight:800, color:k.c, margin:"2px 0 0" }}>{k.v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Efficiency trend line */}
            {s.series.length > 1 && (
              <div style={{ marginBottom:12 }}>
                <p style={{ fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8 }}>Efficiency Trend (km/L per fill-up)</p>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={s.series} margin={{ top:4, right:10, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc"/>
                    <XAxis dataKey="date" tick={{ fontSize:9 }} tickFormatter={d => d?.slice(5) || ""}/>
                    <YAxis tick={{ fontSize:9 }} domain={["auto","auto"]}/>
                    <Tooltip
                      formatter={(v, n) => [`${v} km/L`, "Efficiency"]}
                      labelFormatter={d => `Date: ${d}`}
                    />
                    {s.avgKmPerL && <ReferenceLine y={s.avgKmPerL} stroke="#94a3b8" strokeDasharray="3 3"/>}
                    <Line
                      type="monotone" dataKey="kmPerL" stroke={s.dropAlert ? "#ef4444" : "#f97316"}
                      strokeWidth={2} dot={{ r:4, fill:s.dropAlert ? "#ef4444" : "#f97316" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Fill-up table */}
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead><tr style={{ borderBottom:"1px solid #f1f5f9" }}>
                  {["Date","km/L","Distance","Fuel (L)","Fuel Cost","Rate/L","vs Avg"].map(h => (
                    <th key={h} style={{ padding:"6px 10px", textAlign:"left", color:"#94a3b8", fontWeight:700, fontSize:9, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {s.series.slice(-10).reverse().map((x, i) => {
                    const diff = s.avgKmPerL ? x.kmPerL - s.avgKmPerL : null;
                    const isLow = diff !== null && diff < -(s.avgKmPerL * DROP_THRESHOLD / 100);
                    return (
                      <tr key={i} style={{ borderTop:"1px solid #f8fafc", background:isLow ? "#fff5f5" : i%2===0?"transparent":"#fafafa" }}>
                        <td style={{ padding:"7px 10px", color:"#64748b" }}>{x.date}</td>
                        <td style={{ padding:"7px 10px", fontWeight:800, color:isLow?"#dc2626":diff>0?"#059669":"#f97316" }}>{x.kmPerL}</td>
                        <td style={{ padding:"7px 10px", color:"#64748b" }}>{x.km.toLocaleString()} km</td>
                        <td style={{ padding:"7px 10px", color:"#2563eb" }}>{x.litres} L</td>
                        <td style={{ padding:"7px 10px", color:"#dc2626" }}>{x.cost > 0 ? fmtMoney(x.cost) : "—"}</td>
                        <td style={{ padding:"7px 10px", color:"#64748b" }}>{x.rate > 0 ? `₨${x.rate}` : "—"}</td>
                        <td style={{ padding:"7px 10px" }}>
                          {diff !== null && (
                            <span style={{ fontSize:10, fontWeight:700, color:diff >= 0 ? "#059669" : "#dc2626" }}>
                              {diff >= 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(2)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        {vehicleStats.length === 0 && (
          <Card>
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <Fuel size={48} color="#94a3b8" style={{ margin:"0 auto 12px", display:"block", opacity:0.4 }}/>
              <p style={{ fontWeight:700, color:"#1e293b", fontSize:15, margin:0 }}>No fuel data yet</p>
              <p style={{ color:"#64748b", fontSize:13, margin:"8px auto 0", maxWidth:380 }}>
                Record ODO readings + fuel fill-ups in{" "}
                <Link to={createPageUrl("FleetODOTracking")} style={{ color:"#f97316", fontWeight:700 }}>ODO & Fuel Tracking</Link>{" "}
                to see efficiency analytics here.
              </p>
            </div>
          </Card>
        )}

      </main>
    </div>
  );
}