import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, addMonths, parseISO, isBefore, startOfDay } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  CreditCard, ChevronLeft, AlertTriangle, CheckCircle, Clock,
  Plus, X, Printer, Search, Trash2, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";

const SS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}.fp{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:900px){.g4{grid-template-columns:1fr 1fr;}.g2{grid-template-columns:1fr;}}
@media(max-width:600px){.g4{grid-template-columns:1fr 1fr;}.fm{padding:12px!important;}.ff{flex-wrap:wrap;}}
::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
@keyframes spin{to{transform:rotate(360deg)}}`;

const Card = ({ children, style = {} }) =>
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", padding:20, ...style }}>{children}</div>;

function buildScheduleFromVehicle(v) {
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
    return {
      no: i+1,
      due_date: format(dueDate,"yyyy-MM-dd"),
      amount: monthly,
      status: isPaid?"paid":isOverdue?"overdue":"pending"
    };
  });
}

function AddInstallmentModal({ vehicle, existingInstallments, onClose, qc }) {
  const [form, setForm] = useState({
    installment_number:"", due_date:"",
    amount: vehicle.monthly_installment || "",
    payment_method:"bank_transfer",
    status:"pending", notes:""
  });
  const [generating, setGenerating] = useState(false);

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.FleetInstallment.create(data),
    onSuccess: () => { qc.invalidateQueries({queryKey:["fleet_installments"]}); toast.success("Installment added"); onClose(); }
  });

  const handleBulkGenerate = async () => {
    const count = parseInt(form.installment_number) || 0;
    if (!count || !form.due_date || !form.amount) { toast.error("Fill installment count, start date and amount"); return; }
    if (generating) return; // prevent double-click

    // Build set of existing due dates for this vehicle to prevent duplicates
    const existingDates = new Set(
      existingInstallments
        .filter(i => i.fleet_vehicle_id === vehicle.id || i.vehicle_number === vehicle.vehicle_number)
        .map(i => i.due_date)
    );

    setGenerating(true);
    const start = new Date(form.due_date);
    let created = 0, skipped = 0;
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      const dateStr = d.toISOString().slice(0,10);
      // Skip if this date already has an installment for this vehicle
      if (existingDates.has(dateStr)) { skipped++; continue; }
      await base44.entities.FleetInstallment.create({
        fleet_vehicle_id:   vehicle.id,
        vehicle_number:     vehicle.vehicle_number,
        asset_name:         vehicle.asset_name || vehicle.vehicle_number,
        installment_number: i + 1,
        due_date:           dateStr,
        amount:             parseFloat(form.amount) || 0,
        status:             "pending"
      }).catch(()=>{});
      existingDates.add(dateStr); // prevent same-run duplicates too
      created++;
    }
    qc.invalidateQueries({queryKey:["fleet_installments"]});
    if (skipped > 0) toast.success(`${created} created, ${skipped} skipped (dates already exist)`);
    else toast.success(`${created} installments generated`);
    setGenerating(false);
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",width:"100%",maxWidth:480,borderRadius:20,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontWeight:800,fontSize:15,color:"#0f172a",margin:0}}>Add Installments — {vehicle.asset_name||vehicle.vehicle_number}</h3>
          <button onClick={onClose} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={14}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {label:"No. of Installments",field:"installment_number",type:"number",ph:"e.g. 12"},
            {label:"Start Date",          field:"due_date",          type:"date",  ph:""},
            {label:"Amount per Instalment (₨)",field:"amount",       type:"number",ph:"0"},
          ].map(({label,field,type,ph})=>(
            <div key={field}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4}}>{label}</label>
              <input type={type} value={form[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))} placeholder={ph}
                style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4}}>Payment Method</label>
            <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))}
              style={{width:"100%",height:38,border:"1px solid #e2e8f0",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",background:"#fff"}}>
              {["cash","bank_transfer","cheque","other"].map(m=><option key={m} value={m}>{m.replace(/_/g," ")}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={handleBulkGenerate} disabled={generating}
            style={{flex:2,height:42,background:generating?"#94a3b8":"#10b981",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:generating?"not-allowed":"pointer"}}>
            {generating?`Generating… (${form.installment_number||"?"} installments)`:`Generate All (${form.installment_number||"?"} installments)`}
          </button>
          <button onClick={()=>{
            if (!form.installment_number||!form.due_date||!form.amount){toast.error("Fill all fields");return;}
            createMut.mutate({fleet_vehicle_id:vehicle.id,vehicle_number:vehicle.vehicle_number,asset_name:vehicle.asset_name||vehicle.vehicle_number,installment_number:parseInt(form.installment_number),due_date:form.due_date,amount:parseFloat(form.amount)||0,payment_method:form.payment_method,status:"pending"});
          }} style={{flex:1,height:42,background:"#fff",color:"#1e293b",border:"1px solid #e2e8f0",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>
            Add One
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FleetInstallments() {
  const { fmt }  = useAppSettings();
  const { isAdmin, isManagement, isFleetManager, isAccounting, canDelete, loading:roleLoading } = useRole();
  const qc = useQueryClient();
  const canEdit = isAdmin || isManagement || isFleetManager;
  const canView = canEdit || isAccounting;

  const [search,          setSearch]          = useState("");
  const [filterStatus,    setFilterStatus]    = useState("all");
  const [expandedVehicle, setExpandedVehicle] = useState(null);
  const [showAddModal,    setShowAddModal]    = useState(null);

  const { data:vehicles=[]     } = useQuery({ queryKey:["fv_inst_page"], queryFn:()=>base44.entities.FleetVehicle.list() });
  const { data:installments=[], isLoading } = useQuery({ queryKey:["fleet_installments"], queryFn:()=>base44.entities.FleetInstallment.list("-due_date",1000) });

  const markPaidMut = useMutation({
    mutationFn:({id,amount})=>base44.entities.FleetInstallment.update(id,{status:"paid",paid_date:new Date().toISOString().slice(0,10),paid_amount:amount}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["fleet_installments"]});toast.success("Marked as paid");}
  });
  const deleteMut = useMutation({
    mutationFn:id=>base44.entities.FleetInstallment.delete(id),
    onSuccess:()=>{qc.invalidateQueries({queryKey:["fleet_installments"]});toast.success("Deleted");}
  });

  // ── ALL useMemo hooks BEFORE early returns ────────────────────────────────
  const instVehicles = useMemo(()=>{
    const q = search.toLowerCase();
    return vehicles
      .filter(v=>!q||[v.vehicle_number,v.asset_name,v.financing_institution].some(x=>x?.toLowerCase().includes(q)))
      .map(v=>{
        const vInst   = installments.filter(i=>i.fleet_vehicle_id===v.id||i.vehicle_number===v.vehicle_number);
        const derived = vInst.length>0?null:buildScheduleFromVehicle(v);
        const allInst = vInst.length>0?vInst:(derived||[]).map((s,idx)=>({
          id:`derived-${v.id}-${idx}`, fleet_vehicle_id:v.id, vehicle_number:v.vehicle_number,
          installment_number:s.no, due_date:s.due_date, amount:s.amount, status:s.status, _derived:true
        }));
        const total       = allInst.length;
        const paid        = allInst.filter(i=>i.status==="paid").length;
        const overdue     = allInst.filter(i=>i.status==="overdue").length;
        const monthly     = parseFloat(v.monthly_installment)||0;
        const paidAmt     = allInst.filter(i=>i.status==="paid").reduce((s,i)=>s+(i.amount||0),0);
        const remainingAmt= allInst.filter(i=>i.status!=="paid").reduce((s,i)=>s+(i.amount||0),0);
        return {...v,allInst,total,paid,overdue,pending:total-paid-overdue,monthly,paidAmt,remainingAmt,progress:total>0?(paid/total)*100:0};
      })
      .filter(v=>v.total>0||v.payment_method==="instalments");
  },[vehicles,installments,search]);

  const kpis = useMemo(()=>instVehicles.reduce((acc,v)=>({
    totalVehicles: acc.totalVehicles+1,
    paidAmt:       acc.paidAmt+v.paidAmt,
    remainingAmt:  acc.remainingAmt+v.remainingAmt,
    overdueVehicles: acc.overdueVehicles+(v.overdue>0?1:0),
    overdueAmt:    acc.overdueAmt+v.overdue*(v.monthly||0),
  }),{totalVehicles:0,paidAmt:0,remainingAmt:0,overdueVehicles:0,overdueAmt:0}),[instVehicles]);

  const cashflow = useMemo(()=>Array.from({length:12},(_,i)=>{
    const m=format(addMonths(new Date(),i),"yyyy-MM");
    const amount=instVehicles.reduce((s,v)=>s+v.allInst.filter(x=>x.due_date?.startsWith(m)&&x.status!=="paid").reduce((ss,x)=>ss+(x.amount||0),0),0);
    return {month:m.slice(5),amount};
  }),[instVehicles]);

  // ── Early returns AFTER all hooks ─────────────────────────────────────────
  if (roleLoading) return (
    <div className="fp" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}>
      <style>{SS}</style>
      <div style={{width:32,height:32,borderRadius:"50%",border:"3px solid #e2e8f0",borderTopColor:"#1e293b",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );
  if (!canView) return <AccessDenied/>;

  const filteredByStatus = (insts) => filterStatus==="all"?insts:insts.filter(i=>i.status===filterStatus);

  const printReport = () => {
    const w=window.open("","_blank");
    const rows=instVehicles.map(v=>`<tr><td>${v.vehicle_number}</td><td>${v.asset_name||"—"}</td><td>${v.financing_institution||"—"}</td><td>₨${(v.monthly||0).toLocaleString()}</td><td>${v.paid}/${v.total}</td><td style="color:${v.overdue>0?"#dc2626":"#059669"}">${v.overdue>0?v.overdue+" overdue":"✓"}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Fleet Installments</title><style>body{font-family:Arial;padding:20px;font-size:12px}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:#fff;padding:5px 8px}td{padding:5px 8px;border-bottom:1px solid #f1f5f9}</style></head><body><h2>Fleet Installments Report</h2><p>${instVehicles.length} vehicles · Remaining: ₨${kpis.remainingAmt.toLocaleString()}</p><table><thead><tr><th>Vehicle</th><th>Asset</th><th>Financed By</th><th>Monthly</th><th>Progress</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><p>Generated: ${new Date().toLocaleString()}</p></body></html>`);
    w.document.close();w.focus();setTimeout(()=>w.print(),500);
  };

  return (
    <div className="fp">
      <style>{SS}</style>

      {showAddModal&&<AddInstallmentModal vehicle={showAddModal} existingInstallments={installments} qc={qc} onClose={()=>setShowAddModal(null)}/>}

      {/* Header */}
      <div style={{background:"rgba(15,23,42,0.97)",padding:"0 22px",display:"flex",alignItems:"center",height:50,gap:14,position:"sticky",top:0,zIndex:100}}>
        <Link to={createPageUrl("Fleet")} style={{display:"flex",alignItems:"center",gap:6,color:"#64748b",textDecoration:"none",fontSize:12,fontWeight:600}}>
          <ChevronLeft size={14}/>Fleet
        </Link>
        <div style={{width:1,height:20,background:"rgba(255,255,255,0.1)"}}/>
        <CreditCard size={14} color="#0ea5e9"/>
        <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>Fleet Installments</span>
        {kpis.overdueVehicles>0&&<span style={{background:"#dc2626",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:99}}>{kpis.overdueVehicles} overdue</span>}
        <div style={{flex:1}}/>
        <button onClick={printReport} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          <Printer size={13}/>Print
        </button>
      </div>

      <main style={{padding:"20px 22px",maxWidth:1200,margin:"0 auto"}} className="fm">

        {/* KPIs */}
        <div className="g4" style={{marginBottom:20}}>
          {[
            {l:"Instalment Vehicles",v:kpis.totalVehicles,g:"linear-gradient(135deg,#1e3a5f,#2563eb)",i:CreditCard},
            {l:"Total Paid",         v:fmt(kpis.paidAmt),       g:"linear-gradient(135deg,#064e3b,#10b981)", i:CheckCircle},
            {l:"Remaining",          v:fmt(kpis.remainingAmt),  g:"linear-gradient(135deg,#78350f,#f59e0b)", i:Clock},
            {l:"Overdue Vehicles",   v:kpis.overdueVehicles,    g:kpis.overdueVehicles>0?"linear-gradient(135deg,#7f1d1d,#dc2626)":"linear-gradient(135deg,#042f2e,#0d9488)", i:AlertTriangle},
          ].map(k=>(
            <div key={k.l} style={{background:k.g,borderRadius:16,padding:"16px 18px",color:"#fff",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:12,top:12,opacity:0.15}}><k.i size={38}/></div>
              <p style={{fontSize:11,fontWeight:700,opacity:0.75,textTransform:"uppercase",margin:"0 0 6px"}}>{k.l}</p>
              <p style={{fontSize:22,fontWeight:800,margin:0}}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="g2" style={{marginBottom:20}}>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Upcoming Payments — Next 12 Months</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cashflow} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip formatter={v=>[`₨${Number(v).toLocaleString()}`,"Due"]}/>
                <Bar dataKey="amount" fill="#0ea5e9" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Overall Progress</p>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={[{name:"Paid",value:kpis.paidAmt},{name:"Remaining",value:kpis.remainingAmt}].filter(d=>d.value>0)}
                  cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value">
                  <Cell fill="#10b981"/><Cell fill="#e2e8f0"/>
                </Pie>
                <Tooltip formatter={v=>`₨${Number(v).toLocaleString()}`}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:4}}>
              {[{l:"Paid",c:"#10b981",v:kpis.paidAmt},{l:"Remaining",c:"#e2e8f0",v:kpis.remainingAmt}].map(d=>(
                <div key={d.l} style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:d.c,display:"block"}}/>
                  <span style={{fontSize:11,color:"#64748b"}}>{d.l}: {fmt(d.v)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Search + filter */}
        <Card style={{marginBottom:16}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}} className="ff">
            <div style={{position:"relative",flex:1,minWidth:200}}>
              <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vehicle, asset name…"
                style={{width:"100%",paddingLeft:30,height:36,border:"1px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            {["all","pending","paid","overdue"].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",background:filterStatus===s?"#1e293b":"#f1f5f9",color:filterStatus===s?"#fff":"#64748b",textTransform:"capitalize"}}>
                {s==="all"?"All Statuses":s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
        </Card>

        {/* Vehicle list */}
        {isLoading ? (
          <div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Loading…</div>
        ) : instVehicles.length===0 ? (
          <Card style={{textAlign:"center",padding:40}}>
            <CreditCard size={36} color="#cbd5e1" style={{margin:"0 auto 12px",display:"block"}}/>
            <p style={{fontWeight:700,color:"#1e293b"}}>No instalment vehicles found</p>
            <p style={{color:"#94a3b8",fontSize:12,marginTop:6}}>
              Go to <Link to={createPageUrl("Fleet")} style={{color:"#10b981",fontWeight:700}}>Fleet</Link> → Fleet Vehicles → Edit vehicle → set Payment Method to "Instalments"
            </p>
          </Card>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {instVehicles.map(v=>{
              const isExp = expandedVehicle===v.id;
              const instToShow = filteredByStatus(v.allInst).sort((a,b)=>a.installment_number-b.installment_number);
              return (
                <Card key={v.id} style={{padding:0,overflow:"hidden"}}>
                  <div onClick={()=>setExpandedVehicle(isExp?null:v.id)}
                    style={{padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                        <p style={{fontWeight:800,fontSize:14,color:"#1e293b",margin:0}}>{v.vehicle_number}</p>
                        {v.asset_name&&<p style={{fontSize:12,color:"#64748b",margin:0}}>{v.asset_name}</p>}
                        {v.overdue>0&&<span style={{background:"#fee2e2",color:"#dc2626",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99}}>{v.overdue} overdue</span>}
                      </div>
                      <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontSize:11,color:"#64748b"}}>{v.financing_institution||"—"}</span>
                        <span style={{fontSize:11,fontWeight:700,color:"#1e293b"}}>₨{(v.monthly||0).toLocaleString()}/mo</span>
                        <span style={{fontSize:11,color:"#64748b"}}>{v.paid}/{v.total} paid</span>
                        <span style={{fontSize:11,color:"#dc2626",fontWeight:600}}>Remaining: {fmt(v.remainingAmt)}</span>
                      </div>
                      <div style={{marginTop:8,background:"#f1f5f9",borderRadius:99,height:6,width:"100%",maxWidth:300}}>
                        <div style={{width:`${v.progress}%`,height:"100%",background:v.progress>=100?"#10b981":"#0ea5e9",borderRadius:99}}/>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {canEdit&&<button onClick={e=>{e.stopPropagation();setShowAddModal(v);}}
                        style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:"#f0fdf4",color:"#059669",border:"none",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                        <Plus size={12}/>Add
                      </button>}
                      {isExp?<ChevronUp size={16} color="#64748b"/>:<ChevronDown size={16} color="#64748b"/>}
                    </div>
                  </div>

                  {isExp&&(
                    <div style={{borderTop:"1px solid #f1f5f9",padding:"12px 18px"}}>
                      {!instToShow.length?(
                        <p style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"12px 0"}}>No records for selected filter</p>
                      ):(
                        <div style={{overflowX:"auto"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                            <thead><tr style={{borderBottom:"2px solid #f1f5f9"}}>
                              {["#","Due Date","Amount","Status","Paid Date",""].map(h=>(
                                <th key={h} style={{padding:"6px 10px",textAlign:"left",fontWeight:700,fontSize:10,textTransform:"uppercase",color:"#94a3b8"}}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {instToShow.map(inst=>(
                                <tr key={inst.id} style={{borderBottom:"1px solid #f8fafc",background:inst.status==="overdue"?"#fff5f5":inst.status==="paid"?"#f0fdf4":"transparent"}}>
                                  <td style={{padding:"8px 10px",fontWeight:700,color:"#64748b"}}>{inst.installment_number}</td>
                                  <td style={{padding:"8px 10px",color:"#1e293b"}}>{inst.due_date}</td>
                                  <td style={{padding:"8px 10px",fontWeight:700,color:"#1e293b"}}>₨{(inst.amount||0).toLocaleString()}</td>
                                  <td style={{padding:"8px 10px"}}>
                                    <span style={{background:inst.status==="paid"?"#d1fae5":inst.status==="overdue"?"#fee2e2":"#fef3c7",color:inst.status==="paid"?"#059669":inst.status==="overdue"?"#dc2626":"#d97706",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,textTransform:"uppercase"}}>
                                      {inst.status}
                                    </span>
                                  </td>
                                  <td style={{padding:"8px 10px",color:"#64748b"}}>{inst.paid_date||"—"}</td>
                                  <td style={{padding:"8px 10px"}}>
                                    {!inst._derived&&(
                                      <div style={{display:"flex",gap:4}}>
                                        {inst.status!=="paid"&&<button onClick={()=>markPaidMut.mutate({id:inst.id,amount:inst.amount})}
                                          style={{padding:"3px 8px",background:"#d1fae5",color:"#059669",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>
                                          Mark Paid
                                        </button>}
                                        {canDelete&&<button onClick={()=>{if(window.confirm("Delete?"))deleteMut.mutate(inst.id);}}
                                          style={{padding:"3px 8px",background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>
                                          <Trash2 size={10}/>
                                        </button>}
                                      </div>
                                    )}
                                    {inst._derived&&<span style={{fontSize:10,color:"#94a3b8",fontStyle:"italic"}}>auto</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}