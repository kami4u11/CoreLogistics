/**
 * ExportButton — reusable PDF / CSV / Excel export button
 *
 * Props:
 *   data        {Array}   — array of row objects
 *   columns     {Array}   — [{ label: "Column Name", key: "field_name", format?: fn }]
 *   filename    {string}  — base filename (no extension)
 *   title       {string}  — printed report title
 */
import React, { useState } from "react";
import { Download, FileText, FileSpreadsheet, Printer } from "lucide-react";

function getCompanyInfo() {
  try { return JSON.parse(localStorage.getItem("company_profile") || "null"); } catch { return null; }
}

function toCSV(data, columns) {
  const header = columns.map(c => `"${c.label}"`).join(",");
  const rows = data.map(row =>
    columns.map(c => {
      const val = c.format ? c.format(row[c.key], row) : (row[c.key] ?? "");
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(data, columns, filename) {
  const csv = toCSV(data, columns);
  downloadBlob("\uFEFF" + csv, filename + ".csv", "text/csv;charset=utf-8");
}

function exportExcel(data, columns, filename) {
  // Simple XHTML-based Excel export (opens in Excel)
  const company = getCompanyInfo();
  const header = columns.map(c => `<th style="background:#1e293b;color:#fff;padding:6px 10px;font-size:11px;font-weight:bold;">${c.label}</th>`).join("");
  const rows = data.map((row, i) =>
    `<tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"};">${
      columns.map(c => {
        const val = c.format ? c.format(row[c.key], row) : (row[c.key] ?? "");
        return `<td style="padding:5px 10px;font-size:11px;border-bottom:1px solid #f1f5f9;">${val}</td>`;
      }).join("")
    }</tr>`
  ).join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8">
    <style>table{border-collapse:collapse;width:100%;}th,td{border:1px solid #e2e8f0;}</style>
    </head><body>
    <h2 style="font-family:Arial;font-size:16px;margin-bottom:4px;">${filename}</h2>
    ${company?.company_name ? `<p style="font-family:Arial;font-size:11px;color:#64748b;margin:0 0 12px;">${company.company_name}</p>` : ""}
    <p style="font-family:Arial;font-size:10px;color:#94a3b8;">Generated: ${new Date().toLocaleString()}</p>
    <table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
  downloadBlob(html, filename + ".xls", "application/vnd.ms-excel;charset=utf-8");
}

function exportPDF(data, columns, filename, title) {
  const company = getCompanyInfo();
  const header = columns.map(c => `<th>${c.label}</th>`).join("");
  const rows = data.map((row, i) =>
    `<tr class="${i % 2 === 0 ? "" : "alt"}">${
      columns.map(c => {
        const val = c.format ? c.format(row[c.key], row) : (row[c.key] ?? "");
        return `<td>${val}</td>`;
      }).join("")
    }</tr>`
  ).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;font-size:11px;color:#0f172a;}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #1e293b;}
    .logo{height:48px;width:auto;object-fit:contain;}
    .company-name{font-size:16px;font-weight:800;color:#0f172a;}
    .report-title{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:4px;}
    .meta{font-size:10px;color:#64748b;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#1e293b;color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;}
    td{padding:6px 10px;font-size:10px;border-bottom:1px solid #f1f5f9;}
    tr.alt td{background:#f8fafc;}
    .footer{margin-top:14px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;}
    @media print{@page{margin:10mm;size:A4 landscape;}}
  </style></head><body>
  <div class="header">
    ${company?.logo_url ? `<img src="${company.logo_url}" class="logo" />` : ""}
    <div>
      ${company?.company_name ? `<div class="company-name">${company.company_name}</div>` : "<div class='company-name'>TMS</div>"}
      ${company?.address ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">${company.address}</div>` : ""}
    </div>
  </div>
  <div class="report-title">${title}</div>
  <div class="meta">Generated: ${new Date().toLocaleString()} · Total records: ${data.length}</div>
  <table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
  <div class="footer">${company?.company_name || "TMS"} · Transport Management System · ${new Date().getFullYear()}</div>
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

export default function ExportButton({ data = [], columns = [], filename = "export", title = "Report" }) {
  const [open, setOpen] = useState(false);

  if (!data.length || !columns.length) return null;

  const items = [
    { label: "Print / PDF", icon: Printer,         action: () => { exportPDF(data, columns, filename, title); setOpen(false); } },
    { label: "Export CSV",  icon: FileText,         action: () => { exportCSV(data, columns, filename); setOpen(false); } },
    { label: "Export Excel",icon: FileSpreadsheet,  action: () => { exportExcel(data, columns, filename, title); setOpen(false); } },
  ];

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 10,
          background: "linear-gradient(135deg,#1e293b,#334155)",
          color: "#fff", border: "none", cursor: "pointer",
          fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        <Download size={13} />
        Export
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 998 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 999,
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: 160,
          }}>
            {items.map(item => (
              <button key={item.label} onClick={item.action}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 14px", background: "none",
                  border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  color: "#1e293b", textAlign: "left", transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <item.icon size={14} color="#64748b" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}