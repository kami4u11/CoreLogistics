import React from "react";
import { useAppSettings } from "@/components/AppSettings";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69995a1b4cc6b3863e378752/2cf5e616c_pvt_ltd_logo1-removebg-preview.png";

export default function BiltyPrint({ load, companyProfile, onClose }) {
  const { settings } = useAppSettings();
  const { symbol, docName, docNumberLabel, consignorLabel, consigneeLabel, freightLabel, currency, flag } = settings;

  const cp = companyProfile || {};
  const logoSrc = cp.logo_url || LOGO;
  const companyName = cp.company_name || "Saifran Logistics (Pvt) Ltd";
  const companyHeadOfficeLabel = cp.head_office_label || "Head Office";
  const companyAddr1 = cp.address_line1 || "Plot 352/A, Street No 1,";
  const companyAddr2 = cp.address_line2 || "Gate No 5, New Sabzi Mandi,";
  const companyAddr3 = cp.address_line3 || "Truck Stand, Hawksbay Road,";
  const companyCity = cp.city || "Karachi, Pakistan.";
  const companyPhone = cp.phone || "92 302-8296677";
  const companyEmail = cp.email || "contact@saifran.com";
  const companyWeb = cp.website || "www.saifran.com";

  const handlePrint = () => {
    const printContent = document.getElementById("bilty-print-area");
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalBody;
    window.location.reload();
  };

  if (!load) return null;

  // Build series number: extract trailing digits from load_number, prefix with 26, pad to 6 digits total
  const rawDigits = load.load_number?.replace(/\D/g, "") || "";
  // Try to get the sequential part (last 4 digits if exists, else full number)
  const seqPart = rawDigits ? String(parseInt(rawDigits.slice(-4)) || 1).padStart(4, "0") : String(Date.now()).slice(-4);
  const docNumber = "26" + seqPart;
  const isPaid = load.payment_type === "paid";
  const receiverName = load.receiver_name || "Self";
  const fmt = (n) => `${symbol}${Number(n || 0).toLocaleString()}`;

  const borderColor = "#f97316";
  const accentColor = "#f97316";

  // Region-specific document title
  const isPakistan = settings.code === "pakistan";
  const isIndia = settings.code === "india";
  const isUSA = settings.code === "usa";

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 no-print">
          <h2 className="text-base font-bold text-slate-800">
            {docName} Preview &nbsp;
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPaid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              {isPaid ? "PAID" : "TO PAY"}
            </span>
          </h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
              🖨️ Print {docName}
            </button>
            <button onClick={onClose} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg">
              ✕ Close
            </button>
          </div>
        </div>

        <div id="bilty-print-area" className="p-4">
          <style>{`
            @media print {
              @page { size: A4; margin: 10mm; }
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div style={{
            border: `3px solid ${borderColor}`,
            borderRadius: "8px",
            fontFamily: "Arial, sans-serif",
            overflow: "hidden",
            maxWidth: "720px",
            margin: "0 auto",
            background: "#fff"
          }}>
            {/* Header */}
            <div style={{ borderBottom: `2px solid ${accentColor}`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff8f3" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <img src={logoSrc} alt="Logo" style={{ height: "90px", objectFit: "contain" }} />
              </div>

              <div style={{ textAlign: "center" }}>
                {isPakistan && (
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", direction: "rtl" }}>سیفران لاجسٹکس</div>
                )}
                <div style={{ fontSize: "13px", fontWeight: "bold", color: accentColor, letterSpacing: "1px", marginTop: "2px" }}>
                  {docName?.toUpperCase()}
                </div>
                <div style={{ fontSize: "13px", fontWeight: "900", color: isPaid ? "#16a34a" : "#f97316", marginTop: "4px", letterSpacing: "3px", border: `2px solid ${isPaid ? "#16a34a" : "#f97316"}`, padding: "2px 10px", display: "inline-block", borderRadius: "4px" }}>
                  {isPaid ? "PAID" : "TO PAY"}
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{flag} {settings.label} · {currency}</div>
              </div>

              <div style={{ textAlign: "right", fontSize: "9.5px", color: "#475569", lineHeight: 1.7 }}>
                <div style={{ fontWeight: "bold", marginBottom: "2px", fontSize: "10px" }}>{companyHeadOfficeLabel}</div>
                <div>{companyAddr1}</div>
                {companyAddr2 && <div>{companyAddr2}</div>}
                {companyAddr3 && <div>{companyAddr3}</div>}
                <div>{companyCity}</div>
                <div>📞 {companyPhone}</div>
                <div>✉ {companyEmail}</div>
                <div style={{ color: accentColor, fontWeight: "600" }}>🌐 {companyWeb}</div>
              </div>
            </div>

            {/* Doc Number Bar */}
            <div style={{ background: accentColor, padding: "4px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fff", fontSize: "11px" }}>{settings.label} {docName}</span>
              <div>
                <span style={{ color: "#fff", fontWeight: "bold", fontSize: "13px", letterSpacing: "1px" }}>{docNumberLabel} &nbsp;</span>
                <span style={{ color: "#fff", fontWeight: "900", fontSize: "18px", letterSpacing: "2px" }}>
                  {docNumber.padStart(6, "0")}
                </span>
              </div>
            </div>

            {/* Info rows */}
            <div style={{ padding: "10px 16px", borderBottom: `1px solid #fed7aa` }}>
              <div style={{ display: "flex", gap: "24px", marginBottom: "8px" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Date: </span>
                  <span style={{ fontSize: "12px", fontWeight: "600", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px" }}>
                    {load.loading_date || new Date().toISOString().slice(0, 10)}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                   <span style={{ fontSize: "11px", color: "#94a3b8" }}>Vehicle No.: </span>
                   <span style={{ fontSize: "12px", fontWeight: "600", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px" }}>
                     {load.vehicle_number || "—"}
                   </span>
                 </div>
                 {load.vehicle_type && (
                   <div style={{ flex: 1 }}>
                     <span style={{ fontSize: "11px", color: "#94a3b8" }}>Vehicle Type: </span>
                     <span style={{ fontSize: "12px", fontWeight: "600", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px" }}>
                       {load.vehicle_type}
                     </span>
                   </div>
                 )}
                {load.delivery_date && (
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>Delivery Date: </span>
                    <span style={{ fontSize: "12px", fontWeight: "600", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px" }}>
                      {load.delivery_date}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Loading Point / Origin: </span>
                <span style={{ fontSize: "12px", fontWeight: "600", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px", marginRight: "24px" }}>
                  {load.origin || "—"}
                </span>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Destination: </span>
                <span style={{ fontSize: "12px", fontWeight: "600", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px" }}>
                  {load.destination || "—"}
                </span>
              </div>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>{consignorLabel || "Consignor"}: </span>
                <span style={{ fontSize: "12px", fontWeight: "600", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px", marginRight: "24px" }}>
                  {load.client_name || "—"}
                </span>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>{consigneeLabel || "Consignee"}: </span>
                <span style={{ fontSize: "12px", fontWeight: "600", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px" }}>
                  {receiverName}
                </span>
              </div>

              {/* India-specific: GSTIN / e-Way Bill */}
              {isIndia && (
                <div style={{ display: "flex", gap: "24px", marginTop: "4px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>GSTIN: </span>
                    <span style={{ fontSize: "12px", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px", minWidth: "100px", display: "inline-block" }}>&nbsp;</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>e-Way Bill No.: </span>
                    <span style={{ fontSize: "12px", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px", minWidth: "100px", display: "inline-block" }}>&nbsp;</span>
                  </div>
                </div>
              )}
              {/* USA-specific: BOL fields */}
              {isUSA && (
                <div style={{ display: "flex", gap: "24px", marginTop: "4px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>USDOT#: </span>
                    <span style={{ fontSize: "12px", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px", minWidth: "80px", display: "inline-block" }}>&nbsp;</span>
                  </div>
                  <div>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>MC#: </span>
                    <span style={{ fontSize: "12px", borderBottom: `1px solid ${accentColor}`, paddingBottom: "1px", minWidth: "80px", display: "inline-block" }}>&nbsp;</span>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1e293b", color: "#fff" }}>
                  {["Qty / Packages", "Description of Goods", `Weight (${settings.weightUnit})`, ...(isPaid ? [] : [`Freight (${currency})`, "Advance", "Balance Due"])].map((h) => (
                    <th key={h} style={{ padding: "7px 8px", fontSize: "11px", fontWeight: "700", textAlign: "center", border: `1px solid ${accentColor}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} style={{ height: "38px" }}>
                    <td style={{ border: `1px solid #fed7aa`, textAlign: "center", padding: "4px 8px", fontSize: "12px" }}>
                      {i === 0 && load.quantity ? `${load.quantity} pkgs` : ""}
                    </td>
                    <td style={{ border: `1px solid #fed7aa`, padding: "4px 8px", fontSize: "12px" }}>
                      {i === 0 ? (load.cargo_description || load.cargo_type || "") : ""}
                    </td>
                    <td style={{ border: `1px solid #fed7aa`, textAlign: "center", padding: "4px 8px", fontSize: "12px" }}>
                      {i === 0 && load.weight_tons ? `${load.weight_tons} ${settings.weightUnit}` : ""}
                    </td>
                    {!isPaid && (
                      <>
                        <td style={{ border: `1px solid #fed7aa`, textAlign: "center", padding: "4px 8px", fontSize: "12px" }}>
                          {i === 0 && load.freight_amount ? fmt(load.freight_amount) : ""}
                        </td>
                        <td style={{ border: `1px solid #fed7aa`, textAlign: "center", padding: "4px 8px", fontSize: "12px" }}>
                          {i === 0 && load.advance_amount ? fmt(load.advance_amount) : ""}
                        </td>
                        <td style={{ border: `1px solid #fed7aa`, textAlign: "center", padding: "4px 8px", fontSize: "12px", fontWeight: "700", color: "#1e293b" }}>
                          {i === 0 && load.balance_amount ? fmt(load.balance_amount) : ""}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Charges summary */}
            {!isPaid && (
              <div style={{ background: "#fff8f3", borderTop: `1px solid ${accentColor}`, padding: "6px 16px", display: "flex", justifyContent: "flex-end", gap: "24px" }}>
                {load.labor_charges > 0 && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Labour: <strong>{fmt(load.labor_charges)}</strong></span>
                )}
                {load.other_charges > 0 && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Other: <strong>{fmt(load.other_charges)}</strong></span>
                )}
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: `2px solid ${accentColor}`, padding: "10px 16px", background: "#fff8f3" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: "11px", color: "#475569", flex: 1 }}>
                  <div><strong>Consignee's Address / Delivery Address:</strong> {load.notes || "—"}</div>
                  <div style={{ marginTop: "4px" }}><strong>Driver's Cell:</strong> ___________________</div>
                  {load.seal_number && <div style={{ marginTop: "4px" }}><strong>Seal No:</strong> {load.seal_number}</div>}
                  {isIndia && <div style={{ marginTop: "4px" }}><strong>PAN No:</strong> _____________________</div>}
                  {isUSA && <div style={{ marginTop: "4px" }}><strong>HOS Log:</strong> ____________________</div>}
                </div>
                <div style={{ marginLeft: "16px", textAlign: "center", maxWidth: "220px" }}>
                  <div style={{
                    border: `1.5px dashed ${accentColor}`,
                    borderRadius: "6px",
                    padding: "10px 14px",
                    background: "#fff8f3"
                  }}>
                    <div style={{ fontSize: "9px", fontWeight: "700", color: accentColor, letterSpacing: "0.5px", marginBottom: "4px" }}>✅ COMPUTER GENERATED RECEIPT</div>
                    <div style={{ fontSize: "8.5px", color: "#64748b", lineHeight: 1.5 }}>
                      This is an automatically generated receipt. No signature is required. This document is valid without a physical signature.
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "8px", color: "#94a3b8" }}>
                      Generated: {new Date().toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "8px", border: "1px solid #e2e8f0", borderRadius: "5px", padding: "6px 8px", background: "#f8fafc" }}>
                <div style={{ fontSize: "8.5px", fontWeight: "700", color: "#334155", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.3px" }}>Terms &amp; Conditions</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 10px" }}>
                  {[
                    "Carrier's liability is limited to declared value; carrier is not liable for acts of God, war, strike, or any force majeure event beyond its control.",
                    "Consignor warrants accuracy of goods description, weight & declared value. Any misdeclaration shall be at consignor's sole risk and cost.",
                    "Claims for loss or damage must be lodged in writing within 48 hours of delivery; no claim will be entertained after this period.",
                    "Goods are carried entirely at owner's risk unless separate insurance cover is arranged and confirmed in writing prior to dispatch.",
                    "This bilty is the entire contract of carriage. Disputes subject to exclusive jurisdiction of Karachi courts. Rates are subject to revision without prior notice.",
                  ].map((t, i) => (
                    <div key={i} style={{ fontSize: "7.5px", color: "#64748b", lineHeight: 1.5 }}>
                      <span style={{ fontWeight: "700", color: "#475569" }}>{i + 1}. </span>{t}
                    </div>
                  ))}
                </div>
                {settings.regulations && <div style={{ fontSize: "7px", color: "#94a3b8", marginTop: "3px" }}>Regulations: {settings.regulations}</div>}
              </div>
            </div>

            <div style={{ background: accentColor, height: "6px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}