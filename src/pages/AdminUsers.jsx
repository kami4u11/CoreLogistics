import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MobileHeader from "@/components/ui/MobileHeader";
import AdminDashboard from "@/components/AdminDashboard";
import { useAppSettings } from "@/components/AppSettings";

import {
  ChevronRight,
  BarChart2,
  Shield,
  LineChart as LineChartIcon
} from "lucide-react";

const LOGO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69995a1b4cc6b3863e378752/2cf5e616c_pvt_ltd_logo1-removebg-preview.png";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { settings } = useAppSettings();

  return (
    <div className="pb-24">
      <MobileHeader title="Admin Panel" backTo="Dashboard" />

      <div className="px-4 py-4 space-y-6">

        {/* TAB NAVIGATION */}
        <div className="flex gap-2 bg-white rounded-2xl p-1 border border-slate-100">
          
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
              activeTab === "dashboard"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ${
              activeTab === "analytics"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <BarChart2 className="w-4 h-4 inline mr-2" />
            Analytics
          </button>

        </div>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <AdminDashboard />
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="space-y-6">

            {/* HEADER */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-4">
              <img
                src={LOGO}
                alt="Saifran"
                className="h-20 w-auto bg-white rounded-xl p-1.5 shadow"
              />

              <div className="flex-1">
                <h2 className="text-white font-bold text-base">
                  Saifran Logistics
                </h2>
                <p className="text-blue-200 text-xs">
                  Admin Control Panel
                </p>
              </div>

              <Link
                to={createPageUrl("AdminSettings")}
                className="bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2"
              >
                <p className="text-lg">{settings.flag}</p>
                <p className="text-white text-xs font-bold">
                  {settings.currency}
                </p>
              </Link>
            </div>

            {/* DATA ANALYSIS BUTTON */}
            <Link
              to={createPageUrl("DataAnalysis")}
              className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl p-4"
            >
              <LineChartIcon className="w-6 h-6" />

              <div className="flex-1">
                <p className="font-bold">Data Analysis</p>
                <p className="text-white/70 text-xs">
                  Full company KPI dashboard
                </p>
              </div>

              <ChevronRight className="w-5 h-5 opacity-70" />
            </Link>

          </div>
        )}

      </div>
    </div>
  );
}