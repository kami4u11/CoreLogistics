import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import { useAppSettings } from "@/components/AppSettings";
import AccessDenied from "@/components/AccessDenied";
import { format } from "date-fns";
import {
  Printer, User, Plus, X, CheckCircle2,
  Wallet, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "cash",            label: "💵 Cash" },
  { value: "cheque",          label: "🏦 Cheque" },
  { value: "bank_transfer",   label: "🔁 Bank Transfer" },
  { value: "online_transfer", label: "📱 Online Transfer" },
  { value: "other",           label: "📋 Other" },
];

const QUICK_FILTERS = [
  { label: "1W",  days: 7   },
  { label: "1M",  days: 30  },
  { label: "6M",  days: 180 },
  { label: "1Y",  days: 365 },
  { label: "ALL", days: null },
];

function subDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

export default function EmployeeLedger() {
  const {
    isAdmin, isManagement, isAccounting, isSleepingPartner, loading: roleLoading,
  } = useRole();
  const { fmt } = useAppSettings();
  const queryClient = useQueryClient();

  // ── ALL HOOKS FIRST ───────────────────────────────────────────────────────
  const [filterMonth,   setFilterMonth]   = useState(new Date().toISOString().slice(0, 7));
  const [quickFilter,   setQuickFilter]   = useState("1M");
  const [selectedEmp,   setSelectedEmp]   = useState("all");
  const [showPayment,   setShowPayment]   = useState(false);
  const [expandedId,    setExpandedId]    = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm,   setPaymentForm]   = useState({
    employee_id:  "",
    date:         format(new Date(), "yyyy-MM-dd"),
    amount:       "",
    method:       "cash",
    bank_name:    "",
    cheque_no:    "",
    reference:    "",
    notes:        "",
    period_month: new Date().toISOString().slice(0, 7),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("full_name"),
    enabled: !roleLoading,
  });

  // Salary transactions stored in EmployeeSalary entity
  // Each record has: employee_id, employee_name, date, month,
  //   amount, transaction_type ("salary"|"advance"|"payment"|"deduction"),
  //   method, notes, bank_name, cheque_no, reference
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["employee_salary_ledger"],
    queryFn: () => base44.entities.EmployeeSalary.list("-date", 2000),
    enabled: !roleLoading,
  });
  // ── END HOOKS ─────────────────────────────────────────────────────────────

  const canView      = isAdmin || isManagement || isAccounting || isSleepingPartner;
  const canEdit      = isAdmin || isManagement || isAccounting;

  if (roleLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!canView) return <AccessDenied />;

  // ── Date filter ───────────────────────────────────────────────────────────
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const f = QUICK_FILTERS.find(q => q.label === quickFilter);
    if (f?.days && new Date(dateStr) < subDays(new Date(), f.days)) return false;
    if (quickFilter === "1M" && filterMonth) return dateStr.startsWith(filterMonth);
    return true;
  };

  // ── Filter by employee + date ─────────────────────────────────────────────
  const filtered = transactions.filter(t =>
    inRange(t.date) && (selectedEmp === "all" || t.employee_id === selectedEmp)
  );

  // Separate debits (salary/advance) from credits (payments)
  const debits  = filtered.filter(t => ["salary","advance","deduction"].includes(t.transaction_type));
  const credits = filtered.filter(t => t.transaction_type === "payment");

  const totalDebits  = debits.reduce((s, t)  => s + (t.amount || 0), 0);
  const totalCredits = credits.reduce((s, t) => s + (t.amount || 0), 0);
  const totalBalance = totalDebits - totalCredits;

  // ── Running balance ledger rows ───────────────────────────────────────────
  const ledgerRows = [...filtered].sort((a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : 0);
  let running = 0;
  const ledgerWithBalance = ledgerRows.map(row => {
    const isDebit = row.transaction_type !== "payment";
    if (isDebit) running += (row.amount || 0);
    else         running -= (row.amount || 0);
    return { ...row, _isDebit: isDebit, _running: running };
  });

  // ── Save payment ──────────────────────────────────────────────────────────
  const handleSavePayment = async () => {
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0)            { toast.error("Enter a valid amount"); return; }
    if (!paymentForm.date)           { toast.error("Select a date"); return; }
    if (!paymentForm.employee_id)    { toast.error("Select an employee"); return; }

    const emp = employees.find(e => e.id === paymentForm.employee_id);
    setSavingPayment(true);
    try {
      await base44.entities.EmployeeSalary.create({
        employee_id:      paymentForm.employee_id,
        employee_name:    emp?.full_name || "",
        date:             paymentForm.date,
        month:            paymentForm.period_month,
        amount:           amt,
        transaction_type: "payment",
        method:           paymentForm.method,
        bank_name:        paymentForm.bank_name,
        cheque_no:        paymentForm.cheque_no,
        reference:        paymentForm.reference,
        notes:            paymentForm.notes,
      });
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["employee_salary_ledger"] });
      setShowPayment(false);
      setPaymentForm({
        employee_id: "", date: format(new Date(), "yyyy-MM-dd"),
        amount: "", method: "cash", bank_name: "", cheque_no: "",
        reference: "", notes: "", period_month: new Date().toISOString().slice(0, 7),
      });
    } catch (err) {
      toast.error("Failed: " + (err?.message || "unknown error"));
    } finally {
      setSavingPayment(false);
    }
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const cp = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
  const handlePrint = () => {
    const el = document.getElementById("employee-ledger-print");
    if (!el) return;
    const orig = document.body.innerHTML;
    document.body.innerHTML = el.innerHTML;
    window.print();
    document.body.innerHTML = orig;
    window.location.reload();
  };

  const typeLabel = (t) => ({
    salary:    "💼 Salary",
    advance:   "⚠️ Advance",
    deduction: "✂️ Deduction",
    payment:   "✅ Payment",
  }[t] || t);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-28 bg-slate-50 min-h-screen">
      <MobileHeader
        title="Employee Ledger"
        backTo="Dashboard"
        rightAction={
          <button onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-xl">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        }
      />

      {/* Quick filters */}
      <div className="px-4 pt-4 flex gap-2 overflow-x-auto pb-1">
        {QUICK_FILTERS.map(f => (
          <button key={f.label}
            onClick={() => { setQuickFilter(f.label); if (f.label !== "1M") setFilterMonth(""); }}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              quickFilter === f.label
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-500 border-slate-200"
            }`}>
            {f.label}
          </button>
        ))}
        {quickFilter === "1M" && (
          <input type="month" value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="flex-shrink-0 rounded-full border border-slate-200 px-3 py-1 text-xs bg-white" />
        )}
      </div>

      {/* Employee filter */}
      <div className="px-4 pt-3">
        <select
          value={selectedEmp}
          onChange={e => setSelectedEmp(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="all">All Employees</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.full_name}{e.designation ? ` — ${e.designation}` : ""}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
            <p className="text-[10px] font-bold text-slate-400 uppercase">Salary Due</p>
          </div>
          <p className="text-base font-bold text-red-600">{fmt(totalDebits)}</p>
          <p className="text-[10px] text-slate-400">{debits.length} entries</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1 mb-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
            <p className="text-[10px] font-bold text-slate-400 uppercase">Paid</p>
          </div>
          <p className="text-base font-bold text-green-600">{fmt(totalCredits)}</p>
          <p className="text-[10px] text-slate-400">{credits.length} payments</p>
        </div>
        <div className={`rounded-2xl p-3 border shadow-sm ${totalBalance > 0 ? "bg-red-50 border-red-200" : totalBalance < 0 ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center gap-1 mb-1">
            <Wallet className={`w-3.5 h-3.5 ${totalBalance > 0 ? "text-red-500" : "text-green-500"}`} />
            <p className="text-[10px] font-bold text-slate-400 uppercase">Balance</p>
          </div>
          <p className={`text-base font-bold ${totalBalance > 0 ? "text-red-700" : totalBalance < 0 ? "text-green-700" : "text-slate-500"}`}>
            {fmt(Math.abs(totalBalance))}
          </p>
          <p className={`text-[10px] font-semibold ${totalBalance > 0 ? "text-red-400" : totalBalance < 0 ? "text-green-400" : "text-slate-400"}`}>
            {totalBalance > 0 ? "Payable" : totalBalance < 0 ? "Advance" : "Settled ✓"}
          </p>
        </div>
      </div>

      {/* Add Payment button */}
      {canEdit && (
        <div className="px-4 mb-4">
          <button onClick={() => setShowPayment(true)}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-2xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Record Salary Payment
          </button>
        </div>
      )}

      {/* Ledger table */}
      <div id="employee-ledger-print" className="px-4">

        {/* Print header */}
        <div className="hidden print:block mb-6 pb-4 border-b-2 border-blue-600">
          <div className="flex justify-between">
            <div>
              <h1 className="text-xl font-bold">{cp?.company_name || "Company"}</h1>
              <p className="text-sm text-gray-600">{cp?.address || ""}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-blue-700">EMPLOYEE SALARY LEDGER</h2>
              <p className="text-sm">{filterMonth || "All Entries"}</p>
              <p className="text-xs text-gray-500 mt-1">Printed: {format(new Date(), "dd MMM yyyy")}</p>
            </div>
          </div>
        </div>

        {/* Header row */}
        <div className="bg-slate-800 rounded-t-2xl px-4 py-2.5 grid grid-cols-12 gap-1 print:hidden">
          <p className="col-span-2 text-[10px] font-bold text-slate-300 uppercase">Date</p>
          <p className="col-span-4 text-[10px] font-bold text-slate-300 uppercase">Employee / Type</p>
          <p className="col-span-2 text-[10px] font-bold text-red-300   uppercase text-right">Debit</p>
          <p className="col-span-2 text-[10px] font-bold text-green-300 uppercase text-right">Credit</p>
          <p className="col-span-2 text-[10px] font-bold text-slate-300 uppercase text-right">Balance</p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-b-2xl p-8 text-center text-slate-400">Loading...</div>
        ) : ledgerWithBalance.length === 0 ? (
          <div className="bg-white rounded-b-2xl p-12 text-center">
            <User className="mx-auto mb-3 opacity-30 text-slate-400" size={40} />
            <p className="text-slate-400 text-sm">No records for this period</p>
            <p className="text-slate-300 text-xs mt-1">Salary records will appear here once added via Payroll</p>
          </div>
        ) : (
          <div className="bg-white rounded-b-2xl divide-y divide-slate-50 print:hidden overflow-hidden">
            {ledgerWithBalance.map(row => {
              const rowKey    = row.id + row.transaction_type;
              const isExpanded = expandedId === rowKey;
              return (
                <div key={rowKey}>
                  <button
                    className={`w-full text-left px-4 py-3 grid grid-cols-12 gap-1 items-center transition-colors ${row._isDebit ? "hover:bg-red-50" : "hover:bg-green-50"}`}
                    onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                  >
                    {/* Date */}
                    <div className="col-span-2">
                      <p className="text-[11px] font-semibold text-slate-700">
                        {row.date ? format(new Date(row.date), "dd MMM") : "—"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {row.date ? format(new Date(row.date), "yyyy") : ""}
                      </p>
                    </div>

                    {/* Employee / Type */}
                    <div className="col-span-4 flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${row._isDebit ? "bg-red-100" : "bg-green-100"}`}>
                        {row._isDebit
                          ? <ArrowUpRight  size={12} className="text-red-600" />
                          : <CheckCircle2  size={12} className="text-green-600" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800 truncate">
                          {row.employee_name || "—"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {typeLabel(row.transaction_type)}{row.month ? ` · ${row.month}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Debit */}
                    <div className="col-span-2 text-right">
                      {row._isDebit
                        ? <p className="text-[12px] font-bold text-red-600">{fmt(row.amount)}</p>
                        : <p className="text-[11px] text-slate-300">—</p>
                      }
                    </div>

                    {/* Credit */}
                    <div className="col-span-2 text-right">
                      {!row._isDebit
                        ? <p className="text-[12px] font-bold text-green-600">{fmt(row.amount)}</p>
                        : <p className="text-[11px] text-slate-300">—</p>
                      }
                    </div>

                    {/* Running balance */}
                    <div className="col-span-2 text-right">
                      <p className={`text-[12px] font-bold ${row._running > 0 ? "text-red-700" : row._running < 0 ? "text-green-700" : "text-slate-400"}`}>
                        {fmt(Math.abs(row._running))}
                      </p>
                      <p className={`text-[9px] font-bold ${row._running > 0 ? "text-red-400" : row._running < 0 ? "text-green-400" : "text-slate-300"}`}>
                        {row._running > 0 ? "DR" : row._running < 0 ? "CR" : "NIL"}
                      </p>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className={`px-4 pb-3 pt-1 text-xs space-y-1.5 ${row._isDebit ? "bg-red-50" : "bg-green-50"}`}>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {row.employee_name && <p className="text-slate-500">Employee: <span className="font-semibold text-slate-700">{row.employee_name}</span></p>}
                        {row.month         && <p className="text-slate-500">Period: <span className="font-semibold text-slate-700">{row.month}</span></p>}
                        {row.method        && <p className="text-slate-500">Method: <span className="font-semibold text-slate-700">{row.method}</span></p>}
                        {row.bank_name     && <p className="text-slate-500">Bank: <span className="font-semibold text-slate-700">{row.bank_name}</span></p>}
                        {row.cheque_no     && <p className="text-slate-500">Cheque #: <span className="font-semibold text-slate-700">{row.cheque_no}</span></p>}
                        {row.reference     && <p className="text-slate-500 col-span-2">Ref: <span className="font-semibold text-slate-700">{row.reference}</span></p>}
                        {row.notes         && <p className="text-slate-500 col-span-2">Notes: <span className="font-semibold text-slate-700">{row.notes}</span></p>}
                      </div>
                      <p className="text-[10px] text-slate-400 italic border-t border-slate-200 pt-1.5 mt-1">
                        {row._isDebit
                          ? `Dr Salary Expense ${fmt(row.amount)} / Cr Salary Payable ${fmt(row.amount)}`
                          : `Dr Salary Payable ${fmt(row.amount)} / Cr ${row.method === "cash" ? "Cash in Hand" : "Bank Account"} ${fmt(row.amount)}`
                        }
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Totals footer */}
        {ledgerWithBalance.length > 0 && (
          <div className="mt-3 bg-slate-800 rounded-2xl p-4 grid grid-cols-3 gap-3 print:hidden">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Debits</p>
              <p className="text-sm font-bold text-red-400">{fmt(totalDebits)}</p>
            </div>
            <div className="text-center border-x border-slate-600">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Credits</p>
              <p className="text-sm font-bold text-green-400">{fmt(totalCredits)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Net Balance</p>
              <p className={`text-sm font-bold ${totalBalance > 0 ? "text-red-400" : totalBalance < 0 ? "text-green-400" : "text-slate-400"}`}>
                {fmt(Math.abs(totalBalance))} {totalBalance > 0 ? "DR" : totalBalance < 0 ? "CR" : "✓"}
              </p>
            </div>
          </div>
        )}

        {/* Print table */}
        <table className="w-full border-collapse text-sm hidden print:table mt-4">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className="border px-3 py-2 text-left">Date</th>
              <th className="border px-3 py-2 text-left">Employee</th>
              <th className="border px-3 py-2 text-left">Type</th>
              <th className="border px-3 py-2 text-right">Debit</th>
              <th className="border px-3 py-2 text-right">Credit</th>
              <th className="border px-3 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledgerWithBalance.map(row => (
              <tr key={row.id + row.transaction_type} className={!row._isDebit ? "bg-green-50" : ""}>
                <td className="border px-3 py-2">{row.date}</td>
                <td className="border px-3 py-2">{row.employee_name}</td>
                <td className="border px-3 py-2">{typeLabel(row.transaction_type)}</td>
                <td className="border px-3 py-2 text-right text-red-700 font-medium">
                  {row._isDebit ? fmt(row.amount) : "—"}
                </td>
                <td className="border px-3 py-2 text-right text-green-700 font-medium">
                  {!row._isDebit ? fmt(row.amount) : "—"}
                </td>
                <td className="border px-3 py-2 text-right font-bold">
                  {fmt(Math.abs(row._running))} {row._running > 0 ? "DR" : row._running < 0 ? "CR" : ""}
                </td>
              </tr>
            ))}
            <tr className="bg-blue-50 font-bold">
              <td colSpan={3} className="border px-3 py-3 text-right">TOTALS</td>
              <td className="border px-3 py-3 text-right text-red-700">{fmt(totalDebits)}</td>
              <td className="border px-3 py-3 text-right text-green-700">{fmt(totalCredits)}</td>
              <td className={`border px-3 py-3 text-right ${totalBalance > 0 ? "text-red-700" : "text-green-700"}`}>
                {fmt(Math.abs(totalBalance))} {totalBalance > 0 ? "DR" : "CR"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Record Salary Payment</h2>
                <p className="text-xs text-slate-500">Dr Salary Payable / Cr Cash or Bank</p>
              </div>
              <button onClick={() => setShowPayment(false)} className="p-2 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Employee selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Employee *</label>
                <select
                  value={paymentForm.employee_id}
                  onChange={e => setPaymentForm(p => ({ ...p, employee_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">Select employee</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name}{e.designation ? ` — ${e.designation}` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Date *</label>
                <input type="date" value={paymentForm.date}
                  onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Amount (Rs) *</label>
                <input type="number" placeholder="Enter amount"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Method *</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value}
                      onClick={() => setPaymentForm(p => ({ ...p, method: m.value }))}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        paymentForm.method === m.value
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank/Cheque fields */}
              {["cheque","bank_transfer","online_transfer"].includes(paymentForm.method) && (
                <div className="space-y-3 bg-slate-50 rounded-2xl p-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Bank Name</label>
                    <input type="text" placeholder="e.g. HBL, MCB, UBL"
                      value={paymentForm.bank_name}
                      onChange={e => setPaymentForm(p => ({ ...p, bank_name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  {paymentForm.method === "cheque" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Cheque Number</label>
                      <input type="text" placeholder="Cheque #"
                        value={paymentForm.cheque_no}
                        onChange={e => setPaymentForm(p => ({ ...p, cheque_no: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Transaction Reference</label>
                    <input type="text" placeholder="TRN / transaction ID"
                      value={paymentForm.reference}
                      onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
              )}

              {/* Period */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">For Month</label>
                <input type="month" value={paymentForm.period_month}
                  onChange={e => setPaymentForm(p => ({ ...p, period_month: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none" />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notes</label>
                <textarea placeholder="Optional notes..." rows={2}
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none resize-none" />
              </div>

              {/* Accounting preview */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Accounting Entry</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dr. Salary Payable</span>
                    <span className="font-bold">{paymentForm.amount ? fmt(Number(paymentForm.amount)) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cr. {paymentForm.method === "cash" ? "Cash in Hand" : "Bank Account"}</span>
                    <span className="font-bold">{paymentForm.amount ? fmt(Number(paymentForm.amount)) : "—"}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowPayment(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">
                  Cancel
                </button>
                <button onClick={handleSavePayment} disabled={savingPayment || !paymentForm.amount || !paymentForm.employee_id}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50">
                  {savingPayment ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}