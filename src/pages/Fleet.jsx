import React, { useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, subMonths, differenceInDays, addMonths, parseISO, isBefore, startOfDay } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from "recharts";
import {
  Truck, TrendingUp, Wrench, Gauge, Fuel, DollarSign, Navigation,
  Bell, BarChart2, ArrowUpRight, ArrowDownRight, CreditCard, Plus, X,
  Pencil, Trash2, ChevronLeft, FileText, Shield, CheckCircle, Clock
} from "lucide-react";
import { toast } from "sonner";

const C  = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316"];
const SS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}
.fleet-root{font-family:'DM Sans','Segoe UI',system-ui,sans-serif;min-height:100vh;background:#f1f5f9;}
.fg4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.fgql{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;}
@media(max-width:1100px){.fg4{grid-template-columns:1fr 1fr;}.fg3{grid-template-columns:1fr 1fr;}.fgql{grid-template-columns:1fr 1fr;}}
@media(max-width:640px){.fg4{grid-template-columns:1fr 1fr;}.fg2{grid-template-columns:1fr;}.fg3{grid-template-columns:1fr;}.fgql{grid-template-columns:1fr 1fr;}.fm{padding:12px!important;}}
::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
.ql-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;transition:all 0.15s;cursor:pointer;text-decoration:none;color:inherit;}
.ql-card:hover{border-color:#10b981;box-shadow:0 4px 12px rgba(16,185,129,0.1);transform:translateY(-2px);}
.kc{border-radius:16px;padding:18px 20px;color:#fff;position:relative;overflow:hidden;cursor:pointer;transition:transform 0.15s;}
.kc:hover{transform:translateY(-2px);}
.tab-btn{padding:7px 16px;border-radius:8px;border:none;cursor:pointer;font-size:11px;font-weight:700;transition:all 0.15s;}
@keyframes spin{to{transform:rotate(360deg)}}`;

const Card = ({ children, style={} }) =>
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:20, ...style }}>{children}</div>;

function KpiCard({ label, value, sub, icon:Icon, gradient, trend, to, onClick }) {
  const inner = (
    <>
      <div style={{ position:"absolute", right:14, top:14, opacity:0.15 }}><Icon size={42}/></div>
      {(to||onClick) && <div style={{ position:"absolute", right:14, bottom:12, fontSize:10, fontWeight:700, opacity:0.6 }}>View →</div>}
      <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", opacity:0.75, marginBottom:6 }}>{label}</p>
      <p style={{ fontSize:22, fontWeight:800, margin:"0 0 3px" }}>{value}</p>
      {sub && <p style={{ fontSize:10, opacity:0.7 }}>{sub}</p>}
      {trend !== undefined && (
        <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:6, fontSize:10, fontWeight:600 }}>
          {trend >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
          <span>{Math.abs(trend).toFixed(1)}% vs last month</span>
        </div>
      )}
    </>
  );
  if (to)      return <Link to={createPageUrl(to)} className="kc" style={{ background:gradient, display:"block", textDecoration:"none", color:"#fff", position:"relative", overflow:"hidden" }}>{inner}</Link>;
  if (onClick) return <div className="kc" onClick={onClick} style={{ background:gradient, color:"#fff", position:"relative", overflow:"hidden" }}>{inner}</div>;
  return <div className="kc" style={{ background:gradient, color:"#fff", position:"relative", overflow:"hidden" }}>{inner}</div>;
}

function StatusBadge({ status }) {
  const m = { active:{l:"Active",c:"#059669",b:"#d1fae5"}, available:{l:"Available",c:"#059669",b:"#d1fae5"}, inactive:{l:"Inactive",c:"#dc2626",b:"#fee2e2"}, maintenance:{l:"Maint.",c:"#d97706",b:"#fef3c7"}, sold:{l:"Sold",c:"#64748b",b:"#f1f5f9"} };
  const s = m[status] || {l:status||"—",c:"#64748b",b:"#f1f5f9"};
  return <span style={{ background:s.b, color:s.c, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99 }}>{s.l}</span>;
}

const cTooltip = fmt => ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px", fontSize:12, boxShadow:"0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ fontWeight:700, marginBottom:4, color:"#1e293b" }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color:p.color, margin:"2px 0" }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

function buildSchedule(v) {
  const monthly   = parseFloat(v.monthly_installment) || 0;
  const total     = parseInt(v.total_installments)    || 0;
  const paid      = parseInt(v.installments_paid)     || 0;
  const startDate = v.installment_start_date ? parseISO(v.installment_start_date) : new Date();
  const today     = startOfDay(new Date());
  if (!monthly || !total) return [];
  return Array.from({ length:total }, (_,i) => {
    const dueDate  = addMonths(startDate, i);
    const isPaid   = i < paid;
    const isOverdue= !isPaid && isBefore(dueDate, today);
    return { no:i+1, due_date:format(dueDate,"yyyy-MM-dd"), amount:monthly,
      status: isPaid?"paid" : isOverdue?"overdue":"pending" };
  });
}

// ── Fleet Vehicle Form Modal ──────────────────────────────────────────────────
function FleetVehicleModal({ record, onClose, onSave, saving }) {
  const base = {
    vehicle_number:"", asset_name:"", category:"vehicle", asset_type:"",
    asset_code:"", make_model:"", year:"", registration_number:"",
    vehicle_type:"", location:"", assigned_to:"", driver_name:"",
    driver_phone:"", status:"available",
    purchase_date:"", purchase_price:"", payment_method:"cash",
    down_payment:"", financed_amount:"", financing_institution:"",
    monthly_installment:"", total_installments:"", installments_paid:"0",
    next_installment_date:"", installment_start_date:"",
    current_value:"", salvage_value:"", useful_life_years:"",
    depreciation_method:"straight_line",
    insurance_company:"", policy_number:"", insurance_expiry:"",
    notes:"",
  };
  const [form, setForm] = useState(record ? { ...base, ...record } : base);
  const s  = (k,v) => setForm(p=>({...p,[k]:v}));
  const FI = ({field,...p}) => <input value={form[field]||""} onChange={e=>s(field,e.target.value)} {...p}
    style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>;
  const FS = ({field,opts}) => <select value={form[field]||""} onChange={e=>s(field,e.target.value)}
    style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",background:"#fff"}}>
    {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
  </select>;
  const F  = ({label,children,full}) => <div style={{marginBottom:12,gridColumn:full?"1/-1":undefined}}>
    <label style={{display:"block",fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
    {children}
  </div>;
  const SH = ({label}) => <div style={{gridColumn:"1/-1",paddingBottom:4,marginTop:10,marginBottom:2,borderBottom:"2px solid #e2e8f0"}}>
    <p style={{fontSize:11,fontWeight:800,color:"#2563eb",textTransform:"uppercase",letterSpacing:"0.08em",margin:0}}>{label}</p>
  </div>;

  const modalContent = (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflow:"hidden"}}>
      <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"92vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:800,color:"#0f172a",margin:0}}>{record?"Edit Fleet Vehicle":"Add Fleet Vehicle"}</h2>
          <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={14}/></button>
        </div>
        <div style={{padding:"18px 22px",overflowY:"auto",flex:1}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <SH label="Basic Information"/>
            <F label="Asset Name" full><FI field="asset_name" placeholder="e.g. MASTER FUSO CANTER"/></F>
            <F label="Vehicle / Reg No. *"><FI field="vehicle_number" placeholder="e.g. JW 0111"/></F>
            <F label="Registration Number"><FI field="registration_number" placeholder="e.g. JW 9711"/></F>
            <F label="Category"><FS field="category" opts={["vehicle","machinery","equipment","property"].map(v=>({v,l:v.charAt(0).toUpperCase()+v.slice(1)}))}/></F>
            <F label="Asset Type"><FI field="asset_type" placeholder="e.g. MASTER FUSO CANTER"/></F>
            <F label="Asset Code / Tag"><FI field="asset_code" placeholder="e.g. DRY MAZDA"/></F>
            <F label="Make / Model"><FI field="make_model" placeholder="e.g. CANTER 2023"/></F>
            <F label="Year"><FI field="year" placeholder="2023"/></F>
            <F label="Vehicle Type"><FI field="vehicle_type" placeholder="e.g. 20ft Dry"/></F>
            <F label="Status"><FS field="status" opts={["available","active","maintenance","inactive","sold"].map(v=>({v,l:v.charAt(0).toUpperCase()+v.slice(1)}))}/></F>
            <F label="Location"><FI field="location" placeholder="e.g. KARACHI"/></F>
            <F label="Assigned To"><FI field="assigned_to" placeholder="Department or person"/></F>
            <F label="Driver Name"><FI field="driver_name" placeholder="Assigned driver"/></F>
            <F label="Driver Phone"><FI field="driver_phone" placeholder="+92 300 0000000"/></F>
            <SH label="Purchase Details"/>
            <F label="Purchase Date"><FI field="purchase_date" type="date"/></F>
            <F label="Purchase Price (₨)"><FI field="purchase_price" type="number" placeholder="0"/></F>
            <F label="Payment Method" full>
              <div style={{display:"flex",gap:8}}>
                {["cash","instalments"].map(m=>(
                  <button key={m} type="button" onClick={()=>s("payment_method",m)}
                    style={{flex:1,height:38,borderRadius:10,border:`2px solid ${form.payment_method===m?"#2563eb":"#e2e8f0"}`,background:form.payment_method===m?"#2563eb":"#fff",color:form.payment_method===m?"#fff":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"capitalize"}}>
                    {m}
                  </button>
                ))}
              </div>
            </F>
            {form.payment_method === "instalments" && (<>
              <F label="Down Payment (₨)"><FI field="down_payment" type="number" placeholder="0"/></F>
              <F label="Financed Amount (₨)"><FI field="financed_amount" type="number" placeholder="0"/></F>
              <F label="Financing Institution" full><FI field="financing_institution" placeholder="e.g. SHAREEF AFRIDI"/></F>
              <F label="Monthly Instalment (₨)"><FI field="monthly_installment" type="number" placeholder="0"/></F>
              <F label="Total Instalments"><FI field="total_installments" type="number" placeholder="e.g. 38"/></F>
              <F label="Instalments Paid So Far"><FI field="installments_paid" type="number" placeholder="0"/></F>
              <F label="Next Instalment Date"><FI field="next_installment_date" type="date"/></F>
              <F label="Start Date"><FI field="installment_start_date" type="date"/></F>
            </>)}
            <SH label="Valuation & Depreciation"/>
            <F label="Current / Book Value (₨)"><FI field="current_value" type="number" placeholder="0"/></F>
            <F label="Salvage Value (₨)"><FI field="salvage_value" type="number" placeholder="0"/></F>
            <F label="Useful Life (Years)"><FI field="useful_life_years" type="number" placeholder="e.g. 20"/></F>
            <F label="Depreciation Method"><FS field="depreciation_method" opts={[{v:"straight_line",l:"Straight Line"},{v:"declining_balance",l:"Declining Balance"},{v:"units_of_production",l:"Units of Production"}]}/></F>
            <SH label="Insurance"/>
            <F label="Insurance Company" full><FI field="insurance_company" placeholder="Insurance company name"/></F>
            <F label="Policy Number"><FI field="policy_number" placeholder="Policy number"/></F>
            <F label="Insurance Expiry"><FI field="insurance_expiry" type="date"/></F>
            <F label="Notes" full>
              <textarea value={form.notes||""} onChange={e=>s("notes",e.target.value)} placeholder="Optional notes…"
                style={{width:"100%",minHeight:56,border:"1px solid #e2e8f0",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
            </F>
          </div>
        </div>
        <div style={{padding:"14px 22px",borderTop:"1px solid #e2e8f0",display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,height:40,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Cancel</button>
          <button onClick={()=>onSave(form)} disabled={saving||!form.vehicle_number}
            style={{flex:2,height:40,borderRadius:10,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,opacity:(!form.vehicle_number||saving)?0.6:1}}>
            {saving?"Saving…":"Save Fleet Vehicle"}
          </button>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modalContent, document.body);
}

// ── Fleet Vehicles panel (inline overlay) ────────────────────────────────────
function FleetVehiclesPanel({ vehicles, trips, expenses, maintenance, fmt, canEdit, canDeleteFleet, qc }) {
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [search,   setSearch]   = useState("");

  const saveMut = useMutation({
    mutationFn: d => {
      const numFields = ["purchase_price","down_payment","financed_amount","monthly_installment",
        "total_installments","installments_paid","current_value","salvage_value","useful_life_years"];
      const data = { ...d };
      numFields.forEach(k => { if (data[k] !== "" && data[k] !== undefined) data[k] = parseFloat(data[k]) || 0; });
      return d.id ? base44.entities.FleetVehicle.update(d.id, data) : base44.entities.FleetVehicle.create(data);
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["fv_hub"]}); toast.success("Saved"); setShowForm(false); setEditing(null); },
    onError: e => toast.error("Save failed: "+e.message),
  });
  const delMut = useMutation({
    mutationFn: id => base44.entities.FleetVehicle.delete(id),
    onSuccess: () => { qc.invalidateQueries({queryKey:["fv_hub"]}); toast.success("Removed"); },
  });

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    return !q || [v.vehicle_number,v.driver_name,v.vehicle_type,v.make_model,v.asset_name].some(x=>x?.toLowerCase().includes(q));
  });

  return (
    <div>
      {showForm && <FleetVehicleModal record={editing} saving={saveMut.isPending}
        onClose={()=>{setShowForm(false);setEditing(null);}}
        onSave={d=>saveMut.mutate(editing?{...d,id:editing.id}:d)}/>}
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <p style={{fontWeight:700,fontSize:14,color:"#1e293b",margin:0}}>Fleet Vehicles ({vehicles.length})</p>
          {canEdit && <button onClick={()=>{setEditing(null);setShowForm(true);}}
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",background:"#10b981",color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            <Plus size={13}/>Add Fleet Vehicle
          </button>}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fleet vehicles…"
          style={{width:"100%",height:36,paddingLeft:12,border:"1px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{borderBottom:"2px solid #f1f5f9"}}>
              {["Vehicle","Asset Name","Type","Driver","Status","Trips","Revenue","Net P&L",""].map(h=>(
                <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,fontSize:10,textTransform:"uppercase",color:"#94a3b8"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((v,i)=>{
                const vT  = trips.filter(t=>t.fleet_vehicle_id===v.id||t.vehicle_number===v.vehicle_number);
                const rev = vT.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0);
                const tripExp = vT.reduce((s,t)=>s+(t.total_trip_expense||0),0);
                const addlExp = expenses.filter(e=>e.fleet_vehicle_id===v.id||e.vehicle_number===v.vehicle_number).reduce((s,e)=>s+(e.amount_pkr||0),0);
                const mc  = maintenance.filter(m=>m.fleet_vehicle_id===v.id||m.vehicle_number===v.vehicle_number).reduce((s,m)=>s+(m.cost_pkr||m.cost||0),0);
                const net = rev-tripExp-addlExp-mc;
                return (
                  <tr key={v.id} style={{borderBottom:"1px solid #f8fafc",background:i%2===0?"transparent":"#fafafa"}}>
                    <td style={{padding:"10px 10px",fontWeight:700,color:"#1e293b"}}>{v.vehicle_number}</td>
                    <td style={{padding:"10px 10px",color:"#64748b",fontSize:11}}>{v.asset_name||"—"}</td>
                    <td style={{padding:"10px 10px",color:"#64748b",fontSize:11}}>{v.vehicle_type||"—"}</td>
                    <td style={{padding:"10px 10px",color:"#64748b",fontSize:11}}>{v.driver_name||<span style={{color:"#f97316",fontSize:10}}>Unassigned</span>}</td>
                    <td style={{padding:"10px 10px"}}><StatusBadge status={v.status}/></td>
                    <td style={{padding:"10px 10px",fontWeight:700,color:"#1e293b"}}>{vT.length}</td>
                    <td style={{padding:"10px 10px",fontWeight:700,color:"#059669",fontSize:11}}>{fmt(rev)}</td>
                    <td style={{padding:"10px 10px",fontWeight:700,color:net>=0?"#059669":"#dc2626",fontSize:11}}>{fmt(net)}</td>
                    <td style={{padding:"10px 10px"}}>
                      <div style={{display:"flex",gap:4}}>
                        {canEdit&&<button onClick={()=>{setEditing(v);setShowForm(true);}} style={{padding:"4px 9px",background:"#f0fdf4",color:"#059669",border:"none",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}><Pencil size={10}/></button>}
                        {canDeleteFleet&&<button onClick={()=>{if(window.confirm("Remove?"))delMut.mutate(v.id);}} style={{padding:"4px 9px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}><Trash2 size={10}/></button>}
                        <Link to={createPageUrl("FleetDocs")+"?vehicle="+v.vehicle_number} style={{padding:"4px 9px",background:"#eff6ff",color:"#2563eb",border:"none",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",textDecoration:"none"}}>Docs</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length&&<tr><td colSpan={9} style={{padding:28,textAlign:"center",color:"#94a3b8"}}>
                {canEdit?<span>No vehicles. <button onClick={()=>setShowForm(true)} style={{background:"none",border:"none",color:"#10b981",fontWeight:700,cursor:"pointer"}}>+ Add first</button></span>:"No vehicles found"}
              </td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── ANALYTICS TABS component ──────────────────────────────────────────────────
function AnalyticsTabs({ trips, expenses, maintenance, odoRecords, installments, vehicles, fmt }) {
  const [tab, setTab] = useState("fleet");

  const accountingMonth = (d) => {
    if (!d) return format(new Date(),"yyyy-MM");
    const dt = new Date(d);
    return dt.getDate()<5 ? format(subMonths(dt,1),"yyyy-MM") : format(dt,"yyyy-MM");
  };

  const months6 = useMemo(()=>Array.from({length:6},(_,i)=>{
    const m=format(subMonths(new Date(),5-i),"yyyy-MM");
    const mT=trips.filter(t=>accountingMonth(t.trip_date)===m);
    const r=mT.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0);
    const tripExp=mT.reduce((s,t)=>s+(t.total_trip_expense||0),0);
    const addlExp=expenses.filter(e=>accountingMonth(e.expense_date)===m).reduce((s,e)=>s+(e.amount_pkr||0),0);
    const mc=maintenance.filter(x=>accountingMonth(x.service_date)===m).reduce((s,x)=>s+(x.cost||0),0);
    return {month:m.slice(5),rev:r,cost:tripExp+addlExp+mc,trips:mT.length,net:r-(tripExp+addlExp+mc)};
  }),[trips,expenses,maintenance]);

  const statusPie = useMemo(()=>{
    const acc={};
    vehicles.forEach(v=>{acc[v.status||"unknown"]=(acc[v.status||"unknown"]||0)+1;});
    return Object.entries(acc).map(([n,v])=>({name:n,value:v}));
  },[vehicles]);

  const maintenancePie = useMemo(()=>{
    const acc={};
    maintenance.forEach(m=>{const t=m.service_type||"other";acc[t]=(acc[t]||0)+(m.cost||0);});
    return Object.entries(acc).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v])=>({name:n.replace(/_/g," "),value:v}));
  },[maintenance]);

  const instStats = useMemo(()=>{
    const instVehicles=vehicles.filter(v=>v.payment_method==="instalments"&&parseFloat(v.monthly_installment)>0);
    let totalPaid=0,totalPending=0,totalOverdue=0;
    instVehicles.forEach(v=>{
      const sched=buildSchedule(v);
      sched.forEach(s=>{
        if(s.status==="paid") totalPaid+=s.amount;
        else if(s.status==="overdue") totalOverdue+=s.amount;
        else totalPending+=s.amount;
      });
    });
    return {totalPaid,totalPending,totalOverdue,count:instVehicles.length};
  },[vehicles]);

  const fuelMonthly = useMemo(()=>Array.from({length:6},(_,i)=>{
    const m=format(subMonths(new Date(),5-i),"yyyy-MM");
    const fuel=expenses.filter(e=>accountingMonth(e.expense_date)===m&&e.expense_type==="fuel").reduce((s,e)=>s+(e.amount_pkr||0),0);
    const odoM=odoRecords.filter(o=>o.recorded_date?.startsWith(m));
    const totalKm=odoM.reduce((s,o)=>s+(o.km_driven||0),0);
    const fuelLt=odoM.reduce((s,o)=>s+(o.fuel_filled_liters||0),0);
    return {month:m.slice(5),fuel,km:totalKm,litres:fuelLt,kml:fuelLt>0?(totalKm/fuelLt).toFixed(1):0};
  }),[expenses,odoRecords]);

  const TABS = [
    {id:"fleet",   label:"Fleet",       icon:"🚛"},
    {id:"trips",   label:"Trips",       icon:"🗺"},
    {id:"maint",   label:"Maintenance", icon:"🔧"},
    {id:"inst",    label:"Instalments", icon:"💳"},
    {id:"fuel",    label:"Fuel",        icon:"⛽"},
  ];

  return (
    <Card style={{marginBottom:20}}>
      {/* Tab bar */}
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
        {TABS.map(t=>(
          <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)}
            style={{background:tab===t.id?"#0f172a":"#f1f5f9",color:tab===t.id?"#fff":"#64748b",whiteSpace:"nowrap",flexShrink:0}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Fleet tab ── */}
      {tab==="fleet"&&(
        <div className="fg2">
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>Revenue vs Cost — 6 Months</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={months6} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={cTooltip(fmt)}/>
                <Bar dataKey="rev" name="Revenue" fill="#10b981" radius={[4,4,0,0]}/>
                <Bar dataKey="cost" name="Cost" fill="#3b82f6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>Fleet Status Distribution</p>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <ResponsiveContainer width="55%" height={150}>
                <PieChart><Pie data={statusPie} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value">{statusPie.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}</Pie><Tooltip/></PieChart>
              </ResponsiveContainer>
              <div style={{flex:1}}>
                {statusPie.map((s,i)=>(
                  <div key={s.name} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f8fafc"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:C[i%C.length],display:"block"}}/>
                      <span style={{fontSize:11,color:"#64748b",textTransform:"capitalize"}}>{s.name}</span>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:"#1e293b"}}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Trips tab ── */}
      {tab==="trips"&&(
        <div className="fg2">
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>Monthly Trip Count</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={months6} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Bar dataKey="trips" name="Trips" fill="#6366f1" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>Net Profit per Month</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={months6} margin={{top:0,right:0,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={cTooltip(fmt)}/>
                <Area type="monotone" dataKey="net" name="Net Profit" stroke="#10b981" fill="url(#gNet)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Maintenance tab ── */}
      {tab==="maint"&&(
        <div className="fg2">
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>Maintenance Cost by Type</p>
            {maintenancePie.length>0?(
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart><Pie data={maintenancePie} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">{maintenancePie.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}</Pie><Tooltip formatter={v=>fmt(v)}/></PieChart>
                </ResponsiveContainer>
                <div style={{flex:1}}>
                  {maintenancePie.map((s,i)=>(
                    <div key={s.name} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #f8fafc"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{width:7,height:7,borderRadius:"50%",background:C[i%C.length],display:"block"}}/>
                        <span style={{fontSize:10,color:"#64748b",textTransform:"capitalize"}}>{s.name}</span>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,color:"#1e293b"}}>{fmt(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ):<p style={{color:"#94a3b8",fontSize:12,textAlign:"center",padding:"20px 0"}}>No maintenance data</p>}
          </div>
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>Maintenance Summary</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[
                {l:"Total Services",v:maintenance.length,c:"#2563eb"},
                {l:"Completed",v:maintenance.filter(m=>m.status==="completed").length,c:"#059669"},
                {l:"Overdue",v:maintenance.filter(m=>m.status==="overdue").length,c:"#dc2626"},
                {l:"Total Cost",v:fmt(maintenance.reduce((s,m)=>s+(m.cost||0),0)),c:"#7c3aed"},
              ].map(x=>(
                <div key={x.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#f8fafc",borderRadius:10}}>
                  <span style={{fontSize:12,color:"#64748b"}}>{x.l}</span>
                  <span style={{fontSize:14,fontWeight:800,color:x.c}}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Instalments tab ── */}
      {tab==="inst"&&(
        <div className="fg2">
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>Instalment Summary</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[
                {l:"Vehicles on EMI",v:instStats.count,c:"#2563eb"},
                {l:"Total Paid",v:fmt(instStats.totalPaid),c:"#059669"},
                {l:"Pending",v:fmt(instStats.totalPending),c:"#d97706"},
                {l:"Overdue",v:fmt(instStats.totalOverdue),c:"#dc2626"},
              ].map(x=>(
                <div key={x.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#f8fafc",borderRadius:10}}>
                  <span style={{fontSize:12,color:"#64748b"}}>{x.l}</span>
                  <span style={{fontSize:14,fontWeight:800,color:x.c}}>{x.v}</span>
                </div>
              ))}
            </div>
            <Link to={createPageUrl("FleetInstallments")} style={{display:"block",textAlign:"center",marginTop:14,padding:"9px 0",background:"#eff6ff",color:"#2563eb",borderRadius:10,fontSize:12,fontWeight:700,textDecoration:"none"}}>View Full Schedule →</Link>
          </div>
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>EMI Vehicles</p>
            <div style={{overflowY:"auto",maxHeight:200}}>
              {vehicles.filter(v=>v.payment_method==="instalments"&&parseFloat(v.monthly_installment)>0).map(v=>(
                <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#f8fafc",borderRadius:10,marginBottom:6}}>
                  <div>
                    <p style={{fontSize:12,fontWeight:700,color:"#1e293b",margin:0}}>{v.vehicle_number}</p>
                    <p style={{fontSize:10,color:"#64748b",margin:0}}>{v.installments_paid||0}/{v.total_installments||0} paid</p>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{fontSize:12,fontWeight:700,color:"#2563eb",margin:0}}>{fmt(v.monthly_installment||0)}/mo</p>
                    <div style={{width:60,height:4,background:"#e2e8f0",borderRadius:99,marginTop:3}}>
                      <div style={{width:`${Math.min(100,((v.installments_paid||0)/(v.total_installments||1))*100)}%`,height:"100%",background:"#10b981",borderRadius:99}}/>
                    </div>
                  </div>
                </div>
              ))}
              {!vehicles.filter(v=>v.payment_method==="instalments").length&&<p style={{color:"#94a3b8",fontSize:12,textAlign:"center",padding:"20px 0"}}>No EMI vehicles</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Fuel tab ── */}
      {tab==="fuel"&&(
        <div className="fg2">
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>Fuel Cost (6 Months)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={fuelMonthly} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={cTooltip(fmt)}/>
                <Bar dataKey="fuel" name="Fuel Cost" fill="#f97316" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p style={{fontWeight:700,fontSize:12,color:"#1e293b",marginBottom:10}}>KM/L Efficiency</p>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={fuelMonthly} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Line type="monotone" dataKey="kml" name="KM/L" stroke="#10b981" strokeWidth={2} dot={{r:3,fill:"#10b981"}}/>
              </LineChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              {[
                {l:"Total Fuel Cost",v:fmt(fuelMonthly.reduce((s,m)=>s+m.fuel,0)),c:"#f97316"},
                {l:"Total KM",v:`${fuelMonthly.reduce((s,m)=>s+m.km,0).toLocaleString()}`,c:"#2563eb"},
              ].map(x=>(
                <div key={x.l} style={{flex:1,padding:"8px 10px",background:"#f8fafc",borderRadius:10,textAlign:"center"}}>
                  <p style={{fontSize:10,color:"#64748b",margin:"0 0 3px"}}>{x.l}</p>
                  <p style={{fontSize:13,fontWeight:800,color:x.c,margin:0}}>{x.v}</p>
                </div>
              ))}
            </div>
            <Link to={createPageUrl("FuelAnalytics")} style={{display:"block",textAlign:"center",marginTop:10,padding:"9px 0",background:"#fff7ed",color:"#f97316",borderRadius:10,fontSize:12,fontWeight:700,textDecoration:"none"}}>Full Fuel Analytics →</Link>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main Fleet Page ───────────────────────────────────────────────────────────
export default function Fleet() {
  const { fmt } = useAppSettings();
  const { isAdmin, isManagement, isFleetManager, isDriver, isAccounting, isOperations, loading: roleLoading } = useRole();
  const qc = useQueryClient();
  const canEdit = isAdmin || isManagement || isFleetManager || isAccounting || isOperations;
  const canDeleteFleet = isAdmin || isManagement;

  const [panel, setPanel] = useState(null);

  const { data: vehicles=[]    } = useQuery({ queryKey:["fv_hub"], queryFn:()=>base44.entities.FleetVehicle.list() });
  const { data: trips=[]       } = useQuery({ queryKey:["ft_hub"], queryFn:()=>base44.entities.FleetTrip.list("-trip_date",300) });
  const { data: expenses=[]    } = useQuery({ queryKey:["fe_hub"], queryFn:()=>base44.entities.FleetExpense.list("-expense_date",300) });
  const { data: maintenance=[] } = useQuery({ queryKey:["fm_hub"], queryFn:()=>base44.entities.FleetMaintenance.list("-service_date",200).catch(()=>[]) });
  const { data: odoRecords=[]  } = useQuery({ queryKey:["fo_hub"], queryFn:()=>base44.entities.FleetODO.list("-recorded_date",200).catch(()=>[]) });
  const { data: documents=[]   } = useQuery({ queryKey:["fd_hub"], queryFn:()=>base44.entities.FleetDocument.list().catch(()=>[]) });
  const { data: installments=[] } = useQuery({ queryKey:["fi_hub"], queryFn:()=>base44.entities.FleetInstallment.list("-due_date",500).catch(()=>[]) });

  const accountingMonth = (dateStr) => {
    if (!dateStr) return format(new Date(),"yyyy-MM");
    const d = new Date(dateStr);
    return d.getDate()<5 ? format(subMonths(d,1),"yyyy-MM") : format(d,"yyyy-MM");
  };

  if (roleLoading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid #e2e8f0",borderTopColor:"#1e293b",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (isDriver) return <AccessDenied/>;

  const now  = format(new Date(),"yyyy-MM");
  const prev = format(subMonths(new Date(),1),"yyyy-MM");
  const thisMonthTrips   = trips.filter(t=>accountingMonth(t.trip_date)===now);
  const thisMonthRev     = thisMonthTrips.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0);
  const thisMonthTripExp = thisMonthTrips.reduce((s,t)=>s+(t.total_trip_expense||0),0);
  const prevRev          = trips.filter(t=>accountingMonth(t.trip_date)===prev).reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0);
  const revTrend         = prevRev>0?((thisMonthRev-prevRev)/prevRev)*100:0;
  const thisMonthAddlExp = expenses.filter(e=>accountingMonth(e.expense_date)===now).reduce((s,e)=>s+(e.amount_pkr||0),0);
  const thisMonthMC      = maintenance.filter(m=>accountingMonth(m.service_date)===now).reduce((s,m)=>s+(m.cost||0),0);
  const thisMonthTotalCost = thisMonthTripExp + thisMonthAddlExp + thisMonthMC;
  const netProfit        = thisMonthRev - thisMonthTotalCost;

  const instVehicles  = vehicles.filter(v=>v.payment_method==="instalments"&&parseFloat(v.monthly_installment)>0);
  const overdueInst   = installments.filter(i=>i.status==="overdue").length;
  const overdueMain   = maintenance.filter(m=>m.status==="overdue").length;
  const totalAlerts   = overdueMain + overdueInst;
  const activeCount   = vehicles.filter(v=>v.status==="available"||v.status==="active").length;

  const today = new Date();
  const expiredDocs = documents.filter(d=>d.expiry_date&&new Date(d.expiry_date)<today).length;
  const urgentDocs  = documents.filter(d=>d.expiry_date&&differenceInDays(new Date(d.expiry_date),today)>=0&&differenceInDays(new Date(d.expiry_date),today)<=30).length;
  const docAlerts   = expiredDocs + urgentDocs;

  const QUICK_LINKS = [
    {to:"FleetTrips",        icon:Navigation,  label:"Trips",           desc:"Add & manage trips",        color:"linear-gradient(135deg,#064e3b,#10b981)",  count:`${trips.length} trips`},
    {to:"FleetExpenses",     icon:CreditCard,  label:"Expenses",        desc:"Track vehicle expenses",    color:"linear-gradient(135deg,#1e3a5f,#2563eb)",  count:`${expenses.length} records`},
    {to:"FleetPnL",          icon:BarChart2,   label:"P&L",             desc:"Profit & loss",             color:"linear-gradient(135deg,#1e1b4b,#7c3aed)"},
    {to:"FleetMaintenance",  icon:Wrench,      label:"Maintenance",     desc:"Service records",           color:"linear-gradient(135deg,#78350f,#f59e0b)",  alert:overdueMain, count:`${maintenance.length} records`},
    {to:"FleetODOTracking",  icon:Gauge,       label:"ODO & Fuel",      desc:"Odometer & consumption",    color:"linear-gradient(135deg,#042f2e,#0d9488)",  count:`${odoRecords.length} readings`},
    {to:"FuelRateManager",   icon:Fuel,        label:"Fuel Rates",      desc:"Manage fuel pricing",       color:"linear-gradient(135deg,#1e3a5f,#0ea5e9)"},
    {to:"FuelAnalytics",     icon:Gauge,       label:"Fuel Analytics",  desc:"KM/L efficiency & drops",   color:"linear-gradient(135deg,#7c2d12,#f97316)"},
    {to:"FleetDocs",         icon:Shield,      label:"Documents",       desc:"Certs, permits, insurance", color:"linear-gradient(135deg,#7f1d1d,#dc2626)",  alert:docAlerts, count:`${documents.length} docs`},
    {to:"FleetInstallments", icon:CreditCard,  label:"Instalments",     desc:"Schedule & KPIs",           color:"linear-gradient(135deg,#1e3a5f,#0369a1)",  alert:overdueInst, count:`${instVehicles.length} vehicles`},
    {onClick:()=>setPanel("vehicles"), icon:Truck, label:"Fleet Vehicles", desc:"Add / edit vehicles",    color:"linear-gradient(135deg,#0f172a,#1e293b)",  count:`${vehicles.length} vehicles`},
  ];

  return (
    <div className="fleet-root">
      <style>{SS}</style>

      {/* Inline panel overlay */}
      {panel && (
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.5)",overflowY:"auto",padding:16,overscrollBehavior:"contain"}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <p style={{color:"#fff",fontWeight:700,fontSize:14,margin:0}}>Fleet Vehicles</p>
              <button onClick={()=>setPanel(null)} style={{background:"#fff",border:"none",borderRadius:10,padding:"7px 16px",cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                <X size={14}/>Close
              </button>
            </div>
            <FleetVehiclesPanel vehicles={vehicles} trips={trips} expenses={expenses} maintenance={maintenance} fmt={fmt} canEdit={canEdit} canDeleteFleet={canDeleteFleet} qc={qc}/>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"12px 22px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 8px rgba(0,0,0,0.04)"}}>
        <div style={{maxWidth:1400,margin:"0 auto",display:"flex",alignItems:"center",gap:12}}>
          <Link to={createPageUrl("Dashboard")} style={{display:"flex",alignItems:"center",gap:5,color:"#64748b",textDecoration:"none",fontSize:12,fontWeight:600,padding:"4px 10px",borderRadius:8,border:"1px solid #e2e8f0",background:"#f8fafc",flexShrink:0}}>
            <ChevronLeft size={13}/>Dashboard
          </Link>
          <div style={{width:1,height:22,background:"#e2e8f0",flexShrink:0}}/>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
            <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Truck size={16} color="#fff"/>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <h1 style={{fontSize:16,fontWeight:800,color:"#0f172a",margin:0}}>Fleet Hub</h1>
                <div style={{display:"flex",alignItems:"center",gap:4,background:"#d1fae5",border:"1px solid #a7f3d0",borderRadius:20,padding:"2px 10px",flexShrink:0}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#10b981",display:"block"}}/>
                  <span style={{fontSize:11,color:"#059669",fontWeight:700}}>{activeCount} active</span>
                </div>
                {totalAlerts>0&&(
                  <div style={{display:"flex",alignItems:"center",gap:4,background:"#fef3c7",border:"1px solid #fde68a",borderRadius:20,padding:"2px 10px",flexShrink:0}}>
                    <Bell size={11} color="#d97706"/>
                    <span style={{fontSize:11,color:"#d97706",fontWeight:700}}>{totalAlerts} alerts</span>
                  </div>
                )}
              </div>
              <p style={{fontSize:11,color:"#94a3b8",margin:0}}>{vehicles.length} vehicles · {trips.length} trips · {format(new Date(),"dd MMM yyyy")}</p>
            </div>
          </div>
        </div>
      </div>

      <main style={{padding:"20px 22px",maxWidth:1400,margin:"0 auto"}} className="fm">

        {/* ── 1. KPI CARDS ─────────────────────────────────────────────── */}
        <div className="fg4" style={{marginBottom:20}}>
          <KpiCard label="Fleet Vehicles"       value={vehicles.length}     sub={`${activeCount} active`}                    icon={Truck}       gradient="linear-gradient(135deg,#1e3a5f,#2563eb)" onClick={()=>setPanel("vehicles")}/>
          <KpiCard label="This Month Revenue"   value={fmt(thisMonthRev)}   sub={`${thisMonthTrips.length} trips`}           icon={TrendingUp}  gradient="linear-gradient(135deg,#064e3b,#10b981)" trend={revTrend} to="FleetTrips"/>
          <KpiCard label="Net Profit (month)"   value={fmt(netProfit)}      sub={`Cost: ${fmt(thisMonthTotalCost)}`}         icon={DollarSign}  gradient={netProfit>=0?"linear-gradient(135deg,#065f46,#059669)":"linear-gradient(135deg,#7f1d1d,#dc2626)"} to="FleetPnL"/>
          <KpiCard label="Active Alerts"        value={totalAlerts}         sub={`${overdueMain} maint · ${overdueInst} inst`} icon={Bell}      gradient={totalAlerts>0?"linear-gradient(135deg,#78350f,#f59e0b)":"linear-gradient(135deg,#042f2e,#0d9488)"} to="FleetMaintenance"/>
        </div>

        {/* ── 2. ANALYTICS TABS (charts) ───────────────────────────────── */}
        <AnalyticsTabs
          trips={trips} expenses={expenses} maintenance={maintenance}
          odoRecords={odoRecords} installments={installments}
          vehicles={vehicles} fmt={fmt}
        />

        {/* ── 3. QUICK ACCESS LINKS ────────────────────────────────────── */}
        <Card style={{marginBottom:20}}>
          <p style={{fontWeight:700,fontSize:14,color:"#1e293b",marginBottom:14}}>Quick Access</p>
          <div className="fgql">
            {QUICK_LINKS.map((ql,i)=>(
              ql.onClick ? (
                <div key={i} className="ql-card" onClick={ql.onClick}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:ql.color,display:"flex",alignItems:"center",justifyContent:"center"}}><ql.icon size={18} color="#fff"/></div>
                    {ql.alert>0&&<span style={{background:"#dc2626",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 6px",borderRadius:99}}>{ql.alert}</span>}
                  </div>
                  <div>
                    <p style={{fontWeight:800,fontSize:13,color:"#1e293b",margin:0}}>{ql.label}</p>
                    <p style={{fontSize:11,color:"#94a3b8",margin:"2px 0 0"}}>{ql.desc}</p>
                    {ql.count&&<p style={{fontSize:11,color:"#64748b",margin:"2px 0 0",fontWeight:600}}>{ql.count}</p>}
                  </div>
                </div>
              ):(
                <Link key={i} to={createPageUrl(ql.to)} className="ql-card">
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:ql.color,display:"flex",alignItems:"center",justifyContent:"center"}}><ql.icon size={18} color="#fff"/></div>
                    {ql.alert>0&&<span style={{background:"#dc2626",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 6px",borderRadius:99}}>{ql.alert}</span>}
                  </div>
                  <div>
                    <p style={{fontWeight:800,fontSize:13,color:"#1e293b",margin:0}}>{ql.label}</p>
                    <p style={{fontSize:11,color:"#94a3b8",margin:"2px 0 0"}}>{ql.desc}</p>
                    {ql.count&&<p style={{fontSize:11,color:"#64748b",margin:"2px 0 0",fontWeight:600}}>{ql.count}</p>}
                  </div>
                </Link>
              )
            ))}
          </div>
        </Card>

        {/* ── 4. RECENT TRIPS ──────────────────────────────────────────── */}
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",margin:0}}>Recent Trips</p>
            <Link to={createPageUrl("FleetTrips")} style={{fontSize:12,color:"#10b981",fontWeight:700,textDecoration:"none"}}>View all →</Link>
          </div>
          {trips.slice(0,5).map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f8fafc"}}>
              <div>
                <p style={{fontSize:12,fontWeight:700,color:"#1e293b",margin:0}}>{t.vehicle_number||"—"}</p>
                <p style={{fontSize:10,color:"#64748b",margin:"2px 0 0"}}>{t.origin}→{t.destination} · {t.trip_date}</p>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{fontSize:12,fontWeight:700,color:"#059669",margin:0}}>{fmt(t.total_revenue||t.freight_income_pkr||0)}</p>
                <span style={{background:t.status==="completed"?"#d1fae5":"#fef3c7",color:t.status==="completed"?"#059669":"#d97706",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:99}}>{t.status}</span>
              </div>
            </div>
          ))}
          {!trips.length&&<p style={{color:"#94a3b8",fontSize:12,textAlign:"center",padding:20}}>No trips yet. <Link to={createPageUrl("FleetTrips")} style={{color:"#10b981",fontWeight:700}}>Add first trip →</Link></p>}
        </Card>

      </main>
    </div>
  );
}