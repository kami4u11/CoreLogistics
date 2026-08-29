import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";
import StatusBadge from "@/components/ui/StatusBadge";

const STATUS_OPTS = ["present", "absent", "half_day", "leave", "holiday"];

export default function AttendancePage() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = today.slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: today, employee_name: "", status: "present", check_in: "", check_out: "", overtime_hours: "" });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", selectedMonth],
    queryFn: () => base44.entities.Attendance.filter({ month: selectedMonth }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Attendance.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      setShowForm(false);
      toast.success("Attendance marked");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      month: form.date.slice(0, 7),
      overtime_hours: parseFloat(form.overtime_hours) || 0,
    });
  };

  const present = attendance.filter(a => a.status === "present").length;
  const absent = attendance.filter(a => a.status === "absent").length;

  return (
    <div className="pb-24">
      <MobileHeader title="Attendance" backTo="HRPayroll" onAdd={() => setShowForm(true)} />

      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-auto" />
          <div className="flex gap-2">
            <span className="text-xs bg-green-100 text-green-700 rounded-full px-2.5 py-1 font-medium">{present} Present</span>
            <span className="text-xs bg-red-100 text-red-700 rounded-full px-2.5 py-1 font-medium">{absent} Absent</span>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 mb-4">
            <p className="font-bold text-sm">Mark Attendance</p>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              <select className="border rounded-md px-2 py-1.5 text-sm" value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} required>
                <option value="">Select Employee</option>
                {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
              </select>
              <select className="border rounded-md px-2 py-1.5 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Input placeholder="Overtime hrs" type="number" value={form.overtime_hours} onChange={e => setForm({ ...form, overtime_hours: e.target.value })} />
              <Input type="time" placeholder="Check In" value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })} />
              <Input type="time" placeholder="Check Out" value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Mark</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {attendance.map(a => (
            <div key={a.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold text-slate-800">{a.employee_name}</p>
                <p className="text-[10px] text-slate-400">{a.date} {a.check_in && `· In: ${a.check_in}`} {a.check_out && `Out: ${a.check_out}`}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
          {attendance.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No records for this month</p>}
        </div>
      </div>
    </div>
  );
}