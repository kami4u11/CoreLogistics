import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin, Truck, Navigation, RefreshCw, Edit2, Check, X,
  Fuel, Clock, AlertTriangle, ArrowRight, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
 
const FUEL_COLORS = { full: "bg-green-500", "3/4": "bg-green-400", half: "bg-yellow-400", "1/4": "bg-orange-400", low: "bg-red-500" };
const STATUS_COLORS = {
  "In Transit": "bg-blue-100 text-blue-700",
  "Loaded": "bg-purple-100 text-purple-700",
  "Delivered": "bg-green-100 text-green-700",
  "Parked": "bg-slate-100 text-slate-600",
  "Maintenance": "bg-red-100 text-red-700",
};
 
function VehicleCard({ loc, vehicles, trips, onEdit, isAdmin, isFleetManager }) {
  const [expanded, setExpanded] = useState(false);
  const vehicle = vehicles.find(v => v.vehicle_number === loc.vehicle_number);
  const activeTrip = trips.find(t => t.id === loc.trip_id && t.status === "pending");
  const statusColor = STATUS_COLORS[loc.status_note] || "bg-slate-100 text-slate-600";
  const lastUpdated = loc.last_updated ? format(new Date(loc.last_updated), "dd MMM, hh:mm a") : "—";
 
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg">🚛</div>
            <div>
              <p className="text-sm font-bold text-slate-900">{loc.vehicle_number}</p>
              <p className="text-xs text-slate-500">{loc.driver_name || vehicle?.driver_name || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loc.status_note && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColor}`}>{loc.status_note}</span>
            )}
            {(isAdmin || isFleetManager) && (
              <button onClick={() => onEdit(loc)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>
 
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">Location</p>
              <p className="text-xs font-semibold text-slate-700 truncate">{loc.city || "Unknown"}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">Last Update</p>
              <p className="text-xs font-semibold text-slate-700">{lastUpdated}</p>
            </div>
          </div>
        </div>
 
        {loc.fuel_level && (
          <div className="mt-2 flex items-center gap-2">
            <Fuel className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs text-slate-500">Fuel:</p>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${FUEL_COLORS[loc.fuel_level] || "bg-slate-300"}`}
                style={{ width: { full: "100%", "3/4": "75%", half: "50%", "1/4": "25%", low: "10%" }[loc.fuel_level] || "0%" }} />
            </div>
            <p className="text-[10px] font-semibold text-slate-600">{loc.fuel_level}</p>
          </div>
        )}
 
        {(activeTrip || loc.trip_origin) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 w-full flex items-center justify-between text-xs text-blue-600 font-medium bg-blue-50 rounded-xl px-3 py-2"
          >
            <span>Trip Details</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
 
      {expanded && (
        <div className="border-t border-slate-50 bg-blue-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-700">{loc.trip_origin || activeTrip?.origin || "—"}</p>
            <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-slate-700">{loc.trip_destination || activeTrip?.destination || "—"}</p>
          </div>
          {activeTrip && <p className="text-[10px] text-slate-400 mt-1">Trip date: {activeTrip.trip_date}</p>}
          {loc.odometer_km > 0 && <p className="text-[10px] text-slate-400">Odometer: {loc.odometer_km.toLocaleString()} km</p>}
          {loc.status_note === "low" && (
            <div className="flex items-center gap-1.5 mt-2 text-red-600">
              <AlertTriangle className="w-3 h-3" />
              <p className="text-[10px] font-bold">Low fuel — refuel soon</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
 
function UpdateForm({ loc, vehicles, trips, onClose, onSave }) {
  const [form, setForm] = useState({
    city: loc?.city || "",
    status_note: loc?.status_note || "In Transit",
    fuel_level: loc?.fuel_level || "half",
    trip_id: loc?.trip_id || "",
    trip_origin: loc?.trip_origin || "",
    trip_destination: loc?.trip_destination || "",
    odometer_km: loc?.odometer_km || 0,
    driver_name: loc?.driver_name || "",
  });
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));
 
  const handleSave = () => {
    onSave({ ...form, last_updated: new Date().toISOString() });
    onClose();
  };
 
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="bg-white w-full max-h-[85vh] rounded-t-3xl overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-900">{loc ? `Update: ${loc.vehicle_number}` : "Add Location"}</p>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-4 space-y-4">
          {!loc && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Vehicle *</p>
              <Select value={form.vehicle_number} onValueChange={f("vehicle_number")}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.vehicle_number}>{v.vehicle_number} — {v.driver_name || "No driver"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Current City / Location</p>
            <Input value={form.city} onChange={e => f("city")(e.target.value)} placeholder="e.g. Lahore" className="rounded-xl" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Status</p>
            <Select value={form.status_note} onValueChange={f("status_note")}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["In Transit", "Loaded", "Delivered", "Parked", "Maintenance"].map(s =>
                  <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Fuel Level</p>
            <Select value={form.fuel_level} onValueChange={f("fuel_level")}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["full", "3/4", "half", "1/4", "low"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Trip From</p>
              <Input value={form.trip_origin} onChange={e => f("trip_origin")(e.target.value)} placeholder="Origin" className="rounded-xl" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Trip To</p>
              <Input value={form.trip_destination} onChange={e => f("trip_destination")(e.target.value)} placeholder="Destination" className="rounded-xl" />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Odometer (km)</p>
            <Input type="number" value={form.odometer_km} onChange={e => f("odometer_km")(Number(e.target.value))} className="rounded-xl" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Driver Name</p>
            <Input value={form.driver_name} onChange={e => f("driver_name")(e.target.value)} placeholder="Driver" className="rounded-xl" />
          </div>
          <div className="flex gap-3 pt-2 pb-4">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 rounded-xl bg-slate-900"><Check className="w-4 h-4 mr-1" /> Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default function GPSTracking() {
  // ─── ALL HOOKS BEFORE ANY EARLY RETURN ───────────────────────────────────
  const { isAdmin, isFleetManager, isDriver, user } = useRole();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
 
  const { data: locations = [], isLoading, refetch } = useQuery({
    queryKey: ["vehicleLocations"],
    queryFn: () => base44.entities.VehicleLocation.list("-last_updated"),
    refetchInterval: 60000,
  });
 
  const { data: vehicles = [] } = useQuery({
    queryKey: ["fleet"],
    queryFn: () => base44.entities.FleetVehicle.list(),
  });
 
  const { data: trips = [] } = useQuery({
    queryKey: ["fleetTrips"],
    queryFn: () => base44.entities.FleetTrip.list("-trip_date", 100),
  });
 
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VehicleLocation.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicleLocations"] }); toast.success("Location added"); },
  });
 
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VehicleLocation.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicleLocations"] }); toast.success("Location updated"); },
  });
  // ─── END HOOKS ────────────────────────────────────────────────────────────
 
  if (!isAdmin && !isFleetManager && !isDriver) return <AccessDenied />;
 
  const handleSave = (formData) => {
    if (editing?.id) updateMutation.mutate({ id: editing.id, data: formData });
    else createMutation.mutate(formData);
    setEditing(null);
    setShowForm(false);
  };
 
  const handleEdit = (loc) => { setEditing(loc); setShowForm(true); };
  const handleAdd = () => { setEditing(null); setShowForm(true); };
 
  // Drivers see only their vehicle
  const displayLocations = isDriver
    ? locations.filter(l => l.vehicle_number === user?.assigned_vehicle_number || l.driver_name === user?.full_name)
    : locations;
 
  const filtered = displayLocations.filter(l => {
    const matchFilter = filter === "all" || l.status_note?.toLowerCase() === filter;
    const matchSearch = !search || l.vehicle_number?.toLowerCase().includes(search.toLowerCase()) || l.city?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
 
  const statusCounts = {
    transit: displayLocations.filter(l => l.status_note === "In Transit").length,
    parked: displayLocations.filter(l => l.status_note === "Parked").length,
    alert: displayLocations.filter(l => l.fuel_level === "low" || l.status_note === "Maintenance").length,
  };
 
  return (
    <div className="pb-28">
      <MobileHeader
        title="GPS Tracking"
        backTo="Fleet"
        rightAction={
          (isAdmin || isFleetManager) && (
            <button onClick={handleAdd} className="bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold">
              + Update
            </button>
          )
        }
      />
 
      <div className="px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-blue-700">{displayLocations.length}</p>
            <p className="text-[10px] text-blue-500 font-medium">Tracked</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-emerald-700">{statusCounts.transit}</p>
            <p className="text-[10px] text-emerald-500 font-medium">In Transit</p>
          </div>
          <div className={`rounded-2xl p-3 text-center ${statusCounts.alert > 0 ? "bg-red-50" : "bg-slate-50"}`}>
            <p className={`text-xl font-black ${statusCounts.alert > 0 ? "text-red-600" : "text-slate-400"}`}>{statusCounts.alert}</p>
            <p className={`text-[10px] font-medium ${statusCounts.alert > 0 ? "text-red-400" : "text-slate-400"}`}>Alerts</p>
          </div>
        </div>
 
        {/* Map placeholder */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-slate-800 rounded-2xl p-4 relative overflow-hidden" style={{ height: 180 }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold text-sm">Live Map View</p>
              <button onClick={() => refetch()} className="flex items-center gap-1 text-white/70 text-xs bg-white/10 rounded-lg px-2 py-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filtered.slice(0, 8).map(loc => (
                <div key={loc.id} className="flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3 py-1.5">
                  <div className={`w-2 h-2 rounded-full ${loc.status_note === "In Transit" ? "bg-blue-400 animate-pulse" : loc.status_note === "Parked" ? "bg-slate-400" : "bg-green-400"}`} />
                  <span className="text-white text-[10px] font-semibold">{loc.vehicle_number}</span>
                  {loc.city && <span className="text-white/60 text-[9px]">· {loc.city}</span>}
                </div>
              ))}
            </div>
            <p className="text-white/40 text-[10px] mt-3">
              ℹ️ For live GPS, integrate a hardware GPS tracker device (Teltonika, Queclink, etc.) and send coordinates via API
            </p>
          </div>
        </div>
 
        {/* Filter & Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicle or city..." className="pl-9 rounded-xl bg-slate-50 border-slate-200 h-9 text-sm" />
          </div>
        </div>
 
        <div className="flex gap-2 overflow-x-auto">
          {["all", "in transit", "parked", "delivered", "maintenance"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all ${filter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
 
        {/* Vehicle Cards */}
        {isLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No locations tracked yet.</p>
            {(isAdmin || isFleetManager) && (
              <button onClick={handleAdd} className="mt-3 text-blue-600 text-sm font-semibold">+ Add first location update</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(loc => (
              <VehicleCard key={loc.id} loc={loc} vehicles={vehicles} trips={trips}
                onEdit={handleEdit} isAdmin={isAdmin} isFleetManager={isFleetManager} />
            ))}
          </div>
        )}
      </div>
 
      {showForm && (
        <UpdateForm
          loc={editing}
          vehicles={vehicles}
          trips={trips}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
 