import { useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import type { BadgeTone, LandlordAgreementRow, TableColumn } from "../../types/app";
import { printAgreementDocument } from "../../lib/agreement-print";

interface AgreementSummary {
  total: number;
  draft: number;
  sent: number;
  signed: number;
  expired: number;
}

interface AgreementRow extends LandlordAgreementRow {
  id: string;
  title?: string;
  annualRent?: number;
  billingFrequency?: string;
  billingFrequencyLabel?: string;
  billingCyclePrice?: number;
  billingSchedule?: string;
  leaseStartIso?: string;
  leaseEndIso?: string;
  depositAmount?: number | null;
  serviceCharge?: number | null;
  landlordCompanyName?: string;
  landlordName?: string;
  landlordEmail?: string;
  landlordPhone?: string | null;
  tenantEmail?: string;
  tenantPhone?: string | null;
  tenantResidentialAddress?: string | null;
  tenantIdType?: string | null;
  tenantIdNumber?: string | null;
  propertyAddress?: string;
  unitNumber?: string | null;
  guarantor?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    relationship?: string | null;
    occupation?: string | null;
    company?: string | null;
    address?: string | null;
  } | null;
  conditions?: {
    noticePeriodDays?: number | null;
    utilities?: string | null;
    permittedUse?: string | null;
    specialConditions?: string | null;
  } | null;
  notes?: string | null;
}

interface AgreementsResponse {
  count: number;
  summary: AgreementSummary;
  agreements: AgreementRow[];
}

interface AgreementTemplate {
  id: string;
  name: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  fileUrl?: string;
  content: string;
  contentPreview: string;
  agreementsUsingTemplate: number;
  createdAt: string;
}

interface TemplatesResponse {
  count: number;
  templates: AgreementTemplate[];
}

function statusTone(status: LandlordAgreementRow["status"]): BadgeTone {
  if (status === "signed") {
    return "green";
  }

  if (status === "sent") {
    return "amber";
  }

  if (status === "draft") {
    return "gray";
  }

  return "red";
}

const tabs: Array<{
  key: "" | "DRAFT" | "SENT" | "SIGNED" | "EXPIRED";
  label: string;
}> = [
  { key: "", label: "All Agreements" },
  { key: "SENT", label: "Pending" },
  { key: "SIGNED", label: "Signed" },
  { key: "EXPIRED", label: "Expired" },
];

