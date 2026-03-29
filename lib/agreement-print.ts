import {
  canRenderSignaturePreview,
  resolveSignatureDisplayUrl,
} from "./signature-data";

function esc(value: string | null | undefined) {
  if (!value) return "—";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtMoney(amount: number | null | undefined, currency = "NGN") {
  if (!amount) return "—";
  return `${currency} ${amount.toLocaleString("en-NG")}`;
}

function fmtMoneyWords(amount: number | null | undefined) {
  if (!amount) return "";
  // Basic naira word conversion for common ranges
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function toWords(n: number): string {
    if (n === 0) return "Zero";
    if (n < 20) return units[n] ?? "";
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? " " + units[n % 10] : ""}`;
    if (n < 1000) return `${units[Math.floor(n / 100)]} Hundred${n % 100 ? " " + toWords(n % 100) : ""}`;
    if (n < 1_000_000) return `${toWords(Math.floor(n / 1000))} Thousand${n % 1000 ? " " + toWords(n % 1000) : ""}`;
    if (n < 1_000_000_000) return `${toWords(Math.floor(n / 1_000_000))} Million${n % 1_000_000 ? " " + toWords(n % 1_000_000) : ""}`;
    return n.toLocaleString();
  }

  return toWords(Math.round(amount));
}

function isRenderableSignatureUri(value: string | null | undefined) {
  return canRenderSignaturePreview(value);
}

function leaseDurationText(startIso: string, endIso: string) {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    if (months >= 12 && months % 12 === 0) {
      const yrs = months / 12;
      return `${yrs} ${yrs === 1 ? "year" : "years"}`;
    }
    return `${months} ${months === 1 ? "month" : "months"}`;
  } catch {
    return "—";
  }
}

export interface AgreementPrintData {
  agreementRef: string;
  generatedAt: string;

  landlord: {
    companyName: string;
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    signatureDataUrl?: string | null;
    signedDate?: string | null;
  };

  tenant: {
    name: string;
    email: string;
    phone?: string | null;
    residentialAddress?: string | null;
    idType?: string | null;
    idNumber?: string | null;
    signatureDataUrl?: string | null;
    signedDate?: string | null;
  };

  premises: {
    propertyName: string;
    address: string;
    unitNumber?: string | null;
    description?: string | null;
  };

  lease: {
    title: string;
    startDate: string;
    endDate: string;
  };

  financial: {
    annualRent: number;
    billingFrequency: string;
    billingFrequencyLabel: string;
    billingCyclePrice: number;
    billingSchedule: string;
    depositAmount?: number | null;
    serviceCharge?: number | null;
  };

  conditions?: {
    noticePeriodDays?: number | null;
    utilities?: string | null;
    permittedUse?: string | null;
    specialConditions?: string | null;
  } | null;

  guarantor?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    relationship?: string | null;
    occupation?: string | null;
    company?: string | null;
    address?: string | null;
    signatureDataUrl?: string | null;
    witnessDate?: string | null;
  } | null;

  landlordWitness?: {
    name?: string | null;
    address?: string | null;
    signatureDataUrl?: string | null;
    witnessDate?: string | null;
  } | null;

  notes?: string | null;
  templateName?: string | null;
}

export function buildAgreementHtml(data: AgreementPrintData): string {

  const duration = leaseDurationText(data.lease.startDate, data.lease.endDate);
  const noticeDays = data.conditions?.noticePeriodDays ?? 30;
  const hasGuarantor = Boolean(data.guarantor?.name);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(data.lease.title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    color: #111;
    background: #fff;
    padding: 0;
  }

  /* ── Page setup ── */
  @page {
    size: A4;
    margin: 25mm 20mm 25mm 25mm;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; break-before: page; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
  }
  @media screen {
    body { background: #e8e6df; padding: 20px 0 40px; }
    .page {
      max-width: 210mm;
      margin: 0 auto 32px;
      padding: 25mm 20mm 25mm 25mm;
      background: #fff;
      box-shadow: 0 2px 24px rgba(0,0,0,0.12);
    }
    @media (max-width: 600px) {
      .page { padding: 16px 12px 24px; }
    }
  }

  /* ── Running header (screen only, not print) ── */
  .running-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #ccc;
    padding-bottom: 6pt;
    margin-bottom: 18pt;
    font-size: 8pt;
    color: #555;
    letter-spacing: 0.03em;
  }

  /* ── Cover page ── */
  .cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 240mm;
    text-align: center;
  }
  .cover-brand {
    font-size: 11pt;
    font-weight: bold;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #444;
    border: 1px solid #aaa;
    padding: 6pt 18pt;
    margin-bottom: 36pt;
  }
  .cover-title {
    font-size: 22pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 10pt;
    line-height: 1.3;
  }
  .cover-subtitle {
    font-size: 13pt;
    color: #333;
    margin-bottom: 28pt;
  }
  .cover-rule { width: 80mm; height: 1.5px; background: #111; margin: 20pt auto; }
  .cover-party-label {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #777;
    margin-bottom: 5pt;
  }
  .cover-party-name {
    font-size: 13pt;
    font-weight: bold;
    margin-bottom: 3pt;
  }
  .cover-party-sub {
    font-size: 10pt;
    color: #444;
  }
  .cover-between { font-size: 10pt; color: #555; margin: 12pt 0; font-style: italic; }
  .cover-premises {
    margin-top: 28pt;
    padding: 12pt 20pt;
    border: 1px solid #bbb;
    font-size: 10pt;
    text-align: center;
    line-height: 1.6;
  }
  .cover-meta {
    margin-top: 28pt;
    font-size: 9pt;
    color: #666;
    line-height: 1.8;
  }
  .cover-seal {
    margin-top: 36pt;
    font-size: 8pt;
    color: #999;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-style: italic;
  }

  /* ── Section headings ── */
  h1.section-heading {
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 2px solid #111;
    padding-bottom: 5pt;
    margin-bottom: 14pt;
    margin-top: 0;
  }
  h2.sub-heading {
    font-size: 11pt;
    font-weight: bold;
    margin: 16pt 0 8pt;
    text-decoration: underline;
    text-underline-offset: 3pt;
  }
  h3.clause-heading {
    font-size: 11pt;
    font-weight: bold;
    margin: 12pt 0 6pt;
  }

  /* ── Party blocks ── */
  .party-block {
    border: 1px solid #ccc;
    padding: 12pt 14pt;
    margin-bottom: 10pt;
    background: #fafafa;
  }
  .party-block-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #777;
    margin-bottom: 7pt;
    font-family: Arial, sans-serif;
  }
  .party-name {
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 5pt;
  }
  .party-detail {
    font-size: 10pt;
    line-height: 1.7;
    color: #333;
  }

  /* ── Definition list ── */
  .def-item { margin-bottom: 10pt; }
  .def-term { font-weight: bold; }
  .def-desc { margin-left: 20pt; }

  /* ── Financial table ── */
  .fin-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10pt 0 16pt;
    font-size: 10.5pt;
  }
  .fin-table th {
    background: #f0eeea;
    border: 1px solid #ccc;
    padding: 7pt 10pt;
    text-align: left;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: Arial, sans-serif;
  }
  .fin-table td {
    border: 1px solid #ccc;
    padding: 7pt 10pt;
    vertical-align: top;
  }
  .fin-table tr:nth-child(even) td { background: #fafaf8; }
  .fin-highlight td {
    font-weight: bold;
    font-size: 11.5pt;
    background: #f0eeea !important;
  }

  /* ── Obligations list ── */
  ol.obligations {
    padding-left: 20pt;
    margin: 0 0 12pt;
  }
  ol.obligations li {
    margin-bottom: 7pt;
    line-height: 1.65;
    font-size: 10.5pt;
  }
  ol.obligations li::marker {
    font-weight: bold;
  }

  /* ── Signature page ── */
  .sig-block {
    margin-bottom: 28pt;
  }
  .sig-label {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #555;
    font-family: Arial, sans-serif;
    margin-bottom: 4pt;
  }
  .sig-name { font-size: 11pt; font-weight: bold; margin-bottom: 3pt; }
  .sig-line {
    border-bottom: 1px solid #333;
    height: 32pt;
    margin: 14pt 0 6pt;
    width: 100%;
  }
  .sig-date-line {
    border-bottom: 1px solid #999;
    height: 22pt;
    margin: 10pt 0 4pt;
    width: 60%;
  }
  .sig-img {
    display: block;
    height: 48pt;
    max-width: 200pt;
    margin: 10pt 0 4pt;
    object-fit: contain;
  }
  .sig-meta { font-size: 9pt; color: #555; margin-top: 4pt; line-height: 1.6; }
  .sig-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40pt;
    margin-bottom: 28pt;
  }
  @media (max-width: 600px) {
    .sig-pair {
      grid-template-columns: 1fr;
      gap: 20pt;
    }
  }

  /* ── Attestation ── */
  .attestation {
    border: 1px solid #bbb;
    padding: 12pt 16pt;
    font-size: 9.5pt;
    line-height: 1.75;
    margin-top: 20pt;
    background: #fafaf8;
    font-style: italic;
  }

  /* ── Footer ── */
  .doc-footer {
    font-size: 8pt;
    color: #888;
    text-align: center;
    margin-top: 24pt;
    padding-top: 8pt;
    border-top: 1px solid #ddd;
    letter-spacing: 0.03em;
  }

  /* ── Inline bold/note helpers ── */
  .note { font-size: 9.5pt; color: #555; font-style: italic; margin: 6pt 0 10pt; }
  p { line-height: 1.7; margin-bottom: 9pt; font-size: 10.5pt; }
  .spacer { height: 12pt; }
  .inline-label { font-weight: bold; }

  /* ── Print button (screen only) ── */
  .print-bar {
    max-width: 210mm;
    margin: 0 auto 12px;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .print-bar button {
    padding: 8px 22px;
    background: #1a3a2a;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: Arial, sans-serif;
  }
  .print-bar button:hover { background: #1f4a35; }
  .print-bar .ref-badge {
    font-size: 11px;
    color: #666;
    font-family: Arial, sans-serif;
  }
</style>
</head>
<body>

<div class="print-bar no-print">
  <button onclick="window.print()">⎙ Print / Save as PDF</button>
  <span class="ref-badge">Ref: ${esc(data.agreementRef)} &nbsp;·&nbsp; Generated: ${esc(data.generatedAt)}</span>
</div>

<!-- ═══════════════════════════════════════════════════ -->
<!-- PAGE 1 — COVER                                      -->
<!-- ═══════════════════════════════════════════════════ -->
<div class="page">
  <div class="cover">
    <div class="cover-brand">DoorRent — Property Management Platform</div>

    <div class="cover-title">Residential Tenancy<br>Agreement</div>
    <div class="cover-subtitle">${esc(data.lease.title)}</div>
    <div class="cover-rule"></div>

    <div class="cover-party-label">Landlord</div>
    <div class="cover-party-name">${esc(data.landlord.companyName)}</div>
    <div class="cover-party-sub">${esc(data.landlord.email)}</div>

    <div class="cover-between">— and —</div>

    <div class="cover-party-label">Tenant</div>
    <div class="cover-party-name">${esc(data.tenant.name)}</div>
    <div class="cover-party-sub">${esc(data.tenant.email)}</div>

    <div class="cover-premises">
      <strong>PREMISES</strong><br>
      ${esc(data.premises.unitNumber ? `Unit ${data.premises.unitNumber} — ` : "")}${esc(data.premises.propertyName)}<br>
      ${esc(data.premises.address)}
    </div>

    <div class="cover-meta">
      Tenancy Period: <strong>${fmtDate(data.lease.startDate)}</strong> to <strong>${fmtDate(data.lease.endDate)}</strong> (${esc(duration)})<br>
      Annual Rent: <strong>${fmtMoney(data.financial.annualRent)}</strong><br>
      Agreement Reference: <strong>${esc(data.agreementRef)}</strong>
    </div>

    <div class="cover-seal">This document was generated by DoorRent · ${esc(data.generatedAt)}</div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ -->
<!-- PAGE 2 — PARTIES, PREMISES & DEFINITIONS           -->
<!-- ═══════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="running-header">
    <span>RESIDENTIAL TENANCY AGREEMENT</span>
    <span>Ref: ${esc(data.agreementRef)}</span>
  </div>

  <h1 class="section-heading">1. Parties to this Agreement</h1>

  <div class="party-block avoid-break">
    <div class="party-block-label">Landlord</div>
    <div class="party-name">${esc(data.landlord.companyName)}</div>
    <div class="party-detail">
      Contact Person: ${esc(data.landlord.name)}<br>
      Email: ${esc(data.landlord.email)}<br>
      ${data.landlord.phone ? `Phone: ${esc(data.landlord.phone)}<br>` : ""}
      ${data.landlord.address ? `Address: ${esc(data.landlord.address)}<br>` : ""}
    </div>
  </div>

  <div class="party-block avoid-break">
    <div class="party-block-label">Tenant</div>
    <div class="party-name">${esc(data.tenant.name)}</div>
    <div class="party-detail">
      Email: ${esc(data.tenant.email)}<br>
      ${data.tenant.phone ? `Phone: ${esc(data.tenant.phone)}<br>` : ""}
      ${data.tenant.residentialAddress ? `Current Residential Address: ${esc(data.tenant.residentialAddress)}<br>` : ""}
      ${data.tenant.idType && data.tenant.idNumber ? `Means of ID: ${esc(data.tenant.idType)} — ${esc(data.tenant.idNumber)}<br>` : ""}
    </div>
  </div>

  ${hasGuarantor ? `
  <div class="party-block avoid-break">
    <div class="party-block-label">Guarantor</div>
    <div class="party-name">${esc(data.guarantor!.name)}</div>
    <div class="party-detail">
      ${data.guarantor!.phone ? `Phone: ${esc(data.guarantor!.phone)}<br>` : ""}
      ${data.guarantor!.email ? `Email: ${esc(data.guarantor!.email)}<br>` : ""}
      ${data.guarantor!.relationship ? `Relationship to Tenant: ${esc(data.guarantor!.relationship)}<br>` : ""}
      ${data.guarantor!.occupation ? `Occupation: ${esc(data.guarantor!.occupation)}<br>` : ""}
      ${data.guarantor!.company ? `Employer/Company: ${esc(data.guarantor!.company)}<br>` : ""}
      ${data.guarantor!.address ? `Address: ${esc(data.guarantor!.address)}<br>` : ""}
    </div>
  </div>
  ` : ""}

  <div class="spacer"></div>
  <h1 class="section-heading">2. Premises</h1>

  <div class="party-block avoid-break">
    <div class="party-block-label">Property</div>
    <div class="party-name">${esc(data.premises.propertyName)}${data.premises.unitNumber ? ` — Unit ${esc(data.premises.unitNumber)}` : ""}</div>
    <div class="party-detail">
      Address: ${esc(data.premises.address)}<br>
      ${data.premises.description ? `Description: ${esc(data.premises.description)}<br>` : ""}
      Permitted Use: ${esc(data.conditions?.permittedUse ?? "Residential dwelling only")}
    </div>
  </div>

  <div class="spacer"></div>
  <h1 class="section-heading">3. Definitions</h1>

  <div class="def-item avoid-break">
    <span class="def-term">"Agreement"</span> means this Residential Tenancy Agreement and all schedules and annexures hereto.
  </div>
  <div class="def-item avoid-break">
    <span class="def-term">"Commencement Date"</span> means <strong>${fmtDate(data.lease.startDate)}</strong>, being the date on which the tenancy begins.
  </div>
  <div class="def-item avoid-break">
    <span class="def-term">"Termination Date"</span> means <strong>${fmtDate(data.lease.endDate)}</strong>, being the date on which the tenancy expires unless renewed by written agreement.
  </div>
  <div class="def-item avoid-break">
    <span class="def-term">"Landlord"</span> means <strong>${esc(data.landlord.companyName)}</strong> as described in Clause 1.
  </div>
  <div class="def-item avoid-break">
    <span class="def-term">"Tenant"</span> means <strong>${esc(data.tenant.name)}</strong> as described in Clause 1.
  </div>
  <div class="def-item avoid-break">
    <span class="def-term">"Premises"</span> means the residential property described in Clause 2.
  </div>
  <div class="def-item avoid-break">
    <span class="def-term">"Rent"</span> means the sum of <strong>${fmtMoney(data.financial.annualRent)}</strong> (${esc(fmtMoneyWords(data.financial.annualRent))} Naira) per annum, payable in the manner described in Clause 4.
  </div>
  <div class="def-item avoid-break">
    <span class="def-term">"Security Deposit"</span> means the sum of <strong>${fmtMoney(data.financial.depositAmount)}</strong> payable by the Tenant as security for performance of this Agreement.
  </div>
  ${hasGuarantor ? `
  <div class="def-item avoid-break">
    <span class="def-term">"Guarantor"</span> means <strong>${esc(data.guarantor!.name)}</strong>, who jointly and severally guarantees the Tenant's obligations under this Agreement.
  </div>
  ` : ""}
  <div class="def-item avoid-break">
    <span class="def-term">"Notice Period"</span> means a minimum of <strong>${noticeDays} (${esc(fmtMoneyWords(noticeDays))}) days</strong> written notice required by either party for termination or non-renewal.
  </div>

  <div class="doc-footer">
    ${esc(data.lease.title)} &nbsp;·&nbsp; ${esc(data.agreementRef)} &nbsp;·&nbsp; Page 2
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ -->
<!-- PAGE 3 — FINANCIAL TERMS                           -->
<!-- ═══════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="running-header">
    <span>RESIDENTIAL TENANCY AGREEMENT &nbsp;·&nbsp; ${esc(data.tenant.name)}</span>
    <span>Ref: ${esc(data.agreementRef)}</span>
  </div>

  <h1 class="section-heading">4. Rent, Deposit & Financial Terms</h1>

  <table class="fin-table">
    <thead>
      <tr><th>Item</th><th>Details</th></tr>
    </thead>
    <tbody>
      <tr class="fin-highlight">
        <td>Annual Rent</td>
        <td>${fmtMoney(data.financial.annualRent)}<br><small style="font-weight:normal;font-size:9pt;">${esc(fmtMoneyWords(data.financial.annualRent))} Naira Only</small></td>
      </tr>
      <tr>
        <td>Payment Frequency</td>
        <td>${esc(data.financial.billingFrequencyLabel)} — ${esc(data.financial.billingSchedule)}</td>
      </tr>
      <tr>
        <td>Amount Per Payment Cycle</td>
        <td>${fmtMoney(data.financial.billingCyclePrice)}</td>
      </tr>
      ${data.financial.depositAmount ? `
      <tr>
        <td>Security Deposit</td>
        <td>${fmtMoney(data.financial.depositAmount)}<br><small style="font-size:9pt;">${esc(fmtMoneyWords(data.financial.depositAmount))} Naira Only</small></td>
      </tr>` : ""}
      ${data.financial.serviceCharge ? `
      <tr>
        <td>Service Charge</td>
        <td>${fmtMoney(data.financial.serviceCharge)} per annum</td>
      </tr>` : ""}
      <tr>
        <td>Tenancy Commencement</td>
        <td>${fmtDate(data.lease.startDate)}</td>
      </tr>
      <tr>
        <td>Tenancy Expiry</td>
        <td>${fmtDate(data.lease.endDate)}</td>
      </tr>
      <tr>
        <td>Duration</td>
        <td>${esc(duration)}</td>
      </tr>
    </tbody>
  </table>

  <p>
    <span class="inline-label">4.1 Payment Obligation.</span> The Tenant shall pay the Rent to the Landlord strictly on or before the due date for each payment cycle commencing from the Commencement Date. Rent shall be paid by bank transfer or through the DoorRent payment portal. Receipts shall be issued upon each confirmed payment.
  </p>
  <p>
    <span class="inline-label">4.2 Late Payment.</span> If Rent is not received within <strong>seven (7) calendar days</strong> of the due date, the Landlord shall issue a formal payment demand notice. If the arrears remain unpaid within <strong>fourteen (14) calendar days</strong> of that demand, the Landlord shall be entitled to initiate recovery proceedings in accordance with Clause 10 of this Agreement.
  </p>
  <p>
    <span class="inline-label">4.3 Security Deposit.</span> The Security Deposit shall be paid by the Tenant on or before the Commencement Date. It shall be held as security for the Tenant's performance of obligations under this Agreement and shall not be applied in lieu of Rent. The deposit shall be refunded within <strong>thirty (30) days</strong> of vacant possession, less any deductions for: (a) unpaid rent or charges; (b) damage beyond fair wear and tear; (c) cost of professional cleaning; (d) any other amounts owed under this Agreement.
  </p>
  <p>
    <span class="inline-label">4.4 Rent Review.</span> The Landlord reserves the right to review the Rent at the time of renewal. Any rent increase shall be communicated in writing at least <strong>sixty (60) days</strong> before the commencement of a new tenancy period.
  </p>
  ${data.financial.serviceCharge ? `<p><span class="inline-label">4.5 Service Charge.</span> The Tenant shall pay a service charge of ${fmtMoney(data.financial.serviceCharge)} per annum, payable in the same manner as Rent, to cover the Landlord's or estate management's costs of maintaining common areas and shared facilities.</p>` : ""}

  <div class="spacer"></div>
  <h1 class="section-heading">5. Utilities & Services</h1>

  <p>
    <span class="inline-label">5.1</span> The following utilities and services are the sole responsibility of the Tenant and shall be managed and paid for directly by the Tenant:
  </p>
  <ol class="obligations" style="list-style:disc;">
    ${data.conditions?.utilities
      ? data.conditions.utilities.split("\n").filter(Boolean).map(line => `<li>${esc(line.trim())}</li>`).join("")
      : `<li>Electricity supply (PHCN/EKEDC/IKEDC — Tenant manages own prepaid or post-paid meter)</li>
         <li>Water supply (municipal bill or estate water levy, as applicable)</li>
         <li>Internet and cable television subscriptions</li>
         <li>Generator fuel (Tenant's proportionate share, as agreed with estate management)</li>
         <li>Refuse disposal levies charged by the local government authority</li>`}
  </ol>

  <p>
    <span class="inline-label">5.2</span> Any shared utility arrangements or estate management service fees shall be governed by the estate's own rules, a copy of which has been or will be made available to the Tenant by the Landlord.
  </p>

  <div class="doc-footer">
    ${esc(data.lease.title)} &nbsp;·&nbsp; ${esc(data.agreementRef)} &nbsp;·&nbsp; Page 3
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ -->
<!-- PAGE 4 — OBLIGATIONS                               -->
<!-- ═══════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="running-header">
    <span>RESIDENTIAL TENANCY AGREEMENT &nbsp;·&nbsp; ${esc(data.tenant.name)}</span>
    <span>Ref: ${esc(data.agreementRef)}</span>
  </div>

  <h1 class="section-heading">6. Tenant's Obligations</h1>
  <p>The Tenant covenants with the Landlord as follows throughout the Term:</p>
  <ol class="obligations">
    <li>To pay the Rent and all other sums due under this Agreement on the due dates and in the manner agreed, without deduction or set-off.</li>
    <li>To use the Premises solely as a private residential dwelling for the Tenant and approved members of the Tenant's immediate household. No commercial, business, or industrial activity shall be conducted on the Premises without the Landlord's prior written consent.</li>
    <li>To keep the Premises, including all fittings, fixtures, and appliances, in a clean, sanitary, and good state of repair at all times, and to promptly report to the Landlord any defects, damage, or required repairs.</li>
    <li>Not to make any structural alterations, additions, or improvements to the Premises without the Landlord's prior written consent. Any consented improvements shall, unless otherwise agreed, become the property of the Landlord upon expiry of the tenancy.</li>
    <li>Not to sublet, assign, licence, or part with possession of the Premises or any part thereof to any third party without the Landlord's prior written consent.</li>
    <li>Not to keep any pets, livestock, or animals on the Premises without the Landlord's prior written consent.</li>
    <li>Not to use the Premises for any illegal, immoral, or unlawful purpose, or in any manner that constitutes a nuisance, annoyance, or disturbance to neighbouring occupants or the public.</li>
    <li>To permit the Landlord or the Landlord's authorised agents to enter and inspect the Premises at reasonable times upon giving at least <strong>twenty-four (24) hours'</strong> prior written notice, except in cases of emergency where immediate access is required.</li>
    <li>To comply with all applicable laws, regulations, by-laws, and estate or building management rules in connection with the occupation and use of the Premises.</li>
    <li>To insure the Tenant's personal belongings and contents at the Premises. The Landlord's insurance does not cover the Tenant's personal property.</li>
    <li>To return the Premises to the Landlord on or before the Termination Date in the same condition as at the Commencement Date, fair wear and tear excepted, and to deliver all keys, access cards, remote controls, and other property of the Landlord upon vacation.</li>
    <li>To give the Landlord not less than <strong>${noticeDays} (${esc(fmtMoneyWords(noticeDays))}) days'</strong> written notice of the Tenant's intention not to renew this Agreement.</li>
    <li>Not to change the locks or security systems without the Landlord's prior written consent and providing copies of any new keys to the Landlord immediately.</li>
  </ol>

  <div class="spacer"></div>
  <h1 class="section-heading">7. Landlord's Obligations</h1>
  <p>The Landlord covenants with the Tenant as follows:</p>
  <ol class="obligations">
    <li>To allow the Tenant quiet enjoyment of the Premises during the Term, without interference, provided the Tenant is not in breach of this Agreement.</li>
    <li>To maintain the structural integrity of the Premises in a habitable condition, including the roof, external walls, and primary plumbing and electrical installations.</li>
    <li>To attend to major structural repairs within a reasonable time upon written notification from the Tenant, unless the damage was caused by the Tenant's negligence or misuse.</li>
    <li>Not to enter the Premises without giving the Tenant reasonable advance notice, except in genuine emergencies.</li>
    <li>To issue written receipts or payment confirmation for all Rent received from the Tenant.</li>
    <li>To notify the Tenant in writing of any proposed changes to the Rent or terms of the Agreement at least sixty (60) days in advance of such changes taking effect.</li>
    <li>To provide the Tenant with a copy of this executed Agreement and any amendments thereto.</li>
  </ol>

  <div class="doc-footer">
    ${esc(data.lease.title)} &nbsp;·&nbsp; ${esc(data.agreementRef)} &nbsp;·&nbsp; Page 4
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ -->
<!-- PAGE 5 — SPECIAL CONDITIONS, DEFAULT & LEGAL       -->
<!-- ═══════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="running-header">
    <span>RESIDENTIAL TENANCY AGREEMENT &nbsp;·&nbsp; ${esc(data.tenant.name)}</span>
    <span>Ref: ${esc(data.agreementRef)}</span>
  </div>

  ${data.conditions?.specialConditions ? `
  <h1 class="section-heading">8. Special Conditions</h1>
  <p>The following special conditions form part of this Agreement and shall prevail over any inconsistency with the standard terms:</p>
  <div style="border:1px solid #ccc;padding:12pt 14pt;margin-bottom:14pt;background:#fafaf8;font-size:10.5pt;line-height:1.7;white-space:pre-wrap;">${esc(data.conditions.specialConditions)}</div>
  ` : `
  <h1 class="section-heading">8. Special Conditions</h1>
  <p class="note">No special conditions have been recorded for this Agreement. The standard terms and conditions set out herein shall apply in full.</p>
  `}

  <h1 class="section-heading">9. Renewal & Holding Over</h1>
  <p>
    <span class="inline-label">9.1</span> This Agreement shall not automatically renew. The Tenant shall notify the Landlord in writing at least <strong>${noticeDays} (${esc(fmtMoneyWords(noticeDays))}) days</strong> before the Termination Date of their intention to renew. Renewal is subject to the Landlord's written acceptance and may be on revised terms.
  </p>
  <p>
    <span class="inline-label">9.2</span> If the Tenant continues to occupy the Premises after the Termination Date without a signed renewal agreement, the Tenant shall be treated as a monthly periodic tenant and the Landlord shall be entitled to charge holdover rent at a rate of up to <strong>150%</strong> of the monthly equivalent of the annual Rent, without prejudice to any other rights of the Landlord.
  </p>

  <h1 class="section-heading">10. Default & Legal Proceedings</h1>
  <p>
    <span class="inline-label">10.1 Events of Default.</span> The following shall constitute events of default under this Agreement: (a) failure to pay Rent within seven (7) days of the due date; (b) breach of any material obligation under this Agreement not remedied within fourteen (14) days of written notice; (c) use of the Premises for illegal purposes; (d) subletting without consent; (e) causing substantial damage to the Premises; (f) persistent nuisance or anti-social behaviour.
  </p>
  <p>
    <span class="inline-label">10.2 Landlord's Remedies.</span> Upon an event of default, the Landlord shall be entitled to issue a formal payment demand notice and, if unresolved, escalate to pre-legal proceedings including issuance of a Pre-Legal Demand Letter. All reasonable legal fees and recovery costs incurred by the Landlord shall be borne by the Tenant.
  </p>
  <p>
    <span class="inline-label">10.3 Recovery of Premises.</span> The Landlord may apply to a court of competent jurisdiction for an order for possession of the Premises, arrears of Rent, and damages, in accordance with applicable Nigerian law.
  </p>

  <h1 class="section-heading">11. Termination</h1>
  <p>
    <span class="inline-label">11.1 By Tenant.</span> The Tenant may terminate this Agreement before the Termination Date only with the Landlord's prior written consent and, unless otherwise agreed, shall forfeit the Security Deposit.
  </p>
  <p>
    <span class="inline-label">11.2 By Landlord.</span> The Landlord may terminate this Agreement and require the Tenant to vacate upon giving at least <strong>${noticeDays} (${esc(fmtMoneyWords(noticeDays))}) days'</strong> written notice, except in cases of gross breach or unlawful activity where immediate notice may be given in accordance with applicable law.
  </p>
  <p>
    <span class="inline-label">11.3 Peaceful Vacation.</span> Upon termination, the Tenant shall remove all personal belongings and return the Premises and all Landlord's property in the condition required under this Agreement. Any property left behind after the Termination Date may be disposed of by the Landlord.
  </p>

  <h1 class="section-heading">12. General Legal Provisions</h1>
  <p>
    <span class="inline-label">12.1 Governing Law.</span> This Agreement shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
  </p>
  <p>
    <span class="inline-label">12.2 Dispute Resolution.</span> Any dispute arising under this Agreement shall first be subject to good-faith negotiation between the parties. If unresolved within thirty (30) days, either party may refer the matter to a mediator or the court of competent jurisdiction in the state where the Premises is located.
  </p>
  <p>
    <span class="inline-label">12.3 Notices.</span> All notices under this Agreement shall be in writing, signed by the giving party, and delivered by email (with read receipt), courier, or hand delivery to the addresses stated in Clause 1.
  </p>
  <p>
    <span class="inline-label">12.4 Entire Agreement.</span> This Agreement constitutes the entire agreement between the parties and supersedes all prior representations, negotiations, and understandings, whether written or oral.
  </p>
  <p>
    <span class="inline-label">12.5 Amendments.</span> No amendment to this Agreement shall be binding unless made in writing and signed by both parties.
  </p>
  <p>
    <span class="inline-label">12.6 Severability.</span> If any provision of this Agreement is held to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect.
  </p>
  ${hasGuarantor ? `
  <p>
    <span class="inline-label">12.7 Guarantor's Liability.</span> The Guarantor, by executing this Agreement, unconditionally and irrevocably guarantees to the Landlord the due and punctual performance of all obligations of the Tenant under this Agreement, including the payment of all Rent and other sums due. The Guarantor's liability shall be joint and several with the Tenant and shall not be released by any variation of the terms of this Agreement made between the Landlord and the Tenant without the Guarantor's prior written consent.
  </p>` : ""}

  <div class="doc-footer">
    ${esc(data.lease.title)} &nbsp;·&nbsp; ${esc(data.agreementRef)} &nbsp;·&nbsp; Page 5
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ -->
<!-- PAGE 6 — EXECUTION & SIGNATURES                    -->
<!-- ═══════════════════════════════════════════════════ -->
<div class="page page-break">
  <div class="running-header">
    <span>RESIDENTIAL TENANCY AGREEMENT &nbsp;·&nbsp; ${esc(data.tenant.name)}</span>
    <span>Ref: ${esc(data.agreementRef)}</span>
  </div>

  <h1 class="section-heading">13. Execution</h1>

  <div class="attestation avoid-break">
    IN WITNESS WHEREOF, the parties hereto have duly executed this Residential Tenancy Agreement as of the date and year first written above, each party acknowledging that they have read, understood, and agreed to the terms and conditions contained herein and in all schedules hereto.
  </div>

  <div class="spacer"></div>

  <div class="sig-pair avoid-break">
    <div class="sig-block">
      <div class="sig-label">Signed by the Landlord</div>
      <div class="sig-name">${esc(data.landlord.companyName)}</div>
      <div class="sig-meta">
        Represented by: ${esc(data.landlord.name)}<br>
        Email: ${esc(data.landlord.email)}<br>
        ${data.landlord.phone ? `Phone: ${esc(data.landlord.phone)}<br>` : ""}
      </div>
      ${isRenderableSignatureUri(data.landlord.signatureDataUrl)
        ? `<div style="margin:10pt 0 4pt;"><img src="${resolveSignatureDisplayUrl(data.landlord.signatureDataUrl) ?? ""}" class="sig-img" alt="Landlord Signature" /></div>`
        : '<div class="sig-line"></div>'}
      <div class="sig-meta">Authorised Signature</div>
      ${data.landlord.signatureDataUrl && !isRenderableSignatureUri(data.landlord.signatureDataUrl)
        ? '<div class="sig-meta" style="margin-top:6pt;">Signed electronically via DoorRent</div>'
        : ""}
      ${data.landlord.signedDate
        ? `<div class="sig-meta" style="margin-top:6pt;">Date: <strong>${esc(data.landlord.signedDate)}</strong></div>`
        : '<div class="sig-date-line"></div><div class="sig-meta">Date</div>'}
    </div>

    <div class="sig-block">
      <div class="sig-label">Signed by the Tenant</div>
      <div class="sig-name">${esc(data.tenant.name)}</div>
      <div class="sig-meta">
        Email: ${esc(data.tenant.email)}<br>
        ${data.tenant.phone ? `Phone: ${esc(data.tenant.phone)}<br>` : ""}
        ${data.tenant.idType && data.tenant.idNumber ? `ID: ${esc(data.tenant.idType)} — ${esc(data.tenant.idNumber)}<br>` : ""}
      </div>
      ${isRenderableSignatureUri(data.tenant.signatureDataUrl)
        ? `<div style="margin:10pt 0 4pt;"><img src="${resolveSignatureDisplayUrl(data.tenant.signatureDataUrl) ?? ""}" class="sig-img" alt="Tenant Signature" /></div>`
        : '<div class="sig-line"></div>'}
      <div class="sig-meta">Tenant's Signature</div>
      ${data.tenant.signatureDataUrl && !isRenderableSignatureUri(data.tenant.signatureDataUrl)
        ? '<div class="sig-meta" style="margin-top:6pt;">Signed electronically via DoorRent</div>'
        : ""}
      ${data.tenant.signedDate
        ? `<div class="sig-meta" style="margin-top:6pt;">Date: <strong>${esc(data.tenant.signedDate)}</strong></div>`
        : '<div class="sig-date-line"></div><div class="sig-meta">Date</div>'}
    </div>
  </div>

  <div class="avoid-break" style="margin-top:24pt;">
    <h2 class="sub-heading">Witness / Commissioner for Oaths (if applicable)</h2>
    <div class="sig-pair">
      <div class="sig-block">
        <div class="sig-label">Witness to Landlord's Signature</div>
        ${isRenderableSignatureUri(data.landlordWitness?.signatureDataUrl)
          ? `<div style="margin:10pt 0 4pt;"><img src="${resolveSignatureDisplayUrl(data.landlordWitness?.signatureDataUrl) ?? ""}" class="sig-img" alt="Landlord Witness Signature" /></div>`
          : '<div class="sig-line"></div>'}
        ${data.landlordWitness?.signatureDataUrl &&
        !isRenderableSignatureUri(data.landlordWitness.signatureDataUrl)
          ? '<div class="sig-meta" style="margin-bottom:6pt;">Signed electronically via DoorRent</div>'
          : ""}
        <div class="sig-meta">
          ${data.landlordWitness?.name
            ? `Full Name: <strong>${esc(data.landlordWitness.name)}</strong>`
            : "Full Name: ___________________________________"}
        </div>
        <div style="height:6pt;"></div>
        <div class="sig-meta">
          ${data.landlordWitness?.address
            ? `Address: <strong>${esc(data.landlordWitness.address)}</strong>`
            : "Address: ___________________________________"}
        </div>
        <div style="height:6pt;"></div>
        <div class="sig-meta">
          ${data.landlordWitness?.witnessDate
            ? `Date: <strong>${esc(data.landlordWitness.witnessDate)}</strong>`
            : "Date: ___________________________________"}
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Witness to Tenant's Signature</div>
        ${isRenderableSignatureUri(data.guarantor?.signatureDataUrl)
          ? `<div style="margin:10pt 0 4pt;"><img src="${resolveSignatureDisplayUrl(data.guarantor?.signatureDataUrl) ?? ""}" class="sig-img" alt="Witness Signature" /></div>`
          : '<div class="sig-line"></div>'}
        ${data.guarantor?.signatureDataUrl &&
        !isRenderableSignatureUri(data.guarantor.signatureDataUrl)
          ? '<div class="sig-meta" style="margin-bottom:6pt;">Signed electronically via DoorRent</div>'
          : ""}
        <div class="sig-meta">
          ${data.guarantor?.name
            ? `Full Name: <strong>${esc(data.guarantor.name)}</strong>`
            : "Full Name: ___________________________________"}
        </div>
        <div style="height:6pt;"></div>
        <div class="sig-meta">
          ${data.guarantor?.address
            ? `Address: <strong>${esc(data.guarantor.address)}</strong>`
            : "Address: ___________________________________"}
        </div>
        <div style="height:6pt;"></div>
        <div class="sig-meta">
          ${data.guarantor?.witnessDate
            ? `Date: <strong>${esc(data.guarantor.witnessDate)}</strong>`
            : "Date: ___________________________________"}
        </div>
      </div>
    </div>
  </div>

  <div class="avoid-break" style="margin-top:20pt;padding:10pt 14pt;border:1px solid #bbb;background:#fafaf8;">
    <div class="sig-label">Commissioner for Oaths / Notary Public (if applicable)</div>
    <div class="sig-line" style="width:60%;"></div>
    <div class="sig-meta">
      Stamp: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      Date: ___________________
    </div>
  </div>

  <div class="doc-footer" style="margin-top:24pt;">
    ${esc(data.lease.title)} &nbsp;·&nbsp; Ref: ${esc(data.agreementRef)} &nbsp;·&nbsp; Generated via DoorRent on ${esc(data.generatedAt)}<br>
    This document is legally binding when signed by all parties. DoorRent does not provide legal advice.
    For legal guidance, consult a qualified Nigerian legal practitioner.
  </div>
</div>

<script>
  // Auto-print after short delay when opened programmatically
  if (window.opener) {
    setTimeout(() => { /* do not auto-print — let user review first */ }, 300);
  }
</script>
</body>
</html>`;
}

export function printAgreementDocument(data: AgreementPrintData) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const html = buildAgreementHtml(data);
  win.document.write(html);
  win.document.close();
}
