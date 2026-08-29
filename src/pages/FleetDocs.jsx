import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, differenceInDays, addDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { FileText, Plus, X, Printer, ChevronLeft, AlertTriangle, CheckCircle, Clock, Shield, Upload, Eye, Download, Calendar, Search, Info } from "lucide-react";
import { printTable as printColorTable } from "@/utils/printUtils";
import { toast } from "sonner";

const SS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}
.fp{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:900px){.g4{grid-template-columns:1fr 1fr;}.g2{grid-template-columns:1fr;}}
@media(max-width:600px){.g4{grid-template-columns:1fr 1fr;}.fm{padding:12px!important;}.ff{flex-wrap:wrap;}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
.pulse{animation:pulse 2s infinite;}
::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
`;

const Card = ({ children, style={} }) => <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:20, ...style }}>{children}</div>;

const DOC_TYPES = [
  "Registration Book","Insurance Policy","Fitness Certificate","Route Permit",
  "Tax Token","PFA Certificate","Driving Licence","Weighbridge Certificate",
  "Route Survey","Goods Declaration","Import Permit","Export Permit","Other"
];

// Expiry status logic
const expiryStatus = (dateStr) => {
  if (!dateStr) return { label:"No Expiry", color:"#64748b", bg:"#f1f5f9", days:null, level:"none" };
  const days = differenceInDays(new Date(dateStr), new Date());
  if (days < 0)   return { label:`Expired ${Math.abs(days)}d ago`, color:"#dc2626", bg:"#fee2e2", days, level:"expired" };
  if (days <= 7)  return { label:`${days}d left`,  color:"#dc2626", bg:"#fee2e2", days, level:"critical" };
  if (days <= 30) return { label:`${days}d left`,  color:"#d97706", bg:"#fef3c7", days, level:"soon" };
  if (days <= 60) return { label:`${days}d left`,  color:"#ca8a04", bg:"#fefce8", days, level:"upcoming" };
  return             { label:`${days}d left`,       color:"#059669", bg:"#d1fae5", days, level:"ok" };
};

const ExpiryBadge = ({ dateStr }) => {
  const s = expiryStatus(dateStr);
  return (
    <span className={s.level==="expired"||s.level==="critical"?"pulse":""} style={{ background:s.bg, color:s.color, fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:99, whiteSpace:"nowrap" }}>
      {s.level==="expired"?"🔴":s.level==="critical"?"🔴":s.level==="soon"?"🟡":s.level==="upcoming"?"⚠":s.level==="none"?"—":"✓"} {s.label}
    </span>
  );
};

// Legacy printTable — replaced by colorful version below
const _printTable = (title, headers, rows) => {
  const w = window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial;padding:20px;font-size:12px}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:#fff;padding:6px 10px;font-size:11px;text-align:left}td{padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:11px}</style></head><body><h2>${title}</h2><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c??""}</td>`).join("")}</tr>`).join("")}</tbody></table><p style="font-size:10px;color:#94a3b8;margin-top:12px">Printed: ${new Date().toLocaleString()}</p></body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),500);
};

// ── DOCUMENT FORM ────────────────────────────────────────────────────────────
function DocFormModal({ record, vehicles, onClose, onSave, saving }) {
  const [form, setForm] = useState(record || {
    fleet_vehicle_id:"", vehicle_number:"",
    document_type:"Registration Book", document_number:"",
    issue_date:"", expiry_date:"", issued_by:"",
    alert_days_before:30, document_url:"", notes:""
  });
  const s = (k,v) => setForm(p=>({...p,[k]:v}));
  const FI = ({field,...p}) => <input value={form[field]||""} onChange={e=>s(field,e.target.value)} {...p} style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>;
  const F  = ({label,children,hint}) => (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
      {children}
      {hint&&<p style={{fontSize:10,color:"#94a3b8",margin:"3px 0 0"}}>{hint}</p>}
    </div>
  );

  const daysLeft = form.expiry_date ? differenceInDays(new Date(form.expiry_date), new Date()) : null;
  const alertDate = form.expiry_date && form.alert_days_before
    ? format(addDays(new Date(form.expiry_date), -parseInt(form.alert_days_before)||0),"yyyy-MM-dd") : null;

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:600,marginTop:16,marginBottom:16,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #e2e8f0",background:"linear-gradient(135deg,#0f172a,#1e293b)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:800,color:"#fff",margin:0}}>{record?"Edit Document":"Add Document"}</h2>
            <p style={{fontSize:11,color:"#94a3b8",margin:"3px 0 0"}}>Attach registration docs, insurance, fitness certs, permits</p>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={15} color="#fff"/></button>
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"20px 22px"}}>

          {/* Vehicle + Doc type */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
            <F label="Fleet Vehicle *">
              <select value={form.vehicle_number} onChange={e=>{const v=vehicles.find(x=>x.vehicle_number===e.target.value);setForm(p=>({...p,vehicle_number:e.target.value,fleet_vehicle_id:v?.id||""}));}} style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",background:"#fff"}}>
                <option value="">Select fleet vehicle</option>
                {vehicles.map(v=><option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>)}
              </select>
            </F>
            <F label="Document Type *">
              <select value={form.document_type} onChange={e=>s("document_type",e.target.value)} style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",background:"#fff"}}>
                {DOC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </F>
          </div>

          {/* Doc details */}
          <div style={{background:"#f8fafc",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:800,color:"#64748b",margin:"0 0 10px",textTransform:"uppercase"}}>Document Details</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <F label="Document / Policy Number"><FI field="document_number" placeholder="Certificate or policy number"/></F>
              <F label="Issued By"><FI field="issued_by" placeholder="Issuing authority"/></F>
              <F label="Issue Date"><FI field="issue_date" type="date"/></F>
              <F label="Expiry Date *"><FI field="expiry_date" type="date"/></F>
            </div>
            {daysLeft !== null && (
              <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:12,color:"#64748b"}}>Status:</span>
                <ExpiryBadge dateStr={form.expiry_date}/>
                {alertDate && <span style={{fontSize:11,color:"#94a3b8"}}>Alert will fire: {alertDate}</span>}
              </div>
            )}
          </div>

          {/* Alert + upload */}
          <div style={{background:"#eff6ff",borderRadius:12,padding:"14px 16px",marginBottom:14,border:"1px solid #bfdbfe"}}>
            <p style={{fontSize:11,fontWeight:800,color:"#1d4ed8",margin:"0 0 10px",textTransform:"uppercase"}}>Alert & Document File</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <F label="Alert Days Before Expiry" hint="Default 30 — you'll be alerted this many days before">
                <FI field="alert_days_before" type="number" placeholder="30"/>
              </F>
              <F label="Document URL / File Link" hint="Paste URL of uploaded PDF, or base44 will attach file if file field is available">
                <FI field="document_url" placeholder="https://… or upload via base44"/>
              </F>
            </div>
          </div>

          <F label="Notes">
            <textarea value={form.notes||""} onChange={e=>s("notes",e.target.value)} placeholder="Optional notes about this document" style={{width:"100%",height:60,border:"1px solid #e2e8f0",borderRadius:10,padding:"8px 12px",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
          </F>
        </div>

        <div style={{padding:"14px 22px",borderTop:"1px solid #e2e8f0",display:"flex",gap:10,background:"#f8fafc"}}>
          <button onClick={onClose} style={{flex:1,height:42,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Cancel</button>
          <button onClick={()=>onSave(form)} disabled={saving||!form.vehicle_number||!form.expiry_date}
            style={{flex:2,height:42,borderRadius:10,border:"none",background:"#dc2626",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,opacity:(!form.vehicle_number||!form.expiry_date||saving)?0.5:1}}>
            {saving?"Saving…":"Save Document"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function FleetDocs() {
  const { fmt } = useAppSettings();
  const { isAdmin, isManagement, isFleetManager, isDriver, isAccounting, isOperations, canDelete, loading: roleLoading } = useRole();
  const qc = useQueryClient();
  const canEdit = isAdmin || isManagement || isFleetManager || isAccounting || isOperations;
  const [searchParams] = useSearchParams();
  const prefilterVehicle = searchParams.get("vehicle") || "";

  const [search, setSearch]       = useState(prefilterVehicle);
  const [filterType, setFT]       = useState("all");
  const [filterStatus, setFS]     = useState("all"); // all | expired | critical | soon | ok
  const [filterVehicle, setFV]    = useState(prefilterVehicle);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [entityMissing, setEM]    = useState(false);

  const { data:documents=[], isError } = useQuery({
    queryKey:["fd_page"],
    queryFn:()=>base44.entities.FleetDocument.list("-expiry_date",500),
    onError:()=>setEM(true),
    retry:false,
  });
  const { data:vehicles=[] } = useQuery({ queryKey:["fv_docs"], queryFn:()=>base44.entities.FleetVehicle.list() });

  const saveMut = useMutation({
    mutationFn: d => {
      const data={...d, alert_days_before:parseInt(d.alert_days_before)||30};
      // Auto-set status
      const days=d.expiry_date?differenceInDays(new Date(d.expiry_date),new Date()):null;
      data.status=days===null?"valid":days<0?"expired":days<=30?"expiring_soon":"valid";
      return d.id?base44.entities.FleetDocument.update(d.id,data):base44.entities.FleetDocument.create(data);
    },
    onSuccess:()=>{ qc.invalidateQueries(["fd_page"]); toast.success("Document saved"); setShowForm(false); setEditing(null); },
    onError:e=>toast.error("Save failed: "+e.message),
  });
  const delMut = useMutation({ mutationFn:id=>base44.entities.FleetDocument.delete(id), onSuccess:()=>qc.invalidateQueries(["fd_page"]) });

  if (roleLoading) return <div className="fp" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}><style>{SS}</style><div style={{width:32,height:32,borderRadius:"50%",border:"3px solid #e2e8f0",borderTopColor:"#1e293b",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (isDriver) return <AccessDenied/>;

  // Enrich with days
  const docsEnriched = useMemo(()=>documents.map(d=>({...d,...expiryStatus(d.expiry_date)})).sort((a,b)=>(a.days??9999)-(b.days??9999)),[documents]);

  const expired   = docsEnriched.filter(d=>d.level==="expired");
  const critical  = docsEnriched.filter(d=>d.level==="critical");
  const soon      = docsEnriched.filter(d=>d.level==="soon");
  const upcoming  = docsEnriched.filter(d=>d.level==="upcoming");
  const ok        = docsEnriched.filter(d=>d.level==="ok"||d.level==="none");

  const filtered = docsEnriched.filter(d=>{
    const q=search.toLowerCase();
    const mQ=!q||[d.vehicle_number,d.document_type,d.document_number,d.issued_by].some(x=>x?.toLowerCase().includes(q));
    const mT=filterType==="all"||d.document_type===filterType;
    const mV=!filterVehicle||d.vehicle_number===filterVehicle;
    const mS=filterStatus==="all"||(filterStatus==="expired"&&d.level==="expired")||(filterStatus==="critical"&&d.level==="critical")||(filterStatus==="soon"&&(d.level==="soon"||d.level==="upcoming"))||(filterStatus==="ok"&&(d.level==="ok"||d.level==="none"));
    return mQ&&mT&&mV&&mS;
  });

  // Per-vehicle doc summary
  const vehicleDocSummary = vehicles.map(v=>{
    const vDocs=docsEnriched.filter(d=>d.vehicle_number===v.vehicle_number);
    const worst=vDocs.reduce((w,d)=>{
      const order=["expired","critical","soon","upcoming","ok","none"];
      return order.indexOf(d.level)<order.indexOf(w)?d.level:w;
    },"none");
    return {v,docs:vDocs,worst};
  }).filter(x=>x.docs.length>0).sort((a,b)=>{
    const order=["expired","critical","soon","upcoming","ok","none"];
    return order.indexOf(a.worst)-order.indexOf(b.worst);
  });

  // Category breakdown chart
  const typeChart = DOC_TYPES.map(t=>{
    const td=docsEnriched.filter(d=>d.document_type===t);
    const hasExpired=td.some(d=>d.level==="expired"||d.level==="critical");
    const hasSoon=td.some(d=>d.level==="soon"||d.level==="upcoming");
    return {type:t.length>16?t.slice(0,16)+"…":t,count:td.length,color:hasExpired?"#ef4444":hasSoon?"#f59e0b":"#10b981"};
  }).filter(t=>t.count>0);

  const urgencyColors = {expired:"#dc2626",critical:"#ef4444",soon:"#d97706",upcoming:"#ca8a04",ok:"#059669",none:"#94a3b8"};
  const urgencyLabels = {expired:"EXPIRED",critical:"URGENT",soon:"EXPIRING SOON",upcoming:"UPCOMING",ok:"VALID",none:"NO EXPIRY"};

  return (
    <div className="fp">
      <style>{SS}</style>

      {showForm&&<DocFormModal record={editing} vehicles={vehicles} saving={saveMut.isPending} onClose={()=>{setShowForm(false);setEditing(null);}} onSave={d=>saveMut.mutate(editing?{...d,id:editing.id}:d)}/>}

      {/* TOP BAR */}
      <div style={{background:"rgba(15,23,42,0.97)",padding:"0 22px",display:"flex",alignItems:"center",height:50,gap:14,position:"sticky",top:0,zIndex:100}}>
        <Link to={createPageUrl("Fleet")} style={{display:"flex",alignItems:"center",gap:6,color:"#64748b",textDecoration:"none",fontSize:12,fontWeight:600}}><ChevronLeft size={14}/>Fleet Hub</Link>
        <div style={{width:1,height:20,background:"rgba(255,255,255,0.1)"}}/>
        <FileText size={14} color="#dc2626"/>
        <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>Fleet Documents</span>
        {(expired.length+critical.length)>0&&<span className="pulse" style={{background:"#dc2626",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99}}>{expired.length+critical.length} urgent</span>}
        <div style={{flex:1}}/>
        {canEdit&&<button onClick={()=>{setEditing(null);setShowForm(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"#dc2626",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}><Plus size={13}/>Add Document</button>}
        <button onClick={()=>printColorTable("Fleet Documents",["Vehicle","Document Type","Doc #","Issue Date","Expiry Date","Days Left","Status","Issued By"],filtered.map(d=>[d.vehicle_number,d.document_type,d.document_number||"—",d.issue_date||"—",d.expiry_date||"—",d.days!==null?d.days+"d":"—",d.label,d.issued_by||"—"]),{subtitle:`${filtered.length} documents · Expired:${expired.length} · Expiring soon:${soon.length+critical.length}`,summary:[{label:"Total",value:documents.length},{label:"Expired",value:expired.length},{label:"Expiring ≤30d",value:critical.length+soon.length},{label:"Valid",value:ok.length}]})} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}><Printer size={13}/>Print</button>
      </div>

      <main style={{padding:"20px 22px",maxWidth:1400,margin:"0 auto"}} className="fm">

        {/* Entity missing */}
        {(isError||entityMissing)&&(
          <div style={{background:"#fff7ed",borderRadius:12,padding:"14px 18px",marginBottom:16,border:"1px solid #fde68a",display:"flex",gap:12}}>
            <Info size={16} color="#d97706" style={{flexShrink:0,marginTop:1}}/>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:"#92400e",margin:0}}>FleetDocument entity not found</p>
              <p style={{fontSize:12,color:"#92400e",margin:"4px 0 0"}}>Create the FleetDocument entity in base44 Dashboard → Data. Required fields: fleet_vehicle_id, vehicle_number, document_type, expiry_date. See the base44 credit message for full schema.</p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="g4" style={{marginBottom:20}}>
          {[
            {l:"Total Documents",v:documents.length,g:"linear-gradient(135deg,#1e3a5f,#2563eb)"},
            {l:"Expired",v:expired.length,g:expired.length>0?"linear-gradient(135deg,#7f1d1d,#dc2626)":"linear-gradient(135deg,#064e3b,#10b981)"},
            {l:"Expiring ≤30 days",v:critical.length+soon.length,g:critical.length+soon.length>0?"linear-gradient(135deg,#78350f,#f59e0b)":"linear-gradient(135deg,#064e3b,#10b981)"},
            {l:"Valid",v:ok.length+upcoming.length,g:"linear-gradient(135deg,#064e3b,#10b981)"},
          ].map(k=>(
            <div key={k.l} style={{background:k.g,borderRadius:16,padding:"16px 18px",color:"#fff"}}>
              <p style={{fontSize:11,fontWeight:700,opacity:0.75,textTransform:"uppercase",margin:"0 0 6px"}}>{k.l}</p>
              <p style={{fontSize:24,fontWeight:800,margin:0}}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* CRITICAL ALERTS BANNER */}
        {(expired.length>0||critical.length>0)&&(
          <Card style={{marginBottom:16,borderColor:"#fecaca",background:"#fff5f5"}}>
            <p className="pulse" style={{fontWeight:800,fontSize:14,color:"#dc2626",margin:"0 0 12px"}}>🚨 Immediate Action Required — {expired.length} expired, {critical.length} expiring within 7 days</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[...expired,...critical].map(d=>(
                <div key={d.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",borderRadius:10,padding:"10px 14px",border:"1px solid #fecaca"}}>
                  <div>
                    <p style={{fontWeight:800,fontSize:13,color:"#1e293b",margin:0}}>{d.vehicle_number} — {d.document_type}</p>
                    <p style={{fontSize:11,color:"#64748b",margin:"2px 0 0"}}>
                      {d.document_number?`#${d.document_number} · `:""}{d.issued_by?`${d.issued_by} · `:""}Expired: {d.expiry_date}
                    </p>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <ExpiryBadge dateStr={d.expiry_date}/>
                    {canEdit&&<button onClick={()=>{setEditing(d);setShowForm(true);}} style={{padding:"5px 12px",background:"#1e293b",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>Renew</button>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* CHARTS + VEHICLE SUMMARY */}
        <div className="g2" style={{marginBottom:16}}>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Documents by Type</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeChart} layout="vertical" margin={{top:0,right:10,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis type="number" tick={{fontSize:10}} allowDecimals={false}/>
                <YAxis dataKey="type" type="category" tick={{fontSize:9}} width={90}/>
                <Tooltip/>
                <Bar dataKey="count" name="Documents" radius={[0,4,4,0]}>{typeChart.map((t,i)=><Cell key={i} fill={t.color}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Vehicle Doc Status</p>
            <div style={{overflowY:"auto",maxHeight:200}}>
              {vehicleDocSummary.map(({v,docs,worst})=>{
                const uc=urgencyColors[worst]||"#94a3b8";
                return (
                  <div key={v.id} onClick={()=>{setFV(v.vehicle_number);setSearch(v.vehicle_number);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",marginBottom:6,borderRadius:10,background:`${uc}10`,border:`1px solid ${uc}30`,cursor:"pointer"}}>
                    <div>
                      <p style={{fontSize:12,fontWeight:700,color:"#1e293b",margin:0}}>{v.vehicle_number}</p>
                      <p style={{fontSize:10,color:"#64748b",margin:0}}>{docs.length} document{docs.length!==1?"s":""}</p>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{background:`${uc}20`,color:uc,fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99}}>{urgencyLabels[worst]||worst}</span>
                      <span style={{fontSize:11,color:"#94a3b8"}}>{docs.filter(d=>d.level==="expired"||d.level==="critical").length>0?`🔴 ${docs.filter(d=>d.level==="expired"||d.level==="critical").length} urgent`:""}</span>
                    </div>
                  </div>
                );
              })}
              {vehicleDocSummary.length===0&&<p style={{color:"#94a3b8",fontSize:12,textAlign:"center",padding:20}}>No documents added yet</p>}
            </div>
          </Card>
        </div>

        {/* FULL TABLE */}
        <Card>
          <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}} className="ff">
            <div style={{position:"relative",flex:1,minWidth:180}}>
              <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents…" style={{width:"100%",paddingLeft:30,height:36,border:"1px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <select value={filterVehicle} onChange={e=>setFV(e.target.value)} style={{height:36,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 10px",fontSize:12,outline:"none",background:"#fff"}}>
              <option value="">All Vehicles</option>
              {vehicles.map(v=><option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>)}
            </select>
            <select value={filterType} onChange={e=>setFT(e.target.value)} style={{height:36,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 10px",fontSize:12,outline:"none",background:"#fff"}}>
              <option value="all">All Types</option>
              {DOC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            {[{v:"all",l:"All"},{v:"expired",l:"🔴 Expired"},{v:"critical",l:"🔴 Urgent"},{v:"soon",l:"🟡 ≤30 days"},{v:"ok",l:"✓ Valid"}].map(f=>(
              <button key={f.v} onClick={()=>setFS(f.v)} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",background:filterStatus===f.v?"#1e293b":"#f1f5f9",color:filterStatus===f.v?"#fff":"#64748b",whiteSpace:"nowrap"}}>{f.l}</button>
            ))}
          </div>

          <p style={{fontSize:11,color:"#94a3b8",marginBottom:10}}>{filtered.length} documents</p>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"2px solid #f1f5f9"}}>
                {["Vehicle","Document Type","Doc #","Issue Date","Expiry Date","Alert","Status","Issued By","File",""].map(h=>(
                  <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,fontSize:10,textTransform:"uppercase",color:"#94a3b8",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((d,i)=>(
                  <tr key={d.id} style={{borderBottom:"1px solid #f8fafc",background:d.level==="expired"?"#fff5f5":d.level==="critical"?"#fff5f5":d.level==="soon"?"#fffbeb":i%2===0?"transparent":"#fafafa"}}>
                    <td style={{padding:"10px 12px",fontWeight:700,color:"#1e293b"}}>{d.vehicle_number||"—"}</td>
                    <td style={{padding:"10px 12px"}}><span style={{background:"#f1f5f9",color:"#475569",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99}}>{d.document_type}</span></td>
                    <td style={{padding:"10px 12px",color:"#64748b",fontFamily:"monospace",fontSize:11}}>{d.document_number||"—"}</td>
                    <td style={{padding:"10px 12px",color:"#64748b"}}>{d.issue_date||"—"}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:d.level==="expired"||d.level==="critical"?"#dc2626":"#1e293b"}}>{d.expiry_date||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:10,color:"#94a3b8"}}>{d.alert_days_before||30}d before</td>
                    <td style={{padding:"10px 12px"}}><ExpiryBadge dateStr={d.expiry_date}/></td>
                    <td style={{padding:"10px 12px",color:"#64748b",fontSize:11}}>{d.issued_by||"—"}</td>
                    <td style={{padding:"10px 12px"}}>
                      {d.document_url
                        ? <a href={d.document_url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:4,color:"#2563eb",fontSize:11,fontWeight:700,textDecoration:"none"}} onClick={e=>e.stopPropagation()}><Eye size={12}/>View</a>
                        : <span style={{fontSize:10,color:"#94a3b8"}}>No file</span>
                      }
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      {(canEdit||canDelete)&&<div style={{display:"flex",gap:4}}>
                        {canEdit&&<button onClick={()=>{setEditing(d);setShowForm(true);}} style={{padding:"3px 8px",background:"#f0fdf4",color:"#059669",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>Edit</button>}
                        {canDelete&&<button onClick={()=>{if(window.confirm("Delete this document?"))delMut.mutate(d.id);}} style={{padding:"3px 8px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>Del</button>}
                      </div>}
                    </td>
                  </tr>
                ))}
                {!filtered.length&&<tr><td colSpan={10} style={{padding:32,textAlign:"center",color:"#94a3b8"}}>
                  {documents.length===0?"No documents yet. Click '+ Add Document' to start.":"No documents match filters."}
                </td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Upcoming renewal schedule */}
        {upcoming.length+soon.length>0&&(
          <Card style={{marginTop:16}}>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:12}}>📅 Renewal Schedule (next 60 days)</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[...soon,...upcoming].sort((a,b)=>(a.days??9999)-(b.days??9999)).map(d=>(
                <div key={d.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#f8fafc",borderRadius:10,border:"1px solid #e2e8f0"}}>
                  <div style={{width:48,height:48,borderRadius:12,background:d.level==="soon"?"#fef3c7":"#fefce8",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:16,fontWeight:800,color:d.level==="soon"?"#d97706":"#ca8a04",lineHeight:1}}>{d.days}</span>
                    <span style={{fontSize:9,color:d.level==="soon"?"#d97706":"#ca8a04",fontWeight:700}}>DAYS</span>
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontSize:12,fontWeight:700,color:"#1e293b",margin:0}}>{d.vehicle_number} — {d.document_type}</p>
                    <p style={{fontSize:10,color:"#64748b",margin:"2px 0 0"}}>Expires: {d.expiry_date} {d.document_number?`· #${d.document_number}`:""} {d.issued_by?`· ${d.issued_by}`:""}</p>
                  </div>
                  {canEdit&&<button onClick={()=>{setEditing(d);setShowForm(true);}} style={{padding:"5px 12px",background:"#1e293b",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>Renew</button>}
                </div>
              ))}
            </div>
          </Card>
        )}

      </main>
    </div>
  );
}