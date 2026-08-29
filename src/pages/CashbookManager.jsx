import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, X, Pencil, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TYPES = [
  { value: "office_cash", label: "Office Cash" },
  { value: "petty_cash", label: "Petty Cash" },
  { value: "driver_cash", label: "Driver Cash" },
  { value: "other", label: "Other" },
];

const emptyForm = { name: "", cashbook_type: "office_cash", opening_balance: 0, custodian: "", notes: "" };

export default function CashbookManager() {
  const { fmt } = useAppSettings();
  const { canSeeAccounting, isSleepingPartner, isAdmin } = useRole();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);

  const { data: cashbooks = [], isLoading } = useQuery({
    queryKey: ["cashbooks"],
    queryFn: () => base44.entities.Cashbook.list("-created_date", 50),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        opening_balance: parseFloat(data.opening_balance) || 0,
        current_balance: parseFloat(data.opening_balance) || 0,
        is_active: true,
      };
      if (editItem) return base44.entities.Cashbook.update(editItem.id, payload);
      return base44.entities.Cashbook.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashbooks"] });
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
      toast.success(editItem ? "Cashbook updated" : "Cashbook created");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cashbook.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashbooks"] });
      toast.success("Cashbook deleted");
    },
  });

  if (!canSeeAccounting) return <AccessDenied />;

  const openEdit = (cb) => {
    setEditItem(cb);
    setForm({ name: cb.name, cashbook_type: cb.cashbook_type, opening_balance: cb.opening_balance || 0, custodian: cb.custodian || "", notes: cb.notes || "" });
    setShowForm(true);
  };

  // Calculate cashbook balance from entries
  const getCashbookBalance = (name) => {
    const cbEntries = entries.filter(e => e.payment_source === name || e.cashbook_name === name);
    const credits = cbEntries.reduce((s, e) => s + (e.credit || 0), 0);
    const debits = cbEntries.reduce((s, e) => s + (e.debit || 0), 0);
    return credits - debits;
  };

  const totalCash = cashbooks.reduce((s, cb) => s + (cb.current_balance || 0), 0);

  const selectedCb = cashbooks.find(c => c.id === selected);
  const selectedEntries = selected
    ? entries.filter(e => e.payment_source === selectedCb?.name || e.cashbook_name === selectedCb?.name)
    : [];

  return (
    <div className="pb-24">
      <MobileHeader title="Cashbooks" backTo="Accounting" onAdd={isSleepingPartner ? undefined : () => { setEditItem(null); setForm(emptyForm); setShowForm(true); }} />

      {/* Summary */}
      <div className="px-4 pt-4 mb-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
          <p className="text-xs text-slate-300 mb-1">Total Cash in Hand</p>
          <p className="text-2xl font-black">{fmt(totalCash)}</p>
          <p className="text-xs text-slate-400 mt-1">{cashbooks.length} cashbook{cashbooks.length !== 1 ? "s" : ""} active</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mx-4 mb-4 bg-white rounded-2xl border border-indigo-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm text-slate-900">{editItem ? "Edit Cashbook" : "New Cashbook"}</p>
            <button onClick={() => { setShowForm(false); setEditItem(null); }} className="p-1 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-slate-500">Cashbook Name *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Cash, Driver Cash" required />
            </div>
            <div>
              <label className="text-xs text-slate-500">Type</label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.cashbook_type} onChange={e => setForm({ ...form, cashbook_type: e.target.value })}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Opening Balance</label>
              <Input type="number" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500">Custodian (Responsible Person)</label>
              <Input value={form.custodian} onChange={e => setForm({ ...form, custodian: e.target.value })} placeholder="e.g. Ahmad Ali" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500">Notes</label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { if (!form.name) { toast.error("Cashbook name required"); return; } createMutation.mutate(form); }} disabled={createMutation.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl">
              {createMutation.isPending ? "Saving..." : editItem ? "Update" : "Create Cashbook"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditItem(null); }} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {/* Cashbook Cards */}
      <div className="px-4 space-y-3">
        {isLoading ? (
          <p className="text-center text-slate-400 text-sm py-8">Loading...</p>
        ) : cashbooks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">No Cashbooks Yet</p>
            <p className="text-xs text-slate-400 mt-1">Create cashbooks to track physical cash flow</p>
            <Button onClick={() => setShowForm(true)} className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-1" /> Create First Cashbook
            </Button>
          </div>
        ) : (
          cashbooks.map(cb => {
            const typeLabel = TYPES.find(t => t.value === cb.cashbook_type)?.label || cb.cashbook_type;
            const isSelected = selected === cb.id;
            return (
              <div key={cb.id} className={`bg-white rounded-2xl border transition-all ${isSelected ? "border-indigo-300 shadow-sm" : "border-slate-100"}`}>
                <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={() => setSelected(isSelected ? null : cb.id)}>
                  <div className="p-2.5 bg-indigo-50 rounded-xl">
                    <Wallet className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{cb.name}</p>
                    <p className="text-[10px] text-slate-400">{typeLabel}{cb.custodian ? ` · ${cb.custodian}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{fmt(cb.current_balance || 0)}</p>
                    <p className="text-[10px] text-slate-400">Balance</p>
                  </div>
                  {!isSleepingPartner && (
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(cb); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete this cashbook?")) deleteMutation.mutate(cb.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded transactions */}
                {isSelected && (
                  <div className="border-t border-slate-50 px-4 pb-3 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Recent Transactions</p>
                    {selectedEntries.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2 text-center">No transactions linked to this cashbook</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {selectedEntries.slice(0, 15).map(e => (
                          <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                            <div>
                              <p className="font-medium text-slate-800">{e.account_name}</p>
                              <p className="text-[10px] text-slate-400">{e.date} · {e.description || e.entry_type}</p>
                            </div>
                            <div className="text-right">
                              {e.debit > 0 && <p className="font-bold text-red-500">-{fmt(e.debit)}</p>}
                              {e.credit > 0 && <p className="font-bold text-green-600">+{fmt(e.credit)}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Contra entry quick note */}
                    <div className="mt-2 pt-2 border-t border-slate-50">
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <ArrowLeftRight className="w-3 h-3" />
                        Contra entries between cashbooks can be created in General Ledger
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}