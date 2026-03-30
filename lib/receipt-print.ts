export interface PrintableReceipt {
  companyName: string;
  receiptNumber: string;
  issuedAt: string;
  amount: string;
  tenant: string;
  tenantEmail?: string;
  propertyUnit: string;
  periodLabel: string;
  reference: string;
  method: string;
  platformFee?: string;
  landlordSettlement?: string;
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReceiptHtml(receipt: PrintableReceipt): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt ${esc(receipt.receiptNumber)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  body {
    font-family: "DM Sans", Arial, sans-serif;
    background: #f0ede6;
    color: #1a1916;
    padding: 40px 20px 60px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    max-width: 640px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 40px rgba(0,0,0,0.12);
  }

  /* ── Header band ── */
  .header {
    background: #0f1c13;
    padding: 32px 36px 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
  }
  .header-brand { color: #fff; }
  .header-brand .company { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 4px; }
  .header-brand .tagline { font-size: 12px; color: rgba(255,255,255,0.45); }
  .header-badge {
    background: #1a6b4a;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 5px 12px;
    border-radius: 999px;
    white-space: nowrap;
    margin-top: 4px;
  }
  .header-right { text-align: right; color: #fff; flex-shrink: 0; }
  .header-right .receipt-label { font-size: 11px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .header-right .receipt-num { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .header-right .issued { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 4px; }

  /* ── Amount hero ── */
  .amount-band {
    background: #f7f5f0;
    border-bottom: 1px solid #e8e5df;
    padding: 24px 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .amount-label { font-size: 12px; color: #6b6860; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; }
  .amount-value { font-size: 36px; font-weight: 700; letter-spacing: -0.03em; color: #1a1916; }
  .status-pill {
    background: #e6f4ed;
    color: #1a6b4a;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 6px 16px;
    border-radius: 999px;
    border: 1px solid rgba(26,107,74,0.2);
    white-space: nowrap;
  }

  /* ── Body ── */
  .body { padding: 28px 36px; }

  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #a09e98;
    margin-bottom: 14px;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }

  .field { display: flex; flex-direction: column; gap: 4px; }
  .field .fl { font-size: 11px; color: #a09e98; text-transform: uppercase; letter-spacing: 0.07em; }
  .field .fv { font-size: 14px; font-weight: 600; color: #1a1916; line-height: 1.4; }
  .field .fv-sub { font-size: 12px; color: #6b6860; margin-top: 1px; }

  .divider { height: 1px; background: #e8e5df; margin: 20px 0; }

  /* ── Financial summary ── */
  .summary {}
  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px dashed #e8e5df;
    font-size: 14px;
  }
  .summary-row:last-child { border-bottom: none; }
  .summary-row .sr-label { color: #6b6860; }
  .summary-row .sr-value { font-weight: 600; color: #1a1916; }
  .summary-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #0f1c13;
    border-radius: 12px;
    margin-top: 16px;
    color: #fff;
  }
  .summary-total .st-label { font-size: 13px; color: rgba(255,255,255,0.6); }
  .summary-total .st-value { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }

  /* ── Reference strip ── */
  .ref-strip {
    background: #f7f5f0;
    border-top: 1px solid #e8e5df;
    padding: 16px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .ref-strip .ref-label { font-size: 11px; color: #a09e98; text-transform: uppercase; letter-spacing: 0.07em; }
  .ref-strip .ref-val { font-size: 12px; font-weight: 600; color: #1a1916; font-family: monospace; }

  /* ── Footer ── */
  .footer {
    padding: 18px 36px;
    border-top: 1px solid #e8e5df;
    text-align: center;
    font-size: 11px;
    color: #a09e98;
    line-height: 1.7;
  }

  @media print {
    body { background: #fff; padding: 0; }
    .page { box-shadow: none; border-radius: 0; max-width: 100%; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-brand">
      <div class="company">${esc(receipt.companyName)}</div>
      <div class="tagline">Powered by DoorRent</div>
      <div style="margin-top:10px;"><span class="header-badge">Official Receipt</span></div>
    </div>
    <div class="header-right">
      <div class="receipt-label">Receipt No.</div>
      <div class="receipt-num">${esc(receipt.receiptNumber)}</div>
      <div class="issued">${esc(receipt.issuedAt)}</div>
    </div>
  </div>

  <div class="amount-band">
    <div>
      <div class="amount-label">Amount Paid</div>
      <div class="amount-value">${esc(receipt.amount)}</div>
    </div>
    <span class="status-pill">✓ Payment Confirmed</span>
  </div>

  <div class="body">

    <div class="section-title">Tenant Details</div>
    <div class="grid-2">
      <div class="field">
        <span class="fl">Full Name</span>
        <span class="fv">${esc(receipt.tenant)}</span>
        ${receipt.tenantEmail ? `<span class="fv-sub">${esc(receipt.tenantEmail)}</span>` : ""}
      </div>
      <div class="field">
        <span class="fl">Property / Unit</span>
        <span class="fv">${esc(receipt.propertyUnit)}</span>
      </div>
    </div>

    <div class="section-title">Payment Details</div>
    <div class="grid-2">
      <div class="field">
        <span class="fl">Period Covered</span>
        <span class="fv">${esc(receipt.periodLabel)}</span>
      </div>
      <div class="field">
        <span class="fl">Payment Method</span>
        <span class="fv">${esc(receipt.method)}</span>
      </div>
      <div class="field">
        <span class="fl">Date Issued</span>
        <span class="fv">${esc(receipt.issuedAt)}</span>
      </div>
      <div class="field">
        <span class="fl">Reference</span>
        <span class="fv" style="font-family:monospace;font-size:12px;">${esc(receipt.reference)}</span>
      </div>
    </div>

    <div class="divider"></div>

    <div class="section-title">Financial Summary</div>
    <div class="summary">
      <div class="summary-row">
        <span class="sr-label">Amount Received</span>
        <span class="sr-value">${esc(receipt.amount)}</span>
      </div>
      ${receipt.platformFee ? `
      <div class="summary-row">
        <span class="sr-label">DoorRent Platform Fee</span>
        <span class="sr-value">${esc(receipt.platformFee)}</span>
      </div>` : ""}
      ${receipt.landlordSettlement ? `
      <div class="summary-row">
        <span class="sr-label">Landlord Settlement</span>
        <span class="sr-value">${esc(receipt.landlordSettlement)}</span>
      </div>` : ""}
    </div>

    <div class="summary-total">
      <span class="st-label">Total Paid</span>
      <span class="st-value">${esc(receipt.amount)}</span>
    </div>

  </div>

  <div class="ref-strip">
    <div>
      <div class="ref-label">Transaction Reference</div>
      <div class="ref-val">${esc(receipt.reference)}</div>
    </div>
    <div style="text-align:right;">
      <div class="ref-label">Receipt Number</div>
      <div class="ref-val">${esc(receipt.receiptNumber)}</div>
    </div>
  </div>

  <div class="footer">
    This is an official payment receipt issued by ${esc(receipt.companyName)} via DoorRent.<br />
    DoorRent is a product of ReSuply Technologies Limited. For support: support@usedoorrent.com
  </div>

</div>
</body>
</html>`;
}

export function printReceipt(receipt: PrintableReceipt) {
  if (typeof window === "undefined") return;

  const html = buildReceiptHtml(receipt);

  // Use a hidden iframe — avoids popup blocking entirely
  const existingFrame = document.getElementById("__receipt-print-frame");
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "__receipt-print-frame";
  iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    throw new Error("Could not access print frame.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Clean up after print dialog closes
      window.setTimeout(() => iframe.remove(), 2000);
    }, 150);
  };
}
