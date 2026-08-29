import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, CreditCard, Building2, Truck, Monitor, Wrench, Package, DollarSign, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";

const CATEGORIES = [
  { value: "vehicle", label: "Vehicle", icon: Truck, color: "bg-blue-50 text-blue-600" },
  { value: "machinery", label: "Machinery", icon: Wrench, color: "bg-orange-50 text-orange-600" },
  { value: "property", label: "Property", icon: Building2, color: "bg-green-50 text-green-600" },
  { value: "equipment", label: "Equipment", icon: Package, color: "bg-purple-50 text-purple-600" },
  { value: "computer", label: "Computer/IT", icon: Monitor, color: "bg-cyan-50 text-cyan-600" },
  { value: "furniture", label: "Furniture", icon: Package, color: "bg-amber-50 text-amber-600" },
  { value: "other", label: "Other", icon: DollarSign, color: "bg-slate-50 text-slate-600" },
];

const PAYMENT_METHODS = ["cash", "bank_transfer", "cheque", "installments", "loan", "leasing", "other"];

const EMPTY_FORM = {
  asset_name: "", asset_code: "", asset_category: "vehicle", asset_type: "", make_model: "",
  year: "", registration_number: "", purchase_date: "", purchase_price: "", payment_method: "cash",
  bank_account: "", cheque_number: "", down_payment: "", financed_amount: "",
  financing_institution: "", total_installments: "", installment_amount: "",
  installments_paid: "0", installment_start_date: "", next_installment_date: "",
  useful_life_years: "5", salvage_value: "", current_value: "", depreciation_method: "straight_line",
  location: "", assigned_to: "", insurance_company: "", insurance_expiry: "",
  insurance_policy_number: "", status: "active", disposal_date: "", disposal_amount: "", notes: ""
};
export default function Assets() {
  const { canSeeAccounting, isSleepingPartner, loading } = useRole();
  const { fmt } = useAppSettings();
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState(null);
  const [showInstallmentModal, setShowInstallmentModal] = useState(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Asset.list("-purchase_date"),
    enabled: !loading && canSeeAccounting,
  });

  const { data: installments = [] } = useQuery({
    queryKey: ["asset_installments"],
    queryFn: () => base44.entities.AssetInstallment.list("-due_date", 500),
    enabled: !loading && canSeeAccounting,
  });

  if (loading) return null;
  if (!canSeeAccounting) return <AccessDenied />;

  const saveMutation = useMutation({
    mutationFn: (data) => editAsset
      ? base44.entities.Asset.update(editAsset.id, data)
      : base44.entities.Asset.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success(editAsset ? "Asset updated" : "Asset added");
      setShowForm(false);
      setEditAsset(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Asset.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); toast.success("Asset deleted"); },
  });

  const handleField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleEdit = (asset) => {
    setForm({ ...EMPTY_FORM, ...asset });
    setEditAsset(asset);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    ["purchase_price", "down_payment", "financed_amount", "total_installments", "installment_amount",
      "installments_paid", "useful_life_years", "salvage_value", "current_value", "disposal_amount"].forEach(f => {
      data[f] = parseFloat(data[f]) || 0;
    });
    saveMutation.mutate(data);
  };

  const filtered = categoryFilter === "all" ? assets : assets.filter(a => a.asset_category === categoryFilter);

  const totalAssetValue = assets.filter(a => a.status === "active").reduce((s, a) => s + (a.current_value || a.purchase_price || 0), 0);
  const pendingInstallments = installments.filter(i => i.status !== "paid");
  const totalPendingInstall = pendingInstallments.reduce((s, i) => s + (i.amount || 0), 0);

  const catInfo = (cat) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[6];

  return (
    <div className="pb-24">
      <MobileHeader title="Assets Register" backTo="Accounting" onAdd={isSleepingPartner ? undefined : () => { setShowForm(true); setEditAsset(null); setForm(EMPTY_FORM); }} />

      {/* Summary */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-2 mb-4">
        <div className="bg-blue-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-blue-600 font-medium">Total Assets</p>
          <p className="text-lg font-bold text-blue-700">{assets.filter(a => a.status === "active").length}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-green-600 font-medium">Book Value</p>
          <p className="text-sm font-bold text-green-700">{(totalAssetValue / 1000000).toFixed(1)}M</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-amber-600 font-medium">Pending EMIs</p>
          <p className="text-sm font-bold text-amber-700">{(totalPendingInstall / 1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="px-4 mb-3 overflow-x-auto">
        <div className="flex gap-2 w-max pb-1">
          <button onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${categoryFilter === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            All ({assets.length})
          </button>
          {CATEGORIES.map(c => {
            const count = assets.filter(a => a.asset_category === c.value).length;
            if (count === 0) return null;
            return (
              <button key={c.value} onClick={() => setCategoryFilter(c.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${categoryFilter === c.value ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                {c.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset list */}
      <div className="px-4 space-y-3">
        {isLoading ? Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse h-24" />
        )) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No assets yet. Add your first asset.</p>
          </div>
        ) : filtered.map(asset => {
          const cat = catInfo(asset.asset_category);
          const assetInstall = installments.filter(i => i.asset_id === asset.id);
          const paidCount = assetInstall.filter(i => i.status === "paid").length;
          const pendingCount = assetInstall.filter(i => i.status !== "paid").length;
          const isExpanded = expandedId === asset.id;

          return (
            <div key={asset.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${cat.color} flex-shrink-0`}>
                    <cat.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{asset.asset_name}</p>
                      <StatusBadge status={asset.status} />
                      {asset.payment_method === "installments" || asset.payment_method === "loan" || asset.payment_method === "leasing" ? (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">EMI</span>
                      ) : null}
                    </div>
                    {asset.make_model && <p className="text-xs text-slate-500">{asset.make_model} {asset.year ? `(${asset.year})` : ""}</p>}
                    {asset.registration_number && <p className="text-xs text-slate-400">Reg: {asset.registration_number}</p>}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-700">₨{(asset.purchase_price || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{asset.payment_method?.replace(/_/g, " ")}</span>
                      {asset.purchase_date && <span className="text-[10px] text-slate-400">{format(parseISO(asset.purchase_date), "dd MMM yyyy")}</span>}
                    </div>
                    {(asset.payment_method === "installments" || asset.payment_method === "loan") && asset.total_installments > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>Installments: {asset.installments_paid}/{asset.total_installments} paid</span>
                          <span className="font-semibold">₨{(asset.installment_amount || 0).toLocaleString()}/mo</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${asset.total_installments > 0 ? (asset.installments_paid / asset.total_installments) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isSleepingPartner && <>
                    <button onClick={() => handleEdit(asset)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(asset.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </>}
                    <button onClick={() => setExpandedId(isExpanded ? null : asset.id)} className="p-1.5 text-slate-400 rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                  {/* Financial details */}
                  <div className="grid grid-cols-2 gap-3">
                    {asset.down_payment > 0 && (
                      <InfoItem label="Down Payment" value={`₨${asset.down_payment.toLocaleString()}`} />
                    )}
                    {asset.financed_amount > 0 && (
                      <InfoItem label="Financed Amount" value={`₨${asset.financed_amount.toLocaleString()}`} />
                    )}
                    {asset.financing_institution && (
                      <InfoItem label="Financed By" value={asset.financing_institution} />
                    )}
                    {asset.bank_account && (
                      <InfoItem label="Bank" value={asset.bank_account} />
                    )}
                    {asset.cheque_number && (
                      <InfoItem label="Cheque #" value={asset.cheque_number} />
                    )}
                    {asset.current_value > 0 && (
                      <InfoItem label="Current Value" value={`₨${asset.current_value.toLocaleString()}`} />
                    )}
                    {asset.useful_life_years > 0 && (
                      <InfoItem label="Useful Life" value={`${asset.useful_life_years} yrs`} />
                    )}
                    {asset.location && <InfoItem label="Location" value={asset.location} />}
                    {asset.assigned_to && <InfoItem label="Assigned To" value={asset.assigned_to} />}
                  </div>
                  {/* Insurance */}
                  {asset.insurance_company && (
                    <div className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-xs font-semibold text-slate-600 mb-1.5">🛡️ Insurance</p>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoItem label="Company" value={asset.insurance_company} />
                        {asset.insurance_policy_number && <InfoItem label="Policy #" value={asset.insurance_policy_number} />}
                        {asset.insurance_expiry && <InfoItem label="Expiry" value={format(parseISO(asset.insurance_expiry), "dd MMM yyyy")} />}
                      </div>
                    </div>
                  )}
                  {/* Installments for this asset */}
                  {(asset.payment_method === "installments" || asset.payment_method === "loan" || asset.payment_method === "leasing") && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-700">📅 Installment Schedule</p>
                        <Button size="sm" variant="outline" className="text-xs h-7 rounded-lg px-2"
                          onClick={() => setShowInstallmentModal(asset)}>
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                      <InstallmentList installments={assetInstall} assetId={asset.id} fmt={fmt} qc={qc} />
                    </div>
                  )}
                  {asset.notes && <p className="text-xs text-slate-500 italic">📝 {asset.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Asset Form Modal */}
      {showForm && (
        <AssetForm
          form={form}
          onField={handleField}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditAsset(null); setForm(EMPTY_FORM); }}
          isEdit={!!editAsset}
          saving={saveMutation.isPending}
        />
      )}

      {/* Add Installment Modal */}
      {showInstallmentModal && (
        <AddInstallmentModal
          asset={showInstallmentModal}
          onClose={() => setShowInstallmentModal(null)}
          qc={qc}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-xs font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function InstallmentList({ installments, assetId, fmt, qc }) {
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AssetInstallment.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["asset_installments"] }); toast.success("Installment updated"); }
  });

  const sorted = [...installments].sort((a, b) => a.installment_number - b.installment_number);

  if (sorted.length === 0) return <p className="text-xs text-slate-400 text-center py-3">No installments recorded yet.</p>;

  const statusIcon = (s) => s === "paid" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> :
    s === "overdue" ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> :
    <Clock className="w-3.5 h-3.5 text-amber-500" />;

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      {sorted.map(inst => (
        <div key={inst.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${inst.status === "paid" ? "bg-green-50" : inst.status === "overdue" ? "bg-red-50" : "bg-white border border-slate-100"}`}>
          {statusIcon(inst.status)}
          <span className="font-semibold text-slate-700 w-6">#{inst.installment_number}</span>
          <span className="text-slate-500 flex-1">{inst.due_date}</span>
          <span className="font-bold text-slate-800">₨{(inst.amount || 0).toLocaleString()}</span>
          {inst.status !== "paid" && (
            <button
              onClick={() => updateMutation.mutate({ id: inst.id, data: { status: "paid", paid_date: new Date().toISOString().slice(0, 10), paid_amount: inst.amount } })}
              className="text-[10px] bg-green-500 text-white rounded-lg px-2 py-0.5 font-bold">
              Mark Paid
            </button>
          )}
          {inst.status === "paid" && inst.paid_date && (
            <span className="text-[10px] text-green-600">Paid {inst.paid_date}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function AddInstallmentModal({ asset, onClose, qc }) {
  const [form, setForm] = useState({
    installment_number: "", due_date: "", amount: asset.installment_amount || "",
    payment_method: "bank_transfer", bank_account: "", cheque_number: "", status: "pending", notes: ""
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AssetInstallment.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset_installments"] });
      toast.success("Installment added");
      onClose();
    }
  });

  const handleBulkGenerate = async () => {
    const count = parseInt(form.installment_number) || 0;
    if (!count || !form.due_date || !form.amount) { toast.error("Fill installment count, start date and amount"); return; }
    const start = new Date(form.due_date);
    const records = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      records.push({ asset_id: asset.id, asset_name: asset.asset_name, installment_number: i + 1, due_date: d.toISOString().slice(0, 10), amount: parseFloat(form.amount) || 0, status: "pending" });
    }
    await base44.entities.AssetInstallment.bulkCreate(records);
    qc.invalidateQueries({ queryKey: ["asset_installments"] });
    toast.success(`${count} installments generated`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Add Installment – {asset.asset_name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">No. of Installments (bulk) or #</Label>
              <Input type="number" value={form.installment_number} onChange={(e) => setForm(p => ({ ...p, installment_number: e.target.value }))} className="rounded-xl" placeholder="e.g. 12" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start/Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))} className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount per Installment</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "bank_transfer", "cheque", "other"].map(m => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1 rounded-xl" onClick={handleBulkGenerate}>
              Generate All ({form.installment_number || "?"} installments)
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => {
              if (!form.installment_number || !form.due_date || !form.amount) { toast.error("Fill all fields"); return; }
              createMutation.mutate({ asset_id: asset.id, asset_name: asset.asset_name, installment_number: parseInt(form.installment_number), due_date: form.due_date, amount: parseFloat(form.amount) || 0, payment_method: form.payment_method, status: "pending" });
            }}>Add One</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetForm({ form, onField, onSubmit, onClose, isEdit, saving }) {
  const needsInstall = ["installments", "loan", "leasing"].includes(form.payment_method);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl w-full max-w-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{isEdit ? "Edit Asset" : "Add New Asset"}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
          </div>
          <form onSubmit={onSubmit} className="p-5 space-y-4">
            {/* Basic */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Basic Info</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Asset Name *</Label>
                  <Input value={form.asset_name} onChange={(e) => onField("asset_name", e.target.value)} required className="rounded-xl" placeholder="e.g. Toyota Truck LKS-1234" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category *</Label>
                  <Select value={form.asset_category} onValueChange={(v) => onField("asset_category", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Asset Type</Label>
                  <Input value={form.asset_type} onChange={(e) => onField("asset_type", e.target.value)} className="rounded-xl" placeholder="e.g. Truck, Laptop" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Asset Code / Tag</Label>
                  <Input value={form.asset_code} onChange={(e) => onField("asset_code", e.target.value)} className="rounded-xl" placeholder="e.g. AST-001" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Make / Model</Label>
                  <Input value={form.make_model} onChange={(e) => onField("make_model", e.target.value)} className="rounded-xl" placeholder="e.g. Toyota Hilux" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Year</Label>
                  <Input value={form.year} onChange={(e) => onField("year", e.target.value)} className="rounded-xl" placeholder="2022" />
                </div>
                {form.asset_category === "vehicle" && (
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Registration Number</Label>
                    <Input value={form.registration_number} onChange={(e) => onField("registration_number", e.target.value)} className="rounded-xl" placeholder="LKS-1234" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input value={form.location} onChange={(e) => onField("location", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Assigned To</Label>
                  <Input value={form.assigned_to} onChange={(e) => onField("assigned_to", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={(v) => onField("status", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["active", "disposed", "under_maintenance", "written_off"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Purchase */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Purchase Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Purchase Date</Label>
                  <Input type="date" value={form.purchase_date} onChange={(e) => onField("purchase_date", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Purchase Price (PKR)</Label>
                  <Input type="number" value={form.purchase_price} onChange={(e) => onField("purchase_price", e.target.value)} className="rounded-xl" placeholder="0" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => onField("payment_method", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(form.payment_method === "cash" || form.payment_method === "bank_transfer" || form.payment_method === "cheque") && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Bank Account</Label>
                      <Input value={form.bank_account} onChange={(e) => onField("bank_account", e.target.value)} className="rounded-xl" placeholder="e.g. HBL Current" />
                    </div>
                    {form.payment_method === "cheque" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Cheque Number</Label>
                        <Input value={form.cheque_number} onChange={(e) => onField("cheque_number", e.target.value)} className="rounded-xl" />
                      </div>
                    )}
                  </>
                )}
                {needsInstall && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Down Payment (PKR)</Label>
                      <Input type="number" value={form.down_payment} onChange={(e) => onField("down_payment", e.target.value)} className="rounded-xl" placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Financed Amount (PKR)</Label>
                      <Input type="number" value={form.financed_amount} onChange={(e) => onField("financed_amount", e.target.value)} className="rounded-xl" placeholder="0" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Financing Institution</Label>
                      <Input value={form.financing_institution} onChange={(e) => onField("financing_institution", e.target.value)} className="rounded-xl" placeholder="e.g. HBL Car Finance, Askari Leasing" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Monthly Installment (PKR)</Label>
                      <Input type="number" value={form.installment_amount} onChange={(e) => onField("installment_amount", e.target.value)} className="rounded-xl" placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Total Installments</Label>
                      <Input type="number" value={form.total_installments} onChange={(e) => onField("total_installments", e.target.value)} className="rounded-xl" placeholder="e.g. 36" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Installments Paid So Far</Label>
                      <Input type="number" value={form.installments_paid} onChange={(e) => onField("installments_paid", e.target.value)} className="rounded-xl" placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Next Installment Date</Label>
                      <Input type="date" value={form.next_installment_date} onChange={(e) => onField("next_installment_date", e.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Start Date</Label>
                      <Input type="date" value={form.installment_start_date} onChange={(e) => onField("installment_start_date", e.target.value)} className="rounded-xl" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Valuation */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Valuation & Depreciation</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Current/Book Value (PKR)</Label>
                  <Input type="number" value={form.current_value} onChange={(e) => onField("current_value", e.target.value)} className="rounded-xl" placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Salvage Value (PKR)</Label>
                  <Input type="number" value={form.salvage_value} onChange={(e) => onField("salvage_value", e.target.value)} className="rounded-xl" placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Useful Life (Years)</Label>
                  <Input type="number" value={form.useful_life_years} onChange={(e) => onField("useful_life_years", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Depreciation Method</Label>
                  <Select value={form.depreciation_method} onValueChange={(v) => onField("depreciation_method", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight_line">Straight Line</SelectItem>
                      <SelectItem value="reducing_balance">Reducing Balance</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Insurance</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Insurance Company</Label>
                  <Input value={form.insurance_company} onChange={(e) => onField("insurance_company", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Policy Number</Label>
                  <Input value={form.insurance_policy_number} onChange={(e) => onField("insurance_policy_number", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Insurance Expiry</Label>
                  <Input type="date" value={form.insurance_expiry} onChange={(e) => onField("insurance_expiry", e.target.value)} className="rounded-xl" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => onField("notes", e.target.value)} className="rounded-xl" rows={2} />
            </div>

            <Button type="submit" disabled={saving} className="w-full rounded-xl bg-slate-900 h-11">
              {saving ? "Saving..." : (isEdit ? "Update Asset" : "Add Asset")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}