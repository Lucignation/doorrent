import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import CaretakerPortalShell from "../../components/auth/CaretakerPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useCaretakerPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone, TableColumn } from "../../types/app";

interface NoticeRow {
  id: string;
  landlordId: string;
  landlordName: string;
  subject: string;
  body: string;
  type: string;
  typeKey: string;
  tone: "green" | "amber" | "red" | "blue";
  recipients: string;
  sent: string;
  status: "delivered";
  createdByRole: string;
  createdByName: string;
  readCount: number;
}

interface CaretakerNoticesResponse {
  summary: {
    total: number;
    reminderCount: number;
    maintenanceCount: number;
    tenantReadCount: number;
  };
  notices: NoticeRow[];
  quickTemplates: Array<{
    type: string;
    title: string;
    description: string;
  }>;
  formOptions: {
    landlords: Array<{
      value: string;
      label: string;
      scope: string;
    }>;
    properties: Array<{
      id: string;
      landlordId: string;
      label: string;
      name: string;
    }>;
    tenants: Array<{
      id: string;
      landlordId: string;
      propertyId: string;
      label: string;
    }>;
  };
}

const initialComposerState = {
  landlordId: "",
  audience: "ALL_TENANTS",
  type: "MAINTENANCE",
  propertyId: "",
  tenantId: "",
  subject: "",
  body: "",
};

function toneForType(type: string): BadgeTone {
  if (type === "Rent Increase") {
    return "amber";
  }

  if (type === "Maintenance") {
    return "blue";
  }

  if (type === "Reminder" || type === "Legal") {
    return "red";
  }

  return "green";
}

