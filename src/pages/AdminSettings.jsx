import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Globe, CheckCircle2, Trash2, RefreshCw, MapPin } from "lucide-react";
import { toast } from "sonner";

const PAKISTAN_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta",
  "Hyderabad", "Sialkot", "Gujranwala", "Sargodha", "Bahawalpur", "Sukkur", "Larkana",
  "Sheikhupura", "Jhang", "Rahim Yar Khan", "Gujrat", "Kasur", "Mardan", "Mingora",
  "Nawabshah", "Mirpur Khas", "Okara", "Sahiwal", "Chiniot", "Kotri", "Turbat", "Abbottabad",
  "Muzaffarabad", "Gilgit", "Hub", "Jacobabad", "Khuzdar", "Dera Ghazi Khan", "Dera Ismail Khan"
];

export default function AdminSettings() {
  const { settings } = useAppSettings();
  const qc = useQueryClient();
  const [cleaning, setCleaning] = useState(false);

  const { data: stations = [], isLoading: stationsLoading } = useQuery({
    queryKey: ["stations_all"],
    queryFn: () => base44.entities.Station.list(),
  });

  const knownStations = stations.filter(s => {
    const name = s.name || "";
    return PAKISTAN_CITIES.some(city => name.toLowerCase().includes(city.toLowerCase()));
  });
  const otherStations = stations.filter(s => {
    const name = s.name || "";
    return !PAKISTAN_CITIES.some(city => name.toLowerCase().includes(city.toLowerCase()));
  });

  const handleCleanStations = async () => {
    if (otherStations.length === 0) { toast.info("No extra stations to remove."); return; }
    if (!window.confirm(`This will delete ${otherStations.length} unrecognised stations. This cannot be undone. Continue?`)) return;

    setCleaning(true);
    let deleted = 0;
    let failed = 0;
    for (const s of otherStations) {
      try {
        await base44.entities.Station.delete(s.id);
        deleted++;
      } catch {
        failed++;
      }
    }
    qc.invalidateQueries(["stations_all"]);
    qc.invalidateQueries(["stations"]);
    setCleaning(false);
    if (failed === 0) toast.success(`✅ Deleted ${deleted} stations`);
    else toast.warning(`Deleted ${deleted}, failed ${failed}`);
  };

  return (
    <div className="pb-24">
      <MobileHeader title="App Settings" backTo="AdminPanel" />

      <div className="px-4 py-4 space-y-4">

        {/* Active Module */}
        <div className="bg-white rounded-2xl border-2 border-blue-600 bg-blue-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Regional Settings</h2>
            </div>
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-slate-500 mt-1">Country and currency are configured per company profile. Go to App Settings → Companies to update.</p>
        </div>

        {/* Stations Cleanup */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Stations / Cities Cleanup</h2>
          </div>
          <p className="text-xs text-slate-500">
            Remove unrecognised stations from the list. Only known cities will be kept.
          </p>

          {stationsLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading stations...
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total stations</span>
                <span className="font-bold text-slate-800">{stations.length}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Known stations</span>
                <span className="font-bold">{knownStations.length}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Unrecognised (will be deleted)</span>
                <span className="font-bold">{otherStations.length}</span>
              </div>
            </div>
          )}

          {otherStations.length > 0 && (
            <button
              onClick={handleCleanStations}
              disabled={cleaning}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {cleaning
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Deleting...</>
                : <><Trash2 className="w-4 h-4" /> Delete {otherStations.length} Unrecognised Stations</>
              }
            </button>
          )}

          {!stationsLoading && otherStations.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> All stations are clean ✓
            </div>
          )}
        </div>

      </div>
    </div>
  );
}