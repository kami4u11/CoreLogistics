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

export default function EmployeeAdvance() {
  const { fmt, settings } = useAppSettings();
  const { canManageHR } = useRole();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employee_id: "", employee_name: "",
    amount: "", date: format(new Date(), "yyyy-MM-dd"),
    payment_mode: "cash", bank_account: "", notes: "",
  });

  if (!canManageHR) return <AccessDenied />;

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_all"],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Advances are accounting entries with entry_type = "advance"
  const { data: advances = [] } = useQuery({
    queryKey: ["advances"],
    queryFn: () => base44.entities.AccountingEntry.filter({ entry_type: "advance", account_type: "employee" }),
  });

  const advanceMutation = useMutation({
    mutationFn: async (data) => {
      const amt = parseFloat(data.amount);
      const entryNum = `ADV-${Date.now()}`;
      // Dr Employee (advance given - they owe us)
      await base44.entities.AccountingEntry.create({
        date: data.date,
        entry_number: entryNum,
        entry_type: "advance",
        account_type: "employee",
        account_name: data.employee_name,
        reference_id: data.employee_id,
        reference_type: "advance",
        debit: amt,
        credit: 0,
        description: `Advance salary to ${data.employee_name}`,
        payment_source: data.payment_mode,
        bank_account: data.bank_account,
        notes: data.notes,
      });
      // Cr Cash/Bank (money going out)
      await base44.entities.AccountingEntry.create({
        date: data.date,
        entry_number: entryNum,
        entry_type: "advance",
        account_type: data.payment_mode === "bank_transfer" ? "bank" : "cash",
        account_name: data.bank_account || data.payment_mode,
        reference_type: "advance",
        debit: 0,
        credit: amt,
        description: `Advance paid to ${data.employee_name}`,
        bank_account: data.bank_account,
      });
      // Update employee advance balance
      const emp = employees.find(e => e.id === data.employee_id);
      if (emp) {
        await base44.entities.Employee.update(data.employee_id, {
          advance_balance: (emp.advance_balance || 0) + amt,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances"] });
      qc.invalidateQueries({ queryKey: ["accounting_entries"] });
      qc.invalidateQueries({ queryKey: ["employees_all"] });
      setShowForm(false);
      setForm({ employee_id: "", employee_name: "", amount: "", date: format(new Date(), "yyyy-MM-dd"), payment_mode: "cash", bank_account: "", notes: "" });
      toast.success("Advance recorded");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.amount) { toast.error("Select employee and enter amount"); return; }
    advanceMutation.mutate(form);
  };

  // Group advances by employee
  const byEmployee = {};
  advances.forEach(a => {
    if (!byEmployee[a.account_name]) byEmployee[a.account_name] = [];
    byEmployee[a.account_name].push(a);
  });

  return (
    <div className="pb-24">
      <MobileHeader title="Advance Salary" backTo="HRPayroll" onAdd={() => setShowForm(true)} />

      {showForm && (
        <form onSubmit={handleSubmit} className="mx-4 mt-4 bg-white rounded-2xl border border-orange-100 p-4 space-y-3">
          <p className="font-bold text-sm text-orange-700">Issue Advance Salary</p>
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
              <option key={emp.id} value={emp.id}>
                {emp.name} — {emp.designation} {emp.advance_balance > 0 ? `(Adv: ${fmt(emp.advance_balance)})` : ""}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} required />
            <Input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
          </div>
          <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.payment_mode}
            onChange={e => setForm(prev => ({ ...prev, payment_mode: e.target.value }))}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </select>
          {form.payment_mode !== "cash" && (
            <Input placeholder="Bank / Cheque detail" value={form.bank_account} onChange={e => setForm(prev => ({ ...prev, bank_account: e.target.value }))} />
          )}
          <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={advanceMutation.isPending}>Issue Advance</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="px-4 mt-4 space-y-3">
        {employees.filter(e => (e.advance_balance || 0) > 0).map(emp => (
          <div key={emp.id} className="bg-white rounded-2xl border border-orange-100 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                <p className="text-xs text-slate-400 capitalize">{emp.designation}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-orange-600 font-bold">Outstanding</p>
                <p className="text-sm font-bold text-orange-700">{fmt(emp.advance_balance)}</p>
              </div>
            </div>
          </div>
        ))}
        {advances.length === 0 && employees.filter(e => e.advance_balance > 0).length === 0 && (
          <p className="text-center text-slate-400 text-sm py-10">No advances issued yet</p>
        )}
      </div>
    </div>
  );
}