export default function CaretakerNoticesPage() {
  const { caretakerSession } = useCaretakerPortalSession();
  const { dataRefreshVersion, refreshData, showToast } = usePrototypeUI();
  const [noticeData, setNoticeData] = useState<CaretakerNoticesResponse | null>(null);
  const [composerState, setComposerState] = useState(initialComposerState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const caretakerToken = caretakerSession?.token;

    if (!caretakerToken) {
      return;
    }

    let cancelled = false;

    async function loadNotices() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<CaretakerNoticesResponse>(
          "/caretaker/notices",
          {
            token: caretakerToken,
          },
        );

        if (!cancelled) {
          setNoticeData(data);
          setComposerState((current) => ({
            ...current,
            landlordId: current.landlordId || data.formOptions.landlords[0]?.value || "",
          }));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load caretaker notices.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotices();

    return () => {
      cancelled = true;
    };
  }, [caretakerSession?.token, dataRefreshVersion]);

  const landlordScope = useMemo(
    () =>
      noticeData?.formOptions.landlords.find(
        (landlord) => landlord.value === composerState.landlordId,
      )?.scope ?? "ALL_PROPERTIES",
    [composerState.landlordId, noticeData?.formOptions.landlords],
  );

  const filteredProperties = useMemo(
    () =>
      (noticeData?.formOptions.properties ?? []).filter(
        (property) => property.landlordId === composerState.landlordId,
      ),
    [composerState.landlordId, noticeData?.formOptions.properties],
  );

  const filteredTenants = useMemo(() => {
    return (noticeData?.formOptions.tenants ?? []).filter((tenant) => {
      if (tenant.landlordId !== composerState.landlordId) {
        return false;
      }

      if (composerState.propertyId && tenant.propertyId !== composerState.propertyId) {
        return false;
      }

      return true;
    });
  }, [
    composerState.landlordId,
    composerState.propertyId,
    noticeData?.formOptions.tenants,
  ]);

  const columns: TableColumn<NoticeRow>[] = [
    { key: "landlordName", label: "Landlord" },
    {
      key: "subject",
      label: "Subject",
      render: (row) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{row.subject}</div>
          <div className="td-muted" style={{ fontSize: 11 }}>
            {row.recipients}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => <StatusBadge tone={toneForType(row.type)}>{row.type}</StatusBadge>,
    },
    { key: "sent", label: "Sent" },
    { key: "createdByName", label: "Sent By" },
  ];

  function applyTemplate(template: CaretakerNoticesResponse["quickTemplates"][number]) {
    setComposerState((current) => ({
      ...current,
      type: template.type,
      subject: template.title,
      body: template.description,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!caretakerSession?.token) {
      showToast("Caretaker session missing. Please sign in again.", "error");
      return;
    }

    setSaving(true);

    try {
      await apiRequest("/caretaker/notices", {
        method: "POST",
        token: caretakerSession.token,
        body: {
          landlordId: composerState.landlordId,
          type: composerState.type,
          audience: composerState.audience,
          propertyId: composerState.propertyId || undefined,
          tenantId: composerState.tenantId || undefined,
          subject: composerState.subject,
          body: composerState.body,
        },
      });
      showToast("Notice sent successfully", "success");
      setComposerState((current) => ({
        ...initialComposerState,
        landlordId: current.landlordId,
      }));
      refreshData();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Notice could not be sent.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  const description = noticeData
    ? `${noticeData.summary.total} notice(s) visible across your assigned landlords`
    : loading
      ? "Loading caretaker communication..."
      : error || "Notices are unavailable.";

  return (
    <>
      <PageMeta title="DoorRent — Caretaker Notices" urlPath="/caretaker/notices" />
      <CaretakerPortalShell topbarTitle="Notices" breadcrumb="Workspace → Notices">
        <PageHeader title="Notices" description={description} />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div
          className="stats-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          <div className="stat-card accent-blue">
            <div className="stat-label">Total Notices</div>
            <div className="stat-value">{noticeData?.summary.total ?? 0}</div>
            <div className="stat-sub">Across assigned landlords</div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Reminders</div>
            <div className="stat-value">{noticeData?.summary.reminderCount ?? 0}</div>
            <div className="stat-sub">Payment follow-up notices</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Maintenance</div>
            <div className="stat-value">{noticeData?.summary.maintenanceCount ?? 0}</div>
            <div className="stat-sub">Operational updates</div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Notice Log</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <DataTable
                columns={columns}
                rows={noticeData?.notices ?? []}
                emptyMessage={loading ? "Loading notices..." : "No notices yet."}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <form className="card" onSubmit={handleSubmit}>
              <div className="card-header">
                <div>
                  <div className="card-title">Send Notice</div>
                  <div className="card-subtitle">
                    Send notices for the landlords and properties within your scope.
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Landlord</label>
                  <select
                    className="form-input"
                    value={composerState.landlordId}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setComposerState((current) => ({
                        ...current,
                        landlordId: event.target.value,
                        propertyId: "",
                        tenantId: "",
                        audience: "ALL_TENANTS",
                      }))
                    }
                  >
                    {(noticeData?.formOptions.landlords ?? []).map((landlord) => (
                      <option key={landlord.value} value={landlord.value}>
                        {landlord.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Notice Type</label>
                    <select
                      className="form-input"
                      value={composerState.type}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setComposerState((current) => ({
                          ...current,
                          type: event.target.value,
                        }))
                      }
                    >
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="REMINDER">Reminder</option>
                      <option value="LEASE_RENEWAL">Lease Renewal</option>
                      <option value="RENT_INCREASE">Rent Increase</option>
                      <option value="LEGAL">Legal</option>
                      <option value="GENERAL">General</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Audience</label>
                    <select
                      className="form-input"
                      value={composerState.audience}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setComposerState((current) => ({
                          ...current,
                          audience: event.target.value,
                          propertyId: "",
                          tenantId: "",
                        }))
                      }
                    >
                      <option value="ALL_TENANTS" disabled={landlordScope !== "ALL_PROPERTIES"}>
                        All Tenants
                      </option>
                      <option value="PROPERTY">Selected Property</option>
                      <option value="TENANT">Specific Tenant</option>
                    </select>
                  </div>
                </div>

                {composerState.audience === "PROPERTY" || composerState.audience === "TENANT" ? (
                  <div className="form-group">
                    <label className="form-label">Property</label>
                    <select
                      className="form-input"
                      value={composerState.propertyId}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setComposerState((current) => ({
                          ...current,
                          propertyId: event.target.value,
                          tenantId: "",
                        }))
                      }
                    >
                      <option value="">Select a property</option>
                      {filteredProperties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {composerState.audience === "TENANT" ? (
                  <div className="form-group">
                    <label className="form-label">Tenant</label>
                    <select
                      className="form-input"
                      value={composerState.tenantId}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setComposerState((current) => ({
                          ...current,
                          tenantId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select a tenant</option>
                      {filteredTenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    className="form-input"
                    value={composerState.subject}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setComposerState((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                    placeholder="Enter notice subject"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: 140 }}
                    value={composerState.body}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setComposerState((current) => ({
                        ...current,
                        body: event.target.value,
                      }))
                    }
                    placeholder="Write the notice message..."
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
                  {saving ? "Sending..." : "Send Notice"}
                </button>
              </div>
            </form>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Quick Templates</div>
              </div>
              <div className="card-body">
                {(noticeData?.quickTemplates ?? []).map((template) => (
                  <button
                    key={template.type}
                    type="button"
                    className="mini-card"
                    onClick={() => applyTemplate(template)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      {template.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6 }}>
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CaretakerPortalShell>
    </>
  );
}
