import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, X, Truck, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function OwnFleetLedger() {
  const { fmt } = useAppSettings();
  const { canSeeAccounting } = useRole();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [payModal, setPayModal] = useState(null); // { vehicle_number, totalPayable }
  const [payForm, setPayForm] = useState({ amount: "", payment_method: "cash", bank_name: "", notes: "" });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["own_fleet_ledger_entries"],
    queryFn: () => base44.entities.AccountingEntry.filter({ source_module: "own_fleet" }),
  });

  const { data: fleetVehicles = [] } = useQuery({
    queryKey: ["fleet_vehicles"],
    queryFn: () => base44.entities.FleetVehicle.list(),
  });

  // Group entries by vehicle
  const vehicleSummary = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const v = e.account_name || "Unknown";
      if (!map[v]) map[v] = { vehicle_number: v, payable: 0, paid: 0, entries: [] };
      map[v].payable += e.credit || 0;
      map[v].paid += e.debit || 0;
      map[v].entries.push(e);
    });
    return Object.values(map)
      .map(v => ({ ...v, balance: v.payable - v.paid }))
      .filter(v => !search || v.vehicle_number.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.balance - a.balance);
  }, [entries, search]);

  if (!canSeeAccounting) return <AccessDenied />;

  const totalPayable = vehicleSummary.reduce((s, v) => s + Math.max(0, v.balance), 0);
  const totalPaid = vehicleSummary.reduce((s, v) => s + v.paid, 0);

  const payMutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(payForm.amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      await base44.entities.AccountingEntry.create({
        date: new Date().toISOString().slice(0, 10),
        entry_type: "payment",
        account_type: "expense",
        account_name: payModal.vehicle_number,
        debit: amt,
        credit: 0,
        description: `Payment to Own Fleet - ${payModal.vehicle_number}`,
        entry_number: `OFP-${payModal.vehicle_number}-${Date.now()}`,
        payment_source: payForm.payment_method,
        bank_account: payForm.bank_name,
        notes: payForm.notes,
        posted: true,
        source_module: "own_fleet",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["own_fleet_ledger_entries"] });
      toast.success("Payment recorded");
      setPayModal(null);
      setPayForm({ amount: "", payment_method: "cash", bank_name: "", notes: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="pb-24">
      <MobileHeader title="Own Fleet Ledger" backTo="Accounting" />

      {/* Summary */}
      <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-2">
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-orange-500">Total Payable</p>
          <p className="text-sm font-bold text-orange-600">{fmt(totalPayable)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-green-500">Total Paid</p>
          <p className="text-sm font-bold text-green-600">{fmt(totalPaid)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search vehicle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl bg-slate-50" />
        </div>
      </div>

      {/* Vehicle list */}
      <div className="px-4 space-y-2">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border border-slate-100 animate-pulse" />)
        ) : vehicleSummary.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">No own fleet entries yet. Own Fleet trips from Bilty Costing will appear here.</p>
        ) : (
          vehicleSummary.map(v => (
            <div key={v.vehicle_number} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Truck className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{v.vehicle_number}</p>
                    <p className="text-[10px] text-slate-400">{v.entries.length} trip entries</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${v.balance > 0 ? "text-orange-500" : "text-green-600"}`}>
                    {v.balance > 0 ? `Payable ${fmt(v.balance)}` : v.balance < 0 ? `Overpaid ${fmt(Math.abs(v.balance))}` : "Settled"}
                  </p>
                  <p className="text-[10px] text-slate-400">Total: {fmt(v.payable)} | Paid: {fmt(v.paid)}</p>
                </div>
              </div>

              {/* Trip entries */}
              <div className="mt-3 space-y-1.5 border-t border-slate-50 pt-2">
                {v.entries.filter(e => e.credit > 0).slice(0, 5).map(e => (
                  <div key={e.id} className="flex justify-between text-xs">
                    <span className="text-slate-500 truncate flex-1">{e.description || e.entry_number}</span>
                    <span className="text-orange-600 font-medium ml-2">{fmt(e.credit)}</span>
                  </div>
                ))}
                {v.entries.filter(e => e.credit > 0).length > 5 && (
                  <p className="text-[10px] text-slate-400">+{v.entries.filter(e => e.credit > 0).length - 5} more trips</p>
                )}
              </div>

              {v.balance > 0 && (
                <Button size="sm" onClick={() => { setPayModal(v); setPayForm(p => ({ ...p, amount: v.balance })); }}
                  className="mt-3 w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs">
                  <CreditCard className="w-3.5 h-3.5 mr-1" /> Record Payment
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-900">Pay Fleet: {payModal.vehicle_number}</p>
              <button onClick={() => setPayModal(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Amount (Balance: {fmt(payModal.balance)})</Label>
                <Input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} className="rounded-xl mt-1" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <select value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}
                  className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              {payForm.payment_method !== "cash" && (
                <div>
                  <Label className="text-xs">Bank / Reference</Label>
                  <Input value={payForm.bank_name} onChange={e => setPayForm(p => ({ ...p, bank_name: e.target.value }))} className="rounded-xl mt-1" placeholder="Bank name or ref" />
                </div>
              )}
              <div>
                <Label className="text-xs">Notes</Label>
                <Input value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} className="rounded-xl mt-1" placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setPayModal(null)} className="flex-1 rounded-xl">Cancel</Button>
              <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending} className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
                {payMutation.isPending ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}