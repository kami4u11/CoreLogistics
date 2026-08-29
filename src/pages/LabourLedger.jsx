import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import { useAppSettings } from "@/components/AppSettings";
import AccessDenied from "@/components/AccessDenied";
import { format } from "date-fns";
import {
  Printer, HardHat, Truck, Plus, X, CheckCircle2,
  Wallet, ArrowDownLeft, ArrowUpRight, PlusCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function LabourLedger() {

  const { isAdmin, isManagement, isAccounting, isLabourSupervisor, user } = useRole();
  const { fmt } = useAppSettings();
  const queryClient = useQueryClient();

  const [showPayment, setShowPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    account_id: "",
    notes: "",
  });

  // ✅ FETCH LABOUR ENTRIES
  const { data: entries = [] } = useQuery({
    queryKey: ["labour_entries"],
    queryFn: async () => {
      return await base44.entities.LaborEntry.list("-date", 1000);
    },
  });

  // ✅ FETCH ACCOUNTS (BANK + CASH)
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      return await base44.entities.Account.list();
    },
  });

  if (!user?.id) return <div className="p-10">Login again</div>;

  const canEdit = isAdmin || isManagement || isAccounting;

  // ─────────────────────────────
  // CALCULATIONS
  // ─────────────────────────────
  const charges = entries.filter(e => !e.notes?.includes("__PAYMENT__"));
  const payments = entries.filter(e => e.notes?.includes("__PAYMENT__"));

  const totalCharges = charges.reduce((s, e) => s + (e.labor_charges || 0), 0);
  const totalPaid = payments.reduce((s, e) => s + (e.labor_charges || 0), 0);
  const balance = totalCharges - totalPaid;

  // ─────────────────────────────
  // SAVE PAYMENT (FIXED CORE)
  // ─────────────────────────────
  const handleSavePayment = async () => {

    const amt = Number(paymentForm.amount);

    if (!amt || amt <= 0) return toast.error("Enter valid amount");
    if (!paymentForm.account_id) return toast.error("Select account");

    setSavingPayment(true);

    try {

      // 1. Save Labour Entry
      const labour = await base44.entities.LaborEntry.create({
        date: paymentForm.date,
        labor_charges: amt,
        vehicle_type: "LABOUR PAYMENT",
        loading_point: "PAYMENT",
        unloading_point: "PAYMENT",
        notes: "__PAYMENT__",
        worker_count: 0,
      });

      // 2. Find Accounts
      const labourPayable = accounts.find(a => a.name === "Labour Payable");
      const bankOrCash = accounts.find(a => a.id === paymentForm.account_id);

      if (!labourPayable || !bankOrCash) {
        throw new Error("Accounts missing. Create Labour Payable + Bank/Cash");
      }

      // 3. Journal Entry (DOUBLE ENTRY)

      // DR Labour Payable
      await base44.entities.JournalEntry.create({
        date: paymentForm.date,
        account_id: labourPayable.id,
        debit: amt,
        credit: 0,
        description: "Labour Payment",
        reference_id: labour.id,
      });

      // CR Bank / Cash
      await base44.entities.JournalEntry.create({
        date: paymentForm.date,
        account_id: bankOrCash.id,
        debit: 0,
        credit: amt,
        description: "Labour Payment",
        reference_id: labour.id,
      });

      toast.success("Payment Recorded + Ledger Updated");

      queryClient.invalidateQueries(["labour_entries"]);

      setShowPayment(false);
      setPaymentForm({
        date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        account_id: "",
        notes: "",
      });

    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }

    setSavingPayment(false);
  };

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-20">

      <MobileHeader
        title="Labour Ledger"
        backTo="Accounting"
        rightAction={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to={createPageUrl("LabourEntry")}
                className="flex items-center gap-1 bg-amber-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold">
                <PlusCircle size={13} /> Entry
              </Link>
            )}
            <button
              onClick={() => window.print()}
              className="bg-slate-800 text-white px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1"
            >
              <Printer size={13} />
            </button>
          </div>
        }
      />

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-2 p-4">

        <div className="bg-white p-3 rounded-xl">
          <p className="text-xs text-gray-400">Charges</p>
          <p className="text-red-600 font-bold">{fmt(totalCharges)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl">
          <p className="text-xs text-gray-400">Paid</p>
          <p className="text-green-600 font-bold">{fmt(totalPaid)}</p>
        </div>

        <div className="bg-white p-3 rounded-xl">
          <p className="text-xs text-gray-400">Balance</p>
          <p className="font-bold">{fmt(balance)}</p>
        </div>

      </div>

      {/* ADD PAYMENT */}
      {canEdit && (
        <div className="px-4 mb-4">
          <button
            onClick={() => setShowPayment(true)}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold"
          >
            + Record Payment
          </button>
        </div>
      )}

      {/* LIST */}
      <div className="px-4 space-y-2">
        {entries.map(e => (
          <div key={e.id} className="bg-white p-3 rounded-xl flex justify-between">

            <div>
              <p className="text-sm font-semibold">
                {e.notes?.includes("__PAYMENT__") ? "Payment" : "Labour Work"}
              </p>
              <p className="text-xs text-gray-400">{e.date}</p>
            </div>

            <div>
              <p className={`font-bold ${e.notes?.includes("__PAYMENT__") ? "text-green-600" : "text-red-600"}`}>
                {fmt(e.labor_charges)}
              </p>
            </div>

          </div>
        ))}
      </div>

      {/* PAYMENT MODAL */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-end">
          <div className="bg-white w-full p-6 rounded-t-3xl">

            <h2 className="font-bold mb-4">Record Payment</h2>

            <input
              type="date"
              value={paymentForm.date}
              onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))}
              className="w-full mb-3 border p-2 rounded"
            />

            <input
              type="number"
              placeholder="Amount"
              value={paymentForm.amount}
              onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
              className="w-full mb-3 border p-2 rounded"
            />

            {/* ACCOUNT SELECT */}
            <select
              value={paymentForm.account_id}
              onChange={e => setPaymentForm(p => ({ ...p, account_id: e.target.value }))}
              className="w-full mb-3 border p-2 rounded"
            >
              <option value="">Select Bank / Cash</option>
              {accounts
                .filter(a => a.type === "BANK" || a.type === "CASH")
                .map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPayment(false)}
                className="w-1/2 border py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSavePayment}
                disabled={savingPayment}
                className="w-1/2 bg-green-600 text-white py-2 rounded"
              >
                {savingPayment ? "Saving..." : "Save"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}