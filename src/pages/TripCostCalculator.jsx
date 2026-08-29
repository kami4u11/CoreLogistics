import React, { useState, useEffect } from "react";
import MobileHeader from "@/components/ui/MobileHeader";
import { useAppSettings } from "@/components/AppSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Calculator, Settings, RotateCcw, TrendingUp, TrendingDown,
  Fuel, Truck, Wrench, ChevronRight, X, Check, AlertCircle
} from "lucide-react";
// ── Persisted calc settings ──────────────────────────────────────────────────
const SETTINGS_KEY = "calc_settings_v1";
const DEFAULT_SETTINGS = {
  fuelPricePerLiter: 0,
  tollPerKm: 0,
  driverAllowancePerDay: 0,
  helperAllowancePerDay: 0,
  vehicleAvgKmPerLiter: 4,
  miscPerDay: 0,
};
function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; }
  catch { return DEFAULT_SETTINGS; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

// ── Small helpers ────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, suffix, hint }) => (
  <div className="space-y-0.5">
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs text-slate-600 flex-1 leading-tight">{label}</label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value || ""}
          onChange={e => onChange(Number(e.target.value) || 0)}
          placeholder="0"
          className="h-9 text-sm text-right w-32"
        />
        {suffix && <span className="text-xs text-slate-400 w-10 text-left">{suffix}</span>}
      </div>
    </div>
    {hint && <p className="text-[10px] text-slate-400 pl-1">{hint}</p>}
  </div>
);

const MetricCard = ({ label, value, bg, text }) => (
  <div className={`rounded-2xl px-4 py-4 text-center ${bg}`}>
    <p className={`text-[11px] font-medium mb-1 ${text} opacity-70`}>{label}</p>
    <p className={`text-lg font-extrabold ${text}`}>{value}</p>
  </div>
);

