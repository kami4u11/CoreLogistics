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
import { Upload, Printer, Lock, Calculator } from "lucide-react";
import BiltyPrint from "@/components/BiltyPrint";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import BiltyCostModal from "@/components/BiltyCostModal";

export default function BiltyForm() {
  const { isAdmin, isManagement, isOperations, isSupervisor, loading: roleLoading } = useRole();
  const { settings } = useAppSettings();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const loadId = params.get("load_id");
  const editBiltyId = params.get("id"); // editing an existing bilty

  // Only admin, management, operations, supervisor can fill bilty details
  if (!isAdmin && !isManagement && !isOperations && !isSupervisor) return <AccessDenied />;

  const canEditProtectedFields = isAdmin || isManagement; // Only admin/management can CHANGE existing vehicle/broker

  const { data: allLoads = [] } = useQuery({
    queryKey: ["loads_all"],
    queryFn: () => base44.entities.Load.list(),
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => base44.entities.Vehicle.list() });
  const { data: brokers = [] } = useQuery({ queryKey: ["brokers"], queryFn: () => base44.entities.Broker.filter({ status: "active" }) });
  const { data: fleetVehicles = [] } = useQuery({ queryKey: ["fleetVehicles"], queryFn: () => base44.entities.FleetVehicle.list() });
  const { data: stations = [] } = useQuery({ queryKey: ["stations"], queryFn: () => base44.entities.Station.list() });

  const { cities = [] } = settings;
  const stationNames = [...new Set([
    ...stations.filter(s => s.is_active !== false).map(s => s.name),
    ...cities
  ])];

  // The parent load being referenced
  const parentLoad = allLoads.find(l => l.id === loadId);

  // Generate Bilty number: BL-YY-NNN
  // Uses max existing sequence (not count) so deletions don't reset or duplicate numbers
  const generateBiltyNumber = () => {
    const yy = String(new Date().getFullYear()).slice(-2);
    const prefix = `BL-${yy}-`;
    const existingSeqs = allLoads
      .filter(l => l.load_number?.startsWith(prefix))
      .map(l => parseInt(l.load_number.replace(prefix, ""), 10) || 0);
    const maxSeq = existingSeqs.length > 0 ? Math.max(...existingSeqs) : 0;
    return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
  };

  const [form, setForm] = useState({
    load_number: "",
    parent_load_id: loadId || "",
    client_id: parentLoad?.client_id || "",
    client_name: parentLoad?.client_name || "",
    origin: parentLoad?.origin || "",
    destination: "",
    vehicle_id: parentLoad?.vehicle_id || "",
    vehicle_number: parentLoad?.vehicle_number || "",
    vehicle_type: parentLoad?.vehicle_type || "",
    broker_id: parentLoad?.broker_id || "",
    broker_name: parentLoad?.broker_name || "",
    is_own_fleet: parentLoad?.is_own_fleet || false,
    fleet_vehicle_id: parentLoad?.fleet_vehicle_id || "",
    receiver_name: "",
    cargo_type: parentLoad?.cargo_type || "",
    cargo_description: "",
    quantity: "",
    weight_tons: parentLoad?.weight_tons || "",
    loading_date: parentLoad?.loading_date || new Date().toISOString().slice(0, 10),
    delivery_date: "",
    dn_number: "",
    cn_number: "",
    seal_number: "",
    seal_image_url: "",
    loading_images: [],
    payment_type: parentLoad?.payment_type || "topay",
    freight_amount: parentLoad?.freight_amount || "",
    approved_rate: parentLoad?.approved_rate || "",
    broker_hired_amount: parentLoad?.broker_hired_amount || "",
    status: "booked",
    notes: "",
  });

  const [showPrint, setShowPrint] = useState(false);
  const [showCosting, setShowCosting] = useState(false);
  const [savedBilty, setSavedBilty] = useState(null);
  const [uploadingSeal, setUploadingSeal] = useState(false);
  const [uploadingLoading, setUploadingLoading] = useState(false);

  // Track which protected fields were already set (can't be changed by supervisor/operations)
  const [originalVehicleNumber, setOriginalVehicleNumber] = useState("");
  const [originalBrokerName, setOriginalBrokerName] = useState("");

  // Generate bilty number as soon as allLoads is available (handles case with no parent load)
  useEffect(() => {
    if (allLoads.length > 0 && !editBiltyId && !form.load_number) {
      setForm(prev => ({ ...prev, load_number: generateBiltyNumber() }));
    }
  }, [allLoads.length]);

  // Load parent data + generate bilty number once parent loads
  useEffect(() => {
    if (parentLoad) {
      const biltyNum = generateBiltyNumber();
      setForm(prev => ({
        ...prev,
        load_number: biltyNum,
        parent_load_id: loadId,
        client_id: parentLoad.client_id || "",
        client_name: parentLoad.client_name || "",
        origin: parentLoad.origin || "",
        vehicle_id: parentLoad.vehicle_id || "",
        vehicle_number: parentLoad.vehicle_number || "",
        vehicle_type: parentLoad.vehicle_type || "",
        broker_id: parentLoad.broker_id || "",
        broker_name: parentLoad.broker_name || "",
        is_own_fleet: parentLoad.is_own_fleet || false,
        fleet_vehicle_id: parentLoad.fleet_vehicle_id || "",
        cargo_type: parentLoad.cargo_type || "",
        weight_tons: parentLoad.weight_tons || "",
        loading_date: parentLoad.loading_date || prev.loading_date,
        payment_type: parentLoad.payment_type || "topay",
      }));
      setOriginalVehicleNumber(parentLoad.vehicle_number || "");
      setOriginalBrokerName(parentLoad.broker_name || "");
    }
  }, [parentLoad?.id]);

  // Load existing bilty for edit
  useEffect(() => {
    if (editBiltyId && allLoads.length > 0) {
      const bilty = allLoads.find(l => l.id === editBiltyId);
      if (bilty) {
        setForm({ ...bilty, loading_images: bilty.loading_images || [] });
        setOriginalVehicleNumber(bilty.vehicle_number || "");
        setOriginalBrokerName(bilty.broker_name || "");
      }
    }
  }, [editBiltyId, allLoads.length]);

  const handleChange = (field, value) => {
    const updates = { [field]: value };
    if (field === "broker_id") {
      const broker = brokers.find(b => b.id === value);
      if (broker) updates.broker_name = broker.name;
    }
    if (field === "vehicle_id") {
      const vehicle = vehicles.find(v => v.id === value);
      if (vehicle) {
        updates.vehicle_number = vehicle.vehicle_number;
        if (!form.vehicle_type) updates.vehicle_type = vehicle.vehicle_type || "";
      }
    }
    if (field === "fleet_vehicle_id") {
      const fv = fleetVehicles.find(v => v.id === value);
      if (fv) {
        updates.vehicle_number = fv.vehicle_number;
        if (!form.vehicle_type) updates.vehicle_type = fv.vehicle_type || "";
      }
    }
    setForm(prev => ({ ...prev, ...updates }));
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...form,
        quantity: parseFloat(form.quantity) || 0,
        weight_tons: parseFloat(form.weight_tons) || 0,
        freight_amount: parseFloat(form.approved_rate) || 0, // keep in sync with approved_rate
        approved_rate: parseFloat(form.approved_rate) || 0,
        broker_hired_amount: parseFloat(form.broker_hired_amount) || 0,
        reefer_temperature: form.reefer_temperature !== "" && form.reefer_temperature != null ? parseFloat(form.reefer_temperature) || null : null,
      };
      // Auto-save origin to stations if not already present
      if (form.origin?.trim()) {
        const existsOrigin = stations.find(s => s.name?.toLowerCase() === form.origin.toLowerCase());
        if (!existsOrigin) {
          base44.entities.Station.create({ name: form.origin.trim(), type: "both", is_active: true }).catch(() => {});
        }
      }
      // Auto-save destination to stations if not already present
      if (form.destination?.trim()) {
        const existsDest = stations.find(s => s.name?.toLowerCase() === form.destination.toLowerCase());
        if (!existsDest) {
          base44.entities.Station.create({ name: form.destination.trim(), type: "both", is_active: true }).catch(() => {});
        }
      }
      // Auto-save manually typed broker vehicle number to pool list
      if (!form.is_own_fleet && form.vehicle_number && !form.vehicle_id) {
        const exists = vehicles.find(v => v.vehicle_number?.toLowerCase() === form.vehicle_number.toLowerCase());
        if (!exists) {
          const newVehicle = await base44.entities.Vehicle.create({
            vehicle_number: form.vehicle_number,
            vehicle_type: form.vehicle_type || "truck",
            broker_name: form.broker_name || "",
            status: "available",
          });
          data.vehicle_id = newVehicle.id;
        }
      }
      return editBiltyId
        ? await base44.entities.Load.update(editBiltyId, data)
        : await base44.entities.Load.create(data);
    },
    onSuccess: (bilty) => {
      queryClient.invalidateQueries({ queryKey: ["loads"] });
      queryClient.invalidateQueries({ queryKey: ["loads_all"] });
      toast.success(editBiltyId ? "Bilty updated" : "Bilty created");
      setSavedBilty(bilty);
      // Don't redirect yet — show costing button
    },
  });

  // Determine if vehicle/broker fields are locked (already set, and user is not admin)
  const vehicleLocked = !canEditProtectedFields && !!originalVehicleNumber;
  const brokerLocked = !canEditProtectedFields && !!originalBrokerName;

  const docName = settings.docName || "Bilty";
  const docNumberLabel = settings.docNumberLabel || "Bilty No.";

  const { data: clients = [] } = useQuery({ queryKey: ["clients_bf"], queryFn: () => base44.entities.Client.list() });

  return (
    <div className="pb-24">
      {showPrint && <BiltyPrint load={form} onClose={() => setShowPrint(false)} />}
      {showCosting && savedBilty && (
        <BiltyCostModal bilty={{ ...form, ...savedBilty }} onClose={() => { setShowCosting(false); window.location.href = createPageUrl(`LoadDetail?id=${savedBilty.id}`); }} />
      )}
      <MobileHeader
        title={editBiltyId ? `Edit ${docName}` : `Add ${docName}`}
        backTo="Bilties"
        rightAction={
          <button type="button" onClick={() => setShowPrint(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors">
            <Printer className="w-3.5 h-3.5" /> Preview
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Load reference banner */}
        {parentLoad && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <p className="text-xs text-blue-500 font-semibold mb-1">LINKED LOAD</p>
            <p className="text-sm font-bold text-blue-800">Load ID: {parentLoad.load_id_number}</p>
            <p className="text-xs text-blue-600">{parentLoad.client_name} · {parentLoad.origin} → {(parentLoad.destinations || [parentLoad.destination]).join(", ")}</p>
          </div>
        )}

        {/* Section: Bilty Numbers (read-only, auto-generated) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Document Numbers</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{docNumberLabel} *</Label>
              <Input value={form.load_number} readOnly className="rounded-xl bg-slate-50 font-bold text-slate-700" />
            </div>
            <div className="space-y-1.5">
              <Label>Load ID</Label>
              <Input value={parentLoad?.load_id_number || "-"} readOnly className="rounded-xl bg-slate-50 text-slate-500" />
            </div>
          </div>

          {/* Bilty Date */}
          <div className="space-y-1.5">
            <Label className="text-orange-700 font-semibold">Bilty Date *</Label>
            <Input
              type="date"
              value={form.loading_date}
              onChange={e => handleChange("loading_date", e.target.value)}
              className="rounded-xl border-orange-200 font-medium text-slate-800"
            />
            <p className="text-[10px] text-orange-500">→ This date will be used as the bilty & ledger posting date</p>
          </div>

          {/* DN / CN Numbers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>DN Number</Label>
              <Input value={form.dn_number} onChange={e => handleChange("dn_number", e.target.value)} className="rounded-xl" placeholder="Delivery Note No." />
            </div>
            <div className="space-y-1.5">
              <Label>CN Number</Label>
              <Input value={form.cn_number} onChange={e => handleChange("cn_number", e.target.value)} className="rounded-xl" placeholder="Consignment Note No." />
            </div>
          </div>
        </div>

        {/* Section: Client & Rates */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Client & Rates</h3>
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={form.client_id || "none"} onValueChange={v => {
              const client = clients.find(c => c.id === v);
              handleChange("client_id", v === "none" ? "" : v);
              if (client) handleChange("client_name", client.name);
            }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.client_name && !clients.find(c => c.id === form.client_id) && (
              <Input value={form.client_name} onChange={e => handleChange("client_name", e.target.value)} className="rounded-xl" placeholder="Or type client name" />
            )}
          </div>
          {/* Payment Type */}
          <div className="flex gap-2">
            {["topay","paid"].map(pt => (
              <button key={pt} type="button" onClick={() => handleChange("payment_type", pt)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.payment_type === pt
                  ? pt === "topay" ? "bg-orange-500 text-white border-orange-500" : "bg-green-500 text-white border-green-500"
                  : pt === "topay" ? "bg-white text-orange-600 border-orange-300" : "bg-white text-green-600 border-green-300"}`}>
                {pt === "topay" ? "TO PAY" : "PAID"}
              </button>
            ))}
          </div>
          {(isAdmin || isManagement) && (
            <div className="space-y-1.5">
              <Label className="text-blue-700">Approved Rate (AR) — Client Receivable</Label>
              <Input type="number" value={form.approved_rate} onChange={e => handleChange("approved_rate", e.target.value)} className="rounded-xl border-blue-200" placeholder="0" />
              <p className="text-[10px] text-blue-500">→ Sent to client ledger</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Origin</Label>
            <Select value={stationNames.includes(form.origin) ? form.origin : ""} onValueChange={v => handleChange("origin", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select origin" /></SelectTrigger>
              <SelectContent>
                {stationNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={form.origin} onChange={e => handleChange("origin", e.target.value)} className="rounded-xl mt-1" placeholder="Or type origin" />
          </div>
        </div>

        {/* Section: Cargo Details */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Cargo Details</h3>

          <div className="space-y-1.5">
            <Label>Destination for this Bilty *</Label>
            <Select value={stationNames.includes(form.destination) ? form.destination : ""} onValueChange={v => handleChange("destination", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>
                {/* Show load's destinations first */}
                {(parentLoad?.destinations || [parentLoad?.destination]).filter(Boolean).map(d => (
                  <SelectItem key={d} value={d}>{d} ★</SelectItem>
                ))}
                {stationNames.filter(n => !(parentLoad?.destinations || []).includes(n)).map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={form.destination} onChange={e => handleChange("destination", e.target.value)}
              className="rounded-xl mt-1.5" placeholder="Or type destination" />
          </div>

          <div className="space-y-1.5">
            <Label>Receiver's Name</Label>
            <Input value={form.receiver_name} onChange={e => handleChange("receiver_name", e.target.value)} className="rounded-xl" placeholder="Consignee" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cargo Type</Label>
              <Input value={form.cargo_type} onChange={e => handleChange("cargo_type", e.target.value)} className="rounded-xl" placeholder="e.g. Sugar" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity (units/pkgs)</Label>
              <Input type="number" value={form.quantity} onChange={e => handleChange("quantity", e.target.value)} className="rounded-xl" placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description of Cargo</Label>
            <Textarea value={form.cargo_description} onChange={e => handleChange("cargo_description", e.target.value)} className="rounded-xl" rows={2} placeholder="Detailed description of goods..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Weight (Tons)</Label>
              <Input type="number" step="0.5" value={form.weight_tons} onChange={e => handleChange("weight_tons", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Date</Label>
              <Input type="date" value={form.delivery_date} onChange={e => handleChange("delivery_date", e.target.value)} className="rounded-xl" />
            </div>
          </div>
        </div>

        {/* Section: Transport (Vehicle & Broker) — locked if already set */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Transport</h3>

          {/* Vehicle Type Toggle: Broker Vehicle or Own Fleet */}
          <div className="flex gap-2">
            <button type="button"
              onClick={() => handleChange("is_own_fleet", false)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${!form.is_own_fleet ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-500 border-slate-200"}`}>
              🚛 Broker Vehicle
            </button>
            <button type="button"
              onClick={() => handleChange("is_own_fleet", true)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${form.is_own_fleet ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200"}`}>
              🏢 Own Fleet
            </button>
          </div>

          {/* Broker (only shown when broker vehicle selected) */}
          {!form.is_own_fleet && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Broker Name</Label>
                {brokerLocked && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" /> Admin only to change
                  </span>
                )}
              </div>
              {brokerLocked ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700">
                  {form.broker_name}
                </div>
              ) : (
                <Select value={form.broker_id || "none"} onValueChange={v => handleChange("broker_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select broker" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No broker</SelectItem>
                    {brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {form.broker_name && (
                <div className="space-y-1">
                  <Label className="text-xs text-amber-700">Broker Hired Amount (AP)</Label>
                  <Input type="number" value={form.broker_hired_amount} onChange={e => handleChange("broker_hired_amount", e.target.value)} className="rounded-xl border-amber-200" placeholder="0" />
                  <p className="text-[10px] text-amber-600">→ Sent to broker ledger via Bilty Costing</p>
                </div>
              )}
            </div>
          )}

          {/* Vehicle Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{form.is_own_fleet ? "Fleet Vehicle" : "Broker's Vehicle"}</Label>
              {vehicleLocked && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Lock className="w-2.5 h-2.5" /> Admin only to change
                </span>
              )}
            </div>
            {vehicleLocked ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700">
                {form.vehicle_number}
              </div>
            ) : form.is_own_fleet ? (
              <Select value={form.fleet_vehicle_id || "none"} onValueChange={v => handleChange("fleet_vehicle_id", v === "none" ? "" : v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select fleet vehicle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {fleetVehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.vehicle_number} – {v.driver_name || v.vehicle_type || ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-1.5">
                <Select value={form.vehicle_id || "none"} onValueChange={v => {
                  handleChange("vehicle_id", v === "none" ? "" : v);
                }}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select from pool" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned / Manual</SelectItem>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.vehicle_number} – {v.driver_name || v.vehicle_type || ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={form.vehicle_number} onChange={e => handleChange("vehicle_number", e.target.value)}
                  className="rounded-xl" placeholder="Or type vehicle number manually" />
                {form.vehicle_number && !form.vehicle_id && (
                  <p className="text-[10px] text-blue-600">💾 This vehicle number will be auto-saved to pool list on save</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section: Loading Details */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Loading Details</h3>

          {/* Seal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Seal Number</Label>
              <Input value={form.seal_number} onChange={e => handleChange("seal_number", e.target.value)} className="rounded-xl" placeholder="SL-1234" />
            </div>
            <div className="space-y-1.5">
              <Label>Seal Photo</Label>
              <label className={`flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:border-orange-400 ${uploadingSeal ? "opacity-50" : ""}`}>
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">{uploadingSeal ? "Uploading..." : form.seal_image_url ? "✅ Done" : "Upload"}</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleSealUpload} />
              </label>
            </div>
          </div>

          {/* Loading Images */}
          <div className="space-y-1.5">
            <Label>Loading Images</Label>
            <label className={`flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-orange-400 ${uploadingLoading ? "opacity-50" : ""}`}>
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">{uploadingLoading ? "Uploading..." : `Upload Photos (${(form.loading_images || []).length} uploaded)`}</span>
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
          <Textarea value={form.notes} onChange={e => handleChange("notes", e.target.value)} className="rounded-xl" rows={3} />
        </div>

        {/* Save Bilty */}
        {!savedBilty ? (
          <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.destination}
            className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 h-12 text-base">
            {saveMutation.isPending ? "Saving..." : (editBiltyId ? `Update ${docName}` : `Create ${docName}`)}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
              <p className="text-sm font-bold text-green-700">✅ {docName} saved!</p>
              <p className="text-xs text-green-600">#{savedBilty.load_number} created successfully</p>
            </div>
            {(isAdmin || isManagement) && (
              <Button type="button" onClick={() => setShowCosting(true)}
                className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 h-12 text-base font-bold gap-2">
                <Calculator className="w-5 h-5" /> Add Bilty Costing & Post to Ledger
              </Button>
            )}
            <Button type="button" variant="outline"
              onClick={() => { window.location.href = createPageUrl(`LoadDetail?id=${savedBilty.id}`); }}
              className="w-full rounded-xl h-10">
              View {docName} →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}