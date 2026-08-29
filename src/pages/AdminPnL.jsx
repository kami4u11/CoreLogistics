import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const OVERHEAD_TYPES = ["salary", "rent", "utilities", "marketing", "admin", "depreciation", "other"];

export default function AdminPnL() {
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const [showOverhead, setShowOverhead] = useState(false);
  const [ohForm, setOhForm] = useState({ month: format(new Date(), "yyyy-MM"), overhead_type: "salary", description: "", amount_pkr: "", notes: "" });
  const queryClient = useQueryClient();

  const { data: ledger = [] } = useQuery({ queryKey: ["ledger"], queryFn: () => base44.entities.TransactionLedger.list() });
  const { data: overheads = [] } = useQuery({ queryKey: ["overheads"], queryFn: () => base44.entities.MonthlyOverhead.list() });

  const createOH = useMutation({
    mutationFn: (data) => base44.entities.MonthlyOverhead.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["overheads"] }); setShowOverhead(false); toast.success("Overhead added"); },
  });

  const deleteOH = useMutation({
    mutationFn: (id) => base44.entities.MonthlyOverhead.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["overheads"] }); toast.success("Deleted"); },
  });

  const monthLedger = ledger.filter(r => r.month === filterMonth);
  const monthOH = overheads.filter(o => o.month === filterMonth);

  const revenue = monthLedger.reduce((s, r) => s + (r.quotation_pkr || 0), 0);
  const costOfSales = monthLedger.reduce((s, r) => s + (r.total_cost_pkr || 0), 0);
  const grossProfit = revenue - costOfSales;
  const totalOverheads = monthOH.reduce((s, o) => s + (o.amount_pkr || 0), 0);
  const netPL = grossProfit - totalOverheads;

  const handleOHSubmit = (e) => {
    e.preventDefault();
    createOH.mutate({ ...ohForm, month: filterMonth, amount_pkr: parseFloat(ohForm.amount_pkr) || 0 });
  };

  const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69995a1b4cc6b3863e378752/2cf5e616c_pvt_ltd_logo1-removebg-preview.png";

  return (
    <div className="pb-24">
      <MobileHeader title="Monthly P&L" backTo="AdminPanel" />

      <div className="px-4 py-3 space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs shrink-0">Month:</Label>
          <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="rounded-xl flex-1" />
        </div>

        {/* P&L Statement */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-4 flex items-center gap-3">
            <img src={LOGO} alt="Saifran" className="h-10 w-auto bg-white/90 rounded-lg p-0.5" />
            <div>
              <p className="text-white font-bold text-sm">Saifran Logistics (Pvt) Ltd.</p>
              <p className="text-blue-200 text-xs">Profit & Loss — {filterMonth}</p>
            </div>
          </div>
          <div className="p-4 space-y-1">
            <PLRow label="Sales (Quotations)" amount={revenue} />
            <PLRow label="Cost of Sales (Direct Costs)" amount={costOfSales} isCost />
            <PLRow label="Gross Profit" amount={grossProfit} bold highlight />
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Overheads</p>
              {monthOH.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { if (confirm("Remove?")) deleteOH.mutate(o.id); }} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
                    <span className="text-sm text-slate-600 capitalize">{o.overhead_type} {o.description ? `(${o.description})` : ""}</span>
                  </div>
                  <span className="text-sm font-medium text-red-600">-₨{(o.amount_pkr || 0).toLocaleString()}</span>
                </div>
              ))}
              <button onClick={() => setShowOverhead(true)} className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mt-2">
                <Plus className="w-3.5 h-3.5" /> Add Overhead
              </button>
            </div>
            <PLRow label="Total Overheads" amount={totalOverheads} isCost />
            <div className="border-t-2 border-slate-200 mt-3 pt-3">
              <PLRow label="Net Profit / Loss" amount={netPL} bold xl />
            </div>
          </div>
        </div>

        {/* Transactions summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-3">{monthLedger.length} Transactions this month</p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {monthLedger.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                <span className="text-slate-500">{r.date?.substring(5)} · {r.client_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Cost: ₨{(r.total_cost_pkr||0).toLocaleString()}</span>
                  <span className={`font-semibold ${(r.profit_loss_pkr||0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {(r.profit_loss_pkr||0) >= 0 ? "+" : ""}₨{(r.profit_loss_pkr||0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {monthLedger.length === 0 && <p className="text-center text-slate-400 py-4">No transactions this month</p>}
          </div>
        </div>
      </div>

      {showOverhead && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Overhead</h2>
              <button onClick={() => setShowOverhead(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleOHSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={ohForm.overhead_type} onValueChange={(v) => setOhForm(p => ({ ...p, overhead_type: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OVERHEAD_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={ohForm.description} onChange={(e) => setOhForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (PKR) *</Label>
                <Input type="number" value={ohForm.amount_pkr} onChange={(e) => setOhForm(p => ({ ...p, amount_pkr: e.target.value }))} required className="rounded-xl" />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowOverhead(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl bg-slate-900">Add</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PLRow({ label, amount, isCost, bold, highlight, xl }) {
  const isNeg = amount < 0;
  return (
    <div className={`flex items-center justify-between py-2 ${highlight ? "bg-slate-50 rounded-xl px-3" : ""}`}>
      <span className={`${bold ? "font-bold" : "text-sm"} ${xl ? "text-base" : ""} text-slate-700`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium text-sm"} ${xl ? "text-lg" : ""} ${isCost ? "text-red-600" : isNeg ? "text-red-600" : "text-emerald-700"}`}>
        {isCost ? "-" : ""}₨{Math.abs(amount).toLocaleString()}
      </span>
    </div>
  );
}