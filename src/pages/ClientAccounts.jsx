import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  format, eachMonthOfInterval, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, parseISO, isWithinInterval
} from "date-fns";
import { toast } from "sonner";
import {
  Users, Package, FileText, Truck, MapPin, ArrowRight, Clock,
  BarChart2, FileSpreadsheet, Plus, X, ChevronDown, ChevronUp,
  Search, Building2, Eye, CheckCircle, AlertCircle, Calendar,
  Filter, ChevronLeft, ChevronRight, LogOut, Layers, Printer, Bell
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const BILTY_STATUSES = [
  { value: "order_confirmed",   label: "Order Confirmed",   color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500" },
  { value: "loading",           label: "Loading",           color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  { value: "dispatched",        label: "Dispatched",        color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  { value: "in_transit",        label: "In Transit",        color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  { value: "hold_in_transit",   label: "Hold in Transit",   color: "bg-red-100 text-red-700",       dot: "bg-red-500" },
  { value: "delivered",         label: "Delivered",         color: "bg-teal-100 text-teal-700",     dot: "bg-teal-500" },
  { value: "invoice_generated", label: "Invoice Generated", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  { value: "invoice_sent",      label: "Invoice Sent",      color: "bg-pink-100 text-pink-700",     dot: "bg-pink-500" },
  { value: "payment_received",  label: "Payment Received",  color: "bg-green-100 text-green-700",   dot: "bg-green-500" },
  { value: "booked",            label: "Booked",            color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" },
];

const UNBILLED_STATUSES = ["delivered", "in_transit", "dispatched", "loading", "order_confirmed", "booked", "hold_in_transit"];
const BILLED_STATUSES   = ["invoice_generated", "invoice_sent", "payment_received"];

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = BILTY_STATUSES.find(x => x.value === status)
    || { label: status || "—", color: "bg-slate-100 text-slate-500", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT BILTY GENERATION MODAL
// ─────────────────────────────────────────────────────────────────────────────
function NewLoadModal({ clientName, clientId, onClose, onSave, stations = [] }) {
  const [saving, setSaving] = useState(false);
  const stationNames = stations.filter(s => s.is_active !== false).map(s => s.name);

  const [form, setForm] = useState({
    client_name:       clientName,
    client_id:         clientId,
    origin:            "",
    destination:       "",
    cargo_type:        "",
    weight_tons:       "",
    loading_date:      new Date().toISOString().slice(0, 10),
    payment_type:      "topay",
    notes:             "",
    status:            "booked",
    is_confirmed:      false,
    approval_status:   "pending_approval",
    load_number:       `BL-${Date.now().toString().slice(-6)}`,
    vehicle_number:    "",
    plant:             "",
    loading_point:     "",
    freight_amount:    "",
    receiver_name:     "",
    cargo_description: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.origin || !form.destination) { toast.error("Origin and destination required"); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const StationSelect = ({ label, field }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label} *</Label>
      <Select value={form[field] || "_"} onValueChange={v => v !== "_" && set(field, v)}>
        <SelectTrigger className="rounded-xl text-xs"><SelectValue placeholder="Select station" /></SelectTrigger>
        <SelectContent>{stationNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
      </Select>
      {(!stationNames.includes(form[field]) || !form[field]) && (
        <Input value={form[field]} onChange={e => set(field, e.target.value)} className="rounded-xl text-xs" placeholder={`Type ${label.toLowerCase()}`} />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">📄 Generate Bilty</h2>
            <p className="text-xs text-slate-500">{clientName} · Requires admin approval before dispatch</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {/* Payment type */}
          <div className="flex gap-2">
            {["topay","paid"].map(pt => (
              <button key={pt} type="button" onClick={() => set("payment_type", pt)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.payment_type === pt
                  ? pt === "topay" ? "bg-orange-500 text-white border-orange-500" : "bg-green-500 text-white border-green-500"
                  : pt === "topay" ? "bg-white text-orange-600 border-orange-200" : "bg-white text-green-600 border-green-200"}`}>
                {pt === "topay" ? "TO PAY" : "PAID"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StationSelect label="Origin" field="origin" />
            <StationSelect label="Destination" field="destination" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Receiver / Consignee Name</Label>
            <Input value={form.receiver_name} onChange={e => set("receiver_name", e.target.value)} className="rounded-xl text-xs" placeholder="Receiver name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Loading Point</Label>
              <Input value={form.loading_point} onChange={e => set("loading_point", e.target.value)} className="rounded-xl text-xs" placeholder="e.g. Gate 1, Dock A" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plant / Factory</Label>
              <Input value={form.plant} onChange={e => set("plant", e.target.value)} className="rounded-xl text-xs" placeholder="Plant name" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Cargo Description</Label>
            <Input value={form.cargo_type} onChange={e => set("cargo_type", e.target.value)} className="rounded-xl" placeholder="e.g. Sugar, Cement, Electronics" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Weight (Tons)</Label>
              <Input type="number" step="0.5" value={form.weight_tons} onChange={e => set("weight_tons", e.target.value)} className="rounded-xl" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Freight Amount</Label>
              <Input type="number" value={form.freight_amount} onChange={e => set("freight_amount", e.target.value)} className="rounded-xl" placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Vehicle Number (if known)</Label>
            <Input value={form.vehicle_number} onChange={e => set("vehicle_number", e.target.value)} className="rounded-xl" placeholder="e.g. ABC-123" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Loading Date</Label>
            <Input type="date" value={form.loading_date} onChange={e => set("loading_date", e.target.value)} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes / Special Instructions</Label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
              placeholder="Special requirements..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            📋 This bilty will be submitted for <strong>admin approval</strong>. You can generate multiple bilties. No deletion allowed after submission.
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
            {saving ? "Generating…" : "📄 Generate Bilty"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAFT INVOICE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function DraftInvoiceModal({ loads, month, clientName, fmt, onClose }) {
  const monthLoads = loads.filter(l => (l.loading_date || l.created_date || "").startsWith(month));
  const total = monthLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
  const paid  = monthLoads.filter(l => l.payment_type === "paid").reduce((s, l) => s + (l.freight_amount || 0), 0);
  const toPay = total - paid;
  const unbilled = monthLoads.filter(l => UNBILLED_STATUSES.includes(l.status));
  const billed   = monthLoads.filter(l => BILLED_STATUSES.includes(l.status));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Draft Statement</p>
            <h2 className="text-lg font-bold text-slate-900">{clientName}</h2>
            <p className="text-xs text-slate-500">{format(new Date(month + "-01"), "MMMM yyyy")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        {/* Unbilled alert */}
        {unbilled.length > 0 && (
          <div className="mx-6 mt-4 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="text-xs text-orange-700 font-semibold">{unbilled.length} unbilled shipment{unbilled.length > 1 ? "s" : ""} this month</p>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Billed */}
          {billed.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">✅ Billed ({billed.length})</p>
              {billed.map(l => (
                <div key={l.id} className="grid grid-cols-3 gap-2 items-center py-2 border-b border-slate-50">
                  <div><p className="text-xs font-bold text-slate-800">#{l.load_number}</p><StatusBadge status={l.status} /></div>
                  <div className="text-center text-[10px] text-slate-500">{l.origin}<br/>↓<br/>{l.destination}</div>
                  <div className="text-right text-sm font-bold text-slate-800">{fmt(l.freight_amount || 0)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Unbilled */}
          {unbilled.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mb-2">⏳ Unbilled ({unbilled.length})</p>
              {unbilled.map(l => (
                <div key={l.id} className="grid grid-cols-3 gap-2 items-center py-2 border-b border-orange-50 bg-orange-50/30 rounded-lg px-2">
                  <div><p className="text-xs font-bold text-slate-800">#{l.load_number}</p><StatusBadge status={l.status} /></div>
                  <div className="text-center text-[10px] text-slate-500">{l.origin}<br/>↓<br/>{l.destination}</div>
                  <div className="text-right text-sm font-bold text-orange-600">{fmt(l.freight_amount || 0)}</div>
                </div>
              ))}
            </div>
          )}

          {monthLoads.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No loads this month</p>}
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex justify-between text-sm text-slate-500"><span>Total Trips</span><span className="font-semibold text-slate-800">{monthLoads.length}</span></div>
          <div className="flex justify-between text-sm text-slate-500"><span>Total Freight</span><span className="font-semibold text-slate-800">{fmt(total)}</span></div>
          <div className="flex justify-between text-sm text-orange-600"><span>Unbilled Amount</span><span className="font-semibold">{fmt(unbilled.reduce((s,l) => s+(l.freight_amount||0), 0))}</span></div>
          <div className="flex justify-between text-sm text-green-600"><span>Paid</span><span className="font-semibold">{fmt(paid)}</span></div>
          <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2"><span>Balance Due</span><span className="text-orange-600">{fmt(toPay)}</span></div>
          <p className="text-[10px] text-slate-400 text-center mt-2">* Draft for reference only</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BILTY CALENDAR (Binance-style)
// ─────────────────────────────────────────────────────────────────────────────
function BiltyCalendar({ allBilties, fmt }) {
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const monthStart = startOfMonth(calMonth);
  const monthEnd   = endOfMonth(calMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart); // 0=Sun

  // Map date string → bilties
  const dayMap = useMemo(() => {
    const m = {};
    allBilties.forEach(b => {
      const d = b.loading_date || b.date || "";
      if (d) {
        const key = d.slice(0, 10);
        if (!m[key]) m[key] = [];
        m[key].push(b);
      }
    });
    return m;
  }, [allBilties]);

  const selectedBilties = selectedDay ? (dayMap[selectedDay] || []) : [];
  const totalBilties = Object.values(dayMap).reduce((s, arr) => s + arr.length, 0);
  const monthBilties = days.reduce((s, d) => s + (dayMap[format(d, "yyyy-MM-dd")]?.length || 0), 0);

  return (
    <div className="space-y-3">
      {/* Calendar header */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
          <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">{format(calMonth, "MMMM yyyy")}</p>
            <p className="text-[10px] text-slate-400">{monthBilties} bilties this month</p>
          </div>
          <button onClick={() => setCalMonth(m => { const n = new Date(m); n.setMonth(n.getMonth()+1); return n; })} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-50">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Padding */}
          {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} className="h-12 border-b border-r border-slate-50" />)}

          {days.map(day => {
            const key    = format(day, "yyyy-MM-dd");
            const dBilties = dayMap[key] || [];
            const count  = dBilties.length;
            const isToday = key === format(new Date(), "yyyy-MM-dd");
            const isSel  = key === selectedDay;
            const hasUnbilled = dBilties.some(b => UNBILLED_STATUSES.includes(b.status));
            const hasBilled   = dBilties.some(b => BILLED_STATUSES.includes(b.status));

            return (
              <button key={key} onClick={() => setSelectedDay(isSel ? null : key)}
                className={`h-12 flex flex-col items-center justify-center border-b border-r border-slate-50 transition-all relative
                  ${isSel ? "bg-slate-900" : isToday ? "bg-blue-50" : count > 0 ? "hover:bg-slate-50" : "hover:bg-slate-25"}`}>
                <span className={`text-[11px] font-bold leading-none ${isSel ? "text-white" : isToday ? "text-blue-700" : "text-slate-700"}`}>
                  {format(day, "d")}
                </span>
                {count > 0 && (
                  <span className={`text-[9px] font-bold mt-0.5 px-1 rounded-full leading-tight
                    ${isSel ? "bg-white/20 text-white" : hasUnbilled && hasBilled ? "bg-orange-100 text-orange-600" : hasBilled ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {count}
                  </span>
                )}
                {isToday && !isSel && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-slate-500">Unbilled</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] text-slate-500">Billed</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-[10px] text-slate-500">Mixed</span></div>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">{format(parseISO(selectedDay), "EEEE, dd MMMM yyyy")}</p>
            <span className="text-xs text-slate-500">{selectedBilties.length} bilties</span>
          </div>
          {selectedBilties.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No bilties on this day</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {selectedBilties.map((b, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-800">#{b.bilty_number || b.load_number}</p>
                      <StatusBadge status={b.status} />
                      {UNBILLED_STATUSES.includes(b.status) && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">Unbilled</span>
                      )}
                    </div>
                    {b.freight_amount > 0 && <span className="text-xs font-bold text-slate-700">{fmt(b.freight_amount)}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span>{b.origin}</span><ArrowRight className="w-3 h-3 text-slate-300" /><span>{b.destination}</span>
                  </div>
                  {b.vehicle_number && <p className="text-[10px] text-slate-400 mt-0.5">🚛 {b.vehicle_number}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER BAR
// ─────────────────────────────────────────────────────────────────────────────
function FilterBar({ loads, filters, setFilters, onReset }) {
  const [open, setOpen] = useState(false);

  // Derive options from data
  const origins      = [...new Set(loads.map(l => l.origin).filter(Boolean))].sort();
  const destinations = [...new Set(loads.map(l => l.destination).filter(Boolean))].sort();
  const plants       = [...new Set(loads.map(l => l.plant).filter(Boolean))].sort();
  const loadingPts   = [...new Set(loads.map(l => l.loading_point).filter(Boolean))].sort();

  const activeCount = Object.values(filters).filter(v => v && v !== "all" && v !== "" ).length;

  return (
    <div className="space-y-2">
      {/* Quick period pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { label: "This Month", value: "month" },
          { label: "Quarter",    value: "quarter" },
          { label: "This Year",  value: "year" },
          { label: "All Time",   value: "all" },
          { label: "Custom",     value: "custom" },
        ].map(p => (
          <button key={p.value} onClick={() => setFilters(f => ({ ...f, period: p.value }))}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filters.period === p.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {filters.period === "custom" && (
        <div className="flex gap-2">
          <Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="rounded-xl text-xs flex-1" />
          <Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="rounded-xl text-xs flex-1" />
        </div>
      )}

      {/* Advanced filters toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${open || activeCount > 0 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}>
          <Filter className="w-3.5 h-3.5" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {activeCount > 0 && (
          <button onClick={onReset} className="text-xs text-red-500 font-semibold px-2 py-1.5 hover:bg-red-50 rounded-xl">Clear all</button>
        )}
      </div>

      {open && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 grid grid-cols-2 gap-3">
          {/* Status */}
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-slate-500">Status</Label>
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
              <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {BILTY_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                <SelectItem value="__unbilled__">Unbilled Only</SelectItem>
                <SelectItem value="__billed__">Billed Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Origin */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Origin / From</Label>
            <Select value={filters.origin} onValueChange={v => setFilters(f => ({ ...f, origin: v }))}>
              <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Origins</SelectItem>
                {origins.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Destination / To</Label>
            <Select value={filters.destination} onValueChange={v => setFilters(f => ({ ...f, destination: v }))}>
              <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Destinations</SelectItem>
                {destinations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Loading point */}
          {loadingPts.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Loading Point</Label>
              <Select value={filters.loadingPoint} onValueChange={v => setFilters(f => ({ ...f, loadingPoint: v }))}>
                <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Points</SelectItem>
                  {loadingPts.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Plant */}
          {plants.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Plant / Factory</Label>
              <Select value={filters.plant} onValueChange={v => setFilters(f => ({ ...f, plant: v }))}>
                <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  {plants.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment type */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Payment Type</Label>
            <Select value={filters.paymentType} onValueChange={v => setFilters(f => ({ ...f, paymentType: v }))}>
              <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="topay">To Pay</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY FILTERS HELPER
// ─────────────────────────────────────────────────────────────────────────────
function applyFilters(loads, filters, search) {
  return loads.filter(l => {
    const dateStr = l.loading_date || l.created_date || "";
    const now = new Date();

    // Period filter
    if (filters.period === "month") {
      if (!dateStr.startsWith(format(now, "yyyy-MM"))) return false;
    } else if (filters.period === "quarter") {
      const qs = startOfQuarter(now), qe = endOfQuarter(now);
      if (!dateStr || !isWithinInterval(parseISO(dateStr), { start: qs, end: qe })) return false;
    } else if (filters.period === "year") {
      const ys = startOfYear(now), ye = endOfYear(now);
      if (!dateStr || !isWithinInterval(parseISO(dateStr), { start: ys, end: ye })) return false;
    } else if (filters.period === "custom") {
      if (filters.dateFrom && dateStr < filters.dateFrom) return false;
      if (filters.dateTo   && dateStr > filters.dateTo)   return false;
    }

    // Status
    if (filters.status === "__unbilled__" && !UNBILLED_STATUSES.includes(l.status)) return false;
    if (filters.status === "__billed__"   && !BILLED_STATUSES.includes(l.status))   return false;
    if (filters.status !== "all" && filters.status !== "__unbilled__" && filters.status !== "__billed__" && l.status !== filters.status) return false;

    // Other filters
    if (filters.origin      !== "all" && l.origin        !== filters.origin)       return false;
    if (filters.destination !== "all" && l.destination   !== filters.destination)  return false;
    if (filters.loadingPoint!== "all" && l.loading_point !== filters.loadingPoint) return false;
    if (filters.plant       !== "all" && l.plant         !== filters.plant)        return false;
    if (filters.paymentType !== "all" && l.payment_type  !== filters.paymentType)  return false;

    // Search
    if (search) {
      const q = search.toLowerCase();
      const match = [l.load_number, l.origin, l.destination, l.cargo_type, l.vehicle_number, l.plant, l.loading_point]
        .some(v => v?.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PORTAL VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ClientPortalView() {
  const { fmt, settings } = useAppSettings();
  const qc = useQueryClient();

  const [activeTab, setActiveTab]         = useState("dashboard");
  const [search, setSearch]               = useState("");
  const [showNewLoad, setShowNewLoad]     = useState(false);
  const [expandedLoad, setExpandedLoad]   = useState(null);
  const [invoiceMonth, setInvoiceMonth]   = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const DEFAULT_FILTERS = { period: "all", status: "all", origin: "all", destination: "all", loadingPoint: "all", plant: "all", paymentType: "all", dateFrom: "", dateTo: "" };
  const [shipFilters,   setShipFilters]   = useState({ ...DEFAULT_FILTERS, period: "month" });
  const [billFilters,   setBillFilters]   = useState({ ...DEFAULT_FILTERS });

  // ── data fetching ──────────────────────────────────────────────────────────
  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const myClient = useMemo(() => {
    if (!currentUser) return null;
    return clients.find(c => {
      if (c.email === currentUser.email) return true;
      if (Array.isArray(c.extra_emails) && c.extra_emails.some(e => (e.address || e) === currentUser.email)) return true;
      if (Array.isArray(c.portal_users) && c.portal_users.some(u => u.email === currentUser.email)) return true;
      return false;
    }) || null;
  }, [currentUser, clients]);

  const clientName = myClient?.name || currentUser?.full_name || currentUser?.email || "Client";
  const clientId   = myClient?.id || null;

  const { data: allLoads = [], isLoading } = useQuery({
    queryKey: ["client_loads"],
    queryFn: () => base44.entities.Load.list("-created_date", 1000),
  });

  const { data: stations = [] } = useQuery({
    queryKey: ["stations"],
    queryFn: () => base44.entities.Station.list(),
  });

  const myLoads = useMemo(() =>
    allLoads.filter(l => l.client_id === clientId || l.client_name?.toLowerCase() === clientName.toLowerCase()),
    [allLoads, clientId, clientName]
  );

  // All bilties (from loads) flattened
  const myBilties = useMemo(() => {
    const arr = [];
    myLoads.forEach(load => {
      if (Array.isArray(load.bilties)) {
        load.bilties.forEach(b => arr.push({ ...b, _load_number: load.load_number, _load_id: load.id }));
      }
    });
    // Also treat each load as a "bilty" for calendar purposes
    myLoads.forEach(load => {
      if (!Array.isArray(load.bilties) || load.bilties.length === 0) {
        arr.push({ ...load, bilty_number: load.load_number, _load_number: load.load_number, _load_id: load.id });
      }
    });
    return arr;
  }, [myLoads]);

  // Mutations
  const createLoadMutation = useMutation({
    mutationFn: (data) => base44.entities.Load.create({ ...data, approval_status: "pending_approval" }),
    onSuccess: () => { qc.invalidateQueries(["client_loads"]); toast.success("Bilty generated! Awaiting admin approval."); setShowNewLoad(false); },
    onError: (err) => toast.error("Failed: " + (err?.message || "")),
  });

  // KPIs
  const now         = format(new Date(), "yyyy-MM");
  const thisMonth   = myLoads.filter(l => (l.loading_date || l.created_date || "").startsWith(now));
  const inTransit   = myLoads.filter(l => ["in_transit","dispatched","loading","order_confirmed"].includes(l.status));
  const delivered   = myLoads.filter(l => ["delivered","payment_received","completed","invoice_generated","invoice_sent"].includes(l.status));
  const outstanding = myLoads.filter(l => l.payment_type === "topay" && !["payment_received","completed","cancelled"].includes(l.status));
  const outstandingAmt = outstanding.reduce((s, l) => s + ((l.freight_amount || 0) - (l.advance_amount || 0)), 0);
  const unbilledAll = myLoads.filter(l => UNBILLED_STATUSES.includes(l.status));
  const pendingApproval = myLoads.filter(l => l.approval_status === "pending_approval");

  // Filtered loads per tab
  const filteredShipments = useMemo(() => applyFilters(myLoads, shipFilters, search), [myLoads, shipFilters, search]);
  const filteredBilling   = useMemo(() => applyFilters(myLoads, billFilters, ""), [myLoads, billFilters]);

  // Monthly summary for billing tab
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 11), end: new Date() });
    return months.map(m => {
      const key    = format(m, "yyyy-MM");
      const mLoads = myLoads.filter(l => (l.loading_date || l.created_date || "").startsWith(key));
      const unbilled = mLoads.filter(l => UNBILLED_STATUSES.includes(l.status));
      const billed   = mLoads.filter(l => BILLED_STATUSES.includes(l.status));
      return {
        month: key, label: format(m, "MMM yy"),
        count: mLoads.length,
        freight: mLoads.reduce((s, l) => s + (l.freight_amount || 0), 0),
        unbilledCount: unbilled.length,
        billedCount:   billed.length,
        unbilledAmt:   unbilled.reduce((s, l) => s + (l.freight_amount || 0), 0),
      };
    }).reverse();
  }, [myLoads]);

  const TABS = [
    { id: "dashboard",  label: "📊",  title: "Dashboard" },
    { id: "shipments",  label: "📦",  title: "Shipments" },
    { id: "billing",    label: "🧾",  title: "Billing" },
    { id: "calendar",   label: "📅",  title: "Calendar" },
  ];

  return (
    <div className="pb-32 bg-slate-50 min-h-screen">
      {showNewLoad && (
        <NewLoadModal clientName={clientName} clientId={clientId}
          onClose={() => setShowNewLoad(false)}
          onSave={(data) => createLoadMutation.mutateAsync(data)}
          stations={stations} />
      )}
      {invoiceMonth && (
        <DraftInvoiceModal loads={myLoads} month={invoiceMonth}
          clientName={clientName} fmt={fmt} onClose={() => setInvoiceMonth(null)} />
      )}

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 px-4 pt-10 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider mb-1">Client Portal</p>
            <h1 className="text-2xl font-black text-white leading-tight">{clientName}</h1>
            {myClient?.contact_person && <p className="text-sm text-blue-200 mt-0.5">{myClient.contact_person}</p>}
          </div>
          <button onClick={() => base44.auth.logout()} className="p-2 bg-white/10 rounded-xl">
            <LogOut className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Active",          value: inTransit.length,        color: "bg-blue-600/50" },
            { label: "Total Bilties",   value: myLoads.length,          color: "bg-blue-600/50" },
            { label: "Pending Approval",value: pendingApproval.length,  color: pendingApproval.length > 0 ? "bg-amber-500/80" : "bg-blue-600/50" },
            { label: "Unbilled",        value: unbilledAll.length,      color: unbilledAll.length > 0 ? "bg-orange-500/80" : "bg-blue-600/50" },
          ].map(k => (
            <div key={k.label} className={`${k.color} rounded-2xl px-2 py-3 text-center`}>
              <p className="text-xl font-black text-white">{k.value}</p>
              <p className="text-[9px] text-blue-100 font-semibold">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all border-b-2 ${
                activeTab === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400"}`}>
              <span className="text-base leading-none">{t.label}</span>
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ══ DASHBOARD ══ */}
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white">
                <Package className="w-4 h-4 text-blue-200 mb-2" />
                <p className="text-2xl font-bold">{thisMonth.length}</p>
                <p className="text-xs text-blue-200">This month</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
                <Truck className="w-4 h-4 text-orange-200 mb-2" />
                <p className="text-2xl font-bold">{inTransit.length}</p>
                <p className="text-xs text-orange-200">In transit</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
                <CheckCircle className="w-4 h-4 text-emerald-200 mb-2" />
                <p className="text-2xl font-bold">{delivered.length}</p>
                <p className="text-xs text-emerald-200">Delivered</p>
              </div>
              <div className={`bg-gradient-to-br ${outstandingAmt > 0 ? "from-red-500 to-red-600" : "from-slate-600 to-slate-700"} rounded-2xl p-4 text-white`}>
                <AlertCircle className="w-4 h-4 text-red-200 mb-2" />
                <p className="text-xl font-bold">{fmt(outstandingAmt)}</p>
                <p className="text-xs text-red-200">{outstanding.length} unpaid</p>
              </div>
            </div>

            {/* Unbilled alert */}
            {unbilledAll.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-800">{unbilledAll.length} Unbilled Shipments</p>
                    <p className="text-xs text-orange-600">Amount: {fmt(unbilledAll.reduce((s,l) => s+(l.freight_amount||0), 0))}</p>
                  </div>
                </div>
                <button onClick={() => { setActiveTab("billing"); setBillFilters(f => ({ ...f, status: "__unbilled__" })); }}
                  className="text-xs text-orange-600 font-bold hover:underline">View →</button>
              </div>
            )}

            {/* Active shipments */}
            {inTransit.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">🚚 Active Shipments</h3>
                  <span className="text-xs text-slate-400">{inTransit.length}</span>
                </div>
                {inTransit.slice(0, 4).map(l => (
                  <div key={l.id} className="px-4 py-3 border-b border-slate-50 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-bold text-slate-800">#{l.load_number}</p>
                          <StatusBadge status={l.status} />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span>{l.origin}</span><ArrowRight className="w-3 h-3" /><span>{l.destination}</span>
                        </div>
                      </div>
                      {l.loading_date && <p className="text-xs text-slate-400">{format(parseISO(l.loading_date), "dd MMM")}</p>}
                    </div>
                  </div>
                ))}
                {inTransit.length > 4 && (
                  <button onClick={() => setActiveTab("shipments")} className="w-full py-2.5 text-xs text-blue-600 font-semibold hover:bg-blue-50">
                    View all {inTransit.length} →
                  </button>
                )}
              </div>
            )}

            {/* Pending approval alert */}
            {pendingApproval.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-800">{pendingApproval.length} Bilty{pendingApproval.length > 1 ? "s" : ""} Pending Approval</p>
                    <p className="text-xs text-amber-600">Waiting for admin confirmation</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setShowNewLoad(true)}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><Plus className="w-5 h-5 text-blue-600" /></div>
                <p className="text-xs font-bold text-slate-700 text-center">Generate Bilty</p>
              </button>
              <button onClick={() => setActiveTab("billing")}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 hover:border-purple-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-purple-600" /></div>
                <p className="text-xs font-bold text-slate-700 text-center">Billing</p>
              </button>
              <button onClick={() => setActiveTab("calendar")}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><Calendar className="w-5 h-5 text-emerald-600" /></div>
                <p className="text-xs font-bold text-slate-700 text-center">Calendar</p>
              </button>
            </div>
          </>
        )}

        {/* ══ SHIPMENTS ══ */}
        {activeTab === "shipments" && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by load #, route, cargo…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl bg-white border-slate-200" />
            </div>

            <FilterBar loads={myLoads} filters={shipFilters} setFilters={setShipFilters}
              onReset={() => setShipFilters({ ...DEFAULT_FILTERS, period: "month" })} />

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">{filteredShipments.length} shipments</p>
              <button onClick={() => setShowNewLoad(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Generate Bilty
              </button>
            </div>

            {isLoading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20 border border-slate-100" />)
            ) : filteredShipments.length === 0 ? (
              <div className="text-center py-12"><Package className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-sm text-slate-400">No shipments found</p></div>
            ) : (
              filteredShipments.map(load => {
                const biltiesForLoad = Array.isArray(load.bilties) ? load.bilties : [];
                const isExp = expandedLoad === load.id;
                const isUnbilled = UNBILLED_STATUSES.includes(load.status);
                return (
                  <div key={load.id} className={`bg-white rounded-2xl border overflow-hidden ${isUnbilled ? "border-orange-100" : "border-slate-100"}`}>
                    <button onClick={() => setExpandedLoad(isExp ? null : load.id)} className="w-full p-4 text-left">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                          <p className="text-sm font-bold text-slate-900">#{load.load_number}</p>
                          <StatusBadge status={load.status} />
                          {load.approval_status === "pending_approval" && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">⏳ Pending Approval</span>}
                          {isUnbilled && <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">Unbilled</span>}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${load.payment_type === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                            {load.payment_type === "paid" ? "PAID" : "TO PAY"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {load.payment_type === "topay" && load.freight_amount > 0 && <span className="text-sm font-bold text-slate-800">{fmt(load.freight_amount)}</span>}
                          {isExp ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        <MapPin className="w-3 h-3 text-blue-400 shrink-0" /><span>{load.origin}</span>
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <MapPin className="w-3 h-3 text-green-400 shrink-0" /><span>{load.destination}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        {load.plant && <span>🏭 {load.plant}</span>}
                        {load.loading_point && <span>📍 {load.loading_point}</span>}
                        {load.vehicle_number && <span>🚛 {load.vehicle_number}</span>}
                        {load.loading_date && <span>📅 {format(parseISO(load.loading_date), "dd MMM yyyy")}</span>}
                      </div>
                    </button>
                    {isExp && (
                      <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 space-y-2">
                        {load.cargo_type && <p className="text-xs text-slate-600">📦 {load.cargo_type}{load.weight_tons ? ` · ${load.weight_tons}T` : ""}</p>}
                        {load.notes && <p className="text-xs text-slate-500 italic">"{load.notes}"</p>}
                        {biltiesForLoad.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Bilties ({biltiesForLoad.length})</p>
                            {biltiesForLoad.map((b, i) => (
                              <div key={i} className="bg-white rounded-xl px-3 py-2.5 flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <p className="text-xs font-bold text-slate-800">#{b.bilty_number}</p>
                                    <StatusBadge status={b.status} />
                                  </div>
                                  <p className="text-[10px] text-slate-400">{b.vehicle_number} · {b.origin} → {b.destination}</p>
                                </div>
                                {b.payment_type === "topay" && b.freight_amount > 0 && <span className="text-xs font-bold text-slate-700">{fmt(b.freight_amount)}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ══ BILLING ══ */}
        {activeTab === "billing" && (
          <>
            <FilterBar loads={myLoads} filters={billFilters} setFilters={setBillFilters}
              onReset={() => setBillFilters({ ...DEFAULT_FILTERS })} />

            {/* Unbilled summary banner */}
            {(() => {
              const ubLoads = filteredBilling.filter(l => UNBILLED_STATUSES.includes(l.status));
              const bLoads  = filteredBilling.filter(l => BILLED_STATUSES.includes(l.status));
              if (ubLoads.length === 0 && bLoads.length === 0) return null;
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
                    <p className="text-xs text-orange-500 font-semibold mb-1">⏳ Unbilled</p>
                    <p className="text-xl font-black text-orange-700">{ubLoads.length}</p>
                    <p className="text-xs text-orange-600 font-semibold mt-0.5">{fmt(ubLoads.reduce((s,l) => s+(l.freight_amount||0), 0))}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
                    <p className="text-xs text-green-500 font-semibold mb-1">✅ Billed</p>
                    <p className="text-xl font-black text-green-700">{bLoads.length}</p>
                    <p className="text-xs text-green-600 font-semibold mt-0.5">{fmt(bLoads.reduce((s,l) => s+(l.freight_amount||0), 0))}</p>
                  </div>
                </div>
              );
            })()}

            {/* Monthly breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Monthly Billing Summary</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {monthlyData.filter(m => m.count > 0).map(m => (
                  <div key={m.month} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{format(new Date(m.month + "-01"), "MMMM yyyy")}</p>
                        <p className="text-xs text-slate-400">{m.count} loads · {fmt(m.freight)}</p>
                      </div>
                      <button onClick={() => setInvoiceMonth(m.month)}
                        className="text-[10px] text-purple-600 font-bold hover:underline flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3" /> Statement
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {m.billedCount > 0 && (
                        <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
                          <p className="text-xs font-bold text-green-700">{m.billedCount} billed</p>
                        </div>
                      )}
                      {m.unbilledCount > 0 && (
                        <div className="flex-1 bg-orange-50 rounded-xl p-2 text-center">
                          <p className="text-xs font-bold text-orange-600">{m.unbilledCount} unbilled</p>
                          <p className="text-[10px] text-orange-500">{fmt(m.unbilledAmt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {monthlyData.every(m => m.count === 0) && (
                  <p className="text-xs text-slate-400 text-center py-8">No billing data</p>
                )}
              </div>
            </div>

            {/* Filtered billing list */}
            {filteredBilling.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-semibold">{filteredBilling.length} loads in selection</p>
                {filteredBilling.slice(0, 20).map(l => (
                  <div key={l.id} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-xs font-bold text-slate-800">#{l.load_number}</p>
                        <StatusBadge status={l.status} />
                        {UNBILLED_STATUSES.includes(l.status) && <span className="text-[9px] bg-orange-100 text-orange-600 font-bold px-1 py-0.5 rounded-full">Unbilled</span>}
                      </div>
                      <p className="text-[10px] text-slate-400">{l.origin} → {l.destination} · {l.loading_date ? format(parseISO(l.loading_date), "dd MMM yy") : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800">{fmt(l.freight_amount || 0)}</p>
                      <p className={`text-[10px] font-bold ${l.payment_type === "paid" ? "text-green-600" : "text-orange-600"}`}>
                        {l.payment_type === "paid" ? "PAID" : "TO PAY"}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredBilling.length > 20 && (
                  <p className="text-xs text-slate-400 text-center py-2">Showing 20 of {filteredBilling.length} — apply filters to narrow down</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ══ CALENDAR ══ */}
        {activeTab === "calendar" && (
          <BiltyCalendar allBilties={myBilties} fmt={fmt} />
        )}

      </div>

      {/* FAB */}
      <button onClick={() => setShowNewLoad(true)}
        className="fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center z-40 transition-all active:scale-95">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTING STAFF VIEW — Expandable + Printable per client
// ─────────────────────────────────────────────────────────────────────────────
function AccountingView() {
  const { fmt } = useAppSettings();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["accounting_entries"],
    queryFn: () => base44.entities.AccountingEntry.list("-date", 1000),
  });

  const { data: loads = [] } = useQuery({
    queryKey: ["loads"],
    queryFn: () => base44.entities.Load.list("-loading_date", 500),
  });

  const clientEntries = entries.filter(e => e.account_type === "client");
  const clientSummary = clients
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .map(c => {
      const ces = clientEntries.filter(e => e.account_name === c.name || e.account_name === c.id);
      const clientLoads = loads.filter(l => l.client_name === c.name || l.client_id === c.id);
      const totalDebit  = ces.reduce((s, e) => s + (e.debit  || 0), 0);
      const totalCredit = ces.reduce((s, e) => s + (e.credit || 0), 0);
      const loadRevenue = clientLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
      return { ...c, ces, clientLoads, totalDebit, totalCredit, balance: totalDebit - totalCredit, loadRevenue };
    });

  const totalReceivable = clientSummary.reduce((s, c) => s + Math.max(0, c.balance), 0);

  const printClientLedger = (c) => {
    const cp = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
    const html = `<!DOCTYPE html><html><head><title>Client Ledger — ${c.name}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;font-size:12px}
    h1{font-size:16px;font-weight:bold}h2{font-size:12px;text-transform:uppercase;color:#64748b;margin:16px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:3px}
    table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#1e293b;color:#fff;padding:6px 8px;text-align:left;font-size:11px}
    td{padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:11px}.right{text-align:right}.dr{color:#dc2626}.cr{color:#16a34a}
    .total{font-weight:bold;background:#f8fafc}</style></head><body>
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #f97316;padding-bottom:10px;margin-bottom:16px">
      <div><h1>${cp?.company_name || "Company"}</h1><p style="color:#64748b">Client Ledger</p></div>
      <div style="text-align:right"><h1>${c.name}</h1><p style="color:#64748b">${c.phone || ""}</p></div>
    </div>
    <h2>Account Entries</h2>
    <table><thead><tr><th>Date</th><th>Description</th><th>Entry Type</th><th class="right">Debit (Dr)</th><th class="right">Credit (Cr)</th></tr></thead>
    <tbody>${c.ces.map(e => `<tr><td>${e.date}</td><td>${e.description || e.account_name}</td><td>${e.entry_type}</td>
    <td class="right dr">${e.debit > 0 ? "₨" + e.debit.toLocaleString() : "—"}</td>
    <td class="right cr">${e.credit > 0 ? "₨" + e.credit.toLocaleString() : "—"}</td></tr>`).join("")}
    <tr class="total"><td colspan="3">Total</td><td class="right dr">₨${c.totalDebit.toLocaleString()}</td><td class="right cr">₨${c.totalCredit.toLocaleString()}</td></tr>
    </tbody></table>
    <h2>Load History (${c.clientLoads.length} loads)</h2>
    <table><thead><tr><th>Date</th><th>Load #</th><th>Origin → Destination</th><th>Status</th><th class="right">Freight</th></tr></thead>
    <tbody>${c.clientLoads.slice(0, 50).map(l => `<tr><td>${l.loading_date || ""}</td><td>${l.load_number}</td><td>${l.origin} → ${l.destination}</td><td>${l.status}</td>
    <td class="right">₨${(l.freight_amount || 0).toLocaleString()}</td></tr>`).join("")}
    <tr class="total"><td colspan="4">Total Revenue</td><td class="right">₨${c.loadRevenue.toLocaleString()}</td></tr>
    </tbody></table>
    <div style="margin-top:16px;padding:10px;background:#f8fafc;border-radius:6px">
      <strong>Balance: </strong><span style="color:${c.balance > 0 ? "#dc2626" : "#16a34a"}">${c.balance > 0 ? "Dr ₨" + c.balance.toLocaleString() + " (Receivable)" : c.balance < 0 ? "Cr ₨" + Math.abs(c.balance).toLocaleString() + " (Advance)" : "Settled"}</span>
    </div>
    <p style="margin-top:20px;font-size:10px;color:#94a3b8">Printed: ${new Date().toLocaleString()}</p>
    </body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
  };

  const printAllLedger = () => {
    const cp = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
    const html = `<!DOCTYPE html><html><head><title>All Client Accounts</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:16px}
    table{width:100%;border-collapse:collapse}th{background:#1e293b;color:#fff;padding:6px 8px;font-size:11px;text-align:left}
    td{padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:11px}.right{text-align:right}.dr{color:#dc2626}.cr{color:#16a34a}</style></head><body>
    <h1>${cp?.company_name || "Company"} — All Client Accounts</h1>
    <p style="color:#64748b;font-size:11px">Total Receivable: ₨${totalReceivable.toLocaleString()} · Printed: ${new Date().toLocaleString()}</p>
    <table><thead><tr><th>Client</th><th>City</th><th>Loads</th><th class="right">Load Revenue</th><th class="right">Ledger Dr</th><th class="right">Ledger Cr</th><th class="right">Balance</th></tr></thead>
    <tbody>${clientSummary.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.city || ""}</td><td>${c.clientLoads.length}</td>
    <td class="right">₨${c.loadRevenue.toLocaleString()}</td>
    <td class="right dr">₨${c.totalDebit.toLocaleString()}</td>
    <td class="right cr">₨${c.totalCredit.toLocaleString()}</td>
    <td class="right" style="color:${c.balance > 0 ? "#dc2626" : "#16a34a"};font-weight:bold">${c.balance > 0 ? "Dr ₨" + c.balance.toLocaleString() : c.balance < 0 ? "Cr ₨" + Math.abs(c.balance).toLocaleString() : "Settled"}</td></tr>`).join("")}
    </tbody></table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
  };

  return (
    <div className="pb-24">
      <MobileHeader title="Client Accounts" backTo="Accounting" rightAction={
        <button onClick={printAllLedger} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-xl">
          <Printer className="w-3.5 h-3.5" /> Print All
        </button>
      } />
      <div className="px-4 py-4">
        <div className="bg-blue-50 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div><p className="text-xs text-blue-600">Total Receivable</p><p className="text-xl font-bold text-blue-700">{fmt(totalReceivable)}</p></div>
          <Users className="w-8 h-8 text-blue-300" />
        </div>
        <Input placeholder="Search client..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />
        <div className="space-y-2">
          {clientSummary.map(c => {
            const isOpen = expanded === c.id;
            // Running balance for individual entries
            let running = 0;
            const entriesWithBalance = c.ces.map(e => {
              running += (e.debit || 0) - (e.credit || 0);
              return { ...e, running };
            });
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <button className="flex-1 text-left" onClick={() => setExpanded(isOpen ? null : c.id)}>
                      <p className="text-sm font-bold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.city} · {c.phone}</p>
                      <p className="text-xs text-slate-400">{c.clientLoads.length} loads · Rev: {fmt(c.loadRevenue)}</p>
                    </button>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className={`text-sm font-bold ${c.balance > 0 ? "text-red-500" : c.balance < 0 ? "text-green-600" : "text-slate-400"}`}>
                        {c.balance > 0 ? `Dr ${fmt(c.balance)}` : c.balance < 0 ? `Cr ${fmt(Math.abs(c.balance))}` : "Settled"}
                      </p>
                      {(c.totalDebit > 0 || c.totalCredit > 0) && (
                        <div className="text-[10px] text-slate-400">
                          <span className="text-red-400">Dr {fmt(c.totalDebit)}</span> · <span className="text-green-600">Cr {fmt(c.totalCredit)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <button onClick={() => printClientLedger(c)}
                          className="flex items-center gap-1 text-[10px] text-slate-600 font-semibold bg-white border border-slate-200 px-2 py-1 rounded-lg hover:border-blue-300">
                          <Printer className="w-3 h-3" /> View
                        </button>
                        <button onClick={() => setExpanded(isOpen ? null : c.id)} className="p-1">
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Ledger Entries</p>
                      <button onClick={() => printClientLedger(c)} className="flex items-center gap-1 text-[10px] text-slate-600 font-semibold bg-white border border-slate-200 px-2 py-1 rounded-lg">
                        <Printer className="w-3 h-3" /> Print Ledger
                      </button>
                    </div>
                    {entriesWithBalance.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No ledger entries</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-[10px]">
                          <thead className="bg-slate-100 sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2">Date</th>
                              <th className="text-left px-3 py-2">Description</th>
                              <th className="text-right px-3 py-2 text-red-500">Dr</th>
                              <th className="text-right px-3 py-2 text-green-600">Cr</th>
                              <th className="text-right px-3 py-2">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entriesWithBalance.map((e, i) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                <td className="px-3 py-2">{e.date}</td>
                                <td className="px-3 py-2 truncate max-w-[100px]">{e.description || e.entry_type}</td>
                                <td className="px-3 py-2 text-right text-red-500 font-semibold">{e.debit > 0 ? fmt(e.debit) : "—"}</td>
                                <td className="px-3 py-2 text-right text-green-600 font-semibold">{e.credit > 0 ? fmt(e.credit) : "—"}</td>
                                <td className={`px-3 py-2 text-right font-bold ${e.running > 0 ? "text-red-500" : "text-green-600"}`}>
                                  {fmt(Math.abs(e.running))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Load history summary */}
                    {c.clientLoads.length > 0 && (
                      <div className="border-t border-slate-100 px-4 py-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Recent Loads</p>
                        {c.clientLoads.slice(0, 5).map(l => (
                          <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                            <div>
                              <p className="text-[10px] font-bold text-slate-800">{l.load_number}</p>
                              <p className="text-[9px] text-slate-400">{l.origin} → {l.destination} · {l.loading_date}</p>
                            </div>
                            <p className="text-[10px] font-bold text-blue-700">{fmt(l.freight_amount || 0)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {clientSummary.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No clients found</p>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function ClientAccounts() {
  const { canSeeAccounting, isClient } = useRole();
  if (isClient) return <ClientPortalView />;
  if (!canSeeAccounting) return <AccessDenied />;
  return <AccountingView />;
}