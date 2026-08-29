import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Gauge, Plus, X, Printer, ChevronLeft, Navigation, Activity, CheckCircle, Info, Fuel } from "lucide-react";
import { toast } from "sonner";

const SS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}
.fp{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
@media(max-width:900px){.g4{grid-template-columns:1fr 1fr;}.g2{grid-template-columns:1fr;}.g3{grid-template-columns:1fr 1fr;}}
@media(max-width:600px){.g4{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr;}.fm{padding:12px!important;}}
::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
`;

const Card = ({ children, style = {} }) => (
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:20, ...style }}>{children}</div>
);

const Field = ({ label, children, hint, required }) => (
  <div style={{ marginBottom:12 }}>
    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.04em" }}>
      {label}{required && <span style={{ color:"#ef4444", marginLeft:3 }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ fontSize:10, color:"#94a3b8", margin:"3px 0 0" }}>{hint}</p>}
  </div>
);

const FI = ({ ...p }) => (
  <input {...p} style={{ width:"100%", height:38, border:"1px solid #e2e8f0", borderRadius:10, padding:"0 12px", fontSize:13, outline:"none", boxSizing:"border-box", background:p.readOnly?"#f8fafc":"#fff", ...p.style }}/>
);

const FS = ({ value, onChange, opts, ph }) => (
  <select value={value} onChange={e=>onChange(e.target.value)} style={{ width:"100%", height:38, border:"1px solid #e2e8f0", borderRadius:10, padding:"0 12px", fontSize:13, outline:"none", background:"#fff" }}>
    {ph && <option value="">{ph}</option>}
    {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

const printTable = (title, headers, rows) => {
  const w = window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial;padding:20px;font-size:12px}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:#fff;padding:6px 10px;font-size:11px;text-align:left}td{padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:11px}</style></head><body><h2>${title}</h2><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c??""}</td>`).join("")}</tr>`).join("")}</tbody></table><p style="font-size:10px;color:#94a3b8;margin-top:12px">Printed: ${new Date().toLocaleString()}</p></body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),500);
};

const EntryBadge = ({ type }) => {
  const m = {
    odo_and_fuel: { l:"ODO + Fuel", c:"#059669", b:"#d1fae5" },
    odo_only:     { l:"ODO Only",   c:"#2563eb", b:"#dbeafe" },
    fuel_only:    { l:"Fuel Only",  c:"#d97706", b:"#fef3c7" },
  };
  const s = m[type] || { l:type||"—", c:"#64748b", b:"#f1f5f9" };
  return <span style={{ background:s.b, color:s.c, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>{s.l}</span>;
};

const StatusBadge = ({ status }) => (
  <span style={{ background:status==="recorded"?"#d1fae5":"#fef3c7", color:status==="recorded"?"#059669":"#d97706", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99 }}>
    {status==="recorded"?"Recorded":"Pending"}
  </span>
);

// Auto-derive entry_type from filled fields
const deriveType = (odo, fuel) => {
  const hasOdo  = odo  !== "" && odo  !== null && odo  !== undefined && String(odo).trim() !== "" && !isNaN(parseFloat(odo));
  const hasFuel = fuel !== "" && fuel !== null && fuel !== undefined && String(fuel).trim() !== "" && !isNaN(parseFloat(fuel));
  if (hasOdo && hasFuel) return "odo_and_fuel";
  if (hasOdo)            return "odo_only";
  if (hasFuel)           return "fuel_only";
  return "odo_and_fuel";
};

const EMPTY = {
  vehicle_id:"", vehicle_number:"",
  month: format(new Date(),"yyyy-MM"),
  recorded_date: format(new Date(),"yyyy-MM-dd"),
  entry_type:"odo_and_fuel",
  odo_reading:"", fuel_litres:"", fuel_cost_pkr:"", fuel_rate_per_litre:"",
  notes:"", status:"recorded",
};

// ══════════════════════════════════════════════════════════════════════════════
export default function FleetODOTracking() {
  const { fmt } = useAppSettings();
  const { isAdmin, isManagement, isFleetManager, isDriver, isAccounting, isOperations, canDelete, loading: roleLoading } = useRole();
  const qc = useQueryClient();
  const canEdit = isAdmin || isManagement || isFleetManager || isAccounting || isOperations;

  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [filterType, setFilterType]           = useState("all");
  const [showForm, setShowForm]               = useState(false);
  const [editing, setEditing]                 = useState(null);
  const [entityMissing, setEntityMissing]     = useState(false);
  const [form, setForm]                       = useState(EMPTY);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data:odoRecords=[], isError } = useQuery({
    queryKey:["fleetodo_page"],
    queryFn:()=>base44.entities.FleetODO.list("-recorded_date",500),
    onError:()=>setEntityMissing(true),
    retry:false,
  });
  const { data:fleetVehicles=[] } = useQuery({
    queryKey:["fv_odo"],
    queryFn:()=>base44.entities.FleetVehicle.list(),
  });
  const { data:fuelRates=[] } = useQuery({
    queryKey:["fr_odo"],
    queryFn:()=>base44.entities.FuelRate?.list("-effective_date",5).catch(()=>[]) ?? Promise.resolve([]),
  });

  const latestRate = useMemo(()=>{
    const r = fuelRates.find(r=>r.fuel_type==="Diesel"||r.fuel_type==="HSD");
    return r?.rate_per_litre || 0;
  },[fuelRates]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: d => {
      const entryType = deriveType(d.odo_reading, d.fuel_litres);
      const data = {
        vehicle_id:    d.vehicle_id,
        vehicle_number:d.vehicle_number,
        month:         d.month,
        recorded_date: d.recorded_date,
        entry_type:    entryType,
        notes:         d.notes || "",
        status:        d.status || "recorded",
      };
      // Include ODO only if filled
      if (d.odo_reading !== "" && d.odo_reading !== null && String(d.odo_reading).trim() !== "") {
        data.odo_reading = parseFloat(d.odo_reading) || 0;
      }
      // Include fuel fields only if litres filled
      if (d.fuel_litres !== "" && d.fuel_litres !== null && String(d.fuel_litres).trim() !== "") {
        const litres    = parseFloat(d.fuel_litres) || 0;
        const rate      = parseFloat(d.fuel_rate_per_litre) || latestRate || 0;
        const costEntry = parseFloat(d.fuel_cost_pkr);
        data.fuel_litres          = litres;
        data.fuel_rate_per_litre  = rate;
        data.fuel_cost_pkr        = !isNaN(costEntry) && costEntry > 0
          ? costEntry
          : rate > 0 ? Math.round(litres * rate) : 0;
      }
      return d.id
        ? base44.entities.FleetODO.update(d.id, data)
        : base44.entities.FleetODO.create(data);
    },
    onSuccess:()=>{ qc.invalidateQueries(["fleetodo_page"]); toast.success("Entry saved"); setShowForm(false); setEditing(null); setForm(EMPTY); },
    onError:e=>toast.error("Save failed: "+e.message),
  });

  const delMut = useMutation({
    mutationFn:id=>base44.entities.FleetODO.delete(id),
    onSuccess:()=>{ qc.invalidateQueries(["fleetodo_page"]); toast.success("Deleted"); },
  });

  // ── Stats per vehicle — MUST be before early returns (React hooks rule) ──
  const vehicleStats = useMemo(()=>fleetVehicles.map(v=>{
    const recs = odoRecords
      .filter(o=>o.vehicle_id===v.id||o.vehicle_number===v.vehicle_number)
      .sort((a,b)=>(b.recorded_date||"").localeCompare(a.recorded_date||""));
    const odoRecs  = recs.filter(r=>r.odo_reading!==undefined&&r.odo_reading!==null);
    const fuelRecs = recs.filter(r=>r.fuel_litres&&r.fuel_litres>0);
    const latestOdo = odoRecs[0];
    const oldestOdo = odoRecs[odoRecs.length-1];
    const totalKm        = latestOdo&&oldestOdo&&odoRecs.length>1 ? (latestOdo.odo_reading||0)-(oldestOdo.odo_reading||0) : 0;
    const totalFuelLitres= fuelRecs.reduce((s,r)=>s+(r.fuel_litres||0),0);
    const totalFuelCost  = fuelRecs.reduce((s,r)=>s+(r.fuel_cost_pkr||0),0);
    const avgKmPerLitre  = totalFuelLitres>0&&totalKm>0 ? (totalKm/totalFuelLitres).toFixed(1) : null;
    return {v,recs,latestOdo,totalKm,totalFuelLitres,totalFuelCost,avgKmPerLitre,odoRecs,fuelRecs};
  }).filter(s=>s.recs.length>0),[fleetVehicles,odoRecords]);

  const months6 = useMemo(()=>Array.from({length:6},(_,i)=>{
    const m = format(subMonths(new Date(),5-i),"yyyy-MM");
    const mR = odoRecords.filter(r=>(r.month||"").startsWith(m));
    return { month:m.slice(5), litres:mR.reduce((s,r)=>s+(r.fuel_litres||0),0), cost:mR.reduce((s,r)=>s+(r.fuel_cost_pkr||0),0), entries:mR.length };
  }),[odoRecords]);

  // ── Early returns AFTER all hooks ─────────────────────────────────────────
  if (roleLoading) return (
    <div className="fp" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}>
      <style>{SS}</style>
      <div style={{width:32,height:32,borderRadius:"50%",border:"3px solid #e2e8f0",borderTopColor:"#1e293b",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (isDriver) return <AccessDenied/>;

  // ── Form helpers ──────────────────────────────────────────────────────────
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleVehicleSelect = vNum => {
    const veh = fleetVehicles.find(x=>x.vehicle_number===vNum);
    setForm(p=>({...p, vehicle_number:vNum, vehicle_id:veh?.id||""}));
  };

  const handleLitresChange = val => {
    const litres = parseFloat(val)||0;
    const rate   = parseFloat(form.fuel_rate_per_litre)||latestRate||0;
    setForm(p=>({...p, fuel_litres:val, fuel_cost_pkr:rate>0&&litres>0?String(Math.round(litres*rate)):p.fuel_cost_pkr}));
  };

  const handleRateChange = val => {
    const rate   = parseFloat(val)||0;
    const litres = parseFloat(form.fuel_litres)||0;
    setForm(p=>({...p, fuel_rate_per_litre:val, fuel_cost_pkr:rate>0&&litres>0?String(Math.round(litres*rate)):p.fuel_cost_pkr}));
  };

  // At least one of odo or fuel must be filled
  const isValid = form.vehicle_number && form.recorded_date && (
    (String(form.odo_reading).trim()!=="") || (String(form.fuel_litres).trim()!=="")
  );

  const openNew = (vNum="") => {
    const veh = fleetVehicles.find(x=>x.vehicle_number===vNum);
    setEditing(null);
    setForm({...EMPTY, vehicle_id:veh?.id||"", vehicle_number:vNum, month:format(new Date(),"yyyy-MM"), recorded_date:format(new Date(),"yyyy-MM-dd"), fuel_rate_per_litre:latestRate?String(latestRate):""});
    setShowForm(true);
  };

  const openEdit = r => {
    setEditing(r);
    setForm({...EMPTY,...r, odo_reading:r.odo_reading!==undefined&&r.odo_reading!==null?String(r.odo_reading):"", fuel_litres:r.fuel_litres?String(r.fuel_litres):"", fuel_cost_pkr:r.fuel_cost_pkr?String(r.fuel_cost_pkr):"", fuel_rate_per_litre:r.fuel_rate_per_litre?String(r.fuel_rate_per_litre):""});
    setShowForm(true);
  };

  const displayStats = selectedVehicle ? vehicleStats.filter(s=>s.v.vehicle_number===selectedVehicle) : vehicleStats;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fp">
      <style>{SS}</style>

      {/* FORM MODAL */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:16,overflowY:"auto"}}>
          <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:560,marginTop:16,marginBottom:16,display:"flex",flexDirection:"column",overflow:"hidden"}}>

            {/* Modal header */}
            <div style={{padding:"18px 22px 14px",background:"linear-gradient(135deg,#042f2e,#0d9488)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <h2 style={{fontSize:15,fontWeight:800,color:"#fff",margin:0}}>{editing?"Edit ODO / Fuel Entry":"Add ODO / Fuel Entry"}</h2>
                  <p style={{fontSize:11,color:"rgba(255,255,255,0.7)",margin:"4px 0 0"}}>Fill ODO only, Fuel only, or both — at least one is required</p>
                </div>
                <button onClick={()=>setShowForm(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <X size={15} color="#fff"/>
                </button>
              </div>
              {latestRate>0&&(
                <div style={{marginTop:10,background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"6px 12px",display:"inline-flex",alignItems:"center",gap:6}}>
                  <Fuel size={12} color="#fff"/>
                  <span style={{fontSize:11,color:"#fff",fontWeight:600}}>Diesel rate: ₨{latestRate}/L — cost auto-calculated</span>
                </div>
              )}
            </div>

            {/* Modal body */}
            <div style={{overflowY:"auto",flex:1,padding:"20px 22px"}}>

              {/* Basic fields */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
                <Field label="Fleet Vehicle" required>
                  <FS value={form.vehicle_number} onChange={handleVehicleSelect} opts={fleetVehicles.map(v=>({v:v.vehicle_number,l:v.vehicle_number}))} ph="Select fleet vehicle"/>
                </Field>
                <Field label="Recorded Date" required>
                  <FI type="date" value={form.recorded_date} onChange={e=>set("recorded_date",e.target.value)}/>
                </Field>
                <Field label="Accounting Month" hint="Which month this counts to">
                  <input type="month" value={form.month} onChange={e=>set("month",e.target.value)} style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </Field>
                <Field label="Status">
                  <FS value={form.status} onChange={v=>set("status",v)} opts={[{v:"recorded",l:"Recorded"},{v:"pending",l:"Pending"}]}/>
                </Field>
              </div>

              {/* ODO section */}
              <div style={{background:"#eff6ff",borderRadius:12,padding:"14px 16px",marginBottom:12,border:"1px solid #bfdbfe"}}>
                <p style={{fontSize:11,fontWeight:800,color:"#1d4ed8",margin:"0 0 10px",textTransform:"uppercase",letterSpacing:"0.06em"}}>
                  🔢 Odometer Reading
                  <span style={{fontWeight:400,textTransform:"none",fontSize:10,color:"#3b82f6",marginLeft:6}}>optional if fuel-only</span>
                </p>
                <Field label="ODO Reading (km)">
                  <FI type="number" value={form.odo_reading} onChange={e=>set("odo_reading",e.target.value)} placeholder="e.g. 45000 — leave blank for fuel-only"/>
                </Field>
                {/* Distance preview */}
                {form.vehicle_number&&form.odo_reading&&(()=>{
                  const stat = vehicleStats.find(s=>s.v.vehicle_number===form.vehicle_number);
                  const prev = stat?.odoRecs[0];
                  if (!prev||editing?.id===prev?.id) return null;
                  const dist = parseFloat(form.odo_reading)-(prev.odo_reading||0);
                  return dist>0?(
                    <div style={{background:"#fff",borderRadius:8,padding:"7px 12px",border:"1px solid #bfdbfe",marginTop:4}}>
                      <p style={{fontSize:12,color:"#1d4ed8",margin:0,fontWeight:700}}>+{dist.toLocaleString()} km since last reading</p>
                      <p style={{fontSize:10,color:"#64748b",margin:"2px 0 0"}}>Prev: {(prev.odo_reading||0).toLocaleString()} km on {prev.recorded_date}</p>
                    </div>
                  ):dist<0?(
                    <div style={{background:"#fff5f5",borderRadius:8,padding:"7px 12px",border:"1px solid #fecaca",marginTop:4}}>
                      <p style={{fontSize:12,color:"#dc2626",margin:0,fontWeight:700}}>⚠ Lower than previous reading ({(prev.odo_reading||0).toLocaleString()} km)</p>
                    </div>
                  ):null;
                })()}
              </div>

              {/* Fuel section */}
              <div style={{background:"#fff7ed",borderRadius:12,padding:"14px 16px",marginBottom:12,border:"1px solid #fed7aa"}}>
                <p style={{fontSize:11,fontWeight:800,color:"#c2410c",margin:"0 0 10px",textTransform:"uppercase",letterSpacing:"0.06em"}}>
                  ⛽ Fuel Fill-up
                  <span style={{fontWeight:400,textTransform:"none",fontSize:10,color:"#ea580c",marginLeft:6}}>optional if ODO-only</span>
                </p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Field label="Fuel Added (Litres)">
                    <FI type="number" value={form.fuel_litres} onChange={e=>handleLitresChange(e.target.value)} placeholder="0 — leave blank for ODO-only"/>
                  </Field>
                  <Field label="Rate per Litre (₨)" hint={latestRate>0?`Current: ₨${latestRate}/L`:"Enter manually"}>
                    <FI type="number" value={form.fuel_rate_per_litre} onChange={e=>handleRateChange(e.target.value)} placeholder={latestRate?String(latestRate):"0"}/>
                  </Field>
                  <Field label="Fuel Cost Total (₨)" hint="Auto-calculated — override if needed">
                    <input type="number" value={form.fuel_cost_pkr} onChange={e=>set("fuel_cost_pkr",e.target.value)} placeholder="0"
                      style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",boxSizing:"border-box",background:(latestRate>0&&form.fuel_litres)?"#fef9f0":"#fff"}}/>
                  </Field>
                  {form.fuel_litres&&form.fuel_cost_pkr&&parseFloat(form.fuel_litres)>0&&parseFloat(form.fuel_cost_pkr)>0&&(
                    <div style={{display:"flex",alignItems:"center"}}>
                      <div style={{background:"#fff",borderRadius:10,padding:"8px 12px",border:"1px solid #fed7aa",width:"100%"}}>
                        <p style={{fontSize:10,color:"#94a3b8",margin:0}}>Effective rate</p>
                        <p style={{fontSize:14,fontWeight:800,color:"#c2410c",margin:"2px 0 0"}}>₨{(parseFloat(form.fuel_cost_pkr)/parseFloat(form.fuel_litres)).toFixed(2)}/L</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Entry type preview */}
              <div style={{background:"#f8fafc",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:12,color:"#64748b"}}>Entry type:</span>
                <EntryBadge type={deriveType(form.odo_reading,form.fuel_litres)}/>
              </div>

              {/* Validation warning */}
              {!isValid&&form.vehicle_number&&(
                <div style={{background:"#fff5f5",borderRadius:10,padding:"8px 14px",marginBottom:12,border:"1px solid #fecaca"}}>
                  <p style={{fontSize:12,color:"#dc2626",margin:0}}>Please fill in at least one: ODO reading or Fuel litres</p>
                </div>
              )}

              <Field label="Notes">
                <FI value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="e.g. pump name, city, partial fill, highway trip"/>
              </Field>
            </div>

            {/* Modal footer */}
            <div style={{padding:"14px 22px",borderTop:"1px solid #e2e8f0",display:"flex",gap:10,background:"#f8fafc"}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,height:42,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Cancel</button>
              <button onClick={()=>saveMut.mutate(editing?{...form,id:editing.id}:form)} disabled={saveMut.isPending||!isValid}
                style={{flex:2,height:42,borderRadius:10,border:"none",background:"#0d9488",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,opacity:(!isValid||saveMut.isPending)?0.5:1}}>
                {saveMut.isPending?"Saving…":"Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{background:"rgba(15,23,42,0.97)",padding:"0 22px",display:"flex",alignItems:"center",height:50,gap:14,position:"sticky",top:0,zIndex:100}}>
        <Link to={createPageUrl("Fleet")} style={{display:"flex",alignItems:"center",gap:6,color:"#64748b",textDecoration:"none",fontSize:12,fontWeight:600}}>
          <ChevronLeft size={14}/>Fleet Hub
        </Link>
        <div style={{width:1,height:20,background:"rgba(255,255,255,0.1)"}}/>
        <Gauge size={14} color="#0d9488"/>
        <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>ODO & Fuel</span>
        {latestRate>0&&<span style={{background:"rgba(13,148,136,0.2)",color:"#0d9488",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99}}>Diesel ₨{latestRate}/L</span>}
        <div style={{flex:1}}/>
        {canEdit&&<button onClick={()=>openNew(selectedVehicle)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"#0d9488",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}><Plus size={13}/>Add Entry</button>}
        <button onClick={()=>printTable("ODO & Fuel",["Vehicle","Month","Date","Type","ODO(km)","Fuel(L)","Cost","Rate/L","Status","Notes"],odoRecords.map(r=>[r.vehicle_number,r.month,r.recorded_date,(r.entry_type||"").replace(/_/g," "),r.odo_reading!=null?`${(r.odo_reading||0).toLocaleString()} km`:"—",r.fuel_litres?`${r.fuel_litres}L`:"—",r.fuel_cost_pkr?`₨${(r.fuel_cost_pkr||0).toLocaleString()}`:"—",r.fuel_rate_per_litre?`₨${r.fuel_rate_per_litre}/L`:"—",r.status,r.notes||"—"]))}
          style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          <Printer size={13}/>Print
        </button>
      </div>

      <main style={{padding:"20px 22px",maxWidth:1400,margin:"0 auto"}} className="fm">

        {/* Schema error banner */}
        {(isError||entityMissing)&&(
          <div style={{background:"#fff7ed",borderRadius:12,padding:"14px 18px",marginBottom:16,border:"1px solid #fde68a",display:"flex",gap:12,alignItems:"flex-start"}}>
            <Info size={16} color="#d97706" style={{flexShrink:0,marginTop:1}}/>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:"#92400e",margin:0}}>FleetODO entity not found or schema needs updating</p>
              <p style={{fontSize:12,color:"#92400e",margin:"6px 0 0"}}>
                Update your FleetODO entity with these fields: <strong>vehicle_id</strong> (string), <strong>vehicle_number</strong> (string),
                <strong>month</strong> (string), <strong>recorded_date</strong> (date), <strong>entry_type</strong> (enum: odo_only/fuel_only/odo_and_fuel),
                <strong>odo_reading</strong> (number, optional), <strong>fuel_litres</strong> (number, optional),
                <strong>fuel_cost_pkr</strong> (number, optional), <strong>fuel_rate_per_litre</strong> (number, optional),
                <strong>status</strong> (enum: pending/recorded), <strong>notes</strong> (string).
                Required fields: vehicle_id, vehicle_number, month, recorded_date, entry_type only.
              </p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="g4" style={{marginBottom:20}}>
          {[
            {l:"Total Distance",v:`${vehicleStats.reduce((s,v)=>s+v.totalKm,0).toLocaleString()} km`,g:"linear-gradient(135deg,#042f2e,#0d9488)",i:Navigation},
            {l:"Total Fuel",v:`${vehicleStats.reduce((s,v)=>s+v.totalFuelLitres,0).toLocaleString()} L`,g:"linear-gradient(135deg,#1e3a5f,#2563eb)",i:Fuel},
            {l:"Fuel Cost",v:fmt(vehicleStats.reduce((s,v)=>s+v.totalFuelCost,0)),g:"linear-gradient(135deg,#7f1d1d,#dc2626)",i:Activity},
            {l:"Total Entries",v:odoRecords.length,g:"linear-gradient(135deg,#1e1b4b,#7c3aed)",i:CheckCircle},
          ].map(k=>(
            <div key={k.l} style={{background:k.g,borderRadius:16,padding:"16px 18px",color:"#fff",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:12,top:12,opacity:0.15}}><k.i size={38}/></div>
              <p style={{fontSize:11,fontWeight:700,opacity:0.75,textTransform:"uppercase",margin:"0 0 6px"}}>{k.l}</p>
              <p style={{fontSize:22,fontWeight:800,margin:0}}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="g2" style={{marginBottom:16}}>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Monthly Fuel (Litres)</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={months6} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Bar dataKey="litres" name="Litres" fill="#0d9488" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Fuel Averages (km/L)</p>
            <div style={{overflowY:"auto",maxHeight:160}}>
              {vehicleStats.filter(s=>s.avgKmPerLitre).map(s=>(
                <div key={s.v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f8fafc"}}>
                  <div>
                    <p style={{fontSize:12,fontWeight:700,color:"#1e293b",margin:0}}>{s.v.vehicle_number}</p>
                    <p style={{fontSize:10,color:"#64748b",margin:0}}>{s.totalKm.toLocaleString()} km · {s.totalFuelLitres.toLocaleString()} L</p>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{fontSize:15,fontWeight:800,color:"#0d9488",margin:0}}>{s.avgKmPerLitre} km/L</p>
                    <p style={{fontSize:10,color:"#94a3b8",margin:0}}>{fmt(s.totalFuelCost)}</p>
                  </div>
                </div>
              ))}
              {!vehicleStats.filter(s=>s.avgKmPerLitre).length&&<p style={{color:"#94a3b8",fontSize:12,textAlign:"center",padding:20}}>Add both ODO and fuel entries to see averages</p>}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>Vehicle:</span>
          <button onClick={()=>setSelectedVehicle("")} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",background:!selectedVehicle?"#1e293b":"#f1f5f9",color:!selectedVehicle?"#fff":"#64748b"}}>All</button>
          {vehicleStats.map(s=>(
            <button key={s.v.id} onClick={()=>setSelectedVehicle(s.v.vehicle_number)}
              style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",background:selectedVehicle===s.v.vehicle_number?"#0d9488":"#f1f5f9",color:selectedVehicle===s.v.vehicle_number?"#fff":"#64748b"}}>
              {s.v.vehicle_number}
            </button>
          ))}
          <span style={{fontSize:12,color:"#64748b",fontWeight:600,marginLeft:8}}>Type:</span>
          {[{v:"all",l:"All"},{v:"odo_and_fuel",l:"ODO + Fuel"},{v:"odo_only",l:"ODO Only"},{v:"fuel_only",l:"Fuel Only"}].map(t=>(
            <button key={t.v} onClick={()=>setFilterType(t.v)}
              style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",background:filterType===t.v?"#7c3aed":"#f1f5f9",color:filterType===t.v?"#fff":"#64748b"}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Per-vehicle cards */}
        {displayStats.map(s=>(
          <Card key={s.v.id} style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <p style={{fontWeight:800,fontSize:14,color:"#1e293b",margin:0}}>{s.v.vehicle_number}</p>
                <p style={{fontSize:11,color:"#64748b",margin:"2px 0 0"}}>{s.v.vehicle_type||"—"} · {s.v.driver_name||"No driver"}</p>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                {s.latestOdo&&(
                  <div style={{background:"#f0fdfa",borderRadius:10,padding:"6px 14px",textAlign:"center",border:"1px solid #99f6e4"}}>
                    <p style={{fontSize:10,color:"#0d9488",margin:0,fontWeight:700}}>LATEST ODO</p>
                    <p style={{fontSize:16,fontWeight:800,color:"#0d9488",margin:"2px 0 0"}}>{(s.latestOdo.odo_reading||0).toLocaleString()} km</p>
                  </div>
                )}
                {s.avgKmPerLitre&&(
                  <div style={{background:"#fff7ed",borderRadius:10,padding:"6px 14px",textAlign:"center",border:"1px solid #fed7aa"}}>
                    <p style={{fontSize:10,color:"#c2410c",margin:0,fontWeight:700}}>FUEL AVG</p>
                    <p style={{fontSize:16,fontWeight:800,color:"#c2410c",margin:"2px 0 0"}}>{s.avgKmPerLitre} km/L</p>
                  </div>
                )}
                {canEdit&&<button onClick={()=>openNew(s.v.vehicle_number)} style={{padding:"7px 14px",background:"#0d9488",color:"#fff",border:"none",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Entry</button>}
              </div>
            </div>

            <div className="g3" style={{marginBottom:12}}>
              {[
                {l:"Tracked Distance",v:s.totalKm>0?`+${s.totalKm.toLocaleString()} km`:"—"},
                {l:"Total Fuel",v:s.totalFuelLitres>0?`${s.totalFuelLitres.toLocaleString()} L`:"—"},
                {l:"Fuel Cost",v:s.totalFuelCost>0?fmt(s.totalFuelCost):"—"},
              ].map(k=>(
                <div key={k.l} style={{background:"#f8fafc",borderRadius:10,padding:"8px 12px",textAlign:"center"}}>
                  <p style={{fontSize:10,color:"#94a3b8",margin:0}}>{k.l}</p>
                  <p style={{fontSize:13,fontWeight:700,color:"#1e293b",margin:"3px 0 0"}}>{k.v}</p>
                </div>
              ))}
            </div>

            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{borderBottom:"1px solid #f1f5f9"}}>
                  {["Month","Date","Type","ODO (km)","Distance","Fuel (L)","Fuel Cost","Rate/L","Status","Notes",""].map(h=>(
                    <th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#94a3b8",fontWeight:700,fontSize:9,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {s.recs.filter(r=>filterType==="all"||r.entry_type===filterType).slice(0,10).map((r,i)=>{
                    const odoIdx = s.odoRecs.findIndex(x=>x.id===r.id);
                    const prevOdo = s.odoRecs[odoIdx+1];
                    const dist = (r.odo_reading!==null&&r.odo_reading!==undefined&&prevOdo)
                      ? (r.odo_reading||0)-(prevOdo.odo_reading||0) : null;
                    return (
                      <tr key={r.id} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"transparent":"#fafafa"}}>
                        <td style={{padding:"7px 10px",fontWeight:700,color:"#1e293b"}}>{r.month}</td>
                        <td style={{padding:"7px 10px",color:"#64748b",whiteSpace:"nowrap"}}>{r.recorded_date}</td>
                        <td style={{padding:"7px 10px"}}><EntryBadge type={r.entry_type}/></td>
                        <td style={{padding:"7px 10px",fontWeight:600,color:"#1e293b"}}>{r.odo_reading!=null?`${(r.odo_reading||0).toLocaleString()}`:"—"}</td>
                        <td style={{padding:"7px 10px",color:dist>0?"#059669":"#94a3b8",fontWeight:dist>0?700:400}}>{dist!==null?(dist>0?`+${dist.toLocaleString()}`:"—"):"—"}</td>
                        <td style={{padding:"7px 10px",color:"#2563eb"}}>{r.fuel_litres?`${r.fuel_litres} L`:"—"}</td>
                        <td style={{padding:"7px 10px",color:"#dc2626",fontWeight:r.fuel_cost_pkr?700:400}}>{r.fuel_cost_pkr?fmt(r.fuel_cost_pkr):"—"}</td>
                        <td style={{padding:"7px 10px",color:"#64748b"}}>{r.fuel_rate_per_litre?`₨${r.fuel_rate_per_litre}`:"—"}</td>
                        <td style={{padding:"7px 10px"}}><StatusBadge status={r.status}/></td>
                        <td style={{padding:"7px 10px",color:"#94a3b8",maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.notes||"—"}</td>
                        <td style={{padding:"7px 10px"}}>
                          {(canEdit||canDelete)&&<div style={{display:"flex",gap:4}}>
                            {canEdit&&<button onClick={()=>openEdit(r)} style={{padding:"3px 8px",background:"#f0fdf4",color:"#059669",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>Edit</button>}
                            {canDelete&&<button onClick={()=>{if(window.confirm("Delete?"))delMut.mutate(r.id);}} style={{padding:"3px 8px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>Del</button>}
                          </div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {s.recs.filter(r=>filterType==="all"||r.entry_type===filterType).length>10&&<p style={{textAlign:"center",color:"#94a3b8",fontSize:11,padding:"8px 0 0"}}>Showing 10 of {s.recs.length} entries</p>}
            </div>
          </Card>
        ))}

        {vehicleStats.length===0&&!isError&&(
          <Card>
            <div style={{textAlign:"center",padding:"36px 0"}}>
              <Gauge size={44} color="#94a3b8" style={{margin:"0 auto 12px",display:"block"}}/>
              <p style={{fontWeight:700,color:"#1e293b",margin:0,fontSize:15}}>No entries yet</p>
              <p style={{color:"#64748b",fontSize:13,margin:"8px auto 0",maxWidth:400}}>
                Record monthly ODO readings, fuel fill-ups, or both. Fuel-only entries are fine — ODO is not required.
              </p>
              {canEdit&&<button onClick={()=>openNew("")} style={{marginTop:16,padding:"9px 22px",background:"#0d9488",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add First Entry</button>}
            </div>
          </Card>
        )}

      </main>
    </div>
  );
}