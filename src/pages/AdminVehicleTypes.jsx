import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, X, Layers } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_TYPES = [
  "LCL Cargo", "17ft", "18ft", "20ft Dry", "20ft Reefer",
  "40ft Dry", "40ft Reefer", "Flat Bed", "Half Body", "Suzuki", "Shahzore"
];

export default function AdminVehicleTypes() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", is_active: true });
  const queryClient = useQueryClient();

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["vehicleTypes"],
    queryFn: () => base44.entities.VehicleType.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VehicleType.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicleTypes"] }); setShowForm(false); toast.success("Type added"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VehicleType.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicleTypes"] }); setEditing(null); setShowForm(false); toast.success("Type updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VehicleType.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicleTypes"] }); toast.success("Type deleted"); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const openEdit = (t) => { setEditing(t); setForm({ name: t.name, description: t.description || "", is_active: t.is_active !== false }); setShowForm(true); };
  const openNew = () => { setEditing(null); setForm({ name: "", description: "", is_active: true }); setShowForm(true); };

  const seedDefaults = async () => {
    for (const name of DEFAULT_TYPES) {
      if (!types.find(t => t.name === name)) {
        await base44.entities.VehicleType.create({ name, is_active: true });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["vehicleTypes"] });
    toast.success("Default types loaded");
  };

  return (
    <div className="pb-24">
      <MobileHeader title="Vehicle Types" backTo="AdminPanel" onAdd={openNew} />

      {types.length === 0 && !isLoading && (
        <div className="px-4 pt-4">
          <Button onClick={seedDefaults} variant="outline" className="w-full rounded-xl">Load Default Types</Button>
        </div>
      )}

      <div className="px-4 py-4 space-y-2">
        {types.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl"><Layers className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                {t.description && <p className="text-xs text-slate-400">{t.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active !== false ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}>
                {t.is_active !== false ? "Active" : "Inactive"}
              </span>
              <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
              <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(t.id); }} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? "Edit Type" : "New Vehicle Type"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Type Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl" rows={2} />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl bg-slate-900">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}