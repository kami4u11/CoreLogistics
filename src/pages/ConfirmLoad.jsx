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
import { Plus, X, Thermometer, CheckCircle, Upload, Lock, FileText } from "lucide-react";
import BiltyPrint from "@/components/BiltyPrint";
import { useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";

const DEFAULT_VEHICLE_TYPES = [
  "LCL Cargo","17ft","18ft","20ft Dry","20ft Reefer",
  "40ft Dry","40ft Reefer","Flat Bed","Half Body","Suzuki","Shahzore"
];
const REEFER_TYPES = ["20ft Reefer","40ft Reefer","Reefer"];

// ─── Empty bilty form (used when adding bilty to existing load) ──────────────
const emptyBilty = {
  destination:        "",
  receiver_name:      "",
  cargo_type:         "",
  cargo_description:  "",
  quantity:           "",
  delivery_date:      "",
  dn_number:          "",
  cn_number:          "",
  seal_number:        "",
  seal_image_url:     "",
  loading_images:     [],
  labor_status:       "pending",
  loading_status:     "pending",
  notes:              "",
  vehicle_number:     "",
  vehicle_id:         "",
  fleet_vehicle_id:   "",
  broker_id:          "",
  broker_name:        "",
  is_own_fleet:       false,
};

export default function ConfirmLoad() {
  // ─── ALL HOOKS BEFORE ANY EARLY RETURN ───────────────────────────────────
  const { isAdmin, isManagement, isOperations, isSupervisor, isAccounting, loading: roleLoading } = useRole();
  const { settings } = useAppSettings();
  const queryClient = useQueryClient();

  const params       = new URLSearchParams(window.location.search);
  const editId       = params.get("id");       // editing existing load
  const parentId     = params.get("load_id");  // adding new bilty to existing load
  const addBiltyMode = !!parentId;

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: clients = [] }      = useQuery({ queryKey: ["clients"],      queryFn: () => base44.entities.Client.filter({ status: "active" }) });
  const { data: brokers = [] }      = useQuery({ queryKey: ["brokers"],      queryFn: () => base44.entities.Broker.filter({ status: "active" }) });
  const { data: vehicles = [] }     = useQuery({ queryKey: ["vehicles"],     queryFn: () => base44.entities.Vehicle.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ["vehicleTypes"], queryFn: () => base44.entities.VehicleType.list() });
  const { data: fleetVehicles = [] }= useQuery({ queryKey: ["fleetVehicles"],queryFn: () => base44.entities.FleetVehicle.list() });
  const { data: stations = [] }     = useQuery({ queryKey: ["stations"],     queryFn: () => base44.entities.Station.list() });
  const { data: allLoads = [] }     = useQuery({ queryKey: ["loads_all"],    queryFn: () => base44.entities.Load.list() });
  const { data: allUsers = [] }     = useQuery({ queryKey: ["users_all"],    queryFn: () => base44.entities.User.list() });

  // ── State: new load form (used when NOT in addBiltyMode) ─────────────────
  const [form, setForm] = useState({
    loading_date:      new Date().toISOString().slice(0, 10),
    client_id: "",     client_name: "",
    vehicle_type: "",  reefer_temperature: "",
    weight_tons: "",
    origin: "",
    destinations:      [""],
    freight_amount: "",
    broker_id: "",     broker_name: "",
    is_own_fleet:      false, fleet_vehicle_id: "",
    vehicle_id: "",    vehicle_number: "",
    payment_type:      "topay",
    notes: "",
    // Bilty fields (also collected for new loads)
    receiver_name: "", cargo_type: "", cargo_description: "",
    quantity: "", delivery_date: "",
    dn_number: "", cn_number: "", seal_number: "",
    seal_image_url: "", loading_images: [],
    labor_status: "pending", loading_status: "pending",
  });

  // ── State: bilty-only form (used ONLY in addBiltyMode) ───────────────────
  // This is entirely separate from `form` to avoid inheriting parent load data
  const [bilty, setBilty] = useState({ ...emptyBilty });

  const [showPrint,        setShowPrint]        = useState(false);
  const [uploadingSeal,    setUploadingSeal]    = useState(false);
  const [uploadingLoading, setUploadingLoading] = useState(false);
  const [origVehicleNo,    setOrigVehicleNo]    = useState("");
  const [origBrokerName,   setOrigBrokerName]   = useState("");

  // Load existing record for edit mode
  useEffect(() => {
    if (editId && allLoads.length > 0) {
      const record = allLoads.find(l => l.id === editId);
      if (record) {
        setForm({
          loading_date:      record.loading_date || new Date().toISOString().slice(0, 10),
          client_id:         record.client_id || "",
          client_name:       record.client_name || "",
          vehicle_type:      record.vehicle_type || "",
          reefer_temperature:record.reefer_temperature || "",
          weight_tons:       record.weight_tons || "",
          origin:            record.origin || "",
          destinations:      record.destinations?.length > 0 ? record.destinations : [record.destination || ""],
          freight_amount:    record.freight_amount || "",
          broker_id:         record.broker_id || "",
          broker_name:       record.broker_name || "",
          is_own_fleet:      record.is_own_fleet || false,
          fleet_vehicle_id:  record.fleet_vehicle_id || "",
          vehicle_id:        record.vehicle_id || "",
          vehicle_number:    record.vehicle_number || "",
          payment_type:      record.payment_type || "topay",
          notes:             record.notes || "",
          receiver_name:     record.receiver_name || "",
          cargo_type:        record.cargo_type || "",
          cargo_description: record.cargo_description || "",
          quantity:          record.quantity || "",
          delivery_date:     record.delivery_date || "",
          dn_number:         record.dn_number || "",
          cn_number:         record.cn_number || "",
          seal_number:       record.seal_number || "",
          seal_image_url:    record.seal_image_url || "",
          loading_images:    record.loading_images || [],
          labor_status:      record.labor_status || "pending",
          loading_status:    record.loading_status || "pending",
        });
        setOrigVehicleNo(record.vehicle_number || "");
        setOrigBrokerName(record.broker_name || "");
      }
    }
  }, [editId, allLoads.length]);

  // Pre-fill bilty vehicle/broker from parent load for add-bilty mode
  useEffect(() => {
    if (addBiltyMode && allLoads.length > 0) {
      const parent = allLoads.find(l => l.id === parentId);
      if (parent) {
        setBilty(prev => ({
          ...prev,
          vehicle_number:   parent.vehicle_number || "",
          vehicle_id:       parent.vehicle_id || "",
          fleet_vehicle_id: parent.fleet_vehicle_id || "",
          broker_id:        parent.broker_id || "",
          broker_name:      parent.broker_name || "",
          is_own_fleet:     parent.is_own_fleet || false,
          cargo_type:       parent.cargo_type || "",
        }));
        setOrigVehicleNo(parent.vehicle_number || "");
        setOrigBrokerName(parent.broker_name || "");
      }
    }
  }, [addBiltyMode, parentId, allLoads.length]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({ confirm }) => {
      const yy = String(new Date().getFullYear()).slice(-2);

      // ── ADD BILTY MODE: save only bilty-specific fields as child record ──
      if (addBiltyMode) {
        if (!bilty.destination?.trim()) throw new Error("Please select a destination for this bilty");

        const biltySeq = allLoads.filter(l => l.load_number?.startsWith(`BL-${yy}-`)).length + 1;
        const biltyNo  = `BL-${yy}-${String(biltySeq).padStart(3, "0")}`;

        const parent = allLoads.find(l => l.id === parentId);

        const biltyRecord = {
          // Link to parent
          parent_load_id:    parentId,
          load_number:       biltyNo,
          // Inherit key fields from parent load
          loading_date:      parent?.loading_date || new Date().toISOString().slice(0, 10),
          client_id:         parent?.client_id || "",
          client_name:       parent?.client_name || "",
          origin:            parent?.origin || "",
          payment_type:      parent?.payment_type || "topay",
          freight_amount:    parent?.freight_amount || 0,
          weight_tons:       parseFloat(bilty.weight_tons || parent?.weight_tons) || 0,
          vehicle_type:      parent?.vehicle_type || "",
          status:            "booked",
          // Bilty-specific fields from bilty state
          destination:       bilty.destination,
          destinations:      [bilty.destination],
          receiver_name:     bilty.receiver_name,
          cargo_type:        bilty.cargo_type,
          cargo_description: bilty.cargo_description,
          quantity:          parseFloat(bilty.quantity) || 0,
          delivery_date:     bilty.delivery_date,
          dn_number:         bilty.dn_number,
          cn_number:         bilty.cn_number,
          seal_number:       bilty.seal_number,
          seal_image_url:    bilty.seal_image_url,
          loading_images:    bilty.loading_images,
          labor_status:      bilty.labor_status,
          loading_status:    bilty.loading_status,
          notes:             bilty.notes,
          // Transport (may differ per bilty)
          vehicle_id:        bilty.vehicle_id,
          vehicle_number:    bilty.vehicle_number,
          fleet_vehicle_id:  bilty.fleet_vehicle_id,
          broker_id:         bilty.broker_id,
          broker_name:       bilty.broker_name,
          is_own_fleet:      bilty.is_own_fleet,
        };

        return await base44.entities.Load.create(biltyRecord);
      }

      // ── EDIT MODE ─────────────────────────────────────────────────────────
      if (editId) {
        const destinations = form.destinations.filter(d => d.trim());
        return await base44.entities.Load.update(editId, {
          ...form,
          destination:        destinations[0] || "",
          destinations,
          weight_tons:        parseFloat(form.weight_tons) || 0,
          freight_amount:     parseFloat(form.freight_amount) || 0,
          approved_rate:      parseFloat(form.freight_amount) || 0,
          quantity:           parseFloat(form.quantity) || 0,
          reefer_temperature: form.reefer_temperature !== "" && form.reefer_temperature != null ? parseFloat(form.reefer_temperature) || null : null,
          is_confirmed:       confirm,
          confirmed_at:       confirm ? new Date().toISOString() : null,
        });
      }

      // ── NEW LOAD MODE ─────────────────────────────────────────────────────
      const destinations = form.destinations.filter(d => d.trim());
      const primaryDest  = destinations[0] || "";
      const isReefer     = REEFER_TYPES.some(t => form.vehicle_type?.toLowerCase().includes("reefer"));

      const loadSeq  = allLoads.filter(l => l.load_id_number?.startsWith(`LD-${yy}-`)).length + 1;
      const biltySeq = allLoads.filter(l => l.load_number?.startsWith(`BL-${yy}-`)).length + 1;

      const data = {
        load_id_number:     `LD-${yy}-${String(loadSeq).padStart(3, "0")}`,
        load_number:        `BL-${yy}-${String(biltySeq).padStart(3, "0")}`,
        loading_date:       form.loading_date,
        client_id:          form.client_id,
        client_name:        form.client_name,
        vehicle_type:       form.vehicle_type,
        reefer_temperature: isReefer && form.reefer_temperature ? parseFloat(form.reefer_temperature) : null,
        weight_tons:        parseFloat(form.weight_tons) || 0,
        origin:             form.origin,
        destination:        primaryDest,
        destinations,
        freight_amount:     parseFloat(form.freight_amount) || 0,
        approved_rate:      parseFloat(form.freight_amount) || 0,
        broker_id:          form.broker_id,
        broker_name:        form.broker_name,
        is_own_fleet:       form.is_own_fleet,
        fleet_vehicle_id:   form.fleet_vehicle_id,
        vehicle_id:         form.vehicle_id,
        vehicle_number:     form.vehicle_number,
        payment_type:       form.payment_type,
        notes:              form.notes,
        status:             "booked",
        is_confirmed:       confirm,
        confirmed_at:       confirm ? new Date().toISOString() : null,
        // Bilty fields
        receiver_name:      form.receiver_name,
        cargo_type:         form.cargo_type,
        cargo_description:  form.cargo_description,
        quantity:           parseFloat(form.quantity) || 0,
        delivery_date:      form.delivery_date,
        dn_number:          form.dn_number,
        cn_number:          form.cn_number,
        seal_number:        form.seal_number,
        seal_image_url:     form.seal_image_url,
        loading_images:     form.loading_images,
        labor_status:       form.labor_status,
        loading_status:     form.loading_status,
      };

      // Auto-save manually typed origin/destinations to stations list
      const allStationNames = stations.map(s => s.name?.toLowerCase());
      if (data.origin?.trim() && !allStationNames.includes(data.origin.toLowerCase())) {
        base44.entities.Station.create({ name: data.origin.trim(), type: "both", is_active: true }).catch(() => {});
      }
      for (const dest of destinations) {
        if (dest?.trim() && !allStationNames.includes(dest.toLowerCase())) {
          base44.entities.Station.create({ name: dest.trim(), type: "both", is_active: true }).catch(() => {});
        }
      }

      const load = await base44.entities.Load.create(data);

      // Auto-create fleet trip
      if (data.is_own_fleet && data.fleet_vehicle_id) {
        const fv = fleetVehicles.find(v => v.id === data.fleet_vehicle_id);
        await base44.entities.FleetTrip.create({
          fleet_vehicle_id:   data.fleet_vehicle_id,
          vehicle_number:     data.vehicle_number || fv?.vehicle_number || "",
          driver_name:        fv?.driver_name || "",
          trip_date:          data.loading_date,
          month:              data.loading_date.substring(0, 7),
          origin:             data.origin,
          destination:        primaryDest,
          route:              `${data.origin} → ${primaryDest}`,
          client_name:        data.client_name,
          cargo_type:         data.cargo_type,
          load_id:            load.id,
          load_number:        data.load_number,
          freight_income_pkr: 0,
          status:             "pending",
          pnl_status:         "pending",
        }).catch(() => {});
        toast.info("Fleet trip auto-created.");
      }

      // Notify on confirm
      if (confirm) {
        const notifyUsers = allUsers.filter(u =>
          ["admin","management","operations","supervisor","accounting","fleet_manager"].includes(u.role)
        );
        await Promise.all(notifyUsers.map(u =>
          base44.entities.AppNotification.create({
            title:             "✅ Load Confirmed",
            message:           `Load ${data.load_id_number} (${form.client_name}) ${form.origin} → ${destinations.join(", ")} confirmed. Bilty: ${data.load_number}`,
            type:              "load_assigned",
            priority:          "high",
            target_user_email: u.email,
            reference_id:      load.id,
            reference_type:    "load",
          }).catch(() => {})
        ));
        toast.success("Load confirmed & all departments notified!");
      } else {
        toast.success("Load saved as draft");
      }

      return load;
    },
    onSuccess: (load) => {
      queryClient.invalidateQueries({ queryKey: ["loads"] });
      queryClient.invalidateQueries({ queryKey: ["loads_all"] });
      if (addBiltyMode) toast.success("Bilty added successfully!");
      window.location.href = createPageUrl(`LoadDetail?id=${addBiltyMode ? parentId : load.id}`);
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });
  // ─── END HOOKS ────────────────────────────────────────────────────────────

  if (roleLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
    </div>
  );

  const canAccess = isAdmin || isManagement || isOperations || isSupervisor;
  if (!canAccess) return <AccessDenied />;

  const canSeeRates      = isAdmin || isManagement || isAccounting;
  const canEditProtected = isAdmin || isManagement;
  const vehicleLocked    = !canEditProtected && !!origVehicleNo && addBiltyMode;
  const brokerLocked     = !canEditProtected && !!origBrokerName && addBiltyMode;
  const isReefer         = REEFER_TYPES.some(t => form.vehicle_type?.toLowerCase().includes("reefer"));

  const { cities = [] } = settings;
  const allVehicleTypes = vehicleTypes.length > 0
    ? vehicleTypes.filter(t => t.is_active !== false).map(t => t.name)
    : DEFAULT_VEHICLE_TYPES;
  const stationNames = [...new Set([
    ...stations.filter(s => s.is_active !== false).map(s => s.name),
    ...cities,
  ])];

  const parentLoad      = addBiltyMode ? allLoads.find(l => l.id === parentId) : null;
  const existingBilties = allLoads.filter(l => l.parent_load_id === parentId);

  // Form handlers
  const handleChange = (field, value) => {
    const updates = { [field]: value };
    if (field === "client_id")       { const c = clients.find(c => c.id === value); if (c) updates.client_name = c.name; }
    if (field === "broker_id")       { const b = brokers.find(b => b.id === value); if (b) updates.broker_name = b.name; }
    if (field === "vehicle_id")      { const v = vehicles.find(v => v.id === value); if (v) { updates.vehicle_number = v.vehicle_number; if (!form.vehicle_type) updates.vehicle_type = v.vehicle_type || ""; } }
    if (field === "fleet_vehicle_id"){ const v = fleetVehicles.find(v => v.id === value); if (v) { updates.vehicle_number = v.vehicle_number; if (!form.vehicle_type) updates.vehicle_type = v.vehicle_type || ""; } }
    if (field === "is_own_fleet" && value) { updates.broker_name = "Own Fleet"; updates.broker_id = ""; }
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleBiltyChange = (field, value) => {
    const updates = { [field]: value };
    if (field === "broker_id")       { const b = brokers.find(b => b.id === value); if (b) updates.broker_name = b.name; }
    if (field === "vehicle_id")      { const v = vehicles.find(v => v.id === value); if (v) updates.vehicle_number = v.vehicle_number; }
    if (field === "fleet_vehicle_id"){ const v = fleetVehicles.find(v => v.id === value); if (v) updates.vehicle_number = v.vehicle_number; }
    if (field === "is_own_fleet" && value) { updates.broker_name = "Own Fleet"; updates.broker_id = ""; }
    setBilty(prev => ({ ...prev, ...updates }));
  };

  const handleDestChange = (i, val) => {
    const d = [...form.destinations]; d[i] = val;
    setForm(p => ({ ...p, destinations: d }));
  };

  const handleSealUpload = async (e, isBiltyMode) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadingSeal(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (isBiltyMode) setBilty(prev => ({ ...prev, seal_image_url: file_url }));
    else setForm(prev => ({ ...prev, seal_image_url: file_url }));
    setUploadingSeal(false);
    toast.success("Seal image uploaded");
  };

  const handleLoadingImageUpload = async (e, isBiltyMode) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    setUploadingLoading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    if (isBiltyMode) setBilty(prev => ({ ...prev, loading_images: [...(prev.loading_images || []), ...urls] }));
    else setForm(prev => ({ ...prev, loading_images: [...(prev.loading_images || []), ...urls] }));
    setUploadingLoading(false);
    toast.success(`${urls.length} image(s) uploaded`);
  };

  const yy            = String(new Date().getFullYear()).slice(-2);
  const previewLoadId = `LD-${yy}-${String(allLoads.filter(l => l.load_id_number?.startsWith(`LD-${yy}-`)).length + 1).padStart(3, "0")}`;
  const previewBiltyN = `BL-${yy}-${String(allLoads.filter(l => l.load_number?.startsWith(`BL-${yy}-`)).length + 1).padStart(3, "0")}`;
  const docName       = settings.docName        || "Bilty";

  const title = editId ? `Edit ${docName}` : addBiltyMode ? `Add ${docName}` : `New Load & ${docName}`;

  // ── RENDER: ADD-BILTY MODE ────────────────────────────────────────────────
  if (addBiltyMode) {
    return (
      <div className="pb-24">
        <MobileHeader title={title} backTo="Loads" />
        <div className="px-4 py-4 space-y-4">

          {/* Linked load banner */}
          {parentLoad && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-blue-500 font-bold uppercase">Linked Load</p>
                <span className="text-[10px] bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                  {existingBilties.length} bilti{existingBilties.length !== 1 ? "es" : ""} so far
                </span>
              </div>
              <p className="text-sm font-bold text-blue-900">{parentLoad.load_id_number} · {parentLoad.client_name}</p>
              <p className="text-xs text-blue-600 mt-0.5">{parentLoad.origin} → {(parentLoad.destinations || [parentLoad.destination]).join(", ")}</p>
              <p className="text-xs text-blue-400 mt-1">New bilty no.: <span className="font-bold">{previewBiltyN}</span></p>
            </div>
          )}

          {/* Destination */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Bilty Destination *</h3>
            <div className="space-y-1.5">
              <Select value={stationNames.includes(bilty.destination) ? bilty.destination : ""} onValueChange={v => handleBiltyChange("destination", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select destination for this bilty" /></SelectTrigger>
                <SelectContent>
                  {(parentLoad?.destinations || [parentLoad?.destination]).filter(Boolean).map(d => (
                    <SelectItem key={d} value={d}>{d} ★</SelectItem>
                  ))}
                  {stationNames.filter(n => !(parentLoad?.destinations || []).includes(n)).map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={bilty.destination} onChange={e => handleBiltyChange("destination", e.target.value)}
                className="rounded-xl mt-1.5" placeholder="Or type destination" />
            </div>
          </div>

          {/* Cargo details */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Cargo Details</h3>
            <div className="space-y-1.5">
              <Label>Receiver's Name</Label>
              <Input value={bilty.receiver_name} onChange={e => handleBiltyChange("receiver_name", e.target.value)} className="rounded-xl" placeholder="Consignee" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cargo Type</Label>
                <Input value={bilty.cargo_type} onChange={e => handleBiltyChange("cargo_type", e.target.value)} className="rounded-xl" placeholder="e.g. Sugar" />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity (pkgs)</Label>
                <Input type="number" value={bilty.quantity} onChange={e => handleBiltyChange("quantity", e.target.value)} className="rounded-xl" placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={bilty.cargo_description} onChange={e => handleBiltyChange("cargo_description", e.target.value)} className="rounded-xl" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>DN Number</Label>
                <Input value={bilty.dn_number} onChange={e => handleBiltyChange("dn_number", e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>CN Number</Label>
                <Input value={bilty.cn_number} onChange={e => handleBiltyChange("cn_number", e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Date</Label>
              <Input type="date" value={bilty.delivery_date} onChange={e => handleBiltyChange("delivery_date", e.target.value)} className="rounded-xl" />
            </div>
          </div>

          {/* Transport (may differ per bilty, locked for supervisors if already set) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Transport</h3>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Vehicle Number</Label>
                {vehicleLocked && <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Admin only</span>}
              </div>
              {vehicleLocked ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700">{bilty.vehicle_number}</div>
              ) : (
                <div className="space-y-1.5">
                  <Select value={bilty.vehicle_id || "none"} onValueChange={v => handleBiltyChange("vehicle_id", v === "none" ? "" : v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not assigned</SelectItem>
                      {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicle_number} – {v.driver_name || v.vehicle_type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={bilty.vehicle_number} onChange={e => handleBiltyChange("vehicle_number", e.target.value)}
                    className="rounded-xl" placeholder="Or type vehicle number" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Broker</Label>
                {brokerLocked && <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> Admin only</span>}
              </div>
              {brokerLocked ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700">{bilty.broker_name}</div>
              ) : (
                <Select value={bilty.broker_id || "none"} onValueChange={v => handleBiltyChange("broker_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select broker" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No broker</SelectItem>
                    {brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Loading Details */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Loading Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Seal Number</Label>
                <Input value={bilty.seal_number} onChange={e => handleBiltyChange("seal_number", e.target.value)} className="rounded-xl" placeholder="SL-1234" />
              </div>
              <div className="space-y-1.5">
                <Label>Seal Photo</Label>
                <label className={`flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:border-orange-400 ${uploadingSeal ? "opacity-50" : ""}`}>
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500">{uploadingSeal ? "Uploading..." : bilty.seal_image_url ? "✅ Done" : "Upload"}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleSealUpload(e, true)} />
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Loading Images</Label>
              <label className={`flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-orange-400 ${uploadingLoading ? "opacity-50" : ""}`}>
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">{uploadingLoading ? "Uploading..." : `Upload Photos (${(bilty.loading_images || []).length} uploaded)`}</span>
                <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleLoadingImageUpload(e, true)} />
              </label>
              {(bilty.loading_images || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {bilty.loading_images.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`Loading ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                      <button type="button"
                        onClick={() => setBilty(prev => ({ ...prev, loading_images: prev.loading_images.filter((_, idx) => idx !== i) }))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={bilty.notes} onChange={e => handleBiltyChange("notes", e.target.value)} className="rounded-xl" rows={2} />
          </div>

          <Button type="button"
            onClick={() => saveMutation.mutate({ confirm: false })}
            disabled={saveMutation.isPending || !bilty.destination?.trim()}
            className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 h-12 text-base font-bold">
            {saveMutation.isPending ? "Saving..." : `Save ${docName}`}
          </Button>
        </div>
      </div>
    );
  }

  // ── RENDER: NEW LOAD / EDIT MODE ─────────────────────────────────────────
  return (
    <div className="pb-24">
      {showPrint && <BiltyPrint load={{ ...form, load_number: previewBiltyN, load_id_number: previewLoadId }} onClose={() => setShowPrint(false)} />}

      <MobileHeader
        title={title}
        backTo="Loads"
        rightAction={
          <button type="button" onClick={() => setShowPrint(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors">
            <FileText className="w-3.5 h-3.5" /> Preview
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">

        {/* Numbers preview */}
        {!editId && allLoads.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex gap-4">
            <div><p className="text-[10px] text-blue-500 font-semibold">LOAD ID</p><p className="text-sm font-bold text-blue-800">{previewLoadId}</p></div>
            <div className="border-l border-blue-200 pl-4"><p className="text-[10px] text-blue-500 font-semibold">BILTY NO.</p><p className="text-sm font-bold text-blue-800">{previewBiltyN}</p></div>
          </div>
        )}

        {/* Load Information */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Load Information</h3>
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
          <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.loading_date} onChange={e => handleChange("loading_date", e.target.value)} className="rounded-xl" required /></div>
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={form.client_id || ""} onValueChange={v => handleChange("client_id", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Vehicle & Cargo */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Vehicle & Cargo</h3>
          <div className="space-y-1.5">
            <Label>Type of Vehicle *</Label>
            <Select value={form.vehicle_type || ""} onValueChange={v => handleChange("vehicle_type", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
              <SelectContent>{allVehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {isReefer && (
            <div className="space-y-1.5 bg-blue-50 rounded-xl p-3">
              <Label className="flex items-center gap-1.5 text-blue-700"><Thermometer className="w-4 h-4" /> Required Temperature (°C)</Label>
              <Input type="number" value={form.reefer_temperature} onChange={e => handleChange("reefer_temperature", e.target.value)} className="rounded-xl border-blue-200 bg-white" placeholder="e.g. -18" />
            </div>
          )}
          <div className="space-y-1.5"><Label>Weight (Tons)</Label><Input type="number" step="0.5" value={form.weight_tons} onChange={e => handleChange("weight_tons", e.target.value)} className="rounded-xl" placeholder="0.0" /></div>
        </div>

        {/* Route */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Route</h3>
          <div className="space-y-1.5">
            <Label>Loading Point / Origin *</Label>
            <Select value={stationNames.includes(form.origin) ? form.origin : ""} onValueChange={v => handleChange("origin", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select origin" /></SelectTrigger>
              <SelectContent>{stationNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
            {!stationNames.includes(form.origin) && (
              <Input value={form.origin} onChange={e => handleChange("origin", e.target.value)} className="rounded-xl mt-1.5" placeholder="Or type loading point" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Destination(s) *</Label>
              <button type="button" onClick={() => setForm(p => ({ ...p, destinations: [...p.destinations, ""] }))}
                className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {form.destinations.map((dest, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <Select value={stationNames.includes(dest) ? dest : ""} onValueChange={v => handleDestChange(i, v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder={`Destination ${i + 1}`} /></SelectTrigger>
                    <SelectContent>{stationNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                  {(!stationNames.includes(dest) || !dest) && (
                    <Input value={dest} onChange={e => handleDestChange(i, e.target.value)} className="rounded-xl" placeholder="Or type destination" />
                  )}
                </div>
                {form.destinations.length > 1 && (
                  <button type="button" onClick={() => setForm(p => ({ ...p, destinations: p.destinations.filter((_, j) => j !== i) }))}
                    className="mt-2 p-1.5 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Approved Rate */}
        {canSeeRates && (
          <div className="bg-white rounded-2xl p-4 border border-amber-100 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Approved Rate</h3>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Accounts Only</span>
            </div>
            <Input type="number" value={form.freight_amount} onChange={e => { handleChange("freight_amount", e.target.value); handleChange("approved_rate", e.target.value); }}
              className="rounded-xl border-amber-200 bg-amber-50 font-bold" placeholder="0" />
          </div>
        )}

        {/* Transport */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Transport</h3>
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3">
            <input type="checkbox" id="ownFleet" checked={form.is_own_fleet || false}
              onChange={e => handleChange("is_own_fleet", e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="ownFleet" className="text-sm font-medium text-blue-800 cursor-pointer">Own Fleet Vehicle</label>
          </div>
          {form.is_own_fleet ? (
            <div className="space-y-1.5">
              <Label>Select Fleet Vehicle</Label>
              <Select value={form.fleet_vehicle_id || "none"} onValueChange={v => handleChange("fleet_vehicle_id", v === "none" ? "" : v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select fleet vehicle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned yet</SelectItem>
                  {fleetVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicle_number} – {v.driver_name || v.vehicle_type || ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Broker</Label>
                <Select value={form.broker_id || "none"} onValueChange={v => handleChange("broker_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select broker" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No broker</SelectItem>
                    {brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle Number</Label>
                <Select value={form.vehicle_id || "none"} onValueChange={v => handleChange("vehicle_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned yet</SelectItem>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicle_number} – {v.driver_name || v.vehicle_type}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={form.vehicle_number} onChange={e => handleChange("vehicle_number", e.target.value)} className="rounded-xl mt-1.5" placeholder="Or type vehicle number" />
              </div>
            </div>
          )}
        </div>

        {/* Bilty Details */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">{docName} Details</h3>
          <div className="space-y-1.5"><Label>Receiver's Name</Label><Input value={form.receiver_name} onChange={e => handleChange("receiver_name", e.target.value)} className="rounded-xl" placeholder="Consignee" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Cargo Type</Label><Input value={form.cargo_type} onChange={e => handleChange("cargo_type", e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => handleChange("quantity", e.target.value)} className="rounded-xl" /></div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.cargo_description} onChange={e => handleChange("cargo_description", e.target.value)} className="rounded-xl" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>DN Number</Label><Input value={form.dn_number} onChange={e => handleChange("dn_number", e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-1.5"><Label>CN Number</Label><Input value={form.cn_number} onChange={e => handleChange("cn_number", e.target.value)} className="rounded-xl" /></div>
          </div>
          <div className="space-y-1.5"><Label>Delivery Date</Label><Input type="date" value={form.delivery_date} onChange={e => handleChange("delivery_date", e.target.value)} className="rounded-xl" /></div>
        </div>

        {/* Loading Details */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Loading Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Seal Number</Label><Input value={form.seal_number} onChange={e => handleChange("seal_number", e.target.value)} className="rounded-xl" placeholder="SL-1234" /></div>
            <div className="space-y-1.5">
              <Label>Seal Photo</Label>
              <label className={`flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:border-orange-400 ${uploadingSeal ? "opacity-50" : ""}`}>
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">{uploadingSeal ? "Uploading..." : form.seal_image_url ? "✅ Done" : "Upload"}</span>
                <input type="file" className="hidden" accept="image/*" onChange={e => handleSealUpload(e, false)} />
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Loading Images</Label>
            <label className={`flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-orange-400 ${uploadingLoading ? "opacity-50" : ""}`}>
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">{uploadingLoading ? "Uploading..." : `Upload Photos (${(form.loading_images || []).length} uploaded)`}</span>
              <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleLoadingImageUpload(e, false)} />
            </label>
            {(form.loading_images || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.loading_images.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Loading ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    <button type="button"
                      onClick={() => setForm(prev => ({ ...prev, loading_images: prev.loading_images.filter((_, idx) => idx !== i) }))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={e => handleChange("notes", e.target.value)} className="rounded-xl" rows={2} /></div>

        <div className="space-y-3 pt-2">
          <Button type="button"
            onClick={() => saveMutation.mutate({ confirm: true })}
            disabled={saveMutation.isPending || !form.client_name || !form.origin || form.destinations.every(d => !d.trim())}
            className="w-full rounded-xl bg-green-600 hover:bg-green-700 h-14 text-base font-bold gap-2">
            <CheckCircle className="w-5 h-5" />
            {saveMutation.isPending ? "Saving..." : "Confirm Load & Notify All Departments"}
          </Button>
          <Button type="button" variant="outline"
            onClick={() => saveMutation.mutate({ confirm: false })}
            disabled={saveMutation.isPending || !form.client_name || !form.origin}
            className="w-full rounded-xl h-11 text-sm">
            Save as Draft
          </Button>
        </div>
      </div>
    </div>
  );
}