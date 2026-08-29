import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, differenceInDays, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line
} from "recharts";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Wrench, Package, Search, Plus, X, Printer, ChevronLeft,
  AlertTriangle, Clock, DollarSign, Info, ChevronRight,
  TrendingDown, Eye, Tag, Hash, Calendar, Layers, GripVertical, ChevronRight as CR
} from "lucide-react";
import { toast } from "sonner";

// ── design tokens ──────────────────────────────────────────────────────────
const PALETTE = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];
const SS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}
.fp{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:960px){.g4{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr 1fr;}.g2{grid-template-columns:1fr;}}
@media(max-width:600px){.g4{grid-template-columns:1fr 1fr;}.g3{grid-template-columns:1fr;}.fm{padding:12px!important;}.ff{flex-wrap:wrap;}}
::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
.inv-bar-wrap{position:relative;height:32px;background:#f1f5f9;border-radius:8px;overflow:hidden;}
.inv-bar{height:100%;border-radius:8px;transition:width 0.4s ease;}
.item-card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;cursor:pointer;transition:all 0.15s;background:#fff;}
.item-card:hover{border-color:#0d9488;box-shadow:0 4px 16px rgba(13,148,136,0.12);transform:translateY(-1px);}
`;

// ── shared atoms ───────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:20, ...style }}>{children}</div>
);
const Field = ({ label, children, span }) => (
  <div style={{ marginBottom:12, gridColumn:span?`span ${span}`:undefined }}>
    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</label>
    {children}
  </div>
);
const FI = ({ ...p }) => <input {...p} style={{ width:"100%", height:38, border:"1px solid #e2e8f0", borderRadius:10, padding:"0 12px", fontSize:13, outline:"none", boxSizing:"border-box", background:"#fff" }}/>;
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

const SB = ({ status }) => {
  const m = { completed:{l:"Completed",c:"#059669",b:"#d1fae5"}, pending:{l:"Pending",c:"#d97706",b:"#fef3c7"}, scheduled:{l:"Scheduled",c:"#7c3aed",b:"#ede9fe"}, overdue:{l:"Overdue",c:"#dc2626",b:"#fee2e2"} };
  const s = m[status] || {l:status||"—",c:"#64748b",b:"#f1f5f9"};
  return <span style={{ background:s.b, color:s.c, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99 }}>{s.l}</span>;
};

// Stock level colour logic
const stockColor = (qty, reorder, critical) => {
  if (qty <= (critical || 0))           return { bar:"#ef4444", bg:"#fef2f2", text:"#dc2626", label:"CRITICAL" };
  if (qty <= (reorder || 0))            return { bar:"#f59e0b", bg:"#fffbeb", text:"#d97706", label:"LOW" };
  return                                       { bar:"#10b981", bg:"#f0fdf4", text:"#059669", label:"OK" };
};

const SERVICE_TYPES = ["Oil Change","Tyre Replacement","Brake Service","Engine Service","Battery","AC Repair","Electrical","Body Work","Clutch","Suspension","Fuel System","Cooling System","Other"];
const INV_CATEGORIES = ["Engine Oil","Transmission Fluid","Brake Fluid","Coolant","Power Steering Fluid","Diesel Fuel","Grease/Lubricant","Air Filter","Oil Filter","Fuel Filter","Cabin Filter","Tyres","Brake Pads","Brake Shoes","Clutch Plate","Fan Belt","Timing Belt","Battery","Spark Plugs","Wiper Blades","Bulbs/Fuses","Hydraulic Oil","AdBlue/DEF","Other"];
const INV_UNITS = ["Litres","KG","Pieces","Set","Pair","Box","Drum","Can","Metres","Other"];

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY ITEM DETAIL MODAL
// ══════════════════════════════════════════════════════════════════════════════
function ItemDetailModal({ item, fmt, onClose, onEdit }) {
  const sc = stockColor(item.quantity_in_stock||0, item.reorder_level, item.critical_level);
  const pct = Math.min(((item.quantity_in_stock||0) / Math.max((item.reorder_level||1)*2, 1)) * 100, 100);
  const totalValue = (item.quantity_in_stock||0) * (item.unit_cost||0);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:560, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #e2e8f0", background:`linear-gradient(135deg,${sc.bar}22,${sc.bar}08)`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <span style={{ background:sc.bg, color:sc.text, fontSize:11, fontWeight:800, padding:"3px 10px", borderRadius:99 }}>{sc.label}</span>
              <span style={{ background:"#f1f5f9", color:"#64748b", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:99 }}>{item.category}</span>
            </div>
            <h2 style={{ fontSize:18, fontWeight:800, color:"#0f172a", margin:0 }}>{item.name}</h2>
            {item.part_number && <p style={{ fontSize:12, color:"#64748b", margin:"4px 0 0", fontFamily:"monospace" }}>Part #: {item.part_number}</p>}
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <X size={15} color="#64748b"/>
          </button>
        </div>

        <div style={{ overflowY:"auto", flex:1, padding:"20px 24px" }}>
          {/* Stock level bar */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#1e293b" }}>Stock Level</span>
              <span style={{ fontSize:12, fontWeight:700, color:sc.text }}>{item.quantity_in_stock||0} {item.unit || ""}</span>
            </div>
            <div className="inv-bar-wrap">
              <div className="inv-bar" style={{ width:`${pct}%`, background:sc.bar }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ fontSize:10, color:"#94a3b8" }}>0</span>
              {item.critical_level && <span style={{ fontSize:10, color:"#dc2626", fontWeight:700 }}>Critical: {item.critical_level}</span>}
              {item.reorder_level && <span style={{ fontSize:10, color:"#f59e0b", fontWeight:700 }}>Reorder: {item.reorder_level}</span>}
            </div>
          </div>

          {/* Key stats grid */}
          <div className="g3" style={{ marginBottom:20 }}>
            {[
              { l:"In Stock",    v:`${item.quantity_in_stock||0} ${item.unit||""}`, c:sc.text },
              { l:"Unit Cost",   v:fmt(item.unit_cost),                             c:"#1e293b" },
              { l:"Total Value", v:fmt(totalValue),                                 c:"#059669" },
            ].map(k => (
              <div key={k.l} style={{ background:"#f8fafc", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
                <p style={{ fontSize:10, color:"#94a3b8", margin:0, textTransform:"uppercase", fontWeight:700 }}>{k.l}</p>
                <p style={{ fontSize:16, fontWeight:800, color:k.c, margin:"4px 0 0" }}>{k.v}</p>
              </div>
            ))}
          </div>

          {/* Details table */}
          <div style={{ background:"#f8fafc", borderRadius:12, padding:14, marginBottom:16 }}>
            {[
              ["Category",        item.category || "—"],
              ["Unit",            item.unit || "—"],
              ["Reorder Level",   item.reorder_level ? `${item.reorder_level} ${item.unit||""}` : "—"],
              ["Critical Level",  item.critical_level ? `${item.critical_level} ${item.unit||""}` : "—"],
              ["Supplier",        item.supplier || "—"],
              ["Part / Serial #", item.part_number || "—"],
              ["Location",        item.storage_location || "—"],
              ["Last Restocked",  item.last_restocked_date || "—"],
              ["Expiry Date",     item.expiry_date || "—"],
              ["Compatible With", item.compatible_vehicles || "—"],
              ["Notes",           item.notes || "—"],
            ].map(([l,v]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #e2e8f0" }}>
                <span style={{ fontSize:12, color:"#64748b" }}>{l}</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#1e293b", textAlign:"right", maxWidth:"55%", wordBreak:"break-word" }}>{v}</span>
              </div>
            ))}
          </div>

          {item.description && (
            <div style={{ background:"#eff6ff", borderRadius:10, padding:"10px 14px" }}>
              <p style={{ fontSize:11, fontWeight:700, color:"#1d4ed8", margin:"0 0 4px" }}>Description</p>
              <p style={{ fontSize:12, color:"#1e3a5f", margin:0 }}>{item.description}</p>
            </div>
          )}
        </div>

        <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, height:40, borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }}>Close</button>
          <button onClick={()=>{ onClose(); onEdit(item); }} style={{ flex:2, height:40, borderRadius:10, border:"none", background:"#1e293b", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }}>
            Edit Item
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY FORM MODAL
// ══════════════════════════════════════════════════════════════════════════════
function InventoryFormModal({ record, onClose, onSave, saving }) {
  const [form, setForm] = useState(record || {
    name:"", category:"Engine Oil", unit:"Litres",
    quantity_in_stock:"", reorder_level:"", critical_level:"",
    unit_cost:"", supplier:"", part_number:"",
    storage_location:"", compatible_vehicles:"",
    last_restocked_date:format(new Date(),"yyyy-MM-dd"),
    expiry_date:"", description:"", notes:""
  });
  const s = (k,v) => setForm(p=>({...p,[k]:v}));

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:640, marginTop:16, marginBottom:16, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", background:"linear-gradient(135deg,#0f172a,#1e293b)" }}>
          <div>
            <h2 style={{ fontSize:15, fontWeight:800, color:"#fff", margin:0 }}>{record?"Edit Inventory Item":"Add Inventory Item"}</h2>
            <p style={{ fontSize:11, color:"#94a3b8", margin:"3px 0 0" }}>Parts, fluids, tyres, filters and all auto-related stock</p>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} color="#fff"/>
          </button>
        </div>

        <div style={{ overflowY:"auto", flex:1, padding:"20px 22px" }}>

          {/* Stock info */}
          <div style={{ background:"#f0fdf4", borderRadius:12, padding:"14px 16px", marginBottom:14, border:"1px solid #bbf7d0" }}>
            <p style={{ fontSize:11, fontWeight:800, color:"#059669", margin:"0 0 10px", textTransform:"uppercase" }}>📦 Item & Stock Info</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Item Name *" span={2}><FI value={form.name} onChange={e=>s("name",e.target.value)} placeholder="e.g. Engine Oil 5W-30, Michelin 750R16 Tyre"/></Field>
              <Field label="Category">
                <FS value={form.category} onChange={v=>s("category",v)} opts={INV_CATEGORIES.map(c=>({v:c,l:c}))}/>
              </Field>
              <Field label="Unit">
                <FS value={form.unit} onChange={v=>s("unit",v)} opts={INV_UNITS.map(u=>({v:u,l:u}))}/>
              </Field>
              <Field label="Qty in Stock"><FI type="number" value={form.quantity_in_stock} onChange={e=>s("quantity_in_stock",e.target.value)} placeholder="0"/></Field>
              <Field label="Unit Cost (₨)"><FI type="number" value={form.unit_cost} onChange={e=>s("unit_cost",e.target.value)} placeholder="0"/></Field>
              <Field label="Reorder Alert Level" ><FI type="number" value={form.reorder_level} onChange={e=>s("reorder_level",e.target.value)} placeholder="e.g. 5 — yellow alert"/></Field>
              <Field label="Critical Level"><FI type="number" value={form.critical_level} onChange={e=>s("critical_level",e.target.value)} placeholder="e.g. 2 — red alert"/></Field>
            </div>
          </div>

          {/* Item details */}
          <div style={{ background:"#eff6ff", borderRadius:12, padding:"14px 16px", marginBottom:14, border:"1px solid #bfdbfe" }}>
            <p style={{ fontSize:11, fontWeight:800, color:"#1d4ed8", margin:"0 0 10px", textTransform:"uppercase" }}>🔍 Item Details</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Part / Serial Number"><FI value={form.part_number} onChange={e=>s("part_number",e.target.value)} placeholder="Part no. or tyre serial"/></Field>
              <Field label="Supplier"><FI value={form.supplier} onChange={e=>s("supplier",e.target.value)} placeholder="Supplier name"/></Field>
              <Field label="Storage Location"><FI value={form.storage_location} onChange={e=>s("storage_location",e.target.value)} placeholder="e.g. Shelf A3, Store Room"/></Field>
              <Field label="Compatible Vehicles"><FI value={form.compatible_vehicles} onChange={e=>s("compatible_vehicles",e.target.value)} placeholder="e.g. All, ISUZU FTR, TMJ 864"/></Field>
              <Field label="Last Restocked Date"><FI type="date" value={form.last_restocked_date} onChange={e=>s("last_restocked_date",e.target.value)}/></Field>
              <Field label="Expiry Date (if applicable)"><FI type="date" value={form.expiry_date} onChange={e=>s("expiry_date",e.target.value)}/></Field>
              <Field label="Description" span={2}>
                <textarea value={form.description} onChange={e=>s("description",e.target.value)} placeholder="Additional details, specifications…"
                  style={{ width:"100%", height:56, border:"1px solid #e2e8f0", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box" }}/>
              </Field>
              <Field label="Notes" span={2}><FI value={form.notes} onChange={e=>s("notes",e.target.value)} placeholder="Optional notes"/></Field>
            </div>
          </div>

          {/* Live total value preview */}
          {form.quantity_in_stock && form.unit_cost && (
            <div style={{ background:"linear-gradient(135deg,#064e3b,#10b981)", borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.8)" }}>Stock Value Preview</span>
              <span style={{ fontSize:18, fontWeight:800, color:"#fff" }}>
                ₨{((parseFloat(form.quantity_in_stock)||0)*(parseFloat(form.unit_cost)||0)).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div style={{ padding:"14px 22px", borderTop:"1px solid #e2e8f0", display:"flex", gap:10, background:"#f8fafc" }}>
          <button onClick={onClose} style={{ flex:1, height:42, borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }}>Cancel</button>
          <button onClick={()=>onSave(form)} disabled={saving||!form.name}
            style={{ flex:2, height:42, borderRadius:10, border:"none", background:"#10b981", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:14, opacity:(!form.name||saving)?0.6:1 }}>
            {saving?"Saving…":"Save Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY SECTION
// ══════════════════════════════════════════════════════════════════════════════
function InventorySection({ fmt, canEdit, canDelete }) {
  const qc = useQueryClient();
  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState("all");
  const [filterAlert, setFilterAlert]= useState("all"); // all | critical | low | ok
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [viewing, setViewing]       = useState(null);

  const { data:inventory=[], isError } = useQuery({
    queryKey:["inv_fm"],
    queryFn:()=>base44.entities.InventoryItem.list().catch(()=>[]),
    retry:false,
  });

  const saveMut = useMutation({
    mutationFn: d => {
      const NUM = ["quantity_in_stock","reorder_level","critical_level","unit_cost"];
      const c = {...d};
      NUM.forEach(f => { const p=parseFloat(c[f]); c[f]=isNaN(p)?null:p; });
      return c.id
        ? base44.entities.InventoryItem.update(c.id, c)
        : base44.entities.InventoryItem.create(c);
    },
    onSuccess:()=>{ qc.invalidateQueries(["inv_fm"]); toast.success("Item saved"); setShowForm(false); setEditing(null); },
    onError:e=>toast.error("Save failed: "+e.message),
  });
  const delMut = useMutation({
    mutationFn:id=>base44.entities.InventoryItem.delete(id),
    onSuccess:()=>{ qc.invalidateQueries(["inv_fm"]); toast.success("Item removed"); },
  });

  const openEdit = item => { setEditing(item); setShowForm(true); };
  const openNew  = () => { setEditing(null); setShowForm(true); };

  // computed
  const totalValue = inventory.reduce((s,i)=>(s+(i.quantity_in_stock||0)*(i.unit_cost||0)),0);
  const critical   = inventory.filter(i=>(i.quantity_in_stock||0)<=(i.critical_level||0)&&(i.critical_level||0)>0);
  const low        = inventory.filter(i=>(i.quantity_in_stock||0)<=(i.reorder_level||0)&&(i.quantity_in_stock||0)>(i.critical_level||0)&&(i.reorder_level||0)>0);

  const filtered = inventory.filter(i=>{
    const q=search.toLowerCase();
    const mQ=!q||[i.name,i.category,i.supplier,i.part_number].some(x=>x?.toLowerCase().includes(q));
    const mC=filterCat==="all"||i.category===filterCat;
    const sc=stockColor(i.quantity_in_stock||0,i.reorder_level,i.critical_level);
    const mA=filterAlert==="all"||(filterAlert==="critical"&&sc.label==="CRITICAL")||(filterAlert==="low"&&sc.label==="LOW")||(filterAlert==="ok"&&sc.label==="OK");
    return mQ&&mC&&mA;
  });

  // Category breakdown for bar chart
  const catData = INV_CATEGORIES.map(cat=>{
    const items = inventory.filter(i=>i.category===cat);
    const val   = items.reduce((s,i)=>(s+(i.quantity_in_stock||0)*(i.unit_cost||0)),0);
    const hasCrit = items.some(i=>(i.quantity_in_stock||0)<=(i.critical_level||0)&&(i.critical_level||0)>0);
    const hasLow  = items.some(i=>(i.quantity_in_stock||0)<=(i.reorder_level||0)&&(i.quantity_in_stock||0)>(i.critical_level||0)&&(i.reorder_level||0)>0);
    return { cat:cat.length>14?cat.slice(0,14)+"…":cat, fullCat:cat, val, color:hasCrit?"#ef4444":hasLow?"#f59e0b":"#10b981", count:items.length };
  }).filter(c=>c.count>0).sort((a,b)=>b.val-a.val);

  const usedCategories = [...new Set(inventory.map(i=>i.category))].sort();

  if (isError) return (
    <Card>
      <div style={{ textAlign:"center", padding:"28px 0" }}>
        <Info size={36} color="#d97706" style={{ margin:"0 auto 12px", display:"block" }}/>
        <p style={{ fontWeight:700, color:"#92400e", margin:0 }}>InventoryItem entity not found</p>
        <p style={{ color:"#64748b", fontSize:13, marginTop:6, maxWidth:420, margin:"8px auto 0" }}>
          Go to base44 Dashboard → Data → New Entity named <strong>InventoryItem</strong>.
          Suggested fields: name (string*), category (string), unit (string), quantity_in_stock (number),
          reorder_level (number), critical_level (number), unit_cost (number), supplier (string),
          part_number (string), storage_location (string), compatible_vehicles (string),
          last_restocked_date (date), expiry_date (date), description (string), notes (string).
        </p>
      </div>
    </Card>
  );

  return (
    <div>
      {showForm && <InventoryFormModal record={editing} saving={saveMut.isPending} onClose={()=>{setShowForm(false);setEditing(null);}} onSave={d=>saveMut.mutate(editing?{...d,id:editing.id}:d)}/>}
      {viewing  && <ItemDetailModal item={viewing} fmt={fmt} onClose={()=>setViewing(null)} onEdit={openEdit}/>}

      {/* KPIs */}
      <div className="g4" style={{ marginBottom:20 }}>
        {[
          { l:"Total Items",       v:inventory.length,    g:"linear-gradient(135deg,#1e3a5f,#2563eb)",    f:"all" },
          { l:"Total Stock Value", v:fmt(totalValue),     g:"linear-gradient(135deg,#064e3b,#10b981)",    f:"all" },
          { l:"Critical Stock",   v:critical.length,     g:critical.length>0?"linear-gradient(135deg,#7f1d1d,#dc2626)":"linear-gradient(135deg,#064e3b,#10b981)", f:"critical" },
          { l:"Low Stock",        v:low.length,           g:low.length>0?"linear-gradient(135deg,#78350f,#f59e0b)":"linear-gradient(135deg,#1e1b4b,#7c3aed)", f:"low" },
        ].map(k=>(
          <div key={k.l} onClick={()=>setFilterAlert(k.f)} style={{ background:k.g, borderRadius:16, padding:"16px 18px", color:"#fff", cursor:"pointer", transition:"transform 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            <p style={{ fontSize:11, fontWeight:700, opacity:0.75, textTransform:"uppercase", margin:"0 0 6px" }}>{k.l}</p>
            <p style={{ fontSize:22, fontWeight:800, margin:0 }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Critical / Low alerts */}
      {(critical.length>0||low.length>0)&&(
        <Card style={{ marginBottom:16, borderColor:"#fecaca", background:"#fff5f5" }}>
          <p style={{ fontWeight:800, fontSize:13, color:"#dc2626", margin:"0 0 12px" }}>
            🚨 Stock Alerts — {critical.length} critical, {low.length} low
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {[...critical,...low].map(item=>{
              const sc = stockColor(item.quantity_in_stock||0, item.reorder_level, item.critical_level);
              return (
                <div key={item.id} onClick={()=>setViewing(item)} style={{ background:"#fff", borderRadius:10, padding:"8px 14px", border:`1px solid ${sc.bar}40`, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:sc.bar, display:"block", flexShrink:0 }}/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color:"#1e293b", margin:0 }}>{item.name}</p>
                    <p style={{ fontSize:10, color:sc.text, margin:0, fontWeight:700 }}>{item.quantity_in_stock||0} {item.unit||""} remaining · {sc.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Value by category bar chart */}
      {catData.length>0&&(
        <Card style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", margin:0 }}>Stock Value by Category</p>
            <div style={{ display:"flex", gap:10, fontSize:11 }}>
              {[{c:"#10b981",l:"OK"},{c:"#f59e0b",l:"Low"},{c:"#ef4444",l:"Critical"}].map(x=>(
                <div key={x.l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background:x.c, display:"block" }}/>
                  <span style={{ color:"#64748b" }}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData} margin={{ top:0, right:10, left:-10, bottom:60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="cat" tick={{ fontSize:10, angle:-35, textAnchor:"end" }} interval={0}/>
              <YAxis tick={{ fontSize:10 }} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
              <Tooltip formatter={(v,n,p)=>[`₨${v.toLocaleString()} (${p.payload.count} items)`,p.payload.fullCat]}/>
              <Bar dataKey="val" name="Value" radius={[4,4,0,0]}>
                {catData.map((c,i) => <Cell key={i} fill={c.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Stock level overview — visual bars per item */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", margin:0 }}>Individual Stock Levels</p>
          <p style={{ fontSize:11, color:"#94a3b8", margin:0 }}>Click any item for details</p>
        </div>
        {inventory.length===0?(
          <p style={{ color:"#94a3b8", fontSize:13, textAlign:"center", padding:"24px 0" }}>No items yet. Click "Add Item" to start.</p>
        ):(
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {inventory.map(item=>{
              const sc  = stockColor(item.quantity_in_stock||0, item.reorder_level, item.critical_level);
              const max = Math.max((item.reorder_level||1)*2.5, (item.quantity_in_stock||1)*1.2, 1);
              const pct = Math.min(((item.quantity_in_stock||0)/max)*100, 100);
              return (
                <div key={item.id} onClick={()=>setViewing(item)} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 12px", borderRadius:10, background:sc.bg, cursor:"pointer", border:`1px solid ${sc.bar}30` }}>
                  <div style={{ width:130, flexShrink:0 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:"#1e293b", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</p>
                    <p style={{ fontSize:10, color:"#94a3b8", margin:0 }}>{item.category}</p>
                  </div>
                  <div style={{ flex:1 }}>
                    <div className="inv-bar-wrap">
                      <div className="inv-bar" style={{ width:`${Math.max(pct,2)}%`, background:sc.bar }}/>
                      {item.critical_level>0&&<div style={{ position:"absolute", left:`${(item.critical_level/max)*100}%`, top:0, bottom:0, width:2, background:"#dc2626", opacity:0.5 }}/>}
                      {item.reorder_level>0&&<div style={{ position:"absolute", left:`${(item.reorder_level/max)*100}%`, top:0, bottom:0, width:2, background:"#f59e0b", opacity:0.5 }}/>}
                    </div>
                  </div>
                  <div style={{ width:80, textAlign:"right", flexShrink:0 }}>
                    <p style={{ fontSize:12, fontWeight:800, color:sc.text, margin:0 }}>{item.quantity_in_stock||0} {item.unit||""}</p>
                    <span style={{ background:sc.bar, color:"#fff", fontSize:9, fontWeight:800, padding:"1px 6px", borderRadius:99 }}>{sc.label}</span>
                  </div>
                  <div style={{ width:80, textAlign:"right", flexShrink:0 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:"#059669", margin:0 }}>{fmt((item.quantity_in_stock||0)*(item.unit_cost||0))}</p>
                    <p style={{ fontSize:9, color:"#94a3b8", margin:0 }}>{fmt(item.unit_cost)}/{item.unit||"unit"}</p>
                  </div>
                  <ChevronRight size={14} color="#94a3b8"/>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Full inventory table with filters */}
      <Card>
        <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center", flexWrap:"wrap" }} className="ff">
          <div style={{ position:"relative", flex:1, minWidth:180 }}>
            <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inventory…"
              style={{ width:"100%", paddingLeft:30, height:36, border:"1px solid #e2e8f0", borderRadius:10, fontSize:13, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ height:36, border:"1px solid #e2e8f0", borderRadius:10, padding:"0 10px", fontSize:12, outline:"none", background:"#fff" }}>
            <option value="all">All Categories</option>
            {usedCategories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {[{v:"all",l:"All"},{v:"critical",l:"🔴 Critical"},{v:"low",l:"🟡 Low"},{v:"ok",l:"🟢 OK"}].map(f=>(
            <button key={f.v} onClick={()=>setFilterAlert(f.v)} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, border:"none", cursor:"pointer", background:filterAlert===f.v?"#1e293b":"#f1f5f9", color:filterAlert===f.v?"#fff":"#64748b", whiteSpace:"nowrap" }}>
              {f.l}
            </button>
          ))}
          <button onClick={()=>printTable("Inventory",["Item","Category","In Stock","Unit","Reorder","Critical","Unit Cost","Total Value","Supplier","Part #","Status"],filtered.map(i=>{const sc=stockColor(i.quantity_in_stock||0,i.reorder_level,i.critical_level);return[i.name,i.category,i.quantity_in_stock||0,i.unit||"",i.reorder_level||"—",i.critical_level||"—",`₨${(i.unit_cost||0).toLocaleString()}`,`₨${((i.quantity_in_stock||0)*(i.unit_cost||0)).toLocaleString()}`,i.supplier||"—",i.part_number||"—",sc.label];}))}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#1e293b", color:"#fff", border:"none", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            <Printer size={12}/>Print
          </button>
          {canEdit&&<button onClick={openNew} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:"#10b981", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            <Plus size={13}/>Add Item
          </button>}
        </div>

        <p style={{ fontSize:11, color:"#94a3b8", marginBottom:10 }}>
          {filtered.length} items · Total value: <strong style={{ color:"#059669" }}>{fmt(filtered.reduce((s,i)=>s+(i.quantity_in_stock||0)*(i.unit_cost||0),0))}</strong>
        </p>

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead><tr style={{ borderBottom:"2px solid #f1f5f9" }}>
              {["Item","Category","In Stock","Reorder/Critical","Unit Cost","Total Value","Supplier","Part #","Status",""].map(h=>(
                <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, fontSize:10, textTransform:"uppercase", color:"#94a3b8", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((item,i)=>{
                const sc  = stockColor(item.quantity_in_stock||0, item.reorder_level, item.critical_level);
                const val = (item.quantity_in_stock||0)*(item.unit_cost||0);
                return (
                  <tr key={item.id} onClick={()=>setViewing(item)} style={{ borderBottom:"1px solid #f8fafc", background:sc.label==="CRITICAL"?"#fff5f5":sc.label==="LOW"?"#fffbeb":i%2===0?"transparent":"#fafafa", cursor:"pointer" }}>
                    <td style={{ padding:"10px 12px" }}>
                      <p style={{ fontWeight:700, color:"#1e293b", margin:0 }}>{item.name}</p>
                      {item.storage_location&&<p style={{ fontSize:10, color:"#94a3b8", margin:0 }}>{item.storage_location}</p>}
                    </td>
                    <td style={{ padding:"10px 12px", color:"#64748b", fontSize:11 }}>{item.category||"—"}</td>
                    <td style={{ padding:"10px 12px", fontWeight:800, color:sc.text }}>{item.quantity_in_stock||0} {item.unit||""}</td>
                    <td style={{ padding:"10px 12px", fontSize:11, color:"#64748b" }}>
                      {item.reorder_level?<span style={{ color:"#d97706" }}>⬇{item.reorder_level} </span>:""}
                      {item.critical_level?<span style={{ color:"#dc2626" }}>🔴{item.critical_level}</span>:""}
                    </td>
                    <td style={{ padding:"10px 12px", color:"#64748b" }}>{fmt(item.unit_cost)}</td>
                    <td style={{ padding:"10px 12px", fontWeight:700, color:"#059669" }}>{fmt(val)}</td>
                    <td style={{ padding:"10px 12px", color:"#64748b", fontSize:11 }}>{item.supplier||"—"}</td>
                    <td style={{ padding:"10px 12px", color:"#64748b", fontSize:11, fontFamily:"monospace" }}>{item.part_number||"—"}</td>
                    <td style={{ padding:"10px 12px" }}>
                      <span style={{ background:sc.bg, color:sc.text, fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:99 }}>{sc.label}</span>
                    </td>
                    <td style={{ padding:"10px 12px" }} onClick={e=>e.stopPropagation()}>
                      {(canEdit||canDelete)&&<div style={{ display:"flex", gap:4 }}>
                        {canEdit&&<button onClick={()=>openEdit(item)} style={{ padding:"3px 8px", background:"#f0fdf4", color:"#059669", border:"none", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>Edit</button>}
                        {canDelete&&<button onClick={()=>{if(window.confirm("Remove item?"))delMut.mutate(item.id);}} style={{ padding:"3px 8px", background:"#fef2f2", color:"#dc2626", border:"none", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>Del</button>}
                      </div>}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length&&<tr><td colSpan={10} style={{ padding:32, textAlign:"center", color:"#94a3b8" }}>No items match filters</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE SECTION
// ══════════════════════════════════════════════════════════════════════════════
function MaintenanceSection({ fmt, canEdit, canDelete, fleetVehicles }) {
  const qc = useQueryClient();
  const [search, setSearch]       = useState("");
  const [filterStatus, setFS]     = useState("all");
  const [filterVehicle, setFV]    = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [entityErr, setEntityErr] = useState(false);

  const EMPTY = { fleet_vehicle_number:"", fleet_vehicle_id:"", service_type:"Oil Change", service_date:format(new Date(),"yyyy-MM-dd"), next_service_date:"", cost:"", mechanic:"", status:"completed", notes:"" };
  const [form, setForm] = useState(EMPTY);

  const { data:maintenance=[], isError } = useQuery({
    queryKey:["fm_page"],
    queryFn:()=>base44.entities.FleetMaintenance.list("-service_date",500),
    retry:false,
  });

  const saveMut = useMutation({
    mutationFn: d => {
      const data={...d, vehicle_number:d.fleet_vehicle_number, cost:parseFloat(d.cost)||0};
      const veh=fleetVehicles.find(v=>v.vehicle_number===d.fleet_vehicle_number);
      if(veh)data.fleet_vehicle_id=veh.id;
      return d.id?base44.entities.FleetMaintenance.update(d.id,data):base44.entities.FleetMaintenance.create(data);
    },
    onSuccess:()=>{ qc.invalidateQueries(["fm_page"]); toast.success("Saved"); setShowForm(false); setEditing(null); },
    onError:e=>toast.error("Save failed: "+e.message),
  });
  const delMut = useMutation({ mutationFn:id=>base44.entities.FleetMaintenance.delete(id), onSuccess:()=>qc.invalidateQueries(["fm_page"]) });

  const overdue  = maintenance.filter(m=>m.status==="overdue"||(m.status==="scheduled"&&m.next_service_date&&new Date(m.next_service_date)<new Date()));
  const scheduled= maintenance.filter(m=>m.status==="scheduled"&&m.next_service_date&&new Date(m.next_service_date)>=new Date());
  const dueIn7   = scheduled.filter(m=>differenceInDays(new Date(m.next_service_date),new Date())<=7);

  const filtered = maintenance.filter(m=>{
    const q=search.toLowerCase();
    return (!q||[m.vehicle_number,m.service_type,m.mechanic].some(x=>x?.toLowerCase().includes(q)))
      && (filterStatus==="all"||m.status===filterStatus)
      && (!filterVehicle||m.vehicle_number===filterVehicle);
  });

  const vehicleCost = fleetVehicles.map(v=>({
    vehicle:v.vehicle_number,
    cost:maintenance.filter(m=>m.fleet_vehicle_id===v.id||m.vehicle_number===v.vehicle_number).reduce((s,m)=>s+(m.cost||0),0)
  })).filter(v=>v.cost>0).sort((a,b)=>b.cost-a.cost);

  const openEdit = r => { setEditing(r); setForm({...r, fleet_vehicle_number:r.vehicle_number||r.fleet_vehicle_number||""}); setShowForm(true); };
  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };

  return (
    <div>
      {showForm&&(
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:540, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h2 style={{ fontSize:15, fontWeight:800, color:"#0f172a", margin:0 }}>{editing?"Edit Record":"Add Maintenance"}</h2>
              <button onClick={()=>setShowForm(false)} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14}/></button>
            </div>
            <div style={{ overflowY:"auto", flex:1, padding:"18px 22px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Field label="Fleet Vehicle">
                  <FS value={form.fleet_vehicle_number} onChange={v=>setForm(p=>({...p,fleet_vehicle_number:v}))} opts={fleetVehicles.map(v=>({v:v.vehicle_number,l:v.vehicle_number}))} ph="Select fleet vehicle"/>
                </Field>
                <Field label="Service Type">
                  <FS value={form.service_type} onChange={v=>setForm(p=>({...p,service_type:v}))} opts={SERVICE_TYPES.map(t=>({v:t,l:t}))}/>
                </Field>
                <Field label="Service Date"><FI type="date" value={form.service_date} onChange={e=>setForm(p=>({...p,service_date:e.target.value}))}/></Field>
                <Field label="Next Service Date"><FI type="date" value={form.next_service_date} onChange={e=>setForm(p=>({...p,next_service_date:e.target.value}))}/></Field>
                <Field label="Cost (₨)"><FI type="number" value={form.cost} onChange={e=>setForm(p=>({...p,cost:e.target.value}))} placeholder="0"/></Field>
                <Field label="Mechanic / Workshop"><FI value={form.mechanic} onChange={e=>setForm(p=>({...p,mechanic:e.target.value}))} placeholder="Name or workshop"/></Field>
                <Field label="Status">
                  <FS value={form.status} onChange={v=>setForm(p=>({...p,status:v}))} opts={["completed","scheduled","pending","overdue"].map(s=>({v:s,l:s}))}/>
                </Field>
                <Field label="Notes"><FI value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional"/></Field>
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:"1px solid #e2e8f0", display:"flex", gap:10 }}>
              <button onClick={()=>setShowForm(false)} style={{ flex:1, height:40, borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }}>Cancel</button>
              <button onClick={()=>saveMut.mutate(editing?{...form,id:editing.id}:form)} disabled={saveMut.isPending} style={{ flex:2, height:40, borderRadius:10, border:"none", background:"#f59e0b", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }}>{saveMut.isPending?"Saving…":"Save Record"}</button>
            </div>
          </div>
        </div>
      )}

      {isError&&<div style={{ background:"#fff7ed", borderRadius:12, padding:"12px 16px", marginBottom:16, border:"1px solid #fde68a", display:"flex", gap:10 }}><Info size={14} color="#d97706" style={{flexShrink:0,marginTop:1}}/><p style={{ fontSize:12, color:"#92400e", margin:0 }}>FleetMaintenance entity not found. Add it in base44 Dashboard → Data → New Entity.</p></div>}

      <div className="g4" style={{ marginBottom:16 }}>
        {[
          {l:"Records",v:maintenance.length,g:"linear-gradient(135deg,#1e3a5f,#2563eb)",f:"all"},
          {l:"Total Cost",v:fmt(maintenance.reduce((s,m)=>s+(m.cost||0),0)),g:"linear-gradient(135deg,#78350f,#f59e0b)",f:"all"},
          {l:"Overdue",v:overdue.length,g:overdue.length>0?"linear-gradient(135deg,#7f1d1d,#dc2626)":"linear-gradient(135deg,#064e3b,#10b981)",f:"overdue"},
          {l:"Scheduled",v:scheduled.length,g:"linear-gradient(135deg,#1e1b4b,#7c3aed)",f:"scheduled"}
        ].map(k=>(
          <div key={k.l} onClick={()=>setFS(k.f)} style={{ background:k.g, borderRadius:16, padding:"16px 18px", color:"#fff", cursor:"pointer", transition:"transform 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="none"}>
            <p style={{ fontSize:11, fontWeight:700, opacity:0.75, textTransform:"uppercase", margin:"0 0 6px" }}>{k.l}</p>
            <p style={{ fontSize:22, fontWeight:800, margin:0 }}>{k.v}</p>
          </div>
        ))}
      </div>

      {(overdue.length>0||dueIn7.length>0)&&(
        <Card style={{ marginBottom:14, borderColor:"#fde68a", background:"#fffbeb" }}>
          <p style={{ fontWeight:700, fontSize:13, color:"#92400e", margin:"0 0 10px" }}>⚠ {overdue.length} overdue · {dueIn7.length} due within 7 days</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[...overdue,...dueIn7].slice(0,5).map(m=>{
              const d=m.next_service_date?differenceInDays(new Date(m.next_service_date),new Date()):null;
              const isOD=m.status==="overdue"||(d!==null&&d<0);
              return (
                <div key={m.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fff", borderRadius:10, padding:"10px 14px", border:`1px solid ${isOD?"#fecaca":"#fde68a"}` }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:12, color:"#1e293b", margin:0 }}>{m.vehicle_number} — {m.service_type}</p>
                    <p style={{ fontSize:11, color:"#64748b", margin:"2px 0 0" }}>{isOD?`Overdue by ${Math.abs(d||0)} days`:`Due in ${d} days — ${m.next_service_date}`}</p>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <SB status={isOD?"overdue":"scheduled"}/>
                    {canEdit&&<button onClick={()=>openEdit(m)} style={{ padding:"4px 10px", background:"#fff7ed", color:"#f97316", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Update</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="g2" style={{ marginBottom:14 }}>
        <Card>
          <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:14 }}>Most Costly Fleet Vehicles</p>
          {vehicleCost.length>0?(
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={vehicleCost.slice(0,8)} layout="vertical" margin={{ top:0, right:10, left:10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis type="number" tick={{ fontSize:10 }} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <YAxis dataKey="vehicle" type="category" tick={{ fontSize:9 }} width={55}/>
                <Tooltip formatter={v=>fmt(v)}/>
                <Bar dataKey="cost" fill="#f59e0b" radius={[0,4,4,0]}>{vehicleCost.slice(0,8).map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ):<p style={{ color:"#94a3b8", fontSize:12, textAlign:"center", padding:20 }}>No cost data yet</p>}
        </Card>
        <Card>
          <p style={{ fontWeight:700, fontSize:13, color:"#1e293b", marginBottom:10 }}>Upcoming (≤30 days)</p>
          <div style={{ overflowY:"auto", maxHeight:180 }}>
            {scheduled.filter(m=>differenceInDays(new Date(m.next_service_date),new Date())<=30).map(m=>(
              <div key={m.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:"#1e293b", margin:0 }}>{m.vehicle_number}</p>
                  <p style={{ fontSize:10, color:"#64748b", margin:0 }}>{m.service_type}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:11, fontWeight:700, color:"#7c3aed", margin:0 }}>{differenceInDays(new Date(m.next_service_date),new Date())} days</p>
                  <p style={{ fontSize:10, color:"#94a3b8", margin:0 }}>{m.next_service_date}</p>
                </div>
              </div>
            ))}
            {!scheduled.filter(m=>differenceInDays(new Date(m.next_service_date),new Date())<=30).length&&<p style={{ color:"#94a3b8", fontSize:12, textAlign:"center", padding:20 }}>None in 30 days</p>}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center", flexWrap:"wrap" }} className="ff">
          <div style={{ position:"relative", flex:1, minWidth:180 }}>
            <Search size={13} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ width:"100%", paddingLeft:30, height:36, border:"1px solid #e2e8f0", borderRadius:10, fontSize:13, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <select value={filterVehicle} onChange={e=>setFV(e.target.value)} style={{ height:36, border:"1px solid #e2e8f0", borderRadius:10, padding:"0 10px", fontSize:12, outline:"none", background:"#fff" }}>
            <option value="">All Vehicles</option>
            {fleetVehicles.map(v=><option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>)}
          </select>
          {["all","completed","scheduled","pending","overdue"].map(s=>(
            <button key={s} onClick={()=>setFS(s)} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:700, border:"none", cursor:"pointer", background:filterStatus===s?"#1e293b":"#f1f5f9", color:filterStatus===s?"#fff":"#64748b", textTransform:"capitalize" }}>{s}</button>
          ))}
          {canEdit&&<button onClick={openNew} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:"#f59e0b", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}><Plus size={13}/>Add Record</button>}
          <button onClick={()=>printTable("Maintenance",["Vehicle","Service","Date","Next","Cost","Mechanic","Status"],filtered.map(m=>[m.vehicle_number,m.service_type,m.service_date,m.next_service_date||"—",fmt(m.cost),m.mechanic||"—",m.status]))} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#1e293b", color:"#fff", border:"none", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer" }}><Printer size={12}/>Print</button>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead><tr style={{ borderBottom:"2px solid #f1f5f9" }}>
              {["Vehicle","Service","Date","Next Service","Cost","Mechanic","Status",""].map(h=>(
                <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, fontSize:10, textTransform:"uppercase", color:"#94a3b8" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((m,i)=>{
                const d=m.next_service_date?differenceInDays(new Date(m.next_service_date),new Date()):null;
                const isOD=m.status==="overdue"||(d!==null&&d<0&&m.status!=="completed");
                return (
                  <tr key={m.id} style={{ borderBottom:"1px solid #f8fafc", background:isOD?"#fff5f5":i%2===0?"transparent":"#fafafa" }}>
                    <td style={{ padding:"10px 12px", fontWeight:700, color:"#1e293b" }}>{m.vehicle_number||"—"}</td>
                    <td style={{ padding:"10px 12px", color:"#64748b" }}>{m.service_type||"—"}</td>
                    <td style={{ padding:"10px 12px", color:"#64748b" }}>{m.service_date||"—"}</td>
                    <td style={{ padding:"10px 12px", color:isOD?"#dc2626":"#64748b", fontWeight:isOD?700:400 }}>{m.next_service_date||"—"}{d!==null&&!isOD&&d<=7&&<span style={{ marginLeft:5, fontSize:10, color:"#f59e0b", fontWeight:700 }}>({d}d)</span>}</td>
                    <td style={{ padding:"10px 12px", fontWeight:700, color:"#f59e0b" }}>{fmt(m.cost)}</td>
                    <td style={{ padding:"10px 12px", color:"#64748b" }}>{m.mechanic||"—"}</td>
                    <td style={{ padding:"10px 12px" }}><SB status={isOD?"overdue":m.status}/></td>
                    <td style={{ padding:"10px 12px" }}>{(canEdit||canDelete)&&<div style={{ display:"flex", gap:4 }}>
                      {canEdit&&<button onClick={()=>openEdit(m)} style={{ padding:"3px 8px", background:"#f0fdf4", color:"#059669", border:"none", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>Edit</button>}
                      {canDelete&&<button onClick={()=>{if(window.confirm("Delete?"))delMut.mutate(m.id);}} style={{ padding:"3px 8px", background:"#fef2f2", color:"#dc2626", border:"none", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>Del</button>}
                    </div>}</td>
                  </tr>
                );
              })}
              {!filtered.length&&<tr><td colSpan={8} style={{ padding:28, textAlign:"center", color:"#94a3b8" }}>No records. Click Add Record to start.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE CALENDAR (DRAG & DROP)
// ══════════════════════════════════════════════════════════════════════════════
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const eventColor = (status) => {
  const m = { completed:{bg:"#d1fae5",text:"#059669",border:"#a7f3d0"}, scheduled:{bg:"#ede9fe",text:"#7c3aed",border:"#c4b5fd"}, pending:{bg:"#fef3c7",text:"#d97706",border:"#fde68a"}, overdue:{bg:"#fee2e2",text:"#dc2626",border:"#fecaca"} };
  return m[status] || {bg:"#f1f5f9",text:"#64748b",border:"#e2e8f0"};
};

function MaintenanceCalendar({ fmt, canEdit, fleetVehicles }) {
  const qc = useQueryClient();
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState(null); // selected event for detail

  const { data:maintenance=[] } = useQuery({
    queryKey:["fm_cal"],
    queryFn:()=>base44.entities.FleetMaintenance.list("-service_date",500),
    retry:false,
  });

  const updateMut = useMutation({
    mutationFn:({id, date, field="service_date"})=>base44.entities.FleetMaintenance.update(id, { [field]: date }),
    onSuccess:(_, { field })=>{ qc.invalidateQueries(["fm_cal"]); qc.invalidateQueries(["fm_page"]); toast.success(field==="next_service_date" ? "Next service date rescheduled" : "Service date rescheduled"); },
    onError:e=>toast.error("Failed: "+e.message),
  });

  // Build calendar grid — days of the month
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); };

  // Map events to days — show BOTH service_date and next_service_date as distinct entries
  const eventsByDay = useMemo(() => {
    const map = {};
    maintenance.forEach(m => {
      // Primary: service_date (completed/past events)
      if (m.service_date) {
        const dt = new Date(m.service_date);
        if (dt.getFullYear()===year && dt.getMonth()===month) {
          const day = dt.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({ ...m, _dateField:"service_date", _draggableId: m.id + "_s" });
        }
      }
      // Secondary: next_service_date (scheduled/pending events) — shown separately
      if (m.next_service_date && m.status !== "completed") {
        const dt = new Date(m.next_service_date);
        if (dt.getFullYear()===year && dt.getMonth()===month) {
          const day = dt.getDate();
          if (!map[day]) map[day] = [];
          // Avoid double-showing if same day as service_date
          const alreadyOnDay = map[day].some(e => e.id === m.id && e._dateField === "service_date");
          if (!alreadyOnDay) {
            map[day].push({ ...m, _dateField:"next_service_date", _draggableId: m.id + "_n", status: m.status || "scheduled" });
          }
        }
      }
    });
    return map;
  }, [maintenance, year, month]);

  const onDragEnd = (result) => {
    setDragging(false);
    if (!result.destination || !canEdit) return;
    const destDay = parseInt(result.destination.droppableId);
    if (isNaN(destDay)) return;
    const draggableId = result.draggableId;
    const newDate = `${year}-${String(month+1).padStart(2,"0")}-${String(destDay).padStart(2,"0")}`;
    // Determine which field to update based on draggableId suffix
    const isNextService = draggableId.endsWith("_n");
    const recordId = draggableId.replace(/_[sn]$/, "");
    const field = isNextService ? "next_service_date" : "service_date";
    updateMut.mutate({ id: recordId, date: newDate, field });
  };

  const STATUS_COLORS = {completed:"#059669",scheduled:"#7c3aed",pending:"#d97706",overdue:"#dc2626"};

  // Weeks array: pad start with nulls
  const cells = Array(firstDay).fill(null).concat(Array.from({length:daysInMonth},(_,i)=>i+1));
  while(cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for(let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));

  const isToday = (d) => d && today.getDate()===d && today.getMonth()===month && today.getFullYear()===year;

  // Count this month's events
  const thisMonthEvents = maintenance.filter(m=>{
    const d=m.service_date||m.next_service_date;
    if(!d) return false;
    const dt=new Date(d);
    return dt.getFullYear()===year&&dt.getMonth()===month;
  });

  return (
    <div>
      {/* Selected event detail modal */}
      {selected && (
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:440,overflow:"hidden"}}>
            <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",background:`linear-gradient(135deg,${eventColor(selected.status).bg},#fff)`}}>
              <div>
                <span style={{fontSize:10,fontWeight:800,background:eventColor(selected.status).bg,color:eventColor(selected.status).text,padding:"2px 8px",borderRadius:99,textTransform:"uppercase"}}>{selected.status}</span>
                <h3 style={{fontSize:16,fontWeight:800,color:"#0f172a",margin:"6px 0 0"}}>{selected.service_type}</h3>
              </div>
              <button onClick={()=>setSelected(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={13}/></button>
            </div>
            <div style={{padding:"18px 22px"}}>
              {[["Vehicle",selected.vehicle_number||"—"],["Service Date",selected.service_date||"—"],["Next Service",selected.next_service_date||"—"],["Cost",fmt(selected.cost||0)],["Mechanic",selected.mechanic||"—"],["Notes",selected.notes||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9"}}>
                  <span style={{fontSize:12,color:"#64748b"}}>{l}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{padding:"12px 22px",borderTop:"1px solid #e2e8f0"}}>
              <button onClick={()=>setSelected(null)} style={{width:"100%",height:38,borderRadius:10,border:"none",background:"#1e293b",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Month header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={prevMonth} style={{width:32,height:32,borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>‹</button>
          <h2 style={{fontSize:18,fontWeight:800,color:"#0f172a",margin:0}}>{FULL_MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} style={{width:32,height:32,borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>›</button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {Object.entries(STATUS_COLORS).map(([s,c])=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#64748b"}}>
              <span style={{width:10,height:10,borderRadius:3,background:c,display:"block"}}/>
              <span style={{textTransform:"capitalize"}}>{s}</span>
            </div>
          ))}
          <span style={{fontSize:11,color:"#94a3b8",marginLeft:8}}>{thisMonthEvents.length} events</span>
          <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#94a3b8",marginLeft:8,paddingLeft:8,borderLeft:"1px solid #e2e8f0"}}>
            <span style={{display:"inline-block",width:22,height:8,borderRadius:2,border:"1.5px solid #7c3aed",background:"#ede9fe"}}/>
            <span>next service</span>
            <span style={{display:"inline-block",width:22,height:8,borderRadius:2,border:"1.5px solid #059669",background:"#d1fae5",marginLeft:6}}/>
            <span>done</span>
          </div>
        </div>
      </div>

      {!canEdit && (
        <div style={{background:"#eff6ff",borderRadius:10,padding:"8px 14px",marginBottom:12,fontSize:12,color:"#1d4ed8",fontWeight:600}}>
          👁 View mode — drag-and-drop is available for fleet managers and admins only
        </div>
      )}

      {/* Calendar grid */}
      <DragDropContext onDragStart={()=>setDragging(true)} onDragEnd={onDragEnd}>
        <Card style={{padding:0,overflow:"hidden"}}>
          {/* Day headers */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"2px solid #e2e8f0"}}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
              <div key={d} style={{padding:"10px 0",textAlign:"center",fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",background:"#f8fafc"}}>{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week,wi)=>(
            <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:wi<weeks.length-1?"1px solid #f1f5f9":"none",minHeight:110}}>
              {week.map((day,di)=>{
                const dayEvents = day ? (eventsByDay[day]||[]) : [];
                const droppableId = day ? String(day) : `empty-${wi}-${di}`;
                return (
                  <Droppable key={droppableId} droppableId={droppableId} isDropDisabled={!day||!canEdit}>
                    {(provided, snapshot)=>(
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          padding:"6px 4px",
                          minHeight:110,
                          borderRight:di<6?"1px solid #f1f5f9":"none",
                          background:!day?"#fafafa":snapshot.isDraggingOver?"#f0fdf4":isToday(day)?"#eff6ff":"#fff",
                          transition:"background 0.15s",
                          position:"relative",
                        }}
                      >
                        {day && (
                          <div style={{
                            width:24,height:24,borderRadius:"50%",
                            background:isToday(day)?"#2563eb":"transparent",
                            color:isToday(day)?"#fff":"#1e293b",
                            fontSize:12,fontWeight:isToday(day)?800:600,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            marginBottom:4,
                          }}>{day}</div>
                        )}

                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          {dayEvents.slice(0,3).map((evt,ei)=>{
                            const ec = eventColor(evt.status);
                            const isNext = evt._dateField === "next_service_date";
                            return (
                              <Draggable key={evt._draggableId} draggableId={evt._draggableId} index={ei} isDragDisabled={!canEdit}>
                                {(dp, ds)=>(
                                  <div
                                    ref={dp.innerRef}
                                    {...dp.draggableProps}
                                    {...dp.dragHandleProps}
                                    onClick={(e)=>{e.stopPropagation();setSelected(evt);}}
                                    style={{
                                      background:ec.bg,
                                      border:`1px solid ${ec.border}`,
                                      borderRadius:6,padding:"3px 6px",
                                      fontSize:10,fontWeight:700,color:ec.text,
                                      cursor:canEdit?"grab":"pointer",
                                      display:"flex",alignItems:"center",gap:4,
                                      userSelect:"none",
                                      boxShadow:ds.isDragging?"0 4px 12px rgba(0,0,0,0.2)":"none",
                                      opacity: isNext ? 0.85 : 1,
                                      borderStyle: isNext ? "dashed" : "solid",
                                      ...dp.draggableProps.style,
                                    }}
                                  >
                                    {canEdit&&<GripVertical size={9} style={{flexShrink:0,opacity:0.5}}/>}
                                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
                                      {isNext && <span style={{fontSize:8,opacity:0.7,marginRight:2}}>↻</span>}
                                      {evt.vehicle_number} · {evt.service_type}
                                    </span>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {dayEvents.length>3&&(
                            <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,padding:"1px 6px"}}>+{dayEvents.length-3} more</div>
                          )}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          ))}
        </Card>
      </DragDropContext>

      {/* Monthly summary */}
      <div style={{marginTop:20,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {["completed","scheduled","pending","overdue"].map(s=>{
          const cnt = thisMonthEvents.filter(m=>m.status===s).length;
          const ec  = eventColor(s);
          return (
            <div key={s} style={{background:ec.bg,border:`1px solid ${ec.border}`,borderRadius:14,padding:"14px 16px"}}>
              <p style={{fontSize:11,fontWeight:800,color:ec.text,textTransform:"uppercase",margin:"0 0 4px"}}>{s}</p>
              <p style={{fontSize:22,fontWeight:800,color:ec.text,margin:0}}>{cnt}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function FleetMaintenance() {
  const { fmt } = useAppSettings();
  const { isAdmin, isManagement, isFleetManager, isDriver, isAccounting, isOperations, canDelete, loading: roleLoading } = useRole();
  // Accounting can VIEW but not edit maintenance records
  const canEdit = isAdmin || isManagement || isFleetManager || isOperations;
  const canView = isAdmin || isManagement || isFleetManager || isOperations || isAccounting;
  // Accounting role: can see maintenance + calendar + inventory (read-only)
  const [activeTab, setActiveTab] = useState("maintenance"); // maintenance | inventory | calendar

  const { data:fleetVehicles=[] } = useQuery({ queryKey:["fv_maint"], queryFn:()=>base44.entities.FleetVehicle.list() });

  if (roleLoading) return (
    <div className="fp" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
      <style>{SS}</style>
      <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid #e2e8f0", borderTopColor:"#1e293b", animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (isDriver) return <AccessDenied/>;
  if (!canView) return <AccessDenied/>;

  return (
    <div className="fp">
      <style>{SS}</style>

      {/* TOP BAR */}
      <div style={{ background:"rgba(15,23,42,0.97)", padding:"0 22px", display:"flex", alignItems:"center", height:50, gap:14, position:"sticky", top:0, zIndex:100 }}>
        <Link to={createPageUrl("Fleet")} style={{ display:"flex", alignItems:"center", gap:6, color:"#64748b", textDecoration:"none", fontSize:12, fontWeight:600 }}>
          <ChevronLeft size={14}/>Fleet Hub
        </Link>
        <div style={{ width:1, height:20, background:"rgba(255,255,255,0.1)" }}/>
        {activeTab==="maintenance"
          ? <><Wrench size={14} color="#f59e0b"/><span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Fleet Maintenance</span></>
          : activeTab==="calendar"
          ? <><Calendar size={14} color="#7c3aed"/><span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Maintenance Calendar</span></>
          : <><Package size={14} color="#10b981"/><span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Inventory Control</span></>
        }
        <div style={{ flex:1 }}/>
        {/* Tab switcher */}
        <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,0.08)", borderRadius:10, padding:4 }}>
          {[{id:"maintenance",l:"🔧 Maintenance"},{id:"calendar",l:"📅 Calendar"},{id:"inventory",l:"📦 Inventory"}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:"5px 12px", borderRadius:7, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:activeTab===t.id?"#fff":"transparent", color:activeTab===t.id?"#1e293b":"#94a3b8", transition:"all 0.15s" }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <main style={{ padding:"20px 22px", maxWidth:1400, margin:"0 auto" }} className="fm">
        {activeTab==="maintenance"
          ? <MaintenanceSection fmt={fmt} canEdit={canEdit} canDelete={canDelete} fleetVehicles={fleetVehicles}/>
          : activeTab==="calendar"
          ? <MaintenanceCalendar fmt={fmt} canEdit={canEdit} fleetVehicles={fleetVehicles}/>
          : <InventorySection fmt={fmt} canEdit={canEdit} canDelete={canDelete}/>
        }
      </main>
    </div>
  );
}