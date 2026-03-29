function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(isoDate: string | null) {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function money(amount: number, currency = "NGN") {
  return `${currency} ${amount.toLocaleString()}`;
}

const baseStyles = `
  body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #1a1916; background: #f5f4f0; }
  .sheet { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid #e8e6df; border-radius: 16px; padding: 40px; }
  .brand { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid #e8e6df; }
  .brand h1 { margin: 0 0 6px; font-size: 26px; }
  .brand p { margin: 0; color: #6b6860; font-size: 13px; line-height: 1.6; }
  .pill { display: inline-block; padding: 5px 12px; border-radius: 999px; background: #fce8e5; color: #9b2a1a; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 8px; }
  .pill.green { background: #e8f0eb; color: #1a3a2a; }
  h2 { font-size: 18px; margin: 28px 0 14px; border-bottom: 1px solid #e8e6df; padding-bottom: 8px; color: #1a1916; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
  .box { border: 1px solid #e8e6df; border-radius: 10px; padding: 14px; background: #f9f8f5; }
  .label { font-size: 11px; color: #6b6860; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
  .value { font-size: 15px; font-weight: 700; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
  th { background: #f9f8f5; border: 1px solid #e8e6df; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6860; }
  td { border: 1px solid #e8e6df; padding: 10px 12px; }
  .outstanding { margin-top: 24px; border-top: 2px solid #1a1916; padding-top: 16px; font-size: 20px; font-weight: 700; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e6df; font-size: 12px; color: #6b6860; }
  @media print { body { background: #fff; padding: 0; } .sheet { border: 0; border-radius: 0; padding: 24px; } }
`;

function printViaIframe(html: string, frameId: string) {
  if (typeof window === "undefined") return;

  const existing = document.getElementById(frameId);
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = frameId;
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    window.setTimeout(() => {
      iframe.contentWindow?.print();
    }, 150);
  };
}

export interface PreLegalLetterData {
  generatedAt: string;
  landlord: { companyName: string; name: string; email: string; phone: string };
  tenant: {
    name: string; email: string; phone: string; address: string;
    leaseStart: string | null; leaseEnd: string | null;
    guarantor: { name: string; phone: string; email: string } | null;
  };
  property: { name: string; address: string };
  unit: string | null;
  outstandingAmount: number;
  currency: string;
  defaultStatus: string;
  caseOpenedAt: string;
  gracePeriod: {
    newDeadline: string; agreedAmount: number; initiatedAt: string;
    landlordAcknowledgedAt: string | null; tenantAcknowledgedAt: string | null;
    notes: string | null;
  } | null;
  paymentHistory: Array<{ amount: number; status: string; paidAt: string | null; method: string; createdAt: string }>;
  noticesSent: Array<{ type: string; sentAt: string; deliveryConfirmed: boolean }>;
  auditLogs: Array<{ action: string; actorType: string; actorName: string | null; timestamp: string }>;
}

