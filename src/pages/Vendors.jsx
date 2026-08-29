import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Search, Phone, MapPin, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const VENDOR_TYPES = [
  { value: "fuel_station", label: "⛽ Fuel Station" },
  { value: "spare_parts", label: "🔧 Spare Parts Supplier" },
  { value: "mechanic", label: "🛠 Mechanic" },
  { value: "office_stationery", label: "📎 Office Stationery" },
  { value: "printing", label: "🖨 Printing / Printer Work" },
  { value: "other", label: "📦 Other" },
];

const emptyForm = { name: "", vendor_type: "fuel_station", contact_person: "", phone: "", address: "", city: "", notes: "", status: "active" };

export default function Vendors() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => base44.entities.Vendor.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendors"] }); setShowForm(false); toast.success("Vendor added"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendor.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendors"] }); setShowForm(false); setEditing(null); toast.success("Vendor updated"); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendors"] }); toast.success("Deleted"); },
  });

  const filtered = vendors.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.city?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setShowForm(true); };
  const openEdit = (v) => { setEditing(v); setForm({ ...v }); setShowForm(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const typeLabel = (val) => VENDOR_TYPES.find(t => t.value === val)?.label || val;

  return (
    <div className="pb-24">
      <MobileHeader title="Vendors" backTo="AdminPanel" onAdd={openNew} />

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl bg-slate-50 border-slate-200" />
        </div>
      </div>

      <div className="px-4 space-y-2.5">
        {isLoading ? Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse h-20" />
        )) : filtered.length === 0 ? (
          <EmptyState icon={Store} title="No vendors yet" description="Add fuel stations, spare parts suppliers, mechanics, etc." action={<Button onClick={openNew} className="rounded-xl bg-slate-900">Add Vendor</Button>} />
        ) : (
          filtered.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">{v.name}</h3>
                  <p className="text-xs text-blue-600 mt-0.5">{typeLabel(v.vendor_type)}</p>
                  {v.contact_person && <p className="text-xs text-slate-500 mt-1">{v.contact_person}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    {v.phone && <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-blue-600"><Phone className="w-3 h-3" />{v.phone}</a>}
                    {v.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.city}</span>}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => openEdit(v)} className="p-2 rounded-lg hover:bg-slate-100"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                  <button onClick={() => { if (confirm("Delete vendor?")) deleteMutation.mutate(v.id); }} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">{editing ? "Edit Vendor" : "Add Vendor"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Vendor Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required className="rounded-xl" placeholder="e.g. Al-Noor Fuel Station" />
              </div>
              <div className="space-y-1.5">
                <Label>Vendor Type *</Label>
                <Select value={form.vendor_type} onValueChange={(v) => setForm(p => ({ ...p, vendor_type: v, vendor_type_other: "" }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.vendor_type === "other" && (
                  <Input
                    value={form.vendor_type_other || ""}
                    onChange={(e) => setForm(p => ({ ...p, vendor_type_other: e.target.value }))}
                    placeholder="Please specify vendor type..."
                    className="rounded-xl mt-2"
                    required
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Contact Person</Label>
                  <Input value={form.contact_person} onChange={(e) => setForm(p => ({ ...p, contact_person: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} className="rounded-xl" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 rounded-xl bg-slate-900">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Vendor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}