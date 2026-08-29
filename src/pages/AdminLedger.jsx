import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { RoleLoading } from "@/components/AccessDenied";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  month: format(new Date(), "yyyy-MM"),
  load_number: "", client_name: "", vehicle_number: "",
  loading_point: "", destination: "",
  broker_fare_pkr: 0, loading_charges_pkr: 0,
  unloading_charges_pkr: 0, other_charges_pkr: 0,
  taxes_pkr: 0, total_cost_pkr: 0,
  quotation_pkr: 0, profit_loss_pkr: 0, notes: ""
};

export default function AdminLedger() {
  // ── ALL HOOKS BEFORE ANY EARLY RETURN ─────────────────────────────────────
  const { canSeeAccounting, loading: roleLoading } = useRole();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ["ledger"],
    queryFn: () => base44.entities.TransactionLedger.list("-date"),
  });

  const { data: loads = [] } = useQuery({
    queryKey: ["loads"],
    queryFn: () => base44.entities.Load.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TransactionLedger.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ledger"] }); setShowForm(false); toast.success("Entry added"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransactionLedger.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ledger"] }); setEditing(null); setShowForm(false); toast.success("Updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TransactionLedger.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ledger"] }); toast.success("Deleted"); },
  });
  // ── END HOOKS ──────────────────────────────────────────────────────────────

  // Wait for role to load before deciding access
  if (roleLoading) return <RoleLoading />;
  if (!canSeeAccounting) return <AccessDenied />;

  const calcTotals = (f) => {
    const cost = (parseFloat(f.broker_fare_pkr) || 0) + (parseFloat(f.loading_charges_pkr) || 0) +
      (parseFloat(f.unloading_charges_pkr) || 0) + (parseFloat(f.other_charges_pkr) || 0) + (parseFloat(f.taxes_pkr) || 0);
    const quotation = parseFloat(f.quotation_pkr) || 0;
    return { total_cost_pkr: cost, profit_loss_pkr: quotation - cost };
  };

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "date") updated.month = value.substring(0, 7);
      if (field === "load_id" && value !== "none") {
        const load = loads.find(l => l.id === value);
        if (load) {
          updated.load_number    = load.load_number;
          updated.client_name    = load.client_name;
          updated.vehicle_number = load.vehicle_number || "";
          updated.loading_point  = load.origin || "";
          updated.destination    = load.destination || "";
          updated.quotation_pkr  = load.freight_amount || 0;
        }
      }
      const totals = calcTotals(updated);
      return { ...updated, ...totals };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    ["broker_fare_pkr","loading_charges_pkr","unloading_charges_pkr","other_charges_pkr","taxes_pkr","total_cost_pkr","quotation_pkr","profit_loss_pkr"]
      .forEach(f => { data[f] = parseFloat(data[f]) || 0; });
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const openEdit = (row) => { setEditing(row); setForm({ ...row }); setShowForm(true); };
  const openNew  = () => { setEditing(null); setForm({ ...emptyForm }); setShowForm(true); };

  const filtered       = ledger.filter(r => r.month === filterMonth);
  const totalQuotation = filtered.reduce((s, r) => s + (r.quotation_pkr || 0), 0);
  const totalCost      = filtered.reduce((s, r) => s + (r.total_cost_pkr || 0), 0);
  const totalPL        = filtered.reduce((s, r) => s + (r.profit_loss_pkr || 0), 0);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), 11 - i);
    return format(d, "yyyy-MM");
  });
  const plChart = months.map(m => {
    const rows = ledger.filter(r => r.month === m);
    const pl   = rows.reduce((s, r) => s + (r.profit_loss_pkr || 0), 0);
    return { month: m.substring(5), PL: pl };
  });

  return (
    <div className="pb-24">
      <MobileHeader title="Transaction Ledger" backTo="AdminPanel" onAdd={openNew} />

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs shrink-0">Month:</Label>
          <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="rounded-xl flex-1" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-600 text-white rounded-xl p-2.5">
            <p className="text-xs text-blue-100">Revenue</p>
            <p className="text-sm font-bold">₨{(totalQuotation/1000).toFixed(0)}K</p>
          </div>
          <div className="bg-red-600 text-white rounded-xl p-2.5">
            <p className="text-xs text-red-100">Cost</p>
            <p className="text-sm font-bold">₨{(totalCost/1000).toFixed(0)}K</p>
          </div>
          <div className={`${totalPL >= 0 ? "bg-emerald-600" : "bg-orange-600"} text-white rounded-xl p-2.5`}>
            <p className="text-xs text-white/70">P/L</p>
            <p className="text-sm font-bold">{totalPL >= 0 ? "+" : ""}₨{(totalPL/1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase mb-3">Monthly P&L — 12 Month Trend</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={plChart} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [`₨${v.toLocaleString()}`, "P&L"]} />
              <Bar dataKey="PL" radius={[4, 4, 0, 0]}>
                {plChart.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.PL >= 0 ? "#10b981" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="px-4 pb-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-xl p-4 border mb-2 animate-pulse h-16" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No entries for this month</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((row) => (
              <div key={row.id} className={`bg-white rounded-xl border p-3 border-l-4 ${row.profit_loss_pkr >= 0 ? "border-l-emerald-400" : "border-l-red-400"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{row.client_name}</p>
                    <p className="text-xs text-slate-400">{row.date} • {row.vehicle_number} • {row.load_number}</p>
                    <p className="text-xs text-slate-500">{row.loading_point} → {row.destination}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                    <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(row.id); }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  <div className="bg-slate-50 rounded-lg p-1.5">
                    <p className="text-slate-400">Broker</p>
                    <p className="font-semibold text-slate-700">₨{(row.broker_fare_pkr||0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-1.5">
                    <p className="text-slate-400">Loading</p>
                    <p className="font-semibold text-slate-700">₨{(row.loading_charges_pkr||0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-1.5">
                    <p className="text-slate-400">Total Cost</p>
                    <p className="font-semibold text-red-600">₨{(row.total_cost_pkr||0).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-1.5">
                    <p className="text-slate-400">Quotation</p>
                    <p className="font-semibold text-blue-600">₨{(row.quotation_pkr||0).toLocaleString()}</p>
                  </div>
                </div>
                <div className={`mt-2 rounded-lg p-2 text-xs text-center font-bold ${row.profit_loss_pkr >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {row.profit_loss_pkr >= 0 ? "✅ Profit" : "🔴 Loss"}: {row.profit_loss_pkr >= 0 ? "+" : ""}₨{(row.profit_loss_pkr||0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">{editing ? "Edit Entry" : "Add Entry"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Link to Load (optional)</Label>
                <select className="w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                  value={form.load_id || "none"} onChange={(e) => handleChange("load_id", e.target.value)}>
                  <option value="none">-- Manual entry --</option>
                  {loads.map(l => <option key={l.id} value={l.id}>{l.load_number} – {l.client_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Client *</Label>
                  <Input value={form.client_name} onChange={(e) => handleChange("client_name", e.target.value)} required className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vehicle #</Label>
                  <Input value={form.vehicle_number} onChange={(e) => handleChange("vehicle_number", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Load #</Label>
                  <Input value={form.load_number} onChange={(e) => handleChange("load_number", e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Loading Point</Label>
                  <Input value={form.loading_point} onChange={(e) => handleChange("loading_point", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Destination</Label>
                  <Input value={form.destination} onChange={(e) => handleChange("destination", e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide pt-1">Costs (PKR)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Broker Fare / Hired Vehicle</Label>
                  <Input type="number" value={form.broker_fare_pkr} onChange={(e) => handleChange("broker_fare_pkr", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Loading Charges</Label>
                  <Input type="number" value={form.loading_charges_pkr} onChange={(e) => handleChange("loading_charges_pkr", e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Unloading Charges</Label>
                  <Input type="number" value={form.unloading_charges_pkr} onChange={(e) => handleChange("unloading_charges_pkr", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Other Charges</Label>
                  <Input type="number" value={form.other_charges_pkr} onChange={(e) => handleChange("other_charges_pkr", e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Taxes</Label>
                  <Input type="number" value={form.taxes_pkr} onChange={(e) => handleChange("taxes_pkr", e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Quotation (Revenue)</Label>
                  <Input type="number" value={form.quotation_pkr} onChange={(e) => handleChange("quotation_pkr", e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Cost</span>
                  <span className="font-bold text-red-600">₨{(parseFloat(form.total_cost_pkr)||0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Quotation</span>
                  <span className="font-bold text-blue-600">₨{(parseFloat(form.quotation_pkr)||0).toLocaleString()}</span>
                </div>
                <div className={`flex justify-between text-sm border-t border-slate-200 pt-2 ${(parseFloat(form.profit_loss_pkr)||0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  <span className="font-bold">Profit / Loss</span>
                  <span className="font-bold">{(parseFloat(form.profit_loss_pkr)||0) >= 0 ? "+" : ""}₨{(parseFloat(form.profit_loss_pkr)||0).toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="rounded-xl" rows={2} />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl bg-slate-900">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}