import React from "react";
import { ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useRole } from "@/components/useRole";

// Loading spinner — shown while role is being fetched.
// Used by useRoleGuard (in useRole.jsx) and can be used directly.
export function RoleLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        <p className="text-sm">Loading...</p>
      </div>
    </div>
  );
}

export default function AccessDenied() {
  const navigate = useNavigate();
  const { isSleepingPartner } = useRole();
  
  // Sleeping partners can view all pages (read-only) — never show access denied
  if (isSleepingPartner) {
    return null;
  }
  
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center max-w-xs w-full">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 mb-6">You don't have permission to view this section.</p>
        <button
          onClick={() => navigate(createPageUrl("Dashboard"))}
          className="w-full py-3 rounded-2xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}