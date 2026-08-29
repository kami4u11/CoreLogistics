import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AccessDenied, { RoleLoading } from "@/components/AccessDenied";
import React from "react";

// Module-level cache — avoids re-fetching on every page navigation
let _cachedUser = undefined; // undefined = not yet fetched; null = fetched, no user

export function useRole() {
  const [user,    setUser]    = useState(_cachedUser !== undefined ? _cachedUser : null);
  const [loading, setLoading] = useState(_cachedUser === undefined);

  useEffect(() => {
    if (_cachedUser !== undefined) {
      setUser(_cachedUser);
      setLoading(false);
      return;
    }
    base44.auth.me()
      .then((u)  => { _cachedUser = u;    setUser(u); })
      .catch(()  => { _cachedUser = null; setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  // ─── THE KEY FIX ──────────────────────────────────────────────────────────
  // role is null while loading=true so every flag below stays false until the
  // real role is confirmed — no page can show <AccessDenied /> prematurely
  const role = loading ? null : (user?.role ?? null);
  // ──────────────────────────────────────────────────────────────────────────

  // Role flags
  const isAdmin            = role === "admin";
  const isManagement       = role === "management";
  const isSleepingPartner  = role === "sleeping_partner";
  const isOperations       = role === "operations";
  const isSupervisor       = role === "supervisor";
  const isAccounting       = role === "accounting";
  const isFleetManager     = role === "fleet_manager";
  const isDriver           = role === "driver";
  const isLabourSupervisor = role === "labour_supervisor";
  const isClient           = role === "client";
  const isPendingUser      = !loading && !!user && role === "user";
  const isLoadingSupervisor = isSupervisor;
  // Gamer: exclusive arcade-only access

  // Grouped role shortcuts
  const coreAdmin      = isAdmin || isManagement;
  const financeTeam    = isAdmin || isManagement || isAccounting;
  const operationsTeam = isAdmin || isManagement || isOperations;
  const fleetTeam      = isAdmin || isManagement || isFleetManager;

  // Permissions
  const canSeeAllData         = coreAdmin || isSleepingPartner;
  const canSeeAccounting      = financeTeam || isSleepingPartner;
  const canSeeFreightRates    = financeTeam || isSleepingPartner;
  const canManageHR           = financeTeam;
  const canSeeFleetFinancials = financeTeam || isSleepingPartner;
  const canSeeFleet           = fleetTeam || isDriver || isAccounting || isSleepingPartner || isOperations;
  const canManageFleetData    = fleetTeam || isOperations || isAccounting;
  const canSeeLoads           = operationsTeam || isSupervisor || isAccounting || isSleepingPartner;
  const canAddLoad            = operationsTeam;
  const canEditLoad           = operationsTeam || isAccounting;
  const canEditBiltyInfo      = isSupervisor || isOperations || isManagement;
  const canRequestBiltyChange = isSupervisor || isOperations || isManagement;
  const canManageClients      = operationsTeam;
  const canManageBrokers      = operationsTeam;
  const canManageVehicles     = operationsTeam || isAccounting;
  const canSeeClients         = operationsTeam || isSleepingPartner;
  const canSeeBrokers         = operationsTeam || isSleepingPartner;
  const canSeeVehicles        = fleetTeam || operationsTeam || isAccounting || isSleepingPartner;
  const canSeeOperations      = operationsTeam || isSupervisor || isSleepingPartner;
  const isReadOnly            = isSleepingPartner;
  const canDelete             = isAdmin;

  return {
    user, role, loading,
    isAdmin, isManagement, isSleepingPartner, isOperations, isSupervisor,
    isAccounting, isFleetManager, isDriver, isLabourSupervisor, isClient,
    isPendingUser, isLoadingSupervisor,
    coreAdmin, financeTeam, operationsTeam, fleetTeam,
    canSeeAllData, canSeeAccounting, canSeeFreightRates, canManageHR,
    canSeeFleetFinancials, canSeeFleet, canManageFleetData, canSeeLoads,
    canAddLoad, canEditLoad, canEditBiltyInfo, canRequestBiltyChange,
    canManageClients, canManageBrokers, canManageVehicles,
    canSeeClients, canSeeBrokers, canSeeVehicles, canSeeOperations,
    isReadOnly, canDelete,
  };
}

// ─── useRoleGuard ─────────────────────────────────────────────────────────────
// Replaces the manual loading + access check pattern in every page.
// Call it at the top of any page component (after all other hooks), then:
//
//   const guard = useRoleGuard(r => r.isAdmin);
//   if (guard.screen) return guard.screen;   // shows spinner or AccessDenied
//   // rest of your page...
//
export function useRoleGuard(permissionFn) {
  const r = useRole();
  const screen = r.loading
    ? React.createElement(RoleLoading)
    : !permissionFn(r)
      ? React.createElement(AccessDenied)
      : null;
  return { ...r, screen };
}