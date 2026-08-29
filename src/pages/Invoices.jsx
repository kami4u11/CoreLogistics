import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MobileHeader from "@/components/ui/MobileHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { Input } from "@/components/ui/input";
import { FileText, Search } from "lucide-react";
import ExportButton from "@/components/ExportButton";
import { useRole } from "@/components/useRole";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function Invoices() {
  const { isSleepingPartner } = useRole();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.load_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAmount = filtered.reduce((s, i) => s + (i.total_amount || 0), 0);
  const paidAmount = filtered.reduce((s, i) => s + (i.paid_amount || 0), 0);

  return (
    <div className="pb-24">
      <MobileHeader
        title="Invoices"
        backTo="Dashboard"
        onAdd={isSleepingPartner ? undefined : () => window.location.href = createPageUrl("InvoiceForm")}
        rightAction={
          <ExportButton
            data={filtered}
            filename="invoices"
            title="Invoices Report"
            columns={[
              {label:"Invoice #",key:"invoice_number"},
              {label:"Client",key:"client_name"},
              {label:"Status",key:"status"},
              {label:"Total",key:"total_amount",format:v=>`₨${(v||0).toLocaleString()}`},
              {label:"Paid",key:"paid_amount",format:v=>`₨${(v||0).toLocaleString()}`},
              {label:"Balance",key:"balance_amount",format:v=>`₨${(v||0).toLocaleString()}`},
              {label:"Date",key:"invoice_date"},
              {label:"Due Date",key:"due_date"},
            ]}
          />
        }
      />

      {/* Summary */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 text-white">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/60">Total</p>
              <p className="text-xl font-bold mt-0.5">₨{totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Collected</p>
              <p className="text-xl font-bold mt-0.5 text-emerald-400">₨{paidAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-slate-50 border-slate-200"
          />
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full bg-slate-50 rounded-xl h-auto p-1 flex-wrap">
            <TabsTrigger value="all" className="rounded-lg text-xs flex-1">All</TabsTrigger>
            <TabsTrigger value="draft" className="rounded-lg text-xs flex-1">Draft</TabsTrigger>
            <TabsTrigger value="sent" className="rounded-lg text-xs flex-1">Sent</TabsTrigger>
            <TabsTrigger value="paid" className="rounded-lg text-xs flex-1">Paid</TabsTrigger>
            <TabsTrigger value="overdue" className="rounded-lg text-xs flex-1">Overdue</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 space-y-2.5">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse h-24" />
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first invoice."
            action={
              <Link to={createPageUrl("InvoiceForm")}>
                <Button className="rounded-xl bg-slate-900">Create Invoice</Button>
              </Link>
            }
          />
        ) : (
          filtered.map((inv) => (
            <Link
              key={inv.id}
              to={createPageUrl(`InvoiceDetail?id=${inv.id}`)}
              className="block bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-slate-900">{inv.invoice_number}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-slate-500">{inv.client_name}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    {inv.load_number && <span>Load: {inv.load_number}</span>}
                    {inv.invoice_date && <span>• {format(new Date(inv.invoice_date), "dd MMM yyyy")}</span>}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm font-bold text-slate-900">₨{inv.total_amount?.toLocaleString()}</p>
                  {inv.balance_amount > 0 && (
                   <p className="text-xs text-red-500 mt-0.5">Due: ₨{inv.balance_amount?.toLocaleString()}</p>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}