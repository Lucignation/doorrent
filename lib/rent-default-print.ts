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
  tenant: { name: string; email: string };
  property: { name: string; address: string };
  unit: string | null;
  outstandingAmount: number;
  currency: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  auditLogs: Array<{
    action: string; actorType: string; actorName: string | null;
    metadata: unknown; timestamp: string;
  }>;
}

export function printAuditExport(data: AuditExportData) {
  if (typeof window === "undefined") return;

  const logRows = data.auditLogs
    .map(
      (log) => `<tr>
      <td>${new Date(log.timestamp).toLocaleString("en-GB")}</td>
      <td>${escapeHtml(log.action.replace(/_/g, " "))}</td>
      <td>${escapeHtml(log.actorType)}</td>
      <td>${escapeHtml(log.actorName ?? "—")}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Default Case Audit Export — DoorRent</title>
  <style>${baseStyles}</style>
</head>
<body>
<div class="sheet">
  <div class="brand">
    <div>
      <span class="pill green">Audit Trail Export</span>
      <h1>Rent Default Case</h1>
      <p>DoorRent — Subsidiary of ReSuply Technologies Limited</p>
    </div>
    <div style="text-align:right">
      <div class="label">Exported</div>
      <div class="value">${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box"><div class="label">Tenant</div><div class="value">${escapeHtml(data.tenant.name)}</div><div style="color:#6b6860;font-size:13px">${escapeHtml(data.tenant.email)}</div></div>
    <div class="box"><div class="label">Property</div><div class="value">${escapeHtml(data.property.name)}</div>${data.unit ? `<div style="color:#6b6860;font-size:13px">Unit: ${escapeHtml(data.unit)}</div>` : ""}</div>
    <div class="box"><div class="label">Outstanding Amount</div><div class="value">${money(data.outstandingAmount, data.currency)}</div></div>
    <div class="box"><div class="label">Status</div><div class="value">${escapeHtml(data.status.replace(/_/g, " "))}</div></div>
    <div class="box"><div class="label">Case Opened</div><div class="value">${fmt(data.createdAt)}</div></div>
    <div class="box"><div class="label">Resolved</div><div class="value">${data.resolvedAt ? fmt(data.resolvedAt) : "Ongoing"}</div></div>
  </div>

  <h2>Full Activity Log (${data.auditLogs.length} events)</h2>
  ${
    data.auditLogs.length
      ? `<table>
    <thead><tr><th>Timestamp</th><th>Action</th><th>Actor Type</th><th>Actor</th></tr></thead>
    <tbody>${logRows}</tbody>
  </table>`
      : `<p style="color:#6b6860;font-size:13px">No audit events recorded.</p>`
  }

  <div class="footer">
    Exported from DoorRent · Case ID: ${escapeHtml(data.id)}
  </div>
</div>
</body>
</html>`;

  printViaIframe(html, "__audit-export-print-frame");
}
