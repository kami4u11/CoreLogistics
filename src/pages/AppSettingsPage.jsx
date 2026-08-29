import React, { useState, useRef } from "react";
// spin keyframe injected via style tag
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { useTheme, COLOR_PALETTES } from "@/context/ThemeContext";
import { useAppSettings } from "@/components/AppSettings";
import { toast } from "sonner";
import {
  Building2, Plus, Trash2, CheckCircle2, Sun, Moon, Palette,
  Upload, X, ChevronLeft, Globe, MapPin, RefreshCw, Settings,
  Phone, Mail, CreditCard, FileText, ArrowRight, GitBranch,
  Package, Truck, BookOpen, Users, BarChart2, Shield, Zap,
  ChevronDown, ChevronRight, ClipboardList, UserCog, Activity,
  Layers, Navigation, Wrench, DollarSign, Map,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const SPIN_CSS = `@keyframes spin{to{transform:rotate(360deg)}}`;

// ── Country list ─────────────────────────────────────────────────────────────
const COUNTRIES_LIST = [
  { code: "PK", name: "Pakistan", currency: "PKR", symbol: "₨", flag: "🇵🇰" },
  { code: "AE", name: "United Arab Emirates", currency: "AED", symbol: "AED", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", symbol: "SAR", flag: "🇸🇦" },
  { code: "US", name: "United States", currency: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "EU", name: "European Union", currency: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "TR", name: "Turkey", currency: "TRY", symbol: "₺", flag: "🇹🇷" },
  { code: "EG", name: "Egypt", currency: "EGP", symbol: "E£", flag: "🇪🇬" },
  { code: "BD", name: "Bangladesh", currency: "BDT", symbol: "৳", flag: "🇧🇩" },
  { code: "IN", name: "India", currency: "INR", symbol: "₹", flag: "🇮🇳" },
  { code: "NG", name: "Nigeria", currency: "NGN", symbol: "₦", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", currency: "KES", symbol: "KSh", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", currency: "ZAR", symbol: "R", flag: "🇿🇦" },
  { code: "CA", name: "Canada", currency: "CAD", symbol: "CA$", flag: "🇨🇦" },
  { code: "AU", name: "Australia", currency: "AUD", symbol: "A$", flag: "🇦🇺" },
];

// ── Company Form Modal ────────────────────────────────────────────────────────
function CompanyModal({ record, onClose, onSave, saving }) {
  const [form, setForm] = useState(record || {
    company_name: "", legal_name: "", logo_url: "", address: "", city: "",
    phone: "", email: "", website: "", ntn: "", strn: "",
    bank_name: "", bank_account: "", bank_iban: "", notes: "",
    country: "PK", currency: "PKR", currency_symbol: "₨",
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      s("logo_url", file_url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const FI = ({ field, label, placeholder, type = "text" }) => (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--theme-text-muted)", marginBottom: 4, textTransform: "uppercase" }}>{label}</label>
      <input type={type} value={form[field] || ""} onChange={e => s(field, e.target.value)} placeholder={placeholder}
        style={{ width: "100%", height: 38, border: "1px solid var(--theme-border)", borderRadius: 10, padding: "0 12px", fontSize: 13, background: "var(--theme-surface)", color: "var(--theme-text)", outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--theme-card-bg)", border: "1px solid var(--theme-border)", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--theme-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--theme-text)", margin: 0 }}>{record ? "Edit Company" : "Add Company"}</h2>
          <button onClick={onClose} style={{ background: "var(--theme-surface)", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", color: "var(--theme-text)" }}><X size={14} /></button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "18px 22px" }}>
          {/* Country & Currency selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--theme-text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Country & Currency</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--theme-text-muted)", marginBottom: 4 }}>Country</label>
                <select
                  value={form.country || "PK"}
                  onChange={e => {
                    const c = COUNTRIES_LIST.find(x => x.code === e.target.value);
                    setForm(p => ({ ...p, country: c?.code || "PK", currency: c?.currency || "PKR", currency_symbol: c?.symbol || "₨" }));
                  }}
                  style={{ width: "100%", height: 38, border: "1px solid var(--theme-border)", borderRadius: 10, padding: "0 10px", fontSize: 13, background: "var(--theme-surface)", color: "var(--theme-text)", outline: "none" }}
                >
                  {COUNTRIES_LIST.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--theme-text-muted)", marginBottom: 4 }}>Currency</label>
                <div style={{ height: 38, border: "1px solid var(--theme-border)", borderRadius: 10, padding: "0 12px", fontSize: 13, background: "var(--theme-surface)", color: "var(--theme-text)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{COUNTRIES_LIST.find(c => c.code === (form.country || "PK"))?.symbol || "₨"}</span>
                  <span>{form.currency || "PKR"}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--theme-text-muted)", marginBottom: 8, textTransform: "uppercase" }}>Company Logo</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {form.logo_url
                ? <img src={form.logo_url} alt="Logo" style={{ height: 56, width: 56, objectFit: "contain", borderRadius: 10, background: "#fff", padding: 4, border: "1px solid var(--theme-border)" }} />
                : <div style={{ height: 56, width: 56, borderRadius: 10, background: "var(--theme-surface)", border: "2px dashed var(--theme-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 size={20} color="var(--theme-text-muted)" />
                  </div>
              }
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--theme-primary)", color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {uploading ? <><RefreshCw size={12} style={{ animation: "spin 0.7s linear infinite" }} />Uploading…</> : <><Upload size={12} />Upload Logo</>}
              </button>
              {form.logo_url && <button onClick={() => s("logo_url", "")} style={{ padding: "7px 10px", background: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: 10, cursor: "pointer", color: "#ef4444" }}><Trash2 size={12} /></button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><FI field="company_name" label="Company Name *" placeholder="e.g. Saifran Logistics" /></div>
            <FI field="legal_name" label="Legal Name" placeholder="Registered legal name" />
            <FI field="ntn" label="NTN / Tax ID" placeholder="NTN number" />
            <FI field="strn" label="STRN / GST No." placeholder="GST registration" />
            <FI field="phone" label="Phone" placeholder="+92 300 0000000" />
            <FI field="email" label="Email" placeholder="info@company.com" />
            <div style={{ gridColumn: "1/-1" }}><FI field="address" label="Address" placeholder="Full business address" /></div>
            <FI field="city" label="City" placeholder="e.g. Karachi" />
            <FI field="website" label="Website" placeholder="https://..." />
            <FI field="bank_name" label="Bank Name" placeholder="e.g. HBL" />
            <FI field="bank_account" label="Account Number" placeholder="Account number" />
            <div style={{ gridColumn: "1/-1" }}><FI field="bank_iban" label="IBAN" placeholder="IBAN number" /></div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--theme-text-muted)", marginBottom: 4, textTransform: "uppercase" }}>Notes</label>
              <textarea value={form.notes || ""} onChange={e => s("notes", e.target.value)} placeholder="Optional notes..."
                style={{ width: "100%", minHeight: 60, border: "1px solid var(--theme-border)", borderRadius: 10, padding: "8px 12px", fontSize: 13, background: "var(--theme-surface)", color: "var(--theme-text)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--theme-border)", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid var(--theme-border)", background: "var(--theme-surface)", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "var(--theme-text)" }}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.company_name}
            style={{ flex: 2, height: 40, borderRadius: 10, border: "none", background: "var(--theme-primary)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: (!form.company_name || saving) ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save Company"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── APP ROADMAP & WORKFLOW DATA ───────────────────────────────────────────────
const WORKFLOW_STEPS = [
  {
    phase: "Phase 1", label: "Load Booking", color: "#3b82f6", icon: Package,
    steps: ["Client contacts for freight", "Operations creates Load/Bilty", "Vehicle assigned (pool or own fleet)", "Bilty printed & dispatched to driver", "Driver departs — status → In Transit"],
    links: [{ label: "Loads", page: "Loads" }, { label: "Trip Calculator", page: "TripCostCalculator" }],
  },
  {
    phase: "Phase 2", label: "Fleet Execution", color: "#7c3aed", icon: Truck,
    steps: ["Fleet trip auto-created (own vehicle)", "Driver logs fuel, tolls en route", "Fleet expenses recorded with receipts", "ODO reading updated at destination", "Delivery confirmed — status → Completed"],
    links: [{ label: "Fleet Hub", page: "Fleet" }, { label: "Fleet Trips", page: "FleetTrips" }, { label: "Fleet Expenses", page: "FleetExpenses" }],
  },
  {
    phase: "Phase 3", label: "Invoicing & Collection", color: "#059669", icon: FileText,
    steps: ["Invoice generated for completed loads", "Sent to client (PDF)", "Partial/full payment received", "Client account updated in ledger", "Invoice marked Paid / Partial"],
    links: [{ label: "Invoices", page: "Invoices" }, { label: "Client Accounts", page: "ClientAccounts" }],
  },
  {
    phase: "Phase 4", label: "Accounting & Ledger", color: "#dc2626", icon: BookOpen,
    steps: ["All transactions double-entry posted", "Bank/cashbook reconciliation done", "Vendor payments processed", "Payroll processed & posted", "Period locked after month-end"],
    links: [{ label: "General Ledger", page: "GeneralLedger" }, { label: "Cashbooks", page: "CashbookManager" }, { label: "Monthly Closing", page: "MonthlyClosing" }],
  },
  {
    phase: "Phase 5", label: "Analysis & Reporting", color: "#f59e0b", icon: BarChart2,
    steps: ["Fleet P&L by vehicle/month", "Trial Balance verification", "P&L Statement generated", "Balance Sheet reviewed", "Decision Dashboard for strategy"],
    links: [{ label: "Fleet P&L", page: "FleetPnL" }, { label: "P&L Report", page: "ProfitLoss" }, { label: "Decision Dashboard", page: "DecisionDashboard" }],
  },
];

const MODULE_MAP = [
  { label: "Operations", color: "#3b82f6", modules: ["Loads", "ConfirmLoad", "BiltyForm", "TripCostCalculator", "SavedTripExpenses"] },
  { label: "Fleet", color: "#7c3aed", modules: ["Fleet", "FleetTrips", "FleetExpenses", "FleetPnL", "FleetODOTracking", "FleetMaintenance", "FleetDocs", "FleetInstallments", "FuelRateManager", "FuelAnalytics", "GPSTracking"] },
  { label: "Accounting", color: "#059669", modules: ["Accounting", "GeneralLedger", "BankAccounts", "CashbookManager", "ClientAccounts", "VendorAccounts", "BrokerAccounts", "DriverAccounts", "LabourLedger", "ChartOfAccounts", "Invoices", "ExpenseMasterLedger", "OwnFleetLedger"] },
  { label: "Reporting", color: "#f59e0b", modules: ["ProfitLoss", "BalanceSheet", "TrialBalance", "MonthlyClosing", "CashFlowDashboard", "DecisionDashboard", "DataAnalysis", "Reports"] },
  { label: "HR", color: "#f43f5e", modules: ["HRPayroll", "Employees", "AttendancePage", "PayrollPage", "EmployeeAdvance", "EmployeeBonus", "EmployeeLedger", "LabourEntry", "LabourAnalytics"] },
  { label: "Admin", color: "#64748b", modules: ["AdminPanel", "AdminUsers", "AppSettingsPage", "CompanyProfile", "DocumentVault", "Notifications", "UserGuide"] },
];

function RoadmapTab({ isDark, cardBg, border, text, textMuted, palette }) {
  const [openPhase, setOpenPhase] = useState(0);

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: text, margin: "0 0 6px" }}>App Roadmap & Business Workflow</h2>
      <p style={{ fontSize: 12, color: textMuted, margin: "0 0 20px" }}>How the entire business process flows through the system — from load booking to financial reporting.</p>

      {/* Workflow Steps */}
      <div style={{ marginBottom: 24 }}>
        {WORKFLOW_STEPS.map((phase, i) => {
          const Icon = phase.icon;
          const isOpen = openPhase === i;
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              {/* Connector arrow between phases */}
              {i > 0 && (
                <div style={{ display: "flex", justifyContent: "center", margin: "2px 0" }}>
                  <div style={{ width: 2, height: 16, background: `${WORKFLOW_STEPS[i-1].color}60` }} />
                </div>
              )}
              <div style={{ background: cardBg, border: `1px solid ${isOpen ? phase.color : border}`, borderRadius: 14, overflow: "hidden", boxShadow: isOpen ? `0 0 0 1px ${phase.color}30` : "none" }}>
                <button onClick={() => setOpenPhase(isOpen ? -1 : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: phase.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: phase.color, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{phase.phase}</p>
                    <p style={{ fontSize: 13, fontWeight: 800, color: text, margin: "2px 0 0" }}>{phase.label}</p>
                  </div>
                  {isOpen ? <ChevronDown size={16} color={textMuted} /> : <ChevronRight size={16} color={textMuted} />}
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${border}` }}>
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      {phase.steps.map((step, si) => (
                        <div key={si} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${phase.color}20`, color: phase.color, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{si + 1}</div>
                          <p style={{ fontSize: 12, color: text, margin: 0, lineHeight: 1.5 }}>{step}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {phase.links.map(link => (
                        <Link key={link.page} to={createPageUrl(link.page)}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: `${phase.color}15`, color: phase.color, border: `1px solid ${phase.color}30`, borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                          {link.label} <ArrowRight size={10} />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Module Map */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: text, margin: "0 0 12px" }}>📦 Complete Module Map</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {MODULE_MAP.map((group) => (
            <div key={group.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: group.color }} />
                <p style={{ fontSize: 11, fontWeight: 800, color: group.color, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{group.label}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {group.modules.map(mod => (
                  <Link key={mod} to={createPageUrl(mod)}
                    style={{ fontSize: 10, color: textMuted, textDecoration: "none", padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = group.color}
                    onMouseLeave={e => e.currentTarget.style.color = textMuted}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: `${group.color}60`, flexShrink: 0 }} />
                    {mod.replace(/([A-Z])/g, " $1").trim()}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main AppSettings Page ─────────────────────────────────────────────────────
export default function AppSettingsPage() {
  const { isAdmin } = useRole();
  const { mode, isDark, palette, paletteId, toggleMode, setPalette } = useTheme();
  const { settings } = useAppSettings();
  const qc = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState("companies");

  const { data: companies = [] } = useQuery({
    queryKey: ["company_profiles"],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const saveMut = useMutation({
    mutationFn: (d) => d.id ? base44.entities.CompanyProfile.update(d.id, d) : base44.entities.CompanyProfile.create(d),
    onSuccess: () => { qc.invalidateQueries(["company_profiles"]); toast.success("Saved"); setShowModal(false); setEditing(null); },
    onError: (e) => toast.error("Save failed: " + e.message),
  });

  const delMut = useMutation({
    mutationFn: (id) => base44.entities.CompanyProfile.delete(id),
    onSuccess: () => { qc.invalidateQueries(["company_profiles"]); toast.success("Deleted"); },
  });

  const activateMut = useMutation({
    mutationFn: async (id) => {
      for (const c of companies) {
        await base44.entities.CompanyProfile.update(c.id, { is_active: c.id === id });
      }
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries(["company_profiles"]);
      const c = companies.find(x => x.id === id);
      if (c) {
        localStorage.setItem("company_profile", JSON.stringify({ ...c, is_active: true }));
        toast.success(`"${c.company_name}" is now the active company`);
      }
    },
  });

  if (!isAdmin) return <AccessDenied />;

  const activeCompany = companies.find(c => c.is_active);
  const bg       = isDark ? "#060b14" : "#f8fafc";
  const cardBg   = isDark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const border   = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const text     = isDark ? "#f1f5f9" : "#0f172a";
  const textMuted = isDark ? "#64748b" : "#64748b";

  const TABS = [
    { id: "companies", label: "🏢 Companies" },
    { id: "theme",     label: "🎨 Theme" },
    { id: "region",    label: "🌍 Region" },
    { id: "roadmap",   label: "🗺️ Roadmap" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      <style>{SPIN_CSS}</style>
      {showModal && (
        <CompanyModal
          record={editing}
          saving={saveMut.isPending}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={(d) => saveMut.mutate(editing ? { ...d, id: editing.id } : d)}
        />
      )}

      {/* Header */}
      <div style={{ background: isDark ? "linear-gradient(135deg,#0a0f1e,#0d1a2e)" : "linear-gradient(135deg,#1e3a5f,#2563eb)", padding: "0 22px", height: 52, display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 100, borderBottom: `1px solid ${border}` }}>
        <Link to={createPageUrl("AdminPanel")} style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft size={13} />Back
        </Link>
        <Settings size={15} color="rgba(255,255,255,0.7)" />
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>App Settings</span>
      </div>

      <main style={{ padding: "20px 22px", maxWidth: 900, margin: "0 auto" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: cardBg, borderRadius: 12, padding: 4, border: `1px solid ${border}`, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, minWidth: 80, padding: "9px 6px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, transition: "all 0.15s", whiteSpace: "nowrap",
                background: activeTab === t.id ? palette.primary : "transparent",
                color: activeTab === t.id ? "#fff" : textMuted }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ COMPANIES TAB ══ */}
        {activeTab === "companies" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: text, margin: 0 }}>Company Profiles</h2>
                <p style={{ fontSize: 12, color: textMuted, margin: "3px 0 0" }}>Up to 5 companies · Each company has its own separate data & database</p>
              </div>
              {companies.length < 5 ? (
                <button onClick={() => { setEditing(null); setShowModal(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: palette.primary, color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  <Plus size={13} />Add Company ({companies.length}/5)
                </button>
              ) : (
                <span style={{ fontSize: 11, color: textMuted, padding: "8px 14px", background: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9", borderRadius: 10, border: `1px solid ${border}` }}>Max 5 companies reached</span>
              )}
            </div>

            <div style={{ background: isDark ? "rgba(99,102,241,0.08)" : "#eef2ff", border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "#c7d2fe"}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#a5b4fc" : "#4338ca", margin: "0 0 3px" }}>Separate Data per Company</p>
                <p style={{ fontSize: 11, color: isDark ? "#818cf8" : "#6366f1", margin: 0, lineHeight: 1.5 }}>
                  Each company maintains its own completely separate data. Only admins can manage and switch between companies here.
                </p>
              </div>
            </div>

            {companies.length === 0 ? (
              <div style={{ background: cardBg, border: `2px dashed ${border}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
                <Building2 size={36} color={textMuted} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: text, margin: "0 0 6px" }}>No companies yet</p>
                <p style={{ fontSize: 12, color: textMuted, margin: "0 0 16px" }}>Add your company profile to use on invoices and reports</p>
                <button onClick={() => setShowModal(true)}
                  style={{ padding: "9px 20px", background: palette.primary, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  + Add First Company
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {companies.map(c => (
                  <div key={c.id} style={{ background: cardBg, border: `1px solid ${c.is_active ? palette.primary : border}`, borderRadius: 16, padding: 18, display: "flex", alignItems: "center", gap: 16, boxShadow: c.is_active ? `0 0 0 1px ${palette.primary}40, 0 4px 20px ${palette.primary}20` : "none" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: "#fff", border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      {c.logo_url ? <img src={c.logo_url} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Building2 size={22} color="#94a3b8" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: text, margin: 0 }}>{c.company_name}</p>
                        {c.is_active && <span style={{ background: `${palette.primary}20`, color: palette.primary, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>✓ Active</span>}
                      </div>
                      {c.address && <p style={{ fontSize: 11, color: textMuted, margin: "1px 0" }}>📍 {c.address}{c.city ? `, ${c.city}` : ""}</p>}
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                        {c.phone && <span style={{ fontSize: 11, color: textMuted }}>📞 {c.phone}</span>}
                        {c.ntn && <span style={{ fontSize: 11, color: textMuted }}>NTN: {c.ntn}</span>}
                        {c.bank_name && <span style={{ fontSize: 11, color: textMuted }}>🏦 {c.bank_name}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {!c.is_active && (
                        <button onClick={() => activateMut.mutate(c.id)} disabled={activateMut.isPending}
                          style={{ padding: "7px 14px", background: `${palette.primary}15`, color: palette.primary, border: `1px solid ${palette.primary}40`, borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          Set Active
                        </button>
                      )}
                      <button onClick={() => { setEditing(c); setShowModal(true); }}
                        style={{ padding: "7px 12px", background: "var(--theme-surface)", border: `1px solid ${border}`, borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: "pointer", color: text }}>
                        Edit
                      </button>
                      <button onClick={() => { if (window.confirm("Delete this company?")) delMut.mutate(c.id); }}
                        style={{ padding: "7px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 9, fontSize: 11, cursor: "pointer" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeCompany && (
              <div style={{ marginTop: 20, background: isDark ? "rgba(255,255,255,0.02)" : "#f0fdf4", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#bbf7d0"}`, borderRadius: 14, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: palette.primary, textTransform: "uppercase", margin: "0 0 10px" }}>📋 Active Company Details (used on invoices)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { l: "Company", v: activeCompany.company_name },
                    { l: "NTN", v: activeCompany.ntn || "—" },
                    { l: "Address", v: activeCompany.address || "—" },
                    { l: "Phone", v: activeCompany.phone || "—" },
                    { l: "Bank", v: activeCompany.bank_name || "—" },
                    { l: "IBAN", v: activeCompany.bank_iban || "—" },
                  ].map(x => (
                    <div key={x.l} style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: 10, padding: "8px 12px" }}>
                      <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{x.l}</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: text, margin: "2px 0 0" }}>{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ THEME TAB ══ */}
        {activeTab === "theme" && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: text, margin: "0 0 16px" }}>Appearance</h2>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: "0 0 14px" }}>Theme Mode</p>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { id: "light", label: "Light Mode", icon: Sun, desc: "Clean white background" },
                  { id: "dark", label: "Dark Mode", icon: Moon, desc: "Dark professional look" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => opt.id !== mode && toggleMode()}
                    style={{ flex: 1, padding: "18px 16px", borderRadius: 14, border: `2px solid ${mode === opt.id ? palette.primary : border}`, background: mode === opt.id ? `${palette.primary}15` : "var(--theme-surface)", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 8, transition: "all 0.15s" }}>
                    <opt.icon size={20} color={mode === opt.id ? palette.primary : textMuted} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: mode === opt.id ? palette.primary : text, margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 11, color: textMuted, margin: "2px 0 0" }}>{opt.desc}</p>
                    </div>
                    {mode === opt.id && <span style={{ fontSize: 10, fontWeight: 700, color: palette.primary }}>✓ Active</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: "0 0 14px" }}>Color Palette</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {COLOR_PALETTES.map(p => (
                  <button key={p.id} onClick={() => setPalette(p.id)}
                    style={{ padding: "14px 10px", borderRadius: 14, border: `2px solid ${paletteId === p.id ? p.primary : border}`, background: paletteId === p.id ? `${p.primary}15` : "var(--theme-surface)", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: p.primary }} />
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: p.secondary }} />
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: p.accent }} />
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: paletteId === p.id ? p.primary : text, margin: 0 }}>{p.label}</p>
                    {paletteId === p.id && <p style={{ fontSize: 9, color: p.primary, margin: "2px 0 0" }}>✓ Active</p>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: "0 0 14px" }}>Preview</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["Primary", "Secondary", "Accent"].map((l, i) => {
                  const c = [palette.primary, palette.secondary, palette.accent][i];
                  return (
                    <div key={l} style={{ flex: 1, minWidth: 80, background: c, borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: "#fff", margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{l}</p>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", margin: "2px 0 0" }}>{c}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ REGION TAB ══ */}
        {activeTab === "region" && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: text, margin: "0 0 6px" }}>Region Settings</h2>
            <p style={{ fontSize: 12, color: textMuted, margin: "0 0 16px" }}>Country and currency are set per company profile. Edit a company to change.</p>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 20, marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: "0 0 12px" }}>Supported Countries & Currencies</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {COUNTRIES_LIST.map(c => (
                  <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc", borderRadius: 10, border: `1px solid ${border}` }}>
                    <span style={{ fontSize: 20 }}>{c.flag}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: 0 }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{c.currency} — {c.symbol}</p>
                    </div>
                    <span style={{ background: `${palette.primary}15`, color: palette.primary, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{c.code}</span>
                  </div>
                ))}
              </div>
            </div>
            <Link to={createPageUrl("AdminSettings")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: cardBg, border: `1px solid ${border}`, borderRadius: 14, textDecoration: "none" }}>
              <MapPin size={16} color={palette.primary} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: 0 }}>Stations / Cities Cleanup</p>
                <p style={{ fontSize: 11, color: textMuted, margin: "2px 0 0" }}>Manage and clean up station data</p>
              </div>
              <ChevronRight size={14} color={textMuted} />
            </Link>
          </div>
        )}

        {/* ══ ROADMAP TAB ══ */}
        {activeTab === "roadmap" && (
          <RoadmapTab isDark={isDark} cardBg={cardBg} border={border} text={text} textMuted={textMuted} palette={palette} />
        )}

      </main>
    </div>
  );
}