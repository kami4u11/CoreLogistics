import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Input } from "@/components/ui/input";
import { Truck } from "lucide-react";

export default function DriverAccounts() {
  const { fmt } = useAppSettings();
  const [search, setSearch] = useState("");

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 500),
  });

  const driverEntries = entries.filter(e => e.account_type === "driver");

  // Get unique drivers from vehicles
  const drivers = vehicles
    .filter(v => v.driver_name)
    .reduce((acc, v) => {
      if (!acc.find(d => d.name === v.driver_name)) {
        acc.push({ name: v.driver_name, phone: v.driver_phone, vehicle: v.vehicle_number });
      }
      return acc;
    }, []);

  const driverSummary = drivers
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()))
    .map(d => {
      const des = driverEntries.filter(e => e.account_name === d.name);
      const totalDebit = des.reduce((s, e) => s + (e.debit || 0), 0);
      const totalCredit = des.reduce((s, e) => s + (e.credit || 0), 0);
      const balance = totalDebit - totalCredit;
      return { ...d, totalDebit, totalCredit, balance };
    });

  return (
    <div className="pb-24">
      <MobileHeader title="Driver Accounts" backTo="Accounting" />
      <div className="px-4 py-4">
        <div className="bg-cyan-50 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-cyan-600">Active Drivers</p>
            <p className="text-xl font-bold text-cyan-700">{drivers.length}</p>
          </div>
          <Truck className="w-8 h-8 text-cyan-300" />
        </div>
        <Input placeholder="Search driver..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />
        <div className="space-y-2">
          {driverSummary.map((d, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.phone} · Vehicle: {d.vehicle}</p>
                </div>
                <div className="text-right">
                  {d.balance !== 0 ? (
                    <p className={`text-sm font-bold ${d.balance > 0 ? "text-amber-500" : "text-green-600"}`}>
                      {d.balance > 0 ? `Advance ${fmt(d.balance)}` : `Cr ${fmt(Math.abs(d.balance))}`}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">No entries</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {driverSummary.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No drivers found</p>}
        </div>
      </div>
    </div>
  );
}