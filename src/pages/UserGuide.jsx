import React, { useState } from "react";
import MobileHeader from "@/components/ui/MobileHeader";
import { useRole } from "@/components/useRole";
import {
  BookOpen, Package, Truck, FileText, Users,
  Shield, ChevronDown, ChevronUp, Printer,
  BarChart2, AlertTriangle, Search, Download, Info,
  Star, Zap, DollarSign,
} from "lucide-react";
import { GUIDE_SECTIONS, generatePrintHTML } from "./UserGuideData";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP = {
  Zap, BookOpen, Package, Truck, FileText, Users,
  Shield, BarChart2, AlertTriangle, Star, DollarSign,
};

// ─── SECTION COMPONENT ────────────────────────────────────────────────────────
function Section({ section, isOpen, onToggle }) {
  const Icon = ICON_MAP[section.icon] || BookOpen;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className={`p-2.5 rounded-xl ${section.color} flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-tight">{section.title}</p>
          <p className="text-xs text-slate-400">{section.content.length} topics & procedures</p>
        </div>
        {isOpen
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {section.content.map((item, i) => (
            <div key={i} className="px-4 py-4">
              <div className="flex items-start gap-2 mb-2">
                <span
                  style={{ background: section.badgeColor }}
                  className="text-white text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5"
                >
                  {i + 1}
                </span>
                <p className="text-xs font-bold text-slate-800 leading-snug">{item.heading}</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line ml-7">{item.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function UserGuide() {
  const { role } = useRole();
  const [openSection, setOpenSection] = useState("getstarted");
  const [search, setSearch] = useState("");

  const filtered = GUIDE_SECTIONS.filter(s =>
    !search ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.content.some(c =>
      c.heading.toLowerCase().includes(search.toLowerCase()) ||
      c.body.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow popups for this site to open the print dialog."); return; }
    w.document.write(generatePrintHTML(role, GUIDE_SECTIONS));
    w.document.close();
    w.focus();
    // Auto-trigger print after fonts load
    setTimeout(() => w.print(), 1200);
  };

  const handleDownload = () => {
    const html = generatePrintHTML(role, GUIDE_SECTIONS);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TMS-UserGuide-${new Date().toISOString().split("T")[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    // Opens in new tab with print-optimized layout — user saves as PDF from browser print dialog
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow popups to export PDF."); return; }
    w.document.write(generatePrintHTML(role, GUIDE_SECTIONS));
    w.document.close();
    w.focus();
    // Show print tip then auto-print
    setTimeout(() => {
      w.print();
    }, 1500);
  };

  const totalTopics = GUIDE_SECTIONS.reduce((a, s) => a + s.content.length, 0);

  return (
    <div className="pb-24">
      <MobileHeader
        title="User Guide"
        backTo="Dashboard"
        rightAction={
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl"
            >
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 text-white text-xs font-semibold rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 px-4 py-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-orange-400" />
          <h1 className="text-lg font-black">Complete User Guide</h1>
        </div>
        <p className="text-slate-300 text-xs mb-4">
          Step-by-step instructions for every feature, role and module. Tap any section to expand.
        </p>
        <div className="flex gap-2 mb-4">
          <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
            <p className="text-base font-black text-white">{GUIDE_SECTIONS.length}</p>
            <p className="text-[10px] text-slate-400">Modules</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
            <p className="text-base font-black text-white">{totalTopics}</p>
            <p className="text-[10px] text-slate-400">Topics</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-2 text-center flex-1">
            <p className="text-sm font-black text-orange-300 capitalize">
              {(role || "").replace(/_/g, " ") || "All Roles"}
            </p>
            <p className="text-[10px] text-slate-400">Your Role</p>
          </div>
        </div>
        <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search any topic, rule, procedure..."
            className="bg-transparent text-white placeholder-slate-400 text-sm outline-none flex-1"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-400 text-xs">✕</button>
          )}
        </div>
      </div>

      {/* Quick start banner */}
      {!search && (
        <div className="px-4 pt-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-800">New to the app? Start here!</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Open "Getting Started" below for the 5-step first-time setup guide.
              </p>
            </div>
            <button
              onClick={() => setOpenSection("getstarted")}
              className="text-amber-700 text-xs font-bold flex-shrink-0 bg-amber-100 px-2 py-1 rounded-lg"
            >
              Go →
            </button>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="px-4 pt-3 space-y-3">
        {filtered.map(section => (
          <Section
            key={section.id}
            section={section}
            isOpen={openSection === section.id}
            onToggle={() => setOpenSection(openSection === section.id ? null : section.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No results for "{search}"</p>
            <button onClick={() => setSearch("")} className="text-blue-600 text-xs mt-2">
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Export CTA */}
      <div className="px-4 pt-3 pb-4 space-y-2">
        <div className="bg-red-600 rounded-xl px-4 py-3 flex items-center gap-3">
          <Printer className="w-5 h-5 text-white flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Export as Color PDF</p>
            <p className="text-[10px] text-red-200">Opens print dialog — select "Save as PDF" for full-color export</p>
          </div>
          <button
            onClick={handleExportPDF}
            className="bg-white text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
          >
            Print / PDF
          </button>
        </div>
        <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <Download className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Download HTML file</p>
            <p className="text-[10px] text-slate-400">Works offline in any browser</p>
          </div>
          <button
            onClick={handleDownload}
            className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}