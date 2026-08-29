import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Input } from "@/components/ui/input";
import { Search, X, Printer, ChevronRight, Paperclip, ExternalLink, FileText, ImageIcon } from "lucide-react";

export default function ExpenseMasterLedger() {
  const { fmt } = useAppSettings();
  const { canSeeAccounting } = useRole();
  const [search, setSearch] = useState("");
  const [detailEntry, setDetailEntry] = useState(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["expense_master_entries"],
    queryFn: () => base44.entities.AccountingEntry.filter({ source_module: "expense_master" }),
  });

  const { data: taxEntries = [] } = useQuery({
    queryKey: ["expense_master_tax_entries"],
    queryFn: () => base44.entities.AccountingEntry.filter({ source_module: "expense_master_tax" }),
  });

  // Group: one row per bilty (EXP-{load_number})
  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const map = {};

    entries.forEach(e => {
      const key = e.reference_id || e.entry_number;
      if (!map[key]) {
        map[key] = {
          id: key,
          date: e.date,
          entry_number: e.entry_number,
          description: e.description,
          reference_id: e.reference_id,
          total_excl_tax: 0,
          tax: 0,
          breakdown: {},
          raw: e,
        };
      }
      map[key].total_excl_tax += e.credit || 0;
      // Parse breakdown from notes JSON if available
      try {
        if (e.notes) {
          const b = JSON.parse(e.notes);
          Object.assign(map[key].breakdown, b);
        }
      } catch {}
    });

    // Attach tax entries
    taxEntries.forEach(t => {
      const key = t.reference_id;
      if (map[key]) {
        map[key].tax += t.credit || 0;
      } else {
        // stand-alone tax entry
        map[`tax-${key}`] = {
          id: `tax-${key}`,
          date: t.date,
          entry_number: t.entry_number,
          description: t.description,
          reference_id: t.reference_id,
          total_excl_tax: 0,
          tax: t.credit || 0,
          breakdown: {},
          raw: t,
        };
      }
    });

    return Object.values(map)
      .filter(g => !q ||
        g.description?.toLowerCase().includes(q) ||
        g.entry_number?.toLowerCase().includes(q)
      )
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [entries, taxEntries, search]);

  if (!canSeeAccounting) return <AccessDenied />;

  const totalExclTax = grouped.reduce((s, g) => s + g.total_excl_tax, 0);
  const totalTax = grouped.reduce((s, g) => s + g.tax, 0);
  const totalInclTax = totalExclTax + totalTax;

  // Breakdown labels
  const LABELS = {
    loading_cost: "Loading", unloading_cost: "Unloading", detention_cost: "Detention",
    overweight_cost: "Overweight", extra_cost: "Extra", other_cost: "Other",
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    const rows = grouped.map(g => `<tr><td>${g.date}</td><td>${g.entry_number || ""}</td><td>${g.description?.split("|")[0] || ""}</td><td style="text-align:right">₨${g.total_excl_tax.toLocaleString()}</td><td style="text-align:right">₨${g.tax.toLocaleString()}</td><td style="text-align:right">₨${(g.total_excl_tax + g.tax).toLocaleString()}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Expense Master Ledger</title><style>body{font-family:Arial;padding:20px;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:#fff;padding:5px 6px;text-align:left}td{padding:4px 6px;border-bottom:1px solid #f1f5f9}</style></head><body><h2>Expense Master Ledger (${grouped.length} loads)</h2><p>Excl. Tax: ₨${totalExclTax.toLocaleString()} | Tax: ₨${totalTax.toLocaleString()} | Total: ₨${totalInclTax.toLocaleString()}</p><table><thead><tr><th>Date</th><th>Entry#</th><th>Bilty</th><th>Excl. Tax</th><th>Tax</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
  };

  return (
    <div className="pb-24">
      <MobileHeader
        title="Expense Master Ledger"
        backTo="Accounting"
        rightAction={
          <button onClick={handlePrint} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-xl">
            <Printer className="w-3.5 h-3.5" />
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="px-4 pt-3 pb-2 grid grid-cols-3 gap-2">
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-red-500">Excl. Tax</p>
          <p className="text-xs font-bold text-red-600">{fmt(totalExclTax)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-amber-500">Tax</p>
          <p className="text-xs font-bold text-amber-600">{fmt(totalTax)}</p>
          <p className="text-[9px] text-amber-400">adj. on receipt</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-500">Loads</p>
          <p className="text-xs font-bold text-slate-700">{grouped.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search by bilty, client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl bg-slate-50" />
        </div>
      </div>

      {/* Entries list — one row per load */}
      <div className="px-4 space-y-2">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-slate-100 animate-pulse" />)
        ) : grouped.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">No expense entries yet. Expenses are auto-posted from Bilty Costing.</p>
        ) : (
          grouped.map(g => (
            <div key={g.id} onClick={() => setDetailEntry(g)}
              className="bg-white rounded-xl border border-slate-100 px-3 py-3 cursor-pointer hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {g.entry_number} · {g.description?.split("|")[1]?.trim() || ""}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {g.date} · {g.description?.split("|")[2]?.trim() || ""}
                  </p>
                  {g.tax > 0 && (
                    <p className="text-[10px] text-amber-500 mt-0.5">Tax: {fmt(g.tax)} (adj. on receipt)</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-red-500">{fmt(g.total_excl_tax)}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-0.5 justify-end">
                    Details <ChevronRight className="w-3 h-3" />
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal — full breakdown */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setDetailEntry(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-900">Expense Detail</p>
              <button onClick={() => setDetailEntry(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{detailEntry.date}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Bilty #</span><span className="font-medium">{detailEntry.entry_number}</span></div>

              {/* Description parts */}
              {detailEntry.description && (
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-xs text-slate-500 font-medium mb-1">Load Info</p>
                  {detailEntry.description.split("|").map((part, i) => (
                    <p key={i} className="text-xs text-slate-700">{part.trim()}</p>
                  ))}
                </div>
              )}

              {/* Breakdown */}
              <div className="bg-red-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-red-700 mb-1">Expense Breakdown</p>
                {Object.entries(detailEntry.breakdown).filter(([, v]) => parseFloat(v) > 0).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-600">{LABELS[k] || k}</span>
                    <span className="font-medium text-red-600">{fmt(parseFloat(v))}</span>
                  </div>
                ))}
                {Object.entries(detailEntry.breakdown).filter(([, v]) => parseFloat(v) > 0).length === 0 && (
                  <p className="text-xs text-slate-400">See description above for breakdown</p>
                )}
                <div className="border-t border-red-100 pt-1.5 flex justify-between text-xs font-bold">
                  <span>Subtotal (excl. tax)</span>
                  <span className="text-red-600">{fmt(detailEntry.total_excl_tax)}</span>
                </div>
                {detailEntry.tax > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-600">Tax (adjusted on client receipt)</span>
                    <span className="font-medium text-amber-600">{fmt(detailEntry.tax)}</span>
                  </div>
                )}
                <div className="border-t border-red-200 pt-1.5 flex justify-between text-sm font-bold">
                  <span>Total (incl. tax)</span>
                  <span className="text-red-700">{fmt(detailEntry.total_excl_tax + detailEntry.tax)}</span>
                </div>
              </div>
            </div>
            {/* Receipt attachments */}
            {detailEntry.raw?.receipt_urls?.length > 0 && (
              <div className="mt-3 bg-blue-50 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Receipts ({detailEntry.raw.receipt_urls.length})
                </p>
                <div className="space-y-1.5">
                  {detailEntry.raw.receipt_urls.map((url, i) => {
                    const isPdf = url.toLowerCase().includes(".pdf");
                    const name = url.split("/").pop()?.split("?")[0] || `File ${i+1}`;
                    return (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-blue-100 hover:border-blue-300 transition-colors">
                        {isPdf ? <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                        <span className="text-[10px] text-slate-600 flex-1 truncate">{name}</span>
                        <ExternalLink className="w-3 h-3 text-blue-400" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => setDetailEntry(null)} className="mt-4 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}