import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, X, Check, BookOpen } from "lucide-react";
import { toast } from "sonner";

// Standard Chart of Accounts for a Transport Company
const DEFAULT_COA = [
  // ASSETS
  { code: "1000", name: "Cash in Hand",           type: "asset",     sub_type: "current_asset",    is_active: true },
  { code: "1010", name: "Petty Cash",              type: "asset",     sub_type: "current_asset",    is_active: true },
  { code: "1020", name: "Bank Account – HBL",      type: "asset",     sub_type: "current_asset",    is_active: true },
  { code: "1021", name: "Bank Account – MCB",      type: "asset",     sub_type: "current_asset",    is_active: true },
  { code: "1100", name: "Accounts Receivable",     type: "asset",     sub_type: "current_asset",    is_active: true },
  { code: "1110", name: "Advance to Drivers",      type: "asset",     sub_type: "current_asset",    is_active: true },
  { code: "1200", name: "Fuel Stock",              type: "asset",     sub_type: "current_asset",    is_active: true },
  { code: "1500", name: "Fleet Vehicles",          type: "asset",     sub_type: "fixed_asset",      is_active: true },
  { code: "1510", name: "Office Equipment",        type: "asset",     sub_type: "fixed_asset",      is_active: true },
  { code: "1520", name: "Accumulated Depreciation",type: "asset",     sub_type: "fixed_asset",      is_active: true },
  // LIABILITIES
  { code: "2000", name: "Accounts Payable",        type: "liability", sub_type: "current_liability",is_active: true },
  { code: "2010", name: "Labour Payable",          type: "liability", sub_type: "current_liability",is_active: true },
  { code: "2020", name: "Salary Payable",          type: "liability", sub_type: "current_liability",is_active: true },
  { code: "2030", name: "Tax Payable (FBR/GST)",   type: "liability", sub_type: "current_liability",is_active: true },
  { code: "2100", name: "Bank Loan",               type: "liability", sub_type: "long_term_liability",is_active: true },
  { code: "2110", name: "Vehicle Lease",           type: "liability", sub_type: "long_term_liability",is_active: true },
  // EQUITY
  { code: "3000", name: "Owner's Equity / Capital",type: "equity",    sub_type: "equity",           is_active: true },
  { code: "3010", name: "Retained Earnings",       type: "equity",    sub_type: "equity",           is_active: true },
  { code: "3020", name: "Drawings",                type: "equity",    sub_type: "equity",           is_active: true },
  // INCOME
  { code: "4000", name: "Freight Revenue",         type: "income",    sub_type: "operating_income", is_active: true },
  { code: "4010", name: "Loading/Unloading Income",type: "income",    sub_type: "operating_income", is_active: true },
  { code: "4020", name: "Miscellaneous Income",    type: "income",    sub_type: "other_income",     is_active: true },
  // EXPENSES
  { code: "5000", name: "Labour Expense",          type: "expense",   sub_type: "direct_expense",   is_active: true },
  { code: "5010", name: "Fuel Expense",            type: "expense",   sub_type: "direct_expense",   is_active: true },
  { code: "5020", name: "Driver Allowance",        type: "expense",   sub_type: "direct_expense",   is_active: true },
  { code: "5030", name: "Toll Charges",            type: "expense",   sub_type: "direct_expense",   is_active: true },
  { code: "5040", name: "Vehicle Maintenance",     type: "expense",   sub_type: "direct_expense",   is_active: true },
  { code: "5050", name: "Tyre Expense",            type: "expense",   sub_type: "direct_expense",   is_active: true },
  { code: "5100", name: "Salaries & Wages",        type: "expense",   sub_type: "operating_expense",is_active: true },
  { code: "5110", name: "Office Rent",             type: "expense",   sub_type: "operating_expense",is_active: true },
  { code: "5120", name: "Utilities",               type: "expense",   sub_type: "operating_expense",is_active: true },
  { code: "5130", name: "Insurance",               type: "expense",   sub_type: "operating_expense",is_active: true },
  { code: "5140", name: "Depreciation",            type: "expense",   sub_type: "operating_expense",is_active: true },
  { code: "5150", name: "Communication Expense",   type: "expense",   sub_type: "operating_expense",is_active: true },
  { code: "5200", name: "Bank Charges",            type: "expense",   sub_type: "financial_expense",is_active: true },
  { code: "5210", name: "Loan Interest",           type: "expense",   sub_type: "financial_expense",is_active: true },
];

