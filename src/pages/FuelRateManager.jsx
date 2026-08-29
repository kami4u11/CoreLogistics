import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Fuel, Plus, X, Printer, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const SS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}
.fp-root{font-family:'DM Sans',system-ui,sans-serif;min-height:100vh;background:#f8fafc;}
@media(max-width:600px){.fp-main{padding:12px!important;}}
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}
@keyframes spin{to{transform:rotate(360deg)}}`;

const FUEL_TYPES = ["Diesel", "Petrol", "HSD", "CNG", "LPG"];

const Card = ({ children, style = {} }) => (
  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20, ...style }}>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>{label}</label>
    {children}
  </div>
);

const FI = (props) => (
  <input {...props} style={{ width: "100%", height: 38, border: "1px solid #e2e8f0", borderRadius: 10, padding: "0 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
);

const emptyForm = {
  fuel_type: "Diesel",
  price_per_liter_pkr: "",
  effective_from: format(new Date(), "yyyy-MM-dd"),
  notes: "",
};

export default function FuelRateManager() {
  const { isAdmin, isManagement, isDriver, loading: roleLoading } = useRole();
  const qc = useQueryClient();
  const canEdit = isAdmin || isManagement;

  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(emptyForm);
  const [filterType, setFilterType] = useState("Diesel");

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["fuel_rates"],
    queryFn: () => base44.entities.FuelRate.list("-effective_from", 200),
  });

  const saveMut = useMutation({
    mutationFn: (d) => {
      const data = { ...d, price_per_liter_pkr: parseFloat(d.price_per_liter_pkr) || 0 };
      return editing
        ? base44.entities.FuelRate.update(editing.id, data)
        : base44.entities.FuelRate.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel_rates"] });
      toast.success("Rate saved");
      setShowForm(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.message || "Failed to save"),
  });

  const delMut = useMutation({
    mutationFn: (id) => base44.entities.FuelRate.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fuel_rates"] }); toast.success("Deleted"); },
  });

  if (roleLoading) return (
    <div className="fp-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <style>{SS}</style>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#1e293b", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
  if (isDriver) return <AccessDenied />;

  // Latest entry per fuel type (for the top cards)
  const currentRates = FUEL_TYPES.map(ft => {
    const history = rates
      .filter(r => r.fuel_type === ft)
      .sort((a, b) => (b.effective_from || "").localeCompare(a.effective_from || ""));
    return history[0] ? { ...history[0], _prev: history[1] } : null;
  }).filter(Boolean);

  // History for selected type
  const filtered = rates.filter(r => r.fuel_type === filterType);

  // Chart — oldest first, last 16 entries
  const chartData = [...filtered].reverse().slice(-16).map(r => ({
    date: r.effective_from,
    rate: r.price_per_liter_pkr,
  }));

  const openEdit = (r) => {
    setEditing(r);
    setForm({ fuel_type: r.fuel_type, price_per_liter_pkr: r.price_per_liter_pkr, effective_from: r.effective_from, notes: r.notes || "" });
    setShowForm(true);
  };
  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };

  const printRates = () => {
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Fuel Rates</title>
      <style>body{font-family:Arial;padding:20px;font-size:12px}h2{color:#1e293b}
      table{width:100%;border-collapse:collapse}
      th{background:#1e293b;color:#fff;padding:6px 10px;font-size:11px;text-align:left}
      td{padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px}</style></head><body>
      <h2>Fuel Rate History</h2>
      <table><thead><tr><th>Fuel Type</th><th>Price/Litre (PKR)</th><th>Effective From</th><th>Notes</th></tr></thead>
      <tbody>${rates.map(r => `<tr>
        <td>${r.fuel_type}</td><td>₨${r.price_per_liter_pkr}</td>
        <td>${r.effective_from || "—"}</td><td>${r.notes || "—"}</td>
      </tr>`).join("")}</tbody></table>
      <p style="font-size:10px;color:#94a3b8;margin-top:16px">Printed: ${new Date().toLocaleString()}</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="fp-root">
      <style>{SS}</style>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>{editing ? "Edit Rate" : "Add Fuel Rate"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: "18px 22px" }}>
              <Field label="Fuel Type">
                <select value={form.fuel_type} onChange={e => setForm(p => ({ ...p, fuel_type: e.target.value }))}
                  style={{ width: "100%", height: 38, border: "1px solid #e2e8f0", borderRadius: 10, padding: "0 12px", fontSize: 13, outline: "none", background: "#fff" }}>
                  {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Price per Litre (₨)">
                  <FI type="number" step="0.01" value={form.price_per_liter_pkr}
                    onChange={e => setForm(p => ({ ...p, price_per_liter_pkr: e.target.value }))} placeholder="0.00" />
                </Field>
                <Field label="Effective From">
                  <FI type="date" value={form.effective_from}
                    onChange={e => setForm(p => ({ ...p, effective_from: e.target.value }))} />
                </Field>
              </div>
              <Field label="Notes (optional)">
                <FI value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Govt notification" />
              </Field>
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={() => saveMut.mutate(form)}
                disabled={saveMut.isPending || !form.price_per_liter_pkr || !form.effective_from}
                style={{ flex: 2, height: 40, borderRadius: 10, border: "none", background: "#0ea5e9", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: (saveMut.isPending || !form.price_per_liter_pkr) ? 0.6 : 1 }}>
                {saveMut.isPending ? "Saving…" : "Save Rate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: "rgba(15,23,42,0.97)", padding: "0 22px", display: "flex", alignItems: "center", height: 50, gap: 14, position: "sticky", top: 0, zIndex: 100 }}>
        <Link to={createPageUrl("Fleet")} style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
          <ChevronLeft size={14} />Fleet
        </Link>
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
        <Fuel size={14} color="#0ea5e9" />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Fuel Rate Manager</span>
        <div style={{ flex: 1 }} />
        {canEdit && (
          <button onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={13} />Add Rate
          </button>
        )}
        <button onClick={printRates} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <Printer size={13} />Print
        </button>
      </div>

      <main style={{ padding: "20px 22px", maxWidth: 1100, margin: "0 auto" }} className="fp-main">

        {/* ── Current rate cards ──────────────────────────────────────── */}
        {currentRates.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            {currentRates.map(r => {
              const change = r._prev ? (r.price_per_liter_pkr - r._prev.price_per_liter_pkr) : 0;
              const active = filterType === r.fuel_type;
              return (
                <div key={r.fuel_type} onClick={() => setFilterType(r.fuel_type)}
                  style={{ background: active ? "#0f172a" : "#fff", borderRadius: 14, padding: "14px 20px", border: `2px solid ${active ? "#0ea5e9" : "#e2e8f0"}`, minWidth: 148, cursor: "pointer", transition: "all 0.15s" }}>
                  <p style={{ fontSize: 11, color: active ? "#94a3b8" : "#64748b", margin: "0 0 2px", fontWeight: 700 }}>{r.fuel_type}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: active ? "#fff" : "#1e293b", margin: 0 }}>₨{r.price_per_liter_pkr}</p>
                  <p style={{ fontSize: 10, color: active ? "#64748b" : "#94a3b8", margin: "3px 0 0" }}>from {r.effective_from}</p>
                  {change !== 0 && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: change > 0 ? "#ef4444" : "#22c55e", margin: "4px 0 0" }}>
                      {change > 0 ? "↑" : "↓"} ₨{Math.abs(change).toFixed(2)} vs prev
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Trend chart ─────────────────────────────────────────────── */}
        {chartData.length > 1 && (
          <Card style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 14 }}>{filterType} — Price Trend (PKR/Litre)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₨${v}`} />
                <Tooltip formatter={v => [`₨${v}/L`, "Price"]} />
                <Line type="monotone" dataKey="rate" stroke="#0ea5e9" strokeWidth={2.5} dot={{ fill: "#0ea5e9", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* ── History table ───────────────────────────────────────────── */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", margin: 0 }}>{filterType} — Rate History</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FUEL_TYPES.map(ft => (
                <button key={ft} onClick={() => setFilterType(ft)}
                  style={{ padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${filterType === ft ? "#0ea5e9" : "#e2e8f0"}`, background: filterType === ft ? "#e0f2fe" : "#fff", color: filterType === ft ? "#0369a1" : "#94a3b8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <Fuel size={36} color="#cbd5e1" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontWeight: 700, color: "#1e293b", margin: 0 }}>No {filterType} rates yet</p>
              {canEdit && (
                <button onClick={openNew} style={{ marginTop: 12, padding: "8px 20px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  + Add First Rate
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    {["Fuel Type", "Price / Litre (PKR)", "Effective From", "Notes", ""].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase", color: "#94a3b8" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "transparent" : "#fafafa" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{r.fuel_type}</span>
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 800, color: "#1e293b", fontSize: 15 }}>
                        ₨{r.price_per_liter_pkr}<span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>/L</span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{r.effective_from || "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{r.notes || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {canEdit && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => openEdit(r)} style={{ padding: "3px 10px", background: "#f0fdf4", color: "#059669", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                            <button onClick={() => { if (window.confirm("Delete this rate?")) delMut.mutate(r.id); }} style={{ padding: "3px 10px", background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}