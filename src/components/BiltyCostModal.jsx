import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Calculator, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useAppSettings } from "@/components/AppSettings";

export default function BiltyCostModal({ bilty, onClose }) {
  const { fmt } = useAppSettings();
  const qc = useQueryClient();

  // Fetch existing costing if any
  const { data: existingCosts = [] } = useQuery({
    queryKey: ["bilty_cost", bilty.id],
    queryFn: () => base44.entities.BiltyCost.filter({ bilty_id: bilty.id }),
    enabled: !!bilty.id,
  });

  const existing = existingCosts[0] || null;

  const [form, setForm] = useState({
    approved_client_rate: bilty.approved_rate || bilty.freight_amount || 0,
    broker_rate: bilty.broker_hired_amount || 0,
    loading_cost: 0,
    unloading_cost: 0,
    detention_cost: 0,
    overweight_cost: 0,
    extra_cost: 0,
    other_cost: 0,
    taxes: 0,
    notes: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        approved_client_rate: existing.approved_client_rate || bilty.approved_rate || bilty.freight_amount || 0,
        broker_rate: existing.broker_rate || 0,
        loading_cost: existing.loading_cost || 0,
        unloading_cost: existing.unloading_cost || 0,
        detention_cost: existing.detention_cost || 0,
        overweight_cost: existing.overweight_cost || 0,
        extra_cost: existing.extra_cost || 0,
        other_cost: existing.other_cost || 0,
        taxes: existing.taxes || 0,
        notes: existing.notes || "",
      });
    }
  }, [existing?.id]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: parseFloat(v) || v }));

  const totalCost =
    (parseFloat(form.broker_rate) || 0) +
    (parseFloat(form.loading_cost) || 0) +
    (parseFloat(form.unloading_cost) || 0) +
    (parseFloat(form.detention_cost) || 0) +
    (parseFloat(form.overweight_cost) || 0) +
    (parseFloat(form.extra_cost) || 0) +
    (parseFloat(form.other_cost) || 0) +
    (parseFloat(form.taxes) || 0);

  const profitLoss = (parseFloat(form.approved_client_rate) || 0) - totalCost;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const month = bilty.loading_date?.slice(0, 7) || new Date().toISOString().slice(0, 7);
      const data = {
        bilty_id: bilty.id,
        bilty_number: bilty.load_number,
        date: bilty.loading_date || new Date().toISOString().slice(0, 10),
        month,
        client_name: bilty.client_name || "",
        broker_name: bilty.broker_name || "",
        vehicle_number: bilty.vehicle_number || "",
        origin: bilty.origin || "",
        destination: bilty.destination || "",
        is_own_fleet: bilty.is_own_fleet || false,
        fleet_vehicle_id: bilty.fleet_vehicle_id || "",
        ...form,
        approved_client_rate: parseFloat(form.approved_client_rate) || 0,
        broker_rate: parseFloat(form.broker_rate) || 0,
        loading_cost: parseFloat(form.loading_cost) || 0,
        unloading_cost: parseFloat(form.unloading_cost) || 0,
        detention_cost: parseFloat(form.detention_cost) || 0,
        overweight_cost: parseFloat(form.overweight_cost) || 0,
        extra_cost: parseFloat(form.extra_cost) || 0,
        other_cost: parseFloat(form.other_cost) || 0,
        taxes: parseFloat(form.taxes) || 0,
        total_cost: totalCost,
        profit_loss: profitLoss,
      };

      // Save / update BiltyCost
      let costRecord;
      if (existing) {
        costRecord = await base44.entities.BiltyCost.update(existing.id, data);
      } else {
        costRecord = await base44.entities.BiltyCost.create(data);
      }

      // Post Accounts Receivable to client ledger if client selected
      if (bilty.client_name && data.approved_client_rate > 0 && !existing?.ledger_posted) {
        await base44.entities.AccountingEntry.create({
          date: data.date,
          entry_type: "receipt",
          account_type: "client",
          account_name: bilty.client_name,
          debit: data.approved_client_rate,
          credit: 0,
          description: `AR - Bilty #${bilty.load_number} | ${bilty.origin} → ${bilty.destination}`,
          entry_number: `AR-${bilty.load_number}`,
          reference_id: bilty.id,
          reference_type: "bilty",
          posted: true,
          source_module: "bilty_costing",
        });
      }

      // Post Accounts Payable — Broker OR Own Fleet
      if (data.broker_rate > 0 && !existing?.ledger_posted) {
        if (bilty.is_own_fleet) {
          // Own fleet: post to own_fleet ledger keyed by vehicle number
          await base44.entities.AccountingEntry.create({
            date: data.date,
            entry_type: "payment",
            account_type: "expense",
            account_name: bilty.vehicle_number || "Own Fleet",
            debit: 0,
            credit: data.broker_rate,
            description: `Own Fleet Trip - Bilty #${bilty.load_number} | ${bilty.origin} → ${bilty.destination} | Client: ${bilty.client_name}`,
            entry_number: `OF-${bilty.load_number}`,
            reference_id: bilty.id,
            reference_type: "bilty",
            posted: true,
            source_module: "own_fleet",
          });
        } else if (bilty.broker_name) {
          // Broker: post to broker ledger
          await base44.entities.AccountingEntry.create({
            date: data.date,
            entry_type: "payment",
            account_type: "broker",
            account_name: bilty.broker_name,
            debit: 0,
            credit: data.broker_rate,
            description: `AP - Bilty #${bilty.load_number} | ${bilty.vehicle_number} | ${bilty.origin} → ${bilty.destination}`,
            entry_number: `AP-${bilty.load_number}`,
            reference_id: bilty.id,
            reference_type: "bilty",
            posted: true,
            source_module: "bilty_costing",
          });

          // Update broker ledger array
          try {
            const brokers = await base44.entities.Broker.filter({ name: bilty.broker_name });
            if (brokers.length > 0) {
              const broker = brokers[0];
              const ledger = broker.ledger || [];
              const runBal = (ledger[ledger.length - 1]?.balance || 0) - data.broker_rate;
              await base44.entities.Broker.update(broker.id, {
                ledger: [...ledger, {
                  date: data.date,
                  type: "payable",
                  description: `Bilty #${bilty.load_number}`,
                  bilty_id: bilty.id,
                  debit: 0,
                  credit: data.broker_rate,
                  balance: runBal,
                }],
              });
            }
          } catch (e) { /* non-critical */ }
        }
      }

      // Post Expense Master — ONE combined entry per load (excl. taxes) + separate tax entry
      if (!existing?.ledger_posted) {
        const expenseKeys = ["loading_cost", "unloading_cost", "detention_cost", "overweight_cost", "extra_cost", "other_cost"];
        const expenseLabels = { loading_cost: "Loading", unloading_cost: "Unloading", detention_cost: "Detention", overweight_cost: "Overweight", extra_cost: "Extra", other_cost: "Other" };
        const combinedExpense = expenseKeys.reduce((s, k) => s + (parseFloat(data[k]) || 0), 0);
        const breakdownParts = expenseKeys.filter(k => parseFloat(data[k]) > 0).map(k => `${expenseLabels[k]}: ₨${(parseFloat(data[k])||0).toLocaleString()}`);

        if (combinedExpense > 0) {
          await base44.entities.AccountingEntry.create({
            date: data.date,
            entry_type: "payment",
            account_type: "expense",
            account_name: "Expense Master",
            debit: 0,
            credit: combinedExpense,
            description: `Expenses - Bilty #${bilty.load_number} | ${bilty.client_name} | ${bilty.origin}→${bilty.destination} | ${breakdownParts.join(", ")}`,
            entry_number: `EXP-${bilty.load_number}`,
            reference_id: bilty.id,
            reference_type: "bilty_expense",
            notes: JSON.stringify({ loading_cost: data.loading_cost, unloading_cost: data.unloading_cost, detention_cost: data.detention_cost, overweight_cost: data.overweight_cost, extra_cost: data.extra_cost, other_cost: data.other_cost }),
            posted: true,
            source_module: "expense_master",
          });
        }

        // Taxes posted separately — adjusted when payment received from client
        if (parseFloat(data.taxes) > 0) {
          await base44.entities.AccountingEntry.create({
            date: data.date,
            entry_type: "payment",
            account_type: "expense",
            account_name: "Tax Payable",
            debit: 0,
            credit: parseFloat(data.taxes),
            description: `Tax - Bilty #${bilty.load_number} | ${bilty.client_name} | ${bilty.origin}→${bilty.destination}`,
            entry_number: `TAX-${bilty.load_number}`,
            reference_id: bilty.id,
            reference_type: "bilty_tax",
            posted: true,
            source_module: "expense_master_tax",
          });
        }
      }

      // Save TransactionDetail
      const txnData = { ...data, ledger_posted: undefined, fleet_trip_created: undefined, fleet_trip_id: undefined };
      if (existing) {
        const txns = await base44.entities.TransactionDetail.filter({ bilty_id: bilty.id });
        if (txns.length > 0) {
          await base44.entities.TransactionDetail.update(txns[0].id, txnData);
        } else {
          await base44.entities.TransactionDetail.create(txnData);
        }
      } else {
        await base44.entities.TransactionDetail.create(txnData);
      }

      // If own fleet — create fleet trip
      if (bilty.is_own_fleet && bilty.fleet_vehicle_id && data.broker_rate > 0 && !existing?.fleet_trip_created) {
        const trip = await base44.entities.FleetTrip.create({
          fleet_vehicle_id: bilty.fleet_vehicle_id,
          vehicle_number: bilty.vehicle_number,
          trip_date: data.date,
          month,
          origin: bilty.origin,
          destination: bilty.destination,
          client_name: bilty.client_name,
          cargo_type: bilty.cargo_type,
          load_id: bilty.id,
          load_number: bilty.load_number,
          freight_income_pkr: data.approved_client_rate,
          status: "pending",
        });
        await base44.entities.BiltyCost.update(costRecord.id, {
          fleet_trip_created: true,
          fleet_trip_id: trip.id,
          ledger_posted: true,
        });
      } else if (!existing) {
        await base44.entities.BiltyCost.update(costRecord.id, { ledger_posted: true });
      }

      return costRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bilty_cost", bilty.id] });
      qc.invalidateQueries({ queryKey: ["accounting_entries"] });
      qc.invalidateQueries({ queryKey: ["fleet_trips"] });
      qc.invalidateQueries({ queryKey: ["transaction_details"] });
      qc.invalidateQueries({ queryKey: ["own_fleet_ledger_entries"] });
      qc.invalidateQueries({ queryKey: ["expense_master_entries"] });
      toast.success("Costing saved & ledger entries posted");
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to save costing"),
  });

  const fields = [
    { key: "broker_rate", label: bilty.is_own_fleet ? "Own Fleet Rate (Trip Cost)" : "Broker Rate" },
    { key: "loading_cost", label: "Loading Cost" },
    { key: "unloading_cost", label: "Unloading Cost" },
    { key: "detention_cost", label: "Detention Cost" },
    { key: "overweight_cost", label: "Overweight Cost" },
    { key: "extra_cost", label: "Extra Costs" },
    { key: "other_cost", label: "Other Costs" },
    { key: "taxes", label: "Taxes" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-orange-500" /> Bilty Costing
            </h2>
            <p className="text-xs text-slate-500">#{bilty.load_number} · {bilty.client_name} · {bilty.origin} → {bilty.destination}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {existing?.ledger_posted && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium">
              ⚠️ Ledger entries already posted. Editing will update costing but won't re-post to ledger.
            </div>
          )}

          {/* Approved Client Rate */}
          <div className="bg-blue-50 rounded-xl p-3 space-y-1.5">
            <Label className="text-blue-700 font-bold">Approved Client Rate (Accounts Receivable)</Label>
            <Input
              type="number"
              value={form.approved_client_rate}
              onChange={e => set("approved_client_rate", e.target.value)}
              className="rounded-xl bg-white font-bold text-blue-900"
              placeholder="0"
            />
            <p className="text-[10px] text-blue-500">→ Will be posted to {bilty.client_name || "client"} ledger as AR</p>
          </div>

          {/* Cost Fields */}
          <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
            <p className="text-xs font-bold text-slate-700 mb-2">Cost Breakdown</p>
            <div className="grid grid-cols-2 gap-2">
              {fields.map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs text-slate-500">{f.label}</Label>
                  <Input
                    type="number"
                    value={form[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    className="rounded-xl text-sm"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            {bilty.broker_name && (
              <p className="text-[10px] text-slate-400 mt-1">
                → Broker Rate will be posted to <strong>{bilty.broker_name}</strong> ledger as AP
              </p>
            )}
            {bilty.is_own_fleet && (
              <p className="text-[10px] text-green-600 mt-1">
                → Own Fleet: Rate posted to Own Fleet Ledger for {bilty.vehicle_number}. A trip will also be created in Fleet Trips.
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Cost</span>
              <span className="font-bold text-slate-800">{fmt(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Client Rate</span>
              <span className="font-bold text-blue-700">{fmt(parseFloat(form.approved_client_rate) || 0)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="font-bold text-slate-700">Profit / Loss</span>
              <span className={`font-bold text-base flex items-center gap-1 ${profitLoss >= 0 ? "text-green-600" : "text-red-500"}`}>
                {profitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {fmt(Math.abs(profitLoss))}
                <span className="text-xs font-normal">{profitLoss >= 0 ? "Profit" : "Loss"}</span>
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="rounded-xl" placeholder="Optional notes..." />
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
            {saveMutation.isPending ? "Saving..." : (existing ? "Update Costing" : "Save & Post to Ledger")}
          </Button>
        </div>
      </div>
    </div>
  );
}