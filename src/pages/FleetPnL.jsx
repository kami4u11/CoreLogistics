import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from "recharts";
import { BarChart2, ChevronLeft, Printer, TrendingUp, TrendingDown, DollarSign, Info } from "lucide-react";

const SS=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;}.fp{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}@media(max-width:900px){.g4{grid-template-columns:1fr 1fr;}.g2{grid-template-columns:1fr;}}@media(max-width:600px){.g4{grid-template-columns:1fr 1fr;}.fm{padding:12px!important;}}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}`;
const Card=({children,style={}})=><div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",padding:20,...style}}>{children}</div>;

// Accounting period rule: date before 5th → previous month
const accountingMonth = (dateStr) => {
  if (!dateStr) return format(new Date(),"yyyy-MM");
  const d = new Date(dateStr);
  return d.getDate() < 5 ? format(subMonths(d,1),"yyyy-MM") : format(d,"yyyy-MM");
};

const printTable=(title,headers,rows)=>{const w=window.open("","_blank");w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial;padding:20px;font-size:12px}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:#fff;padding:6px 10px;font-size:11px;text-align:left}td{padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:11px}</style></head><body><h2>${title}</h2><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c??""}</td>`).join("")}</tr>`).join("")}</tbody></table><p style="font-size:10px;color:#94a3b8;margin-top:12px">Printed: ${new Date().toLocaleString()}</p></body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),500);};

const cTooltip = fmt => ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 14px",fontSize:12}}><p style={{fontWeight:700,marginBottom:4,color:"#1e293b"}}>{label}</p>{payload.map(p=><p key={p.name} style={{color:p.color,margin:"2px 0"}}>{p.name}: {fmt(p.value)}</p>)}</div>;
};

export default function FleetPnL() {
  const { fmt } = useAppSettings();
  const { isDriver, loading: roleLoading } = useRole();
  const [period, setPeriod] = useState("6");

  const { data: trips=[] }        = useQuery({ queryKey:["ft_pnl"], queryFn:()=>base44.entities.FleetTrip.list("-trip_date",500) });
  const { data: addlExpenses=[] } = useQuery({ queryKey:["fe_pnl"], queryFn:()=>base44.entities.FleetExpense.list("-expense_date",500) });
  const { data: fleetVehicles=[] }= useQuery({ queryKey:["fv_pnl"], queryFn:()=>base44.entities.FleetVehicle.list() });
  const { data: maintenance=[] }  = useQuery({ queryKey:["fm_pnl"], queryFn:()=>base44.entities.FleetMaintenance.list("-service_date",200).catch(()=>[]) });

  // ALL useMemo hooks MUST be before any early returns (React rules of hooks)
  const n = parseInt(period);

  const months = useMemo(()=>Array.from({length:n},(_,i)=>{
    const m=format(subMonths(new Date(),n-1-i),"yyyy-MM");
    const mTrips=trips.filter(t=>accountingMonth(t.trip_date)===m);
    const rev=mTrips.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0);
    const tripExp=mTrips.reduce((s,t)=>s+(t.total_trip_expense||0),0);
    const addlExp=addlExpenses.filter(e=>accountingMonth(e.expense_date)===m).reduce((s,e)=>s+(e.amount_pkr||0),0);
    const mc=maintenance.filter(x=>accountingMonth(x.service_date)===m).reduce((s,x)=>s+(x.cost||0),0);
    const totalCost=tripExp+addlExp+mc;
    return {month:m.slice(5),fullMonth:m,rev,tripExp,addlExp,mc,totalCost,profit:rev-totalCost,trips:mTrips.length};
  }),[trips,addlExpenses,maintenance,n]);

  const vehiclePL = useMemo(()=>fleetVehicles.map(v=>{
    const vT=trips.filter(t=>t.fleet_vehicle_id===v.id||t.vehicle_number===v.vehicle_number);
    const rev=vT.reduce((s,t)=>s+(t.total_revenue||t.freight_income_pkr||0),0);
    const tripE=vT.reduce((s,t)=>s+(t.total_trip_expense||0),0);
    const addlE=addlExpenses.filter(e=>e.fleet_vehicle_id===v.id||e.vehicle_number===v.vehicle_number).reduce((s,e)=>s+(e.amount_pkr||0),0);
    const mc=maintenance.filter(m=>m.fleet_vehicle_id===v.id||m.vehicle_number===v.vehicle_number).reduce((s,m)=>s+(m.cost||0),0);
    return {vehicle:v.vehicle_number,rev,tripE,addlE,mc,cost:tripE+addlE+mc,profit:rev-tripE-addlE-mc,trips:vT.length};
  }).sort((a,b)=>b.profit-a.profit),[fleetVehicles,trips,addlExpenses,maintenance]);

  // Early returns AFTER all hooks
  if (roleLoading) return <div className="fp" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}><style>{SS}</style><div style={{width:32,height:32,borderRadius:"50%",border:"3px solid #e2e8f0",borderTopColor:"#1e293b",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (isDriver) return <AccessDenied/>;

  const totalRev=months.reduce((s,m)=>s+m.rev,0);
  const totalCost=months.reduce((s,m)=>s+m.totalCost,0);
  const totalProfit=totalRev-totalCost;
  const margin=totalRev>0?((totalProfit/totalRev)*100).toFixed(1):0;

  return (
    <div className="fp">
      <style>{SS}</style>

      <div style={{background:"rgba(15,23,42,0.97)",padding:"0 22px",display:"flex",alignItems:"center",height:50,gap:14,position:"sticky",top:0,zIndex:100}}>
        <Link to={createPageUrl("Fleet")} style={{display:"flex",alignItems:"center",gap:6,color:"#64748b",textDecoration:"none",fontSize:12,fontWeight:600}}><ChevronLeft size={14}/>Fleet Hub</Link>
        <div style={{width:1,height:20,background:"rgba(255,255,255,0.1)"}}/>
        <BarChart2 size={14} color="#8b5cf6"/>
        <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>Fleet P&L</span>
        <div style={{flex:1}}/>
        {["3","6","12"].map(p=><button key={p} onClick={()=>setPeriod(p)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:period===p?"#8b5cf6":"rgba(255,255,255,0.1)",color:period===p?"#fff":"#94a3b8"}}>{p}M</button>)}
        <button onClick={()=>printTable(`Fleet P&L — ${period}M`,["Month","Trips","Revenue","Trip Exp","Addl Exp","Maint","Total Cost","Profit","Margin"],months.map(m=>[m.fullMonth,m.trips,fmt(m.rev),fmt(m.tripExp),fmt(m.addlExp),fmt(m.mc),fmt(m.totalCost),fmt(m.profit),m.rev>0?((m.profit/m.rev)*100).toFixed(1)+"%":"—"]))} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}><Printer size={13}/>Print</button>
      </div>

      <main style={{padding:"20px 22px",maxWidth:1400,margin:"0 auto"}} className="fm">

        {/* Info banner */}
        <div style={{background:"#f0f9ff",borderRadius:12,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,border:"1px solid #bae6fd"}}>
          <Info size={14} color="#0369a1"/>
          <p style={{fontSize:12,color:"#0369a1",margin:0}}>P&L uses accounting period rule: trips/expenses before 5th of month → counted to previous month. Revenue = trip receipts. Costs = trip expenses + additional expenses + maintenance.</p>
        </div>

        <div className="g4" style={{marginBottom:20}}>
          {[
            {l:"Total Revenue",v:fmt(totalRev),g:"linear-gradient(135deg,#064e3b,#10b981)",i:TrendingUp,to:"FleetTrips"},
            {l:"Total Cost",v:fmt(totalCost),g:"linear-gradient(135deg,#7f1d1d,#dc2626)",i:TrendingDown,to:"FleetExpenses"},
            {l:"Net Profit",v:fmt(totalProfit),g:totalProfit>=0?"linear-gradient(135deg,#065f46,#059669)":"linear-gradient(135deg,#7f1d1d,#dc2626)",i:DollarSign,to:"FleetPnL"},
            {l:"Avg Margin",v:`${margin}%`,g:parseFloat(margin)>=15?"linear-gradient(135deg,#064e3b,#10b981)":parseFloat(margin)>=5?"linear-gradient(135deg,#78350f,#f59e0b)":"linear-gradient(135deg,#7f1d1d,#dc2626)",i:BarChart2,to:"FleetPnL"}
          ].map(k=>(
            <div key={k.l} onClick={()=>k.to&&(window.location.href=createPageUrl(k.to))} style={{background:k.g,borderRadius:16,padding:"16px 18px",color:"#fff",position:"relative",overflow:"hidden",cursor:"pointer",transition:"transform 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              <div style={{position:"absolute",right:12,top:12,opacity:0.15}}><k.i size={38}/></div>
              <p style={{fontSize:11,fontWeight:700,opacity:0.75,textTransform:"uppercase",margin:"0 0 6px"}}>{k.l}</p>
              <p style={{fontSize:22,fontWeight:800,margin:0}}>{k.v}</p>
              <p style={{fontSize:10,opacity:0.6,marginTop:4}}>{period} month period</p>
            </div>
          ))}
        </div>

        <div className="g2" style={{marginBottom:20}}>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Revenue vs All Costs</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={months} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={cTooltip(fmt)}/>
                <Bar dataKey="rev" name="Revenue" fill="#10b981" radius={[4,4,0,0]}/>
                <Bar dataKey="tripExp" name="Trip Exp" fill="#ef4444" stackId="cost" radius={[0,0,0,0]}/>
                <Bar dataKey="addlExp" name="Addl Exp" fill="#f97316" stackId="cost" radius={[0,0,0,0]}/>
                <Bar dataKey="mc" name="Maintenance" fill="#f59e0b" stackId="cost" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Profit Trend</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={months} margin={{top:0,right:0,left:-20,bottom:0}}>
                <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={cTooltip(fmt)}/>
                <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#8b5cf6" fill="url(#pg)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Monthly summary */}
        <Card style={{marginBottom:20}}>
          <p style={{fontWeight:700,fontSize:13,color:"#1e293b",marginBottom:14}}>Monthly P&L Summary</p>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"2px solid #f1f5f9"}}>{["Month","Trips","Revenue","Trip Expenses","Addl Expenses","Maintenance","Total Cost","Net Profit","Margin"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,fontSize:10,textTransform:"uppercase",color:"#94a3b8"}}>{h}</th>)}</tr></thead>
              <tbody>
                {[...months].reverse().map((m,i)=>{
                  const mg=m.rev>0?((m.profit/m.rev)*100).toFixed(1):0;
                  return (
                    <tr key={m.month} style={{borderBottom:"1px solid #f8fafc",background:m.profit<0?"#fff5f5":i%2===0?"transparent":"#fafafa"}}>
                      <td style={{padding:"10px 12px",fontWeight:700,color:"#1e293b"}}>{m.fullMonth}</td>
                      <td style={{padding:"10px 12px",color:"#64748b"}}>{m.trips}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:"#059669"}}>{fmt(m.rev)}</td>
                      <td style={{padding:"10px 12px",color:"#ef4444"}}>{fmt(m.tripExp)}</td>
                      <td style={{padding:"10px 12px",color:"#f97316"}}>{fmt(m.addlExp)}</td>
                      <td style={{padding:"10px 12px",color:"#f59e0b"}}>{fmt(m.mc)}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:"#dc2626"}}>{fmt(m.totalCost)}</td>
                      <td style={{padding:"10px 12px",fontWeight:800,color:m.profit>=0?"#059669":"#dc2626"}}>{fmt(m.profit)}</td>
                      <td style={{padding:"10px 12px"}}><span style={{background:parseFloat(mg)>=10?"#d1fae5":parseFloat(mg)>=0?"#fef3c7":"#fee2e2",color:parseFloat(mg)>=10?"#059669":parseFloat(mg)>=0?"#d97706":"#dc2626",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99}}>{mg}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Vehicle P&L */}
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <p style={{fontWeight:700,fontSize:13,color:"#1e293b",margin:0}}>Fleet Vehicle P&L (all time)</p>
            <button onClick={()=>printTable("Vehicle P&L",["Vehicle","Trips","Revenue","Trip Exp","Addl Exp","Maint","Net Profit","Margin"],vehiclePL.map(v=>[v.vehicle,v.trips,fmt(v.rev),fmt(v.tripE),fmt(v.addlE),fmt(v.mc),fmt(v.profit),v.rev>0?((v.profit/v.rev)*100).toFixed(1)+"%":"—"]))} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"#1e293b",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}><Printer size={11}/>Print</button>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"2px solid #f1f5f9"}}>{["Fleet Vehicle","Trips","Revenue","Trip Exp","Addl Exp","Maintenance","Net Profit","Margin"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,fontSize:10,textTransform:"uppercase",color:"#94a3b8"}}>{h}</th>)}</tr></thead>
              <tbody>
                {vehiclePL.map((v,i)=>{
                  const mg=v.rev>0?((v.profit/v.rev)*100).toFixed(1):0;
                  return (
                    <tr key={v.vehicle} style={{borderBottom:"1px solid #f8fafc",background:v.profit<0?"#fff5f5":i%2===0?"transparent":"#fafafa"}}>
                      <td style={{padding:"10px 12px",fontWeight:700,color:"#1e293b"}}>{v.vehicle}</td>
                      <td style={{padding:"10px 12px",color:"#64748b"}}>{v.trips}</td>
                      <td style={{padding:"10px 12px",fontWeight:700,color:"#059669"}}>{fmt(v.rev)}</td>
                      <td style={{padding:"10px 12px",color:"#ef4444"}}>{fmt(v.tripE)}</td>
                      <td style={{padding:"10px 12px",color:"#f97316"}}>{fmt(v.addlE)}</td>
                      <td style={{padding:"10px 12px",color:"#f59e0b"}}>{fmt(v.mc)}</td>
                      <td style={{padding:"10px 12px",fontWeight:800,color:v.profit>=0?"#059669":"#dc2626"}}>{fmt(v.profit)}</td>
                      <td style={{padding:"10px 12px"}}><span style={{background:parseFloat(mg)>=10?"#d1fae5":parseFloat(mg)>=0?"#fef3c7":"#fee2e2",color:parseFloat(mg)>=10?"#059669":parseFloat(mg)>=0?"#d97706":"#dc2626",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99}}>{mg}%</span></td>
                    </tr>
                  );
                })}
                {!vehiclePL.length&&<tr><td colSpan={8} style={{padding:28,textAlign:"center",color:"#94a3b8"}}>No data available</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}