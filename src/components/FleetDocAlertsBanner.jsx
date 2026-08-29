import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInDays } from "date-fns";
import { Shield, AlertTriangle, Clock, ChevronRight } from "lucide-react";

const expiryStatus = (dateStr, alertDays = 30) => {
  if (!dateStr) return null;
  const days = differenceInDays(new Date(dateStr), new Date());
  if (days < 0)          return { days, level: "expired",  label: `Expired ${Math.abs(days)}d ago`, color: "#dc2626", bg: "#fef2f2" };
  if (days <= 7)         return { days, level: "critical", label: `${days}d left — URGENT`,        color: "#dc2626", bg: "#fef2f2" };
  if (days <= alertDays) return { days, level: "soon",     label: `${days}d left`,                 color: "#d97706", bg: "#fffbeb" };
  return null; // ok — no alert
};

export default function FleetDocAlertsBanner() {
  const { data: documents = [] } = useQuery({
    queryKey: ["fd_admin_alerts"],
    queryFn: () => base44.entities.FleetDocument.list("-expiry_date", 500).catch(() => []),
    staleTime: 2 * 60 * 1000,
  });

  const alerts = useMemo(() => {
    return documents
      .map(d => {
        const s = expiryStatus(d.expiry_date, d.alert_days_before || 30);
        if (!s) return null;
        return { ...d, ...s };
      })
      .filter(Boolean)
      .sort((a, b) => a.days - b.days);
  }, [documents]);

  if (!alerts.length) return null;

  const expired  = alerts.filter(a => a.level === "expired");
  const critical = alerts.filter(a => a.level === "critical");
  const soon     = alerts.filter(a => a.level === "soon");

  return (
    <div style={{
      background: "linear-gradient(135deg,#1a0000,#2d0a0a)",
      border: "1px solid rgba(220,38,38,0.4)",
      borderRadius: 16,
      marginBottom: 16,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px",
        background: "rgba(220,38,38,0.15)",
        borderBottom: "1px solid rgba(220,38,38,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(220,38,38,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pulse-glow 2s infinite",
          }}>
            <Shield size={16} color="#ef4444" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#fca5a5", margin: 0 }}>
              🚨 Fleet Document Renewal Alerts — {alerts.length} document{alerts.length !== 1 ? "s" : ""} need attention
            </p>
            <p style={{ fontSize: 10, color: "rgba(252,165,165,0.6)", margin: "2px 0 0" }}>
              {expired.length > 0 && `${expired.length} expired · `}
              {critical.length > 0 && `${critical.length} urgent (≤7 days) · `}
              {soon.length > 0 && `${soon.length} expiring soon`}
              {" "}— Alerts stay until documents are renewed
            </p>
          </div>
        </div>
        <Link to={createPageUrl("FleetDocs")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px",
            background: "#dc2626", color: "#fff",
            border: "none", borderRadius: 8,
            fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0,
          }}>
          Manage Docs <ChevronRight size={12} />
        </Link>
      </div>

      {/* Alert rows */}
      <div style={{ padding: "10px 18px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {alerts.map(a => (
          <div key={a.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: a.level === "expired" || a.level === "critical"
              ? "rgba(220,38,38,0.1)" : "rgba(217,119,6,0.08)",
            border: `1px solid ${a.level === "expired" || a.level === "critical"
              ? "rgba(220,38,38,0.2)" : "rgba(217,119,6,0.15)"}`,
            borderRadius: 10, padding: "9px 14px", gap: 12,
          }}>
            {/* Icon */}
            <div style={{ flexShrink: 0 }}>
              {a.level === "expired" || a.level === "critical"
                ? <AlertTriangle size={15} color="#ef4444" />
                : <Clock size={15} color="#f59e0b" />
              }
            </div>

            {/* Vehicle + doc type */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#f1f5f9", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {a.vehicle_number} — {a.document_type}
              </p>
              <p style={{ fontSize: 10, color: "rgba(241,245,249,0.45)", margin: "2px 0 0" }}>
                Expiry: {a.expiry_date}
                {a.document_number ? ` · #${a.document_number}` : ""}
                {a.issued_by ? ` · ${a.issued_by}` : ""}
              </p>
            </div>

            {/* Badge */}
            <span style={{
              background: a.bg, color: a.color,
              fontSize: 10, fontWeight: 800,
              padding: "3px 10px", borderRadius: 99,
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {a.level === "expired" ? "🔴" : a.level === "critical" ? "🔴" : "🟡"} {a.label}
            </span>

            {/* Action */}
            <Link to={createPageUrl("FleetDocs")}
              style={{
                padding: "4px 12px", fontSize: 10, fontWeight: 700,
                background: "rgba(255,255,255,0.08)", color: "#e2e8f0",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 7, textDecoration: "none", flexShrink: 0,
              }}>
              Renew →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}