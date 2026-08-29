import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Input } from "@/components/ui/input";
import { Handshake } from "lucide-react";

export default function BrokerAccounts() {
  const { fmt } = useAppSettings();
  const [search, setSearch] = useState("");

  const { data: brokers = [] } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => base44.entities.Broker.list(),
  });

  const { data: loads = [] } = useQuery({
    queryKey: ["loads"],
    queryFn: () => base44.entities.Load.list("-created_date", 500),
  });

  const brokerSummary = brokers
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))
    .map(b => {
      const bLoads = loads.filter(l => l.broker_name === b.name);
      const totalHired = bLoads.reduce((s, l) => s + (l.broker_hired_amount || 0), 0);
      const totalAdvance = bLoads.reduce((s, l) => s + (l.advance_amount || 0), 0);
      const balance = totalHired - totalAdvance;
      return { ...b, totalHired, totalAdvance, balance, loadCount: bLoads.length };
    });

  const totalPayable = brokerSummary.reduce((s, b) => s + Math.max(0, b.balance), 0);

  return (
    <div className="pb-24">
      <MobileHeader title="Broker Accounts" backTo="Accounting" />
      <div className="px-4 py-4">
        <div className="bg-teal-50 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-teal-600">Total Broker Payable</p>
            <p className="text-xl font-bold text-teal-700">{fmt(totalPayable)}</p>
          </div>
          <Handshake className="w-8 h-8 text-teal-300" />
        </div>
        <Input placeholder="Search broker..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />
        <div className="space-y-2">
          {brokerSummary.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{b.name}</p>
                  <p className="text-xs text-slate-400">{b.company} · {b.loadCount} loads</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${b.balance > 0 ? "text-orange-500" : "text-green-600"}`}>
                    {b.balance > 0 ? `Payable ${fmt(b.balance)}` : b.balance < 0 ? `Overpaid ${fmt(Math.abs(b.balance))}` : "Settled"}
                  </p>
                  <p className="text-[10px] text-slate-400">Hired: {fmt(b.totalHired)} | Adv: {fmt(b.totalAdvance)}</p>
                </div>
              </div>
            </div>
          ))}
          {brokerSummary.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No brokers found</p>}
        </div>
      </div>
    </div>
  );
}