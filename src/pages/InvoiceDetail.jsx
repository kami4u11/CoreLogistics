import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MobileHeader from "@/components/ui/MobileHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Pencil, Calendar, User, Package, CreditCard, Printer, FileDown, FileText } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAppSettings } from "@/components/AppSettings";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69995a1b4cc6b3863e378752/2cf5e616c_pvt_ltd_logo1-removebg-preview.png";

function buildLineRows(invoice) {
  const rows = [];
  // line_items (new multi-load)
  if (invoice.line_items?.length) {
    invoice.line_items.forEach(li => {
      rows.push({ desc: li.description || "Service", ref: li.load_ref || "", amount: li.amount || 0 });
    });
  }
  // Legacy single-load fields
  if (!invoice.line_items?.length) {
    if (invoice.freight_amount > 0) rows.push({ desc: "Freight Charges", ref: invoice.load_number || "", amount: invoice.freight_amount });
    if (invoice.labor_charges > 0) rows.push({ desc: "Labor Charges", ref: "", amount: invoice.labor_charges });
    if (invoice.other_charges > 0) rows.push({ desc: "Other Charges", ref: "", amount: invoice.other_charges });
  } else {
    if (invoice.freight_amount > 0) rows.push({ desc: "Freight Charges (bulk)", ref: "", amount: invoice.freight_amount });
    if (invoice.labor_charges > 0) rows.push({ desc: "Labor Charges", ref: "", amount: invoice.labor_charges });
    if (invoice.other_charges > 0) rows.push({ desc: "Other Charges", ref: "", amount: invoice.other_charges });
  }
  return rows;
}

