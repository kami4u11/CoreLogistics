import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MobileHeader from "@/components/ui/MobileHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { Input } from "@/components/ui/input";
import { FileText, Search, ArrowRight, Plus, Calculator, Pencil, Trash2, Lock, ChevronDown, CheckCircle, Clock } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import BulkUploadLoads from "@/components/BulkUploadLoads";
import { useAppSettings } from "@/components/AppSettings";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import BiltyCostModal from "@/components/BiltyCostModal";
import { toast } from "sonner";

export default function Loads() {
  const [search, setSearch] = useState("");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [costingBilty, setCostingBilty] = useState(null);
  const [editRequestBilty, setEditRequestBilty] = useState(null);
  const queryClient = useQueryClient();
  const { fmt, settings } = useAppSettings();
  const docName = settings.docName || "Bilty";
  const { role, canSeeFreightRates, isDriver, isAdmin, isManagement, isOperations, isSupervisor } = useRole();

  if (isDriver) return <AccessDenied />;

  const canAddBilty = isAdmin || isManagement || isOperations || isSupervisor;
  const canDelete = isAdmin;

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ["loads"],
    queryFn: () => base44.entities.Load.list("-created_date", 300),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Load.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loads"] });
      toast.success("Bilty deleted");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.Load.update(id, { approval_status: "approved", is_confirmed: true, status: "booked" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loads"] });
      toast.success("Bilty approved!");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Load.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loads"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const pendingApprovalCount = loads.filter(l => l.approval_status === "pending_approval").length;

  const filtered = loads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.load_number?.toLowerCase().includes(q) ||
      l.client_name?.toLowerCase().includes(q) ||
      l.origin?.toLowerCase().includes(q) ||
      l.destination?.toLowerCase().includes(q) ||
      l.vehicle_number?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "pending_approval"
      ? l.approval_status === "pending_approval"
      : statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Group: top-level (no parent) and children
  const topLevel = filtered.filter(l => !l.parent_load_id);
  const children = filtered.filter(l => !!l.parent_load_id);

  return (
    <div className="pb-28 bg-slate-50 min-h-screen">
      <MobileHeader title="Bilties" backTo="Dashboard"
        rightAction={
          <ExportButton
            data={filtered}
            filename="bilties"
            title="Bilties / Loads Report"
            columns={[
              {label:"Load #",key:"load_number"},
              {label:"Client",key:"client_name"},
              {label:"Origin",key:"origin"},
              {label:"Destination",key:"destination"},
              {label:"Vehicle",key:"vehicle_number"},
              {label:"Status",key:"status"},
              {label:"Amount",key:"freight_amount",format:v=>`₨${(v||0).toLocaleString()}`},
              {label:"Date",key:"loading_date"},
            ]}
          />
        }
      />

      {/* Action Buttons */}
      {canAddBilty && (
        <div className="px-4 pt-3 pb-2 flex gap-2 flex-wrap">
          <Link to={createPageUrl("BiltyForm")} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> New {docName}
            </button>
          </Link>
          {(isAdmin || isManagement || isOperations) && (
            <button onClick={() => setShowBulkUpload(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
              📊 Bulk
            </button>
          )}
        </div>
      )}

      {showBulkUpload && (
        <BulkUploadLoads
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ["loads"] }); setShowBulkUpload(false); }}
        />
      )}

      {/* Search + Filter */}
      <div className="px-4 pb-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search bilties..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl bg-white border-slate-200" />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full bg-slate-100 rounded-xl h-auto p-1 flex-wrap">
            <TabsTrigger value="all" className="rounded-lg text-xs flex-1">All</TabsTrigger>
            <TabsTrigger value="pending_approval" className="rounded-lg text-xs flex-1 relative">
              ⏳ Approval
              {pendingApprovalCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pendingApprovalCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="booked" className="rounded-lg text-xs flex-1">Booked</TabsTrigger>
            <TabsTrigger value="in_transit" className="rounded-lg text-xs flex-1">Transit</TabsTrigger>
            <TabsTrigger value="delivered" className="rounded-lg text-xs flex-1">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Bilties List */}
      <div className="px-4 space-y-2.5">
        <p className="text-xs text-slate-400">{filtered.length} {docName}{filtered.length !== 1 ? "s" : ""}</p>

        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse h-24" />
          ))
        ) : topLevel.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={`No ${docName}s found`}
            description={`Add your first ${docName} to start tracking cargo.`}
            action={canAddBilty ? (
              <Link to={createPageUrl("BiltyForm")}>
                <Button className="rounded-xl bg-orange-500">+ New {docName}</Button>
              </Link>
            ) : null}
          />
        ) : (
          topLevel.map(bilty => {
            const childBilties = loads.filter(l => l.parent_load_id === bilty.id);
            return (
              <div key={bilty.id} className="space-y-1.5">
                <BiltyCard
                  bilty={bilty}
                  fmt={fmt}
                  canSeeFreightRates={canSeeFreightRates}
                  canAddBilty={canAddBilty}
                  canDelete={canDelete}
                  isAdmin={isAdmin}
                  isSupervisor={isSupervisor}
                  role={role}
                  docName={docName}
                  onCosting={() => setCostingBilty(bilty)}
                  onDelete={() => {
                    if (window.confirm("Delete this bilty?")) deleteMutation.mutate(bilty.id);
                  }}
                  onEditRequest={() => setEditRequestBilty(bilty)}
                  onStatusChange={(status) => statusMutation.mutate({ id: bilty.id, status })}
                  onApprove={() => approveMutation.mutate(bilty.id)}
                  childCount={childBilties.length}
                />
                {/* Child bilties */}
                {childBilties.map(child => (
                  <div key={child.id} className="ml-5 border-l-2 border-orange-200 pl-3">
                    <BiltyCard
                     bilty={child}
                     fmt={fmt}
                     canSeeFreightRates={canSeeFreightRates}
                     canAddBilty={canAddBilty}
                     canDelete={canDelete}
                     isAdmin={isAdmin}
                     isSupervisor={isSupervisor}
                     role={role}
                     docName={docName}
                     isChild
                     onCosting={() => setCostingBilty(child)}
                     onDelete={() => {
                       if (window.confirm("Delete this bilty?")) deleteMutation.mutate(child.id);
                     }}
                     onEditRequest={() => setEditRequestBilty(child)}
                     onStatusChange={(status) => statusMutation.mutate({ id: child.id, status })}
                     onApprove={() => approveMutation.mutate(child.id)}
                    />
                  </div>
                ))}

              </div>
            );
          })
        )}
      </div>

      {/* Bilty Costing Modal */}
      {costingBilty && (
        <BiltyCostModal bilty={costingBilty} onClose={() => setCostingBilty(null)} />
      )}

      {/* Edit Request Modal (supervisor/client → admin) */}
      {editRequestBilty && (
        <EditRequestModal
          bilty={editRequestBilty}
          role={role}
          isAdmin={isAdmin}
          onClose={() => setEditRequestBilty(null)}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["loads"] })}
        />
      )}
    </div>
  );
}

