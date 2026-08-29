import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Upload, X, CheckCircle, AlertTriangle, Loader2,
  FileSpreadsheet, Eye, ChevronDown, ChevronUp, Download, Info
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Column schema ────────────────────────────────────────────────────────────
// Supports flexible column names. All fields optional except date + load_number.
const COLUMN_ALIASES = {
  date:              ["date","load_date","loading_date","transaction_date","dispatch_date"],
  load_number:       ["load_number","load_no","bilty_no","bilty_number","lr_no","bol_no","cn_no","ref_no","gr_no","consignment_no"],
  client_name:       ["client_name","client","customer","consignor","shipper","party"],
  broker_name:       ["broker_name","broker","transporter","carrier","transport_company"],
  vehicle_number:    ["vehicle_number","vehicle_no","truck_no","registration","reg_no","plate"],
  vehicle_type:      ["vehicle_type","vehicle","truck_type","transport_type","category"],
  driver_name:       ["driver_name","driver","operator"],
  loading_point:     ["loading_point","origin","from","loading","source","pickup","from_city"],
  destination:       ["destination","dest","to","unloading_point","delivery","dropoff","to_city"],
  commodity:         ["commodity","goods","cargo","material","product","item"],
  weight_tons:       ["weight_tons","weight","tons","tonne","net_weight","gross_weight"],
  freight_amount:    ["freight_amount","quotation","revenue","rate","billing","invoice_amount","freight","client_freight","our_rate"],
  broker_fare:       ["broker_fare","broker_amount","hired_amount","freight_cost","fare","hired_rate","vendor_rate","broker_rate"],
  // Labor = loading_labour + unloading_labour combined
  labor_charges:     ["labor_charges","labour_charges","loading_charges","labour","loading_unloading","l_u_charges","loading_labour","labour_cost"],
  loading_labour:    ["loading_labour","loading_charges","loading"],
  unloading_labour:  ["unloading_labour","unloading_charges","unloading"],
  overweight_charges:["overweight_charges","overweight","over_weight","excess_weight"],
  detention_charges: ["detention_charges","detention","detain","waiting_charges","demurrage"],
  // "other_charges" = sum of all expense columns between detention and taxes
  other_charges:     ["other_charges","others","misc_charges","additional","miscellaneous","extra"],
  toll_charges:      ["toll_charges","toll","toll_tax","road_tax"],
  police_charges:    ["police_charges","police","challan","naaka"],
  commission:        ["commission","brokerage","agent_commission","clearing_charges"],
  taxes:             ["taxes","tax","gst","vat","fbr","withholding","income_tax"],
  payment_type:      ["payment_type","payment","pay_type","payment_mode","paid","to_pay"],
  status:            ["status","load_status","shipment_status"],
  notes:             ["notes","remarks","comments","note"],
};

const DISPLAY_COLUMNS = [
  { key: "date",               label: "date" },
  { key: "load_number",        label: "load_number" },
  { key: "client_name",        label: "client_name" },
  { key: "broker_name",        label: "broker_name" },
  { key: "vehicle_number",     label: "vehicle_number" },
  { key: "vehicle_type",       label: "vehicle_type" },
  { key: "loading_point",      label: "loading_point" },
  { key: "destination",        label: "destination" },
  { key: "commodity",          label: "commodity" },
  { key: "weight_tons",        label: "weight_tons" },
  { key: "freight_amount",     label: "freight_amount (our rate)" },
  { key: "broker_fare",        label: "broker_fare (hired rate)" },
  { key: "labor_charges",      label: "loading+unloading charges" },
  { key: "overweight_charges", label: "overweight_charges" },
  { key: "detention_charges",  label: "detention_charges" },
  { key: "other_charges",      label: "other_costs (misc+toll+police+commission)" },
  { key: "taxes",              label: "taxes" },
  { key: "payment_type",       label: "payment_type (paid/to_pay)" },
  { key: "status",             label: "status" },
  { key: "notes",              label: "notes" },
];

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; }
    else if (line[i] === "," && !inQ) { result.push(cur.trim()); cur = ""; }
    else { cur += line[i]; }
  }
  result.push(cur.trim());
  return result;
}

