import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertTriangle, Printer, Lock, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

// We use a local-storage key to track "closed" months
const CLOSED_KEY = "monthly_closings";
function getClosings() { try { return JSON.parse(localStorage.getItem(CLOSED_KEY) || "{}"); } catch { return {}; } }
function saveClosings(obj) { localStorage.setItem(CLOSED_KEY, JSON.stringify(obj)); }

export default function MonthlyClosing() {
  const { canSeeAccounting, isAdmin } = useRole();
  const { fmt, fmtK, settings } = useAppSettings();
  const [selected, setSelected] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [closings, setClosings] = useState(getClosings());

  const { data: entries = [] } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 2000),
  });
  const { data: loads = [] } = useQuery({
    queryKey: ["loads_rep"],
    queryFn: () => base44.entities.Load.list("-loading_date", 500),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 300),
  });
  const { data: fleetExpenses = [] } = useQuery({
    queryKey: ["exp_rep"],
    queryFn: () => base44.entities.FleetExpense.list("-expense_date", 300),
  });

  if (!canSeeAccounting) return <AccessDenied />;

  // Generate last 24 months
  const months = useMemo(() => {
    const list = [];
    for (let i = 0; i < 24; i++) {
      const m = format(subMonths(new Date(), i), "yyyy-MM");
      list.push(m);
    }
    return list;
  }, []);

  const monthStats = useMemo(() => {
    const mo = selected;
    const mEntries = entries.filter(e => e.date?.startsWith(mo));
    const mLoads = loads.filter(l => (l.loading_date || l.created_date || "").startsWith(mo));
    const mInvoices = invoices.filter(i => i.invoice_date?.startsWith(mo));
    const mFleetExp = fleetExpenses.filter(e => e.month === mo || e.expense_date?.startsWith(mo));

    const income = mEntries.filter(e => e.account_type === "income").reduce((s, e) => s + (e.credit || 0) - (e.debit || 0), 0)
      + mLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
    const expenses = mEntries.filter(e => ["expense", "employee"].includes(e.account_type)).reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0)
      + mLoads.reduce((s, l) => s + (l.broker_hired_amount || 0) + (l.labor_charges || 0), 0)
      + mFleetExp.reduce((s, e) => s + (e.amount_pkr || 0), 0);

    const totalDebit = mEntries.reduce((s, e) => s + (e.debit || 0), 0);
    const totalCredit = mEntries.reduce((s, e) => s + (e.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

    const pendingInvoices = mInvoices.filter(i => !["paid", "cancelled"].includes(i.status)).length;
    const pendingLoads = mLoads.filter(l => !["completed", "cancelled"].includes(l.status)).length;

    return {
      income, expenses, netProfit: income - expenses,
      totalDebit, totalCredit, isBalanced,
      entryCount: mEntries.length,
      loadCount: mLoads.length,
      invoiceCount: mInvoices.length,
      pendingInvoices, pendingLoads,
      fleetExpCount: mFleetExp.length,
    };
  }, [selected, entries, loads, invoices, fleetExpenses]);

  const isClosed = !!closings[selected];
  const closingInfo = closings[selected];

  const handleClose = () => {
    if (!isAdmin) { toast.error("Only Admin can close a period"); return; }
    if (monthStats.pendingLoads > 0) { toast.error(`${monthStats.pendingLoads} loads still in-progress`); return; }
    if (!monthStats.isBalanced) { toast.error("Ledger is not balanced. Cannot close month."); return; }
    const updated = { ...closings, [selected]: { closed_by: "Admin", closed_at: new Date().toISOString(), stats: monthStats } };
    saveClosings(updated);
    setClosings(updated);
    toast.success(`${selected} closed successfully`);
  };

  const handleReopen = () => {
    if (!isAdmin) { toast.error("Only Admin can reopen a period"); return; }
    const updated = { ...closings };
    delete updated[selected];
    saveClosings(updated);
    setClosings(updated);
    toast.success(`${selected} reopened`);
  };

  const printClosing = () => {
    const cp = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
    const sym = settings.symbol;
    const f = (n) => `${sym}${(n || 0).toLocaleString()}`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Monthly Closing Report</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:16px}h2{font-size:11px;text-transform:uppercase;color:#475569;margin:14px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    table{width:100%;border-collapse:collapse}td{padding:6px 8px;font-size:12px;border-bottom:1px solid #f1f5f9}.right{text-align:right}
    .status{padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #1e293b;padding-bottom:10px;margin-bottom:16px">
      <div><h1>${cp?.company_name || "Company"}</h1><p style="font-size:11px;color:#64748b">Monthly Closing Report — ${selected}</p></div>
      <div style="text-align:right"><span class="status" style="background:${isClosed ? "#dcfce7" : "#fef3c7"};color:${isClosed ? "#15803d" : "#92400e"}">${isClosed ? "✓ CLOSED" : "OPEN"}</span></div>
    </div>
    <h2>Summary</h2>
    <table><tbody>
      <tr><td>Total Income</td><td class="right">${f(monthStats.income)}</td></tr>
      <tr><td>Total Expenses</td><td class="right">${f(monthStats.expenses)}</td></tr>
      <tr style="font-weight:bold;background:#f8fafc"><td>Net ${monthStats.netProfit >= 0 ? "Profit" : "Loss"}</td><td class="right" style="color:${monthStats.netProfit >= 0 ? "#15803d" : "#dc2626"}">${f(Math.abs(monthStats.netProfit))}</td></tr>
    </tbody></table>
    <h2>Activity</h2>
    <table><tbody>
      <tr><td>Accounting Entries</td><td class="right">${monthStats.entryCount}</td></tr>
      <tr><td>Loads / Bilties</td><td class="right">${monthStats.loadCount}</td></tr>
      <tr><td>Invoices</td><td class="right">${monthStats.invoiceCount}</td></tr>
      <tr><td>Pending Invoices</td><td class="right">${monthStats.pendingInvoices}</td></tr>
      <tr><td>Fleet Expense Entries</td><td class="right">${monthStats.fleetExpCount}</td></tr>
    </tbody></table>
    <h2>Books</h2>
    <table><tbody>
      <tr><td>Total Debit</td><td class="right">${f(monthStats.totalDebit)}</td></tr>
      <tr><td>Total Credit</td><td class="right">${f(monthStats.totalCredit)}</td></tr>
      <tr style="font-weight:bold"><td>Balance Status</td><td class="right">${monthStats.isBalanced ? "✓ Balanced" : "⚠ Imbalanced"}</td></tr>
    </tbody></table>
    ${isClosed ? `<p style="margin-top:20px;font-size:11px;color:#64748b">Closed by: ${closingInfo.closed_by} on ${format(new Date(closingInfo.closed_at), "dd MMM yyyy HH:mm")}</p>` : ""}
    </body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
  };

  const yearGroups = useMemo(() => {
    const g = {};
    months.forEach(m => {
      const yr = m.slice(0, 4);
      if (!g[yr]) g[yr] = [];
      g[yr].push(m);
    });
    return g;
  }, [months]);

  const Checklist = ({ label, ok, warn }) => (
    <div className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0`}>
      <p className="text-xs text-slate-700">{label}</p>
      {ok ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className={`w-4 h-4 ${warn ? "text-amber-500" : "text-red-500"}`} />}
    </div>
  );

  return (
    <div className="pb-24">
      <MobileHeader title="Period Closing" backTo="Accounting" />

      <div className="px-4 pt-4 flex gap-3">
        {/* Month selector */}
        <div className="w-36 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {Object.entries(yearGroups).reverse().map(([yr, mths]) => (
              <div key={yr}>
                <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100">{yr}</div>
                {mths.map(m => {
                  const closed = !!closings[m];
                  return (
                    <button key={m} onClick={() => setSelected(m)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left border-b border-slate-50 last:border-0 transition-colors ${selected === m ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}>
                      <span className="text-xs font-medium">{format(new Date(m + "-01"), "MMM yy")}</span>
                      {closed ? <Lock className={`w-3 h-3 ${selected === m ? "text-green-300" : "text-green-500"}`} /> : <Clock className={`w-3 h-3 ${selected === m ? "text-white/40" : "text-slate-300"}`} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 space-y-3">
          <div className={`rounded-2xl px-4 py-3 flex items-center gap-2 border ${isClosed ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            {isClosed ? <Lock className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
            <div className="flex-1">
              <p className={`text-sm font-bold ${isClosed ? "text-green-800" : "text-amber-800"}`}>{format(new Date(selected + "-01"), "MMMM yyyy")}</p>
              <p className={`text-xs ${isClosed ? "text-green-600" : "text-amber-600"}`}>{isClosed ? `Closed on ${format(new Date(closingInfo.closed_at), "dd MMM yyyy")}` : "Period Open"}</p>
            </div>
            <Button onClick={printClosing} variant="outline" size="sm" className="rounded-xl gap-1"><Printer className="w-3.5 h-3.5" /></Button>
          </div>

          {/* P&L summary */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-700 text-white px-4 py-2"><p className="text-xs font-bold">P&L Summary</p></div>
            <div className="flex justify-between px-4 py-2.5 border-b border-slate-50">
              <p className="text-xs text-slate-600">Income</p>
              <p className="text-xs font-bold text-green-700">{fmt(monthStats.income)}</p>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-b border-slate-50">
              <p className="text-xs text-slate-600">Expenses</p>
              <p className="text-xs font-bold text-red-700">{fmt(monthStats.expenses)}</p>
            </div>
            <div className={`flex justify-between px-4 py-2.5 font-bold ${monthStats.netProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <p className="text-xs">Net {monthStats.netProfit >= 0 ? "Profit" : "Loss"}</p>
              <p className={`text-xs ${monthStats.netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(Math.abs(monthStats.netProfit))}</p>
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-700 text-white px-4 py-2"><p className="text-xs font-bold">Activity</p></div>
            {[
              [`Accounting Entries`, `${monthStats.entryCount}`],
              [`Loads / Bilties`, `${monthStats.loadCount}`],
              [`Invoices`, `${monthStats.invoiceCount}`],
              [`Fleet Expense Records`, `${monthStats.fleetExpCount}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between px-4 py-2.5 border-b border-slate-50 last:border-0">
                <p className="text-xs text-slate-600">{l}</p>
                <p className="text-xs font-bold text-slate-800">{v}</p>
              </div>
            ))}
          </div>

          {/* Closing checklist */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-700 text-white px-4 py-2"><p className="text-xs font-bold">Closing Checklist</p></div>
            <Checklist label="Ledger balanced (Dr = Cr)" ok={monthStats.isBalanced} />
            <Checklist label="No pending loads" ok={monthStats.pendingLoads === 0} warn={monthStats.pendingLoads > 0} />
            <Checklist label="All invoices settled" ok={monthStats.pendingInvoices === 0} warn />
            <Checklist label="Has accounting entries" ok={monthStats.entryCount > 0} warn />
          </div>

          {/* Action button */}
          {isAdmin && (
            isClosed ? (
              <Button onClick={handleReopen} variant="outline" className="w-full rounded-xl border-amber-300 text-amber-700 h-11 gap-2">
                <Lock className="w-4 h-4" /> Reopen Period
              </Button>
            ) : (
              <Button onClick={handleClose} className={`w-full rounded-xl h-11 gap-2 ${!monthStats.isBalanced || monthStats.pendingLoads > 0 ? "bg-slate-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800"}`}>
                <Lock className="w-4 h-4" /> Close {format(new Date(selected + "-01"), "MMM yyyy")}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}