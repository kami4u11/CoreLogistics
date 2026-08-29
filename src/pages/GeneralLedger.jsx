import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, RotateCcw, Lock, ShieldCheck, CheckCircle, X, Printer } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";

const ACCOUNT_TYPES = ["client", "vendor", "broker", "driver", "employee", "bank", "cash", "expense", "income", "labour", "other"];
const ENTRY_TYPES = ["journal", "payment", "receipt", "contra", "credit_note", "debit_note", "salary", "advance", "bonus"];

// Payment source MUST be selected for financial entries — strict rule
const REQUIRES_SOURCE = ["payment", "receipt", "expense", "salary", "advance"];

function getClosings() { try { return JSON.parse(localStorage.getItem("monthly_closings") || "{}"); } catch { return {}; } }

const emptyForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  entry_type: "journal",
  account_type: "expense",
  account_name: "",
  contra_account: "",
  debit: "",
  credit: "",
  payment_source: "",
  cashbook_id: "",
  bank_account_id: "",
  description: "",
  cheque_number: "",
};

export default function GeneralLedger() {
  const { fmt } = useAppSettings();
  const { canSeeAccounting, isSleepingPartner, isAdmin, user } = useRole();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");
  const [showReversal, setShowReversal] = useState(null);
  const [reversalNote, setReversalNote] = useState("");
  const [detailEntry, setDetailEntry] = useState(null);

  const closings = getClosings();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 500),
  });

  const { data: labourEntries = [] } = useQuery({
    queryKey: ["labour_entries_gl"],
    queryFn: () => base44.entities.LaborEntry.list("-date", 200),
  });

  // Merge labour entries as virtual GL rows for collective view
  const labourAsGL = labourEntries.map(le => ({
    id: `lab-${le.id}`,
    date: le.date,
    entry_type: "labour",
    account_type: "labour",
    account_name: `Labour: ${le.vehicle_number || le.vehicle_type || "Vehicle"}`,
    debit: le.labor_charges || 0,
    credit: 0,
    description: `${le.loading_point} → ${le.unloading_point}${le.notes ? " · " + le.notes : ""}`,
    payment_source: null,
    is_virtual: true,
    source_module: "labour",
  }));

  const { data: banks = [] } = useQuery({
    queryKey: ["bank_accounts"],
    queryFn: () => base44.entities.BankAccount.list(),
  });

  const { data: cashbooks = [] } = useQuery({
    queryKey: ["cashbooks"],
    queryFn: () => base44.entities.Cashbook.list(),
  });

  const { data: coa = [] } = useQuery({
    queryKey: ["chart_of_accounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("code", 500),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients_gl"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors_gl"],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers_gl"],
    queryFn: () => base44.entities.Broker.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_gl"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }),
  });

  // Get suggested account names based on account_type
  const getAccountNames = (accountType) => {
    switch (accountType) {
      case "client":   return clients.map(c => c.name);
      case "vendor":   return vendors.map(v => v.name);
      case "broker":   return brokers.map(b => b.name);
      case "employee": return employees.map(e => e.name);
      case "bank":     return banks.map(b => `${b.bank_name} - ${b.account_title}`);
      case "cash":     return cashbooks.map(c => c.name);
      default: {
        const coaForType = coa.filter(a => a.type === accountType || accountType === "expense" || accountType === "income" || accountType === "other");
        return coaForType.map(a => `${a.code} - ${a.name}`);
      }
    }
  };

  // Derived payment source label
  const sourceLabel = useMemo(() => {
    if (form.cashbook_id) {
      const cb = cashbooks.find(c => c.id === form.cashbook_id);
      return cb ? `Cashbook: ${cb.name}` : "";
    }
    if (form.bank_account_id) {
      const bk = banks.find(b => b.id === form.bank_account_id);
      return bk ? `Bank: ${bk.account_title}` : "";
    }
    return form.payment_source || "";
  }, [form.cashbook_id, form.bank_account_id, form.payment_source, cashbooks, banks]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const month = data.date?.slice(0, 7);
      if (closings[month]) throw new Error(`Period ${month} is locked. Cannot add entries.`);

      const cb = data.cashbook_id ? cashbooks.find(c => c.id === data.cashbook_id) : null;
      const bk = data.bank_account_id ? banks.find(b => b.id === data.bank_account_id) : null;
      const paymentSrc = cb?.name || bk?.account_title || data.payment_source || null;

      const primary = await base44.entities.AccountingEntry.create({
        date: data.date,
        entry_type: data.entry_type,
        account_type: data.account_type,
        account_name: data.account_name,
        debit: parseFloat(data.debit) || 0,
        credit: parseFloat(data.credit) || 0,
        payment_source: paymentSrc,
        bank_account: bk?.account_title || "",
        cheque_number: data.cheque_number || "",
        description: data.description,
        entry_number: `JV-${Date.now()}`,
        posted: true,
        created_by_name: user?.full_name || user?.email || "",
        source_module: "general_ledger",
      });

      // Auto double-entry contra
      if (data.contra_account) {
        await base44.entities.AccountingEntry.create({
          date: data.date,
          entry_type: data.entry_type,
          account_type: "other",
          account_name: data.contra_account,
          debit: parseFloat(data.credit) || 0,
          credit: parseFloat(data.debit) || 0,
          payment_source: paymentSrc,
          description: `Contra: ${data.description}`,
          entry_number: primary.entry_number,
          posted: true,
          is_contra: true,
          source_module: "general_ledger",
        });
      }
      return primary;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounting_entries"] });
      setForm(emptyForm);
      setShowForm(false);
      toast.success("Double entry recorded & posted");
    },
    onError: (err) => toast.error(err.message),
  });

  // Reversal — posts opposite entry, marks original as reversed
  const reverseMutation = useMutation({
    mutationFn: async ({ entry, note }) => {
      const month = entry.date?.slice(0, 7);
      if (closings[month] && !isAdmin) throw new Error("Period is locked. Only admin can reverse.");

      await base44.entities.AccountingEntry.create({
        date: format(new Date(), "yyyy-MM-dd"),
        entry_type: entry.entry_type,
        account_type: entry.account_type,
        account_name: entry.account_name,
        debit: entry.credit || 0,      // swap
        credit: entry.debit || 0,      // swap
        payment_source: entry.payment_source,
        description: `REVERSAL: ${entry.description || entry.account_name}. Reason: ${note}`,
        entry_number: `REV-${entry.entry_number || entry.id}`,
        is_reversal: true,
        original_entry_id: entry.id,
        posted: true,
        created_by_name: user?.full_name || user?.email || "",
        source_module: "reversal",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounting_entries"] });
      setShowReversal(null);
      setReversalNote("");
      toast.success("Reversal entry posted");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(form.debit) || parseFloat(form.credit) || 0;
    if (amt === 0) { toast.error("Amount is required (Debit or Credit)"); return; }
    if (!form.account_name.trim()) { toast.error("Account Name is required"); return; }
    if (!form.date) { toast.error("Date is required"); return; }
    if (!form.contra_account.trim()) { toast.error("Contra Account is required for double-entry"); return; }

    // Mandatory payment source for financial entries
    const needsSource = REQUIRES_SOURCE.includes(form.entry_type) || ["expense", "employee", "vendor", "broker"].includes(form.account_type);
    if (needsSource && !form.cashbook_id && !form.bank_account_id && !form.payment_source) {
      toast.error("Payment Source is mandatory — select a Cashbook or Bank Account");
      return;
    }

    createMutation.mutate(form);
  };

  const isEntryEditable = (entry) => {
    if (entry.is_reversal || entry.is_contra) return false;
    if (entry.posted) return false;
    const month = entry.date?.slice(0, 7);
    return !closings[month];
  };

  const allEntries = [...entries, ...labourAsGL].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const filtered = filter === "all" ? allEntries : filter === "labour"
    ? labourAsGL
    : entries.filter(e => e.account_type === filter);
  const totalDebit = filtered.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = filtered.reduce((s, e) => s + (e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const needsSource = REQUIRES_SOURCE.includes(form.entry_type) || ["expense", "employee", "vendor", "broker"].includes(form.account_type);

  if (!canSeeAccounting) return <AccessDenied />;

  return (
    <div className="pb-24">
      <MobileHeader title="General Ledger" backTo="Accounting"
        onAdd={isSleepingPartner ? undefined : () => setShowForm(true)}
        rightAction={
          <div className="flex items-center gap-2">
          <ExportButton
            data={filtered}
            filename="general-ledger"
            title="General Ledger"
            columns={[
              {label:"Date",key:"date"},
              {label:"Account",key:"account_name"},
              {label:"Type",key:"account_type"},
              {label:"Entry",key:"entry_type"},
              {label:"Debit",key:"debit",format:v=>v>0?`₨${v.toLocaleString()}`:"—"},
              {label:"Credit",key:"credit",format:v=>v>0?`₨${v.toLocaleString()}`:"—"},
              {label:"Source",key:"payment_source"},
              {label:"Description",key:"description"},
            ]}
          />
          <button onClick={() => {
            const w = window.open("", "_blank");
            const rows = filtered.slice(0, 500).map(e => `<tr><td>${e.date}</td><td>${e.account_name}</td><td>${e.account_type}</td><td>${e.entry_type}</td><td style="color:#dc2626">${e.debit > 0 ? "₨" + e.debit.toLocaleString() : "—"}</td><td style="color:#16a34a">${e.credit > 0 ? "₨" + e.credit.toLocaleString() : "—"}</td><td>${e.payment_source || "—"}</td><td>${e.description || ""}</td></tr>`).join("");
            w.document.write(`<!DOCTYPE html><html><head><title>General Ledger</title><style>body{font-family:Arial;padding:20px;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:#fff;padding:5px 6px;text-align:left}td{padding:4px 6px;border-bottom:1px solid #f1f5f9}</style></head><body><h2>General Ledger — ${filter === "all" ? "All Accounts" : filter} (${filtered.length} entries)</h2><p>Dr: ₨${totalDebit.toLocaleString()} · Cr: ₨${totalCredit.toLocaleString()} · ${isBalanced ? "✓ Balanced" : "⚠ Imbalanced"}</p><table><thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Entry</th><th>Debit</th><th>Credit</th><th>Source</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
            w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
          }} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-xl">
            <Printer className="w-3.5 h-3.5" />
          </button>
          </div>
        }
      />

      {/* Filter tabs */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto pb-2">
        {["all", ...ACCOUNT_TYPES].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${filter === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Totals */}
      <div className="px-4 pt-2 pb-3 grid grid-cols-3 gap-2">
        <div className="bg-red-50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-red-500">Total Debit</p>
          <p className="text-sm font-bold text-red-600">{fmt(totalDebit)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-green-500">Total Credit</p>
          <p className="text-sm font-bold text-green-600">{fmt(totalCredit)}</p>
        </div>
        <div className={`rounded-xl p-2.5 text-center ${isBalanced ? "bg-blue-50" : "bg-amber-50"}`}>
          <p className={`text-[10px] ${isBalanced ? "text-blue-500" : "text-amber-500"}`}>Balance</p>
          <p className={`text-sm font-bold ${isBalanced ? "text-blue-600" : "text-amber-600"}`}>{isBalanced ? "✓ OK" : fmt(Math.abs(totalDebit - totalCredit))}</p>
        </div>
      </div>

      {/* Enterprise rule reminder */}
      <div className="mx-4 mb-3 bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-[10px] text-blue-700">Posted entries cannot be deleted — use Reversal. Period-locked months require Admin to reopen.</p>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mx-4 mb-4 bg-white rounded-2xl border border-blue-100 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-sm">New Double Entry</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Strict Mode</span>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Date *</label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs text-slate-500">Entry Type</label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value })}>
                {ENTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Account Type (Dr side)</label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.account_type}
                onChange={e => setForm({ ...form, account_type: e.target.value, account_name: "" })}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Account Name *</label>
              {getAccountNames(form.account_type).length > 0 ? (
                <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.account_name}
                  onChange={e => setForm({ ...form, account_name: e.target.value })} required>
                  <option value="">— Select Account —</option>
                  {getAccountNames(form.account_type).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <Input placeholder="e.g. ABC Client" value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} required />
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500">Debit (Dr)</label>
              <Input type="number" placeholder="0" value={form.debit} onChange={e => setForm({ ...form, debit: e.target.value, credit: "" })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Credit (Cr)</label>
              <Input type="number" placeholder="0" value={form.credit} onChange={e => setForm({ ...form, credit: e.target.value, debit: "" })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500">Contra Account (other side) *</label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.contra_account}
                onChange={e => setForm({ ...form, contra_account: e.target.value })} required>
                <option value="">— Select Contra Account —</option>
                {banks.map(b => <option key={b.id} value={`${b.bank_name} - ${b.account_title}`}>🏦 {b.bank_name} - {b.account_title}</option>)}
                {cashbooks.map(c => <option key={c.id} value={c.name}>💵 {c.name}</option>)}
                {coa.map(a => <option key={a.id} value={`${a.code} - ${a.name}`}>{a.code} - {a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Payment Source — MANDATORY for financial entries */}
          <div className={`p-3 rounded-xl border ${needsSource ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-2">
              Payment Source {needsSource && <span className="text-red-500">*</span>}
              {needsSource && <span className="text-[10px] text-amber-600 ml-1">Mandatory for this entry type</span>}
            </label>

            {/* Cashbooks */}
            {cashbooks.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-slate-400 mb-1">Cashbook</p>
                <div className="flex flex-wrap gap-1.5">
                  {cashbooks.map(cb => (
                    <button key={cb.id} type="button"
                      onClick={() => setForm({ ...form, cashbook_id: form.cashbook_id === cb.id ? "" : cb.id, bank_account_id: "", payment_source: "" })}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.cashbook_id === cb.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                      💵 {cb.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Banks */}
            {banks.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-slate-400 mb-1">Bank Account</p>
                <div className="flex flex-wrap gap-1.5">
                  {banks.map(bk => (
                    <button key={bk.id} type="button"
                      onClick={() => setForm({ ...form, bank_account_id: form.bank_account_id === bk.id ? "" : bk.id, cashbook_id: "", payment_source: "" })}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${form.bank_account_id === bk.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                      🏦 {bk.bank_name} - {bk.account_title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected source display */}
            {(form.cashbook_id || form.bank_account_id) ? (
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <p className="text-xs text-green-700 font-medium">{sourceLabel}</p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Or manual source</p>
                <Input className="text-sm" placeholder="e.g. petty cash, loan" value={form.payment_source} onChange={e => setForm({ ...form, payment_source: e.target.value, cashbook_id: "", bank_account_id: "" })} />
              </div>
            )}

            {needsSource && !form.cashbook_id && !form.bank_account_id && !form.payment_source && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Select a Cashbook or Bank Account</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Cheque No. (optional)" value={form.cheque_number} onChange={e => setForm({ ...form, cheque_number: e.target.value })} />
            <Input placeholder="Description / Narration" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 rounded-xl" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Posting..." : "Post Entry"}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Entries List */}
      <div className="px-4 space-y-2">
        {isLoading ? (
          <p className="text-center text-slate-400 text-sm py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">No entries found</p>
        ) : (
          filtered.map(e => {
            const month = e.date?.slice(0, 7);
            const isLocked = !!closings[month];
            const isRev = e.is_reversal;
            const isContra = e.is_contra;
            const isVirtual = e.is_virtual; // Labour entry merged from LaborEntry
            return (
              <div key={e.id} onClick={() => !e.is_virtual && setDetailEntry(e)} className={`bg-white rounded-xl border px-3 py-3 cursor-pointer hover:shadow-sm transition-shadow ${isRev ? "border-amber-200" : isContra ? "border-slate-200" : isVirtual ? "border-amber-100 bg-amber-50/30" : "border-slate-100"}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-800 capitalize">{e.account_name}</p>
                      <span className="text-[9px] bg-slate-100 text-slate-500 rounded-full px-1.5 capitalize">{e.entry_type}</span>
                      {isRev && <span className="text-[9px] bg-amber-100 text-amber-700 rounded-full px-1.5">REVERSAL</span>}
                      {isContra && <span className="text-[9px] bg-indigo-100 text-indigo-700 rounded-full px-1.5">CONTRA</span>}
                      {isVirtual && <span className="text-[9px] bg-amber-100 text-amber-700 rounded-full px-1.5">LABOUR</span>}
                      {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{e.account_type} · {e.date}</p>
                    {e.description && <p className="text-[10px] text-slate-400 truncate">{e.description}</p>}
                    {e.payment_source && <p className="text-[10px] text-amber-700 font-medium">Source: {e.payment_source}</p>}
                    {e.created_by_name && <p className="text-[10px] text-slate-300">By: {e.created_by_name}</p>}
                  </div>
                  <div className="text-right flex items-start gap-1.5">
                    <div>
                      {e.debit > 0 && <p className="text-xs font-bold text-red-500">Dr {fmt(e.debit)}</p>}
                      {e.credit > 0 && <p className="text-xs font-bold text-green-600">Cr {fmt(e.credit)}</p>}
                    </div>
                    {/* Only allow reversal on real posted entries */}
                    {!isSleepingPartner && !isRev && !isContra && !isVirtual && (
                      <button onClick={() => setShowReversal(e)} className="p-1 text-slate-300 hover:text-amber-500 transition-colors" title="Reverse Entry">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Entry Detail Modal */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setDetailEntry(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-900">Entry Detail</p>
              <button onClick={() => setDetailEntry(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Account</span><span className="font-bold capitalize">{detailEntry.account_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="capitalize">{detailEntry.account_type} · {detailEntry.entry_type}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{detailEntry.date}</span></div>
              {detailEntry.debit > 0 && <div className="flex justify-between"><span className="text-slate-500">Debit (Dr)</span><span className="font-bold text-red-600">{fmt(detailEntry.debit)}</span></div>}
              {detailEntry.credit > 0 && <div className="flex justify-between"><span className="text-slate-500">Credit (Cr)</span><span className="font-bold text-green-600">{fmt(detailEntry.credit)}</span></div>}
              {detailEntry.payment_source && <div className="flex justify-between"><span className="text-slate-500">Source</span><span>{detailEntry.payment_source}</span></div>}
              {detailEntry.description && (
                <div className="bg-slate-50 rounded-xl p-2.5 mt-2">
                  <p className="text-xs text-slate-500 font-medium mb-1">Description</p>
                  <p className="text-xs text-slate-700">{detailEntry.description}</p>
                </div>
              )}
              {detailEntry.entry_number && <div className="flex justify-between text-xs"><span className="text-slate-400">Entry #</span><span className="text-slate-500">{detailEntry.entry_number}</span></div>}
              {detailEntry.created_by_name && <div className="flex justify-between text-xs"><span className="text-slate-400">Posted by</span><span className="text-slate-500">{detailEntry.created_by_name}</span></div>}
              {detailEntry.source_module && <div className="flex justify-between text-xs"><span className="text-slate-400">Module</span><span className="text-slate-500 capitalize">{detailEntry.source_module?.replace(/_/g, " ")}</span></div>}
            </div>
            {!detailEntry.is_reversal && !detailEntry.is_contra && (
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => { setShowReversal(detailEntry); setDetailEntry(null); }} className="flex-1 rounded-xl text-xs">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reverse
                </Button>
                <Button onClick={() => setDetailEntry(null)} className="flex-1 rounded-xl text-xs bg-slate-900">Close</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reversal Modal */}
      {showReversal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <p className="font-bold text-slate-900">Reverse Entry</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 mb-3 text-xs text-amber-800">
              <p className="font-bold">{showReversal.account_name}</p>
              <p>{showReversal.date} · {fmt(showReversal.debit || showReversal.credit)}</p>
              <p>{showReversal.description}</p>
            </div>
            <p className="text-xs text-slate-500 mb-2">This will create an opposite entry to cancel out the original. Original entry is preserved for audit.</p>
            <Input
              placeholder="Reason for reversal *"
              value={reversalNote}
              onChange={e => setReversalNote(e.target.value)}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!reversalNote.trim()) { toast.error("Reason is required for reversal"); return; }
                  reverseMutation.mutate({ entry: showReversal, note: reversalNote });
                }}
                disabled={reverseMutation.isPending}
                className="flex-1 bg-amber-600 hover:bg-amber-700 rounded-xl text-sm"
              >
                {reverseMutation.isPending ? "Reversing..." : "Post Reversal"}
              </Button>
              <Button variant="outline" onClick={() => { setShowReversal(null); setReversalNote(""); }} className="rounded-xl">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}