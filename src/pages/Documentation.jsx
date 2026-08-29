import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import {
  Printer, BookOpen, Shield, AlertTriangle, Leaf, ChevronDown, ChevronRight,
  User, Truck, FileText, Package, BarChart2, Users, Pencil, Save, X, Plus,
  Trash2, Check, RefreshCw, UserCog, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%231e293b' width='200' height='200'/%3E%3Ctext x='100' y='100' font-size='48' fill='%23ffffff' text-anchor='middle' dy='.3em' font-weight='bold'%3ELogo%3C/text%3E%3C/svg%3E";

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SOP DATA (used when no saved version exists)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SOP_DATA = {
  admin: {
    label: "Administrator", icon: Shield, color: "text-red-600 bg-red-50",
    sections: [
      { title: "Daily Operations", steps: ["Review Dashboard KPIs: active loads, pending invoices, fleet status.", "Check Admin Panel for new user access requests and approve/reject.", "Monitor recent loads — confirm all in-transit shipments have updated statuses.", "Review outstanding invoices and follow up on overdue payments.", "Check fleet vehicle availability and any maintenance alerts."] },
      { title: "Load Management", steps: ["Create new Load via Loads → New Load. Assign client, vehicle, route and cargo details.", "Assign broker if applicable. Set freight amount and payment type (Paid / To Pay).", "Monitor load status through: Booked → Loading → In Transit → Delivered → Completed.", "Generate and print Bilty/GR from Load Detail for Pakistan/India operations.", "For international shipments generate CMR Waybill (EU/UK) or Bill of Lading (USA/International)."] },
      { title: "Fleet & Asset Management", steps: ["Add own fleet vehicles under Fleet section with complete registration details.", "For each trip, create a Fleet Trip linked to the relevant load/bilty.", "Record all fleet expenses (fuel, maintenance, toll, salary) per vehicle.", "Complete Trip P&L after each trip to track profitability.", "Monitor asset installments and insurance expiry dates via Assets section."] },
      { title: "Finance & Accounting", steps: ["Record all income and expenses via Accounting module.", "Generate invoices for completed loads and email to clients.", "Reconcile bank accounts monthly against accounting entries.", "Run Monthly P&L report from Admin Panel to review profitability.", "Process payroll at month-end via HR Payroll section."] },
      { title: "Compliance — Pakistan", steps: ["Ensure all vehicles have valid fitness certificates and route permits.", "Maintain NTN, STRN documentation for all invoicing.", "Comply with FBR regulations for applicable tax filings.", "Keep vehicle registration and third-party insurance current."], region: "pakistan" },
      { title: "Compliance — India", steps: ["Generate e-Way Bill for all consignments above GST threshold.", "Maintain valid vehicle fitness and national permit.", "Ensure driver has valid LMV/HMV license and Fastag active.", "Record GSTIN of clients for invoice compliance."], region: "india" },
      { title: "Compliance — USA", steps: ["Ensure all carriers have valid USDOT and MC numbers.", "All drivers must comply with FMCSA HOS regulations.", "Rate Confirmation and Bill of Lading are mandatory for every load.", "Hazmat loads require proper placarding and hazmat-certified driver.", "Maintain ELD compliance for all CMV drivers."], region: "usa" },
      { title: "Compliance — EU/UK", steps: ["CMR Waybill must accompany all cross-border shipments.", "Drivers must observe EU drivers' hours (Regulation EC 561/2006) and use tachograph.", "Ensure vehicle operator licence and goods vehicle operator licence are current.", "Customs declarations required for all non-EU cross-border movements (post-Brexit for UK).", "ADR compliance required for dangerous goods transport."], region: "eu" },
    ]
  },
  operations: {
    label: "Operations", icon: Package, color: "text-blue-600 bg-blue-50",
    sections: [
      { title: "Creating a New Load", steps: ["Navigate to Loads → tap New Load (+) button.", "Select Client from the dropdown (or add new client if not listed).", "Select Broker if applicable.", "Choose Vehicle: select from Pool Vehicles or toggle 'Own Fleet' to use a fleet vehicle.", "Enter Origin, Destination, Cargo Type and Weight.", "Set Loading Date and expected Delivery Date.", "Enter Freight Amount, Advance, and Balance. Set payment type (Paid/To Pay).", "Add any notes (consignee address, special instructions).", "Save — load number is auto-generated. Print bilty from Load Detail."] },
      { title: "Updating Load Status", steps: ["Open Load Detail from the Loads list.", "Tap the status chip to cycle through: Booked → Loading → In Transit → Delivered → Completed.", "Upload loading photos and seal number for verification if required.", "Mark as Completed only after delivery confirmation is received."] },
      { title: "Managing Clients & Brokers", steps: ["Add new clients via Clients section with full contact and address details.", "For regular clients, GST/NTN number must be recorded for invoice compliance.", "Brokers are managed separately — record commission rate and PAN/NTN.", "Update client/broker status to Inactive if no longer active."] },
      { title: "Document Printing", steps: ["Open Load Detail → tap the document type you need (Bilty, BOL, CMR, etc.).", "Review the document preview, then tap Print.", "For Pakistan/India: use Bilty/GR format.", "For USA: use Bill of Lading (BOL) format.", "For EU/UK international: use CMR Waybill format."] },
    ]
  },
  accounting: {
    label: "Accounting", icon: BarChart2, color: "text-cyan-600 bg-cyan-50",
    sections: [
      { title: "Daily Tasks", steps: ["Check Accounting Dashboard for pending invoices and overdue payments.", "Record any new receipts from clients against outstanding invoices.", "Enter daily cash/bank transactions in Accounting Entries."] },
      { title: "Invoice Management", steps: ["Generate invoice for a completed load: Loads → Load Detail → Create Invoice.", "Review invoice details (freight, labor, other charges, GST).", "Change invoice status to Sent once dispatched to client.", "Record partial or full payments as they are received.", "Mark invoice as Paid once fully settled."] },
      { title: "Ledger & Reconciliation", steps: ["Record all accounting entries (payment, receipt, journal, contra) in Accounting Module.", "Reconcile bank account balances monthly against bank statements.", "Run client ledgers to check outstanding balances.", "Use Transaction Ledger (Admin Panel) for detailed load-level cost analysis."] },
      { title: "Payroll", steps: ["At month-end, navigate to HR Payroll → Generate Payroll for the month.", "Review each employee's basic salary, allowances, overtime and deductions.", "Process payment and mark payroll as Paid.", "Record payroll as an accounting expense entry."] },
    ]
  },
  fleet_manager: {
    label: "Fleet Manager", icon: Truck, color: "text-green-600 bg-green-50",
    sections: [
      { title: "Daily Fleet Check", steps: ["Review Fleet Dashboard for vehicle availability and status.", "Check for any vehicles in Maintenance or Inactive status.", "Confirm driver assignments for upcoming trips.", "Verify insurance and fitness certificate expiry dates."] },
      { title: "Trip Management", steps: ["Create Fleet Trip for each journey: Fleet → Fleet Trips → Add Trip.", "Assign vehicle, driver, route, and link to a Load/Bilty if applicable.", "After trip completion, fill in Trip P&L with all income and expenses.", "Record fuel, toll, driver allowance, and other trip-specific costs."] },
      { title: "Expense Recording", steps: ["Record all vehicle expenses under Fleet → Fleet Expenses.", "Categorize correctly: fuel, salary, spare parts, maintenance, insurance, tyre, oil.", "Link expenses to a trip where possible for accurate P&L tracking.", "Monthly totals are visible in Fleet P&L report."] },
    ]
  },
  driver: {
    label: "Driver", icon: User, color: "text-amber-600 bg-amber-50",
    sections: [
      { title: "Pre-Trip Checklist", steps: ["Confirm your vehicle assignment from the Fleet Manager.", "Verify vehicle documents: registration, fitness certificate, insurance.", "Ensure you have the bilty/transport document for the load.", "Check fuel level, tyre condition, lights, and brakes before departure.", "Record starting odometer reading."] },
      { title: "During Trip", steps: ["Follow the assigned route as per load instructions.", "Comply with local traffic laws and driving hours regulations.", "Report any incidents, route changes, or delays to your Fleet Manager immediately.", "Keep all toll and fuel receipts for expense recording.", "Do not break seals or allow unauthorized access to cargo."] },
      { title: "Post-Trip", steps: ["Obtain consignee signature on the bilty/delivery receipt.", "Upload delivery proof photo if required by operations team.", "Report ending odometer reading to Fleet Manager.", "Submit all expense receipts (fuel, toll, misc.) to Fleet Manager.", "Report any vehicle issues or maintenance needs."] },
    ]
  },
  supervisor: {
    label: "Loading Supervisor", icon: Package, color: "text-purple-600 bg-purple-50",
    sections: [
      { title: "Loading Operations", steps: ["Receive load assignment from Operations team.", "Coordinate labour team for loading at origin point.", "Verify cargo type and quantity matches the bilty/load document.", "Supervise proper stacking, securing and covering of cargo.", "Record seal number once loading is complete and sealed.", "Upload loading photos as per company SOP.", "Update loading status to Completed in the app."] },
      { title: "Documentation", steps: ["Ensure bilty/GR is signed by the consignor before vehicle departure.", "Cross-check vehicle number against the bilty.", "Report any discrepancies in cargo immediately to Operations Manager."] },
    ]
  },
};

const DEFAULT_EHS = `**1. Purpose**
This EHS (Environment, Health & Safety) Policy establishes the commitment of the Company to protecting the health and safety of all employees, contractors, and the public, and to minimizing environmental impacts from our logistics operations.

**2. Scope**
Applicable to all staff, drivers, fleet operations, warehousing, and contractor partners.

**3. Health & Safety Commitments**
- All drivers must be medically fit and hold valid driving licences for their vehicle class.
- Personal Protective Equipment (PPE) — safety boots, high-visibility vests, gloves — must be worn at all loading/unloading points.
- No driver shall operate a vehicle while fatigued. Mandatory rest breaks must be observed as per regional regulations.
- All vehicles must have functioning safety equipment: fire extinguisher, first-aid kit, reflective triangles.
- Incidents, near-misses and accidents must be reported to management within 24 hours.

**4. Environmental Commitments**
- Fuel-efficient driving practices are encouraged to reduce carbon emissions.
- Vehicle maintenance is scheduled regularly to minimize emissions and fluid leaks.
- Hazardous waste (used oil, tyres) must be disposed of through authorized channels only.
- Paper-based documentation is being progressively replaced by this digital system.

**5. Hazardous Goods**
- Hazmat/DG cargo must be declared at booking stage.
- Only licensed carriers and ADR/certified drivers may transport dangerous goods.
- Proper placarding, labelling, and emergency response documentation (MSDS/SDS) must accompany each DG shipment.

**6. Compliance**
Non-compliance with this policy may result in disciplinary action. The Company reserves the right to suspend operations that pose an unacceptable safety risk.

**7. Review**
This policy is reviewed annually by Senior Management. Last reviewed: ${new Date().getFullYear()}.`;

const DEFAULT_MDG = `**Sustainable Logistics Goals 2050**

Aligned with UN Sustainable Development Goals (SDGs) and global freight decarbonization targets, the Company commits to the following long-term goals:

**Goal 1: Net Zero Carbon by 2050**
Progressive transition of fleet to zero-emission vehicles (electric, hydrogen fuel cell). Interim target: 50% fleet electrification by 2035.

**Goal 2: Zero Fatalities**
Implement Vision Zero road safety framework across all operations by 2030. Mandatory ADAS (Advanced Driver Assistance Systems) on all new vehicle acquisitions from 2026.

**Goal 3: Circular Economy**
100% recyclable or biodegradable packaging for any company-supplied packaging materials by 2030. Vehicle tyres and batteries to be recovered through certified recycling programs.

**Goal 4: Digital First Operations**
Full elimination of paper-based documentation by 2027 through digital transport management, e-CMR, and electronic POD.

**Goal 5: Local Community Engagement**
Maintain a minimum 80% local employment rate in all operational regions. Annual driver training and skills development programs.

**Goal 6: Water & Resource Conservation**
Vehicle washing facilities to use water recycling systems by 2028. All company offices to be powered by renewable energy by 2030.

**Goal 7: Biodiversity**
Avoid operations in ecologically sensitive areas. Partner with reforestation programs to offset unavoidable carbon emissions annually.

**Reporting**
Annual Sustainability Report to be published each year covering progress against these goals. Accessible to all stakeholders on request.`;

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const ALL_ROLES = [
  { value: "admin",             label: "🔴 Admin" },
  { value: "management",        label: "🏢 Management" },
  { value: "sleeping_partner",  label: "👁 Sleeping Partner" },
  { value: "operations",        label: "🚛 Operations" },
  { value: "supervisor",        label: "📋 Supervisor" },
  { value: "accounting",        label: "💼 Accounting" },
  { value: "fleet_manager",     label: "🚗 Fleet Manager" },
  { value: "driver",            label: "🧑‍✈️ Driver" },
  { value: "labour_supervisor", label: "👷 Labour Supervisor" },
  { value: "client",            label: "🏢 Client" },
  { value: "user",              label: "⏳ Pending" },
];

const ROLE_COLORS = {
  admin: "bg-red-100 text-red-700", management: "bg-purple-100 text-purple-700",
  sleeping_partner: "bg-indigo-100 text-indigo-700", operations: "bg-blue-100 text-blue-700",
  supervisor: "bg-cyan-100 text-cyan-700", accounting: "bg-green-100 text-green-700",
  fleet_manager: "bg-orange-100 text-orange-700", driver: "bg-yellow-100 text-yellow-700",
  labour_supervisor: "bg-pink-100 text-pink-700", client: "bg-teal-100 text-teal-700",
  user: "bg-slate-100 text-slate-500",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function MarkdownLike({ text }) {
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-3">
      {text.trim().split("\n\n").map((para, i) => {
        if (para.startsWith("**") && para.includes("**\n")) {
          const [bold, ...rest] = para.split("\n");
          return (
            <div key={i}>
              <p className="font-bold text-slate-900 text-sm">{bold.replace(/\*\*/g, "")}</p>
              {rest.map((line, j) => (
                <p key={j} className="text-xs text-slate-700 leading-relaxed">
                  {line.startsWith("- ") ? `• ${line.slice(2)}` : line}
                </p>
              ))}
            </div>
          );
        }
        return <p key={i} className="text-xs text-slate-700 leading-relaxed">{para.replace(/\*\*(.*?)\*\*/g, "$1")}</p>;
      })}
    </div>
  );
}

function PrintableDoc({ title, children, logo, companyProfile }) {
  const cp = companyProfile || {};
  const printId = `doc-${title.replace(/\s/g, "-").toLowerCase()}`;
  const handlePrint = () => {
    const content = document.getElementById(printId);
    if (!content) return;
    const original = document.body.innerHTML;
    document.body.innerHTML = content.innerHTML;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };
  return (
    <div>
      <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium transition-colors">
        <Printer className="w-3.5 h-3.5" /> Print
      </button>
      <div id={printId} style={{ display: "none" }}>
        <style>{`@media print { @page { margin: 15mm; } body { font-family: Arial, sans-serif; } }`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "2px solid #1e293b", paddingBottom: "10px", marginBottom: "16px" }}>
          <img src={logo || DEFAULT_LOGO} alt="Logo" style={{ height: "60px", objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: "bold", fontSize: "16px" }}>{cp.company_name || "Company"}</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>{cp.address || ""}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontWeight: "bold", fontSize: "18px" }}>{title}</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Issued: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: "11px", lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOP SECTION (view + edit)
