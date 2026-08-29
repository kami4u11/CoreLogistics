import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import MobileHeader from "@/components/ui/MobileHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Printer, Upload } from "lucide-react";
import BiltyPrint from "@/components/BiltyPrint";
import { useAppSettings } from "@/components/AppSettings";

const DEFAULT_VEHICLE_TYPES = [
  "LCL Cargo", "17ft", "18ft", "20ft Dry", "20ft Reefer",
  "40ft Dry", "40ft Reefer", "Flat Bed", "Half Body", "Suzuki", "Shahzore"
];

export default function LoadForm() {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");
  const parentId = params.get("parent_id"); // for multi-bilty
  const queryClient = useQueryClient();
  const { settings, country } = useAppSettings();
  const { symbol, docName, docNumberLabel, cities = [] } = settings;

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.filter({ status: "active" }) });
  const { data: brokers = [] } = useQuery({ queryKey: ["brokers"], queryFn: () => base44.entities.Broker.filter({ status: "active" }) });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ["vehicleTypes"], queryFn: () => base44.entities.VehicleType.list() });
  const { data: fleetVehicles = [] } = useQuery({ queryKey: ["fleetVehicles"], queryFn: () => base44.entities.FleetVehicle.list() });
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => base44.entities.Station.list() });
  const { data: allLoads = [] } = useQuery({ queryKey: ["loads_all"], queryFn: () => base44.entities.Load.list() });

  const allVehicleTypes = vehicleTypes.length > 0
    ? vehicleTypes.filter(t => t.is_active !== false).map(t => t.name)
    : DEFAULT_VEHICLE_TYPES;

  const [form, setForm] = useState({
    load_number: "", client_id: "", client_name: "", broker_id: "", broker_name: "",
    vehicle_id: "", vehicle_number: "", vehicle_type: "", origin: "", destination: "",
    cargo_type: "", weight_tons: "", loading_date: "", delivery_date: "",
    freight_amount: "", advance_amount: "", balance_amount: "",
    broker_hired_amount: "", labor_charges: "", other_charges: "",
    status: "booked", labor_status: "pending", loading_status: "pending", notes: "",
    is_own_fleet: false, fleet_vehicle_id: "",
    payment_type: "topay", receiver_name: "",
    seal_number: "", seal_image_url: "", loading_images: [],
    parent_load_id: parentId || ""
  });

  const [newOrigin, setNewOrigin] = useState("");
  const [newDest, setNewDest] = useState("");
  const [addingOrigin, setAddingOrigin] = useState(false);
  const [addingDest, setAddingDest] = useState(false);
  const [showBiltyPrint, setShowBiltyPrint] = useState(false);
  const [uploadingSeal, setUploadingSeal] = useState(false);
  const [uploadingLoading, setUploadingLoading] = useState(false);

  // Auto generate load number: YY + clientSeq (padded)
  const generateLoadNumber = async (clientId) => {
    if (!clientId) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    // Find client index (1-based)
    const sortedClients = [...clients].sort((a, b) => a.created_date?.localeCompare?.(b.created_date) || 0);
    const clientIdx = sortedClients.findIndex(c => c.id === clientId) + 1;
    // Count existing loads for this client
    const clientLoads = allLoads.filter(l => l.client_id === clientId);
    const seq = clientLoads.length + 1;
    const yy = String(new Date().getFullYear()).slice(-2);
    const loadNum = `${yy}${String(clientIdx).padStart(2, "0")}${String(seq).padStart(2, "0")}`;
    setForm(prev => ({ ...prev, load_number: loadNum }));
  };

  useEffect(() => {
    if (editId) {
      base44.entities.Load.list().then(loads => {
        const load = loads.find(l => l.id === editId);
        if (load) setForm({ ...load, is_own_fleet: load.is_own_fleet || false, loading_images: load.loading_images || [] });
      });
    }
  }, [editId]);

  useEffect(() => {
    // Set initial load number once clients and loads are loaded and no editId
    if (!editId && clients.length > 0) {
      // Will be regenerated when client is selected
      const num = String(Date.now()).slice(-6);
      setForm(prev => prev.load_number ? prev : { ...prev, load_number: num });
    }
  }, [clients.length, editId]);

  const handleChange = (field, value) => {
    const updates = { [field]: value };

    if (field === "client_id") {
      const client = clients.find(c => c.id === value);
      if (client) {
        updates.client_name = client.name;
        // Generate load number with client info
        const sortedClients = [...clients].sort((a, b) => a.created_date?.localeCompare?.(b.created_date) || 0);
        const clientIdx = sortedClients.findIndex(c => c.id === value) + 1;
        const clientLoads = allLoads.filter(l => l.client_id === value);
        const seq = clientLoads.length + 1;
        const yy = String(new Date().getFullYear()).slice(-2);
        updates.load_number = `${yy}${String(clientIdx).padStart(2, "0")}${String(seq).padStart(2, "0")}`;
      }
    }
    if (field === "broker_id") {
      const broker = brokers.find(b => b.id === value);
      if (broker) updates.broker_name = broker.name;
    }
    if (field === "vehicle_id") {
      const vehicle = vehicles.find(v => v.id === value);
      if (vehicle) {
        updates.vehicle_number = vehicle.vehicle_number;
        updates.vehicle_type = vehicle.vehicle_type || "";
      }
    }
    if (field === "fleet_vehicle_id") {
      const fv = fleetVehicles.find(v => v.id === value);
      if (fv) {
        updates.vehicle_number = fv.vehicle_number;
        updates.vehicle_type = fv.vehicle_type || "";
        updates.broker_name = "Saifran Fleet";
      }
    }
    if (field === "is_own_fleet" && value) {
      updates.broker_name = "Saifran Fleet";
    }

    // Auto-calc balance
    const frFields = ["freight_amount", "advance_amount"];
    if (frFields.includes(field)) {
      const freight = field === "freight_amount" ? parseFloat(value) || 0 : parseFloat(form.freight_amount) || 0;
      const advance = field === "advance_amount" ? parseFloat(value) || 0 : parseFloat(form.advance_amount) || 0;
      updates.balance_amount = freight - advance;
    }

    setForm(prev => ({ ...prev, ...updates }));
  };

  const addStation = async (name, type) => {
    if (!name.trim()) return;
    await base44.entities.Station.create({ name: name.trim(), type: "both", is_active: true });
    queryClient.invalidateQueries({ queryKey: ["stations"] });
    handleChange(type === "origin" ? "origin" : "destination", name.trim());
    if (type === "origin") { setAddingOrigin(false); setNewOrigin(""); }
    else { setAddingDest(false); setNewDest(""); }
    toast.success(`Station "${name}" saved`);
  };

  const handleSealUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingSeal(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, seal_image_url: file_url }));
    setUploadingSeal(false);
    toast.success("Seal image uploaded");
  };

  const handleLoadingImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingLoading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    setForm(prev => ({ ...prev, loading_images: [...(prev.loading_images || []), ...urls] }));
    setUploadingLoading(false);
    toast.success(`${urls.length} loading image(s) uploaded`);
  };

  // Merge DB stations + country cities, deduplicated (filter by current country)
  const dbStationNames = stations.filter(s => s.is_active !== false && (!s.country || s.country === settings.code)).map(s => s.name);
  const stationNames = [...new Set([...dbStationNames, ...cities])];

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const load = editId
        ? await base44.entities.Load.update(editId, data)
        : await base44.entities.Load.create(data);
      // Auto-create fleet trip when own fleet vehicle is used (only on create)
      if (!editId && data.is_own_fleet && data.fleet_vehicle_id) {
        const fv = fleetVehicles.find(v => v.id === data.fleet_vehicle_id);
        await base44.entities.FleetTrip.create({
          fleet_vehicle_id: data.fleet_vehicle_id,
          vehicle_number: data.vehicle_number || fv?.vehicle_number || "",
          driver_name: fv?.driver_name || "",
          trip_date: data.loading_date || new Date().toISOString().slice(0, 10),
          month: (data.loading_date || new Date().toISOString().slice(0, 7)).substring(0, 7),
          origin: data.origin || "",
          destination: data.destination || "",
          route: `${data.origin || ""} → ${data.destination || ""}`,
          client_name: data.client_name || "",
          cargo_type: data.cargo_type || "",
          load_id: load.id,
          load_number: data.load_number,
          freight_income_pkr: data.broker_hired_amount || 0, // fleet earns the hired amount
          status: "pending",
          pnl_status: "pending",
        });
        toast.info("Fleet trip auto-created from bilty.");
      }
      return load;
    },
    onSuccess: () => {
      toast.success(editId ? "Load updated" : "Bilty created");
      window.location.href = createPageUrl("Loads");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    ["freight_amount", "advance_amount", "balance_amount", "labor_charges", "broker_hired_amount", "other_charges", "weight_tons"].forEach(f => {
      data[f] = parseFloat(data[f]) || 0;
    });
    saveMutation.mutate(data);
  };

  return (
    <div className="pb-24">
      {showBiltyPrint && <BiltyPrint load={form} onClose={() => setShowBiltyPrint(false)} />}
      <MobileHeader
        title={editId ? `Edit ${docName}` : (parentId ? `Add Another ${docName}` : `New ${docName}`)}
        backTo="Loads"
        rightAction={
          <button
            type="button"
            onClick={() => setShowBiltyPrint(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Preview {docName}
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Basic Info</h3>

          {/* Payment Type Toggle - prominent */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleChange("payment_type", "topay")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${form.payment_type === "topay" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-orange-600 border-orange-300"}`}
            >
              TO PAY
            </button>
            <button
              type="button"
              onClick={() => handleChange("payment_type", "paid")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${form.payment_type === "paid" ? "bg-green-500 text-white border-green-500" : "bg-white text-green-600 border-green-300"}`}
            >
              PAID
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{docNumberLabel || "Bilty No."} *</Label>
              <Input value={form.load_number} onChange={(e) => handleChange("load_number", e.target.value)} required className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["booked", "loading", "in_transit", "delivered", "completed", "cancelled"].map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={form.client_id || ""} onValueChange={(v) => handleChange("client_id", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Receiver's Name</Label>
            <Input value={form.receiver_name} onChange={(e) => handleChange("receiver_name", e.target.value)} className="rounded-xl" placeholder="Leave blank for Self" />
          </div>

          <div className="space-y-1.5">
            <Label>Broker (optional)</Label>
            <Select value={form.broker_id || "none"} onValueChange={(v) => handleChange("broker_id", v === "none" ? "" : v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select broker" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No broker</SelectItem>
                {brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Own Fleet toggle */}
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3">
            <input type="checkbox" id="ownFleet" checked={form.is_own_fleet || false}
              onChange={(e) => handleChange("is_own_fleet", e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="ownFleet" className="text-sm font-medium text-blue-800 cursor-pointer">Own Fleet Vehicle (Saifran Fleet)</label>
          </div>

          {/* Vehicle selection */}
          {form.is_own_fleet ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Select Own Fleet Vehicle</Label>
                <Select value={form.fleet_vehicle_id || "none"} onValueChange={(v) => handleChange("fleet_vehicle_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select fleet vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {fleetVehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.vehicle_number} – {v.driver_name || v.vehicle_type || ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle Type (auto-filled, editable)</Label>
                <Select value={form.vehicle_type || "custom"} onValueChange={(v) => v !== "custom" && handleChange("vehicle_type", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Vehicle type" /></SelectTrigger>
                  <SelectContent>
                    {allVehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>External Vehicle</Label>
                <Select value={form.vehicle_id || "none"} onValueChange={(v) => handleChange("vehicle_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.vehicle_number} – {v.driver_name || v.vehicle_type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle Type</Label>
                <Select value={form.vehicle_type || "custom"} onValueChange={(v) => v !== "custom" && handleChange("vehicle_type", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Vehicle type" /></SelectTrigger>
                  <SelectContent>
                    {allVehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Route & Cargo */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Route & Cargo</h3>

          {/* Origin */}
          <div className="space-y-1.5">
            <Label>Origin *</Label>
            {addingOrigin ? (
              <div className="flex gap-2">
                <Input value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} placeholder="New station name" className="rounded-xl flex-1" />
                <Button type="button" size="sm" className="rounded-xl" onClick={() => addStation(newOrigin, "origin")}>Save</Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setAddingOrigin(false)}>✕</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={form.origin || "manual"} onValueChange={(v) => { if (v !== "add_new") handleChange("origin", v); else setAddingOrigin(true); }}>
                  <SelectTrigger className="rounded-xl flex-1"><SelectValue placeholder="Select origin" /></SelectTrigger>
                  <SelectContent>
                    {stationNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    <SelectItem value="add_new">➕ Add New Station</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!stationNames.includes(form.origin) && form.origin && !addingOrigin && (
              <Input value={form.origin} onChange={(e) => handleChange("origin", e.target.value)} className="rounded-xl mt-1.5" placeholder="Origin" />
            )}
            {!form.origin && !addingOrigin && (
              <Input value={form.origin} onChange={(e) => handleChange("origin", e.target.value)} required className="rounded-xl mt-1.5" placeholder="Or type origin" />
            )}
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label>Destination *</Label>
            {addingDest ? (
              <div className="flex gap-2">
                <Input value={newDest} onChange={(e) => setNewDest(e.target.value)} placeholder="New station name" className="rounded-xl flex-1" />
                <Button type="button" size="sm" className="rounded-xl" onClick={() => addStation(newDest, "dest")}>Save</Button>
                <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setAddingDest(false)}>✕</Button>
              </div>
            ) : (
              <Select value={form.destination || "manual"} onValueChange={(v) => { if (v !== "add_new") handleChange("destination", v); else setAddingDest(true); }}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  {stationNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  <SelectItem value="add_new">➕ Add New Station</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!stationNames.includes(form.destination) && form.destination && !addingDest && (
              <Input value={form.destination} onChange={(e) => handleChange("destination", e.target.value)} className="rounded-xl mt-1.5" placeholder="Destination" />
            )}
            {!form.destination && !addingDest && (
              <Input value={form.destination} onChange={(e) => handleChange("destination", e.target.value)} required className="rounded-xl mt-1.5" placeholder="Or type destination" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cargo Description</Label>
              <Input value={form.cargo_type} onChange={(e) => handleChange("cargo_type", e.target.value)} className="rounded-xl" placeholder="e.g. Sugar, Cement" />
            </div>
            <div className="space-y-1.5">
              <Label>Weight (Tons)</Label>
              <Input type="number" step="0.5" value={form.weight_tons} onChange={(e) => handleChange("weight_tons", e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Loading Date</Label>
              <Input type="date" value={form.loading_date} onChange={(e) => handleChange("loading_date", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Date</Label>
              <Input type="date" value={form.delivery_date} onChange={(e) => handleChange("delivery_date", e.target.value)} className="rounded-xl" />
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Financials ({settings.currency})
            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${form.payment_type === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              {form.payment_type === "paid" ? "PAID – amounts internal only" : `TO PAY – shown on ${docName}`}
            </span>
          </h3>
          <div className="space-y-1.5">
            <Label className="text-blue-700 font-bold">Quotation / Freight to Client ({settings.currency}) ★ <span className="text-slate-400 font-normal text-xs">(Income)</span></Label>
            <Input type="number" value={form.freight_amount} onChange={(e) => handleChange("freight_amount", e.target.value)} className="rounded-xl border-blue-200 bg-blue-50 font-bold" placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Broker / Hired Vehicle Amount ({settings.currency}) <span className="text-slate-400 text-xs">(Fleet Income)</span></Label>
              <Input type="number" value={form.broker_hired_amount} onChange={(e) => handleChange("broker_hired_amount", e.target.value)} className="rounded-xl" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Labor Charges ({settings.currency})</Label>
              <Input type="number" value={form.labor_charges} onChange={(e) => handleChange("labor_charges", e.target.value)} className="rounded-xl" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Other Charges ({settings.currency})</Label>
              <Input type="number" value={form.other_charges} onChange={(e) => handleChange("other_charges", e.target.value)} className="rounded-xl" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Advance Paid ({settings.currency})</Label>
              <Input type="number" value={form.advance_amount} onChange={(e) => handleChange("advance_amount", e.target.value)} className="rounded-xl" placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Balance Remaining (auto)</Label>
            <Input type="number" value={form.balance_amount} readOnly className="rounded-xl bg-slate-50" />
          </div>
        </div>

        {/* Supervisor Section */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Loading Supervisor Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Labor Status</Label>
              <Select value={form.labor_status} onValueChange={(v) => handleChange("labor_status", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pending", "assigned", "loading", "completed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Loading Status</Label>
              <Select value={form.loading_status} onValueChange={(v) => handleChange("loading_status", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pending", "in_progress", "completed", "verified"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Seal Number</Label>
              <Input value={form.seal_number} onChange={(e) => handleChange("seal_number", e.target.value)} className="rounded-xl" placeholder="e.g. SL-1234" />
            </div>
            <div className="space-y-1.5">
              <Label>Seal Photo</Label>
              <label className={`flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:border-orange-400 transition-colors ${uploadingSeal ? "opacity-50" : ""}`}>
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">{uploadingSeal ? "Uploading..." : form.seal_image_url ? "✅ Uploaded" : "Upload Seal"}</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleSealUpload} />
              </label>
            </div>
          </div>

          {/* Loading Images */}
          <div className="space-y-1.5">
            <Label>Loading Images (multiple allowed)</Label>
            <label className={`flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-orange-400 transition-colors ${uploadingLoading ? "opacity-50" : ""}`}>
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">{uploadingLoading ? "Uploading..." : `Upload Loading Photos (${(form.loading_images || []).length} uploaded)`}</span>
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleLoadingImageUpload} />
            </label>
            {(form.loading_images || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.loading_images.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Loading ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, loading_images: prev.loading_images.filter((_, idx) => idx !== i) }))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes / Consignee Address</Label>
          <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="rounded-xl" rows={3} />
        </div>

        <Button type="submit" disabled={saveMutation.isPending} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 h-12 text-base">
          {saveMutation.isPending ? "Saving..." : (editId ? `Update ${docName}` : `Create ${docName}`)}
        </Button>
      </form>
    </div>
  );
}