export default function LandlordAgreementsPage() {
  const { dataRefreshVersion, showToast } = usePrototypeUI();
  const { landlordSession } = useLandlordPortalSession();
  const [agreementData, setAgreementData] = useState<AgreementsResponse | null>(null);
  const [templateData, setTemplateData] = useState<TemplatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "DRAFT" | "SENT" | "SIGNED" | "EXPIRED">("");
  const [creatingDefault, setCreatingDefault] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<AgreementTemplate | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!landlordSession?.token) {
      return;
    }

    const landlordToken = landlordSession.token;
    let cancelled = false;

    async function loadAgreements() {
      setLoading(true);
      setError("");

      const query = statusFilter ? `?status=${statusFilter}` : "";

      try {
        const [agreementsResult, templatesResult] = await Promise.all([
          apiRequest<AgreementsResponse>(`/landlord/agreements${query}`, {
            token: landlordToken,
          }),
          apiRequest<TemplatesResponse>("/landlord/agreements/templates", {
            token: landlordToken,
          }),
        ]);

        if (!cancelled) {
          setAgreementData(agreementsResult.data);
          setTemplateData(templatesResult.data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your agreements.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAgreements();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshVersion, landlordSession?.token, statusFilter]);

  async function handleCreateDefaultTemplate() {
    if (!landlordSession?.token || creatingDefault) return;
    setCreatingDefault(true);
    try {
      await apiRequest("/landlord/agreements/templates/default", {
        method: "POST",
        token: landlordSession.token,
      });
      showToast("Standard template created. You can now customise it.", "success");
      const { data } = await apiRequest<TemplatesResponse>("/landlord/agreements/templates", {
        token: landlordSession.token,
      });
      setTemplateData(data);
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Could not create template.",
        "error",
      );
    } finally {
      setCreatingDefault(false);
    }
  }

  function handleViewAgreement(row: AgreementRow) {
    printAgreementDocument({
      agreementRef: row.id,
      generatedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      landlord: {
        companyName: row.landlordCompanyName ?? "",
        name: row.landlordName ?? "",
        email: row.landlordEmail ?? "",
        phone: row.landlordPhone,
      },
      tenant: {
        name: row.tenant,
        email: row.tenantEmail ?? "",
        phone: row.tenantPhone,
        residentialAddress: row.tenantResidentialAddress,
        idType: row.tenantIdType,
        idNumber: row.tenantIdNumber,
      },
      premises: {
        propertyName: row.property,
        address: row.propertyAddress ?? row.unit,
        unitNumber: row.unitNumber,
      },
      lease: {
        title: row.title ?? `Tenancy Agreement — ${row.tenant}`,
        startDate: row.leaseStartIso ?? "",
        endDate: row.leaseEndIso ?? "",
      },
      financial: {
        annualRent: row.annualRent ?? 0,
        billingFrequency: row.billingFrequency ?? "ANNUALLY",
        billingFrequencyLabel: row.billingFrequencyLabel ?? "Annually",
        billingCyclePrice: row.billingCyclePrice ?? 0,
        billingSchedule: row.billingSchedule ?? "",
        depositAmount: row.depositAmount,
        serviceCharge: row.serviceCharge,
      },
      conditions: row.conditions,
      guarantor: row.guarantor,
      notes: row.notes,
      templateName: row.template,
    });
  }

  async function handleResendAgreement(row: AgreementRow) {
    if (!landlordSession?.token || resendingId) return;
    setResendingId(row.id);
    try {
      await apiRequest(`/landlord/agreements/${row.id}/resend`, {
        method: "POST",
        token: landlordSession.token,
      });
      showToast(`Agreement resent to ${row.tenant}.`, "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Could not resend agreement.",
        "error",
      );
    } finally {
      setResendingId(null);
    }
  }

  const agreementColumns: TableColumn<AgreementRow>[] =
    useMemo(
      () => [
        {
          key: "tenant",
          label: "Tenant",
          render: (row) => <IdentityCell primary={row.tenant} />,
        },
        {
          key: "unit",
          label: "Unit",
          render: (row) => <span className="td-muted">{row.unit}</span>,
        },
        {
          key: "template",
          label: "Template",
          render: (row) => <span className="td-muted">{row.template}</span>,
        },
        {
          key: "sent",
          label: "Sent",
          render: (row) => <span className="td-muted">{row.sent}</span>,
        },
        {
          key: "lastActivity",
          label: "Last Activity",
          render: (row) => <span className="td-muted">{row.lastActivity}</span>,
        },
        {
          key: "status",
          label: "Status",
          render: (row) => (
            <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
          ),
        },
        {
          key: "actions",
          label: "Actions",
          render: (row) => (
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => handleViewAgreement(row)}
              >
                View
              </button>
              {row.status === "sent" ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  disabled={resendingId === row.id}
                  onClick={() => void handleResendAgreement(row)}
                >
                  {resendingId === row.id ? "Sending…" : "Resend"}
                </button>
              ) : null}
              {(row.status === "signed" || row.status === "sent" || row.status === "draft") ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => handleViewAgreement(row)}
                >
                  Download
                </button>
              ) : null}
            </div>
          ),
        },
      ],
      [showToast, resendingId, handleViewAgreement, handleResendAgreement],
    );

  const description = agreementData
    ? `${agreementData.summary.total} agreements tracked with live signature status`
    : loading
      ? "Loading your agreements..."
      : error || "No agreements yet.";

  const summary = agreementData?.summary ?? {
    total: 0,
    draft: 0,
    sent: 0,
    signed: 0,
    expired: 0,
  };

  return (
    <>
      <PageMeta title="DoorRent — Agreements" />
      <LandlordPortalShell
        topbarTitle="Agreements"
        breadcrumb="Dashboard → Agreements"
      >
        <PageHeader
          title="Agreements"
          description={description}
          actions={[
            { label: "Upload Template", modal: "upload-template", variant: "secondary" },
            { label: "+ New Agreement", modal: "add-agreement", variant: "primary" },
          ]}
        />

        <div className="tabs">
          <div
            className={`tab ${statusFilter === "" ? "active" : ""}`}
            onClick={() => setStatusFilter("")}
          >
            All Agreements ({summary.total})
          </div>
          <div
            className={`tab ${statusFilter === "SENT" ? "active" : ""}`}
            onClick={() => setStatusFilter("SENT")}
          >
            Pending ({summary.sent})
          </div>
          <div
            className={`tab ${statusFilter === "SIGNED" ? "active" : ""}`}
            onClick={() => setStatusFilter("SIGNED")}
          >
            Signed ({summary.signed})
          </div>
          <div
            className={`tab ${statusFilter === "EXPIRED" ? "active" : ""}`}
            onClick={() => setStatusFilter("EXPIRED")}
          >
            Expired ({summary.expired})
          </div>
        </div>

        <div className="card">
          <DataTable
            columns={agreementColumns}
            rows={agreementData?.agreements ?? []}
            emptyMessage={loading ? "Loading agreements..." : "No agreements found."}
          />
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Agreement Templates</div>
              <div className="card-subtitle">
                {templateData
                  ? `${templateData.count} template${templateData.count === 1 ? "" : "s"} available`
                  : "Your reusable agreement templates"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {templateData && templateData.count === 0 ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => void handleCreateDefaultTemplate()}
                  disabled={creatingDefault}
                >
                  {creatingDefault ? "Creating..." : "Use Standard Template"}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => showToast("Use the Upload Template button above to add templates", "info")}
              >
                Upload Template
              </button>
            </div>
          </div>
          <div className="card-body">
            {templateData && templateData.templates.length > 0 ? (
              <div className="template-list">
                {templateData.templates.map((tpl) => (
                  <div key={tpl.id} className="template-row">
                    <div className="template-info">
                      <div className="template-name">{tpl.name}</div>
                      {tpl.description ? (
                        <div className="template-desc">{tpl.description}</div>
                      ) : null}
                      <div className="template-preview">{tpl.contentPreview}</div>
                    </div>
                    <div className="template-meta">
                      <span className="template-usage">
                        Used in {tpl.agreementsUsingTemplate} agreement
                        {tpl.agreementsUsingTemplate === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setViewingTemplate(tpl)}
                      >
                        View File
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-templates">
                <p>No templates yet. Upload your own or click &quot;Use Standard Template&quot; to get started.</p>
              </div>
            )}
          </div>
        </div>

        {viewingTemplate ? (
          <div className="file-viewer-overlay" onClick={() => setViewingTemplate(null)}>
            <div className="file-viewer-panel" onClick={(e) => e.stopPropagation()}>
              <div className="file-viewer-header">
                <div className="file-viewer-title">
                  <span className="file-viewer-name">{viewingTemplate.name}</span>
                  {viewingTemplate.fileName ? (
                    <span className="file-viewer-filename">{viewingTemplate.fileName}</span>
                  ) : null}
                </div>
                <div className="file-viewer-actions">
                  {viewingTemplate.fileUrl ? (
                    <a
                      href={viewingTemplate.fileUrl}
                      download={viewingTemplate.fileName ?? viewingTemplate.name}
                      className="btn btn-secondary btn-xs"
                    >
                      Download
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setViewingTemplate(null)}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              <div className="file-viewer-body">
                {viewingTemplate.fileUrl &&
                (viewingTemplate.mimeType === "application/pdf" ||
                  viewingTemplate.fileUrl.toLowerCase().endsWith(".pdf")) ? (
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(viewingTemplate.fileUrl)}&embedded=true`}
                    title={viewingTemplate.name}
                    className="file-viewer-iframe"
                  />
                ) : viewingTemplate.fileUrl &&
                  viewingTemplate.mimeType?.startsWith("image/") ? (
                  <div className="file-viewer-image-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingTemplate.fileUrl}
                      alt={viewingTemplate.name}
                      className="file-viewer-image"
                    />
                  </div>
                ) : (
                  <pre className="file-viewer-text">{viewingTemplate.content}</pre>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <style jsx>{`
          .file-viewer-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.55);
            z-index: 1000;
            display: flex;
            align-items: stretch;
            justify-content: flex-end;
          }
          .file-viewer-panel {
            width: min(860px, 100vw);
            height: 100vh;
            background: var(--surface, #fff);
            display: flex;
            flex-direction: column;
            box-shadow: -8px 0 32px rgba(0,0,0,0.18);
          }
          .file-viewer-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border, #e8e6df);
            flex-shrink: 0;
          }
          .file-viewer-title {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
          }
          .file-viewer-name {
            font-weight: 700;
            font-size: 15px;
            color: var(--ink, #1a1916);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .file-viewer-filename {
            font-size: 12px;
            color: var(--ink2, #6b6860);
          }
          .file-viewer-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
          }
          .file-viewer-body {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .file-viewer-iframe {
            width: 100%;
            height: 100%;
            border: none;
            flex: 1;
          }
          .file-viewer-image-wrap {
            flex: 1;
            overflow: auto;
            padding: 24px;
            display: flex;
            justify-content: center;
          }
          .file-viewer-image {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
          }
          .file-viewer-text {
            flex: 1;
            overflow: auto;
            margin: 0;
            padding: 24px 28px;
            font-size: 13px;
            line-height: 1.75;
            font-family: var(--font-mono, ui-monospace, monospace);
            color: var(--ink, #1a1916);
            white-space: pre-wrap;
            word-break: break-word;
            background: var(--bg, #f5f4f0);
          }
          .template-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .template-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding: 16px;
            border: 1px solid var(--border, #e8e6df);
            border-radius: 12px;
            background: var(--bg, #f5f4f0);
          }
          .template-info {
            flex: 1;
            min-width: 0;
          }
          .template-name {
            font-weight: 600;
            font-size: 14px;
            color: var(--ink, #1a1916);
            margin-bottom: 2px;
          }
          .template-desc {
            font-size: 13px;
            color: var(--ink2, #6b6860);
            margin-bottom: 6px;
          }
          .template-preview {
            font-size: 12px;
            color: var(--ink2, #6b6860);
            font-family: var(--font-mono, monospace);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 480px;
          }
          .template-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
            flex-shrink: 0;
          }
          .template-usage {
            font-size: 12px;
            color: var(--ink2, #6b6860);
          }
          .empty-templates {
            padding: 24px 0;
            text-align: center;
            color: var(--ink2, #6b6860);
            font-size: 14px;
          }
          .empty-templates p { margin: 0; }
        `}</style>
      </LandlordPortalShell>
    </>
  );
}
