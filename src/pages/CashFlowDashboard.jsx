import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, Building2, ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function fmt(n, sym = "₨") { return `${sym}${(n || 0).toLocaleString()}`; }

export default function CashFlowDashboard() {
  const { fmt: appFmt, settings } = useAppSettings();
  const { canSeeAccounting } = useRole();
  const [period, setPeriod] = useState("month"); // month | quarter | year

  const { data: entries = [] } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 1000),
  });
  const { data: banks = [] } = useQuery({
    queryKey: ["bank_accounts"],
    queryFn: () => base44.entities.BankAccount.list(),
  });
  const { data: cashbooks = [] } = useQuery({
    queryKey: ["cashbooks"],
    queryFn: () => base44.entities.Cashbook.list(),
  });
  const { data: loads = [] } = useQuery({
    queryKey: ["loads_cashflow"],
    queryFn: () => base44.entities.Load.list("-loading_date", 500),
  });

  if (!canSeeAccounting) return <AccessDenied />;

  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");

  // Daily cash position (last 30 days)
  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const dayEntries = entries.filter(e => e.date === d);
      const inflow = dayEntries.reduce((s, e) => s + (e.credit || 0), 0);
      const outflow = dayEntries.reduce((s, e) => s + (e.debit || 0), 0);
      const loadIncome = loads.filter(l => l.loading_date === d).reduce((s, l) => s + (l.freight_amount || 0), 0);
      days.push({
        date: format(new Date(d), "dd MMM"),
        inflow: inflow + loadIncome,
        outflow,
        net: (inflow + loadIncome) - outflow,
      });
    }
    return days;
  }, [entries, loads]);

  // Monthly inflow vs outflow (last 12 months)
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const m = format(subMonths(new Date(), i), "yyyy-MM");
      const mEntries = entries.filter(e => e.date?.startsWith(m));
      const mLoads = loads.filter(l => (l.loading_date || "").startsWith(m));
      const inflow = mEntries.reduce((s, e) => s + (e.credit || 0), 0)
        + mLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
      const outflow = mEntries.reduce((s, e) => s + (e.debit || 0), 0)
        + mLoads.reduce((s, l) => s + (l.broker_hired_amount || 0) + (l.labor_charges || 0), 0);
      months.push({
        month: format(new Date(m + "-01"), "MMM yy"),
        inflow,
        outflow,
        net: inflow - outflow,
      });
    }
    return months;
  }, [entries, loads]);

  // Payment source breakdown
  const sourceBreakdown = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (e.debit > 0 && e.payment_source) {
        map[e.payment_source] = (map[e.payment_source] || 0) + e.debit;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [entries]);

  const totalBankBalance = banks.reduce((s, b) => s + (b.current_balance || 0), 0);
  const totalCash = cashbooks.reduce((s, c) => s + (c.current_balance || 0), 0);
  const monthInflow = monthlyData[monthlyData.length - 1]?.inflow || 0;
  const monthOutflow = monthlyData[monthlyData.length - 1]?.outflow || 0;
  const monthNet = monthInflow - monthOutflow;

  const todayEntries = entries.filter(e => e.date === today);
  const todayInflow = todayEntries.reduce((s, e) => s + (e.credit || 0), 0);
  const todayOutflow = todayEntries.reduce((s, e) => s + (e.debit || 0), 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">
            {p.name}: {appFmt(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-24">
      <MobileHeader title="Cash Flow" backTo="Accounting" />

      {/* Top KPIs */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3 mb-4">
        <Link to={createPageUrl("BankAccounts")} className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white no-underline hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-blue-200" />
            <p className="text-xs text-blue-200">Bank Balance</p>
          </div>
          <p className="text-xl font-black">{appFmt(totalBankBalance)}</p>
          <p className="text-[10px] text-blue-200 mt-1">{banks.length} accounts</p>
        </Link>
        <Link to={createPageUrl("CashbookManager")} className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-4 text-white no-underline hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-emerald-200" />
            <p className="text-xs text-emerald-200">Cash in Hand</p>
          </div>
          <p className="text-xl font-black">{appFmt(totalCash)}</p>
          <p className="text-[10px] text-emerald-200 mt-1">{cashbooks.length} cashbooks</p>
        </Link>
        <Link to={createPageUrl("GeneralLedger")} className="bg-white rounded-2xl border border-slate-100 p-4 no-underline hover:border-slate-200 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <p className="text-xs text-slate-500">Today's Inflow</p>
          </div>
          <p className="text-lg font-black text-green-700">{appFmt(todayInflow)}</p>
        </Link>
        <Link to={createPageUrl("GeneralLedger")} className="bg-white rounded-2xl border border-slate-100 p-4 no-underline hover:border-slate-200 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-red-500" />
            <p className="text-xs text-slate-500">Today's Outflow</p>
          </div>
          <p className="text-lg font-black text-red-700">{appFmt(todayOutflow)}</p>
        </Link>
      </div>

      {/* Monthly summary */}
      <div className="px-4 mb-4">
        <div className={`rounded-2xl p-4 border ${monthNet >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
          <p className="text-xs text-slate-500 mb-1">This Month Net Flow</p>
          <div className="flex items-center gap-3">
            <p className={`text-2xl font-black ${monthNet >= 0 ? "text-green-700" : "text-red-700"}`}>{appFmt(Math.abs(monthNet))}</p>
            {monthNet >= 0 ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${monthNet >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {monthNet >= 0 ? "SURPLUS" : "DEFICIT"}
            </span>
          </div>
          <div className="flex gap-4 mt-2">
            <p className="text-xs text-green-700">In: {appFmt(monthInflow)}</p>
            <p className="text-xs text-red-700">Out: {appFmt(monthOutflow)}</p>
          </div>
        </div>
      </div>

      {/* 30-Day Daily Cash Flow */}
      <div className="px-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-700 mb-3">Daily Cash Flow — Last 30 Days</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 8 }} interval={6} />
              <YAxis tick={{ fontSize: 8 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="inflow" stroke="#10b981" fill="url(#in)" name="Inflow" strokeWidth={2} />
              <Area type="monotone" dataKey="outflow" stroke="#ef4444" fill="url(#out)" name="Outflow" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Inflow vs Outflow */}
      <div className="px-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-700 mb-3">Monthly Inflow vs Outflow</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 8 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="inflow" fill="#10b981" name="Inflow" radius={[3, 3, 0, 0]} />
              <Bar dataKey="outflow" fill="#ef4444" name="Outflow" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bank accounts breakdown */}
      <div className="px-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-700 mb-3">Bank Accounts</p>
          {banks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">No bank accounts set up</p>
          ) : (
            <div className="space-y-2">
              {banks.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{b.account_title}</p>
                    <p className="text-[10px] text-slate-400">{b.bank_name}</p>
                  </div>
                  <p className={`text-sm font-bold ${(b.current_balance || 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {appFmt(b.current_balance || 0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cashbooks */}
      <div className="px-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-700 mb-3">Cashbooks</p>
          {cashbooks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">No cashbooks set up yet</p>
          ) : (
            <div className="space-y-2">
              {cashbooks.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{c.name}</p>
                    <p className="text-[10px] text-slate-400">{c.custodian ? `Custodian: ${c.custodian}` : c.cashbook_type?.replace(/_/g, " ")}</p>
                  </div>
                  <p className={`text-sm font-bold ${(c.current_balance || 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {appFmt(c.current_balance || 0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment source breakdown */}
      {sourceBreakdown.length > 0 && (
        <div className="px-4 mb-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-700 mb-3">Outflow by Source</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={sourceBreakdown.slice(0, 6)} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {sourceBreakdown.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => appFmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}