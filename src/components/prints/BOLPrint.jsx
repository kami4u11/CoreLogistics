import React from "react";

export default function BOLPrint({ load, companyProfile, logo, onClose }) {
  const handlePrint = () => {
    const printContent = document.getElementById("bol-print-area");
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalBody;
    window.location.reload();
  };

  if (!load) return null;

  const cp = companyProfile || {};
  const logoSrc = logo || cp.logo_url || "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69995a1b4cc6b3863e378752/2cf5e616c_pvt_ltd_logo1-removebg-preview.png";

  const companyName = cp.company_name || "Saifran Logistics (Pvt) Ltd";
  const companyAddr = cp.address || "Plot 352/A, Street No 1, Gate No 5, New Sabzi Mandi, Truck Stand, Hawksbay Road, Karachi, Pakistan";
  const companyPhone = cp.phone || "+92 302-8296677";
  const companyEmail = cp.email || "contact@saifran.com";
  const companyWeb = cp.website || "www.saifran.com";

  const bolNumber = `BOL-${(load.load_number || "").replace(/\D/g, "").padStart(6, "0") || String(Date.now()).slice(-6)}`;
  const accentColor = "#0f4c81";

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 no-print">
          <h2 className="text-base font-bold text-slate-800">Bill of Lading Preview</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-1.5 bg-blue-900 hover:bg-blue-950 text-white text-sm font-semibold rounded-lg">🖨️ Print BOL</button>
            <button onClick={onClose} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg">✕ Close</button>
          </div>
        </div>

        <div id="bol-print-area" className="p-4">
          <style>{`
            @media print {
              @page { size: A4; margin: 10mm; }
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div style={{ fontFamily: "Arial, sans-serif", border: `2px solid ${accentColor}`, maxWidth: "760px", margin: "0 auto", background: "#fff" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "stretch", borderBottom: `2px solid ${accentColor}` }}>
              {/* Logo + Company */}
              <div style={{ flex: 2, padding: "12px 16px", borderRight: `2px solid ${accentColor}` }}>
                <img src={logoSrc} alt="Logo" style={{ height: "60px", objectFit: "contain", marginBottom: "6px" }} />
                <div style={{ fontSize: "12px", fontWeight: "bold", color: accentColor }}>{companyName}</div>
                <div style={{ fontSize: "9.5px", color: "#475569", lineHeight: 1.6, marginTop: "2px" }}>
                  <div>{companyAddr}</div>
                  <div>Tel: {companyPhone}</div>
                  <div>Email: {companyEmail} | {companyWeb}</div>
                </div>
              </div>
              {/* Title block */}
              <div style={{ flex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px", background: `${accentColor}10` }}>
                <div style={{ fontSize: "26px", fontWeight: "900", color: accentColor, letterSpacing: "3px" }}>BILL OF LADING</div>
                <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px", textAlign: "center" }}>Non-Negotiable unless consigned to order</div>
              </div>
              {/* BOL Number */}
              <div style={{ flex: 1, borderLeft: `2px solid ${accentColor}`, padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div>
                  <div style={{ fontSize: "8px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>B/L No.</div>
                  <div style={{ fontSize: "13px", fontWeight: "900", color: accentColor }}>{bolNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: "8px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Date</div>
                  <div style={{ fontSize: "11px", fontWeight: "bold" }}>{load.loading_date || new Date().toISOString().slice(0, 10)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "8px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Status</div>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: load.payment_type === "paid" ? "#16a34a" : "#f97316" }}>
                    {load.payment_type === "paid" ? "FREIGHT PREPAID" : "FREIGHT COLLECT"}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipper / Consignee / Notify */}
            <div style={{ display: "flex", borderBottom: `1px solid ${accentColor}40` }}>
              <div style={{ flex: 1, padding: "8px 12px", borderRight: `1px solid ${accentColor}40` }}>
                <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Shipper / Exporter</div>
                <div style={{ fontSize: "11px", fontWeight: "bold" }}>{load.client_name || "—"}</div>
                <div style={{ fontSize: "9.5px", color: "#334155", marginTop: "2px" }}>{load.origin || "—"}</div>
              </div>
              <div style={{ flex: 1, padding: "8px 12px", borderRight: `1px solid ${accentColor}40` }}>
                <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Consignee</div>
                <div style={{ fontSize: "11px", fontWeight: "bold" }}>{load.receiver_name || "—"}</div>
                <div style={{ fontSize: "9.5px", color: "#334155", marginTop: "2px" }}>{load.destination || "—"}</div>
              </div>
              <div style={{ flex: 1, padding: "8px 12px" }}>
                <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Notify Party</div>
                <div style={{ fontSize: "11px", color: "#334155" }}>{load.receiver_name || "Same as Consignee"}</div>
                <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "4px" }}>—</div>
              </div>
            </div>

            {/* Transport Details */}
            <div style={{ display: "flex", borderBottom: `1px solid ${accentColor}40`, background: `${accentColor}08` }}>
              {[
                { label: "Place of Receipt", value: load.origin || "—" },
                { label: "Port / Point of Loading", value: load.origin || "—" },
                { label: "Port / Point of Discharge", value: load.destination || "—" },
                { label: "Place of Delivery", value: load.destination || "—" },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, padding: "6px 10px", borderRight: i < 3 ? `1px solid ${accentColor}40` : "none" }}>
                  <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>{item.label}</div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Vehicle / Driver Row */}
            <div style={{ display: "flex", borderBottom: `1px solid ${accentColor}40` }}>
              {[
                { label: "Vehicle No.", value: load.vehicle_number || "—" },
                { label: "Vehicle Type", value: load.vehicle_type || "—" },
                { label: "Driver's Name", value: "—" },
                { label: "Delivery Date", value: load.delivery_date || "—" },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, padding: "6px 10px", borderRight: i < 3 ? `1px solid ${accentColor}40` : "none" }}>
                  <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>{item.label}</div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Cargo Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: accentColor, color: "#fff" }}>
                  {["Marks & Nos.", "No. of Pkgs", "Description of Goods", "Gross Weight", "Measurement"].map((h, i) => (
                    <th key={i} style={{ padding: "6px 8px", fontSize: "9px", fontWeight: "700", textAlign: "center", border: `1px solid ${accentColor}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={i} style={{ height: "32px" }}>
                    <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px", textAlign: "center" }}>—</td>
                    <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px", textAlign: "center" }}>
                      {i === 0 ? "1" : ""}
                    </td>
                    <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px" }}>
                      {i === 0 ? (load.cargo_type || "General Cargo") : ""}
                      {i === 0 && load.notes ? ` — ${load.notes}` : ""}
                    </td>
                    <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px", textAlign: "center" }}>
                      {i === 0 && load.weight_tons ? `${load.weight_tons} Tons` : ""}
                    </td>
                    <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px", textAlign: "center" }}>—</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ background: `${accentColor}10`, fontWeight: "bold" }}>
                  <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px" }}>TOTAL</td>
                  <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px", textAlign: "center" }}>1</td>
                  <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px" }}>—</td>
                  <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px", textAlign: "center" }}>{load.weight_tons ? `${load.weight_tons} Tons` : "—"}</td>
                  <td style={{ border: `1px solid ${accentColor}40`, padding: "4px 8px", fontSize: "10px", textAlign: "center" }}>—</td>
                </tr>
              </tbody>
            </table>

            {/* Freight Charges */}
            <div style={{ display: "flex", borderTop: `1px solid ${accentColor}40` }}>
              <div style={{ flex: 2, padding: "8px 12px", borderRight: `1px solid ${accentColor}40` }}>
                <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Freight & Charges</div>
                <div style={{ display: "flex", gap: "24px", fontSize: "10px" }}>
                  <span>Freight: <strong>{load.freight_amount ? Number(load.freight_amount).toLocaleString() : "—"}</strong></span>
                  {load.advance_amount > 0 && <span>Advance: <strong>{Number(load.advance_amount).toLocaleString()}</strong></span>}
                  {load.balance_amount > 0 && <span>Balance: <strong>{Number(load.balance_amount).toLocaleString()}</strong></span>}
                  {load.seal_number && <span>Seal No.: <strong>{load.seal_number}</strong></span>}
                </div>
              </div>
              <div style={{ flex: 1, padding: "8px 12px" }}>
                <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Broker / Agent</div>
                <div style={{ fontSize: "10px" }}>{load.broker_name || "—"}</div>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ borderTop: `2px solid ${accentColor}`, background: `${accentColor}08`, padding: "10px 16px" }}>
              <div style={{ fontSize: "8px", color: "#64748b", marginBottom: "8px" }}>
                RECEIVED the above Goods in apparent good order and condition, weight, contents and value unknown, for carriage subject to the Carrier's standard terms and conditions.
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                {["Shipper's Signature & Date", "Carrier's Signature & Date", "Consignee's Signature & Date"].map((label, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ height: "28px" }} />
                    <div style={{ height: "1px", background: accentColor, margin: "0 8px" }} />
                    <div style={{ fontSize: "8px", color: "#64748b", marginTop: "4px" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: accentColor, padding: "3px 12px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#fff", fontSize: "7.5px" }}>Original — Not Negotiable unless made out to Order</span>
              <span style={{ color: "#fff", fontSize: "7.5px" }}>{companyWeb}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}