// ── Settings Sheet ───────────────────────────────────────────────────────────
function CalcSettingsSheet({ open, onClose, settings: cs, onChange }) {
  const [local, setLocal] = useState({ ...cs });
  const { settings } = useAppSettings();
  const f = (key) => (val) => setLocal(p => ({ ...p, [key]: val }));

  const handleSave = () => { onChange(local); saveSettings(local); onClose(); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 bg-white sticky top-0">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-bold text-slate-900">Calculator Settings</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-32">
        <div className="bg-blue-50 rounded-2xl p-3 flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 leading-relaxed">These defaults are the backbone of all calculations. Trip costs will be auto-derived from these rates. You can still override per-trip.</p>
        </div>

        {/* Fuel */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 text-orange-700">
            <Fuel className="w-4 h-4" />
            <p className="text-sm font-bold">Fuel Settings</p>
          </div>
          <div className="px-4 py-4 space-y-4">
            <Field label={`Fuel Price per Liter (${settings.symbol})`} value={local.fuelPricePerLiter} onChange={f("fuelPricePerLiter")} suffix={settings.symbol} />
            <Field label={`Vehicle Average (${settings.distanceUnit}/Liter)`} value={local.vehicleAvgKmPerLiter} onChange={f("vehicleAvgKmPerLiter")} suffix="km/L" hint="e.g. 4 km/L for a loaded truck" />
          </div>
        </div>

        {/* Toll */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 text-yellow-700">
            <Truck className="w-4 h-4" />
            <p className="text-sm font-bold">Toll Plaza Rate</p>
          </div>
          <div className="px-4 py-4">
            <Field label={`Toll Rate per ${settings.distanceUnit} (${settings.symbol})`} value={local.tollPerKm} onChange={f("tollPerKm")} suffix={`/${settings.distanceUnit}`} hint="e.g. 2.5 per km on motorway" />
          </div>
        </div>

        {/* Allowances */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 text-purple-700">
            <Calculator className="w-4 h-4" />
            <p className="text-sm font-bold">Daily Allowances</p>
          </div>
          <div className="px-4 py-4 space-y-4">
            <Field label={`Driver Allowance per Day (${settings.symbol})`} value={local.driverAllowancePerDay} onChange={f("driverAllowancePerDay")} suffix="/day" />
            <Field label={`Helper Allowance per Day (${settings.symbol})`} value={local.helperAllowancePerDay} onChange={f("helperAllowancePerDay")} suffix="/day" />
          </div>
        </div>

        {/* Misc */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700">
            <Wrench className="w-4 h-4" />
            <p className="text-sm font-bold">Route Misc per Day</p>
          </div>
          <div className="px-4 py-4">
            <Field label={`Misc per Day (${settings.symbol})`} value={local.miscPerDay} onChange={f("miscPerDay")} suffix="/day" hint="Maintenance, police, commissions, etc." />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-slate-100">
        <Button onClick={handleSave} className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 h-12 text-base font-bold">
          <Check className="w-4 h-4 mr-2" /> Save Settings
        </Button>
      </div>
    </div>
  );
}

// ── Main Calculator ──────────────────────────────────────────────────────────
export default function TripCostCalculator() {
  const { fmt, settings } = useAppSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [calcSettings, setCalcSettings] = useState(loadSettings);
  const [pkFuelRate, setPkFuelRate] = useState(null);

  // Fetch latest Diesel rate from FuelRate entity (sorted by effective_date desc)
  const { data: fuelRates = [] } = useQuery({
    queryKey: ["fuel_rates_latest"],
    queryFn: () => base44.entities.FuelRate.list("-effective_date", 20),
  });

  // Pick the most recent Diesel/HSD rate
  useEffect(() => {
    if (fuelRates.length > 0) {
      const dieselRate = fuelRates.find(r => r.fuel_type === "Diesel" || r.fuel_type === "HSD");
      const latestRate = dieselRate || fuelRates[0];
      if (latestRate?.rate_per_litre) {
        setPkFuelRate(latestRate.rate_per_litre);
        // Auto-update calculator if not manually set
        if (!calcSettings.fuelPricePerLiter || calcSettings.fuelPricePerLiter === 0) {
          const updated = { ...calcSettings, fuelPricePerLiter: latestRate.rate_per_litre };
          setCalcSettings(updated);
          saveSettings(updated);
        }
      }
    }
  }, [fuelRates]);

  // Trip inputs
  const [freight, setFreight] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [weightTons, setWeightTons] = useState(0);
  const [tripDays, setTripDays] = useState(0);
  const [commission, setCommission] = useState(0);
  const [loadingLabour, setLoadingLabour] = useState(0);
  const [unloadingLabour, setUnloadingLabour] = useState(0);
  const [tripMisc, setTripMisc] = useState(0);

  // Derived from settings
  const cs = calcSettings;
  const fuelLiters = cs.vehicleAvgKmPerLiter > 0 ? distanceKm / cs.vehicleAvgKmPerLiter : 0;
  const fuelCost = Math.round(fuelLiters * cs.fuelPricePerLiter);
  const tollCost = Math.round(distanceKm * cs.tollPerKm);
  const driverCost = Math.round(tripDays * cs.driverAllowancePerDay);
  const helperCost = Math.round(tripDays * cs.helperAllowancePerDay);
  const miscSettingsCost = Math.round(tripDays * cs.miscPerDay);
  const labour = loadingLabour + unloadingLabour;
  const miscTotal = miscSettingsCost + tripMisc;

  const totalCost = fuelCost + tollCost + driverCost + helperCost + labour + commission + miscTotal;
  const profit = freight - totalCost;
  const isProfit = profit >= 0;
  const margin = freight > 0 ? ((profit / freight) * 100).toFixed(1) : "0.0";
  const costPerKm = distanceKm > 0 ? Math.round(totalCost / distanceKm) : 0;
  const costPerTon = weightTons > 0 ? Math.round(totalCost / weightTons) : 0;

  const handleReset = () => {
    setFreight(0); setDistanceKm(0); setWeightTons(0);
    setTripDays(0); setCommission(0); setLoadingLabour(0);
    setUnloadingLabour(0); setTripMisc(0);
  };

  const settingsConfigured = cs.fuelPricePerLiter > 0 || cs.vehicleAvgKmPerLiter > 0;

  return (
    <div className="pb-28">
      <MobileHeader
        title="Trip Cost Calculator"
        backTo="Dashboard"
        rightAction={
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        }
      />

      <CalcSettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={calcSettings}
        onChange={setCalcSettings}
      />

      <div className="px-4 py-4 space-y-4">

        {/* Fuel Rate from FuelRate manager */}
        {pkFuelRate && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-start gap-2">
            <Fuel className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-700">Current Fuel Rate (from Fuel Rate Manager)</p>
              <p className="text-sm font-bold text-blue-900">{settings.symbol}{pkFuelRate}/Liter</p>
              <p className="text-[10px] text-blue-600 mt-0.5">Auto-synced from latest Diesel/HSD rate. Override in Settings if needed.</p>
            </div>
          </div>
        )}

        {/* Settings hint */}
        {!settingsConfigured && (
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-bold text-amber-700">Configure Calculator Settings</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500" />
          </button>
        )}

        {/* Trip Inputs */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-600">
            <Truck className="w-4 h-4 text-white" />
            <p className="text-sm font-bold text-white">Trip Details</p>
          </div>
          <div className="px-4 py-4 space-y-4">
            <Field label={`Freight / Revenue (${settings.symbol})`} value={freight} onChange={setFreight} suffix={settings.symbol} />
            <Field label={`Distance (${settings.distanceUnit})`} value={distanceKm} onChange={setDistanceKm} suffix={settings.distanceUnit} />
            <Field label="Weight (Tons)" value={weightTons} onChange={setWeightTons} suffix="Tons" />
            <Field
              label="Expected Trip Days"
              value={tripDays}
              onChange={setTripDays}
              suffix="days"
              hint="Used to auto-calculate driver, helper & misc allowances"
            />
          </div>
        </div>

        {/* Variable Costs */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-600">
            <Calculator className="w-4 h-4 text-white" />
            <p className="text-sm font-bold text-white">Additional Costs</p>
          </div>
          <div className="px-4 py-4 space-y-4">
            <Field label={`Commission Payable (${settings.symbol})`} value={commission} onChange={setCommission} suffix={settings.symbol} />
            <Field label={`Loading Labour (${settings.symbol})`} value={loadingLabour} onChange={setLoadingLabour} suffix={settings.symbol} />
            <Field label={`Unloading Labour (${settings.symbol})`} value={unloadingLabour} onChange={setUnloadingLabour} suffix={settings.symbol} />
            <Field label={`Trip Misc / Extra (${settings.symbol})`} value={tripMisc} onChange={setTripMisc} suffix={settings.symbol} hint="Any extra not covered by settings" />
          </div>
        </div>

        {/* ── TRIP SUMMARY ── */}
        <div className="rounded-2xl overflow-hidden border-2 border-slate-200">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-white" />
            <p className="text-sm font-bold text-white tracking-wide">TRIP SUMMARY</p>
          </div>

          {/* Line items */}
          <div className="bg-white divide-y divide-slate-50">
            {[
              { label: "Revenue (Freight)", value: freight, accent: "text-slate-800" },
              { label: `Fuel Cost (${fuelLiters.toFixed(1)}L × ${settings.symbol}${cs.fuelPricePerLiter}/L)`, value: fuelCost },
              { label: `Weight`, value: weightTons > 0 ? `${weightTons} Tons` : "—", isText: true },
              { label: `Driver Allowance (${tripDays}d × ${settings.symbol}${cs.driverAllowancePerDay})`, value: driverCost },
              { label: `Helper Allowance (${tripDays}d × ${settings.symbol}${cs.helperAllowancePerDay})`, value: helperCost },
              { label: "Labour (Loading + Unloading)", value: labour },
              { label: "Commission", value: commission },
              { label: `Toll Plaza (${distanceKm}${settings.distanceUnit} × ${settings.symbol}${cs.tollPerKm})`, value: tollCost },
              { label: `Misc (${tripDays}d × ${settings.symbol}${cs.miscPerDay} + extra)`, value: miscTotal },
            ].map(({ label, value, accent, isText }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-slate-500 flex-1 pr-2 leading-tight">{label}</span>
                <span className={`text-sm font-semibold ${accent || "text-slate-700"} shrink-0`}>
                  {isText ? value : fmt(value)}
                </span>
              </div>
            ))}

            {/* Total Cost – bold */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
              <span className="text-sm font-extrabold text-slate-800">Total Cost</span>
              <span className="text-base font-extrabold text-slate-900">{fmt(totalCost)}</span>
            </div>

            {/* Net P/L */}
            <div className={`flex items-center justify-between px-4 py-4 ${isProfit ? "bg-blue-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-2">
                {isProfit
                  ? <TrendingUp className="w-5 h-5 text-blue-600" />
                  : <TrendingDown className="w-5 h-5 text-red-600" />}
                <span className={`text-sm font-extrabold ${isProfit ? "text-blue-700" : "text-red-700"}`}>
                  Net {isProfit ? "Profit" : "Loss"}
                </span>
              </div>
              <span className={`text-xl font-black ${isProfit ? "text-blue-600" : "text-red-600"}`}>
                {isProfit ? "+" : ""}{fmt(Math.abs(profit))}
              </span>
            </div>
          </div>
        </div>

        {/* ── METRIC CARDS ── */}
        {(distanceKm > 0 || weightTons > 0 || freight > 0) && (
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="P/L Margin"
              value={`${margin}%`}
              bg={isProfit ? "bg-blue-100" : "bg-red-100"}
              text={isProfit ? "text-blue-700" : "text-red-700"}
            />
            <MetricCard
              label={`Cost/${settings.distanceUnit}`}
              value={distanceKm > 0 ? fmt(costPerKm) : "—"}
              bg="bg-orange-100"
              text="text-orange-700"
            />
            <MetricCard
              label="Cost/Ton"
              value={weightTons > 0 ? fmt(costPerTon) : "—"}
              bg="bg-purple-100"
              text="text-purple-700"
            />
          </div>
        )}

        {/* Reset */}
        <Button variant="outline" onClick={handleReset} className="w-full rounded-2xl h-10">
          <RotateCcw className="w-4 h-4 mr-2" /> Reset Trip
        </Button>
      </div>
    </div>
  );
}