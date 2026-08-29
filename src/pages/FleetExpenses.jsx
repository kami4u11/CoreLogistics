import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CreditCard, Search, Plus, X, Printer, ChevronLeft, Info, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { printTable as printColorTable } from "@/utils/printUtils";
import ExportButton from "@/components/ExportButton";
import ReceiptUploader from "@/components/ReceiptUploader";
import { toast } from "sonner";

const C = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316"];
const SS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;}.fp{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}@media(max-width:900px){.g4{grid-template-columns:1fr 1fr;}}@media(max-width:600px){.g4{grid-template-columns:1fr 1fr;}.fm{padding:12px!important;}.ff{flex-wrap:wrap;}}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}`;

const Card = ({children,style={}}) => <div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",padding:20,...style}}>{children}</div>;
const Field = ({label,children}) => <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>{label}</label>{children}</div>;
const FI = ({...p}) => <input {...p} style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>;
const FS = ({value,onChange,opts,ph}) => <select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",background:"#fff"}}>{ph&&<option value="">{ph}</option>}{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>;

// Using shared colorful printTable from utils/printUtils

const accountingMonth = (dateStr) => {
  if (!dateStr) return format(new Date(),"yyyy-MM");
  const d = new Date(dateStr);
  return d.getDate() < 5 ? format(subMonths(d,1),"yyyy-MM") : format(d,"yyyy-MM");
};

// Map expense types to accounting account names
const ACCOUNT_NAME_MAP = {
  tyre_purchase:      "Fleet Tyre & Wheel Expense",
  major_repair:       "Fleet Major Repair Expense",
  insurance:          "Fleet Insurance Expense",
  registration:       "Fleet Registration & Licensing",
  fitness:            "Fleet Fitness Certificate",
  route_permit:       "Fleet Route Permit",
  tax_token:          "Fleet Tax & Token",
  battery:            "Fleet Battery & Electrical",
  body_work:          "Fleet Body & Structural Repair",
  workshop_labour:    "Fleet Workshop Labour",
  engine_overhaul:    "Fleet Engine Overhaul",
  gearbox:            "Fleet Gearbox & Transmission",
  overloading_fine:   "Fleet Fines & Penalties",
  parking_fine:       "Fleet Fines & Penalties",
  other_major:        "Fleet Miscellaneous Expense",
};

const EXPENSE_TYPES = Object.keys(ACCOUNT_NAME_MAP);

// Double-entry for additional fleet expenses
const postFleetExpenseAccounting = async (expense, vehicleNumber) => {
  const date = expense.expense_date || format(new Date(),"yyyy-MM-dd");
  const amt  = parseFloat(expense.amount_pkr) || 0;
  if (amt <= 0) return;

  const accountName = ACCOUNT_NAME_MAP[expense.expense_type] || "Fleet Miscellaneous Expense";
  const ref = `FLEET-EXP-${vehicleNumber}-${date}-${expense.expense_type}`;
  const narration = `${accountName} — ${vehicleNumber} ${date}`;

  await Promise.all([
    // Debit expense account
    base44.entities.AccountingEntry.create({
      date, account_type:"expense", account_name:accountName,
      debit:amt, credit:0, payment_source:"fleet",
      narration, reference:ref,
    }).catch(e=>console.warn("Fleet expense accounting debit failed:", e.message)),
    // Credit fleet cash out
    base44.entities.AccountingEntry.create({
      date, account_type:"expense", account_name:"Fleet Cash Out",
      debit:0, credit:amt, payment_source:"fleet",
      narration, reference:ref,
    }).catch(e=>console.warn("Fleet expense accounting credit failed:", e.message)),
  ]);
};

// Approval status badge
const ApprovalBadge = ({ status }) => {
  const m = {
    approved:         { l:"Approved",        c:"#059669", b:"#d1fae5", icon:"✓" },
    pending_approval: { l:"Pending Approval", c:"#d97706", b:"#fef3c7", icon:"⏳" },
    rejected:         { l:"Rejected",        c:"#dc2626", b:"#fee2e2", icon:"✗" },
  };
  const s = m[status] || m.approved;
  return <span style={{ background:s.b, color:s.c, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>{s.icon} {s.l}</span>;
};

export default function FleetExpenses() {
  const { fmt } = useAppSettings();
  const { isAdmin, isManagement, isFleetManager, isDriver, isAccounting, isOperations, canDelete, loading: roleLoading, user } = useRole();
  const qc = useQueryClient();
  // All roles can submit; only managers/admins can approve
  const canEdit    = isAdmin || isManagement || isFleetManager || isAccounting || isOperations;
  const canApprove = isAdmin || isManagement || isFleetManager;
  // Non-manager staff submit expenses as pending_approval
  const submitsAsPending = isOperations && !isAdmin && !isManagement && !isFleetManager;

  const [search, setSearch] = useState("");
  const [filterType, setFilterType]       = useState("all");
  const [filterMonth, setFilterMonth]     = useState(format(new Date(),"yyyy-MM"));
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterApproval, setFilterApproval] = useState("all");
  const [showForm, setShowForm]           = useState(false);
  const [editing, setEditing]             = useState(null);
  const [postToAccounting, setPostToAccounting] = useState(true);
  const [form, setForm] = useState({fleet_vehicle_number:"",fleet_vehicle_id:"",expense_date:format(new Date(),"yyyy-MM-dd"),expense_type:"tyre_purchase",amount_pkr:"",description:"",notes:"",receipt_urls:[]});

  const { data:expenses=[] } = useQuery({ queryKey:["fe_page"], queryFn:()=>base44.entities.FleetExpense.list("-expense_date",500) });
  const { data:fleetVehicles=[] } = useQuery({ queryKey:["fv_exp"], queryFn:()=>base44.entities.FleetVehicle.list() });

  const saveMut = useMutation({
    mutationFn: async d => {
      const approvalStatus = submitsAsPending ? "pending_approval" : (d.approval_status || "approved");
      const data = {
        ...d,
        vehicle_number: d.fleet_vehicle_number,
        amount_pkr: parseFloat(d.amount_pkr)||0,
        accounting_month: accountingMonth(d.expense_date),
        approval_status: approvalStatus,
        submitted_by: user?.email || "",
        receipt_urls: d.receipt_urls || [],
      };
      const veh = fleetVehicles.find(v=>v.vehicle_number===d.fleet_vehicle_number);
      if (veh) data.fleet_vehicle_id = veh.id;
      const saved = d.id
        ? await base44.entities.FleetExpense.update(d.id, data)
        : await base44.entities.FleetExpense.create(data);
      // Only post to accounting if approved
      if (postToAccounting && !d.id && approvalStatus === "approved") {
        await postFleetExpenseAccounting(data, d.fleet_vehicle_number);
      }
      return saved;
    },
    onSuccess:()=>{
      qc.invalidateQueries(["fe_page"]);
      qc.invalidateQueries(["accounting_entries"]);
      toast.success(submitsAsPending ? "Expense submitted for approval" : ("Expense saved" + (postToAccounting ? " & posted to accounts" : "")));
      setShowForm(false); setEditing(null);
    },
    onError:e=>toast.error("Save failed: "+e.message),
  });

  const approveMut = useMutation({
    mutationFn: async ({ id, status, reason }) => {
      const update = {
        approval_status: status,
        approved_by: user?.email || "manager",
        approved_at: new Date().toISOString(),
        ...(reason ? { rejection_reason: reason } : {}),
      };
      const saved = await base44.entities.FleetExpense.update(id, update);
      // Post to accounting when approved
      if (status === "approved") {
        const exp = expenses.find(e => e.id === id);
        if (exp && postToAccounting) await postFleetExpenseAccounting({ ...exp, ...update }, exp.vehicle_number);
      }
      return saved;
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries(["fe_page"]);
      toast.success(status === "approved" ? "Expense approved & posted to accounts" : "Expense rejected");
    },
    onError: e => toast.error("Failed: " + e.message),
  });
  const delMut = useMutation({mutationFn:id=>base44.entities.FleetExpense.delete(id),onSuccess:()=>{qc.invalidateQueries(["fe_page"]);toast.success("Deleted");}});

  if (roleLoading) return <div className="fp" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}><style>{SS}</style><div style={{width:32,height:32,borderRadius:"50%",border:"3px solid #e2e8f0",borderTopColor:"#1e293b",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (isDriver) return <AccessDenied/>;

  const filtered = expenses.filter(e=>{
    const q=search.toLowerCase();
    const mQ=!q||[e.vehicle_number,e.expense_type,e.description,e.notes].some(x=>x?.toLowerCase().includes(q));
    const mA=filterApproval==="all"||(e.approval_status||"approved")===filterApproval;
    return mQ&&(filterType==="all"||e.expense_type===filterType)&&(!filterMonth||accountingMonth(e.expense_date)===filterMonth)&&(!filterVehicle||e.vehicle_number===filterVehicle)&&mA;
  });

  const pendingApproval = expenses.filter(e => e.approval_status === "pending_approval");
  const monthExp = expenses.filter(e=>accountingMonth(e.expense_date)===filterMonth);
  const monthTotal = monthExp.reduce((s,e)=>s+(e.amount_pkr||0),0);
  const approvedMonthTotal = monthExp.filter(e => (e.approval_status || "approved") === "approved").reduce((s,e)=>s+(e.amount_pkr||0),0);

  const typeBreakdown = EXPENSE_TYPES.map(t=>({name:t.replace(/_/g," "),value:expenses.filter(e=>e.expense_type===t).reduce((s,e)=>s+(e.amount_pkr||0),0)})).filter(t=>t.value>0);
  const months6 = Array.from({length:6},(_,i)=>{const m=format(subMonths(new Date(),5-i),"yyyy-MM");return{month:m.slice(5),amount:expenses.filter(e=>accountingMonth(e.expense_date)===m).reduce((s,e)=>s+(e.amount_pkr||0),0)};});

  const openEdit = r => {setEditing(r);setForm({...r,fleet_vehicle_number:r.vehicle_number||r.fleet_vehicle_number||"",receipt_urls:r.receipt_urls||[]});setShowForm(true);};
  const openNew  = () => {setEditing(null);setForm({fleet_vehicle_number:"",fleet_vehicle_id:"",expense_date:format(new Date(),"yyyy-MM-dd"),expense_type:"tyre_purchase",amount_pkr:"",description:"",notes:"",receipt_urls:[]});setShowForm(true);};

  return (
    <div className="fp">
      <style>{SS}</style>

      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #e2e8f0",background:"linear-gradient(135deg,#0f172a,#1e293b)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <h2 style={{fontSize:15,fontWeight:800,color:"#fff",margin:0}}>{editing?"Edit Expense":"Add Additional Expense"}</h2>
                <p style={{fontSize:11,color:"#94a3b8",margin:"3px 0 0"}}>Major expenses only — trip expenses go in Fleet Trips</p>
              </div>
              <button onClick={()=>setShowForm(false)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={14} color="#fff"/></button>
            </div>
            <div style={{overflowY:"auto",flex:1,padding:"18px 22px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Field label="Fleet Vehicle">
                  <FS value={form.fleet_vehicle_number} onChange={v=>{const veh=fleetVehicles.find(x=>x.vehicle_number===v);setForm(p=>({...p,fleet_vehicle_number:v,fleet_vehicle_id:veh?.id||""}));}} opts={fleetVehicles.map(v=>({v:v.vehicle_number,l:v.vehicle_number}))} ph="Select fleet vehicle"/>
                </Field>
                <Field label="Expense Type">
                  <FS value={form.expense_type} onChange={v=>setForm(p=>({...p,expense_type:v,expense_type_other:""}))} opts={EXPENSE_TYPES.map(t=>({v:t,l:t.replace(/_/g," ")}))}/>
                  {(form.expense_type==="other_major"||form.expense_type==="other")&&(
                    <FI value={form.expense_type_other||""} onChange={e=>setForm(p=>({...p,expense_type_other:e.target.value}))} placeholder="Please specify expense type..." style={{marginTop:6,width:"100%",height:38,border:"1px solid #fbbf24",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  )}
                </Field>
                <Field label="Date">
                  <FI type="date" value={form.expense_date} onChange={e=>setForm(p=>({...p,expense_date:e.target.value}))}/>
                  <p style={{fontSize:10,color:"#7c3aed",margin:"3px 0 0",fontWeight:600}}>→ Accounting: {accountingMonth(form.expense_date)}</p>
                </Field>
                <Field label="Amount (₨)"><FI type="number" value={form.amount_pkr} onChange={e=>setForm(p=>({...p,amount_pkr:e.target.value}))} placeholder="0"/></Field>
                <Field label="Description"><FI value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Brief description"/></Field>
                <Field label="Notes"><FI value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional"/></Field>
              </div>

              {/* Receipt Upload */}
              <div style={{marginBottom:12}}>
                <ReceiptUploader
                  urls={form.receipt_urls||[]}
                  onChange={urls=>setForm(p=>({...p,receipt_urls:urls}))}
                  label="Receipt Attachments (photos / PDF)"
                />
              </div>

              {/* Accounting toggle */}
              {!editing&&(
                <div style={{background:"#eff6ff",borderRadius:10,padding:"10px 14px",marginTop:4,border:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Info size={14} color="#2563eb"/>
                    <div>
                      <p style={{fontSize:12,fontWeight:700,color:"#1d4ed8",margin:0}}>Post to Accounting Ledger</p>
                      <p style={{fontSize:10,color:"#3b82f6",margin:0}}>
                        Will post as: <strong>{ACCOUNT_NAME_MAP[form.expense_type]||"Fleet Miscellaneous Expense"}</strong>
                      </p>
                    </div>
                  </div>
                  <button onClick={()=>setPostToAccounting(p=>!p)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:11,background:postToAccounting?"#2563eb":"#e2e8f0",color:postToAccounting?"#fff":"#64748b"}}>
                    {postToAccounting?"✓ ON":"OFF"}
                  </button>
                </div>
              )}
            </div>
            <div style={{padding:"14px 22px",borderTop:"1px solid #e2e8f0",display:"flex",gap:10}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,height:40,borderRadius:10,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>Cancel</button>
              <button onClick={()=>saveMut.mutate(editing?{...form,id:editing.id}:form)} disabled={saveMut.isPending} style={{flex:2,height:40,borderRadius:10,border:"none",background:"#3b82f6",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>{saveMut.isPending?"Saving…":"Save Expense"}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:"rgba(15,23,42,0.97)",padding:"0 22px",display:"flex",alignItems:"center",height:50,gap:14,position:"sticky",top:0,zIndex:100}}>
        <Link to={createPageUrl("Fleet")} style={{display:"flex",alignItems:"center",gap:6,color:"#64748b",textDecoration:"none",fontSize:12,fontWeight:600}}><ChevronLeft size={14}/>Fleet Hub</Link>
        <div style={{width:1,height:20,background:"rgba(255,255,255,0.1)"}}/>
        <CreditCard size={14} color="#3b82f6"/>
        <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>Fleet Expenses</span>
        <span style={{background:"rgba(59,130,246,0.15)",color:"#3b82f6",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99}}>Posts to Accounts</span>
        <div style={{flex:1}}/>
        {canEdit&&<button onClick={openNew} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}><Plus size={13}/>Add Expense</button>}
        <ExportButton
          data={filtered}
          filename="fleet-expenses"
          title="Fleet Expenses Report"
          columns={[
            {label:"Date",key:"expense_date"},
            {label:"Vehicle",key:"vehicle_number"},
            {label:"Type",key:"expense_type",format:v=>(v||"").replace(/_/g," ")},
            {label:"Amount",key:"amount_pkr",format:v=>fmt(v||0)},
            {label:"Status",key:"approval_status"},
            {label:"Description",key:"description"},
          ]}
        />
        <button onClick={()=>printColorTable("Fleet Expenses",["Acct Month","Date","Vehicle","Type","Amount","Approval","Description","Account"],filtered.slice(0,300).map(e=>[accountingMonth(e.expense_date),e.expense_date,e.vehicle_number||"—",(e.expense_type||"").replace(/_/g," "),fmt(e.amount_pkr),e.approval_status||"approved",e.description||"—",ACCOUNT_NAME_MAP[e.expense_type]||"Fleet Misc"]),{subtitle:`${filtered.length} records · Total: ${fmt(filtered.reduce((s,e)=>s+(e.amount_pkr||0),0))}`,summary:[{label:"Total",value:fmt(filtered.reduce((s,e)=>s+(e.amount_pkr||0),0))},{label:"Records",value:filtered.length}]})} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}><Printer size={13}/>Print</button>
      </div>

      <main style={{padding:"20px 22px",maxWidth:1400,margin:"0 auto"}} className="fm">

        {/* Pending Approval Banner */}
        {pendingApproval.length > 0 && canApprove && (
          <div style={{background:"#fffbeb",borderRadius:12,padding:"14px 18px",marginBottom:16,border:"1px solid #fde68a",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <AlertTriangle size={16} color="#d97706"/>
              <div>
                <p style={{fontSize:13,fontWeight:800,color:"#92400e",margin:0}}>{pendingApproval.length} expense{pendingApproval.length!==1?"s":""} awaiting your approval</p>
                <p style={{fontSize:11,color:"#78350f",margin:"2px 0 0"}}>Total: {fmt(pendingApproval.reduce((s,e)=>s+(e.amount_pkr||0),0))} — pending expenses are excluded from P&L reports</p>
              </div>
            </div>
            <button onClick={()=>setFilterApproval("pending_approval")} style={{padding:"6px 14px",background:"#f59e0b",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Review Now</button>
          </div>
        )}

        {submitsAsPending && (
          <div style={{background:"#eff6ff",borderRadius:10,padding:"10px 14px",marginBottom:14,border:"1px solid #bfdbfe",fontSize:12,color:"#1d4ed8",fontWeight:600}}>
            ℹ Your expenses require manager approval before appearing in P&L reports.
          </div>
        )}

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <label style={{fontSize:12,color:"#64748b",fontWeight:600}}>Accounting Month:</label>
          <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{height:34,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 10px",fontSize:12,outline:"none"}}/>
          <span style={{fontSize:12,color:"#64748b"}}>Month Total: <strong style={{color:"#dc2626"}}>{fmt(monthTotal)}</strong></span>
          <span style={{fontSize:12,color:"#64748b"}}>Approved: <strong style={{color:"#059669"}}>{fmt(approvedMonthTotal)}</strong></span>
        </div>

        <div className="g4" style={{marginBottom:20}}>
          {[
            {l:"This Month (Approved)",v:fmt(approvedMonthTotal),g:"linear-gradient(135deg,#7f1d1d,#dc2626)"},
            {l:"Pending Approval",v:pendingApproval.length,g:pendingApproval.length>0?"linear-gradient(135deg,#78350f,#f59e0b)":"linear-gradient(135deg,#064e3b,#10b981)"},
            {l:"All Time (Approved)",v:fmt(expenses.filter(e=>(e.approval_status||"approved")==="approved").reduce((s,e)=>s+(e.amount_pkr||0),0)),g:"linear-gradient(135deg,#1e3a5f,#2563eb)"},
            {l:"Fleet Vehicles",v:new Set(expenses.map(e=>e.vehicle_number).filter(Boolean)).size,g:"linear-gradient(135deg,#1e1b4b,#7c3aed)"},
          ].map(k=>(
            <div key={k.l} style={{background:k.g,borderRadius:16,padding:"16px 18px",color:"#fff"}}>
              <p style={{fontSize:11,fontWeight:700,opacity:0.75,textTransform:"uppercase",margin:"0 0 6px"}}>{k.l}</p>
              <p style={{fontSize:22,fontWeight:800,margin:0}}>{k.v}</p>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Monthly Expenses (6m)</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={months6} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip formatter={v=>fmt(v)}/>
                <Bar dataKey="amount" name="Amount" fill="#3b82f6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>By Expense Type</p>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <ResponsiveContainer width="50%" height={140}>
                <PieChart><Pie data={typeBreakdown} cx="50%" cy="50%" outerRadius={58} dataKey="value">{typeBreakdown.map((_,i)=><Cell key={i} fill={C[i%C.length]}/>)}</Pie><Tooltip formatter={v=>fmt(v)}/></PieChart>
              </ResponsiveContainer>
              <div style={{flex:1,overflowY:"auto",maxHeight:140}}>
                {typeBreakdown.map((t,i)=>(
                  <div key={t.name} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f8fafc"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:"50%",background:C[i%C.length],display:"block"}}/><span style={{fontSize:11,color:"#64748b",textTransform:"capitalize"}}>{t.name}</span></div>
                    <span style={{fontSize:11,fontWeight:700,color:"#1e293b"}}>{fmt(t.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}} className="ff">
            <div style={{position:"relative",flex:1,minWidth:180}}>
              <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search expenses…" style={{width:"100%",paddingLeft:30,height:36,border:"1px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            {/* Approval filter */}
            {[{v:"all",l:"All"},{v:"approved",l:"✓ Approved"},{v:"pending_approval",l:"⏳ Pending"},{v:"rejected",l:"✗ Rejected"}].map(f=>(
              <button key={f.v} onClick={()=>setFilterApproval(f.v)} style={{padding:"5px 10px",borderRadius:20,fontSize:10,fontWeight:700,border:"none",cursor:"pointer",background:filterApproval===f.v?"#1e293b":"#f1f5f9",color:filterApproval===f.v?"#fff":"#64748b",whiteSpace:"nowrap"}}>{f.l}</button>
            ))}
            <select value={filterVehicle} onChange={e=>setFilterVehicle(e.target.value)} style={{height:36,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 10px",fontSize:12,outline:"none",background:"#fff"}}>
              <option value="">All Vehicles</option>
              {fleetVehicles.map(v=><option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>)}
            </select>
            {["all",...EXPENSE_TYPES].map(t=>(
              <button key={t} onClick={()=>setFilterType(t)} style={{padding:"5px 10px",borderRadius:20,fontSize:10,fontWeight:700,border:"none",cursor:"pointer",background:filterType===t?"#1e293b":"#f1f5f9",color:filterType===t?"#fff":"#64748b",textTransform:"capitalize",whiteSpace:"nowrap"}}>{t==="all"?"All":t.replace(/_/g," ")}</button>
            ))}
          </div>
          <p style={{fontSize:11,color:"#94a3b8",marginBottom:10}}>{filtered.length} records · Total: {fmt(filtered.reduce((s,e)=>s+(e.amount_pkr||0),0))}</p>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"2px solid #f1f5f9"}}>
                {["Acct Month","Date","Vehicle","Type","Amount","Status","Description",""].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,fontSize:10,textTransform:"uppercase",color:"#94a3b8"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.slice(0,60).map((e,i)=>{
                  const isPending = e.approval_status === "pending_approval";
                  return (
                  <tr key={e.id} style={{borderBottom:"1px solid #f8fafc",background:isPending?"#fffbeb":i%2===0?"transparent":"#fafafa"}}>
                    <td style={{padding:"10px 12px"}}><span style={{background:"#ede9fe",color:"#7c3aed",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99}}>{accountingMonth(e.expense_date)}</span></td>
                    <td style={{padding:"10px 12px",color:"#64748b"}}>{e.expense_date}</td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:"#1e293b"}}>{e.vehicle_number||"—"}</td>
                    <td style={{padding:"10px 12px"}}><span style={{background:"#ede9fe",color:"#7c3aed",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,textTransform:"capitalize"}}>{(e.expense_type||"other").replace(/_/g," ")}</span></td>
                    <td style={{padding:"10px 12px",fontWeight:700,color:"#dc2626"}}>{fmt(e.amount_pkr)}</td>
                    <td style={{padding:"10px 12px"}}>
                      <ApprovalBadge status={e.approval_status||"approved"}/>
                      {e.submitted_by&&<p style={{fontSize:9,color:"#94a3b8",margin:"2px 0 0"}}>by {e.submitted_by.split("@")[0]}</p>}
                    </td>
                    <td style={{padding:"10px 12px",color:"#64748b"}}>{e.description||"—"}{e.receipt_urls?.length>0&&<span style={{marginLeft:6,background:"#eff6ff",color:"#2563eb",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:99}}>📎 {e.receipt_urls.length}</span>}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"nowrap"}}>
                        {/* Approve / Reject buttons for managers */}
                        {canApprove && isPending && <>
                          <button onClick={()=>approveMut.mutate({id:e.id,status:"approved"})}
                            style={{padding:"3px 8px",background:"#d1fae5",color:"#059669",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>✓ Approve</button>
                          <button onClick={()=>{const r=window.prompt("Rejection reason (optional):");approveMut.mutate({id:e.id,status:"rejected",reason:r||""});}}
                            style={{padding:"3px 8px",background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>✗</button>
                        </>}
                        {canEdit&&<button onClick={()=>openEdit(e)} style={{padding:"3px 8px",background:"#f0fdf4",color:"#059669",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>Edit</button>}
                        {canDelete&&<button onClick={()=>{if(window.confirm("Delete?"))delMut.mutate(e.id);}} style={{padding:"3px 8px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>Del</button>}
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {!filtered.length&&<tr><td colSpan={8} style={{padding:28,textAlign:"center",color:"#94a3b8"}}>No expense records found</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}