const LOAD_STATUSES = [
  { v:"booked",      l:"Booked",           color:"bg-blue-100 text-blue-700" },
  { v:"loading",     l:"Loading",          color:"bg-yellow-100 text-yellow-700" },
  { v:"in_transit",  l:"In Transit",       color:"bg-indigo-100 text-indigo-700" },
  { v:"delivered",   l:"Delivered",        color:"bg-green-100 text-green-700" },
  { v:"completed",   l:"Completed",        color:"bg-emerald-100 text-emerald-700" },
  { v:"cancelled",   l:"Cancelled",        color:"bg-red-100 text-red-700" },
];

function BiltyCard({ bilty, fmt, canSeeFreightRates, canAddBilty, canDelete, isAdmin, isSupervisor, role, docName, isChild, onCosting, onDelete, onEditRequest, onStatusChange, onApprove, childCount }) {
  const canEdit = isAdmin;
  const canRequestEdit = (role === "supervisor" || role === "client") && !isAdmin;
  const canUpdateStatus = isAdmin || role === "management" || role === "operations" || role === "supervisor";
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border transition-all ${isChild ? "border-orange-100" : "border-slate-100 hover:border-orange-200 hover:shadow-sm"}`}>
      <Link to={createPageUrl(`LoadDetail?id=${bilty.id}`)} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* IDs row */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <FileText className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
              {bilty.load_id_number && (
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-lg">{bilty.load_id_number}</span>
              )}
              <p className="text-sm font-bold text-slate-900">{docName} #{bilty.load_number}</p>
              <StatusBadge status={bilty.status} />
              {bilty.approval_status === "pending_approval" && (
                <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Pending Approval
                </span>
              )}
              {bilty.payment_type && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${bilty.payment_type === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {bilty.payment_type === "paid" ? "PAID" : "TO PAY"}
                </span>
              )}
              {childCount > 0 && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">+{childCount} more</span>
              )}
            </div>
            {/* Route */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <span className="truncate">{bilty.origin}</span>
              <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="truncate">{bilty.destination}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{bilty.client_name}</span>
              {bilty.vehicle_number && <span>· {bilty.vehicle_number}</span>}
              {bilty.loading_date && <span>· {format(new Date(bilty.loading_date), "dd MMM")}</span>}
            </div>
          </div>
          {canSeeFreightRates && (bilty.approved_rate > 0 || bilty.freight_amount > 0) && (
            <p className="text-sm font-bold text-slate-700 flex-shrink-0">{fmt(bilty.approved_rate || bilty.freight_amount)}</p>
          )}
        </div>
      </Link>

      {/* Action Row */}
      <div className="flex items-center gap-1 px-4 pb-3 pt-0 flex-wrap">

        {/* Status Update dropdown */}
        {canUpdateStatus && (
          <div className="relative">
            <button
              onClick={(e) => { e.preventDefault(); setShowStatusMenu(s=>!s); }}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <span className="capitalize">{bilty.status?.replace("_"," ") || "Status"}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showStatusMenu && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-100 min-w-[150px] overflow-hidden">
                {LOAD_STATUSES.map(s => (
                  <button
                    key={s.v}
                    onClick={(e) => { e.preventDefault(); onStatusChange(s.v); setShowStatusMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 ${bilty.status===s.v?"bg-slate-50":""}`}
                  >
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${s.color}`}>{s.l}</span>
                    {bilty.status===s.v && <span className="text-slate-400 text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Approve button — admin only, only for pending_approval */}
        {isAdmin && bilty.approval_status === "pending_approval" && onApprove && (
          <button
            onClick={(e) => { e.preventDefault(); onApprove(); }}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-green-500 text-white border border-green-600 rounded-lg hover:bg-green-600 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </button>
        )}

        {/* Bilty Costing button */}
        {(isAdmin || role === "management" || role === "accounting") && (
          <button
            onClick={(e) => { e.preventDefault(); onCosting(); }}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" /> Bilty Costing
          </button>
        )}
        {/* Edit - admin only */}
        {canEdit && (
          <Link to={createPageUrl(`BiltyForm?id=${bilty.id}`)}>
            <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </Link>
        )}
        {/* Request Edit - supervisor/client */}
        {canRequestEdit && (
          <button
            onClick={(e) => { e.preventDefault(); onEditRequest(); }}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100"
          >
            <Lock className="w-3 h-3" /> Request Edit
          </button>
        )}
        {/* Delete - admin only */}
        {canDelete && (
          <button
            onClick={(e) => { e.preventDefault(); onDelete(); }}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-50 text-red-500 border border-red-100 rounded-lg hover:bg-red-100"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function EditRequestModal({ bilty, role, isAdmin, onClose, onRefresh }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const { settings } = useAppSettings();
  const docName = settings.docName || "Bilty";

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error("Please provide a reason"); return; }
    setSaving(true);
    // If admin — direct edit redirect
    if (isAdmin) {
      window.location.href = createPageUrl(`BiltyForm?id=${bilty.id}`);
      return;
    }
    // Create a notification/note entry for admin
    await base44.entities.AppNotification?.create({
      title: `Edit Request: ${docName} #${bilty.load_number}`,
      message: `${role} requested edit for ${docName} #${bilty.load_number}. Reason: ${reason}`,
      type: "edit_request",
      reference_id: bilty.id,
      reference_type: "bilty",
      is_read: false,
    }).catch(() => {});
    toast.success("Edit request sent to admin");
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
        <h3 className="font-bold text-slate-900 mb-1">Request Edit</h3>
        <p className="text-xs text-slate-500 mb-3">{docName} #{bilty.load_number} · {bilty.client_name}</p>
        <p className="text-xs text-slate-600 mb-2">Only admin can edit bilties. Your request will be sent for review.</p>
        <Input
          placeholder="Reason for edit request *"
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="rounded-xl mb-3"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600">
            {saving ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}