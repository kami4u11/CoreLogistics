import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MobileHeader from "@/components/ui/MobileHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

function Row({ label, field, form, handleChange, color = "" }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 ${color}`}>
      <label className="text-xs text-slate-600 flex-1">{label}</label>
      <Input
        type="number"
        min="0"
        step="any"
        value={form[field] || ""}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-36 rounded-xl text-right text-xs h-8"
        placeholder="0"
      />
    </div>
  );
}

export default function TripPnLForm() {
  const params = new URLSearchParams(window.location.search);
  const tripId = params.get("trip_id");
  const pnlId  = params.get("pnl_id");
  const queryClient = useQueryClient();

  const { data: trips = [] } = useQuery({
    queryKey: ["fleetTrips"],
    queryFn: () => base44.entities.FleetTrip.list(),
  });

  const trip = trips.find(t => t.id === tripId);

  const emptyForm = {
    trip_id: tripId || "",
    trip_type: "intercity",
    vehicle_number: "",
    driver_name: "",
    route: "",
    distance_km: "",
    is_round_trip: false,
    start_date: "",
    end_date: "",
    cargo_type: "",
    client_name: "",
    freight_charges: "",
    return_load_income: "",
    route_change_charges: "",
    detention_charges: "",
    cancellation_charges: "",
    overweight_charges: "",
    other_income: "",
    fuel_cost: "",
    toll_tax: "",
    driver_allowance: "",
    helper_allowance: "",
    loading_labour: "",
    unloading_labour: "",
    police_challan: "",
    parking_chowkidar: "",
    custom_route_fees: "",
    weighbridge: "",
    brokerage_commission: "",
    meals_misc: "",
    fixed_cost_method: "per_km",
    monthly_fixed_cost: "",
    avg_monthly_trips: "",
    monthly_km: "",
    status: "completed",
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (trip) {
      setForm(prev => ({
        ...prev,
        vehicle_number: trip.vehicle_number || "",
        driver_name:    trip.driver_name    || "",
        route:          trip.route          || `${trip.origin} → ${trip.destination}`,
        distance_km:    trip.distance_km    || "",
        start_date:     trip.trip_date      || "",
        end_date:       trip.end_date       || "",
        cargo_type:     trip.cargo_type     || "",
        client_name:    trip.client_name    || "",
        // Pre-fill from existing FleetTrip financials if already entered
        freight_charges:  trip.freight_income_pkr   || prev.freight_charges  || "",
        fuel_cost:        trip.fuel_expense_pkr      || prev.fuel_cost        || "",
        driver_allowance: trip.driver_allowance_pkr  || prev.driver_allowance || "",
        toll_tax:         trip.toll_charges_pkr      || prev.toll_tax         || "",
        meals_misc:       trip.other_expenses_pkr    || prev.meals_misc       || "",
      }));
    }
    // If editing existing P&L record, load it
    if (pnlId) {
      base44.entities.TripPnL.list().then(list => {
        const existing = list.find(p => p.id === pnlId);
        if (existing) setForm({ ...emptyForm, ...existing });
      });
    }
  }, [trip, pnlId]);

  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const num = (v) => parseFloat(v) || 0;

  const totalIncome = num(form.freight_charges) + num(form.return_load_income) +
    num(form.route_change_charges) + num(form.detention_charges) +
    num(form.cancellation_charges) + num(form.overweight_charges) + num(form.other_income);

  const totalVarExpense = num(form.fuel_cost) + num(form.toll_tax) +
    num(form.driver_allowance) + num(form.helper_allowance) +
    num(form.loading_labour) + num(form.unloading_labour) +
    num(form.police_challan) + num(form.parking_chowkidar) +
    num(form.custom_route_fees) + num(form.weighbridge) +
    num(form.brokerage_commission) + num(form.meals_misc);

  const fixedCost = (() => {
    if (form.fixed_cost_method === "per_trip") {
      const t = num(form.avg_monthly_trips) || 1;
      return num(form.monthly_fixed_cost) / t;
    } else {
      const km = num(form.monthly_km) || 1;
      return (num(form.monthly_fixed_cost) / km) * num(form.distance_km);
    }
  })();

  const totalExpense  = totalVarExpense + fixedCost;
  const tripProfit    = totalIncome - totalExpense;
  const profitMargin  = totalIncome > 0 ? (tripProfit / totalIncome) * 100 : 0;
  const distKm        = num(form.distance_km) || 1;
  const profitPerKm   = tripProfit / distKm;
  const fuelPerKm     = num(form.fuel_cost) / distKm;
  const revenuePerKm  = totalIncome / distKm;
  const costPerKm     = totalExpense / distKm;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Save/update TripPnL record
      let pnlRecord;
      if (pnlId) {
        pnlRecord = await base44.entities.TripPnL.update(pnlId, data);
      } else {
        pnlRecord = await base44.entities.TripPnL.create(data);
      }

      // 2. ── KEY FIX: write financials back to FleetTrip so FleetTrips.jsx can read them ──
      //    FleetTrips.jsx reads: freight_income_pkr, fuel_expense_pkr,
      //    driver_allowance_pkr, toll_charges_pkr, other_expenses_pkr
      if (tripId) {
        const totalExpensesForTrip = totalVarExpense + fixedCost;
        await base44.entities.FleetTrip.update(tripId, {
          freight_income_pkr:  totalIncome,          // total income from P&L
          fuel_expense_pkr:    num(data.fuel_cost),
          driver_allowance_pkr: num(data.driver_allowance),
          toll_charges_pkr:    num(data.toll_tax),
          other_expenses_pkr:  totalExpensesForTrip - num(data.fuel_cost)
                                 - num(data.driver_allowance) - num(data.toll_tax),
          pnl_status:          "completed",
        });
      }

      return pnlRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleetTrips"] });
      queryClient.invalidateQueries({ queryKey: ["tripPnL"] });
      toast.success("Trip P&L saved!");
      window.location.href = createPageUrl("FleetTrips");
    },
    onError: (err) => {
      toast.error("Failed to save: " + (err?.message || "unknown error"));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const numFields = ["distance_km", "freight_charges", "return_load_income", "route_change_charges",
      "detention_charges", "cancellation_charges", "overweight_charges", "other_income",
      "fuel_cost", "toll_tax", "driver_allowance", "helper_allowance", "loading_labour",
      "unloading_labour", "police_challan", "parking_chowkidar", "custom_route_fees",
      "weighbridge", "brokerage_commission", "meals_misc", "monthly_fixed_cost",
      "avg_monthly_trips", "monthly_km"];
    const data = { ...form };
    numFields.forEach(f => { data[f] = parseFloat(data[f]) || 0; });
    saveMutation.mutate(data);
  };

  const SectionTitle = ({ children }) => (
    <div className="bg-slate-800 text-white text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-lg mt-4 mb-2">{children}</div>
  );
  const fmt = (n) => `₨${Math.round(n).toLocaleString()}`;

  return (
    <div className="pb-28">
      <MobileHeader title="Trip P&L Sheet" backTo="FleetTrips" />
      <form onSubmit={handleSubmit} className="px-4 pt-3 space-y-2">

        {/* Trip Master */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Trip Master Data</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Trip Type</Label>
              <Select value={form.trip_type} onValueChange={(v) => handleChange("trip_type", v)}>
                <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local (Within City)</SelectItem>
                  <SelectItem value="intercity">Intercity / Long Haul</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vehicle Number</Label>
              <Input value={form.vehicle_number} onChange={(e) => handleChange("vehicle_number", e.target.value)} className="rounded-xl h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Driver Name</Label>
              <Input value={form.driver_name} onChange={(e) => handleChange("driver_name", e.target.value)} className="rounded-xl h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Client Name</Label>
              <Input value={form.client_name} onChange={(e) => handleChange("client_name", e.target.value)} className="rounded-xl h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Route</Label>
            <Input value={form.route} onChange={(e) => handleChange("route", e.target.value)} className="rounded-xl h-8 text-xs" placeholder="e.g. Karachi → Lahore" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Distance (KM)</Label>
              <Input type="number" value={form.distance_km} onChange={(e) => handleChange("distance_km", e.target.value)} className="rounded-xl h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cargo Type</Label>
              <Input value={form.cargo_type} onChange={(e) => handleChange("cargo_type", e.target.value)} className="rounded-xl h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => handleChange("start_date", e.target.value)} className="rounded-xl h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={form.end_date} onChange={(e) => handleChange("end_date", e.target.value)} className="rounded-xl h-8 text-xs" />
            </div>
          </div>
        </div>

        {/* INCOME */}
        <div className="bg-white rounded-2xl border border-green-100 p-4">
          <SectionTitle>📥 Trip Income (PKR)</SectionTitle>
          {form.trip_type === "local" ? (
            <>
              <Row label="Freight Charges" field="freight_charges" form={form} handleChange={handleChange} />
              <Row label="Overweight Charges" field="overweight_charges" form={form} handleChange={handleChange} />
              <Row label="Other Income" field="other_income" form={form} handleChange={handleChange} />
            </>
          ) : (
            <>
              <Row label="Freight Charges" field="freight_charges" form={form} handleChange={handleChange} />
              <Row label="Return Load Income" field="return_load_income" form={form} handleChange={handleChange} />
              <Row label="Route Change Charges" field="route_change_charges" form={form} handleChange={handleChange} />
              <Row label="Detention Charges" field="detention_charges" form={form} handleChange={handleChange} />
              <Row label="Cancellation Charges" field="cancellation_charges" form={form} handleChange={handleChange} />
              <Row label="Overweight Charges" field="overweight_charges" form={form} handleChange={handleChange} />
              <Row label="Other Income" field="other_income" form={form} handleChange={handleChange} />
            </>
          )}
          <div className="mt-3 bg-green-50 rounded-xl px-3 py-2 flex justify-between items-center">
            <span className="text-sm font-bold text-green-800">Total Income</span>
            <span className="text-sm font-bold text-green-700">{fmt(totalIncome)}</span>
          </div>
        </div>

        {/* EXPENSES */}
        <div className="bg-white rounded-2xl border border-red-100 p-4">
          <SectionTitle>📤 Variable Expenses (PKR)</SectionTitle>
          <Row label="Fuel Cost" field="fuel_cost" form={form} handleChange={handleChange} />
          <Row label="Toll / Tax" field="toll_tax" form={form} handleChange={handleChange} />
          <Row label="Driver Allowance" field="driver_allowance" form={form} handleChange={handleChange} />
          {form.trip_type === "local" ? (
            <Row label="Driver Daily Salary" field="helper_allowance" form={form} handleChange={handleChange} />
          ) : (
            <Row label="Helper Allowance" field="helper_allowance" form={form} handleChange={handleChange} />
          )}
          <Row label="Loading Labour" field="loading_labour" form={form} handleChange={handleChange} />
          <Row label="Unloading Labour" field="unloading_labour" form={form} handleChange={handleChange} />
          {form.trip_type === "intercity" && (
            <>
              <Row label="Police / Challan" field="police_challan" form={form} handleChange={handleChange} />
              <Row label="Parking / Chowkidar" field="parking_chowkidar" form={form} handleChange={handleChange} />
              <Row label="Custom / Route Fees" field="custom_route_fees" form={form} handleChange={handleChange} />
              <Row label="Weighbridge" field="weighbridge" form={form} handleChange={handleChange} />
              <Row label="Brokerage / Commission" field="brokerage_commission" form={form} handleChange={handleChange} />
            </>
          )}
          <Row label="Meals & Misc" field="meals_misc" form={form} handleChange={handleChange} />
          <div className="mt-3 bg-red-50 rounded-xl px-3 py-2 flex justify-between items-center">
            <span className="text-sm font-bold text-red-800">Total Variable Expense</span>
            <span className="text-sm font-bold text-red-600">{fmt(totalVarExpense)}</span>
          </div>
        </div>

        {/* FIXED COST */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <SectionTitle>🏭 Fixed Cost Allocation</SectionTitle>
          <div className="space-y-1 mb-3">
            <Label className="text-xs">Method</Label>
            <Select value={form.fixed_cost_method} onValueChange={(v) => handleChange("fixed_cost_method", v)}>
              <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="per_trip">Per Trip (Monthly Fixed ÷ Avg Trips)</SelectItem>
                <SelectItem value="per_km">Per KM (Fixed per KM × Trip KM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Row label="Monthly Fixed Cost (PKR)" field="monthly_fixed_cost" form={form} handleChange={handleChange} />
          {form.fixed_cost_method === "per_trip" ? (
            <Row label="Avg Monthly Trips per Truck" field="avg_monthly_trips" form={form} handleChange={handleChange} />
          ) : (
            <Row label="Monthly KM (for fixed cost/KM)" field="monthly_km" form={form} handleChange={handleChange} />
          )}
          <div className="mt-3 bg-slate-50 rounded-xl px-3 py-2 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">Fixed Cost for this Trip</span>
            <span className="text-xs font-bold text-slate-700">{fmt(fixedCost)}</span>
          </div>
        </div>

        {/* KPI SUMMARY */}
        <div className="bg-slate-900 rounded-2xl p-4 text-white">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-3">📊 Trip P&L Summary & KPIs</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/10 rounded-xl p-2.5">
              <p className="text-[10px] text-slate-300">Total Income</p>
              <p className="text-sm font-bold text-green-400">{fmt(totalIncome)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <p className="text-[10px] text-slate-300">Total Expense</p>
              <p className="text-sm font-bold text-red-400">{fmt(totalExpense)}</p>
            </div>
            <div className={`rounded-xl p-2.5 ${tripProfit >= 0 ? "bg-green-600/30" : "bg-red-600/30"}`}>
              <p className="text-[10px] text-slate-300">Trip Profit / Loss</p>
              <p className={`text-base font-bold ${tripProfit >= 0 ? "text-green-300" : "text-red-300"}`}>{tripProfit >= 0 ? "+" : ""}{fmt(tripProfit)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <p className="text-[10px] text-slate-300">Profit Margin %</p>
              <p className={`text-sm font-bold ${profitMargin >= 0 ? "text-green-300" : "text-red-300"}`}>{profitMargin.toFixed(1)}%</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Profit / KM",   val: `₨${profitPerKm.toFixed(0)}`  },
              { label: "Revenue / KM",  val: `₨${revenuePerKm.toFixed(0)}` },
              { label: "Fuel Cost / KM",val: `₨${fuelPerKm.toFixed(1)}`    },
              { label: "Cost / KM",     val: `₨${costPerKm.toFixed(0)}`    },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-[10px] text-slate-400">{kpi.label}</p>
                <p className="text-xs font-bold text-white">{kpi.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} rows={2} className="rounded-xl text-xs" />
        </div>

        <Button type="submit" disabled={saveMutation.isPending} className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-base font-bold">
          {saveMutation.isPending ? "Saving..." : "Save Trip P&L"}
        </Button>
      </form>
    </div>
  );
}