import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole } from "@/components/useRole";
import { useAppSettings } from "@/components/AppSettings";
import { toast } from "sonner";
// date-fns not needed currently
import { Plus, Trash2, Truck, MapPin, BarChart2, HardHat } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl as mkUrl } from "@/utils";
import AccessDenied from "@/components/AccessDenied";

export default function LabourEntry() {
  const { isLabourSupervisor, isAdmin, isManagement, isAccounting, isSleepingPartner, role } = useRole();
  const { fmt, settings } = useAppSettings();
  const queryClient = useQueryClient();
  const canAccess = isAdmin || isManagement || isLabourSupervisor || isAccounting || isSleepingPartner;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    vehicle_type: "",
    vehicle_number: "",
    loading_point: "",
    unloading_point: "",
    labor_charges: "",
    worker_count: "",
    notes: "",
  });

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ["vehicle_types"],
    queryFn: () => base44.entities.VehicleType.list(),
  });

const { data: entries = [], isLoading } = useQuery({
  queryKey: ["labour_entries"],
  queryFn: () => base44.entities.LaborEntry.list("-date", 200),
});

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LaborEntry.create({
      ...data,
      month: data.date?.slice(0, 7),
      labor_charges: Number(data.labor_charges) || 0,
      worker_count: Number(data.worker_count) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labour_entries"] });
      toast.success("Labour entry added");
      setShowForm(false);
      setForm({ date: new Date().toISOString().slice(0, 10), vehicle_type: "", vehicle_number: "", loading_point: "", unloading_point: "", labor_charges: "", worker_count: "", notes: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LaborEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["labour_entries"] }),
  });

  if (!canAccess) return <AccessDenied />;

  const canEdit = isAdmin || isManagement || isLabourSupervisor;

  const totalToday = entries.filter(e => e.date === new Date().toISOString().slice(0, 10)).reduce((s, e) => s + (e.labor_charges || 0), 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const totalMonth = entries.filter(e => e.month === currentMonth).reduce((s, e) => s + (e.labor_charges || 0), 0);

  const defaultVehicleTypes = ["Truck", "Trailer", "Container", "Tanker", "Mini Truck", "Pickup"];
  const vtOptions = vehicleTypes.length > 0 ? vehicleTypes.filter(v => v.is_active !== false).map(v => v.name) : defaultVehicleTypes;

  return (
    <div className="pb-24">
      <MobileHeader
        title="Labour Entries"
        backTo="Dashboard"
        rightAction={
          <div className="flex gap-2">
            <Link to={mkUrl("LabourAnalytics")} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-xl">
              <BarChart2 className="w-3.5 h-3.5" /> Analytics
            </Link>
            {canEdit && (
              <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Add Entry
              </button>
            )}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3 mb-4">
        <div className="bg-amber-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-amber-600 font-medium">Today's Labour</p>
          <p className="text-lg font-bold text-amber-700">{fmt(totalToday)}</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] text-orange-600 font-medium">This Month</p>
          <p className="text-lg font-bold text-orange-700">{fmt(totalMonth)}</p>
        </div>
      </div>

      {/* Add Entry Form */}
      {showForm && canEdit && (
        <div className="mx-4 mb-4 bg-white rounded-2xl border border-amber-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">New Labour Entry</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Date *</label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Vehicle Type *</label>
              <Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {vtOptions.map(vt => <SelectItem key={vt} value={vt}>{vt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Vehicle Number</label>
              <Input placeholder="e.g. KHI-1234" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Worker Count</label>
              <Input type="number" placeholder="No. of workers" value={form.worker_count} onChange={e => setForm({ ...form, worker_count: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Loading Point *</label>
              <Input placeholder="Loading location" value={form.loading_point} onChange={e => setForm({ ...form, loading_point: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Unloading Point *</label>
              <Input placeholder="Unloading location" value={form.unloading_point} onChange={e => setForm({ ...form, unloading_point: e.target.value })} className="rounded-xl" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Labour Charges *</label>
              <Input type="number" placeholder="0" value={form.labor_charges} onChange={e => setForm({ ...form, labor_charges: e.target.value })} className="rounded-xl" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Notes</label>
              <Input placeholder="Optional notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.vehicle_type || !form.loading_point || !form.unloading_point || !form.labor_charges || createMutation.isPending} className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600">
              {createMutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="px-4 space-y-2">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-slate-100" />)
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <HardHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No labour entries yet</p>
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-50 rounded-xl p-2">
                    <Truck className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{entry.vehicle_type} {entry.vehicle_number && `· ${entry.vehicle_number}`}</p>
                    <p className="text-xs text-slate-400">{entry.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-600">{fmt(entry.labor_charges)}</span>
                  {canEdit && (
                    <button onClick={() => deleteMutation.mutate(entry.id)} className="p-1 text-slate-300 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>{entry.loading_point}</span>
                <span className="text-slate-300">→</span>
                <MapPin className="w-3 h-3 text-green-400" />
                <span>{entry.unloading_point}</span>
                {entry.worker_count > 0 && <span className="ml-2 bg-slate-100 rounded px-1.5 py-0.5">{entry.worker_count} workers</span>}
              </div>
              {entry.notes && <p className="text-xs text-slate-400 mt-1.5 italic">{entry.notes}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}