function normalize(h) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function matchCol(norm) {
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(norm)) return key;
  }
  return norm;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const rawHeaders = parseCsvLine(lines[0]);
  const colMap = rawHeaders.map(h => matchCol(normalize(h)));
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const obj = {};
    cells.forEach((val, i) => { if (colMap[i]) obj[colMap[i]] = val?.trim() || ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

// ─── Number / date helpers ────────────────────────────────────────────────────
function num(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseDate(v) {
  if (!v) return format(new Date(), "yyyy-MM-dd");
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,"0")}-${m1[1].padStart(2,"0")}`;
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (m2) return `20${m2[3]}-${m2[2].padStart(2,"0")}-${m2[1].padStart(2,"0")}`;
  return format(new Date(), "yyyy-MM-dd");
}

// ─── Row → Load object ────────────────────────────────────────────────────────
function rowToLoad(row, idx) {
  const loadDate   = parseDate(row.date);
  const month      = loadDate.slice(0, 7);

  // Labor = explicit labor_charges OR sum of loading + unloading
  const laborCharges = num(row.labor_charges) ||
    (num(row.loading_labour) + num(row.unloading_labour));

  // Other costs = toll + police + commission + other_charges (all misc between detention and taxes)
  const otherCharges = num(row.other_charges) +
    num(row.toll_charges) + num(row.police_charges) + num(row.commission);

  const payType = (() => {
    const raw = (row.payment_type || "").toLowerCase();
    // Default is PAID — only override to "to_pay" if explicitly specified
    if (raw === "to_pay" || raw === "topay" || raw === "0" || raw === "false") return "to_pay";
    return "paid";
  })();

  const status = (() => {
    const raw = (row.status || "completed").toLowerCase();
    if (["booked","loading","in_transit","delivered","completed","cancelled"].includes(raw)) return raw;
    return "completed";
  })();

  return {
    load_number:         row.load_number || `BLK-${String(idx + 1).padStart(4,"0")}`,
    loading_date:        loadDate,
    month,
    client_name:         row.client_name   || "",
    broker_name:         row.broker_name   || "",
    vehicle_number:      row.vehicle_number|| "",
    vehicle_type:        row.vehicle_type  || "",
    driver_name:         row.driver_name   || "",
    origin:              row.loading_point || "",
    destination:         row.destination   || "",
    commodity:           row.commodity     || "",
    weight_tons:         num(row.weight_tons),
    freight_amount:      num(row.freight_amount),
    broker_hired_amount: num(row.broker_fare),
    labor_charges:       laborCharges,
    overweight_charges:  num(row.overweight_charges),
    detention_charges:   num(row.detention_charges),
    other_charges:       otherCharges,
    taxes:               num(row.taxes),
    payment_type:        payType,
    status,
    is_confirmed:        true,
    notes:               row.notes || "",
  };
}

// ─── Auto-create missing master data ─────────────────────────────────────────
async function ensureMasterData(loads) {
  const log = [];
  try {
    // 1. Clients
    const existingClients = await base44.entities.Client.list().catch(() => []);
    const existingClientNames = new Set(existingClients.map(c => c.name?.toLowerCase()));
    const newClientNames = [...new Set(
      loads.map(l => l.client_name).filter(n => n && !existingClientNames.has(n.toLowerCase()))
    )];
    for (const name of newClientNames) {
      await base44.entities.Client.create({ name, status: "active" }).catch(() => {});
      log.push(`✅ Created client: ${name}`);
    }

    // 2. Brokers
    const existingBrokers = await base44.entities.Broker.list().catch(() => []);
    const existingBrokerNames = new Set(existingBrokers.map(b => b.name?.toLowerCase()));
    const newBrokerNames = [...new Set(
      loads.map(l => l.broker_name).filter(n => n && !existingBrokerNames.has(n.toLowerCase()))
    )];
    for (const name of newBrokerNames) {
      await base44.entities.Broker.create({ name, status: "active" }).catch(() => {});
      log.push(`✅ Created broker: ${name}`);
    }

    // 3. Vehicle types
    const existingVTypes = await base44.entities.VehicleType.list().catch(() => []);
    const existingVTypeNames = new Set(existingVTypes.map(v => v.name?.toLowerCase()));
    const newVTypes = [...new Set(
      loads.map(l => l.vehicle_type).filter(n => n && !existingVTypeNames.has(n.toLowerCase()))
    )];
    for (const name of newVTypes) {
      await base44.entities.VehicleType.create({ name }).catch(() => {});
      log.push(`✅ Created vehicle type: ${name}`);
    }

    // 4. Stations / loading points
    const existingStations = await base44.entities.Station.list().catch(() => []);
    const existingStationNames = new Set(existingStations.map(s => s.name?.toLowerCase()));
    const allCities = [
      ...loads.map(l => l.origin),
      ...loads.map(l => l.destination),
    ].filter(n => n && !existingStationNames.has(n.toLowerCase()));
    const newCities = [...new Set(allCities)];
    for (const name of newCities) {
      await base44.entities.Station.create({ name }).catch(() => {});
      log.push(`✅ Created station: ${name}`);
    }
  } catch (err) {
    log.push(`⚠️ Master data warning: ${err?.message}`);
  }
  return log;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BulkUploadLoads({ onClose, onSuccess }) {
  const [step,        setStep]        = useState("upload");
  const [rows,        setRows]        = useState([]);
  const [uploaded,    setUploaded]    = useState(0);
  const [total,       setTotal]       = useState(0);
  const [errors,      setErrors]      = useState([]);
  const [masterLog,   setMasterLog]   = useState([]);
  const [showPreview, setShowPreview] = useState(true);
  const [showLog,     setShowLog]     = useState(false);
  const fileRef = useRef();

  // ── File processing ─────────────────────────────────────────────────────────
  const processFile = async (file) => {
    if (!file) return;
    const isCsv   = file.type === "text/csv" || file.name.endsWith(".csv");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isImage = file.type.startsWith("image/");

    setStep("extracting");

    try {
      let rawRows = [];

      if (isCsv) {
        const text = await file.text();
        rawRows = parseCsv(text);

      } else if (isExcel || isImage) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        if (isImage) {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Extract ALL rows from this logistics/transport spreadsheet screenshot into JSON.
Fields to extract (use null/0 if missing):
date, load_number, client_name, broker_name, vehicle_number, vehicle_type, driver_name,
loading_point, destination, commodity, weight_tons,
freight_amount (our billing rate to client),
broker_fare (what we pay broker/transporter),
loading_labour, unloading_labour (OR combined labor_charges),
overweight_charges, detention_charges,
other_charges (misc/toll/police/commission combined),
taxes, payment_type (paid or to_pay), status, notes.
Return ONLY a JSON object: { "rows": [...] }`,
            file_urls: [file_url],
            response_json_schema: {
              type: "object",
              properties: {
                rows: { type: "array", items: { type: "object" } }
              }
            }
          });
          rawRows = result?.rows || [];
        } else {
          const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
              type: "object",
              properties: {
                rows: { type: "array", items: { type: "object" } }
              }
            }
          });
          rawRows = result?.output?.rows || result?.output || [];
        }
      } else {
        toast.error("Please upload a CSV, Excel (.xlsx), or image file.");
        setStep("upload");
        return;
      }

      if (!rawRows.length) {
        toast.error("No data rows found in file.");
        setStep("upload");
        return;
      }

      const loads = rawRows.map((r, i) => rowToLoad(r, i));
      setRows(loads);
      setStep("preview");
    } catch (err) {
      console.error("File processing error:", err);
      toast.error("Failed to process file: " + (err?.message || "Unknown error"));
      setStep("upload");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!rows.length) return;
    setStep("uploading");
    setTotal(rows.length);
    setUploaded(0);
    setErrors([]);

    // Step 1: Auto-create missing master data
    const log = await ensureMasterData(rows);
    setMasterLog(log);

    // Step 2: Upload loads in batches of 5
    const errs = [];
    let done = 0;
    for (let i = 0; i < rows.length; i += 5) {
      const batch = rows.slice(i, i + 5);
      try {
        // Try bulkCreate first, fall back to individual creates
        try {
          await base44.entities.Load.bulkCreate(batch);
        } catch {
          // bulkCreate failed — create individually so partial success works
          for (const load of batch) {
            try {
              await base44.entities.Load.create(load);
            } catch (e) {
              errs.push(`Row ${i + batch.indexOf(load) + 1} (${load.load_number}): ${e?.message || "Failed"}`);
            }
          }
        }
      } catch (e) {
        errs.push(`Batch ${Math.floor(i/5)+1}: ${e?.message || "Failed"}`);
      }
      done = Math.min(i + 5, rows.length);
      setUploaded(done);
    }

    setErrors(errs);
    setStep("done");
    if (errs.length === 0) {
      toast.success(`${rows.length} loads uploaded successfully!`);
      onSuccess?.();
    } else {
      toast.warning(`${rows.length - errs.length} uploaded, ${errs.length} failed`);
    }
  };

  // ── Template download ────────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const header = [
      "date","load_number","client_name","broker_name","vehicle_number","vehicle_type",
      "driver_name","loading_point","destination","commodity","weight_tons",
      "freight_amount","broker_fare","loading_labour","unloading_labour",
      "overweight_charges","detention_charges","other_charges","taxes",
      "payment_type","status","notes"
    ].join(",");
    const sample = [
      "2026-03-01","BL-001","ABC Trading Co","Fast Logistics","TMJ-864","22 Wheels",
      "Muhammad Ali","Karachi","Lahore","Cotton Yarn","25",
      "70000","50000","3000","2000",
      "0","0","2500","500",
      "to_pay","completed","First trip sample"
    ].join(",");
    const blob = new Blob([header + "\n" + sample], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "saifran_loads_template.csv";
    a.click();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 px-0 md:px-4">
      <div className="w-full md:max-w-2xl bg-white rounded-t-3xl md:rounded-3xl max-h-[93vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <p className="text-base font-black text-slate-900">Bulk Upload Loads</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── UPLOAD ── */}
          {step === "upload" && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
              >
                <Upload className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Drag & drop or tap to upload</p>
                <p className="text-xs text-slate-400 text-center">
                  Supports: Excel (.xlsx), CSV (.csv), or Screenshot (PNG/JPG)
                </p>
                <input
                  ref={fileRef} type="file"
                  accept=".csv,.xlsx,.xls,image/*"
                  className="hidden"
                  onChange={e => processFile(e.target.files[0])}
                />
              </div>

              {/* Column guide */}
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-xs font-bold text-amber-700 mb-2">📋 Accepted Column Headings</p>
                <div className="space-y-1.5 text-[11px] text-amber-700">
                  <p><span className="font-bold">Identity:</span> date, load_number, client_name, broker_name, vehicle_number, vehicle_type, driver_name</p>
                  <p><span className="font-bold">Route:</span> loading_point, destination, commodity, weight_tons</p>
                  <p><span className="font-bold">Income:</span> freight_amount <span className="opacity-60">(our billing rate to client)</span></p>
                  <p><span className="font-bold">Costs:</span> broker_fare, <span className="underline">loading_labour + unloading_labour</span> → auto-summed as labor_charges</p>
                  <p><span className="font-bold">Extra costs:</span> overweight_charges, detention_charges, <span className="underline">other_charges / toll / police / commission</span> → auto-summed as other costs</p>
                  <p><span className="font-bold">Other:</span> taxes, payment_type (paid/to_pay), status, notes</p>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-200 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-600">
                    <strong>Auto-creates:</strong> New clients, brokers, vehicle types and stations are automatically added to the system when found in the upload file.
                    Blank fields are skipped — no errors for missing data.
                  </p>
                </div>
              </div>

              <Button onClick={downloadTemplate} variant="outline" className="w-full rounded-xl gap-2">
                <Download className="w-4 h-4" /> Download CSV Template
              </Button>
            </>
          )}

          {/* ── EXTRACTING ── */}
          {step === "extracting" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-sm font-bold text-slate-700">Reading your file...</p>
              <p className="text-xs text-slate-400 text-center">AI is extracting all data rows</p>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {step === "preview" && (
            <>
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">{rows.length} loads detected</p>
                  <p className="text-xs text-emerald-600">Review below — clients, brokers, vehicle types & stations will be auto-created if new</p>
                </div>
              </div>

              {/* Preview toggle */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="w-full flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-700">Preview Data ({rows.length} rows)</span>
                </div>
                {showPreview ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showPreview && (
                <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-64">
                  <table className="w-full text-[10px]">
                    <thead className="bg-slate-800 text-white sticky top-0">
                      <tr>
                        {["#","Date","Load#","Client","Broker","Vehicle#","Type","From","To","Commodity","Tons","Freight","B.Fare","Labour","O.Weight","Detention","Other","Tax","Pay","Status"].map(h => (
                          <th key={h} className="px-2 py-1.5 text-left font-bold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="px-2 py-1.5 text-slate-400">{i+1}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.loading_date}</td>
                          <td className="px-2 py-1.5 font-bold whitespace-nowrap">{r.load_number}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.client_name || <span className="text-slate-300">—</span>}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.broker_name || <span className="text-slate-300">—</span>}</td>
                          <td className="px-2 py-1.5">{r.vehicle_number || <span className="text-slate-300">—</span>}</td>
                          <td className="px-2 py-1.5">{r.vehicle_type || <span className="text-slate-300">—</span>}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.origin || <span className="text-slate-300">—</span>}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{r.destination || <span className="text-slate-300">—</span>}</td>
                          <td className="px-2 py-1.5">{r.commodity || <span className="text-slate-300">—</span>}</td>
                          <td className="px-2 py-1.5 text-right">{r.weight_tons || "—"}</td>
                          <td className="px-2 py-1.5 text-right font-bold text-emerald-700">{r.freight_amount ? r.freight_amount.toLocaleString() : "—"}</td>
                          <td className="px-2 py-1.5 text-right">{r.broker_hired_amount ? r.broker_hired_amount.toLocaleString() : "—"}</td>
                          <td className="px-2 py-1.5 text-right">{r.labor_charges ? r.labor_charges.toLocaleString() : "—"}</td>
                          <td className="px-2 py-1.5 text-right">{r.overweight_charges || "—"}</td>
                          <td className="px-2 py-1.5 text-right">{r.detention_charges || "—"}</td>
                          <td className="px-2 py-1.5 text-right">{r.other_charges ? r.other_charges.toLocaleString() : "—"}</td>
                          <td className="px-2 py-1.5 text-right">{r.taxes || "—"}</td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] ${r.payment_type === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                              {r.payment_type === "paid" ? "PAID" : "TO PAY"}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px]">{r.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-xs text-blue-700">
                <strong>Auto-create on upload:</strong> Any new client names, broker names, vehicle types, and loading/destination cities found in this file will be automatically added to the system.
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => { setStep("upload"); setRows([]); }} className="flex-1 rounded-xl">
                  Change File
                </Button>
                <Button onClick={handleUpload} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 gap-2">
                  <Upload className="w-4 h-4" /> Upload {rows.length} Loads
                </Button>
              </div>
            </>
          )}

          {/* ── UPLOADING ── */}
          {step === "uploading" && (
            <div className="flex flex-col items-center py-10 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-sm font-bold text-slate-700">Uploading loads...</p>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${total > 0 ? (uploaded / total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{uploaded} / {total} loads</p>
              {masterLog.length > 0 && (
                <div className="w-full bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700 space-y-0.5 max-h-28 overflow-y-auto">
                  {masterLog.map((l, i) => <p key={i}>{l}</p>)}
                </div>
              )}
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="flex flex-col items-center py-6 gap-4">
              {errors.length === 0 ? (
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-amber-500" />
                </div>
              )}

              <div className="text-center">
                <p className="text-lg font-black text-slate-900">
                  {rows.length - errors.length} / {rows.length} Loads Uploaded
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {errors.length === 0 ? "All loads added successfully." : `${errors.length} rows had errors.`}
                </p>
              </div>

              {/* Master data log */}
              {masterLog.length > 0 && (
                <>
                  <button
                    onClick={() => setShowLog(!showLog)}
                    className="flex items-center gap-2 text-xs text-emerald-700 font-semibold"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {masterLog.length} master data items created
                    {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showLog && (
                    <div className="w-full bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700 space-y-0.5 max-h-32 overflow-y-auto">
                      {masterLog.map((l, i) => <p key={i}>{l}</p>)}
                    </div>
                  )}
                </>
              )}

              {/* Errors */}
              {errors.length > 0 && (
                <div className="w-full bg-red-50 rounded-xl p-3 text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                  {errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}

              <Button onClick={onClose} className="w-full rounded-xl bg-slate-900">
                Done
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}