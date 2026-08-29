import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Navigation, Search, Plus, X, Printer, ChevronLeft, TrendingUp, CheckCircle, DollarSign, Info, BookmarkCheck, Paperclip, FileText, Trash2, ExternalLink, Upload, ImageIcon, BarChart2 } from "lucide-react";
import FleetTripsAnalytics from "@/components/fleet/FleetTripsAnalytics";
import { printTable as printColorTable } from "@/utils/printUtils";
import ExportButton from "@/components/ExportButton";
import { toast } from "sonner";

const C = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
const SS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;}.fp{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}@media(max-width:900px){.g4{grid-template-columns:1fr 1fr;}}@media(max-width:600px){.g4{grid-template-columns:1fr 1fr;}.fm{padding:12px!important;}.ff{flex-wrap:wrap;}}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}`;

const Card = ({ children, style={} }) => <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:20, ...style }}>{children}</div>;
const TH = ({ c }) => <th style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", color:"#94a3b8" }}>{c}</th>;

// Using shared colorful printTable from utils/printUtils

// Accounting period rule: before 5th → prev month
const accountingMonth = (dateStr) => {
  if (!dateStr) return format(new Date(),"yyyy-MM");
  const d = new Date(dateStr);
  return d.getDate() < 5 ? format(subMonths(d,1),"yyyy-MM") : format(d,"yyyy-MM");
};

const Field = ({ label, children, span }) => (
  <div style={{ marginBottom:12, gridColumn:span?`span ${span}`:undefined }}>
    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</label>
    {children}
  </div>
);
const FI = ({ ...p }) => <input {...p} style={{ width:"100%", height:38, border:"1px solid #e2e8f0", borderRadius:10, padding:"0 12px", fontSize:13, outline:"none", boxSizing:"border-box" }}/>;
const FS = ({ value, onChange, opts, ph }) => (
  <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", height:38, border:"1px solid #e2e8f0", borderRadius:10, padding:"0 12px", fontSize:13, outline:"none", background:"#fff" }}>
    {ph && <option value="">{ph}</option>}
    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

const StatusBadge = ({ status }) => {
  const m = { completed:{l:"Completed",c:"#059669",b:"#d1fae5"}, pending:{l:"Pending",c:"#d97706",b:"#fef3c7"}, in_transit:{l:"In Transit",c:"#2563eb",b:"#dbeafe"}, cancelled:{l:"Cancelled",c:"#dc2626",b:"#fee2e2"} };
  const s = m[status]||{l:status||"—",c:"#64748b",b:"#f1f5f9"};
  return <span style={{ background:s.b, color:s.c, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99 }}>{s.l}</span>;
};

const EMPTY = {
  fleet_vehicle_number:"", driver_name:"", trip_date:format(new Date(),"yyyy-MM-dd"),
  trip_type:"intercity", origin:"", destination:"", client_name:"", status:"pending",
  freight_income_pkr:"", loading_charges:"", unloading_charges:"", detention_charges:"", other_income:"",
  fuel_cost:"", driver_allowance:"", toll_charges:"", loading_expense:"", unloading_expense:"",
  broker_commission:"", repair_on_road:"", other_expense:"", notes:"", receipt_urls:[]
};

// ── Double-entry accounting poster ──────────────────────────────────────────
// Posts to AccountingEntry so fleet data appears in Trial Balance, General Ledger etc.
const postFleetTripAccounting = async (trip, vehicleNumber) => {
  const date = trip.trip_date || format(new Date(),"yyyy-MM-dd");
  const ref  = `FLEET-TRIP-${vehicleNumber}-${date}`;
  const revenue = parseFloat(trip.total_revenue) || 0;
  const expense = parseFloat(trip.total_trip_expense) || 0;
  const entries = [];

  // 1. Revenue entry: Credit "Fleet Revenue" (income), Debit "Fleet Receivable" (asset)
  if (revenue > 0) {
    entries.push({
      date,
      account_type:   "income",
      account_name:   "Fleet Trip Revenue",
      debit:          0,
      credit:         revenue,
      payment_source: "fleet",
      narration:      `Fleet trip revenue — ${vehicleNumber} ${trip.origin||""}→${trip.destination||""} (${trip.client_name||"—"})`,
      reference:      ref,
    });
    entries.push({
      date,
      account_type:   "asset",
      account_name:   "Fleet Receivable",
      debit:          revenue,
      credit:         0,
      payment_source: "fleet",
      narration:      `Fleet trip revenue — ${vehicleNumber} ${trip.origin||""}→${trip.destination||""} (${trip.client_name||"—"})`,
      reference:      ref,
    });
  }

  // 2. Per-trip expense entries: Debit expense accounts, Credit "Fleet Cash Out"
  const expenseLines = [
    { field:"fuel_cost",          name:"Fleet Fuel Expense"           },
    { field:"driver_allowance",   name:"Fleet Driver Allowance"       },
    { field:"toll_charges",       name:"Fleet Toll & Route Charges"   },
    { field:"loading_expense",    name:"Fleet Loading Expense"        },
    { field:"unloading_expense",  name:"Fleet Unloading Expense"      },
    { field:"broker_commission",  name:"Fleet Broker Commission"      },
    { field:"repair_on_road",     name:"Fleet On-Road Repair"         },
    { field:"other_expense",      name:"Fleet Other Trip Expense"     },
  ];
  for (const line of expenseLines) {
    const amt = parseFloat(trip[line.field]) || 0;
    if (amt > 0) {
      entries.push({
        date,
        account_type:   "expense",
        account_name:   line.name,
        debit:          amt,
        credit:         0,
        payment_source: "fleet",
        narration:      `${line.name} — ${vehicleNumber} ${date}`,
        reference:      ref,
      });
      entries.push({
        date,
        account_type:   "expense",
        account_name:   "Fleet Cash Out",
        debit:          0,
        credit:         amt,
        payment_source: "fleet",
        narration:      `${line.name} — ${vehicleNumber} ${date}`,
        reference:      ref,
      });
    }
  }

  // Post all entries — individual creates (base44 doesn't batch)
  for (const entry of entries) {
    await base44.entities.AccountingEntry.create(entry).catch(err =>
      console.warn("Fleet accounting entry failed:", err.message)
    );
  }
};

export default function FleetTrips() {
  const { fmt } = useAppSettings();
  const { isAdmin, isManagement, isFleetManager, isDriver, isAccounting, isOperations, canDelete, loading: roleLoading } = useRole();
  const qc = useQueryClient();
  const canEdit = isAdmin || isManagement || isFleetManager || isAccounting || isOperations;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [postToAccounting, setPostToAccounting] = useState(true);

  const [activeTab, setActiveTab] = useState("trips"); // trips | analytics

  const [showTemplates, setShowTemplates] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleReceiptUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setForm(p => ({ ...p, receipt_urls: [...(p.receipt_urls || []), ...urls] }));
      toast.success(`${urls.length} file(s) attached`);
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeReceipt = (idx) => {
    setForm(p => ({ ...p, receipt_urls: p.receipt_urls.filter((_,i) => i !== idx) }));
  };

  const { data:trips=[] }            = useQuery({ queryKey:["ft_page"], queryFn:()=>base44.entities.FleetTrip.list("-trip_date",500) });
  const { data:fleetVehicles=[] }    = useQuery({ queryKey:["fv_trips"], queryFn:()=>base44.entities.FleetVehicle.list() });
  const { data:savedTemplates=[] }   = useQuery({ queryKey:["saved_trip_expenses"], queryFn:()=>base44.entities.SavedTripExpense.list().catch(()=>[]) });

  const saveMut = useMutation({
    mutationFn: async d => {
      const p = k => parseFloat(d[k])||0;
      const revenue = p("freight_income_pkr")+p("loading_charges")+p("unloading_charges")+p("detention_charges")+p("other_income");
      const expense = p("fuel_cost")+p("driver_allowance")+p("toll_charges")+p("loading_expense")+p("unloading_expense")+p("broker_commission")+p("repair_on_road")+p("other_expense");
      const data = {
        ...d,
        vehicle_number:      d.fleet_vehicle_number,
        freight_income_pkr:  p("freight_income_pkr"),
        loading_charges:     p("loading_charges"),
        unloading_charges:   p("unloading_charges"),
        detention_charges:   p("detention_charges"),
        other_income:        p("other_income"),
        fuel_cost:           p("fuel_cost"),
        driver_allowance:    p("driver_allowance"),
        toll_charges:        p("toll_charges"),
        loading_expense:     p("loading_expense"),
        unloading_expense:   p("unloading_expense"),
        broker_commission:   p("broker_commission"),
        repair_on_road:      p("repair_on_road"),
        other_expense:       p("other_expense"),
        total_revenue:       revenue,
        total_trip_expense:  expense,
        trip_net_profit:     revenue - expense,
        month:               accountingMonth(d.trip_date),
        receipt_urls:        d.receipt_urls || [],
      };
      const veh = fleetVehicles.find(v=>v.vehicle_number===d.fleet_vehicle_number);
      if (veh) data.fleet_vehicle_id = veh.id;

      // Save trip
      const saved = d.id
        ? await base44.entities.FleetTrip.update(d.id, data)
        : await base44.entities.FleetTrip.create(data);

      // Post double-entry accounting if enabled and trip is completed/confirmed
      if (postToAccounting && d.status !== "cancelled" && revenue > 0) {
        await postFleetTripAccounting(data, d.fleet_vehicle_number);
      }

      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries(["ft_page"]);
      qc.invalidateQueries(["accounting_entries"]); // refresh accounting pages
      toast.success("Trip saved" + (postToAccounting ? " & posted to accounts" : ""));
      setShowForm(false); setEditing(null); setForm(EMPTY);
    },
    onError: e => toast.error("Save failed: "+e.message),
  });

  const delMut = useMutation({ mutationFn:id=>base44.entities.FleetTrip.delete(id), onSuccess:()=>{qc.invalidateQueries(["ft_page"]);toast.success("Deleted");} });

  if (roleLoading) return <div className="fp" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}><style>{SS}</style><div style={{width:32,height:32,borderRadius:"50%",border:"3px solid #e2e8f0",borderTopColor:"#1e293b",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (isDriver) return <AccessDenied/>;

  const now = format(new Date(),"yyyy-MM");
  const thisMonthTrips = trips.filter(t=>accountingMonth(t.trip_date)===now);
  const totalRevAll = trips.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0);

  const filtered = trips.filter(t=>{
    const q=search.toLowerCase();
    const mQ=!q||[t.vehicle_number,t.driver_name,t.origin,t.destination,t.client_name].some(x=>x?.toLowerCase().includes(q));
    const mS=filterStatus==="all"||t.status===filterStatus;
    const mM=!filterMonth||accountingMonth(t.trip_date)===filterMonth;
    const mV=!filterVehicle||t.vehicle_number===filterVehicle;
    return mQ&&mS&&mM&&mV;
  });

  const months6 = Array.from({length:6},(_,i)=>{
    const m=format(subMonths(new Date(),5-i),"yyyy-MM");
    const mT=trips.filter(t=>accountingMonth(t.trip_date)===m);
    return {month:m.slice(5),revenue:mT.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0),count:mT.length,net:mT.reduce((s,t)=>s+(t.trip_net_profit||0),0)};
  });

  const vehicleBreakdown = fleetVehicles.map(v=>{
    const vT=trips.filter(t=>t.fleet_vehicle_id===v.id||t.vehicle_number===v.vehicle_number);
    return {vehicle:v.vehicle_number,trips:vT.length,revenue:vT.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0),net:vT.reduce((s,t)=>s+(t.trip_net_profit||0),0)};
  }).filter(v=>v.trips>0).sort((a,b)=>b.revenue-a.revenue);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const formRevenue = ["freight_income_pkr","loading_charges","unloading_charges","detention_charges","other_income"].reduce((s,k)=>s+(parseFloat(form[k])||0),0);
  const formExpense = ["fuel_cost","driver_allowance","toll_charges","loading_expense","unloading_expense","broker_commission","repair_on_road","other_expense"].reduce((s,k)=>s+(parseFloat(form[k])||0),0);

  const openEdit = r => { setEditing(r); setForm({...r, fleet_vehicle_number:r.vehicle_number||r.fleet_vehicle_number||"", receipt_urls:r.receipt_urls||[]}); setShowForm(true); };
  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };

  const applyTemplate = (tpl) => {
    setForm(p => ({
      ...p,
      trip_type:        tpl.trip_type || p.trip_type,
      origin:           tpl.origin    || p.origin,
      destination:      tpl.destination || p.destination,
      freight_income_pkr: tpl.trip_fare || p.freight_income_pkr,
      fuel_cost:        tpl.fuel_cost        ?? p.fuel_cost,
      driver_allowance: tpl.driver_allowance ?? p.driver_allowance,
      toll_charges:     tpl.toll_charges     ?? p.toll_charges,
      loading_expense:  tpl.loading_expense  ?? p.loading_expense,
      unloading_expense:tpl.unloading_expense?? p.unloading_expense,
      broker_commission:tpl.broker_commission?? p.broker_commission,
      repair_on_road:   tpl.repair_on_road   ?? p.repair_on_road,
      other_expense:    tpl.other_expense    ?? p.other_expense,
    }));
    setShowTemplates(false);
    toast.success(`Template "${tpl.template_name}" loaded!`);
  };

  return (
    <div className="fp">
      <style>{SS}</style>

      {/* TEMPLATE PICKER MODAL */}
      {showTemplates&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(135deg,#0f172a,#1e293b)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <BookmarkCheck size={16} color="#10b981"/>
                <h2 style={{fontSize:14,fontWeight:800,color:"#fff",margin:0}}>Load Saved Trip Template</h2>
              </div>
              <button onClick={()=>setShowTemplates(false)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={13} color="#fff"/></button>
            </div>
            <div style={{overflowY:"auto",flex:1,padding:16}}>
              {savedTemplates.length===0?(
                <div style={{textAlign:"center",padding:"32px 0"}}>
                  <BookmarkCheck size={36} color="#94a3b8" style={{margin:"0 auto 10px",display:"block",opacity:0.4}}/>
                  <p style={{fontSize:13,color:"#64748b",margin:0}}>No templates yet.</p>
                  <Link to={createPageUrl("SavedTripExpenses")} style={{fontSize:12,color:"#10b981",fontWeight:700}}>Create templates →</Link>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {savedTemplates.map(tpl=>{
                    const exp=(tpl.fuel_cost||0)+(tpl.driver_allowance||0)+(tpl.toll_charges||0)+(tpl.loading_expense||0)+(tpl.unloading_expense||0)+(tpl.broker_commission||0)+(tpl.repair_on_road||0)+(tpl.other_expense||0);
                    const net=(tpl.trip_fare||0)-exp;
                    return (
                      <button key={tpl.id} onClick={()=>applyTemplate(tpl)}
                        style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"12px 16px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,transition:"all 0.12s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="#10b981";e.currentTarget.style.background="#f0fdf4";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.background="#f8fafc";}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                            <span style={{background:tpl.trip_type==="local"?"#dbeafe":"#f0fdf4",color:tpl.trip_type==="local"?"#2563eb":"#059669",fontSize:9,fontWeight:700,padding:"1px 7px",borderRadius:99,textTransform:"uppercase"}}>{tpl.trip_type}</span>
                            <span style={{fontSize:13,fontWeight:800,color:"#1e293b"}}>{tpl.template_name}</span>
                          </div>
                          {(tpl.origin||tpl.destination)&&<p style={{fontSize:11,color:"#64748b",margin:0}}>{tpl.origin||"—"} → {tpl.destination||"—"}</p>}
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <p style={{fontSize:12,fontWeight:800,color:"#059669",margin:0}}>Fare: ₨{(tpl.trip_fare||0).toLocaleString()}</p>
                          <p style={{fontSize:11,color:"#dc2626",margin:"2px 0 0"}}>Exp: ₨{exp.toLocaleString()}</p>
                          <p style={{fontSize:11,fontWeight:700,color:net>=0?"#059669":"#dc2626",margin:"2px 0 0"}}>Net: ₨{net.toLocaleString()}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{padding:"12px 16px",borderTop:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc"}}>
              <Link to={createPageUrl("SavedTripExpenses")} style={{fontSize:12,color:"#10b981",fontWeight:700,textDecoration:"none"}}>Manage templates →</Link>
              <button onClick={()=>setShowTemplates(false)} style={{padding:"7px 18px",borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:16,overflowY:"auto"}}>
          <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:720,marginTop:16,marginBottom:16,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #e2e8f0",background:"linear-gradient(135deg,#0f172a,#1e293b)",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <h2 style={{fontSize:16,fontWeight:800,color:"#fff",margin:0}}>{editing?"Edit Trip":"Add Trip"}</h2>
                <p style={{fontSize:11,color:"#94a3b8",margin:"4px 0 0"}}>Complete costing · Period rule: before 5th → previous month</p>
              </div>
              <button onClick={()=>setShowForm(false)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={15} color="#fff"/></button>
            </div>

            <div style={{overflowY:"auto",flex:1,padding:"20px 22px"}}>
              {/* Trip type + Load Template */}
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                {[{v:"local",l:"🏙 Local (Within City)"},{v:"intercity",l:"🛣 Intercity"}].map(opt=>(
                  <button key={opt.v} onClick={()=>set("trip_type",opt.v)} style={{flex:1,padding:"10px",borderRadius:12,border:`2px solid ${form.trip_type===opt.v?"#10b981":"#e2e8f0"}`,background:form.trip_type===opt.v?"#f0fdf4":"#fff",color:form.trip_type===opt.v?"#059669":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    {opt.l}
                  </button>
                ))}
                <button onClick={()=>setShowTemplates(true)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",borderRadius:12,border:"2px solid #10b981",background:"#f0fdf4",color:"#059669",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>
                  <BookmarkCheck size={15}/>Load Template
                </button>
              </div>

              {/* Basic */}
              <div style={{background:"#f8fafc",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
                <p style={{fontSize:11,fontWeight:700,color:"#64748b",margin:"0 0 10px",textTransform:"uppercase"}}>Trip Details</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Field label="Fleet Vehicle">
                    <FS value={form.fleet_vehicle_number} onChange={v=>{const fv=fleetVehicles.find(x=>x.vehicle_number===v);set("fleet_vehicle_number",v);if(fv?.driver_name)set("driver_name",fv.driver_name);}} opts={fleetVehicles.map(v=>({v:v.vehicle_number,l:v.vehicle_number}))} ph="Select fleet vehicle"/>
                  </Field>
                  <Field label="Driver"><FI value={form.driver_name} onChange={e=>set("driver_name",e.target.value)} placeholder="Driver name"/></Field>
                  <Field label="Trip Date">
                    <FI type="date" value={form.trip_date} onChange={e=>set("trip_date",e.target.value)}/>
                    {form.trip_type==="intercity"&&form.trip_date&&<p style={{fontSize:10,color:"#7c3aed",marginTop:3,fontWeight:600}}>→ Counts to: {accountingMonth(form.trip_date)}</p>}
                  </Field>
                  <Field label="Status"><FS value={form.status} onChange={v=>set("status",v)} opts={["pending","in_transit","completed","cancelled"].map(s=>({v:s,l:s.replace("_"," ")}))}/></Field>
                  <Field label="Origin"><FI value={form.origin} onChange={e=>set("origin",e.target.value)} placeholder="Loading city"/></Field>
                  <Field label="Destination"><FI value={form.destination} onChange={e=>set("destination",e.target.value)} placeholder="Destination city"/></Field>
                  <Field label="Client Name" span={2}><FI value={form.client_name} onChange={e=>set("client_name",e.target.value)} placeholder="Client / consignor name"/></Field>
                </div>
              </div>

              {/* Revenue */}
              <div style={{background:"#f0fdf4",borderRadius:12,padding:"14px 16px",marginBottom:14,border:"1px solid #bbf7d0"}}>
                <p style={{fontSize:11,fontWeight:700,color:"#059669",margin:"0 0 10px",textTransform:"uppercase"}}>💰 Revenue / Income</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Field label="Freight Income (₨)"><FI type="number" value={form.freight_income_pkr} onChange={e=>set("freight_income_pkr",e.target.value)} placeholder="0"/></Field>
                  <Field label="Loading Charges (₨)"><FI type="number" value={form.loading_charges} onChange={e=>set("loading_charges",e.target.value)} placeholder="0"/></Field>
                  <Field label="Unloading Charges (₨)"><FI type="number" value={form.unloading_charges} onChange={e=>set("unloading_charges",e.target.value)} placeholder="0"/></Field>
                  <Field label="Detention Charges (₨)"><FI type="number" value={form.detention_charges} onChange={e=>set("detention_charges",e.target.value)} placeholder="0"/></Field>
                  <Field label="Other Income (₨)" span={2}><FI type="number" value={form.other_income} onChange={e=>set("other_income",e.target.value)} placeholder="0"/></Field>
                </div>
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                  <div style={{background:"#059669",color:"#fff",borderRadius:10,padding:"6px 16px",fontWeight:800,fontSize:13}}>Total Revenue: {fmt(formRevenue)}</div>
                </div>
              </div>

              {/* Expenses */}
              <div style={{background:"#fff5f5",borderRadius:12,padding:"14px 16px",marginBottom:14,border:"1px solid #fecaca"}}>
                <p style={{fontSize:11,fontWeight:700,color:"#dc2626",margin:"0 0 10px",textTransform:"uppercase"}}>🔻 Trip Expenses</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Field label="Fuel Cost (₨)"><FI type="number" value={form.fuel_cost} onChange={e=>set("fuel_cost",e.target.value)} placeholder="0"/></Field>
                  <Field label="Driver Allowance (₨)"><FI type="number" value={form.driver_allowance} onChange={e=>set("driver_allowance",e.target.value)} placeholder="0"/></Field>
                  <Field label="Toll Charges (₨)"><FI type="number" value={form.toll_charges} onChange={e=>set("toll_charges",e.target.value)} placeholder="0"/></Field>
                  <Field label="Broker Commission (₨)"><FI type="number" value={form.broker_commission} onChange={e=>set("broker_commission",e.target.value)} placeholder="0"/></Field>
                  <Field label="Loading Expense (₨)"><FI type="number" value={form.loading_expense} onChange={e=>set("loading_expense",e.target.value)} placeholder="0"/></Field>
                  <Field label="Unloading Expense (₨)"><FI type="number" value={form.unloading_expense} onChange={e=>set("unloading_expense",e.target.value)} placeholder="0"/></Field>
                  <Field label="On-Road Repair (₨)"><FI type="number" value={form.repair_on_road} onChange={e=>set("repair_on_road",e.target.value)} placeholder="0"/></Field>
                  <Field label="Other Expense (₨)"><FI type="number" value={form.other_expense} onChange={e=>set("other_expense",e.target.value)} placeholder="0"/></Field>
                </div>
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                  <div style={{background:"#dc2626",color:"#fff",borderRadius:10,padding:"6px 16px",fontWeight:800,fontSize:13}}>Total Expense: {fmt(formExpense)}</div>
                </div>
              </div>

              {/* Net summary */}
              <div style={{background:(formRevenue-formExpense)>=0?"linear-gradient(135deg,#064e3b,#10b981)":"linear-gradient(135deg,#7f1d1d,#dc2626)",borderRadius:14,padding:"14px 20px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.7)",margin:0,textTransform:"uppercase"}}>Trip Net Profit</p>
                  <p style={{fontSize:22,fontWeight:800,color:"#fff",margin:"4px 0 0"}}>{fmt(formRevenue-formExpense)}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:11,color:"rgba(255,255,255,0.7)",margin:0}}>Revenue</p>
                  <p style={{fontSize:14,fontWeight:700,color:"#fff",margin:0}}>{fmt(formRevenue)}</p>
                  <p style={{fontSize:11,color:"rgba(255,255,255,0.7)",margin:"4px 0 0"}}>Expenses</p>
                  <p style={{fontSize:14,fontWeight:700,color:"#fff",margin:0}}>{fmt(formExpense)}</p>
                </div>
              </div>

              {/* Accounting toggle */}
              <div style={{background:"#eff6ff",borderRadius:12,padding:"12px 16px",marginBottom:14,border:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Info size={16} color="#2563eb"/>
                  <div>
                    <p style={{fontSize:12,fontWeight:700,color:"#1d4ed8",margin:0}}>Post to Accounting Ledger</p>
                    <p style={{fontSize:11,color:"#3b82f6",margin:0}}>Creates double-entry records in Trial Balance, General Ledger & Cash Flow</p>
                  </div>
                </div>
                <button onClick={()=>setPostToAccounting(p=>!p)} style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:postToAccounting?"#2563eb":"#e2e8f0",color:postToAccounting?"#fff":"#64748b"}}>
                  {postToAccounting?"✓ ON":"OFF"}
                </button>
              </div>

              <Field label="Notes"><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Optional" style={{width:"100%",height:56,border:"1px solid #e2e8f0",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/></Field>

              {/* RECEIPT / DOCUMENT ATTACHMENTS */}
              <div style={{background:"#fafafa",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Paperclip size={14} color="#64748b"/>
                    <p style={{fontSize:11,fontWeight:700,color:"#475569",margin:0,textTransform:"uppercase"}}>Receipts & Documents</p>
                    {form.receipt_urls?.length>0&&<span style={{background:"#e2e8f0",color:"#475569",fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:99}}>{form.receipt_urls.length}</span>}
                  </div>
                  <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploading}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,border:"1px dashed #94a3b8",background:uploading?"#f1f5f9":"#fff",color:"#475569",fontSize:12,fontWeight:700,cursor:uploading?"not-allowed":"pointer"}}>
                    {uploading?<><div style={{width:12,height:12,border:"2px solid #94a3b8",borderTopColor:"#2563eb",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Uploading…</>:<><Upload size={13}/>Attach Files</>}
                  </button>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" style={{display:"none"}} onChange={handleReceiptUpload}/>
                </div>
                <p style={{fontSize:10,color:"#94a3b8",margin:"0 0 10px"}}>Attach fuel receipts, toll tickets, repair invoices (images or PDFs)</p>
                {form.receipt_urls?.length===0&&(
                  <div style={{textAlign:"center",padding:"16px 0",color:"#cbd5e1"}}>
                    <Paperclip size={24} style={{margin:"0 auto 6px",display:"block",opacity:0.4}}/>
                    <p style={{fontSize:11,margin:0}}>No attachments yet</p>
                  </div>
                )}
                {form.receipt_urls?.length>0&&(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {form.receipt_urls.map((url,idx)=>{
                      const isPdf = url.toLowerCase().includes(".pdf") || url.toLowerCase().includes("pdf");
                      const name = url.split("/").pop()?.split("?")[0] || `File ${idx+1}`;
                      return (
                        <div key={idx} style={{display:"flex",alignItems:"center",gap:8,background:"#fff",borderRadius:8,border:"1px solid #e2e8f0",padding:"7px 10px"}}>
                          <div style={{width:28,height:28,borderRadius:6,background:isPdf?"#fee2e2":"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            {isPdf?<FileText size={14} color="#dc2626"/>:<ImageIcon size={14} color="#2563eb"/>}
                          </div>
                          <span style={{flex:1,fontSize:11,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
                          <a href={url} target="_blank" rel="noreferrer" style={{color:"#2563eb",display:"flex",alignItems:"center",padding:4}}><ExternalLink size={12}/></a>
                          <button type="button" onClick={()=>removeReceipt(idx)} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",padding:4,display:"flex",alignItems:"center"}}><Trash2 size={12}/></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{padding:"14px 22px",borderTop:"1px solid #e2e8f0",display:"flex",gap:10,background:"#f8fafc"}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,height:42,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Cancel</button>
              <button onClick={()=>saveMut.mutate(editing?{...form,id:editing.id}:form)} disabled={saveMut.isPending||!form.fleet_vehicle_number}
                style={{flex:2,height:42,borderRadius:10,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,opacity:(!form.fleet_vehicle_number||saveMut.isPending)?0.6:1}}>
                {saveMut.isPending?"Saving & Posting…":"Save Trip"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:"rgba(15,23,42,0.97)",padding:"0 22px",display:"flex",alignItems:"center",height:50,gap:14,position:"sticky",top:0,zIndex:100}}>
        <Link to={createPageUrl("Fleet")} style={{display:"flex",alignItems:"center",gap:6,color:"#64748b",textDecoration:"none",fontSize:12,fontWeight:600}}><ChevronLeft size={14}/>Fleet Hub</Link>
        <div style={{width:1,height:20,background:"rgba(255,255,255,0.1)"}}/>
        <Navigation size={14} color="#10b981"/>
        <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>Fleet Trips</span>
        <span style={{background:"rgba(16,185,129,0.15)",color:"#10b981",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99}}>Posts to Accounts</span>
        <div style={{flex:1}}/>
        {/* Tab switcher */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.08)",borderRadius:8,padding:2,gap:2}}>
          {[{id:"trips",label:"Trips",icon:"🚛"},{id:"analytics",label:"Analytics",icon:"📊"}].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              style={{padding:"4px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:activeTab===tab.id?"#fff":"transparent",color:activeTab===tab.id?"#1e293b":"rgba(255,255,255,0.6)",transition:"all 0.15s"}}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <Link to={createPageUrl("SavedTripExpenses")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"rgba(16,185,129,0.15)",color:"#10b981",border:"1px solid rgba(16,185,129,0.3)",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",textDecoration:"none"}}><BookmarkCheck size={13}/>Templates</Link>
        {canEdit&&<button onClick={openNew} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"#10b981",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}><Plus size={13}/>Add Trip</button>}
        <ExportButton
          data={filtered}
          filename="fleet-trips"
          title="Fleet Trips Report"
          columns={[
            {label:"Date",key:"trip_date"},
            {label:"Vehicle",key:"vehicle_number"},
            {label:"Type",key:"trip_type"},
            {label:"Origin",key:"origin"},
            {label:"Destination",key:"destination"},
            {label:"Client",key:"client_name"},
            {label:"Revenue",key:"total_revenue",format:v=>fmt(v||0)},
            {label:"Expense",key:"total_trip_expense",format:v=>fmt(v||0)},
            {label:"Net Profit",key:"trip_net_profit",format:v=>fmt(v||0)},
            {label:"Status",key:"status"},
          ]}
        />
        <button onClick={()=>printColorTable("Fleet Trips",["Date","Acct Month","Vehicle","Type","Route","Revenue","Expense","Net","Status"],filtered.slice(0,300).map(t=>[t.trip_date,accountingMonth(t.trip_date),t.vehicle_number,t.trip_type||"intercity",`${t.origin}→${t.destination}`,fmt(t.total_revenue||t.freight_income_pkr),fmt(t.total_trip_expense),fmt(t.trip_net_profit),t.status]),{subtitle:`${filtered.length} trips · ${format(new Date(),"dd MMM yyyy")}`,summary:[{label:"Total Revenue",value:fmt(filtered.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0))},{label:"Total Expense",value:fmt(filtered.reduce((s,t)=>s+(t.total_trip_expense||0),0))},{label:"Net Profit",value:fmt(filtered.reduce((s,t)=>s+(t.trip_net_profit||0),0))}]})} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}><Printer size={13}/>Print</button>
      </div>

      <main style={{padding:"20px 22px",maxWidth:1400,margin:"0 auto"}} className="fm">

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <FleetTripsAnalytics trips={trips} fleetVehicles={fleetVehicles}/>
        )}

        {activeTab === "trips" && <>
        <div className="g4" style={{marginBottom:20}}>
          {[{l:"Total Trips",v:trips.length,g:"linear-gradient(135deg,#1e3a5f,#2563eb)",i:Navigation},{l:"This Month",v:thisMonthTrips.length,g:"linear-gradient(135deg,#064e3b,#10b981)",i:TrendingUp},{l:"Completed",v:trips.filter(t=>t.status==="completed").length,g:"linear-gradient(135deg,#1e1b4b,#7c3aed)",i:CheckCircle},{l:"Total Revenue",v:`₨${(totalRevAll/1000).toFixed(0)}K`,g:"linear-gradient(135deg,#065f46,#059669)",i:DollarSign}].map(k=>(
            <div key={k.l} style={{background:k.g,borderRadius:16,padding:"16px 18px",color:"#fff",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:12,top:12,opacity:0.15}}><k.i size={38}/></div>
              <p style={{fontSize:11,fontWeight:700,opacity:0.75,textTransform:"uppercase",margin:"0 0 6px"}}>{k.l}</p>
              <p style={{fontSize:24,fontWeight:800,margin:0}}>{k.v}</p>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Monthly Revenue & Net (6m)</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={months6} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip formatter={v=>fmt(v)}/>
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4,4,0,0]}/>
                <Bar dataKey="net" name="Net" fill="#3b82f6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Revenue per Fleet Vehicle</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={vehicleBreakdown.slice(0,7)} layout="vertical" margin={{top:0,right:10,left:10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <YAxis dataKey="vehicle" type="category" tick={{fontSize:9}} width={55}/>
                <Tooltip formatter={v=>fmt(v)}/>
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0,4,4,0]}>{vehicleBreakdown.slice(0,7).map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card>
          <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}} className="ff">
            <div style={{position:"relative",flex:1,minWidth:180}}>
              <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search trips…" style={{width:"100%",paddingLeft:30,height:36,border:"1px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{height:36,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 10px",fontSize:12,outline:"none"}}/>
            <select value={filterVehicle} onChange={e=>setFilterVehicle(e.target.value)} style={{height:36,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 10px",fontSize:12,outline:"none",background:"#fff"}}>
              <option value="">All Vehicles</option>
              {fleetVehicles.map(v=><option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>)}
            </select>
            {["all","pending","in_transit","completed","cancelled"].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)} style={{padding:"6px 12px",borderRadius:20,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",background:filterStatus===s?"#1e293b":"#f1f5f9",color:filterStatus===s?"#fff":"#64748b",textTransform:"capitalize",whiteSpace:"nowrap"}}>{s.replace("_"," ")}</button>
            ))}
          </div>
          <p style={{fontSize:11,color:"#94a3b8",marginBottom:10}}>{filtered.length} trips · Revenue: {fmt(filtered.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0))} · Net: {fmt(filtered.reduce((s,t)=>s+(t.trip_net_profit||0),0))}</p>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"2px solid #f1f5f9"}}>
                <TH c="Date"/><TH c="Acct Month"/><TH c="Vehicle"/><TH c="Type"/><TH c="Route"/><TH c="Client"/>
                <TH c="Revenue"/><TH c="Expense"/><TH c="Net"/><TH c="Status"/><TH c="Docs"/>{(canEdit||canDelete)&&<TH c=""/>}
              </tr></thead>
              <tbody>
                {filtered.slice(0,60).map((t,i)=>{
                  const rev=t.total_revenue||t.freight_income_pkr||0;
                  const exp=t.total_trip_expense||0;
                  const net=t.trip_net_profit!==undefined?t.trip_net_profit:rev-exp;
                  return (
                    <tr key={t.id} style={{borderBottom:"1px solid #f8fafc",background:i%2===0?"transparent":"#fafafa"}}>
                      <td style={{padding:"9px 12px",color:"#64748b"}}>{t.trip_date}</td>
                      <td style={{padding:"9px 12px"}}><span style={{background:"#ede9fe",color:"#7c3aed",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99}}>{accountingMonth(t.trip_date)}</span></td>
                      <td style={{padding:"9px 12px",fontWeight:700,color:"#1e293b"}}>{t.vehicle_number||"—"}</td>
                      <td style={{padding:"9px 12px"}}><span style={{background:t.trip_type==="local"?"#dbeafe":"#f0fdf4",color:t.trip_type==="local"?"#2563eb":"#059669",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99}}>{t.trip_type==="local"?"Local":"Intercity"}</span></td>
                      <td style={{padding:"9px 12px",color:"#1e293b"}}>{t.origin}<span style={{color:"#94a3b8",margin:"0 3px"}}>→</span>{t.destination}</td>
                      <td style={{padding:"9px 12px",color:"#64748b"}}>{t.client_name||"—"}</td>
                      <td style={{padding:"9px 12px",fontWeight:700,color:"#059669"}}>{fmt(rev)}</td>
                      <td style={{padding:"9px 12px",fontWeight:600,color:"#dc2626"}}>{fmt(exp)}</td>
                      <td style={{padding:"9px 12px",fontWeight:800,color:net>=0?"#059669":"#dc2626"}}>{fmt(net)}</td>
                      <td style={{padding:"9px 12px"}}><StatusBadge status={t.status}/></td>
                      <td style={{padding:"9px 12px"}}>
                        {t.receipt_urls?.length>0&&(
                          <span style={{display:"flex",alignItems:"center",gap:4,background:"#eff6ff",color:"#2563eb",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,width:"fit-content"}}>
                            <Paperclip size={10}/>{t.receipt_urls.length}
                          </span>
                        )}
                      </td>
                      {(canEdit||canDelete)&&<td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",gap:4}}>
                          {canEdit&&<button onClick={()=>openEdit(t)} style={{padding:"3px 8px",background:"#f0fdf4",color:"#059669",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>Edit</button>}
                          {canDelete&&<button onClick={()=>{if(window.confirm("Delete trip?"))delMut.mutate(t.id);}} style={{padding:"3px 8px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>Del</button>}
                        </div>
                      </td>}
                    </tr>
                  );
                })}
                {!filtered.length&&<tr><td colSpan={11} style={{padding:32,textAlign:"center",color:"#94a3b8"}}>No trips found</td></tr>}
              </tbody>
            </table>
            {filtered.length>60&&<p style={{textAlign:"center",color:"#94a3b8",fontSize:12,padding:"12px 0 0"}}>Showing 60 of {filtered.length}</p>}
          </div>
        </Card>
        </>}
      </main>
    </div>
  );
}