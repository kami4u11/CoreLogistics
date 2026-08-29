import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import BrokerForm from "@/components/forms/BrokerForm";
import { Input } from "@/components/ui/input";
import { Handshake, Search, Phone, Percent, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Brokers() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: brokers = [], isLoading } = useQuery({
    queryKey: ["brokers"],
    queryFn: () => base44.entities.Broker.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Broker.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["brokers"] }); setShowForm(false); toast.success("Broker added"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Broker.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["brokers"] }); setEditing(null); setShowForm(false); toast.success("Broker updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Broker.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["brokers"] }); toast.success("Broker deleted"); },
  });

  const filtered = brokers.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.company?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="pb-24">
      <MobileHeader
        title="Brokers"
        backTo="Dashboard"
        onAdd={() => { setEditing(null); setShowForm(true); }}
      />

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search brokers..."
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
            icon={Handshake}
            title="No brokers yet"
            description="Add your first broker to manage commissions."
            action={<Button onClick={() => setShowForm(true)} className="rounded-xl bg-slate-900">Add Broker</Button>}
          />
        ) : (
          filtered.map((broker) => (
            <div key={broker.id} className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{broker.name}</h3>
                    <StatusBadge status={broker.status} />
                  </div>
                  {broker.company && <p className="text-xs text-slate-500">{broker.company}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    {broker.phone && (
                      <a href={`tel:${broker.phone}`} className="flex items-center gap-1 text-blue-600">
                        <Phone className="w-3 h-3" /> {broker.phone}
                      </a>
                    )}
                    {broker.commission_rate > 0 && (
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" /> {broker.commission_rate}% commission
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => { setEditing(broker); setShowForm(true); }} className="p-2 rounded-lg hover:bg-slate-100">
                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button onClick={() => { if (confirm("Delete this broker?")) deleteMutation.mutate(broker.id); }} className="p-2 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <BrokerForm
          broker={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}