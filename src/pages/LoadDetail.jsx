import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MobileHeader from "@/components/ui/MobileHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  MapPin, ArrowRight, Truck, User, Calendar,
  Weight, Pencil, Package, CheckCircle, Upload, FileText, Eye, Trash2, Printer,
  Thermometer, Hash, Phone, CreditCard, Building2
} from "lucide-react";
import BiltyPrint from "@/components/BiltyPrint";
import CMRPrint from "@/components/prints/CMRPrint";
import BOLPrint from "@/components/prints/BOLPrint";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAppSettings } from "@/components/AppSettings";

// ── Animated truck route component ───────────────────────────────────────────
function TruckRoute({ origin, destination, status }) {
  const progress =
    status === "booked"          ? 2   :
    status === "loading"         ? 12  :
    status === "dispatched"      ? 25  :
    status === "in_transit"      ? 55  :
    status === "hold_in_transit" ? 50  :
    status === "delivered"       ? 92  :
    status === "completed"       ? 100 : 2;

  const statusColor =
    status === "completed" || status === "delivered"       ? "#10b981" :
    status === "in_transit" || status === "dispatched"     ? "#2563eb" :
    status === "hold_in_transit"                           ? "#f59e0b" :
    status === "cancelled"                                 ? "#ef4444" : "#f97316";

  return (
    <div style={{ padding:"16px 0 8px", position:"relative" }}>
      {/* Origin & Destination labels */}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:"#f97316", flexShrink:0 }}/>
          <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>{origin || "—"}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#1e293b" }}>{destination || "—"}</span>
          <div style={{ width:10, height:10, borderRadius:"50%", background:"#10b981", flexShrink:0 }}/>
        </div>
      </div>

      {/* Road track */}
      <div style={{ position:"relative", height:28, display:"flex", alignItems:"center" }}>
        {/* Road background */}
        <div style={{
          position:"absolute", left:0, right:0, top:"50%", transform:"translateY(-50%)",
          height:8, borderRadius:4, background:"#e2e8f0",
          backgroundImage:"repeating-linear-gradient(90deg, transparent, transparent 8px, #cbd5e1 8px, #cbd5e1 16px)",
        }}/>
        {/* Progress fill */}
        <div style={{
          position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
          height:8, borderRadius:4, background:statusColor,
          width:`${progress}%`, transition:"width 1.2s ease",
        }}/>
        {/* Animated truck */}
        <div style={{
          position:"absolute",
          left:`calc(${progress}% - 14px)`,
          top:"50%", transform:"translateY(-60%)",
          transition:"left 1.2s ease",
          fontSize:20, lineHeight:1,
          filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
          animation: status==="in_transit" ? "truckBounce 0.5s ease-in-out infinite alternate" : "none",
        }}>🚛</div>
      </div>

      {/* Status label */}
      <div style={{ display:"flex", justifyContent:"center", marginTop:8 }}>
        <span style={{
          fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em",
          color:statusColor, background:`${statusColor}15`,
          padding:"3px 10px", borderRadius:99,
        }}>
          {status === "in_transit"      ? "🚛 In Transit" :
           status === "dispatched"       ? "🚀 Dispatched" :
           status === "hold_in_transit"  ? "⏸ Hold In Transit" :
           status === "completed"        ? "✅ Completed" :
           status === "delivered"        ? "📦 Delivered" :
           status === "loading"          ? "📤 Loading" :
           status === "booked"           ? "📋 Booked" :
           status === "cancelled"        ? "❌ Cancelled" : status}
        </span>
      </div>
      <style>{`@keyframes truckBounce{from{transform:translateY(-60%)}to{transform:translateY(-75%)}}`}</style>
    </div>
  );
}

