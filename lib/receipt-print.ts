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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function printReceipt(receipt: PrintableReceipt) {
  if (typeof window === "undefined") {
    return;
  }

  const printWindow = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=900,height=720",
  );

  if (!printWindow) {
    throw new Error("Allow popups to open the receipt preview.");
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(receipt.receiptNumber)} - DoorRent Receipt</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 32px;
      color: #1a1916;
      background: #f5f4f0;
    }
    .sheet {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e8e6df;
      border-radius: 16px;
      padding: 32px;
    }
    .brand {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e8e6df;
    }
    .brand h1 {
      margin: 0 0 6px;
      font-size: 28px;
    }
    .brand p {
      margin: 0;
      color: #6b6860;
      line-height: 1.6;
    }
    .pill {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      background: #e8f0eb;
      color: #1a3a2a;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .box {
      border: 1px solid #e8e6df;
      border-radius: 12px;
      padding: 16px;
      background: #f9f8f5;
    }
    .label {
      font-size: 12px;
      color: #6b6860;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .value {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.4;
    }
    .summary {
      margin-top: 24px;
      border-top: 1px solid #e8e6df;
      padding-top: 20px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
    }
    .summary-row strong {
      font-size: 20px;
    }
    .muted {
      color: #6b6860;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .sheet {
        border: 0;
        border-radius: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <div>
        <span class="pill">DoorRent Receipt</span>
        <h1>${escapeHtml(receipt.companyName)}</h1>
        <p>DoorRent - Subsidiary of ReSuply Technologies Limited</p>
      </div>
      <div>
        <div class="label">Receipt Number</div>
        <div class="value">${escapeHtml(receipt.receiptNumber)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="label">Tenant</div>
        <div class="value">${escapeHtml(receipt.tenant)}</div>
        <div class="muted">${escapeHtml(receipt.tenantEmail ?? "")}</div>
      </div>
      <div class="box">
        <div class="label">Property / Unit</div>
        <div class="value">${escapeHtml(receipt.propertyUnit)}</div>
      </div>
      <div class="box">
        <div class="label">Payment Period</div>
        <div class="value">${escapeHtml(receipt.periodLabel)}</div>
      </div>
      <div class="box">
        <div class="label">Issued</div>
        <div class="value">${escapeHtml(receipt.issuedAt)}</div>
      </div>
      <div class="box">
        <div class="label">Reference</div>
        <div class="value">${escapeHtml(receipt.reference)}</div>
      </div>
      <div class="box">
        <div class="label">Payment Method</div>
        <div class="value">${escapeHtml(receipt.method)}</div>
      </div>
    </div>

    <div class="summary">
      <div class="summary-row">
        <span class="muted">Amount Received</span>
        <strong>${escapeHtml(receipt.amount)}</strong>
      </div>
      ${
        receipt.platformFee
          ? `<div class="summary-row"><span class="muted">DoorRent Fee</span><span>${escapeHtml(
              receipt.platformFee,
            )}</span></div>`
          : ""
      }
      ${
        receipt.landlordSettlement
          ? `<div class="summary-row"><span class="muted">Landlord Settlement</span><span>${escapeHtml(
              receipt.landlordSettlement,
            )}</span></div>`
          : ""
      }
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 200);
}
