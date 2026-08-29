import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export default function ClientForm({ client, onSubmit, onCancel, isSubmitting }) {
  const [form, setForm] = useState(client || {
    name: "", contact_person: "", phone: "", email: "",
    address: "", city: "", gst_number: "", status: "active", notes: ""
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{client ? "Edit Client" : "New Client"}</h2>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Company Name *</Label>
            <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} required className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input value={form.contact_person} onChange={(e) => handleChange("contact_person", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} required className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea value={form.address} onChange={(e) => handleChange("address", e.target.value)} className="rounded-xl" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>GST Number</Label>
              <Input value={form.gst_number} onChange={(e) => handleChange("gst_number", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="rounded-xl" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800">
              {isSubmitting ? "Saving..." : "Save Client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}