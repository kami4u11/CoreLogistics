import React from "react";

export default function CMRPrint({ load, companyProfile, logo, onClose }) {
  const handlePrint = () => {
    const printContent = document.getElementById("cmr-print-area");
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

  const docNumber = (load.load_number || "").replace(/\D/g, "").padStart(6, "0") || String(Date.now()).slice(-6);

  const cell = (content, style = {}) => ({
    content, style: { border: "1px solid #334155", padding: "4px 6px", fontSize: "10px", verticalAlign: "top", ...style }
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 no-print">
          <h2 className="text-base font-bold text-slate-800">CMR Waybill Preview</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg">🖨️ Print CMR</button>
            <button onClick={onClose} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg">✕ Close</button>
          </div>
        </div>

        <div id="cmr-print-area" className="p-4">
          <style>{`
            @media print {
              @page { size: A4 landscape; margin: 8mm; }
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div style={{ fontFamily: "Arial, sans-serif", border: "2px solid #1e3a5f", maxWidth: "900px", margin: "0 auto", background: "#fff" }}>
            {/* CMR Header */}
            <div style={{ background: "#1e3a5f", color: "#fff", padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img src={logoSrc} alt="Logo" style={{ height: "50px", objectFit: "contain", background: "#fff", borderRadius: "4px", padding: "3px" }} />
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "bold" }}>{companyName}</div>
                  <div style={{ fontSize: "9px", opacity: 0.8 }}>{companyAddr}</div>
                  <div style={{ fontSize: "9px", opacity: 0.8 }}>Tel: {companyPhone} | {companyEmail}</div>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: "900", letterSpacing: "4px" }}>CMR</div>
                <div style={{ fontSize: "9px", opacity: 0.8 }}>International Consignment Note</div>
                <div style={{ fontSize: "9px", opacity: 0.8 }}>Convention on the Contract for International Carriage of Goods by Road</div>
              </div>
              <div style={{ textAlign: "right", fontSize: "10px" }}>
                <div style={{ fontWeight: "bold", fontSize: "13px" }}>No. {docNumber}</div>
                <div style={{ opacity: 0.8 }}>Date: {load.loading_date || new Date().toISOString().slice(0, 10)}</div>
              </div>
            </div>

            {/* Main Grid */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {/* Row 1: Sender & Consignee */}
                <tr>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", width: "5%", background: "#f1f5f9", fontSize: "9px", fontWeight: "bold", color: "#1e3a5f", textAlign: "center", verticalAlign: "middle" }}>1</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", width: "45%" }}>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>Sender (name, address, country)</div>
                    <div style={{ fontSize: "11px", fontWeight: "bold" }}>{load.client_name || "—"}</div>
                    <div style={{ fontSize: "10px", color: "#334155", marginTop: "2px" }}>{load.origin || "—"}</div>
                  </td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", width: "5%", background: "#f1f5f9", fontSize: "9px", fontWeight: "bold", color: "#1e3a5f", textAlign: "center", verticalAlign: "middle" }}>2</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", width: "45%" }}>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>Consignee (name, address, country)</div>
                    <div style={{ fontSize: "11px", fontWeight: "bold" }}>{load.receiver_name || "—"}</div>
                    <div style={{ fontSize: "10px", color: "#334155", marginTop: "2px" }}>{load.destination || "—"}</div>
                  </td>
                </tr>

                {/* Row 2: Carrier & Successive Carrier */}
                <tr>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", background: "#f1f5f9", fontSize: "9px", fontWeight: "bold", color: "#1e3a5f", textAlign: "center", verticalAlign: "middle" }}>16</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>Carrier (name, address, country)</div>
                    <div style={{ fontSize: "11px", fontWeight: "bold" }}>{companyName}</div>
                    <div style={{ fontSize: "9px", color: "#334155", marginTop: "2px" }}>{companyAddr}</div>
                    <div style={{ fontSize: "9px", color: "#334155" }}>Tel: {companyPhone}</div>
                  </td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", background: "#f1f5f9", fontSize: "9px", fontWeight: "bold", color: "#1e3a5f", textAlign: "center", verticalAlign: "middle" }}>17</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>Successive Carrier (name, address, country)</div>
                    <div style={{ minHeight: "36px" }}></div>
                  </td>
                </tr>

                {/* Row 3: Place of taking over & Delivery */}
                <tr>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", background: "#f1f5f9", fontSize: "9px", fontWeight: "bold", color: "#1e3a5f", textAlign: "center", verticalAlign: "middle" }}>3</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>Place of taking over (place, country, date)</div>
                    <div style={{ fontSize: "11px" }}>{load.origin || "—"}</div>
                    <div style={{ fontSize: "10px", color: "#475569" }}>Date: {load.loading_date || "—"}</div>
                  </td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", background: "#f1f5f9", fontSize: "9px", fontWeight: "bold", color: "#1e3a5f", textAlign: "center", verticalAlign: "middle" }}>4</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>Place designated for delivery (place, country)</div>
                    <div style={{ fontSize: "11px" }}>{load.destination || "—"}</div>
                    <div style={{ fontSize: "10px", color: "#475569" }}>Delivery Date: {load.delivery_date || "—"}</div>
                  </td>
                </tr>

                {/* Goods Table Header */}
                <tr style={{ background: "#1e3a5f", color: "#fff" }}>
                  <td colSpan="2" style={{ border: "1px solid #334155", padding: "4px 8px", fontSize: "9px", fontWeight: "bold", textAlign: "center" }}>6. Marks & Nos.</td>
                  <td colSpan="2" style={{ border: "1px solid #334155", padding: "4px 8px", fontSize: "9px", fontWeight: "bold", textAlign: "center" }}>7. No. of Packages &nbsp;&nbsp; 8. Method of Packing &nbsp;&nbsp; 9. Nature of Goods &nbsp;&nbsp; 10. Statistical No.</td>
                </tr>
                <tr>
                  <td colSpan="2" style={{ border: "1px solid #334155", padding: "6px 8px", fontSize: "10px", minHeight: "40px" }}>—</td>
                  <td colSpan="2" style={{ border: "1px solid #334155", padding: "6px 8px", fontSize: "11px" }}>
                    <strong>{load.cargo_type || "General Cargo"}</strong>
                    {load.weight_tons ? ` | Weight: ${load.weight_tons} tons` : ""}
                  </td>
                </tr>

                {/* Vehicle & Instructions */}
                <tr>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", background: "#f1f5f9", fontSize: "9px", fontWeight: "bold", color: "#1e3a5f", textAlign: "center", verticalAlign: "middle" }}>18</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>Vehicle Reg. No. / Type</div>
                    <div style={{ fontSize: "11px", fontWeight: "bold" }}>{load.vehicle_number || "—"}</div>
                    <div style={{ fontSize: "10px", color: "#475569" }}>{load.vehicle_type || "—"}</div>
                  </td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", background: "#f1f5f9", fontSize: "9px", fontWeight: "bold", color: "#1e3a5f", textAlign: "center", verticalAlign: "middle" }}>13</td>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>Sender's instructions (customs, etc.)</div>
                    <div style={{ fontSize: "10px" }}>{load.notes || "Handle with care. Deliver intact."}</div>
                  </td>
                </tr>

                {/* Cash on Delivery */}
                <tr>
                  <td style={{ border: "1px solid #334155", padding: "6px 8px", background: "#f1f5f9", fontSize: "9px", fontWeight: "bold", color: "#1e3a5f", textAlign: "center", verticalAlign: "middle" }}>21</td>
                  <td colSpan="3" style={{ border: "1px solid #334155", padding: "6px 8px" }}>
                    <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "2px" }}>Cash on Delivery (amount, currency)</div>
                    <div style={{ display: "flex", gap: "32px" }}>
                      <div>
                        <span style={{ fontSize: "9px", color: "#64748b" }}>Freight: </span>
                        <span style={{ fontSize: "11px", fontWeight: "bold" }}>
                          {load.freight_amount ? Number(load.freight_amount).toLocaleString() : "—"}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: "9px", color: "#64748b" }}>Payment Type: </span>
                        <span style={{ fontSize: "11px", fontWeight: "bold" }}>{load.payment_type === "paid" ? "FREIGHT PREPAID" : "FREIGHT COLLECT"}</span>
                      </div>
                      {load.seal_number && (
                        <div>
                          <span style={{ fontSize: "9px", color: "#64748b" }}>Seal No.: </span>
                          <span style={{ fontSize: "11px", fontWeight: "bold" }}>{load.seal_number}</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Signatures */}
                <tr style={{ background: "#f8fafc" }}>
                  <td colSpan="4" style={{ border: "1px solid #334155", padding: "6px 8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "16px" }}>22. Established in (place): {load.origin || "—"}</div>
                        <div style={{ height: "1px", background: "#334155", margin: "0 16px" }} />
                        <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px" }}>Signature & Stamp of Sender</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "16px" }}>23. Carrier signature & stamp</div>
                        <div style={{ height: "1px", background: "#334155", margin: "0 16px" }} />
                        <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px" }}>Signature & Stamp of Carrier</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: "8px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "16px" }}>24. Goods received in apparent good order</div>
                        <div style={{ height: "1px", background: "#334155", margin: "0 16px" }} />
                        <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px" }}>Signature & Stamp of Consignee</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer note */}
            <div style={{ background: "#1e3a5f", color: "#fff", padding: "4px 12px", fontSize: "8px", display: "flex", justifyContent: "space-between" }}>
              <span>This CMR is issued subject to the Convention on the Contract for the International Carriage of Goods by Road (CMR), Geneva, 19 May 1956.</span>
              <span>{companyWeb}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}