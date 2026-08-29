import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Trash2, Plus } from "lucide-react";
import { useRole } from "@/components/useRole";
import { toast } from "sonner";

const emptyForm = {
  bank_name: "", account_title: "", account_number: "", branch: "",
  iban: "", currency: "PKR", opening_balance: "", account_type: "current",
};

export default function BankAccounts() {
  const { fmt, settings } = useAppSettings();
  const { isSleepingPartner, isAdmin } = useRole();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, currency: settings.currency });

  const { data: banks = [] } = useQuery({
    queryKey: ["bank_accounts"],
    queryFn: () => base44.entities.BankAccount.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BankAccount.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank_accounts"] });
      setForm({ ...emptyForm, currency: settings.currency });
      setShowForm(false);
      toast.success("Bank account added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank_accounts"] }),
  });

  const totalBalance = banks.reduce((s, b) => s + (b.current_balance || b.opening_balance || 0), 0);

  return (
    <div className="pb-24">
      <MobileHeader title="Bank Accounts" backTo="Accounting" onAdd={isAdmin ? () => setShowForm(true) : undefined} />

      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-2xl p-4 mb-4">
          <p className="text-blue-100 text-xs">Total Bank Balance</p>
          <p className="text-white text-2xl font-bold">{fmt(totalBalance)}</p>
          <p className="text-blue-200 text-xs">{banks.length} account(s)</p>
        </div>

        {showForm && (
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, opening_balance: parseFloat(form.opening_balance) || 0 }); }}
            className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 mb-4">
            <p className="font-bold text-sm">New Bank Account</p>
            <Input placeholder="Bank Name" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} required />
            <Input placeholder="Account Title" value={form.account_title} onChange={e => setForm({ ...form, account_title: e.target.value })} required />
            <Input placeholder="Account Number" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Branch" value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} />
              <Input placeholder="IBAN" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} />
              <Input placeholder="Opening Balance" type="number" value={form.opening_balance} onChange={e => setForm({ ...form, opening_balance: e.target.value })} />
              <select className="border rounded-md px-2 py-1.5 text-sm" value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })}>
                {["current", "savings", "cash", "petty_cash"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>Save</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {banks.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{b.bank_name}</p>
                  <p className="text-xs text-slate-500">{b.account_title}</p>
                  {b.account_number && <p className="text-xs text-slate-400">{b.account_number}</p>}
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="text-sm font-bold text-green-600">{fmt(b.current_balance || b.opening_balance || 0)}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{b.account_type}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteMutation.mutate(b.id)} className="p-1 text-slate-300 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {banks.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No bank accounts yet</p>}
        </div>
      </div>
    </div>
  );
}