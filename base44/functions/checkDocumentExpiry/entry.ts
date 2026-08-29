import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role for scheduled/automation context
    const today = new Date();
    const documents = await base44.asServiceRole.entities.FleetDocument.list();

    let alertsCreated = 0;
    let documentsUpdated = 0;

    for (const doc of documents) {
      if (!doc.expiry_date) continue;

      const expiry     = new Date(doc.expiry_date);
      const daysLeft   = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      const alertDays  = doc.alert_days_before || 30;

      // Determine status
      let newStatus = "valid";
      if (daysLeft < 0)           newStatus = "expired";
      else if (daysLeft <= alertDays) newStatus = "expiring_soon";

      // Update status if changed
      if (newStatus !== doc.status) {
        await base44.asServiceRole.entities.FleetDocument.update(doc.id, { status: newStatus });
        documentsUpdated++;
      }

      // Create notification if expiring soon or expired (and not already notified today)
      if (newStatus === "expired" || newStatus === "expiring_soon") {
        const existingNotifs = await base44.asServiceRole.entities.AppNotification.filter({
          reference_id: doc.id,
          created_date: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString() }
        }).catch(() => []);

        if (!existingNotifs.length) {
          const msg = newStatus === "expired"
            ? `🔴 EXPIRED: ${doc.vehicle_number} — ${doc.document_type} expired on ${doc.expiry_date}`
            : `🟡 EXPIRING: ${doc.vehicle_number} — ${doc.document_type} expires in ${daysLeft} days (${doc.expiry_date})`;

          await base44.asServiceRole.entities.AppNotification.create({
            title:        newStatus === "expired" ? "Document Expired" : "Document Expiring Soon",
            message:      msg,
            type:         newStatus === "expired" ? "danger" : "warning",
            category:     "fleet_document",
            reference_id: doc.id,
            reference_type:"FleetDocument",
            vehicle_number: doc.vehicle_number,
            is_read:      false,
          }).catch(() => null); // silently skip if AppNotification fields differ

          alertsCreated++;
        }
      }
    }

    return Response.json({
      success: true,
      processed: documents.length,
      documentsUpdated,
      alertsCreated,
      runAt: today.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});