import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useRole } from "@/components/useRole";
import { useAppSettings } from "@/components/AppSettings";
import AccessDenied from "@/components/AccessDenied";
import { ChevronLeft, Plus, X, Pencil, Trash2, BookmarkCheck, Navigation } from "lucide-react";
import { toast } from "sonner";

const SS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;}.fp{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}@media(max-width:600px){.fm{padding:12px!important;}}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}`;

const Card = ({ children, style = {} }) => (
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:20, ...style }}>{children}</div>
);
const Field = ({ label, children }) => (
  <div style={{ marginBottom:12 }}>
    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:4, textTransform:"uppercase" }}>{label}</label>
    {children}
  </div>
);
const FI = (p) => <input {...p} style={{ width:"100%", height:38, border:"1px solid #e2e8f0", borderRadius:10, padding:"0 12px", fontSize:13, outline:"none", boxSizing:"border-box" }}/>;

const EMPTY = {
  template_name:"", trip_type:"local", origin:"", destination:"", trip_fare:"",
  fuel_cost:"", driver_allowance:"", toll_charges:"", loading_expense:"",
  unloading_expense:"", broker_commission:"", repair_on_road:"", other_expense:"", notes:""
};

const EXPENSE_FIELDS = [
  { k:"trip_fare",         l:"Trip Fare (Income ₨)",     col:"#059669" },
  { k:"fuel_cost",         l:"Fuel Cost (₨)",             col:"#dc2626" },
  { k:"driver_allowance",  l:"Driver Allowance (₨)",      col:"#dc2626" },
  { k:"toll_charges",      l:"Toll Charges (₨)",          col:"#dc2626" },
  { k:"loading_expense",   l:"Loading Expense (₨)",       col:"#dc2626" },
  { k:"unloading_expense", l:"Unloading Expense (₨)",     col:"#dc2626" },
  { k:"broker_commission", l:"Broker Commission (₨)",     col:"#dc2626" },
  { k:"repair_on_road",    l:"On-Road Repair (₨)",        col:"#dc2626" },
  { k:"other_expense",     l:"Other Expense (₨)",         col:"#dc2626" },
];

export default function SavedTripExpenses() {
  const { fmt } = useAppSettings();
  const { isAdmin, isManagement, isFleetManager, isOperations, isAccounting, loading: roleLoading } = useRole();
  const qc = useQueryClient();
  const canEdit = isAdmin || isManagement || isFleetManager || isOperations || isAccounting;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { data: templates = [] } = useQuery({
    queryKey: ["saved_trip_expenses"],
    queryFn: () => base44.entities.SavedTripExpense.list(),
  });

  const saveMut = useMutation({
    mutationFn: d => {
      const nums = ["trip_fare","fuel_cost","driver_allowance","toll_charges","loading_expense","unloading_expense","broker_commission","repair_on_road","other_expense"];
      const data = { ...d };
      nums.forEach(k => { data[k] = parseFloat(d[k]) || 0; });
      return d.id ? base44.entities.SavedTripExpense.update(d.id, data) : base44.entities.SavedTripExpense.create(data);
    },
    onSuccess: () => { qc.invalidateQueries(["saved_trip_expenses"]); toast.success("Template saved"); setShowForm(false); setEditing(null); },
    onError: e => toast.error("Save failed: " + e.message),
  });

  const delMut = useMutation({
    mutationFn: id => base44.entities.SavedTripExpense.delete(id),
    onSuccess: () => { qc.invalidateQueries(["saved_trip_expenses"]); toast.success("Deleted"); },
  });

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = t  => { setEditing(t); setForm({ ...t }); setShowForm(true); };

  const totalExpense = (t) =>
    (t.fuel_cost||0)+(t.driver_allowance||0)+(t.toll_charges||0)+(t.loading_expense||0)+
    (t.unloading_expense||0)+(t.broker_commission||0)+(t.repair_on_road||0)+(t.other_expense||0);
  const formExpense = totalExpense(form);
  const formNet = (parseFloat(form.trip_fare)||0) - formExpense;

  if (roleLoading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}><div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid #e2e8f0", borderTopColor:"#10b981", animation:"spin 0.8s linear infinite" }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (!canEdit) return <AccessDenied/>;

  return (
    <div className="fp">
      <style>{SS}</style>

      {/* FORM MODAL */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:16, overflowY:"auto" }}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:640, marginTop:16, marginBottom:16, display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #e2e8f0", background:"linear-gradient(135deg,#0f172a,#1e293b)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:800, color:"#fff", margin:0 }}>{editing ? "Edit Template" : "New Trip Expense Template"}</h2>
                <p style={{ fontSize:11, color:"#94a3b8", margin:"3px 0 0" }}>Save standard route costs for quick loading into trips</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14} color="#fff"/></button>
            </div>

            <div style={{ overflowY:"auto", padding:"20px 22px" }}>
              {/* Trip type */}
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {[{v:"local",l:"🏙 Local"},{v:"intercity",l:"🛣 Intercity"}].map(o=>(
                  <button key={o.v} onClick={()=>set("trip_type",o.v)} style={{ flex:1, padding:"9px", borderRadius:10, border:`2px solid ${form.trip_type===o.v?"#10b981":"#e2e8f0"}`, background:form.trip_type===o.v?"#f0fdf4":"#fff", color:form.trip_type===o.v?"#059669":"#64748b", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                    {o.l}
                  </button>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                <Field label="Template Name *">
                  <FI value={form.template_name} onChange={e=>set("template_name",e.target.value)} placeholder="e.g. Port-Korangi Local"/>
                </Field>
                <Field label="Trip Fare / Freight (₨)">
                  <FI type="number" value={form.trip_fare} onChange={e=>set("trip_fare",e.target.value)} placeholder="Standard fare for this route" style={{ border:"1px solid #bbf7d0", background:"#f0fdf4", width:"100%", height:38, borderRadius:10, padding:"0 12px", fontSize:13, outline:"none", boxSizing:"border-box" }}/>
                </Field>
                <Field label="Origin"><FI value={form.origin} onChange={e=>set("origin",e.target.value)} placeholder="Loading point"/></Field>
                <Field label="Destination"><FI value={form.destination} onChange={e=>set("destination",e.target.value)} placeholder="Drop-off point"/></Field>
              </div>

              {/* Expense fields */}
              <div style={{ background:"#fff5f5", borderRadius:12, padding:"14px 16px", marginBottom:14, border:"1px solid #fecaca" }}>
                <p style={{ fontSize:11, fontWeight:800, color:"#dc2626", margin:"0 0 12px", textTransform:"uppercase" }}>🔻 Standard Expenses for this Route</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {EXPENSE_FIELDS.filter(f=>f.k!=="trip_fare").map(f=>(
                    <div key={f.k} style={{ marginBottom:8 }}>
                      <label style={{ display:"block", fontSize:10, fontWeight:700, color:"#64748b", marginBottom:3, textTransform:"uppercase" }}>{f.l}</label>
                      <FI type="number" value={form[f.k]} onChange={e=>set(f.k,e.target.value)} placeholder="0"/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1, background:"#f0fdf4", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
                  <p style={{ fontSize:10, color:"#64748b", fontWeight:700, margin:"0 0 4px", textTransform:"uppercase" }}>Fare</p>
                  <p style={{ fontSize:16, fontWeight:800, color:"#059669", margin:0 }}>{fmt(parseFloat(form.trip_fare)||0)}</p>
                </div>
                <div style={{ flex:1, background:"#fff5f5", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
                  <p style={{ fontSize:10, color:"#64748b", fontWeight:700, margin:"0 0 4px", textTransform:"uppercase" }}>Expenses</p>
                  <p style={{ fontSize:16, fontWeight:800, color:"#dc2626", margin:0 }}>{fmt(formExpense)}</p>
                </div>
                <div style={{ flex:1, background:formNet>=0?"#f0fdf4":"#fff5f5", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
                  <p style={{ fontSize:10, color:"#64748b", fontWeight:700, margin:"0 0 4px", textTransform:"uppercase" }}>Net</p>
                  <p style={{ fontSize:16, fontWeight:800, color:formNet>=0?"#059669":"#dc2626", margin:0 }}>{fmt(formNet)}</p>
                </div>
              </div>

              <Field label="Notes"><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="e.g. Use for all Korangi local deliveries" style={{ width:"100%", height:50, border:"1px solid #e2e8f0", borderRadius:10, padding:"8px 12px", fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box" }}/></Field>
            </div>

            <div style={{ padding:"14px 22px", borderTop:"1px solid #e2e8f0", display:"flex", gap:10, background:"#f8fafc" }}>
              <button onClick={() => setShowForm(false)} style={{ flex:1, height:40, borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }}>Cancel</button>
              <button onClick={() => saveMut.mutate(editing ? { ...form, id:editing.id } : form)} disabled={saveMut.isPending || !form.template_name}
                style={{ flex:2, height:40, borderRadius:10, border:"none", background:"#10b981", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, opacity:(!form.template_name||saveMut.isPending)?0.6:1 }}>
                {saveMut.isPending ? "Saving…" : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ background:"rgba(15,23,42,0.97)", padding:"0 22px", display:"flex", alignItems:"center", height:50, gap:14, position:"sticky", top:0, zIndex:100 }}>
        <Link to={createPageUrl("FleetTrips")} style={{ display:"flex", alignItems:"center", gap:6, color:"#64748b", textDecoration:"none", fontSize:12, fontWeight:600 }}><ChevronLeft size={14}/>Fleet Trips</Link>
        <div style={{ width:1, height:20, background:"rgba(255,255,255,0.1)" }}/>
        <BookmarkCheck size={14} color="#10b981"/>
        <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Saved Trip Expense Templates</span>
        <div style={{ flex:1 }}/>
        <button onClick={openNew} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:"#10b981", color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}><Plus size={13}/>New Template</button>
      </div>

      <main style={{ padding:"20px 22px", maxWidth:1100, margin:"0 auto" }} className="fm">
        <div style={{ background:"#eff6ff", borderRadius:12, padding:"12px 16px", marginBottom:20, border:"1px solid #bfdbfe", display:"flex", gap:10, alignItems:"flex-start" }}>
          <Navigation size={16} color="#2563eb" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:"#1d4ed8", margin:0, fontWeight:600 }}>
            Save standard expense templates for each route. When adding a trip in Fleet Trips, select <strong>"Load Template"</strong> to auto-fill all expenses in one click — ideal for local trips done daily.
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
          {[
            { l:"Templates", v:templates.length, g:"linear-gradient(135deg,#1e3a5f,#2563eb)" },
            { l:"Local Routes", v:templates.filter(t=>t.trip_type==="local").length, g:"linear-gradient(135deg,#064e3b,#10b981)" },
            { l:"Intercity Routes", v:templates.filter(t=>t.trip_type==="intercity").length, g:"linear-gradient(135deg,#1e1b4b,#7c3aed)" },
          ].map(k=>(
            <div key={k.l} style={{ background:k.g, borderRadius:16, padding:"16px 18px", color:"#fff" }}>
              <p style={{ fontSize:11, fontWeight:700, opacity:0.75, textTransform:"uppercase", margin:"0 0 6px" }}>{k.l}</p>
              <p style={{ fontSize:24, fontWeight:800, margin:0 }}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Templates grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:14 }}>
          {templates.map(t => {
            const exp = totalExpense(t);
            const net = (t.trip_fare||0) - exp;
            return (
              <Card key={t.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <span style={{ background:t.trip_type==="local"?"#dbeafe":"#f0fdf4", color:t.trip_type==="local"?"#2563eb":"#059669", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, marginBottom:6, display:"inline-block" }}>
                      {t.trip_type==="local"?"🏙 Local":"🛣 Intercity"}
                    </span>
                    <p style={{ fontSize:15, fontWeight:800, color:"#1e293b", margin:"4px 0 0" }}>{t.template_name}</p>
                    {(t.origin||t.destination) && <p style={{ fontSize:11, color:"#64748b", margin:"3px 0 0" }}>{t.origin||"—"} → {t.destination||"—"}</p>}
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={()=>openEdit(t)} style={{ padding:"5px 9px", background:"#f0fdf4", color:"#059669", border:"none", borderRadius:6, cursor:"pointer" }}><Pencil size={12}/></button>
                    <button onClick={()=>{if(window.confirm("Delete this template?"))delMut.mutate(t.id);}} style={{ padding:"5px 9px", background:"#fef2f2", color:"#dc2626", border:"none", borderRadius:6, cursor:"pointer" }}><Trash2 size={12}/></button>
                  </div>
                </div>

                <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                  <div style={{ flex:1, background:"#f0fdf4", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                    <p style={{ fontSize:9, color:"#94a3b8", fontWeight:700, margin:"0 0 2px", textTransform:"uppercase" }}>Fare</p>
                    <p style={{ fontSize:14, fontWeight:800, color:"#059669", margin:0 }}>₨{(t.trip_fare||0).toLocaleString()}</p>
                  </div>
                  <div style={{ flex:1, background:"#fff5f5", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                    <p style={{ fontSize:9, color:"#94a3b8", fontWeight:700, margin:"0 0 2px", textTransform:"uppercase" }}>Expenses</p>
                    <p style={{ fontSize:14, fontWeight:800, color:"#dc2626", margin:0 }}>₨{exp.toLocaleString()}</p>
                  </div>
                  <div style={{ flex:1, background:net>=0?"#f0fdf4":"#fff5f5", borderRadius:10, padding:"8px 10px", textAlign:"center" }}>
                    <p style={{ fontSize:9, color:"#94a3b8", fontWeight:700, margin:"0 0 2px", textTransform:"uppercase" }}>Net</p>
                    <p style={{ fontSize:14, fontWeight:800, color:net>=0?"#059669":"#dc2626", margin:0 }}>₨{net.toLocaleString()}</p>
                  </div>
                </div>

                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {[["Fuel",t.fuel_cost],["Driver",t.driver_allowance],["Toll",t.toll_charges],["Loading",t.loading_expense],["Unloading",t.unloading_expense],["Broker",t.broker_commission],["Repair",t.repair_on_road],["Other",t.other_expense]]
                    .filter(([,v])=>v>0)
                    .map(([l,v])=>(
                      <span key={l} style={{ background:"#f1f5f9", color:"#64748b", fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:99 }}>{l}: ₨{v.toLocaleString()}</span>
                    ))}
                </div>
                {t.notes && <p style={{ fontSize:11, color:"#94a3b8", marginTop:8, margin:"8px 0 0" }}>📝 {t.notes}</p>}
              </Card>
            );
          })}
          {!templates.length && (
            <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"48px 0" }}>
              <BookmarkCheck size={48} color="#94a3b8" style={{ margin:"0 auto 12px", display:"block", opacity:0.4 }}/>
              <p style={{ fontWeight:700, color:"#1e293b", fontSize:15, margin:0 }}>No templates yet</p>
              <p style={{ color:"#64748b", fontSize:13, margin:"8px 0 16px" }}>Create your first trip expense template for fast daily trip entry.</p>
              <button onClick={openNew} style={{ padding:"10px 24px", background:"#10b981", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Create First Template</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}