const TYPE_COLORS = {
  asset:     "bg-blue-50 text-blue-700 border-blue-200",
  liability: "bg-red-50 text-red-700 border-red-200",
  equity:    "bg-purple-50 text-purple-700 border-purple-200",
  income:    "bg-green-50 text-green-700 border-green-200",
  expense:   "bg-amber-50 text-amber-700 border-amber-200",
};

const ACCOUNT_TYPES = ["asset","liability","equity","income","expense"];
const SUB_TYPES = {
  asset:     ["current_asset","fixed_asset","other_asset"],
  liability: ["current_liability","long_term_liability"],
  equity:    ["equity"],
  income:    ["operating_income","other_income"],
  expense:   ["direct_expense","operating_expense","financial_expense"],
};

const emptyForm = { code: "", name: "", type: "expense", sub_type: "operating_expense", is_active: true };

export default function ChartOfAccounts() {
  const { isAdmin, isManagement, isAccounting, canSeeAccounting } = useRole();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterType, setFilterType] = useState("all");
  const [seeded, setSeeded] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["chart_of_accounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("code", 500),
  });

  const canEdit = isAdmin || isManagement || isAccounting;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChartOfAccount.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chart_of_accounts"] }); toast.success("Account added"); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChartOfAccount.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chart_of_accounts"] }); toast.success("Account updated"); resetForm(); },
  });

  const resetForm = () => { setShowForm(false); setEditId(null); setForm({ ...emptyForm }); };

  const handleSeed = async () => {
    if (!window.confirm("This will add the standard Chart of Accounts for a transport company. Existing accounts will NOT be deleted. Continue?")) return;
    setSeeded(true);
    let count = 0;
    for (const acc of DEFAULT_COA) {
      const exists = accounts.find(a => a.code === acc.code);
      if (!exists) { await base44.entities.ChartOfAccount.create(acc); count++; }
    }
    qc.invalidateQueries({ queryKey: ["chart_of_accounts"] });
    toast.success(`${count} accounts added from standard COA`);
    setSeeded(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.code || !form.name) { toast.error("Code and Name are required"); return; }
    if (editId) { updateMutation.mutate({ id: editId, data: form }); }
    else {
      const dup = accounts.find(a => a.code === form.code);
      if (dup) { toast.error(`Code ${form.code} already exists`); return; }
      createMutation.mutate(form);
    }
  };

  const startEdit = (acc) => { setEditId(acc.id); setForm({ code: acc.code, name: acc.name, type: acc.type, sub_type: acc.sub_type, is_active: acc.is_active ?? true }); setShowForm(true); };

  if (!canSeeAccounting) return <AccessDenied />;

  const grouped = ACCOUNT_TYPES.reduce((acc, t) => {
    const filtered = accounts.filter(a => filterType === "all" ? a.type === t : a.type === t && a.type === filterType);
    if (filterType === "all" || filterType === t) acc[t] = filtered;
    return acc;
  }, {});

  return (
    <div className="pb-24">
      <MobileHeader
        title="Chart of Accounts"
        backTo="Accounting"
        onAdd={canEdit ? () => { resetForm(); setShowForm(true); } : undefined}
      />

      {/* Seed Banner */}
      {canEdit && accounts.length === 0 && !isLoading && (
        <div className="mx-4 mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-blue-800 mb-1">No accounts yet</p>
          <p className="text-xs text-blue-600 mb-3">Load the standard Chart of Accounts for a Transport Company to get started.</p>
          <Button onClick={handleSeed} disabled={seeded} className="bg-blue-600 hover:bg-blue-700 rounded-xl text-sm">
            {seeded ? "Adding..." : "📋 Load Standard COA"}
          </Button>
        </div>
      )}

      {/* Filter pills */}
      <div className="px-4 pt-4 flex gap-2 overflow-x-auto pb-2">
        {["all", ...ACCOUNT_TYPES].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all capitalize ${filterType === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)} {t !== "all" && `(${accounts.filter(a=>a.type===t).length})`}
          </button>
        ))}
      </div>

      {/* Summary strip */}
      <div className="px-4 py-2 flex gap-3 overflow-x-auto">
        {ACCOUNT_TYPES.map(t => (
          <div key={t} className={`shrink-0 rounded-xl px-3 py-2 border ${TYPE_COLORS[t]}`}>
            <p className="text-[10px] font-bold uppercase">{t}</p>
            <p className="text-sm font-black">{accounts.filter(a=>a.type===t).length}</p>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && canEdit && (
        <form onSubmit={handleSubmit} className="mx-4 mb-4 bg-white rounded-2xl border border-blue-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">{editId ? "Edit Account" : "New Account"}</p>
            <button type="button" onClick={resetForm} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Account Code *</label>
              <Input placeholder="e.g. 5010" value={form.code} onChange={e => setForm(p=>({...p, code: e.target.value}))} required />
            </div>
            <div>
              <label className="text-xs text-slate-500">Account Type *</label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.type}
                onChange={e => setForm(p=>({...p, type: e.target.value, sub_type: SUB_TYPES[e.target.value]?.[0] || ""}))}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500">Account Name *</label>
              <Input placeholder="e.g. Fuel Expense" value={form.name} onChange={e => setForm(p=>({...p, name: e.target.value}))} required />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500">Sub-Type</label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.sub_type}
                onChange={e => setForm(p=>({...p, sub_type: e.target.value}))}>
                {(SUB_TYPES[form.type] || []).map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p=>({...p, is_active: e.target.checked}))} />
              <label htmlFor="is_active" className="text-xs text-slate-600">Active Account</label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 rounded-xl" disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Update" : "Add Account"}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Accounts grouped by type */}
      {isLoading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-10">
          <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No accounts yet</p>
        </div>
      ) : (
        <div className="px-4 space-y-4 mt-2">
          {ACCOUNT_TYPES.filter(t => filterType === "all" || filterType === t).map(t => {
            const grpAccounts = accounts.filter(a => a.type === t);
            if (grpAccounts.length === 0) return null;
            return (
              <div key={t}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${TYPE_COLORS[t].split(" ")[1]}`}>
                  {t.toUpperCase()} ({grpAccounts.length})
                </p>
                <div className="space-y-1.5">
                  {grpAccounts.sort((a,b)=>a.code?.localeCompare(b.code)).map(acc => (
                    <div key={acc.id} className={`bg-white rounded-xl border px-3 py-2.5 flex items-center justify-between ${!acc.is_active ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold text-slate-400 w-12">{acc.code}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{acc.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{acc.sub_type?.replace(/_/g," ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[t]}`}>{t}</span>
                        {!acc.is_active && <span className="text-[9px] text-slate-400">Inactive</span>}
                        {canEdit && (
                          <button onClick={() => startEdit(acc)} className="p-1 text-slate-300 hover:text-blue-500 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Seed again button if accounts exist */}
      {canEdit && accounts.length > 0 && (
        <div className="mx-4 mt-6 mb-4">
          <button onClick={handleSeed} disabled={seeded}
            className="text-xs text-blue-600 border border-blue-200 rounded-xl px-4 py-2 hover:bg-blue-50 transition-colors">
            {seeded ? "Adding..." : "➕ Add Missing Standard Accounts"}
          </button>
        </div>
      )}
    </div>
  );
}