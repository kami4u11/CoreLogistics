import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useRole } from "@/components/useRole";
import AccessDenied from "@/components/AccessDenied";

/**
 * CompanyProfile — Admin-only page.
 * Redirects admins straight to AppSettingsPage (Companies tab).
 * Non-admins see AccessDenied.
 */
export default function CompanyProfile() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate(createPageUrl("AppSettingsPage"), { replace: true });
    }
  }, [isAdmin, loading, navigate]);

  if (loading) return null;
  if (!isAdmin) return <AccessDenied />;
  return null; // will redirect
}