export default function LoadDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const queryClient = useQueryClient();
  const [user, setUser]               = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [showBiltyPrint, setShowBiltyPrint] = useState(false);
  const [showCMRPrint,   setShowCMRPrint]   = useState(false);
  const [showBOLPrint,   setShowBOLPrint]   = useState(false);
  const { fmt, settings } = useAppSettings();
  const companyProfile = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
  const isPakistanOrIndia = settings.code === "pakistan" || settings.code === "india";
  const isUSA = settings.code === "usa";
  const isEU  = settings.code === "eu" || settings.code === "uk";

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: load, isLoading } = useQuery({
    queryKey: ["load", id],
    queryFn: async () => {
      const loads = await base44.entities.Load.list();
      return loads.find(l => l.id === id);
    },
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["load_documents", id],
    queryFn: () => base44.entities.LoadDocument.filter({ load_id: id }),
    enabled: !!id,
  });

  const addDocMutation = useMutation({
    mutationFn: data => base44.entities.LoadDocument.create(data),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["load_documents", id] }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: docId => base44.entities.LoadDocument.delete(docId),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["load_documents", id] }),
  });

  const updateMutation = useMutation({
    mutationFn: data => base44.entities.Load.update(id, data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ["load", id] }); toast.success("Updated"); },
  });

  const handleFileUpload = async (e, docType, isDeliveryProof = false) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await addDocMutation.mutateAsync({
      load_id: id, load_number: load?.load_number,
      document_type: docType, document_name: file.name, file_url,
      upload_date: new Date().toISOString().slice(0, 10),
      is_delivery_proof: isDeliveryProof,
    });
    setUploading(false);
    toast.success("Document uploaded");
  };

  const role       = user?.role || "user";
  const canSeeRates  = ["admin","management","accounting"].includes(role);
  const canEditLoad  = ["admin","management","operations"].includes(role);

  const ALL_STATUSES = [
    { v:"booked",          l:"📋 Booked" },
    { v:"loading",         l:"📤 Loading" },
    { v:"dispatched",      l:"🚀 Dispatched" },
    { v:"in_transit",      l:"🚛 In Transit" },
    { v:"hold_in_transit", l:"⏸ Hold In Transit" },
    { v:"delivered",       l:"📦 Delivered" },
    { v:"completed",       l:"✅ Completed" },
    { v:"cancelled",       l:"❌ Cancelled" },
  ];

  if (isLoading) return (
    <div className="pb-24">
      <MobileHeader title="Load Details" backTo="Bilties"/>
      <div className="px-4 py-6 space-y-4">
        {Array(3).fill(0).map((_,i)=><div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse h-32"/>)}
      </div>
    </div>
  );

  if (!load) return (
    <div className="pb-24">
      <MobileHeader title="Load Details" backTo="Bilties"/>
      <div className="flex items-center justify-center py-20 text-slate-400">Load not found</div>
    </div>
  );

  // Bilty number: show load_number if present, else show id fragment
  const biltyDisplay = load.load_number || `#${id?.slice(-6)}`;

  return (
    <div className="pb-24">
      {showBiltyPrint && <BiltyPrint load={load} companyProfile={companyProfile} onClose={()=>setShowBiltyPrint(false)}/>}
      {showCMRPrint   && <CMRPrint   load={load} companyProfile={companyProfile} onClose={()=>setShowCMRPrint(false)}/>}
      {showBOLPrint   && <BOLPrint   load={load} companyProfile={companyProfile} onClose={()=>setShowBOLPrint(false)}/>}

      <MobileHeader
        title={load.load_id_number || `Load ${biltyDisplay}`}
        backTo="Bilties"
        rightAction={
          <div className="flex items-center gap-1.5">
            {isPakistanOrIndia && (
              <button onClick={()=>setShowBiltyPrint(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl">
                <Printer className="w-3.5 h-3.5"/> Bilty
              </button>
            )}
            {isEU && (
              <button onClick={()=>setShowCMRPrint(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl">
                <Printer className="w-3.5 h-3.5"/> CMR
              </button>
            )}
            {isUSA && (
              <button onClick={()=>setShowBOLPrint(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold rounded-xl">
                <Printer className="w-3.5 h-3.5"/> BOL
              </button>
            )}
            {canEditLoad && (
              <Link to={createPageUrl(`BiltyForm?id=${id}`)}>
                <Button variant="ghost" size="sm" className="rounded-xl"><Pencil className="w-4 h-4"/></Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4">

        {/* ── Document Numbers ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {load.load_id_number && (
                <div className="bg-blue-50 rounded-xl px-3 py-1.5">
                  <p className="text-[10px] text-blue-400 font-semibold">LOAD ID</p>
                  <p className="text-sm font-bold text-blue-800">{load.load_id_number}</p>
                </div>
              )}
              <div className="bg-orange-50 rounded-xl px-3 py-1.5">
                <p className="text-[10px] text-orange-400 font-semibold">BILTY NO.</p>
                <p className="text-sm font-bold text-orange-800">{biltyDisplay}</p>
              </div>
              {load.dn_number && (
                <div className="bg-slate-50 rounded-xl px-3 py-1.5">
                  <p className="text-[10px] text-slate-400 font-semibold">DN NO.</p>
                  <p className="text-sm font-bold text-slate-700">{load.dn_number}</p>
                </div>
              )}
              {load.cn_number && (
                <div className="bg-slate-50 rounded-xl px-3 py-1.5">
                  <p className="text-[10px] text-slate-400 font-semibold">CN NO.</p>
                  <p className="text-sm font-bold text-slate-700">{load.cn_number}</p>
                </div>
              )}
              {load.seal_number && (
                <div className="bg-purple-50 rounded-xl px-3 py-1.5">
                  <p className="text-[10px] text-purple-400 font-semibold">SEAL</p>
                  <p className="text-sm font-bold text-purple-800">{load.seal_number}</p>
                </div>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${load.is_confirmed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {load.is_confirmed ? "✓ Confirmed" : "Draft"}
            </span>
          </div>

          {/* Payment type badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${load.payment_type === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              {load.payment_type === "paid" ? "PAID" : "TO PAY"}
            </span>
            <StatusBadge status={load.status}/>
          </div>
        </div>

        {/* ── Animated Route Card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl px-5 pt-4 pb-3 border border-slate-100">
          {canSeeRates && load.freight_amount > 0 && (
            <div className="flex justify-end mb-2">
              <span className="text-lg font-bold text-slate-900">{fmt(load.freight_amount)}</span>
            </div>
          )}
          <TruckRoute origin={load.origin} destination={load.destination} status={load.status}/>
        </div>

        {/* ── Quick Status Update ──────────────────────────────────────── */}
        {(canEditLoad || role === "supervisor" || role === "operations") && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Status Update</h3>
            <Select value={load.status} onValueChange={v=>updateMutation.mutate({status:v})}>
              <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(s=>(
                  <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── Full Details ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Details</h3>
          <div className="space-y-3">
            {load.client_name     && <DR icon={User}       label="Client"        value={load.client_name}/>}
            {load.broker_name     && <DR icon={User}       label="Broker"        value={load.broker_name}/>}
            {load.receiver_name   && <DR icon={User}       label="Receiver"      value={load.receiver_name}/>}
            {load.vehicle_number  && <DR icon={Truck}      label="Vehicle"       value={`${load.vehicle_number}${load.vehicle_type ? ` (${load.vehicle_type})` : ""}`}/>}
            {load.driver_name     && <DR icon={User}       label="Driver"        value={load.driver_name}/>}
            {load.cargo_type      && <DR icon={Package}    label="Cargo"         value={load.cargo_type}/>}
            {load.cargo_description && <DR icon={Package}  label="Description"   value={load.cargo_description}/>}
            {load.quantity > 0    && <DR icon={Hash}       label="Quantity"      value={`${load.quantity} pkgs`}/>}
            {load.weight_tons > 0 && <DR icon={Weight}     label="Weight"        value={`${load.weight_tons} Tons`}/>}
            {load.reefer_temperature != null && <DR icon={Thermometer} label="Reefer Temp" value={`${load.reefer_temperature}°C`}/>}
            {load.loading_date    && <DR icon={Calendar}   label="Loading Date"  value={format(new Date(load.loading_date), "dd MMM yyyy")}/>}
            {load.delivery_date   && <DR icon={Calendar}   label="Delivery Date" value={format(new Date(load.delivery_date), "dd MMM yyyy")}/>}
            {load.is_own_fleet    && <DR icon={Building2}  label="Fleet Type"    value="Own Fleet"/>}
            {load.notes && (
              <div className="pt-1 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Notes / Address</p>
                <p className="text-sm text-slate-600">{load.notes}</p>
              </div>
            )}
            {load.destinations?.length > 1 && (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5"/>
                  <span>All Destinations</span>
                </div>
                <div className="text-right">
                  {load.destinations.map((d,i)=><p key={i} className="text-xs font-medium text-slate-700">{d}</p>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Loading Images ───────────────────────────────────────────── */}
        {load.loading_images?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Loading Photos</h3>
            <div className="flex flex-wrap gap-2">
              {load.loading_images.map((url,i)=>(
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Loading ${i+1}`} className="w-20 h-20 object-cover rounded-xl border border-slate-200"/>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Financials ───────────────────────────────────────────────── */}
        {canSeeRates && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Financials</h3>
            <div className="space-y-2.5">
              <FR label="Freight / Approved Rate" amount={load.approved_rate || load.freight_amount} symbol={settings.symbol}/>
              {load.broker_hired_amount > 0 && <FR label="Broker Hired Amount" amount={load.broker_hired_amount} minus symbol={settings.symbol}/>}
              {load.advance_amount > 0      && <FR label="Advance Paid"        amount={load.advance_amount}      minus symbol={settings.symbol}/>}
              {load.labor_charges > 0       && <FR label="Labour Charges"      amount={load.labor_charges}       symbol={settings.symbol}/>}
              <div className="border-t border-slate-100 pt-2.5">
                <FR label="Balance Due" amount={load.balance_amount} bold symbol={settings.symbol}/>
              </div>
            </div>
          </div>
        )}

        {/* ── Documents ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Documents & Receipts</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(settings.documentTypes || ["Bilty / GR","Delivery Receipt","Gate Pass","Weighment Slip","LR Copy"]).map(docType=>(
              <label key={docType} className={`flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-blue-400 transition-colors ${uploading?"opacity-50 pointer-events-none":""}`}>
                <Upload className="w-4 h-4 text-slate-400"/>
                <span className="text-xs text-slate-500">{docType}</span>
                <input type="file" className="hidden" accept="image/*,application/pdf"
                  onChange={e=>handleFileUpload(e, docType.toLowerCase().replace(/[^a-z0-9]/g,"_"), docType.toLowerCase().includes("delivery"))}/>
              </label>
            ))}
          </div>
          <label className={`flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-green-100 mb-3 ${uploading?"opacity-50 pointer-events-none":""}`}>
            <Upload className="w-4 h-4 text-green-600"/>
            <span className="text-xs font-medium text-green-700">{uploading?"Uploading…":"Upload Proof of Delivery"}</span>
            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={e=>handleFileUpload(e,"proof_of_delivery",true)}/>
          </label>
          {documents.length > 0 ? (
            <div className="space-y-1.5">
              {documents.map(doc=>(
                <div key={doc.id} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{doc.document_name||doc.document_type}</p>
                    <p className="text-[10px] text-slate-400">{doc.upload_date}{doc.is_delivery_proof&&" · ✅ Delivery Proof"}</p>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-400 hover:text-blue-600">
                    <Eye className="w-3.5 h-3.5"/>
                  </a>
                  <button onClick={()=>deleteDocMutation.mutate(doc.id)} className="p-1 text-slate-300 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">No documents uploaded yet</p>
          )}
        </div>

        {/* ── Compliance ───────────────────────────────────────────────── */}
        {settings.complianceNote && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
            <p className="text-xs font-bold text-amber-700 mb-1">{settings.flag} {settings.label} Compliance</p>
            <p className="text-[10px] text-amber-600">{settings.complianceNote}</p>
            {settings.requiredCompliance && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {settings.requiredCompliance.map(r=>(
                  <span key={r} className="text-[9px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">{r}</span>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function DR({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="w-3.5 h-3.5"/>
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-700 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function FR({ label, amount, minus, bold, symbol = "₨" }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold?"font-bold text-slate-900":"text-slate-500"}`}>{label}</span>
      <span className={`text-sm ${bold?"font-bold text-slate-900":"font-medium text-slate-700"} ${minus?"text-red-600":""}`}>
        {minus && amount ? "-" : ""}{symbol}{(amount||0).toLocaleString()}
      </span>
    </div>
  );
}