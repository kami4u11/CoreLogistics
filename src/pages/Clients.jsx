import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import ClientForm from "@/components/forms/ClientForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, Search, Phone, MapPin, Pencil, Trash2,
  ChevronDown, ChevronUp, ArrowRight, Shield, X,
  CheckCircle, UserCheck, Globe, Lock, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Grant Portal Access Modal ─────────────────────────────────────────────────
function PortalAccessModal({ client, onClose }) {
  const qc = useQueryClient();

  const existingUsers = Array.isArray(client.portal_users) ? client.portal_users : (
    client.portal_email ? [{ email: client.portal_email, label: "Primary", granted_at: "", user_id: "" }] : []
  );

  const [users, setUsers]       = useState(existingUsers);

  // Re-sync users if the client prop changes (e.g. after query invalidation)
  useEffect(() => {
    const fresh = Array.isArray(client.portal_users) ? client.portal_users : (
      client.portal_email ? [{ email: client.portal_email, label: "Primary", granted_at: "", user_id: "" }] : []
    );
    setUsers(fresh);
  }, [client.portal_users, client.portal_email]);
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving]     = useState(false);
  const [actionState, setActionState] = useState({});

  const saveToClient = async (updatedUsers) => {
    await base44.entities.Client.update(client.id, {
      portal_users:   updatedUsers,
      portal_enabled: updatedUsers.length > 0,
      portal_email:   updatedUsers[0]?.email || "",
    });
    await qc.refetchQueries(["clients"]);
  };

  // ── Add new email ──────────────────────────────────────────────────────────
  // Saves email to portal_users on Client entity. useRole.jsx detects client by checking portal_users.
  const handleAdd = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) { toast.error("Enter an email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { toast.error("Enter a valid email"); return; }
    if (users.find(u => u.email.toLowerCase() === trimmed)) { toast.error("This email already has access"); return; }

    setSaving(true);
    try {
      // Save email to portal_users on the Client entity.
      // useRole.jsx detects client role by checking portal_users — no system role update needed.
      const updated = [...users, {
        email:      trimmed,
        label:      newLabel.trim() || "Staff",
        granted_at: new Date().toISOString().slice(0, 10),
        user_id:    "",
      }];
      await saveToClient(updated);
      setUsers(updated);
      setNewEmail("");
      setNewLabel("");
      toast.success(`Portal access granted to ${trimmed}`);
    } catch (err) {
      toast.error("Failed: " + (err?.message || ""));
    }
    setSaving(false);
  };

  // ── Change email ───────────────────────────────────────────────────────────
  const handleChangeEmail = async (oldEmail, newEmailVal) => {
    const trimmed = newEmailVal.trim().toLowerCase();
    if (!trimmed || trimmed === oldEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { toast.error("Invalid email"); return; }
    if (users.find(u => u.email.toLowerCase() === trimmed)) { toast.error("Email already has access"); return; }

    setActionState(s => ({ ...s, [oldEmail]: "saving" }));
    try {
      const updated = users.map(u =>
        u.email === oldEmail
          ? { ...u, email: trimmed, changed_at: new Date().toISOString().slice(0, 10) }
          : u
      );
      await saveToClient(updated);
      setUsers(updated);
      setActionState(s => ({ ...s, [trimmed]: null }));
      toast.success("Email updated");
    } catch (err) {
      toast.error("Failed: " + (err?.message || ""));
    }
    setActionState(s => ({ ...s, [oldEmail]: null }));
  };

  // ── Revoke single ──────────────────────────────────────────────────────────
  const handleRevokeSingle = async (emailToRevoke) => {
    if (!window.confirm(`Remove portal access for ${emailToRevoke}?`)) return;
    setActionState(s => ({ ...s, [emailToRevoke]: "revoking" }));
    try {
      const updated = users.filter(u => u.email !== emailToRevoke);
      await saveToClient(updated);
      setUsers(updated);
      toast.success(`Access revoked for ${emailToRevoke}`);
    } catch (err) {
      toast.error("Failed: " + (err?.message || ""));
    }
    setActionState(s => ({ ...s, [emailToRevoke]: null }));
  };

  // ── Revoke ALL ─────────────────────────────────────────────────────────────
  const handleRevokeAll = async () => {
    if (!window.confirm("Revoke portal access for ALL users of this client?")) return;
    setSaving(true);
    try {
      await saveToClient([]);
      setUsers([]);
      toast.success("All portal access revoked");
    } catch (err) {
      toast.error("Failed: " + (err?.message || ""));
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Portal Access</h2>
              <p className="text-xs text-slate-500">{client.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {users.length > 0 && (
              <button onClick={handleRevokeAll} disabled={saving}
                className="text-xs text-red-500 font-semibold px-2 py-1 hover:bg-red-50 rounded-lg transition-colors">
                Revoke All
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {users.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <Globe className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-amber-700">No Portal Users Yet</p>
              <p className="text-xs text-amber-600">Add emails below to grant access.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">{users.length} user{users.length > 1 ? "s" : ""} with access</p>
                <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" /> Portal Active
                </span>
              </div>
              {users.map((u) => (
                <UserRow
                  key={u.email}
                  user={u}
                  actionState={actionState[u.email]}
                  onChangeEmail={(newE) => handleChangeEmail(u.email, newE)}
                  onRevoke={() => handleRevokeSingle(u.email)}
                />
              ))}
            </div>
          )}

          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-700">Add New User</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address *</Label>
              <Input
                type="email" value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="employee@company.com"
                className="rounded-xl bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Label / Role <span className="text-slate-400">(optional)</span></Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. Manager, Finance, Logistics" className="rounded-xl bg-white" />
            </div>
            <p className="text-[10px] text-slate-400">
              If this person hasn't signed up yet, their email is saved and access activates when they join. They'll only see <span className="font-semibold">{client.name}</span>'s data.
            </p>
            <button onClick={handleAdd} disabled={saving || !newEmail.trim()}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              <UserCheck className="w-4 h-4" />
              {saving ? "Granting…" : "Grant Access"}
            </button>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 space-y-1 text-xs text-blue-700">
            <p className="font-bold mb-1">All portal users can:</p>
            <p>✅ View loads & bilties for <span className="font-semibold">{client.name}</span> only</p>
            <p>✅ Request new loads (you confirm them)</p>
            <p>✅ View monthly reports & draft invoices</p>
            <p>🚫 Cannot edit, delete, or see any other data</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, actionState, onChangeEmail, onRevoke }) {
  const [editing, setEditing]     = useState(false);
  const [editEmail, setEditEmail] = useState(user.email);
  const isBusy = actionState === "saving" || actionState === "revoking";

  const handleSave = () => {
    if (editEmail.trim() === user.email) { setEditing(false); return; }
    onChangeEmail(editEmail);
    setEditing(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5">
      {editing ? (
        <div className="flex items-center gap-2">
          <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter") handleSave(); if (e.key==="Escape") { setEditing(false); setEditEmail(user.email); }}}
            className="flex-1 rounded-lg text-xs h-8" autoFocus />
          <button onClick={handleSave} className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">Save</button>
          <button onClick={() => { setEditing(false); setEditEmail(user.email); }} className="px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.email}</p>
              {user.label && <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full">{user.label}</span>}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${user.pending ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                <CheckCircle className="w-2 h-2" /> {user.pending ? "Pending signup" : "Active"}
              </span>
            </div>
            {user.granted_at && <p className="text-[10px] text-slate-400 mt-0.5">Granted {user.granted_at}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(true)} disabled={isBusy}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Change email">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRevoke} disabled={isBusy}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors" title="Revoke access">
              {actionState === "revoking" ? <span className="text-[10px] text-red-400">…</span> : <Lock className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Clients() {
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [search, setSearch]             = useState("");
  const [expandedClient, setExpandedClient] = useState(null);
  const [portalClient, setPortalClient] = useState(null);
  const queryClient                     = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });
  const { data: loads = [] } = useQuery({
    queryKey: ["loads"],
    queryFn: () => base44.entities.Load.list("-created_date", 500),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setShowForm(false); toast.success("Client added"); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setEditing(null); setShowForm(false); toast.success("Client updated"); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Client deleted"); },
  });

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (data) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const getClientLoads    = (c) => loads.filter(l => l.client_id === c.id || l.client_name === c.name);
  const getClientInvoices = (c) => invoices.filter(i => i.client_id === c.id || i.client_name === c.name);

  return (
    <div className="pb-24">
      {portalClient && (
        <PortalAccessModal
          client={clients.find(c => c.id === portalClient.id) || portalClient}
          onClose={() => setPortalClient(null)}
        />
      )}

      <MobileHeader title="Clients" backTo="Dashboard" onAdd={() => { setEditing(null); setShowForm(true); }} />

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl bg-slate-50 border-slate-200" />
        </div>
      </div>

      <div className="px-4 space-y-2.5">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-32 mb-2" /><div className="h-3 bg-slate-50 rounded w-48" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No clients yet" description="Add your first client to start managing cargo."
            action={<Button onClick={() => setShowForm(true)} className="rounded-xl bg-slate-900">Add Client</Button>} />
        ) : (
          filtered.map((client) => {
            const clientLoads    = getClientLoads(client);
            const clientInvoices = getClientInvoices(client);
            const totalQuoted    = clientLoads.reduce((s, l) => s + (l.freight_amount || 0), 0);
            const totalPending   = clientInvoices.filter(i => ["sent","partial","overdue"].includes(i.status)).reduce((s, i) => s + (i.balance_amount || 0), 0);
            const isExpanded     = expandedClient === client.id;

            return (
              <div key={client.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <button className="flex-1 text-left" onClick={() => setExpandedClient(isExpanded ? null : client.id)}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900">{client.name}</h3>
                        <StatusBadge status={client.status} />
                        {client.portal_enabled && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                            <Globe className="w-2.5 h-2.5" /> Portal Active
                          </span>
                        )}
                      </div>
                      {client.contact_person && <p className="text-xs text-slate-500">{client.contact_person}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        {client.phone && <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-blue-600" onClick={e => e.stopPropagation()}><Phone className="w-3 h-3" />{client.phone}</a>}
                        {client.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{client.city}</span>}
                      </div>
                      {clientLoads.length > 0 && (
                        <div className="flex gap-3 mt-2 text-xs flex-wrap">
                          <span className="text-slate-500">{clientLoads.length} loads</span>
                          <span className="text-blue-600">₨{totalQuoted.toLocaleString()} quoted</span>
                          {totalPending > 0 && <span className="text-red-500">₨{totalPending.toLocaleString()} pending</span>}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button onClick={() => setPortalClient(client)} className={`p-2 rounded-lg transition-colors ${client.portal_enabled ? "hover:bg-blue-50 text-blue-500" : "hover:bg-slate-100 text-slate-400"}`} title="Manage portal access">
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setExpandedClient(isExpanded ? null : client.id)} className="p-2 rounded-lg hover:bg-slate-100">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      <button onClick={() => { setEditing(client); setShowForm(true); }} className="p-2 rounded-lg hover:bg-slate-100">
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button onClick={() => { if (confirm("Delete this client?")) deleteMutation.mutate(client.id); }} className="p-2 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 p-3">
                    <button onClick={() => setPortalClient(client)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 border transition-all ${client.portal_enabled ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"}`}>
                      <div className="flex items-center gap-2">
                        {client.portal_enabled ? <Globe className="w-3.5 h-3.5 text-blue-600" /> : <Shield className="w-3.5 h-3.5 text-slate-400" />}
                        <div className="text-left">
                          <p className="text-xs font-bold">{client.portal_enabled ? "Portal Access Active" : "Grant Portal Access"}</p>
                          {client.portal_enabled && <p className="text-[10px] opacity-70">{client.portal_email}</p>}
                          {!client.portal_enabled && <p className="text-[10px] text-slate-400">Let this client track their shipments online</p>}
                        </div>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 opacity-50 -rotate-90" />
                    </button>

                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Transaction History</p>
                    {clientLoads.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No transactions yet</p>
                    ) : (
                      <div className="space-y-2">
                        {clientLoads.map(load => {
                          const inv = clientInvoices.find(i => i.load_id === load.id || i.load_number === load.load_number);
                          const isPaid = inv?.status === "paid";
                          const isPending = inv && !isPaid;
                          return (
                            <div key={load.id} className="bg-white rounded-xl p-3 border border-slate-100">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-bold text-slate-800">{load.load_number}</span>
                                    <StatusBadge status={load.status} />
                                  </div>
                                  {load.loading_date && <p className="text-xs text-slate-400">{format(new Date(load.loading_date), "dd MMM yyyy")}</p>}
                                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                    <span>{load.origin}</span><ArrowRight className="w-3 h-3" /><span>{load.destination}</span>
                                  </div>
                                  {load.vehicle_number && <p className="text-xs text-slate-400 mt-0.5">🚛 {load.vehicle_number}</p>}
                                </div>
                                <div className="text-right ml-2 shrink-0">
                                  {load.freight_amount > 0 && <p className="text-xs font-bold text-blue-700">₨{load.freight_amount.toLocaleString()}</p>}
                                  {isPaid && <span className="text-xs text-emerald-600 font-semibold">✅ Paid</span>}
                                  {isPending && <span className="text-xs text-red-500 font-semibold">⚠️ Pending ₨{inv.balance_amount?.toLocaleString()}</span>}
                                  {!inv && load.balance_amount > 0 && <span className="text-xs text-amber-500">Balance: ₨{load.balance_amount?.toLocaleString()}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <ClientForm client={editing} onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          isSubmitting={createMutation.isPending || updateMutation.isPending} />
      )}
    </div>
  );
}