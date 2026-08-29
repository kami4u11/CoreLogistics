import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function AdminStations() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", city: "", type: "both", is_active: true });
  const queryClient = useQueryClient();

  const { data: stations = [] } = useQuery({
    queryKey: ["stations"],
    queryFn: () => base44.entities.Station.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Station.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stations"] }); setShowForm(false); toast.success("Station added"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Station.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stations"] }); setEditing(null); setShowForm(false); toast.success("Station updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Station.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stations"] }); toast.success("Station deleted"); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, city: s.city || "", type: s.type || "both", is_active: s.is_active !== false }); setShowForm(true); };
  const openNew = () => { setEditing(null); setForm({ name: "", city: "", type: "both", is_active: true }); setShowForm(true); };

  const typeColors = { origin: "bg-blue-50 text-blue-700", destination: "bg-green-50 text-green-700", both: "bg-purple-50 text-purple-700" };

  return (
    <div className="pb-24">
      <MobileHeader title="Fixed Stations" backTo="AdminPanel" onAdd={openNew} />
      <div className="px-4 py-4 space-y-2">
        {stations.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl"><MapPin className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                {s.city && <p className="text-xs text-slate-400">{s.city}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${typeColors[s.type] || "bg-gray-50 text-gray-400"}`}>{s.type}</span>
              <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
              <button onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(s.id); }} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
          </div>
        ))}
        {stations.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No stations yet. Add your first fixed station.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? "Edit Station" : "New Station"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Station Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))} className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="origin">Origin Only</SelectItem>
                    <SelectItem value="destination">Destination Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
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