import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

export default function BalanceSheet() {
  const { canSeeAccounting } = useRole();
  const { fmt, fmtK, settings } = useAppSettings();
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 2000),
  });
  const { data: banks = [] } = useQuery({
    queryKey: ["bank_accounts"],
    queryFn: () => base44.entities.BankAccount.list(),
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Asset.filter({ status: "active" }),
  });

  // All entries up to asOfDate
  const filtered = entries.filter(e => e.date && e.date <= asOfDate);

  // Balance by account
  const acctBalance = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const key = `${e.account_type}::${e.account_name}`;
      if (!map[key]) map[key] = { account_type: e.account_type, account_name: e.account_name, net: 0 };
      map[key].net += (e.debit || 0) - (e.credit || 0);
    });
    return Object.values(map);
  }, [filtered]);

  // ASSETS
  const bankCashItems = banks.map(b => ({ label: b.account_title || b.bank_name, val: b.current_balance || 0 }));
  const totalBankCash = bankCashItems.reduce((s, i) => s + i.val, 0);

  const receivables = acctBalance.filter(a => a.account_type === "client" && a.net > 0);
  const totalReceivable = receivables.reduce((s, a) => s + a.net, 0);

  const fixedAssets = assets.map(a => ({ label: `${a.asset_name} (${a.asset_category})`, val: a.current_value || a.purchase_price || 0 }));
  const totalFixedAssets = fixedAssets.reduce((s, i) => s + i.val, 0);

  const otherAssets = acctBalance.filter(a => a.account_type === "other" && a.net > 0);
  const totalOtherAssets = otherAssets.reduce((s, a) => s + a.net, 0);

  const totalAssets = totalBankCash + totalReceivable + totalFixedAssets + totalOtherAssets;

  // LIABILITIES
  const payables = acctBalance.filter(a => ["vendor", "broker"].includes(a.account_type) && a.net < 0);
  const totalPayables = Math.abs(payables.reduce((s, a) => s + a.net, 0));

  const driverAdv = acctBalance.filter(a => a.account_type === "driver" && a.net > 0);
  const totalDriverAdv = driverAdv.reduce((s, a) => s + a.net, 0);

  const totalLiabilities = totalPayables + totalDriverAdv;

  // EQUITY (Assets - Liabilities)
  const equity = totalAssets - totalLiabilities;

  // Income & Expense (for retained earnings note)
  const totalIncome = acctBalance.filter(a => a.account_type === "income").reduce((s, a) => s + Math.abs(a.net), 0);
  const totalExpenses = acctBalance.filter(a => ["expense", "employee"].includes(a.account_type)).reduce((s, a) => s + a.net, 0);
  const retainedEarnings = totalIncome - totalExpenses;

  const printBS = () => {
    const cp = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
    const sym = settings.symbol;
    const f = (n) => `${sym}${(n || 0).toLocaleString()}`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Balance Sheet</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:18px;margin:0}h2{font-size:12px;margin:16px 0 6px;text-transform:uppercase;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}td{padding:5px 8px;font-size:12px;border-bottom:1px solid #f1f5f9}
    .bold{font-weight:bold}.right{text-align:right}.total{background:#f8fafc;font-weight:bold}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #1e293b}
    </style></head><body>
    <div class="header"><div><h1>${cp?.company_name || "Company"}</h1><p style="font-size:11px;color:#64748b">Balance Sheet as at ${asOfDate}</p></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div>
    <h2>Assets</h2>
    <table><tbody>
    <tr class="bold"><td>Cash & Bank</td><td class="right">${f(totalBankCash)}</td></tr>
    ${bankCashItems.map(i => `<tr><td style="padding-left:16px;color:#64748b">${i.label}</td><td class="right">${f(i.val)}</td></tr>`).join("")}
    <tr class="bold"><td>Trade Receivables</td><td class="right">${f(totalReceivable)}</td></tr>
    ${receivables.map(a => `<tr><td style="padding-left:16px;color:#64748b">${a.account_name}</td><td class="right">${f(a.net)}</td></tr>`).join("")}
    <tr class="bold"><td>Fixed Assets</td><td class="right">${f(totalFixedAssets)}</td></tr>
    ${fixedAssets.map(a => `<tr><td style="padding-left:16px;color:#64748b">${a.label}</td><td class="right">${f(a.val)}</td></tr>`).join("")}
    ${totalOtherAssets > 0 ? `<tr class="bold"><td>Other Assets</td><td class="right">${f(totalOtherAssets)}</td></tr>` : ""}
    </tbody></table>
    <div class="total" style="padding:8px;border-radius:6px;display:flex;justify-content:space-between"><span>TOTAL ASSETS</span><strong>${f(totalAssets)}</strong></div>
    </div>
    <div>
    <h2>Liabilities & Equity</h2>
    <table><tbody>
    <tr class="bold"><td>Trade Payables</td><td class="right">${f(totalPayables)}</td></tr>
    ${payables.map(a => `<tr><td style="padding-left:16px;color:#64748b">${a.account_name}</td><td class="right">${f(Math.abs(a.net))}</td></tr>`).join("")}
    ${totalDriverAdv > 0 ? `<tr class="bold"><td>Driver Advances</td><td class="right">${f(totalDriverAdv)}</td></tr>` : ""}
    <tr class="bold"><td colspan="2" style="padding-top:12px">Equity</td></tr>
    <tr><td style="padding-left:16px;color:#64748b">Retained Earnings</td><td class="right">${f(retainedEarnings)}</td></tr>
    <tr><td style="padding-left:16px;color:#64748b">Net Equity</td><td class="right">${f(equity)}</td></tr>
    </tbody></table>
    <div class="total" style="padding:8px;border-radius:6px;display:flex;justify-content:space-between"><span>TOTAL LIABILITIES + EQUITY</span><strong>${f(totalLiabilities + equity)}</strong></div>
    </div></div>
    <p style="font-size:10px;color:#94a3b8;margin-top:24px;text-align:center">Generated on ${format(new Date(), "dd MMM yyyy HH:mm")}</p>
    </body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
  };

  if (!canSeeAccounting) return <AccessDenied />;

  const Section = ({ title, items, total, color = "blue" }) => {
    const colors = { blue: "bg-blue-50 text-blue-800 border-blue-200", green: "bg-green-50 text-green-800 border-green-200", red: "bg-red-50 text-red-800 border-red-200", purple: "bg-purple-50 text-purple-800 border-purple-200" };
    return (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-700 text-white px-4 py-2.5"><p className="text-xs font-bold uppercase tracking-wider">{title}</p></div>
        {items.map((item, i) => (
          <div key={i} className={`flex justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 ${item.bold ? "bg-slate-50" : ""}`}>
            <p className={`text-xs ${item.bold ? "font-bold text-slate-900" : "text-slate-600"} ${item.indent ? "pl-4" : ""}`}>{item.label}</p>
            <p className={`text-xs font-semibold ${item.bold ? "text-slate-900" : "text-slate-700"}`}>{fmt(item.val)}</p>
          </div>
        ))}
        <div className={`flex justify-between px-4 py-3 font-bold text-sm border border-t-2 ${colors[color]}`}>
          <span>{title} Total</span>
          <span>{fmt(total)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24">
      <MobileHeader title="Balance Sheet" backTo="Accounting" />

      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">As of Date</p>
          <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="rounded-xl h-9" />
        </div>
        <Button onClick={printBS} className="mt-5 rounded-xl bg-slate-900 gap-1.5"><Printer className="w-4 h-4" /> Print</Button>
      </div>

      {/* Summary chips */}
      <div className="px-4 grid grid-cols-3 gap-2 mb-4">
        <div className="bg-blue-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-blue-500">Total Assets</p>
          <p className="text-sm font-bold text-blue-700">{fmtK(totalAssets)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-red-500">Liabilities</p>
          <p className="text-sm font-bold text-red-700">{fmtK(totalLiabilities)}</p>
        </div>
        <div className={`rounded-2xl p-3 text-center ${equity >= 0 ? "bg-green-50" : "bg-orange-50"}`}>
          <p className={`text-[10px] ${equity >= 0 ? "text-green-500" : "text-orange-500"}`}>Equity</p>
          <p className={`text-sm font-bold ${equity >= 0 ? "text-green-700" : "text-orange-700"}`}>{fmtK(equity)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="px-4 space-y-4">
          {/* ASSETS */}
          <Section title="Current Assets" color="blue" total={totalBankCash + totalReceivable}
            items={[
              { label: "Cash & Bank", val: totalBankCash, bold: true },
              ...bankCashItems.map(i => ({ label: i.label, val: i.val, indent: true })),
              { label: "Trade Receivables", val: totalReceivable, bold: true },
              ...receivables.map(a => ({ label: a.account_name, val: a.net, indent: true })),
            ]}
          />
          <Section title="Fixed Assets" color="purple" total={totalFixedAssets}
            items={fixedAssets.length ? fixedAssets : [{ label: "No fixed assets recorded", val: 0 }]}
          />

          {/* LIABILITIES */}
          <Section title="Liabilities" color="red" total={totalLiabilities}
            items={[
              { label: "Trade Payables", val: totalPayables, bold: true },
              ...payables.map(a => ({ label: a.account_name, val: Math.abs(a.net), indent: true })),
              ...(totalDriverAdv > 0 ? [{ label: "Driver Advances", val: totalDriverAdv, bold: true }] : []),
            ]}
          />

          {/* EQUITY */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-700 text-white px-4 py-2.5"><p className="text-xs font-bold uppercase tracking-wider">Equity</p></div>
            <div className="flex justify-between px-4 py-2.5 border-b border-slate-50">
              <p className="text-xs text-slate-600">Total Income (YTD)</p>
              <p className="text-xs font-semibold text-green-700">{fmt(totalIncome)}</p>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-b border-slate-50">
              <p className="text-xs text-slate-600">Total Expenses (YTD)</p>
              <p className="text-xs font-semibold text-red-700">{fmt(totalExpenses)}</p>
            </div>
            <div className="flex justify-between px-4 py-2.5 border-b border-slate-50">
              <p className="text-xs font-bold text-slate-900">Retained Earnings</p>
              <p className={`text-xs font-bold ${retainedEarnings >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(retainedEarnings)}</p>
            </div>
            <div className={`flex justify-between px-4 py-3 font-bold text-sm border-t-2 ${equity >= 0 ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
              <span>Net Equity</span>
              <span>{fmt(equity)}</span>
            </div>
          </div>

          {/* Accounting equation check */}
          <div className={`rounded-2xl px-4 py-3 text-center ${Math.abs(totalAssets - (totalLiabilities + equity)) < 1 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <p className="text-xs font-bold">Assets ({fmtK(totalAssets)}) = Liabilities ({fmtK(totalLiabilities)}) + Equity ({fmtK(equity)})</p>
            <p className={`text-[10px] mt-0.5 ${Math.abs(totalAssets - (totalLiabilities + equity)) < 1 ? "text-green-600" : "text-red-600"}`}>
              {Math.abs(totalAssets - (totalLiabilities + equity)) < 1 ? "✓ Accounting equation balanced" : "⚠ Imbalance detected"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}