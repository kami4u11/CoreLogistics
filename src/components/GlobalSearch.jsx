import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Search, X, Package, Truck, Users, FileText, Handshake, Building2, Navigation } from "lucide-react";

const PAGES = [
  { label: "Dashboard",          page: "Dashboard",          icon: Building2,  type: "page" },
  { label: "Loads / Bilties",    page: "Loads",              icon: Package,    type: "page" },
  { label: "Fleet Hub",          page: "Fleet",              icon: Truck,      type: "page" },
  { label: "Fleet Trips",        page: "FleetTrips",         icon: Navigation, type: "page" },
  { label: "Accounting",         page: "Accounting",         icon: FileText,   type: "page" },
  { label: "Clients",            page: "Clients",            icon: Users,      type: "page" },
  { label: "Brokers",            page: "Brokers",            icon: Handshake,  type: "page" },
  { label: "Invoices",           page: "Invoices",           icon: FileText,   type: "page" },
  { label: "HR & Payroll",       page: "HRPayroll",          icon: Users,      type: "page" },
  { label: "Fleet Maintenance",  page: "FleetMaintenance",   icon: Truck,      type: "page" },
];

export default function GlobalSearch() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [loads, setLoads]     = useState([]);
  const [clients, setClients] = useState([]);
  const [fleet, setFleet]     = useState([]);
  const [fetched, setFetched] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
    else setQuery("");
  }, [open]);

  // Lazy-fetch data once when opened
  useEffect(() => {
    if (!open || fetched) return;
    Promise.all([
      base44.entities.Load.list("-created_date", 200).catch(() => []),
      base44.entities.Client.list().catch(() => []),
      base44.entities.FleetVehicle.list().catch(() => []),
    ]).then(([l, c, f]) => { setLoads(l); setClients(c); setFleet(f); setFetched(true); });
  }, [open, fetched]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const matchedLoads = loads
      .filter(l => l.load_number?.toLowerCase().includes(q) || l.client_name?.toLowerCase().includes(q) || l.origin?.toLowerCase().includes(q) || l.destination?.toLowerCase().includes(q))
      .slice(0, 5)
      .map(l => ({ label: `#${l.load_number} — ${l.origin} → ${l.destination}`, sub: l.client_name, icon: Package, action: () => navigate(createPageUrl(`LoadDetail?id=${l.id}`)), type: "Load" }));

    const matchedClients = clients
      .filter(c => c.name?.toLowerCase().includes(q) || c.contact_person?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q))
      .slice(0, 4)
      .map(c => ({ label: c.name, sub: c.city || c.phone, icon: Users, action: () => navigate(createPageUrl("Clients")), type: "Client" }));

    const matchedFleet = fleet
      .filter(v => v.vehicle_number?.toLowerCase().includes(q) || v.driver_name?.toLowerCase().includes(q) || v.asset_name?.toLowerCase().includes(q))
      .slice(0, 3)
      .map(v => ({ label: v.vehicle_number, sub: v.driver_name || v.vehicle_type, icon: Truck, action: () => navigate(createPageUrl("Fleet")), type: "Vehicle" }));

    const matchedPages = PAGES
      .filter(p => p.label.toLowerCase().includes(q))
      .map(p => ({ label: p.label, sub: "Go to page", icon: p.icon, action: () => navigate(createPageUrl(p.page)), type: "Page" }));

    return [...matchedLoads, ...matchedClients, ...matchedFleet, ...matchedPages].slice(0, 12);
  }, [query, loads, clients, fleet, navigate]);

  const handleSelect = (item) => { item.action(); setOpen(false); };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white/80 text-xs font-medium transition-all"
      title="Search (Ctrl+K)"
    >
      <Search className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="hidden sm:inline text-[9px] bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-16 px-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search loads, clients, vehicles, pages…"
            className="flex-1 text-sm outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
          />
          {query && <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-medium">ESC</button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query && (
            <div className="px-4 py-3">
              <p className="text-xs text-slate-400 font-semibold uppercase mb-2">Quick Jump</p>
              <div className="grid grid-cols-2 gap-1">
                {PAGES.slice(0, 6).map(p => (
                  <button key={p.page} onClick={() => handleSelect({ action: () => navigate(createPageUrl(p.page)) })}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition-colors">
                    <p.icon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-700 font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-400">No results for "<strong>{query}</strong>"</p>
            </div>
          )}

          {query && results.length > 0 && (
            <div className="p-2">
              {results.map((r, i) => (
                <button key={i} onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors">
                    <r.icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-slate-400 truncate">{r.sub}</p>}
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase shrink-0">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}