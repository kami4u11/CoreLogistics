import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { format, subMonths } from "date-fns";
import jsPDF from "jspdf";

export default function ProfitLoss() {
  const { canSeeAccounting } = useRole();
  const { fmt, fmtK, settings } = useAppSettings();
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [view, setView] = useState("summary"); // summary | monthly | detailed

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 2000),
  });
  const { data: loads = [] } = useQuery({
    queryKey: ["loads_rep"],
    queryFn: () => base44.entities.Load.list("-loading_date", 1000),
  });
  const { data: fleetExpenses = [] } = useQuery({
    queryKey: ["exp_rep"],
    queryFn: () => base44.entities.FleetExpense.list("-expense_date", 500),
  });
  const { data: txnDetails = [] } = useQuery({
    queryKey: ["txn_details_pl"],
    queryFn: () => base44.entities.TransactionDetail.list("-date", 1000),
  });

  const filtered = entries.filter(e => e.date && e.date >= dateFrom && e.date <= dateTo);
  const filteredLoads = loads.filter(l => { const d = l.loading_date || l.created_date; return d && d >= dateFrom && d <= dateTo; });
  const filteredFleetExp = fleetExpenses.filter(e => e.expense_date && e.expense_date >= dateFrom && e.expense_date <= dateTo);

  // Income from accounting entries
  const incomeEntries = useMemo(() => {
    const map = {};
    filtered.filter(e => e.account_type === "income").forEach(e => {
      if (!map[e.account_name]) map[e.account_name] = 0;
      map[e.account_name] += (e.credit || 0) - (e.debit || 0);
    });
    return Object.entries(map).map(([k, v]) => ({ label: k, val: v })).filter(i => i.val > 0).sort((a, b) => b.val - a.val);
  }, [filtered]);

  // Bilty transaction details (from BiltyCost / TransactionDetail)
  const filteredTxn = txnDetails.filter(t => t.date && t.date >= dateFrom && t.date <= dateTo);
  const biltyRevenue = filteredTxn.reduce((s, t) => s + (t.approved_client_rate || 0), 0);
  const biltyTotalCost = filteredTxn.reduce((s, t) => s + (t.total_cost || 0), 0);
  const biltyPL = filteredTxn.reduce((s, t) => s + (t.profit_loss || 0), 0);

  // Freight income from loads (fallback if no txn details)
  const freightIncomeFallback = biltyRevenue > 0 ? biltyRevenue : filteredLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
  const freightIncome = freightIncomeFallback;
  const totalIncome = incomeEntries.reduce((s, i) => s + i.val, 0) + freightIncome;

  // Expenses from accounting entries
  const expenseEntries = useMemo(() => {
    const map = {};
    filtered.filter(e => ["expense", "employee"].includes(e.account_type)).forEach(e => {
      if (!map[e.account_name]) map[e.account_name] = 0;
      map[e.account_name] += (e.debit || 0) - (e.credit || 0);
    });
    return Object.entries(map).map(([k, v]) => ({ label: k, val: v })).filter(i => i.val > 0).sort((a, b) => b.val - a.val);
  }, [filtered]);

  const cogsBilty = biltyTotalCost > 0 ? biltyTotalCost : filteredLoads.reduce((s, l) => s + (l.broker_hired_amount || 0) + (l.labor_charges || 0), 0);
  const cogs = cogsBilty;
  const fleetExpTotal = filteredFleetExp.reduce((s, e) => s + (e.amount_pkr || 0), 0);
  const totalExpenses = expenseEntries.reduce((s, e) => s + e.val, 0) + cogs + fleetExpTotal;

  const grossProfit = freightIncome - cogs;
  const netProfit = totalIncome - totalExpenses;

  // Monthly P&L data
  const monthlyData = useMemo(() => {
    const months = [];
    let cur = new Date(dateFrom);
    const end = new Date(dateTo);
    while (cur <= end) {
      const m = format(cur, "yyyy-MM");
      const mLabel = format(cur, "MMM yy");
      const mLoads = loads.filter(l => (l.loading_date || l.created_date || "").startsWith(m));
      const mEntries = entries.filter(e => e.date?.startsWith(m));
      const mIncome = mEntries.filter(e => e.account_type === "income").reduce((s, e) => s + (e.credit || 0) - (e.debit || 0), 0)
        + mLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
      const mExp = mEntries.filter(e => ["expense", "employee"].includes(e.account_type)).reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0)
        + mLoads.reduce((s, l) => s + (l.broker_hired_amount || 0) + (l.labor_charges || 0), 0)
        + fleetExpenses.filter(e => e.month === m).reduce((s, e) => s + (e.amount_pkr || 0), 0);
      months.push({ month: mLabel, Income: Math.round(mIncome), Expenses: Math.round(mExp), Profit: Math.round(mIncome - mExp) });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return months;
  }, [entries, loads, fleetExpenses, dateFrom, dateTo]);

  if (!canSeeAccounting) return <AccessDenied />;

  const printPL = () => {
    const cp = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
    const sym = settings.symbol;
    const f = (n) => `${sym}${(Math.abs(n) || 0).toLocaleString()}`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>P&L Statement</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:18px;margin:0}h2{font-size:11px;margin:14px 0 4px;text-transform:uppercase;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    table{width:100%;border-collapse:collapse}td{padding:5px 8px;font-size:12px;border-bottom:1px solid #f1f5f9}.right{text-align:right}.bold{font-weight:bold}
    .total{background:#f8fafc;font-weight:bold;border-top:2px solid #e2e8f0}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #1e293b;padding-bottom:10px;margin-bottom:16px">
      <div><h1>${cp?.company_name || "Company"}</h1><p style="font-size:11px;color:#64748b">Income & Expenditure Statement</p><p style="font-size:11px;color:#64748b">Period: ${dateFrom} to ${dateTo}</p></div>
    </div>
    <h2>Income</h2>
    <table><tbody>
      <tr class="bold"><td>Freight Income (Loads)</td><td class="right">${f(freightIncome)}</td></tr>
      ${incomeEntries.map(i => `<tr><td style="padding-left:16px">${i.label}</td><td class="right">${f(i.val)}</td></tr>`).join("")}
      <tr class="total"><td><b>TOTAL INCOME</b></td><td class="right"><b>${f(totalIncome)}</b></td></tr>
    </tbody></table>
    <h2>Cost of Goods Sold</h2>
    <table><tbody>
      <tr><td>Broker / Hired Freight</td><td class="right">${f(cogs)}</td></tr>
      <tr class="total"><td><b>GROSS PROFIT</b></td><td class="right"><b>${f(grossProfit)}</b></td></tr>
    </tbody></table>
    <h2>Operating Expenses</h2>
    <table><tbody>
      <tr class="bold"><td>Fleet Expenses</td><td class="right">${f(fleetExpTotal)}</td></tr>
      ${expenseEntries.map(e => `<tr><td style="padding-left:16px">${e.label}</td><td class="right">${f(e.val)}</td></tr>`).join("")}
      <tr class="total"><td><b>TOTAL EXPENSES</b></td><td class="right"><b>${f(totalExpenses)}</b></td></tr>
    </tbody></table>
    <div style="margin-top:16px;padding:12px;border-radius:8px;background:${netProfit >= 0 ? "#f0fdf4" : "#fef2f2"};border:2px solid ${netProfit >= 0 ? "#86efac" : "#fca5a5"}">
      <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:15px">
        <span>NET ${netProfit >= 0 ? "PROFIT" : "LOSS"}</span>
        <span style="color:${netProfit >= 0 ? "#15803d" : "#dc2626"}">${f(netProfit)}</span>
      </div>
    </div>
    </body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
  };

  return (
    <div className="pb-24">
      <MobileHeader title="P&L Statement" backTo="Accounting" />

      {/* Date & View */}
      <div className="px-4 pt-4 pb-3 space-y-3">
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
        <div className="flex gap-2">
          {[["YTD", format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd")], ["6M", format(subMonths(new Date(), 6), "yyyy-MM-dd")], ["3M", format(subMonths(new Date(), 3), "yyyy-MM-dd")], ["1M", format(subMonths(new Date(), 1), "yyyy-MM-dd")]].map(([l, d]) => (
            <button key={l} onClick={() => { setDateFrom(d); setDateTo(format(new Date(), "yyyy-MM-dd")); }}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200">{l}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {["summary", "monthly", "detailed"].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize ${view === v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{v}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 grid grid-cols-3 gap-2 mb-4">
        <div className="bg-green-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-green-500">Income</p>
          <p className="text-sm font-bold text-green-700">{fmtK(totalIncome)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-red-500">Expenses</p>
          <p className="text-sm font-bold text-red-700">{fmtK(totalExpenses)}</p>
        </div>
        <div className={`rounded-2xl p-3 text-center ${netProfit >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
          <p className={`text-[10px] ${netProfit >= 0 ? "text-blue-500" : "text-orange-500"}`}>Net {netProfit >= 0 ? "Profit" : "Loss"}</p>
          <p className={`text-sm font-bold ${netProfit >= 0 ? "text-blue-700" : "text-orange-700"}`}>{fmtK(Math.abs(netProfit))}</p>
        </div>
      </div>

      {/* Monthly chart */}
      {(view === "monthly" || view === "summary") && (
        <div className="mx-4 mb-4 bg-white rounded-2xl border border-slate-100 p-3">
          <p className="text-xs font-bold text-slate-700 mb-3">Monthly Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ left: -15, right: 5, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => [`${settings.symbol}${v.toLocaleString()}`, ""]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Profit" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* P&L Statement */}
      <div className="px-4 space-y-3">
        {/* INCOME */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-emerald-700 text-white px-4 py-2.5 flex justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Income</span>
            <span className="text-xs font-bold">{fmt(totalIncome)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-800">Freight Income (Loads)</p>
            <p className="text-xs font-bold text-green-700">{fmt(freightIncome)}</p>
          </div>
          {view === "detailed" && incomeEntries.map((i, idx) => (
            <div key={idx} className="flex justify-between px-4 py-2 border-b border-slate-50 pl-8">
              <p className="text-xs text-slate-600">{i.label}</p>
              <p className="text-xs font-medium text-green-600">{fmt(i.val)}</p>
            </div>
          ))}
          {incomeEntries.length > 0 && (
            <div className="flex justify-between px-4 py-2.5 border-b border-slate-50">
              <p className="text-xs font-bold text-slate-800">Other Income</p>
              <p className="text-xs font-bold text-green-700">{fmt(incomeEntries.reduce((s, i) => s + i.val, 0))}</p>
            </div>
          )}
        </div>

        {/* COGS */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-600 text-white px-4 py-2.5 flex justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Cost of Services</span>
            <span className="text-xs font-bold">{fmt(cogs)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <p className="text-xs text-slate-600">Broker / Hired Vehicle Freight</p>
            <p className="text-xs font-medium text-slate-700">{fmt(cogs)}</p>
          </div>
          <div className="flex justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-900">Gross Profit</p>
            <p className={`text-xs font-bold ${grossProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(grossProfit)}</p>
          </div>
        </div>

        {/* EXPENSES */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-red-700 text-white px-4 py-2.5 flex justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Operating Expenses</span>
            <span className="text-xs font-bold">{fmt(totalExpenses)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-800">Fleet Expenses</p>
            <p className="text-xs font-bold text-red-700">{fmt(fleetExpTotal)}</p>
          </div>
          {view === "detailed" && expenseEntries.map((e, i) => (
            <div key={i} className="flex justify-between px-4 py-2 border-b border-slate-50 pl-8">
              <p className="text-xs text-slate-600">{e.label}</p>
              <p className="text-xs font-medium text-red-600">{fmt(e.val)}</p>
            </div>
          ))}
          {expenseEntries.length > 0 && (
            <div className="flex justify-between px-4 py-2.5 border-b border-slate-50">
              <p className="text-xs font-bold text-slate-800">Other Expenses</p>
              <p className="text-xs font-bold text-red-700">{fmt(expenseEntries.reduce((s, e) => s + e.val, 0))}</p>
            </div>
          )}
        </div>

        {/* NET PROFIT/LOSS */}
        <div className={`rounded-2xl p-4 border-2 ${netProfit >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {netProfit >= 0 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-red-600" />}
              <div>
                <p className={`text-base font-bold ${netProfit >= 0 ? "text-green-800" : "text-red-800"}`}>
                  NET {netProfit >= 0 ? "PROFIT" : "LOSS"}
                </p>
                <p className="text-xs text-slate-500">{dateFrom} → {dateTo}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(Math.abs(netProfit))}</p>
              <p className="text-xs text-slate-500">{totalIncome > 0 ? `${((netProfit / totalIncome) * 100).toFixed(1)}% margin` : ""}</p>
            </div>
          </div>
        </div>

        {/* Bilty-wise P&L from TransactionDetails */}
        {filteredTxn.length > 0 && view === "detailed" && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-2.5">
              <p className="text-xs font-bold uppercase tracking-wider">Bilty-wise Transaction P&L ({filteredTxn.length} bilties)</p>
            </div>
            <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {filteredTxn.map((t, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">#{t.bilty_number}</p>
                    <p className="text-[10px] text-slate-400">{t.client_name} · {t.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600">{fmt(t.approved_client_rate || 0)}</p>
                    <p className={`text-xs font-bold ${(t.profit_loss || 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {(t.profit_loss || 0) >= 0 ? "+" : ""}{fmt(t.profit_loss || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-slate-50 flex justify-between border-t border-slate-100">
              <p className="text-xs font-bold text-slate-800">Total Bilty P&L</p>
              <p className={`text-xs font-bold ${biltyPL >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(biltyPL)}</p>
            </div>
          </div>
        )}

        <Button onClick={printPL} className="w-full rounded-xl bg-slate-900 h-11 gap-2">
          <Printer className="w-4 h-4" /> Print P&L Statement
        </Button>
      </div>
    </div>
  );
}