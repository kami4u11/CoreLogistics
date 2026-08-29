import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import VehicleForm from "@/components/forms/VehicleForm";
import { Input } from "@/components/ui/input";
import { Truck, Search, User, Phone, Weight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRole } from "@/components/useRole";
 
const TYPE_ICONS = {
  truck: "🚛", trailer: "🚜", tanker: "⛽", container: "📦", mini_truck: "🚚", pickup: "🛻"
};
 
export default function Vehicles() {
  // ─── ALL HOOKS BEFORE ANY EARLY RETURN ───────────────────────────────────
  const { isSleepingPartner, canDelete, loading: roleLoading } = useRole();
  const queryClient = useQueryClient();
 
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [search,   setSearch]   = useState("");
 
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list("-created_date"),
  });
 
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setShowForm(false);
      toast.success("Vehicle added");
    },
  });
 
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setEditing(null); setShowForm(false);
      toast.success("Vehicle updated");
    },
  });
 
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle deleted");
    },
  });
  // ─── END HOOKS ────────────────────────────────────────────────────────────
 
  if (roleLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
    </div>
  );
 
  const handleSubmit = (data) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };
 
  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    return (
      v.vehicle_number?.toLowerCase().includes(q) ||
      v.driver_name?.toLowerCase().includes(q) ||
      v.broker_name?.toLowerCase().includes(q)
    );
  });
 
  return (
    <div className="pb-24">
      <MobileHeader
        title="Vehicles (Pool / Broker)"
        backTo="Dashboard"
        onAdd={isSleepingPartner ? undefined : () => { setEditing(null); setShowForm(true); }}
      />
 
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by vehicle no., driver, broker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-slate-50 border-slate-200"
          />
        </div>
      </div>
 
      <div className="px-4 space-y-2.5">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-32 mb-2" />
              <div className="h-3 bg-slate-50 rounded w-48" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No broker vehicles yet"
            description="Add vehicles hired through brokers for trip-based assignments."
            action={!isSleepingPartner && <Button onClick={() => setShowForm(true)} className="rounded-xl bg-slate-900">Add Vehicle</Button>}
          />
        ) : (
          filtered.map((vehicle) => {
            return (
              <div key={vehicle.id} className="bg-white rounded-2xl p-4 border border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="text-2xl">{TYPE_ICONS[vehicle.vehicle_type] || "🚛"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-slate-900">{vehicle.vehicle_number}</h3>
                        <StatusBadge status={vehicle.status} />
                      </div>
 
                      <p className="text-xs text-slate-500 capitalize">
                        {vehicle.vehicle_type?.replace(/_/g, " ")}
                        {vehicle.broker_name ? ` · Broker: ${vehicle.broker_name}` : ""}
                      </p>
 
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                        {vehicle.driver_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {vehicle.driver_name}
                          </span>
                        )}
                        {vehicle.capacity_tons > 0 && (
                          <span className="flex items-center gap-1">
                            <Weight className="w-3 h-3" /> {vehicle.capacity_tons}T
                          </span>
                        )}
                        {vehicle.driver_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {vehicle.driver_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
 
                  {!isSleepingPartner && (
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => { setEditing(vehicle); setShowForm(true); }} className="p-2 rounded-lg hover:bg-slate-100">
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      {canDelete && (
                        <button onClick={() => { if (confirm("Delete this vehicle?")) deleteMutation.mutate(vehicle.id); }} className="p-2 rounded-lg hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
 
      {showForm && (
        <VehicleForm
          vehicle={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}