function printInvoicePDF(invoice, settings) {
  const cp = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
  const sym = settings?.symbol || "₨";
  const fmt = (n) => `${sym}${(n || 0).toLocaleString()}`;
  const taxLabel = invoice.tax_label || "GST";
  const lineRows = buildLineRows(invoice);

  const loadNums = invoice.load_numbers?.length ? invoice.load_numbers.join(", ") : invoice.load_number || "";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #1e293b; }
      .header { background: linear-gradient(135deg,#1e3a5f,#1d4ed8); color:white; padding:24px 32px; display:flex; align-items:center; gap:20px; }
      .header img { height:60px; background:white; border-radius:8px; padding:4px; }
      .header-text h1 { font-size:22px; margin:0 0 2px; }
      .header-text p { font-size:12px; margin:0; opacity:0.7; }
      .body { padding:24px 32px; }
      .inv-title { font-size:20px; font-weight:bold; margin-bottom:4px; }
      .inv-meta { display:flex; justify-content:space-between; margin-bottom:24px; }
      .label { color:#64748b; font-size:11px; }
      table { width:100%; border-collapse:collapse; margin-top:16px; }
      th { background:#f1f5f9; padding:8px 12px; text-align:left; font-size:12px; color:#475569; }
      td { padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:13px; }
      .total-row td { font-weight:bold; background:#f8fafc; }
      .balance-row td { font-weight:bold; color:#dc2626; }
      .paid-row td { color:#059669; }
      .footer { margin-top:40px; padding:16px 32px; background:#f8fafc; font-size:11px; color:#64748b; text-align:center; }
      .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; background:#e0f2fe; color:#0369a1; text-transform:capitalize; }
    </style></head><body>
    <div class="header">
      <img src="${cp?.logo_url || LOGO}" alt="Logo"/>
      <div class="header-text">
        <h1>${cp?.company_name || "Saifran Logistics (Pvt) Ltd."}</h1>
        <p>${cp?.address || ""}</p>
        ${invoice.company_ntn ? `<p>NTN: ${invoice.company_ntn}</p>` : ""}
      </div>
    </div>
    <div class="body">
      <div class="inv-title">INVOICE</div>
      <div class="inv-meta">
        <div>
          <div class="label">Invoice #</div><div><b>${invoice.invoice_number}</b></div>
          <div class="label" style="margin-top:8px">Bill To</div>
          <div><b>${invoice.client_name}</b></div>
          ${invoice.client_address ? `<div style="font-size:12px;color:#475569">${invoice.client_address}</div>` : ""}
          ${invoice.client_ntn ? `<div style="font-size:12px;color:#475569">NTN: ${invoice.client_ntn}</div>` : ""}
          ${loadNums ? `<div class="label" style="margin-top:8px">Load(s) #</div><div>${loadNums}</div>` : ""}
        </div>
        <div style="text-align:right">
          <div class="label">Date</div><div>${invoice.invoice_date || ""}</div>
          <div class="label" style="margin-top:8px">Due Date</div><div>${invoice.due_date || ""}</div>
          <div style="margin-top:8px"><span class="badge">${invoice.status || ""}</span></div>
        </div>
      </div>
      <table>
        <thead><tr><th>Description</th><th>Load Ref</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          ${lineRows.map(r => `<tr><td>${r.desc}</td><td style="color:#64748b;font-size:12px">${r.ref}</td><td style="text-align:right">${fmt(r.amount)}</td></tr>`).join("")}
          ${invoice.gst_amount > 0 ? `<tr><td colspan="2">${taxLabel}${invoice.tax_percentage > 0 ? ` (${invoice.tax_percentage}%)` : ""}</td><td style="text-align:right">${fmt(invoice.gst_amount)}</td></tr>` : ""}
          <tr class="total-row"><td colspan="2"><b>Total Amount</b></td><td style="text-align:right"><b>${fmt(invoice.total_amount)}</b></td></tr>
          ${invoice.paid_amount > 0 ? `<tr class="paid-row"><td colspan="2">Amount Paid</td><td style="text-align:right">${fmt(invoice.paid_amount)}</td></tr>` : ""}
          ${invoice.balance_amount > 0 ? `<tr class="balance-row"><td colspan="2"><b>Balance Due</b></td><td style="text-align:right"><b>${fmt(invoice.balance_amount)}</b></td></tr>` : ""}
        </tbody>
      </table>
      ${invoice.notes ? `<div style="margin-top:20px;padding:12px;background:#f8fafc;border-radius:8px;font-size:12px;color:#475569"><b>Notes:</b> ${invoice.notes}</div>` : ""}
    </div>
    <div class="footer">${cp?.company_name || "Saifran Logistics (Pvt) Ltd."} | Thank you for your business!</div>
    </body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export default function InvoiceDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const { fmt, settings } = useAppSettings();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const invs = await base44.entities.Invoice.list();
      return invs.find(i => i.id === id);
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      toast.success("Invoice updated");
    },
  });

  const role = user?.role || "user";
  const canEdit = role === "admin" || role === "accounting";

  if (isLoading || !invoice) {
    return (
      <div className="pb-24">
        <MobileHeader title="Invoice" backTo="Invoices" />
        <div className="px-4 py-6 space-y-4">
          {Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse h-24" />)}
        </div>
      </div>
    );
  }

  const lineRows = buildLineRows(invoice);
  const taxLabel = invoice.tax_label || "GST";
  const loadNums = invoice.load_numbers?.length ? invoice.load_numbers : invoice.load_number ? [invoice.load_number] : [];

  return (
    <div className="pb-24">
      <MobileHeader
        title={invoice.invoice_number}
        backTo="Invoices"
        rightAction={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => printInvoicePDF(invoice, settings)}>
              <Printer className="w-4 h-4" />
            </Button>
            {canEdit && (
              <Link to={createPageUrl(`InvoiceForm?id=${id}`)}>
                <Button variant="ghost" size="sm" className="rounded-xl">
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Header card */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69995a1b4cc6b3863e378752/2cf5e616c_pvt_ltd_logo1-removebg-preview.png" alt="Logo" className="h-10 w-auto bg-white/90 rounded-lg p-1" />
            <div>
              <p className="text-white font-bold text-sm">Saifran Logistics (Pvt) Ltd.</p>
              <p className="text-blue-200 text-xs">Invoice</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <StatusBadge status={invoice.status} />
            {invoice.due_date && <span className="text-xs text-white/60">Due {format(new Date(invoice.due_date), "dd MMM yyyy")}</span>}
          </div>
          <p className="text-3xl font-bold mt-2">{fmt(invoice.total_amount)}</p>
          {invoice.balance_amount > 0 && <p className="text-sm text-amber-300 mt-1">Balance: {fmt(invoice.balance_amount)}</p>}
        </div>

        {/* Quick status update */}
        {canEdit && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Payment Status</h3>
            <Select value={invoice.status} onValueChange={(v) => updateMutation.mutate({ status: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft", "sent", "paid", "partial", "overdue", "cancelled"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Details */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Details</h3>
          <div className="space-y-3">
            <DetailRow icon={User} label="Client" value={invoice.client_name} />
            {invoice.client_address && <DetailRow icon={User} label="Address" value={invoice.client_address} />}
            {invoice.client_ntn && <DetailRow icon={FileText} label="Client NTN" value={invoice.client_ntn} />}
            {invoice.company_ntn && <DetailRow icon={FileText} label="Company NTN" value={invoice.company_ntn} />}
            {invoice.invoice_date && <DetailRow icon={Calendar} label="Invoice Date" value={format(new Date(invoice.invoice_date), "dd MMM yyyy")} />}
            {invoice.payment_mode && <DetailRow icon={CreditCard} label="Payment Mode" value={invoice.payment_mode.replace(/_/g, " ")} />}
            {loadNums.length > 0 && (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Package className="w-3.5 h-3.5" />
                  <span>Loads ({loadNums.length})</span>
                </div>
                <div className="text-right">
                  {loadNums.map((n, i) => <span key={i} className="inline-block text-xs font-medium text-blue-700 bg-blue-50 rounded-md px-2 py-0.5 ml-1">{n}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Line Items breakdown */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Breakdown</h3>
          <div className="space-y-2">
            {lineRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700">{row.desc}</p>
                  {row.ref && <p className="text-[10px] text-slate-400">Ref: {row.ref}</p>}
                </div>
                <span className="text-sm font-medium text-slate-800">{fmt(row.amount)}</span>
              </div>
            ))}

            {invoice.gst_amount > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-sm text-slate-500">{taxLabel}{invoice.tax_percentage > 0 ? ` (${invoice.tax_percentage}%)` : ""}</span>
                <span className="text-sm font-medium text-slate-700">{fmt(invoice.gst_amount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-sm font-bold text-slate-900">Total</span>
              <span className="text-sm font-bold text-slate-900">{fmt(invoice.total_amount)}</span>
            </div>
            {invoice.paid_amount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-600">Paid</span>
                <span className="text-sm font-medium text-emerald-600">{fmt(invoice.paid_amount)}</span>
              </div>
            )}
            {invoice.balance_amount > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-sm font-bold text-red-600">Balance Due</span>
                <span className="text-sm font-bold text-red-600">{fmt(invoice.balance_amount)}</span>
              </div>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Notes</h3>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-700 capitalize">{value}</span>
    </div>
  );
}