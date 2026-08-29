import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import StatusBadge from "@/components/ui/StatusBadge";

export default function PayrollPage() {
  const { fmt, settings } = useAppSettings();
  const isHourly = settings.code === "usa" || settings.code === "eu" || settings.code === "gb";
  const qc = useQueryClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    month: currentMonth, employee_name: "", designation: "",
    basic_salary: "", allowances: "", overtime: "", bonus: "",
    deductions: "", tax_deduction: "", payment_mode: "cash", status: "pending",
    hourly_rate: "", hours_worked: "",
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }),
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["payrolls", selectedMonth],
    queryFn: () => base44.entities.Payroll.filter({ month: selectedMonth }),
  });

  const createLedgerEntries = async (payrollData, salaryDate) => {
    const entryNum = `SAL-${Date.now()}`;
    const net = payrollData.net_salary;
    const deductions = payrollData.deductions + payrollData.tax_deduction;
    const gross = payrollData.gross_salary;

    // Dr Employee account (salary owed — liability to employee)
    await base44.entities.AccountingEntry.create({
      date: salaryDate,
      entry_number: entryNum,
      entry_type: "salary",
      account_type: "expense",
      account_name: "Salary Expense",
      contra_account: payrollData.employee_name,
      reference_type: "payroll",
      debit: gross,
      credit: 0,
      description: `Salary for ${payrollData.employee_name} — ${payrollData.month}`,
      payment_source: "accrual",
    });
    // Cr Employee (payable)
    await base44.entities.AccountingEntry.create({
      date: salaryDate,
      entry_number: entryNum,
      entry_type: "salary",
      account_type: "employee",
      account_name: payrollData.employee_name,
      reference_type: "payroll",
      debit: 0,
      credit: gross,
      description: `Salary accrued — ${payrollData.month}`,
    });
    // If there are deductions, credit them back to balance (Dr Employee, Cr Deduction Account)
    if (deductions > 0) {
      const dedNum = `DED-${Date.now()}`;
      await base44.entities.AccountingEntry.create({
        date: salaryDate,
        entry_number: dedNum,
        entry_type: "deduction",
        account_type: "employee",
        account_name: payrollData.employee_name,
        reference_type: "payroll",
        debit: deductions,
        credit: 0,
        description: `Deductions/Tax — ${payrollData.month}`,
      });
      await base44.entities.AccountingEntry.create({
        date: salaryDate,
        entry_number: dedNum,
        entry_type: "deduction",
        account_type: "income",
        account_name: "Salary Deductions",
        reference_type: "payroll",
        debit: 0,
        credit: deductions,
        description: `Deductions from ${payrollData.employee_name} — ${payrollData.month}`,
      });
    }
  };

  const payLedgerEntry = async (payrollData) => {
    const payDate = payrollData.payment_date || new Date().toISOString().slice(0, 10);
    const entryNum = `SALPAY-${Date.now()}`;
    const net = payrollData.net_salary;
    // Dr Employee (clear the payable)
    await base44.entities.AccountingEntry.create({
      date: payDate,
      entry_number: entryNum,
      entry_type: "payment",
      account_type: "employee",
      account_name: payrollData.employee_name,
      reference_type: "payroll_payment",
      debit: net,
      credit: 0,
      description: `Salary paid — ${payrollData.month}`,
      payment_source: payrollData.payment_mode,
    });
    // Cr Cash/Bank
    await base44.entities.AccountingEntry.create({
      date: payDate,
      entry_number: entryNum,
      entry_type: "payment",
      account_type: payrollData.payment_mode === "bank_transfer" ? "bank" : "cash",
      account_name: payrollData.bank_account || payrollData.payment_mode || "cash",
      reference_type: "payroll_payment",
      debit: 0,
      credit: net,
      description: `Salary payment — ${payrollData.employee_name}`,
    });
    // Recover advance if any employee has outstanding advance
    const emps = await base44.entities.Employee.filter({ name: payrollData.employee_name });
    const emp = emps[0];
    if (emp && emp.advance_balance > 0) {
      const recover = Math.min(emp.advance_balance, net);
      const recNum = `ADVREC-${Date.now()}`;
      await base44.entities.AccountingEntry.create({
        date: payDate,
        entry_number: recNum,
        entry_type: "journal",
        account_type: "employee",
        account_name: payrollData.employee_name,
        reference_type: "advance_recovery",
        debit: 0,
        credit: recover,
        description: `Advance recovery from salary — ${payrollData.month}`,
      });
      await base44.entities.Employee.update(emp.id, { advance_balance: emp.advance_balance - recover });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payroll = await base44.entities.Payroll.create(data);
      // Auto-create ledger salary accrual on save date
      await createLedgerEntries(data, data.payment_date || new Date().toISOString().slice(0, 10));
      return payroll;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payrolls"] });
      qc.invalidateQueries({ queryKey: ["accounting_entries"] });
      qc.invalidateQueries({ queryKey: ["emp_ledger"] });
      setShowForm(false);
      toast.success("Payroll saved — ledger entries auto-created");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, payrollData }) => {
      await base44.entities.Payroll.update(id, data);
      // When marking as paid, create payment ledger entries
      if (data.status === "paid") {
        await payLedgerEntry({ ...payrollData, payment_date: data.payment_date, payment_mode: payrollData.payment_mode });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payrolls"] });
      qc.invalidateQueries({ queryKey: ["accounting_entries"] });
      qc.invalidateQueries({ queryKey: ["emp_ledger"] });
      toast.success("Paid — ledger updated");
    },
  });

  const handleEmployeeSelect = (name) => {
    const emp = employees.find(e => e.name === name);
    if (emp) {
      setForm(prev => ({ ...prev, employee_name: emp.name, designation: emp.designation,
        basic_salary: emp.basic_salary || "", allowances: emp.allowances || "",
        deductions: emp.deductions || "", hourly_rate: emp.hourly_rate || "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let basic = parseFloat(form.basic_salary) || 0;
    // For hourly regions, compute basic from hours * rate if provided
    if (isHourly && form.hourly_rate && form.hours_worked) {
      basic = parseFloat(form.hourly_rate) * parseFloat(form.hours_worked);
    }
    const allow = parseFloat(form.allowances) || 0;
    const ot = parseFloat(form.overtime) || 0;
    const bonus = parseFloat(form.bonus) || 0;
    const ded = parseFloat(form.deductions) || 0;
    const tax = parseFloat(form.tax_deduction) || 0;
    const gross = basic + allow + ot + bonus;
    const net = gross - ded - tax;
    createMutation.mutate({ ...form, basic_salary: basic, allowances: allow, overtime: ot, bonus, deductions: ded, tax_deduction: tax, gross_salary: gross, net_salary: net });
  };

  const totalPaid = payrolls.filter(p => p.status === "paid").reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalPending = payrolls.filter(p => p.status === "pending").reduce((s, p) => s + (p.net_salary || 0), 0);

  return (
    <div className="pb-24">
      <MobileHeader title="Payroll" backTo="HRPayroll" onAdd={() => setShowForm(true)} />

      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-auto" />
          <div className="flex gap-2">
            <span className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-1">{fmt(totalPaid)} Paid</span>
            <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2.5 py-1">{fmt(totalPending)} Pending</span>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 mb-4">
            <p className="font-bold text-sm">New Payroll Entry</p>
            <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.employee_name} onChange={e => handleEmployeeSelect(e.target.value)} required>
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name} – {emp.designation}</option>)}
            </select>
            {isHourly && (
              <div className="grid grid-cols-2 gap-2 bg-blue-50 rounded-xl p-2">
                <div>
                  <label className="text-[10px] text-blue-600 font-semibold">Hourly Rate ({settings.symbol}/hr)</label>
                  <Input type="number" step="0.01" placeholder="e.g. 25" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-[10px] text-blue-600 font-semibold">Hours Worked</label>
                  <Input type="number" placeholder="e.g. 160" value={form.hours_worked} onChange={e => setForm({ ...form, hours_worked: e.target.value })} className="mt-1" />
                </div>
                {form.hourly_rate && form.hours_worked && (
                  <div className="col-span-2 text-xs text-blue-700 font-semibold">
                    Base Pay: {settings.symbol}{(parseFloat(form.hourly_rate) * parseFloat(form.hours_worked)).toFixed(2)}
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder={isHourly ? "Override Base Pay" : "Basic Salary"} value={form.basic_salary} onChange={e => setForm({ ...form, basic_salary: e.target.value })} />
              <Input type="number" placeholder="Allowances" value={form.allowances} onChange={e => setForm({ ...form, allowances: e.target.value })} />
              <Input type="number" placeholder="Overtime" value={form.overtime} onChange={e => setForm({ ...form, overtime: e.target.value })} />
              <Input type="number" placeholder="Bonus" value={form.bonus} onChange={e => setForm({ ...form, bonus: e.target.value })} />
              <Input type="number" placeholder="Deductions" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} />
              <Input type="number" placeholder="Tax" value={form.tax_deduction} onChange={e => setForm({ ...form, tax_deduction: e.target.value })} />
            </div>
            <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}>
              {["cash", "bank_transfer", "cheque"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Save</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {payrolls.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-bold text-slate-800">{p.employee_name}</p>
                  <p className="text-xs text-slate-400 capitalize">{p.designation}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{fmt(p.net_salary)}</p>
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <div className="flex gap-1.5 text-[10px] text-slate-400">
                <span>Basic: {fmt(p.basic_salary)}</span>
                {p.allowances > 0 && <span>· Allow: {fmt(p.allowances)}</span>}
                {p.deductions > 0 && <span>· Ded: {fmt(p.deductions)}</span>}
              </div>
              {p.status === "pending" && (
                <Button size="sm" className="mt-2 h-7 text-xs bg-green-600 hover:bg-green-700"
                  onClick={() => updateMutation.mutate({ id: p.id, data: { status: "paid", payment_date: new Date().toISOString().slice(0, 10) }, payrollData: p })}>
                  Mark as Paid
                </Button>
              )}
            </div>
          ))}
          {payrolls.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No payroll entries for this month</p>}
        </div>
      </div>
    </div>
  );
}