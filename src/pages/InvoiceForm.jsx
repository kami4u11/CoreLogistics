import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import MobileHeader from "@/components/ui/MobileHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { useAppSettings } from "@/components/AppSettings";

function recalc(form) {
  const lineTotal = (form.line_items || []).reduce((s, li) => s + (parseFloat(li.amount) || 0), 0);
  const freight = parseFloat(form.freight_amount) || 0;
  const labor = parseFloat(form.labor_charges) || 0;
  const other = parseFloat(form.other_charges) || 0;
  const subtotal = lineTotal + freight + labor + other;
  const taxPct = parseFloat(form.tax_percentage) || 0;
  const taxAmt = taxPct > 0 ? Math.round((subtotal * taxPct) / 100) : (parseFloat(form.gst_amount) || 0);
  const total = subtotal + (taxPct > 0 ? taxAmt : parseFloat(form.gst_amount) || 0);
  const paid = parseFloat(form.paid_amount) || 0;
  return {
    ...form,
    gst_amount: taxPct > 0 ? taxAmt : parseFloat(form.gst_amount) || 0,
    total_amount: total,
    balance_amount: total - paid,
  };
}

export default function InvoiceForm() {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");
  const loadId = params.get("loadId");
  const { fmt, settings } = useAppSettings();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.filter({ status: "active" }),
  });

  const { data: loads = [] } = useQuery({
    queryKey: ["loads"],
    queryFn: () => base44.entities.Load.list("-created_date", 300),
  });

  const [form, setForm] = useState({
    invoice_number: "",
    load_ids: [],
    load_numbers: [],
    client_id: "", client_name: "",
    client_address: "", client_ntn: "", company_ntn: "", company_address: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    line_items: [],
    freight_amount: 0, labor_charges: 0, other_charges: 0,
    tax_label: "GST", tax_percentage: 0,
    gst_amount: 0, total_amount: 0, paid_amount: 0, balance_amount: 0,
    status: "draft", payment_mode: "", notes: ""
  });

  const [showLoadPicker, setShowLoadPicker] = useState(false);
  const [loadSearch, setLoadSearch] = useState("");

  useEffect(() => {
    if (editId) {
      base44.entities.Invoice.list().then(invs => {
        const inv = invs.find(i => i.id === editId);
        if (inv) setForm({ ...inv, load_ids: inv.load_ids || [], load_numbers: inv.load_numbers || [], line_items: inv.line_items || [] });
      });
    } else {
      const num = `INV-${Date.now().toString(36).toUpperCase()}`;
      setForm(prev => ({ ...prev, invoice_number: num }));
    }
  }, [editId]);

  // Pre-fill from loadId param
  useEffect(() => {
    if (loadId && loads.length > 0 && !editId) {
      const load = loads.find(l => l.id === loadId);
      if (load) {
        const item = { description: `Freight – ${load.load_number} (${load.origin || ""} → ${load.destination || ""})`, load_ref: load.load_number, amount: load.approved_rate || load.freight_amount || 0 };
        setForm(prev => recalc({
          ...prev,
          load_ids: [load.id],
          load_numbers: [load.load_number],
          client_id: load.client_id || "",
          client_name: load.client_name || "",
          line_items: [item],
        }));
      }
    }
  }, [loadId, loads, editId]);

  const set = (field, value) => {
    setForm(prev => recalc({ ...prev, [field]: value }));
  };

  const setClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm(prev => recalc({
      ...prev,
      client_id: clientId,
      client_name: client?.name || "",
      client_address: client?.address || prev.client_address,
      client_ntn: client?.gst_number || prev.client_ntn,
    }));
  };

  // Load picker: add a load as line items
  const addLoad = (load) => {
    if (form.load_ids.includes(load.id)) return;
    const item = {
      description: `Freight – ${load.load_number} (${load.origin || ""} → ${load.destination || ""})`,
      load_ref: load.load_number,
      amount: load.approved_rate || load.freight_amount || 0,
    };
    const newForm = recalc({
      ...form,
      load_ids: [...form.load_ids, load.id],
      load_numbers: [...form.load_numbers, load.load_number],
      line_items: [...form.line_items, item],
      client_id: form.client_id || load.client_id || "",
      client_name: form.client_name || load.client_name || "",
    });
    setForm(newForm);
  };

  const removeLoad = (loadId) => {
    const load = loads.find(l => l.id === loadId) || {};
    setForm(prev => recalc({
      ...prev,
      load_ids: prev.load_ids.filter(id => id !== loadId),
      load_numbers: prev.load_numbers.filter(n => n !== load.load_number),
      line_items: prev.line_items.filter(li => li.load_ref !== load.load_number),
    }));
  };

  // Line item handlers
  const updateLineItem = (idx, field, value) => {
    const items = form.line_items.map((li, i) => i === idx ? { ...li, [field]: field === "amount" ? parseFloat(value) || 0 : value } : li);
    setForm(prev => recalc({ ...prev, line_items: items }));
  };

  const addLineItem = () => {
    setForm(prev => recalc({ ...prev, line_items: [...prev.line_items, { description: "", load_ref: "", amount: 0 }] }));
  };

  const removeLineItem = (idx) => {
    setForm(prev => recalc({ ...prev, line_items: prev.line_items.filter((_, i) => i !== idx) }));
  };

  const saveMutation = useMutation({
    mutationFn: (data) => editId ? base44.entities.Invoice.update(editId, data) : base44.entities.Invoice.create(data),
    onSuccess: () => {
      toast.success(editId ? "Invoice updated" : "Invoice created");
      window.location.href = createPageUrl("Invoices");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    ["freight_amount", "labor_charges", "other_charges", "gst_amount", "total_amount", "paid_amount", "balance_amount", "tax_percentage"].forEach(f => {
      data[f] = parseFloat(data[f]) || 0;
    });
    saveMutation.mutate(data);
  };

  const subtotal = (form.line_items || []).reduce((s, li) => s + (parseFloat(li.amount) || 0), 0)
    + (parseFloat(form.freight_amount) || 0)
    + (parseFloat(form.labor_charges) || 0)
    + (parseFloat(form.other_charges) || 0);

  const filteredLoads = loads.filter(l =>
    (!form.client_id || l.client_id === form.client_id) &&
    (l.load_number?.toLowerCase().includes(loadSearch.toLowerCase()) ||
     l.client_name?.toLowerCase().includes(loadSearch.toLowerCase()) ||
     l.origin?.toLowerCase().includes(loadSearch.toLowerCase()) ||
     l.destination?.toLowerCase().includes(loadSearch.toLowerCase()))
  );

  return (
    <div className="pb-28">
      <MobileHeader title={editId ? "Edit Invoice" : "New Invoice"} backTo="Invoices" />

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">

        {/* Invoice Info */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Invoice Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Invoice # *</Label>
              <Input value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} required className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft", "sent", "paid", "partial", "overdue", "cancelled"].map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={form.client_id || "none"} onValueChange={(v) => v !== "none" && setClient(v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select client</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Invoice Date</Label>
              <Input type="date" value={form.invoice_date} onChange={(e) => set("invoice_date", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className="rounded-xl" />
            </div>
          </div>
        </div>

        {/* NTN & Address */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">NTN & Address</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Company NTN</Label>
              <Input value={form.company_ntn} onChange={(e) => set("company_ntn", e.target.value)} className="rounded-xl" placeholder="1234567-8" />
            </div>
            <div className="space-y-1.5">
              <Label>Client NTN</Label>
              <Input value={form.client_ntn} onChange={(e) => set("client_ntn", e.target.value)} className="rounded-xl" placeholder="9876543-2" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Company Address</Label>
            <Input value={form.company_address} onChange={(e) => set("company_address", e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label>Client Address</Label>
            <Input value={form.client_address} onChange={(e) => set("client_address", e.target.value)} className="rounded-xl" />
          </div>
        </div>

        {/* Linked Loads */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Linked Loads</h3>
            <button type="button" onClick={() => setShowLoadPicker(p => !p)}
              className="text-xs font-semibold text-blue-600 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {showLoadPicker ? "Close" : "Add Load"}
              {showLoadPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Linked loads chips */}
          {form.load_ids.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.load_ids.map(lid => {
                const l = loads.find(x => x.id === lid);
                return (
                  <div key={lid} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
                    <span className="text-xs font-semibold text-blue-700">{l?.load_number || lid}</span>
                    <button type="button" onClick={() => removeLoad(lid)} className="text-blue-400 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load Picker */}
          {showLoadPicker && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <Input
                value={loadSearch}
                onChange={e => setLoadSearch(e.target.value)}
                placeholder="Search loads..."
                className="border-0 border-b border-slate-200 rounded-none"
              />
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                {filteredLoads.slice(0, 30).map(l => {
                  const linked = form.load_ids.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={linked}
                      onClick={() => { addLoad(l); setShowLoadPicker(false); setLoadSearch(""); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${linked ? "bg-slate-50 opacity-50 cursor-not-allowed" : "hover:bg-blue-50"}`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{l.load_number}</p>
                        <p className="text-[10px] text-slate-400">{l.client_name} · {l.origin} → {l.destination}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-700">{fmt(l.approved_rate || l.freight_amount)}</p>
                        {linked && <span className="text-[10px] text-green-600">Added</span>}
                      </div>
                    </button>
                  );
                })}
                {filteredLoads.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No loads found</p>}
              </div>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Line Items</h3>
            <button type="button" onClick={addLineItem} className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          {form.line_items.length === 0 && (
            <p className="text-xs text-slate-400 italic">No line items. Add loads above or add rows manually.</p>
          )}

          {form.line_items.map((li, idx) => (
            <div key={idx} className="border border-slate-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={li.description}
                  onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                  placeholder="Description"
                  className="rounded-lg text-xs flex-1"
                />
                <button type="button" onClick={() => removeLineItem(idx)} className="text-red-400 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">Load Ref</p>
                  <Input
                    value={li.load_ref || ""}
                    onChange={(e) => updateLineItem(idx, "load_ref", e.target.value)}
                    placeholder="e.g. BL-001"
                    className="rounded-lg text-xs"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">Amount</p>
                  <Input
                    type="number"
                    value={li.amount}
                    onChange={(e) => updateLineItem(idx, "amount", e.target.value)}
                    className="rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Charges */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Additional Charges</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Freight (bulk)</Label>
              <Input type="number" value={form.freight_amount} onChange={(e) => set("freight_amount", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Labor</Label>
              <Input type="number" value={form.labor_charges} onChange={(e) => set("labor_charges", e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Other Charges</Label>
            <Input type="number" value={form.other_charges} onChange={(e) => set("other_charges", e.target.value)} className="rounded-xl" />
          </div>
        </div>

        {/* Tax */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Tax</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tax Label</Label>
              <Input value={form.tax_label} onChange={(e) => set("tax_label", e.target.value)} placeholder="GST / VAT / WHT / FBR" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Tax % (auto-calc)</Label>
              <Input type="number" value={form.tax_percentage} onChange={(e) => set("tax_percentage", e.target.value)} placeholder="0" className="rounded-xl" />
            </div>
          </div>
          {form.tax_percentage > 0 ? (
            <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-700">
              {form.tax_label} ({form.tax_percentage}%) on subtotal {fmt(subtotal)} = <b>{fmt(form.gst_amount)}</b>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Manual Tax Amount</Label>
              <Input type="number" value={form.gst_amount} onChange={(e) => set("gst_amount", e.target.value)} className="rounded-xl" />
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Payment</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Paid Amount</Label>
              <Input type="number" value={form.paid_amount} onChange={(e) => set("paid_amount", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Mode</Label>
              <Select value={form.payment_mode || "none"} onValueChange={(v) => set("payment_mode", v === "none" ? "" : v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">--</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Subtotal</span>
            <span className="font-medium">{fmt(subtotal)}</span>
          </div>
          {form.gst_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{form.tax_label || "Tax"}{form.tax_percentage > 0 ? ` (${form.tax_percentage}%)` : ""}</span>
              <span className="font-medium">{fmt(form.gst_amount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/20 pt-2">
            <span className="font-bold">Total</span>
            <span className="text-lg font-bold">{fmt(form.total_amount)}</span>
          </div>
          {form.paid_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400">Paid</span>
              <span className="text-emerald-400 font-medium">{fmt(form.paid_amount)}</span>
            </div>
          )}
          {form.balance_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-400">Balance Due</span>
              <span className="text-amber-400 font-bold">{fmt(form.balance_amount)}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-xl" rows={3} />
        </div>

        <Button type="submit" disabled={saveMutation.isPending} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 h-12 text-base">
          {saveMutation.isPending ? "Saving..." : (editId ? "Update Invoice" : "Create Invoice")}
        </Button>
      </form>
    </div>
  );
}