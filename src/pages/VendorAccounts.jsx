import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Input } from "@/components/ui/input";
import { Wallet } from "lucide-react";

export default function VendorAccounts() {
  const { fmt } = useAppSettings();
  const [search, setSearch] = useState("");

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list(),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 500),
  });

  const vendorEntries = entries.filter(e => e.account_type === "vendor");

  const vendorSummary = vendors
    .filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()))
    .map(v => {
      const ves = vendorEntries.filter(e => e.account_name === v.name);
      const totalCredit = ves.reduce((s, e) => s + (e.credit || 0), 0);
      const totalDebit = ves.reduce((s, e) => s + (e.debit || 0), 0);
      const balance = totalCredit - totalDebit;
      return { ...v, totalCredit, totalDebit, balance };
    });

  const totalPayable = vendorSummary.reduce((s, v) => s + Math.max(0, v.balance), 0);

  return (
    <div className="pb-24">
      <MobileHeader title="Vendor Accounts" backTo="Accounting" />
      <div className="px-4 py-4">
        <div className="bg-orange-50 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-orange-600">Total Payable</p>
            <p className="text-xl font-bold text-orange-700">{fmt(totalPayable)}</p>
          </div>
          <Wallet className="w-8 h-8 text-orange-300" />
        </div>
        <Input placeholder="Search vendor..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />
        <div className="space-y-2">
          {vendorSummary.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{v.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{v.vendor_type} · {v.city}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${v.balance > 0 ? "text-orange-500" : "text-green-600"}`}>
                    {v.balance > 0 ? `Payable ${fmt(v.balance)}` : v.balance < 0 ? `Advance ${fmt(Math.abs(v.balance))}` : "Settled"}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {vendorSummary.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No vendors found</p>}
        </div>
      </div>
    </div>
  );
}