export function printPreLegalLetter(data: PreLegalLetterData) {
  if (typeof window === "undefined") return;

  const paymentRows = data.paymentHistory
    .map(
      (p) => `<tr>
      <td>${fmt(p.createdAt)}</td>
      <td>${money(p.amount, data.currency)}</td>
      <td>${p.method}</td>
      <td>${p.paidAt ? fmt(p.paidAt) : "—"}</td>
      <td>${escapeHtml(p.status)}</td>
    </tr>`,
    )
    .join("");

  const noticeRows = data.noticesSent
    .map(
      (n) => `<tr>
      <td>${escapeHtml(n.type.replace(/_/g, " "))}</td>
      <td>${fmt(n.sentAt)}</td>
      <td>${n.deliveryConfirmed ? "Confirmed" : "Pending"}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pre-Legal Demand Letter — DoorRent</title>
  <style>${baseStyles}</style>
</head>
<body>
<div class="sheet">
  <div class="brand">
    <div>
      <span class="pill">Pre-Legal Demand Letter</span>
      <h1>${escapeHtml(data.landlord.companyName)}</h1>
      <p>${escapeHtml(data.landlord.name)} · ${escapeHtml(data.landlord.email)} · ${escapeHtml(data.landlord.phone)}</p>
      <p>DoorRent — Subsidiary of ReSuply Technologies Limited</p>
    </div>
    <div style="text-align:right">
      <div class="label">Date</div>
      <div class="value">${fmt(data.generatedAt)}</div>
    </div>
  </div>

  <h2>Parties</h2>
  <div class="grid">
    <div class="box">
      <div class="label">Tenant</div>
      <div class="value">${escapeHtml(data.tenant.name)}</div>
      <div style="color:#6b6860;font-size:13px;margin-top:4px">${escapeHtml(data.tenant.email)}<br/>${escapeHtml(data.tenant.phone)}</div>
      ${data.tenant.address ? `<div style="color:#6b6860;font-size:13px;margin-top:4px">${escapeHtml(data.tenant.address)}</div>` : ""}
    </div>
    <div class="box">
      <div class="label">Property / Unit</div>
      <div class="value">${escapeHtml(data.property.name)}</div>
      <div style="color:#6b6860;font-size:13px;margin-top:4px">${escapeHtml(data.property.address)}</div>
      ${data.unit ? `<div style="color:#6b6860;font-size:13px;margin-top:4px">Unit: ${escapeHtml(data.unit)}</div>` : ""}
    </div>
    <div class="box">
      <div class="label">Lease Period</div>
      <div class="value">${fmt(data.tenant.leaseStart)} — ${fmt(data.tenant.leaseEnd)}</div>
    </div>
    <div class="box">
      <div class="label">Case Opened</div>
      <div class="value">${fmt(data.caseOpenedAt)}</div>
    </div>
  </div>

  ${
    data.tenant.guarantor
      ? `<div class="box" style="margin-bottom:20px">
      <div class="label">Guarantor</div>
      <div class="value">${escapeHtml(data.tenant.guarantor.name)}</div>
      <div style="color:#6b6860;font-size:13px;margin-top:4px">${escapeHtml(data.tenant.guarantor.email)} · ${escapeHtml(data.tenant.guarantor.phone)}</div>
    </div>`
      : ""
  }

  ${
    data.gracePeriod
      ? `<h2>Grace Period Agreement</h2>
  <div class="grid">
    <div class="box"><div class="label">New Deadline</div><div class="value">${fmt(data.gracePeriod.newDeadline)}</div></div>
    <div class="box"><div class="label">Agreed Amount</div><div class="value">${money(data.gracePeriod.agreedAmount, data.currency)}</div></div>
    <div class="box"><div class="label">Landlord Acknowledged</div><div class="value">${data.gracePeriod.landlordAcknowledgedAt ? fmt(data.gracePeriod.landlordAcknowledgedAt) : "Not yet"}</div></div>
    <div class="box"><div class="label">Tenant Acknowledged</div><div class="value">${data.gracePeriod.tenantAcknowledgedAt ? fmt(data.gracePeriod.tenantAcknowledgedAt) : "Not yet"}</div></div>
  </div>
  ${data.gracePeriod.notes ? `<p style="font-size:13px;color:#6b6860">Notes: ${escapeHtml(data.gracePeriod.notes)}</p>` : ""}`
      : ""
  }

  <h2>Payment History</h2>
  ${
    data.paymentHistory.length
      ? `<table>
    <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Paid At</th><th>Status</th></tr></thead>
    <tbody>${paymentRows}</tbody>
  </table>`
      : `<p style="color:#6b6860;font-size:13px">No payment records found.</p>`
  }

  <h2>Notices Sent</h2>
  ${
    data.noticesSent.length
      ? `<table>
    <thead><tr><th>Notice Type</th><th>Sent At</th><th>Delivery</th></tr></thead>
    <tbody>${noticeRows}</tbody>
  </table>`
      : `<p style="color:#6b6860;font-size:13px">No notices sent.</p>`
  }

  <div class="outstanding">
    Outstanding Amount: ${money(data.outstandingAmount, data.currency)}
  </div>

  <div class="footer">
    Generated by DoorRent on ${fmt(data.generatedAt)} · This document is auto-populated from platform records and is intended for legal reference.
  </div>
</div>
</body>
</html>`;

  printViaIframe(html, "__pre-legal-print-frame");
}

export interface AuditExportData {
  id: string;
  tenant: { name: string; email: string; phone?: string; address?: string };
  property: { name: string; address: string };
  unit: string | null;
  outstandingAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  gracePeriod: {
    newDeadline: string;
    agreedAmount: number;
    initiatedAt: string;
    workflowStatus: string | null;
    landlordAcknowledgedAt: string | null;
    tenantAcknowledgedAt: string | null;
    tenantSignedAt: string | null;
    notes: string | null;
  } | null;
  auditLogs: Array<{
    action: string; actorType: string; actorName: string | null;
    metadata: unknown; timestamp: string;
  }>;
}

export function printAuditExport(data: AuditExportData) {
  if (typeof window === "undefined") return;

  const exportedOn = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const exportedTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const auditStyles = `
    ${baseStyles}
    body { font-family: 'Georgia', 'Times New Roman', serif; background: #f7f6f3; }
    .sheet { max-width: 860px; font-size: 13.5px; line-height: 1.7; }
    .doc-header { border-bottom: 3px solid #1a1916; padding-bottom: 20px; margin-bottom: 24px; }
    .doc-header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .doc-title { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
    .doc-subtitle { font-size: 12px; color: #6b6860; text-transform: uppercase; letter-spacing: 0.08em; }
    .doc-ref { text-align: right; }
    .doc-ref .label { font-size: 11px; color: #6b6860; text-transform: uppercase; letter-spacing: 0.06em; }
    .doc-ref .value { font-size: 13px; font-weight: 600; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6b6860; border-bottom: 1px solid #e8e6df; padding-bottom: 6px; margin: 28px 0 14px; }
    .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .party-box { border: 1px solid #e8e6df; border-radius: 8px; padding: 14px 16px; background: #fafaf8; }
    .party-role { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9b8e7a; margin-bottom: 4px; }
    .party-name { font-size: 15px; font-weight: 700; margin-bottom: 2px; }
    .party-detail { font-size: 12px; color: #6b6860; line-height: 1.5; }
    .grace-block { background: #fff8ec; border: 2px solid #e8c84a; border-radius: 10px; padding: 18px 20px; margin-bottom: 20px; }
    .grace-block .grace-title { font-size: 13px; font-weight: 700; margin-bottom: 12px; color: #7a5a00; display: flex; align-items: center; gap: 8px; }
    .grace-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .grace-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #9b8e7a; margin-bottom: 3px; }
    .grace-item .value { font-size: 14px; font-weight: 700; }
    .grace-item .value.deadline { color: #9b2a1a; font-size: 16px; }
    .grace-status { margin-top: 14px; padding-top: 12px; border-top: 1px solid #e8c84a; display: flex; gap: 16px; flex-wrap: wrap; }
    .grace-status-item { font-size: 12px; color: #6b6860; }
    .grace-status-item strong { color: #1a1916; }
    .ack-row { display: flex; gap: 0; margin-top: 12px; border: 1px solid #e8e6df; border-radius: 8px; overflow: hidden; }
    .ack-cell { flex: 1; padding: 10px 14px; background: #fafaf8; border-right: 1px solid #e8e6df; }
    .ack-cell:last-child { border-right: none; }
    .ack-cell .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #9b8e7a; margin-bottom: 3px; }
    .ack-cell .value { font-size: 12px; font-weight: 600; }
    .ack-cell .value.signed { color: #1a6b4a; }
    .ack-cell .value.pending { color: #b45309; }
    table { font-family: 'Arial', sans-serif; }
    .log-table th { background: #1a1916; color: #fff; border-color: #1a1916; }
    .log-table td { font-size: 12px; vertical-align: top; }
    .log-table tr:nth-child(even) td { background: #f9f8f5; }
    .actor-landlord { color: #1a3a6b; font-weight: 600; }
    .actor-tenant { color: #1a6b4a; font-weight: 600; }
    .actor-system { color: #6b6860; font-style: italic; }
    .legal-notice { margin-top: 32px; padding: 16px 20px; border: 1px solid #e8e6df; border-radius: 8px; background: #fafaf8; font-size: 11.5px; color: #6b6860; line-height: 1.7; }
    .legal-notice strong { color: #1a1916; }
    .sig-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; padding-top: 24px; border-top: 2px solid #1a1916; }
    .sig-box .sig-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6860; margin-bottom: 32px; }
    .sig-box .sig-line { border-bottom: 1px solid #1a1916; margin-bottom: 6px; }
    .sig-box .sig-name { font-size: 12px; font-weight: 600; }
    .sig-box .sig-role { font-size: 11px; color: #6b6860; }
    @media print {
      body { background: #fff; }
      .sheet { border: 0; border-radius: 0; padding: 28px 24px; }
      .grace-block { break-inside: avoid; }
      .sig-footer { break-inside: avoid; }
    }
  `;

  const logRows = data.auditLogs
    .map((log) => {
      const actorClass =
        log.actorType === "LANDLORD" ? "actor-landlord"
        : log.actorType === "TENANT" ? "actor-tenant"
        : "actor-system";
      return `<tr>
        <td style="white-space:nowrap">${new Date(log.timestamp).toLocaleString("en-GB")}</td>
        <td>${escapeHtml(log.action.replace(/_/g, " "))}</td>
        <td><span class="${actorClass}">${escapeHtml(log.actorName ?? log.actorType)}</span></td>
      </tr>`;
    })
    .join("");

  const gp = data.gracePeriod;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rent Default Audit Trail — DoorRent</title>
  <style>${auditStyles}</style>
</head>
<body>
<div class="sheet">

  <div class="doc-header">
    <div class="doc-header-top">
      <div>
        <div class="doc-subtitle">DoorRent · Property Management Platform</div>
        <div class="doc-title">Rent Default Audit Trail</div>
        <div style="font-size:13px;color:#6b6860;margin-top:4px">
          Official record of all actions, decisions and communications for this default case.
        </div>
      </div>
      <div class="doc-ref">
        <div class="label">Case Reference</div>
        <div class="value">${escapeHtml(data.id)}</div>
        <div style="margin-top:8px">
          <div class="label">Exported</div>
          <div class="value">${exportedOn} at ${exportedTime}</div>
        </div>
        <div style="margin-top:8px">
          <div class="label">Case Status</div>
          <div class="value" style="text-transform:uppercase;letter-spacing:0.05em">${escapeHtml(data.status.replace(/_/g, " "))}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section-title">Parties to this Default Case</div>
  <div class="party-grid">
    <div class="party-box">
      <div class="party-role">Tenant (Defaulting Party)</div>
      <div class="party-name">${escapeHtml(data.tenant.name)}</div>
      <div class="party-detail">
        ${escapeHtml(data.tenant.email)}
        ${data.tenant.phone ? `<br/>${escapeHtml(data.tenant.phone)}` : ""}
        ${data.tenant.address ? `<br/>${escapeHtml(data.tenant.address)}` : ""}
      </div>
    </div>
    <div class="party-box">
      <div class="party-role">Property / Unit</div>
      <div class="party-name">${escapeHtml(data.property.name)}</div>
      <div class="party-detail">
        ${escapeHtml(data.property.address)}
        ${data.unit ? `<br/>Unit: <strong>${escapeHtml(data.unit)}</strong>` : ""}
      </div>
    </div>
  </div>

  <div class="section-title">Default Summary</div>
  <div class="grid" style="margin-bottom:20px">
    <div class="box"><div class="label">Outstanding Amount</div><div class="value" style="color:#9b2a1a">${money(data.outstandingAmount, data.currency)}</div></div>
    <div class="box"><div class="label">Case Opened</div><div class="value">${fmt(data.createdAt)}</div></div>
    <div class="box"><div class="label">Current Status</div><div class="value">${escapeHtml(data.status.replace(/_/g, " "))}</div></div>
    <div class="box"><div class="label">Case Closed</div><div class="value">${data.resolvedAt ? fmt(data.resolvedAt) : "Still active"}</div></div>
  </div>

  ${gp ? `
  <div class="section-title">Grace Period Agreement</div>
  <div class="grace-block">
    <div class="grace-title">
      ⚖ Agreed Grace Period Terms
    </div>
    <div class="grace-grid">
      <div class="grace-item">
        <div class="label">Payment Deadline</div>
        <div class="value deadline">${fmt(gp.newDeadline)}</div>
      </div>
      <div class="grace-item">
        <div class="label">Amount to be Paid</div>
        <div class="value">${money(gp.agreedAmount, data.currency)}</div>
      </div>
      <div class="grace-item">
        <div class="label">Grace Period Initiated</div>
        <div class="value">${fmt(gp.initiatedAt)}</div>
      </div>
    </div>

    ${gp.notes ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e8c84a;font-size:12.5px;color:#5a4a00"><strong>Terms &amp; Notes:</strong> ${escapeHtml(gp.notes)}</div>` : ""}

    <div class="ack-row" style="margin-top:14px">
      <div class="ack-cell">
        <div class="label">Landlord Acknowledgement</div>
        <div class="value ${gp.landlordAcknowledgedAt ? "signed" : "pending"}">${gp.landlordAcknowledgedAt ? `✓ ${fmt(gp.landlordAcknowledgedAt)}` : "Pending"}</div>
      </div>
      <div class="ack-cell">
        <div class="label">Tenant Signature</div>
        <div class="value ${gp.tenantSignedAt ? "signed" : "pending"}">${gp.tenantSignedAt ? `✓ ${fmt(gp.tenantSignedAt)}` : "Pending"}</div>
      </div>
      <div class="ack-cell">
        <div class="label">Tenant Acknowledgement</div>
        <div class="value ${gp.tenantAcknowledgedAt ? "signed" : "pending"}">${gp.tenantAcknowledgedAt ? `✓ ${fmt(gp.tenantAcknowledgedAt)}` : "Pending"}</div>
      </div>
      <div class="ack-cell">
        <div class="label">Workflow Status</div>
        <div class="value">${gp.workflowStatus ? escapeHtml(gp.workflowStatus.replace(/_/g, " ")) : "—"}</div>
      </div>
    </div>

    <div style="margin-top:14px;padding:10px 14px;background:#fff3cd;border-radius:6px;font-size:12px;color:#7a5a00;border:1px solid #e8c84a">
      <strong>Payment Deadline Notice:</strong> The tenant is required to settle the outstanding amount of
      <strong>${money(gp.agreedAmount, data.currency)}</strong> in full by
      <strong>${fmt(gp.newDeadline)}</strong>. Failure to pay by this date constitutes a breach of the
      agreed grace period terms and may result in escalation to legal proceedings.
    </div>
  </div>
  ` : ""}

  <div class="section-title">Complete Audit Trail — ${data.auditLogs.length} Event${data.auditLogs.length !== 1 ? "s" : ""}</div>
  ${
    data.auditLogs.length
      ? `<table class="log-table">
    <thead>
      <tr>
        <th style="width:160px">Date &amp; Time</th>
        <th>Event</th>
        <th style="width:160px">Actioned By</th>
      </tr>
    </thead>
    <tbody>${logRows}</tbody>
  </table>`
      : `<p style="color:#6b6860;font-size:13px;font-style:italic">No audit events have been recorded for this case.</p>`
  }

  <div class="legal-notice">
    <strong>Legal Disclaimer:</strong> This document is an auto-generated record produced by the DoorRent property management platform (a subsidiary of ReSuply Technologies Limited) and reflects the chronological history of actions taken within the platform for this default case. It is intended for use as supporting evidence in landlord-tenant dispute resolution proceedings, regulatory inquiries, or legal action. The accuracy of this record is contingent on the data entered into the platform by the respective parties. DoorRent does not accept liability for errors arising from data input by users. This document should be presented alongside any formal tenancy agreement, payment receipts, and applicable legal instruments.
  </div>

  <div class="sig-footer">
    <div class="sig-box">
      <div class="sig-label">Landlord / Authorised Representative</div>
      <div class="sig-line">&nbsp;</div>
      <div class="sig-name">Signature &amp; Date</div>
      <div class="sig-role">Landlord — DoorRent Platform</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Witness / Compliance Officer</div>
      <div class="sig-line">&nbsp;</div>
      <div class="sig-name">Signature &amp; Date</div>
      <div class="sig-role">Authorised Witness</div>
    </div>
  </div>

  <div style="margin-top:24px;text-align:center;font-size:11px;color:#9b8e7a;border-top:1px solid #e8e6df;padding-top:12px">
    DoorRent · Subsidiary of ReSuply Technologies Limited · Case ID: ${escapeHtml(data.id)} · Exported ${exportedOn}
  </div>

</div>
</body>
</html>`;

  printViaIframe(html, "__audit-export-print-frame");
}
