import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, UserPlus, Mail, Clock } from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/ui/StatusBadge";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";

const DEPTS = ["management", "operations", "finance", "fleet", "driver", "labour", "admin", "other"];
const ROLES_MAP = {
  management: "management",
  operations: "operations",
  finance: "accounting",
  fleet: "fleet_manager",
  driver: "driver",
  admin: "admin",
  labour: "operations",
  other: "operations",
};

const emptyForm = {
  name: "", employee_id: "", designation: "", department: "operations",
  phone: "", cnic: "", basic_salary: "", allowances: "", deductions: "",
  hourly_rate: "", join_date: "", payment_mode: "cash", status: "active", app_email: "",
};

export default function Employees() {
  const { fmt, settings } = useAppSettings();
  const { canManageHR, isSleepingPartner } = useRole();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [invitingId, setInvitingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_all"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: fleet = [] } = useQuery({
    queryKey: ["fleet"],
    queryFn: () => base44.entities.FleetVehicle.list(),
  });

  const saveMutation = useMutation({
  mutationFn: (data) => editing
    ? base44.entities.Employee.update(editing, data)
    : base44.entities.Employee.create(data),

  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["employees_all"] });
    setForm(emptyForm);
    setShowForm(false);
    setEditing(null);
    toast.success(editing ? "Updated" : "Employee added");
  },

  onError: (error) => {
    console.error("EMPLOYEE SAVE ERROR:", error);
    alert("Employee not saved. Data problem.");
  }
});

  const deleteMutation = useMutation({
  mutationFn: (id) => base44.entities.Employee.delete(id),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["employees_all"] }); // ✅
    toast.success("Employee removed");
  },
});

  if (!canManageHR && !isSleepingPartner) return <AccessDenied />;

  const handleEdit = (emp) => {
    setForm({ ...emp });
    setEditing(emp.id);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
  e.preventDefault();

  const data = {
    name: form.name || null,
    employee_id: form.employee_id || null,
    designation: form.designation || null,
    department: form.department || "operations",
    phone: form.phone || null,
    cnic: form.cnic || null,

    join_date: form.join_date || null,
    leave_date: form.leave_date || null,
    leave_reason: form.leave_reason || null,

    basic_salary: Number(form.basic_salary) || 0,
    allowances: Number(form.allowances) || 0,
    deductions: Number(form.deductions) || 0,
    hourly_rate: Number(form.hourly_rate) || 0,

    payment_mode: form.payment_mode || "cash",
    status: form.status || "active",
    app_email: form.app_email || null,

    assigned_vehicle_id: form.assigned_vehicle_id || null,
    assigned_vehicle_number: form.assigned_vehicle_number || null,
  };

  saveMutation.mutate(data);
};

  const handleInvite = async (emp) => {
    if (!emp.app_email) {
      toast.error("No email set for this employee. Edit to add email.");
      return;
    }
    const appRole = ROLES_MAP[emp.department] || "operations";
    setInvitingId(emp.id);
    await base44.users.inviteUser(emp.app_email, appRole === "admin" ? "admin" : "user");
    toast.success(`Invite sent to ${emp.app_email} as ${appRole}`);
    setInvitingId(null);
  };

  const filteredEmployees = statusFilter === "all" ? employees : employees.filter(e => e.status === statusFilter);

  return (
    <div className="pb-24">
      <MobileHeader title="Employees" backTo="HRPayroll" onAdd={isSleepingPartner ? undefined : () => { setForm(emptyForm); setEditing(null); setShowForm(true); }} />

      {showForm && (
        <form onSubmit={handleSubmit} className="mx-4 mt-4 bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <p className="font-bold text-sm">{editing ? "Edit Employee" : "New Employee"}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Employee ID" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} />
            <Input placeholder="Designation *" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} required />
            <div>
              <select className="border rounded-md px-2 py-1.5 text-sm w-full" value={form.department} onChange={e => setForm({ ...form, department: e.target.value, department_other: "" })}>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {form.department === "other" && (
                <Input placeholder="Please specify department..." value={form.department_other || ""} onChange={e => setForm({ ...form, department_other: e.target.value })} className="mt-1 text-sm" required />
              )}
            </div>
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="CNIC / ID" value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })} />
            <Input placeholder="Basic Salary" type="number" value={form.basic_salary} onChange={e => setForm({ ...form, basic_salary: e.target.value })} />
            <Input placeholder="Allowances" type="number" value={form.allowances} onChange={e => setForm({ ...form, allowances: e.target.value })} />
            <Input placeholder="Deductions" type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} />
            <Input placeholder="Join Date" type="date" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />
            <select className="border rounded-md px-2 py-1.5 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
            </select>
            {["resigned", "terminated"].includes(form.status) && (
              <>
                <Input placeholder="Leave Date" type="date" value={form.leave_date || ""} onChange={e => setForm({ ...form, leave_date: e.target.value })} />
                <Input placeholder="Reason (optional)" value={form.leave_reason || ""} onChange={e => setForm({ ...form, leave_reason: e.target.value })} className="col-span-2" />
              </>
            )}
            {(settings.code === "usa" || settings.code === "eu" || settings.code === "gb") && (
              <div className="col-span-2">
                <label className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Clock className="w-3 h-3" />Hourly Rate ({settings.symbol}/hr) — for US/EU/GB payroll</label>
                <Input placeholder="e.g. 25" type="number" step="0.01" value={form.hourly_rate || ""} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />App Login Email (to invite to app)</label>
            <Input placeholder="employee@email.com" type="email" value={form.app_email || ""} onChange={e => setForm({ ...form, app_email: e.target.value })} className="mt-1" />
            <p className="text-[10px] text-slate-400 mt-0.5">Role will be set based on department: <strong>{ROLES_MAP[form.department] || "operations"}</strong></p>
          </div>
          {form.department === "driver" && (
            <div>
              <label className="text-xs text-slate-500">Assign Vehicle</label>
              <select className="w-full border rounded-md px-2 py-1.5 text-sm" value={form.assigned_vehicle_id || ""} onChange={e => {
                const v = fleet.find(f => f.id === e.target.value);
                setForm({ ...form, assigned_vehicle_id: e.target.value, assigned_vehicle_number: v?.vehicle_number || "" });
              }}>
                <option value="">— No vehicle —</option>
                {fleet.map(v => <option key={v.id} value={v.id}>{v.vehicle_number} ({v.vehicle_type})</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>Save</Button>
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Status filter tabs */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto pb-2">
        {["active", "inactive", "resigned", "terminated", "all"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border capitalize transition-all ${statusFilter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="px-4 mt-2 space-y-2">
        {filteredEmployees.map(emp => (
          <div key={emp.id} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                <p className="text-xs text-slate-500 capitalize">{emp.designation} · {emp.department}</p>
                {emp.phone && <p className="text-xs text-slate-400 mt-0.5">{emp.phone}</p>}
                {emp.app_email && <p className="text-xs text-blue-500 mt-0.5">{emp.app_email}</p>}
                <p className="text-xs font-semibold text-green-600 mt-1">
                  {fmt((emp.basic_salary || 0) + (emp.allowances || 0))} / month
                </p>
                {emp.assigned_vehicle_number && (
                  <p className="text-xs text-slate-400 mt-0.5">🚛 {emp.assigned_vehicle_number}</p>
                )}
                {emp.leave_date && (
                  <p className="text-xs text-red-400 mt-0.5">Left: {emp.leave_date}{emp.leave_reason ? ` — ${emp.leave_reason}` : ""}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={emp.status} />
                <div className="flex items-center gap-1 mt-1">
                  <button
                    onClick={() => handleInvite(emp)}
                    disabled={invitingId === emp.id}
                    className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-50"
                    title="Invite to app"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleEdit(emp)} className="p-1.5 text-slate-400 hover:text-blue-500">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm("Remove employee?")) deleteMutation.mutate(emp.id); }} className="p-1.5 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {employees.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No employees yet. Add to invite them to the app.</p>}
      </div>
    </div>
  );
}