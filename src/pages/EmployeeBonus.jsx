import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import StatusBadge from "@/components/ui/StatusBadge";

export default function EmployeeBonus() {
  const { fmt } = useAppSettings();
  const { canManageHR } = useRole();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employee_id: "", employee_name: "",
    amount: "", date: format(new Date(), "yyyy-MM-dd"),
    reason: "", payment_mode: "cash", bank_account: "", paid: false,
  });

  if (!canManageHR) return <AccessDenied />;

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_all"],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Bonus debit entries (company owes bonus)
  const { data: bonusEntries = [] } = useQuery({
    queryKey: ["bonus_entries"],
    queryFn: () => base44.entities.AccountingEntry.filter({ entry_type: "bonus", account_type: "employee" }),
  });

  const createBonusMutation = useMutation({
    mutationFn: async (data) => {
      const amt = parseFloat(data.amount);
      const entryNum = `BON-${Date.now()}`;
      // Dr Employee Bonus Expense (company records liability)
      await base44.entities.AccountingEntry.create({
        date: data.date,
        entry_number: entryNum,
        entry_type: "bonus",
        account_type: "expense",
        account_name: "Bonus Expense",
        contra_account: data.employee_name,
        reference_type: "bonus",
        debit: amt,
        credit: 0,
        description: `Bonus for ${data.employee_name}: ${data.reason}`,
        payment_source: "accrual",
      });
      // Cr Employee (bonus payable — they are owed)
      await base44.entities.AccountingEntry.create({
        date: data.date,
        entry_number: entryNum,
        entry_type: "bonus",
        account_type: "employee",
        account_name: data.employee_name,
        reference_id: data.employee_id,
        reference_type: "bonus",
        debit: 0,
        credit: amt,
        description: `Bonus accrued: ${data.reason}`,
      });
      return entryNum;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bonus_entries"] });
      qc.invalidateQueries({ queryKey: ["accounting_entries"] });
      setShowForm(false);
      setForm({ employee_id: "", employee_name: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), reason: "", payment_mode: "cash", bank_account: "", paid: false });
      toast.success("Bonus recorded — double entry created");
    },
  });

  const payBonusMutation = useMutation({
    mutationFn: async ({ entry, paymentMode, bankAccount }) => {
      const entryNum = `BONPAY-${Date.now()}`;
      const amt = entry.credit;
      // Dr Employee (clear their credit — they got paid)
      await base44.entities.AccountingEntry.create({
        date: format(new Date(), "yyyy-MM-dd"),
        entry_number: entryNum,
        entry_type: "payment",
        account_type: "employee",
        account_name: entry.account_name,
        reference_id: entry.entry_number,
        reference_type: "bonus_payment",
        debit: amt,
        credit: 0,
        description: `Bonus payment to ${entry.account_name}`,
        payment_source: paymentMode,
        bank_account: bankAccount,
      });
      // Cr Cash/Bank
      await base44.entities.AccountingEntry.create({
        date: format(new Date(), "yyyy-MM-dd"),
        entry_number: entryNum,
        entry_type: "payment",
        account_type: paymentMode === "bank_transfer" ? "bank" : "cash",
        account_name: bankAccount || paymentMode,
        reference_type: "bonus_payment",
        debit: 0,
        credit: amt,
        description: `Bonus paid to ${entry.account_name}`,
        bank_account: bankAccount,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bonus_entries"] });
      qc.invalidateQueries({ queryKey: ["accounting_entries"] });
      toast.success("Bonus payment recorded");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.amount) { toast.error("Select employee and enter amount"); return; }
    createBonusMutation.mutate(form);
  };

  return (
    <div className="pb-24">
      <MobileHeader title="Employee Bonus" backTo="HRPayroll" onAdd={() => setShowForm(true)} />

      {showForm && (
        <form onSubmit={handleSubmit} className="mx-4 mt-4 bg-white rounded-2xl border border-purple-100 p-4 space-y-3">
          <p className="font-bold text-sm text-purple-700">Issue Bonus</p>
          <p className="text-xs text-slate-400">Double entry: Debit Bonus Expense → Credit Employee Payable</p>
          <select
            className="w-full border rounded-md px-2 py-1.5 text-sm"
            value={form.employee_id}
            onChange={e => {
              const emp = employees.find(em => em.id === e.target.value);
              setForm(prev => ({ ...prev, employee_id: e.target.value, employee_name: emp?.name || "" }));
            }}
            required
          >
            <option value="">Select Employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} — {emp.designation}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Bonus Amount" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} required />
            <Input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
          </div>
          <Input placeholder="Reason (e.g. Eid Bonus, Performance)" value={form.reason} onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))} required />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={createBonusMutation.isPending}>Record Bonus</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="px-4 mt-4 space-y-2">
        {bonusEntries.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">No bonuses recorded yet</p>
        ) : (
          bonusEntries.map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-purple-100 p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{e.account_name}</p>
                  <p className="text-xs text-slate-400">{e.date}</p>
                  {e.description && <p className="text-xs text-slate-400 truncate">{e.description}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-purple-700">{fmt(e.credit)}</p>
                  <span className="text-[9px] bg-purple-50 text-purple-600 rounded-full px-2 py-0.5">Bonus</span>
                </div>
              </div>
              <Button
                size="sm"
                className="mt-2 h-7 text-xs bg-green-600 hover:bg-green-700 w-full"
                onClick={() => payBonusMutation.mutate({ entry: e, paymentMode: "cash", bankAccount: "" })}
                disabled={payBonusMutation.isPending}
              >
                Mark as Paid (Cash)
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}