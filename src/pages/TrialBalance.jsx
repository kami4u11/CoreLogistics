import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Printer, CheckCircle, AlertCircle } from "lucide-react";
import { format, subMonths } from "date-fns";
import jsPDF from "jspdf";

const ACCOUNT_GROUPS = {
  asset: ["bank", "cash", "client", "other"],
  liability: ["vendor", "broker"],
  equity: [],
  income: ["income"],
  expense: ["expense", "employee", "driver"],
};

export default function TrialBalance() {
  const { canSeeAccounting } = useRole();
  const { fmt, settings, fmtK } = useAppSettings();
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 2000),
  });

  const filteredEntries = entries.filter(e => {
    if (!e.date) return false;
    return e.date >= dateFrom && e.date <= dateTo;
  });

  // Build trial balance: group by account_name
  const accountMap = useMemo(() => {
    const map = {};
    filteredEntries.forEach(e => {
      const key = `${e.account_type}::${e.account_name}`;
      if (!map[key]) map[key] = { account_type: e.account_type, account_name: e.account_name, debit: 0, credit: 0 };
      map[key].debit += e.debit || 0;
      map[key].credit += e.credit || 0;
    });
    return Object.values(map).sort((a, b) => a.account_name.localeCompare(b.account_name));
  }, [filteredEntries]);

  const totalDebit = accountMap.reduce((s, a) => s + a.debit, 0);
  const totalCredit = accountMap.reduce((s, a) => s + a.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

  const grouped = useMemo(() => {
    const g = { asset: [], liability: [], income: [], expense: [], other: [] };
    accountMap.forEach(a => {
      if (["bank", "cash", "client"].includes(a.account_type)) g.asset.push(a);
      else if (["vendor", "broker"].includes(a.account_type)) g.liability.push(a);
      else if (a.account_type === "income") g.income.push(a);
      else if (["expense", "employee", "driver"].includes(a.account_type)) g.expense.push(a);
      else g.other.push(a);
    });
    return g;
  }, [accountMap]);

  if (!canSeeAccounting) return <AccessDenied />;

  const exportPDF = () => {
    const doc = new jsPDF();
    const cp = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
    doc.setFontSize(14); doc.text(`${cp?.company_name || "Company"} - Trial Balance`, 14, 16);
    doc.setFontSize(9); doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 23);
    doc.setFontSize(8);
    let y = 30;
    const cols = [14, 100, 145, 185];
    doc.setFillColor(30, 41, 59); doc.rect(10, y - 4, 190, 7, "F");
    doc.setTextColor(255); doc.text("Account", cols[0], y); doc.text("Type", cols[1], y); doc.text("Debit", cols[2], y); doc.text("Credit", cols[3], y);
    doc.setTextColor(30, 41, 59); y += 7;
    accountMap.forEach(a => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(a.account_name.substring(0, 35), cols[0], y);
      doc.text(a.account_type, cols[1], y);
      doc.text(a.debit > 0 ? `${settings.symbol}${a.debit.toLocaleString()}` : "-", cols[2], y);
      doc.text(a.credit > 0 ? `${settings.symbol}${a.credit.toLocaleString()}` : "-", cols[3], y);
      y += 6;
    });
    y += 4;
    doc.setFillColor(241, 245, 249); doc.rect(10, y - 4, 190, 7, "F");
    doc.setFont(undefined, "bold");
    doc.text("TOTALS", cols[0], y);
    doc.text(`${settings.symbol}${totalDebit.toLocaleString()}`, cols[2], y);
    doc.text(`${settings.symbol}${totalCredit.toLocaleString()}`, cols[3], y);
    doc.save(`trial_balance_${dateFrom}_${dateTo}.pdf`);
  };

  const GROUP_LABELS = { asset: "Assets & Receivables", liability: "Liabilities & Payables", income: "Income", expense: "Expenses", other: "Other Accounts" };

  return (
    <div className="pb-24">
      <MobileHeader title="Trial Balance" backTo="Accounting" />

      {/* Date range */}
      <div className="px-4 pt-4 pb-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">From</p>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-xl h-9" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">To</p>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-xl h-9" />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {[["YTD", format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd")], ["6M", format(subMonths(new Date(), 6), "yyyy-MM-dd")], ["3M", format(subMonths(new Date(), 3), "yyyy-MM-dd")], ["1M", format(subMonths(new Date(), 1), "yyyy-MM-dd")]].map(([l, d]) => (
            <button key={l} onClick={() => { setDateFrom(d); setDateTo(format(new Date(), "yyyy-MM-dd")); }}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200">{l}</button>
          ))}
        </div>
      </div>

      {/* Balanced indicator */}
      <div className={`mx-4 mb-3 flex items-center gap-2 rounded-2xl px-4 py-3 ${isBalanced ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        {isBalanced
          ? <><CheckCircle className="w-5 h-5 text-green-600" /><div className="flex-1"><p className="text-sm font-bold text-green-800">Books Balanced ✓</p><p className="text-xs text-green-600">Debit = Credit = {fmt(totalDebit)}</p></div></>
          : <><AlertCircle className="w-5 h-5 text-red-600" /><div className="flex-1"><p className="text-sm font-bold text-red-800">Imbalance Detected</p><p className="text-xs text-red-600">Difference: {fmt(Math.abs(totalDebit - totalCredit))}</p></div></>
        }
        <Button onClick={exportPDF} size="sm" className="rounded-xl bg-slate-900 gap-1"><Printer className="w-3.5 h-3.5" /> Print</Button>
      </div>

      {/* Summary */}
      <div className="px-4 grid grid-cols-2 gap-2 mb-4">
        <div className="bg-red-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-red-500">Total Debit</p>
          <p className="text-base font-bold text-red-700">{fmtK(totalDebit)}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-green-500">Total Credit</p>
          <p className="text-base font-bold text-green-700">{fmtK(totalCredit)}</p>
        </div>
      </div>

      {/* Grouped Table */}
      {isLoading ? (
        <div className="px-4 space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="px-4 space-y-4">
          {Object.entries(grouped).map(([grp, rows]) => rows.length === 0 ? null : (
            <div key={grp} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2.5 flex justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">{GROUP_LABELS[grp]}</span>
                <span className="text-xs font-bold">{rows.length} accounts</span>
              </div>
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                <span className="flex-1">Account</span>
                <span className="w-20 text-right">Debit</span>
                <span className="w-20 text-right">Credit</span>
                <span className="w-20 text-right">Net</span>
              </div>
              {rows.map((a, i) => {
                const net = a.debit - a.credit;
                return (
                  <div key={i} className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{a.account_name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{a.account_type}</p>
                    </div>
                    <span className="w-20 text-right text-xs text-red-600 font-medium">{a.debit > 0 ? fmt(a.debit) : "—"}</span>
                    <span className="w-20 text-right text-xs text-green-600 font-medium">{a.credit > 0 ? fmt(a.credit) : "—"}</span>
                    <span className={`w-20 text-right text-xs font-bold ${net > 0 ? "text-red-700" : "text-green-700"}`}>{fmt(Math.abs(net))}</span>
                  </div>
                );
              })}
              {/* Group subtotals */}
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50">
                <span className="flex-1 text-xs font-bold text-slate-700">Subtotal</span>
                <span className="w-20 text-right text-xs font-bold text-red-700">{fmt(rows.reduce((s, a) => s + a.debit, 0))}</span>
                <span className="w-20 text-right text-xs font-bold text-green-700">{fmt(rows.reduce((s, a) => s + a.credit, 0))}</span>
                <span className="w-20 text-right text-xs font-bold text-slate-700">{fmt(Math.abs(rows.reduce((s, a) => s + a.debit - a.credit, 0)))}</span>
              </div>
            </div>
          ))}

          {/* Grand Total */}
          <div className="bg-slate-900 text-white rounded-2xl px-4 py-4 flex items-center justify-between">
            <span className="text-sm font-bold">GRAND TOTAL</span>
            <div className="text-right">
              <p className="text-xs text-white/60">Dr: <span className="font-bold text-red-300">{fmt(totalDebit)}</span></p>
              <p className="text-xs text-white/60">Cr: <span className="font-bold text-green-300">{fmt(totalCredit)}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}