// ─────────────────────────────────────────────────────────────────────────────
function SOPSection({ section, isAdmin, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [steps, setSteps] = useState([...section.steps]);

  const handleSave = () => {
    onUpdate({ ...section, title, steps });
    setEditing(false);
  };

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden mb-2">
      <button className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-slate-50 transition-colors" onClick={() => setOpen(v => !v)}>
        <span className="text-sm font-semibold text-slate-800">{section.title}</span>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span onClick={e => { e.stopPropagation(); setEditing(true); setOpen(true); }}
              className="p-1 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600">
              <Pencil className="w-3.5 h-3.5" />
            </span>
          )}
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && !editing && (
        <div className="bg-slate-50 px-4 pb-4 pt-2">
          <ol className="list-decimal list-inside space-y-2">
            {section.steps.map((step, i) => (
              <li key={i} className="text-xs text-slate-700 leading-relaxed">{step}</li>
            ))}
          </ol>
        </div>
      )}

      {open && editing && (
        <div className="bg-blue-50 px-4 pb-4 pt-3 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Section Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Steps</label>
              <button onClick={() => setSteps(s => [...s, "New step"])}
                className="text-[10px] text-blue-600 font-bold flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[10px] text-slate-400 font-bold mt-2.5 w-4 shrink-0">{i + 1}.</span>
                <textarea value={step} onChange={e => { const n = [...steps]; n[i] = e.target.value; setSteps(n); }} rows={2}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
                <button onClick={() => setSteps(s => s.filter((_, j) => j !== i))}
                  className="mt-1 p-1.5 rounded-lg hover:bg-red-100 text-slate-300 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setEditing(false); setTitle(section.title); setSteps([...section.steps]); }}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Cancel</button>
            <button onClick={handleSave}
              className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1">
              <Save className="w-3.5 h-3.5" /> Save Section
            </button>
            <button onClick={() => { if (window.confirm("Delete this section?")) onDelete(section.title); }}
              className="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs hover:bg-red-100">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER ROLE MANAGER (uses SignupRequest entity as user store)
// ─────────────────────────────────────────────────────────────────────────────
function UserRoleManager() {
  const qc = useQueryClient();
  const [editUser, setEditUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: "", email: "", phone: "", assigned_role: "operations" });
  const [saving, setSaving] = useState(false);

  // Store managed users in SignupRequest with status="managed_user"
  const { data: managedUsers = [], isLoading, refetch } = useQuery({
    queryKey: ["managed_users"],
    queryFn: async () => {
      const all = await base44.entities.SignupRequest.list("-created_date");
      return all.filter(r => r.status === "managed_user" || r.status === "active_user");
    },
  });

  // Also try to load current user from base44 auth
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  // Try to load all base44 users (works only for app owner)
  const { data: authUsers = [] } = useQuery({
    queryKey: ["auth_users"],
    queryFn: async () => {
      try {
        const r = await base44.auth.getUsers();
        const arr = Array.isArray(r) ? r : Array.isArray(r?.users) ? r.users : [];
        return arr;
      } catch { return []; }
    },
  });

  // Merge: auth users take priority, fill in from managedUsers for those not in auth list
  const mergedUsers = React.useMemo(() => {
    const result = [...authUsers];
    managedUsers.forEach(mu => {
      if (!result.find(u => u.email === mu.email)) {
        result.push({
          id: mu.id,
          email: mu.email,
          full_name: mu.full_name,
          role: mu.assigned_role || "user",
          _source: "managed",
          _record: mu,
        });
      }
    });
    return result;
  }, [authUsers, managedUsers]);

  const handleSaveRole = async () => {
    if (!editUser || !newRole) return;
    setSaving(true);
    try {
      // Try base44 auth first
      let authSuccess = false;
      const attempts = [
        () => base44.auth.updateUserRole(editUser.id, newRole),
        () => base44.auth.updateUser(editUser.id, { role: newRole }),
        () => base44.users?.update(editUser.id, { role: newRole }),
      ];
      for (const fn of attempts) {
        try { await fn(); authSuccess = true; break; } catch (_) {}
      }

      // Also upsert in SignupRequest so role is visible to all admins
      const existing = managedUsers.find(u => u.email === editUser.email);
      if (existing) {
        await base44.entities.SignupRequest.update(existing.id, { assigned_role: newRole, status: "managed_user" });
      } else {
        await base44.entities.SignupRequest.create({
          email: editUser.email,
          full_name: editUser.full_name || editUser.email?.split("@")[0] || "",
          assigned_role: newRole,
          status: "managed_user",
          reason: "Role managed via Admin panel",
        });
      }

      toast.success(`Role updated to "${newRole.replace(/_/g, " ")}"`);
      setEditUser(null);
      qc.invalidateQueries(["managed_users"]);
      qc.invalidateQueries(["auth_users"]);
    } catch (err) {
      toast.error("Error: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!addForm.email || !addForm.full_name) { toast.error("Name and email required"); return; }
    setSaving(true);
    try {
      // Try to invite via base44
      try { await base44.users.inviteUser(addForm.email, addForm.assigned_role === "admin" ? "admin" : "user"); } catch (_) {}
      // Record in SignupRequest
      await base44.entities.SignupRequest.create({
        email: addForm.email,
        full_name: addForm.full_name,
        phone: addForm.phone,
        assigned_role: addForm.assigned_role,
        status: "managed_user",
        reason: "Added by admin",
      });
      toast.success("User added. Invite sent if email is valid.");
      setShowAdd(false);
      setAddForm({ full_name: "", email: "", phone: "", assigned_role: "operations" });
      qc.invalidateQueries(["managed_users"]);
    } catch (err) {
      toast.error("Error: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (user) => {
    if (!window.confirm(`Remove ${user.full_name || user.email} from user list?`)) return;
    try {
      const existing = managedUsers.find(u => u.email === user.email);
      if (existing) await base44.entities.SignupRequest.update(existing.id, { status: "removed" });
      toast.success("User removed from list");
      qc.invalidateQueries(["managed_users"]);
    } catch (err) {
      toast.error("Error: " + (err?.message || ""));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
        <p className="font-bold mb-1">ℹ️ User Role Management</p>
        <p>Role changes here sync to the app immediately. Full base44 auth list is only visible to the app owner — other admins can manage roles via this panel which stores records locally.</p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{mergedUsers.length} users</p>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs text-slate-500 px-3 py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs text-white bg-slate-900 px-3 py-1.5 rounded-xl">
            <Plus className="w-3.5 h-3.5" /> Add User
          </button>
        </div>
      </div>

      {/* Current logged-in user always shown */}
      {currentUser && !mergedUsers.find(u => u.email === currentUser.email) && (
        <div className="bg-white rounded-2xl p-4 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
              {(currentUser.full_name || currentUser.email || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.full_name || currentUser.email?.split("@")[0]}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
              <p className="text-[10px] text-blue-500 font-semibold">You (current session)</p>
            </div>
            <span className={`text-[11px] px-2.5 py-1 rounded-full capitalize font-semibold ${ROLE_COLORS[currentUser.role] || "bg-slate-100 text-slate-500"}`}>
              {(currentUser.role || "user").replace(/_/g, " ")}
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl p-4 border animate-pulse h-16" />)
      ) : (
        mergedUsers.map((u, idx) => (
          <div key={u.id || u.email || idx} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
              {(u.full_name || u.email || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name || u.email?.split("@")[0] || "—"}</p>
              <p className="text-xs text-slate-400 truncate">{u.email}</p>
              {u._source === "managed" && <p className="text-[10px] text-slate-400 italic">Locally managed</p>}
            </div>
            <span className={`text-[11px] px-2.5 py-1 rounded-full capitalize font-semibold whitespace-nowrap ${ROLE_COLORS[u.role] || "bg-slate-100 text-slate-500"}`}>
              {(u.role || "user").replace(/_/g, " ")}
            </span>
            <button onClick={() => { setEditUser(u); setNewRole(u.role || "user"); }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 shrink-0">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleRemove(u)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}

      {mergedUsers.length === 0 && !isLoading && (
        <div className="text-center py-10 text-slate-400 text-sm">
          <UserCog className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No users yet. Add users or refresh to load from base44.</p>
        </div>
      )}

      {/* Edit Role Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Change Role</h2>
              <button onClick={() => setEditUser(null)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 bg-slate-50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm">
                {(editUser.full_name || editUser.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{editUser.full_name || editUser.email?.split("@")[0]}</p>
                <p className="text-xs text-slate-500">{editUser.email}</p>
              </div>
              <span className={`ml-auto text-[11px] px-2.5 py-1 rounded-full capitalize font-semibold ${ROLE_COLORS[editUser.role] || "bg-slate-100 text-slate-500"}`}>
                {(editUser.role || "user").replace(/_/g, " ")}
              </span>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-600 uppercase">New Role</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map(r => (
                  <button key={r.value} onClick={() => setNewRole(r.value)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 text-left transition-all ${newRole === r.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
              {newRole === "client" && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-700">
                  <p className="font-bold mb-1">🏢 Client Portal Access</p>
                  <p>After saving, go to <strong>Clients → 🛡️ Shield icon</strong> to link this user to their client account.</p>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditUser(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">Cancel</button>
                <button onClick={handleSaveRole} disabled={saving || newRole === editUser.role}
                  className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50">
                  {saving ? "Saving..." : "Update Role"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add / Invite User</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Full Name *</label>
                <input value={addForm.full_name} onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="e.g. Ahmed Khan"
                  className="w-full mt-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Email *</label>
                <input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full mt-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Phone</label>
                <input value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+92 300 1234567"
                  className="w-full mt-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Assign Role</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {ALL_ROLES.filter(r => r.value !== "user").map(r => (
                    <button key={r.value} onClick={() => setAddForm(p => ({ ...p, assigned_role: r.value }))}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border-2 text-left transition-all ${addForm.assigned_role === r.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-[10px] text-slate-500">
                ℹ️ An invite will be sent to their email. After signup, use Edit (✏️) to confirm their final role.
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">Cancel</button>
                <button onClick={handleAddUser} disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50">
                  {saving ? "Saving..." : "Add & Invite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Documentation() {
  const { settings } = useAppSettings();
  const { role, isAdmin } = useRole();
  const qc = useQueryClient();

  const [tab, setTab] = useState("sop");
  const [selectedRole, setSelectedRole] = useState("admin");
  const [guideSection, setGuideSection] = useState(null);
  const [editingEHS, setEditingEHS] = useState(false);
  const [editingMDG, setEditingMDG] = useState(false);
  const [ehsDraft, setEhsDraft] = useState("");
  const [mdgDraft, setMdgDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role && DEFAULT_SOP_DATA[role]) setSelectedRole(role);
  }, [role]);

  const companyProfile = (() => { try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; } })();
  const logo = companyProfile?.logo_url || DEFAULT_LOGO;

  // Load saved content from ReportConfig entity (keyed by report_name)
  const { data: savedConfigs = [] } = useQuery({
    queryKey: ["doc_configs"],
    queryFn: () => base44.entities.ReportConfig.list(),
  });

  const getConfig = (key) => savedConfigs.find(c => c.report_name === key);
  const getContent = (key, fallback) => {
    const c = getConfig(key);
    return c?.config_data ? c.config_data : fallback;
  };

  const ehsContent = getContent("__ehs_policy__", DEFAULT_EHS);
  const mdgContent = getContent("__mdg_2050__", DEFAULT_MDG);

  // SOP data: stored per-role
  const getSopData = (r) => {
    const saved = getContent(`__sop_${r}__`, null);
    if (saved && typeof saved === "object") {
      return { ...DEFAULT_SOP_DATA[r], sections: saved.sections || DEFAULT_SOP_DATA[r].sections };
    }
    return DEFAULT_SOP_DATA[r];
  };

  const saveConfig = async (key, data) => {
    setSaving(true);
    try {
      const existing = getConfig(key);
      if (existing) {
        await base44.entities.ReportConfig.update(existing.id, { config_data: data });
      } else {
        await base44.entities.ReportConfig.create({ report_name: key, config_data: data });
      }
      qc.invalidateQueries(["doc_configs"]);
      toast.success("Saved successfully");
    } catch (err) {
      toast.error("Save failed: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const sopData = getSopData(selectedRole) || DEFAULT_SOP_DATA.operations;
  const filteredSections = sopData.sections.filter(s => !s.region || s.region === settings.code);

  const handleSopSectionUpdate = (updatedSection) => {
    const newSections = sopData.sections.map(s => s.title === updatedSection.title ? updatedSection : s);
    // But if title changed, match by position
    saveConfig(`__sop_${selectedRole}__`, { sections: newSections });
  };

  const handleSopSectionDelete = (sectionTitle) => {
    const newSections = sopData.sections.filter(s => s.title !== sectionTitle);
    saveConfig(`__sop_${selectedRole}__`, { sections: newSections });
  };

  const handleSopAddSection = () => {
    const newSections = [...sopData.sections, { title: "New Section", steps: ["Add your step here"] }];
    saveConfig(`__sop_${selectedRole}__`, { sections: newSections });
  };

  const USER_GUIDE_SECTIONS = [
    { title: "Getting Started & Roles", icon: "🚀", content: `When you first sign up, your account starts with a pending status. An Administrator must assign you a role before you can access the system.\n\n**User Roles:**\n- **Admin** — Full access to every module, user management, reports, and settings.\n- **Operations** — Create and manage loads, clients, brokers, and pool vehicles.\n- **Accounting** — Invoices, ledger entries, payroll, bank accounts, and financial reports.\n- **Fleet Manager** — Fleet vehicles, trips, expenses, maintenance, and P&L.\n- **Driver** — View their own assigned vehicle and trip history.\n- **Loading Supervisor** — Update loading status, upload photos, and verify cargo.\n- **Sleeping Partner** — Read-only view of all company data and analytics.` },
    { title: "Dashboard", icon: "📊", content: `The Dashboard is your home screen and shows real-time KPIs relevant to your role.\n\n**Date Range Filter** — Tap 1M / 3M / 6M / 1Y / All at the top to change the reporting window.\n\n**KPI Cards (role-based):**\n- Active Loads, Total Dispatched, Total Revenue, Active Fleet Vehicles, Outstanding Invoices.` },
    { title: "Loads & Bilties", icon: "📦", content: `A Load is a shipment record — called Bilty/GR (Pakistan/India), BOL (USA), or CMR (EU/UK).\n\n**Creating a Load:**\n1. Go to Loads → tap the + button.\n2. Select or create a Client.\n3. Choose vehicle: pool vehicle or toggle Own Fleet.\n4. Enter Origin, Destination, Cargo Type, and Weight.\n5. Set Loading Date and expected Delivery Date.\n6. Enter Freight Amount. Choose Paid or To Pay.\n7. Save — Load Number is auto-generated.` },
    { title: "Fleet Management", icon: "🚛", content: `Manage your company-owned vehicles, trips, and costs under the Fleet section.\n\n**Fleet Trips:**\n- Create a trip for each journey using an own vehicle.\n- Link to an existing Load/Bilty if applicable.\n- After completion, fill in the Trip P&L form.` },
    { title: "Accounting & Finance", icon: "💰", content: `The Accounting module manages the full financial picture of the business.\n\n**Invoices:**\n- Generate from a completed load: Load Detail → Create Invoice.\n- Statuses: Draft → Sent → Partial → Paid → Overdue → Cancelled.\n\n**Bank Accounts:**\n- Add all company bank accounts with opening balance.\n- Tracks running balance from all linked entries.` },
    { title: "Admin Panel & Settings", icon: "⚙️", content: `The Admin Panel is for Administrators only and centralizes all management controls.\n\n**Staff & Users:**\n- View all app users and their assigned roles.\n- Invite new users by email.\n- Change user roles at any time.\n\n**App Settings:** Switch between Pakistan 🇵🇰, India 🇮🇳, USA 🇺🇸, EU 🇪🇺, or UK 🇬🇧.` },
  ];

  const TABS = [
    { id: "sop",   label: "SOPs",       icon: FileText },
    { id: "ehs",   label: "EHS Policy", icon: AlertTriangle },
    { id: "mdg",   label: "MDGs 2050",  icon: Leaf },
    { id: "guide", label: "User Guide", icon: BookOpen },
    ...(isAdmin ? [{ id: "users", label: "Users", icon: Users }] : []),
  ];

  return (
    <div className="pb-24">
      <MobileHeader title="Documentation" backTo={isAdmin ? "AdminPanel" : "Dashboard"} />

      {/* Tab Bar */}
      <div className="sticky top-[57px] z-30 bg-white border-b border-slate-100">
        <div className="flex overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">

        {/* ══ SOPs ══ */}
        {tab === "sop" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Standard Operating Procedures</h2>
              <span className="text-xs text-slate-400">{settings.flag} {settings.label}</span>
            </div>

            {/* Role Selector */}
            <div className="flex gap-2 flex-wrap mb-4">
              {Object.keys(DEFAULT_SOP_DATA).map(r => {
                const rd = DEFAULT_SOP_DATA[r];
                const Icon = rd.icon;
                return (
                  <button key={r} onClick={() => setSelectedRole(r)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${selectedRole === r ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {rd.label}
                  </button>
                );
              })}
            </div>

            {/* SOP header */}
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 ${sopData.color}`}>
              <sopData.icon className="w-4 h-4" />
              <span className="text-sm font-bold">{sopData.label} — SOP</span>
              <span className="ml-auto flex items-center gap-2">
                <PrintableDoc title={`${sopData.label} SOP`} logo={logo} companyProfile={companyProfile}>
                  {filteredSections.map(s => `\n${s.title}\n${s.steps.map((st, i) => `${i + 1}. ${st}`).join("\n")}\n`).join("\n")}
                </PrintableDoc>
              </span>
            </div>

            {/* Sections */}
            {filteredSections.map((section, i) => (
              <SOPSection key={`${selectedRole}-${i}-${section.title}`} section={section} isAdmin={isAdmin}
                onUpdate={handleSopSectionUpdate}
                onDelete={handleSopSectionDelete} />
            ))}

            {/* Add Section button (admin only) */}
            {isAdmin && (
              <button onClick={handleSopAddSection} disabled={saving}
                className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 hover:border-blue-300 hover:text-blue-500 flex items-center justify-center gap-2 transition-colors">
                <Plus className="w-4 h-4" /> Add New Section
              </button>
            )}
          </div>
        )}

        {/* ══ EHS Policy ══ */}
        {tab === "ehs" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">EHS Policy</h2>
              <div className="flex items-center gap-2">
                {isAdmin && !editingEHS && (
                  <button onClick={() => { setEhsDraft(ehsContent); setEditingEHS(true); }}
                    className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg font-medium">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <PrintableDoc title="EHS Policy" logo={logo} companyProfile={companyProfile}>
                  {ehsContent.replace(/\*\*/g, "")}
                </PrintableDoc>
              </div>
            </div>

            {editingEHS ? (
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 border border-blue-200">
                  Use **bold text** for headings. Separate paragraphs with blank lines. Use "- " for bullet points.
                </div>
                <textarea value={ehsDraft} onChange={e => setEhsDraft(e.target.value)} rows={24}
                  className="w-full px-4 py-3 text-xs font-mono border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-white leading-relaxed" />
                <div className="flex gap-3">
                  <button onClick={() => setEditingEHS(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">Cancel</button>
                  <button onClick={async () => { await saveConfig("__ehs_policy__", ehsDraft); setEditingEHS(false); }} disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save EHS Policy"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <MarkdownLike text={ehsContent} />
              </div>
            )}
          </div>
        )}

        {/* ══ MDGs 2050 ══ */}
        {tab === "mdg" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Sustainable Logistics Goals 2050</h2>
              <div className="flex items-center gap-2">
                {isAdmin && !editingMDG && (
                  <button onClick={() => { setMdgDraft(mdgContent); setEditingMDG(true); }}
                    className="flex items-center gap-1.5 text-xs bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-lg font-medium">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <PrintableDoc title="Sustainable Logistics Goals 2050" logo={logo} companyProfile={companyProfile}>
                  {mdgContent.replace(/\*\*/g, "")}
                </PrintableDoc>
              </div>
            </div>

            {editingMDG ? (
              <div className="space-y-3">
                <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700 border border-green-200">
                  Use **bold text** for headings. Separate paragraphs with blank lines.
                </div>
                <textarea value={mdgDraft} onChange={e => setMdgDraft(e.target.value)} rows={24}
                  className="w-full px-4 py-3 text-xs font-mono border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-300 resize-none bg-white leading-relaxed" />
                <div className="flex gap-3">
                  <button onClick={() => setEditingMDG(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">Cancel</button>
                  <button onClick={async () => { await saveConfig("__mdg_2050__", mdgDraft); setEditingMDG(false); }} disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save MDG Goals"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <MarkdownLike text={mdgContent} />
              </div>
            )}
          </div>
        )}

        {/* ══ User Guide ══ */}
        {tab === "guide" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">User Guide</h2>
              <PrintableDoc title="Complete User Guide" logo={logo} companyProfile={companyProfile}>
                {USER_GUIDE_SECTIONS.map(s => `\n${s.icon} ${s.title}\n${"─".repeat(40)}\n${s.content.replace(/\*\*/g, "")}\n`).join("\n")}
              </PrintableDoc>
            </div>
            <div className="space-y-2">
              {USER_GUIDE_SECTIONS.map((section, i) => (
                <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
                  <button className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-slate-50 transition-colors"
                    onClick={() => setGuideSection(guideSection === i ? null : i)}>
                    <div className="flex items-center gap-2">
                      <span>{section.icon}</span>
                      <span className="text-sm font-semibold text-slate-800">{section.title}</span>
                    </div>
                    {guideSection === i ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  {guideSection === i && (
                    <div className="bg-slate-50 px-4 pb-4 pt-2">
                      <MarkdownLike text={section.content} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Users (Admin only) ══ */}
        {tab === "users" && isAdmin && (
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">User Role Management</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage all app users and their roles from here</p>
            </div>
            <UserRoleManager />
          </div>
        )}

      </div>
    </div>
  );
}
