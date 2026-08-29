/**
 * Colorful print / PDF export utility.
 * Opens a new window with a fully styled, color-accurate printout.
 *
 * Usage:
 *   import { printTable, printHtml } from "@/utils/printUtils";
 *   printTable("Fleet Trips", ["Date","Vehicle","Revenue"], rows);
 */

const PRINT_CSS = `
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  @page { margin: 12mm 10mm; size: A4 landscape; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; font-size: 12px; color: #0f172a; background: #fff; }
  h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 3px; }
  .subtitle { font-size: 11px; color: #64748b; margin: 0 0 16px; }
  .summary-bar { display:flex; gap:16px; margin-bottom:14px; flex-wrap:wrap; }
  .summary-item { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 14px; }
  .summary-item .val { font-size:16px; font-weight:800; color:#0f172a; }
  .summary-item .lbl { font-size:9px; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; }
  table { width: 100%; border-collapse: collapse; margin-top:4px; }
  thead tr { background: #1e293b !important; }
  th { background: #1e293b !important; color: #fff !important; padding: 8px 12px; font-size: 10px; text-align: left; font-weight: 700; letter-spacing:0.05em; text-transform:uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  td { padding: 6px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:9px; font-weight:700; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .badge-green  { background:#dcfce7 !important; color:#15803d !important; }
  .badge-red    { background:#fee2e2 !important; color:#b91c1c !important; }
  .badge-yellow { background:#fef9c3 !important; color:#a16207 !important; }
  .badge-blue   { background:#dbeafe !important; color:#1d4ed8 !important; }
  .badge-orange { background:#ffedd5 !important; color:#ea580c !important; }
  .badge-purple { background:#f3e8ff !important; color:#7e22ce !important; }
  .badge-gray   { background:#f1f5f9 !important; color:#475569 !important; }
  .positive { color:#15803d !important; font-weight:700; }
  .negative { color:#b91c1c !important; font-weight:700; }
  .footer { font-size:9px; color:#94a3b8; margin-top:14px; border-top:1px solid #e2e8f0; padding-top:8px; display:flex; justify-content:space-between; }
  .section-header { background:linear-gradient(135deg,#1e3a5f,#2563eb) !important; color:#fff !important; padding:8px 12px; border-radius:8px; font-weight:800; font-size:13px; margin:12px 0 8px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
`;

/**
 * Print a table in a new colorful window.
 * @param {string} title
 * @param {string[]} headers - column headers
 * @param {(string|number)[][]} rows - 2D array of cell values (can contain HTML strings)
 * @param {{ subtitle?: string, summary?: {label:string, value:string}[], appName?: string }} opts
 */
export function printTable(title, headers, rows, opts = {}) {
  const { subtitle = "", summary = [], appName = "Saifran Transport" } = opts;
  const now = new Date().toLocaleString("en-GB");

  const summaryHtml = summary.length
    ? `<div class="summary-bar">${summary.map(s => `<div class="summary-item"><div class="val">${s.value}</div><div class="lbl">${s.label}</div></div>`).join("")}</div>`
    : "";

  const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <h2>${title}</h2>
  ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
  ${summaryHtml}
  <table>${thead}${tbody}</table>
  <div class="footer">
    <span>${appName} · ${title}</span>
    <span>Printed: ${now}</span>
  </div>
  <script>window.onload=()=>{setTimeout(()=>{window.print();},400);}<\/script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

/**
 * Print arbitrary HTML in a new colorful window.
 */
export function printHtml(title, bodyHtml, opts = {}) {
  const { appName = "Saifran Transport" } = opts;
  const now = new Date().toLocaleString("en-GB");
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  ${bodyHtml}
  <div class="footer">
    <span>${appName}</span>
    <span>Printed: ${now}</span>
  </div>
  <script>window.onload=()=>{setTimeout(()=>{window.print();},400);}<\/script>
</body>
</html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

/**
 * Export data as CSV download.
 */
export function exportCsv(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? "").replace(/<[^>]+>/g, ""); // strip HTML
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}