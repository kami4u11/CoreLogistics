import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight, Users, Calendar, DollarSign, BookOpen, TrendingUp, Gift } from "lucide-react";

const subModules = [
  { label: "Employees", desc: "Manage staff & drivers", icon: Users, page: "Employees", color: "bg-blue-50 text-blue-600" },
  { label: "Attendance", desc: "Daily attendance log", icon: Calendar, page: "AttendancePage", color: "bg-green-50 text-green-600" },
  { label: "Payroll", desc: "Monthly salary processing", icon: DollarSign, page: "PayrollPage", color: "bg-purple-50 text-purple-600" },
  { label: "Employee Ledger", desc: "Salary, advance & bonus ledger", icon: BookOpen, page: "EmployeeLedger", color: "bg-indigo-50 text-indigo-600" },
  { label: "Advance Salary", desc: "Issue & track salary advances", icon: TrendingUp, page: "EmployeeAdvance", color: "bg-orange-50 text-orange-600" },
  { label: "Bonus", desc: "Record & pay employee bonuses", icon: Gift, page: "EmployeeBonus", color: "bg-pink-50 text-pink-600" },
];

export default function HRPayroll() {
  const { canManageHR, isSleepingPartner } = useRole();
  const { fmt } = useAppSettings();
  const { data: employees = [] } = useQuery({
    queryKey: ["employees_all"],
    queryFn: () => base44.entities.Employee.list(),
  });
  const { data: payrolls = [] } = useQuery({
    queryKey: ["payrolls"],
    queryFn: () => base44.entities.Payroll.list("-month", 50),
  });

  if (!canManageHR && !isSleepingPartner) return <AccessDenied />;

  const activeEmployees = employees.filter(e => e.status === "active");
  const totalMonthlySalary = activeEmployees.reduce((s, e) => s + (e.basic_salary || 0) + (e.allowances || 0), 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthPaid = payrolls.filter(p => p.month === currentMonth && p.status === "paid")
    .reduce((s, p) => s + (p.net_salary || 0), 0);

  return (
    <div className="pb-24">
      <MobileHeader title="HR & Payroll" backTo="Accounting" />

      <div className="px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Link to={createPageUrl("Employees")} className="bg-blue-50 rounded-2xl p-3 text-center no-underline hover:bg-blue-100 transition-colors">
            <p className="text-[10px] text-blue-500">Employees</p>
            <p className="text-lg font-bold text-blue-700">{activeEmployees.length}</p>
          </Link>
          <Link to={createPageUrl("PayrollPage")} className="bg-purple-50 rounded-2xl p-3 text-center no-underline hover:bg-purple-100 transition-colors">
            <p className="text-[10px] text-purple-500">Monthly Cost</p>
            <p className="text-sm font-bold text-purple-700">{fmt(totalMonthlySalary)}</p>
          </Link>
          <Link to={createPageUrl("PayrollPage")} className="bg-green-50 rounded-2xl p-3 text-center no-underline hover:bg-green-100 transition-colors">
            <p className="text-[10px] text-green-500">This Month Paid</p>
            <p className="text-sm font-bold text-green-700">{fmt(thisMonthPaid)}</p>
          </Link>
        </div>

        {/* Sub modules */}
        <div className="space-y-2">
          {subModules.map(mod => (
            <Link
              key={mod.page}
              to={createPageUrl(mod.page)}
              className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 px-4 py-3.5 hover:border-slate-200 transition-all"
            >
              <div className={`p-2.5 rounded-xl ${mod.color}`}>
                <mod.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{mod.label}</p>
                <p className="text-xs text-slate-400">{mod.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          ))}
        </div>

        {/* Recent employees */}
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">Active Staff</p>
          <div className="space-y-2">
            {activeEmployees.slice(0, 6).map(emp => (
              <div key={emp.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-3 py-2.5">
                <div>
                  <p className="text-xs font-bold text-slate-800">{emp.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{emp.designation} · {emp.department}</p>
                </div>
                <p className="text-xs font-bold text-slate-600">{fmt((emp.basic_salary || 0) + (emp.allowances || 0))}</p>
              </div>
            ))}
            {activeEmployees.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No employees yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}