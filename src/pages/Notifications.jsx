import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell, BellOff, CheckCheck, Trash2, Plus, X, AlertTriangle,
  DollarSign, Truck, Package, Info, Settings, Check, ChevronRight, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TYPE_CONFIG = {
  payment_overdue: { icon: DollarSign, bg: "bg-red-50", text: "text-red-600", border: "border-red-100", label: "Payment Overdue" },
  load_assigned: { icon: Package, bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", label: "Load Assigned" },
  fleet_alert: { icon: Truck, bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100", label: "Fleet Alert" },
  invoice_due: { icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", label: "Invoice Due" },
  maintenance_due: { icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Maintenance Due" },
  defect_reported: { icon: AlertTriangle, bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Defect Reported" },
  document_expiry: { icon: Info, bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", label: "Document Expiry" },
  general: { icon: Info, bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-100", label: "General" },
};

const PRIORITY_BADGE = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-500",
};

const PREFS_KEY = "notif_prefs_v1";
const DEFAULT_PREFS = { payment_overdue: true, load_assigned: true, fleet_alert: true, invoice_due: true, general: true };

function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; } catch { return DEFAULT_PREFS; }
}

export default function Notifications() {
  const { isAdmin, user } = useRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("inbox"); // inbox | settings
  const [showCreate, setShowCreate] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [form, setForm] = useState({ title: "", message: "", type: "general", priority: "medium", target_user_email: "" });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => base44.entities.AppNotification.list("-created_date", 100),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.AppNotification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppNotification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AppNotification.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); setShowCreate(false); toast.success("Notification sent"); },
  });

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.AppNotification.update(n.id, { is_read: true })));
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All marked as read");
  };

  const togglePref = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    toast.success(`${key.replace(/_/g, " ")} notifications ${updated[key] ? "enabled" : "disabled"}`);
  };

  const filteredNotifs = notifications.filter(n => prefs[n.type] !== false);
  const unreadCount = filteredNotifs.filter(n => !n.is_read).length;

  return (
    <div className="pb-28">
      <MobileHeader
        title={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
        backTo="Dashboard"
        rightAction={
          isAdmin && (
            <button onClick={() => setShowCreate(true)} className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold">
              + Send
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-2">
        {["inbox", "settings"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
            {t === "inbox" ? `📬 Inbox${unreadCount > 0 ? ` · ${unreadCount}` : ""}` : "⚙️ Preferences"}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {tab === "inbox" && (
          <>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-2 text-blue-600 text-xs font-semibold w-full justify-end">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
              </button>
            )}
            {isLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
            ) : filteredNotifs.length === 0 ? (
              <div className="text-center py-16">
                <BellOff className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">All caught up!</p>
              </div>
            ) : (
              filteredNotifs.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
                const Icon = cfg.icon;
                return (
                  <div key={n.id} className={`rounded-2xl border p-4 ${n.is_read ? "bg-white border-slate-100" : `${cfg.bg} ${cfg.border} border`}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${n.is_read ? "bg-slate-100" : cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${n.is_read ? "text-slate-400" : cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold ${n.is_read ? "text-slate-600" : "text-slate-900"}`}>{n.title}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_BADGE[n.priority]}`}>{n.priority}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          {n.created_date ? format(new Date(n.created_date), "dd MMM, hh:mm a") : ""}
                          {n.target_user_email && ` · To: ${n.target_user_email}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                      {!n.is_read && (
                        <button onClick={() => markReadMutation.mutate(n.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg">
                          <Check className="w-3 h-3" /> Read
                        </button>
                      )}
                      <button onClick={() => deleteMutation.mutate(n.id)}
                        className="flex items-center gap-1 text-xs text-red-400 font-semibold bg-red-50 px-3 py-1.5 rounded-lg">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {tab === "settings" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Notification Preferences</p>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const enabled = prefs[key] !== false;
              return (
                <div key={key} className={`flex items-center gap-3 bg-white rounded-2xl border border-slate-100 px-4 py-3.5 ${!enabled ? "opacity-60" : ""}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{cfg.label}</p>
                    <p className="text-[10px] text-slate-400">{enabled ? "Showing in inbox" : "Hidden"}</p>
                  </div>
                  <button onClick={() => togglePref(key)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-blue-600" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${enabled ? "left-5.5 translate-x-0.5" : "left-0.5"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Notification Modal (admin) */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="bg-white w-full max-h-[80vh] rounded-t-3xl overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <p className="font-bold text-slate-900">Send Notification</p>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-4 py-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Title *</p>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Notification title" className="rounded-xl" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Message *</p>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Notification message..." rows={3}
                  className="w-full rounded-xl border border-input px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Type</p>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Priority</p>
                  <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">🔴 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">⚪ Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Target User (optional)</p>
                <Input value={form.target_user_email} onChange={e => setForm(p => ({ ...p, target_user_email: e.target.value }))}
                  placeholder="user@email.com (blank = all)" className="rounded-xl" />
              </div>
              <div className="flex gap-3 pt-1 pb-4">
                <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.message} className="flex-1 rounded-xl bg-slate-900">
                  <Bell className="w-4 h-4 mr-1" /> Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}