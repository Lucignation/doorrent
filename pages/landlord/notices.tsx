import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useLandlordPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";
import type { BadgeTone } from "../../types/app";

interface NoticeRow {
  id: string;
  subject: string;
  body: string;
  type: string;
  typeKey: string;
  tone: "green" | "amber" | "red" | "blue";
  audience: string;
  audienceLabel: string;
  recipients: string;
  recipientCount?: number;
  sent: string;
  sentAt: string;
  status: "delivered";
  createdByRole: string;
  createdByName: string;
  readCount: number;
}

interface NoticeTemplate {
  type: string;
  title: string;
  description: string;
  icon: string;
  tone: "green" | "amber" | "red" | "blue";
  defaultSubject?: string;
  defaultBody?: string;
}

interface LandlordNoticesResponse {
  summary: {
    total: number;
    sentCount: number;
    scheduledCount: number;
    draftCount: number;
    unreadTenantReads: number;
    rentIncreaseCount: number;
    maintenanceCount: number;
  };
  notices: NoticeRow[];
  quickTemplates: NoticeTemplate[];
  formOptions: {
    types: Array<{
      value: string;
      label: string;
    }>;
    audience: Array<{
      value: string;
      label: string;
    }>;
  };
}

type NoticeTab = "sent" | "scheduled" | "drafts";

const initialComposerState = {
  type: "RENT_INCREASE",
  audience: "ALL_TENANTS",
  subject: "",
  body: "",
};

function parseAudienceValue(value: string) {
  if (value.startsWith("PROPERTY:")) {
    return {
      audience: "PROPERTY",
      propertyId: value.replace("PROPERTY:", ""),
      tenantId: undefined,
    };
  }

  if (value.startsWith("TENANT:")) {
    return {
      audience: "TENANT",
      propertyId: undefined,
      tenantId: value.replace("TENANT:", ""),
    };
  }

  return {
    audience: "ALL_TENANTS",
    propertyId: undefined,
    tenantId: undefined,
  };
}

function toneForNotice(type: string): BadgeTone {
  if (type.toLowerCase().includes("rent increase")) {
    return "amber";
  }

  if (type.toLowerCase().includes("maintenance")) {
    return "blue";
  }

  if (type.toLowerCase().includes("reminder") || type.toLowerCase().includes("legal")) {
    return "red";
  }

  return "green";
}

function templateGlyph(icon: string) {
  if (icon === "money") {
    return "💸";
  }

  if (icon === "bell") {
    return "🔔";
  }

  if (icon === "doc") {
    return "📄";
  }

  if (icon === "wrench") {
    return "🛠";
  }

  if (icon === "megaphone") {
    return "📣";
  }

  return "•";
}

function modalDefaultState(noticeData: LandlordNoticesResponse | null) {
  return {
    type: noticeData?.formOptions.types[0]?.value ?? initialComposerState.type,
    audience: noticeData?.formOptions.audience[0]?.value ?? initialComposerState.audience,
    subject: "",
    body: "",
  };
}

export default function LandlordNoticesPage() {
  const { landlordSession } = useLandlordPortalSession();
  const {
    activeModal,
    closeModal,
    dataRefreshVersion,
    openModal,
    refreshData,
    showToast,
  } = usePrototypeUI();
  const [noticeData, setNoticeData] = useState<LandlordNoticesResponse | null>(null);
  const [composerState, setComposerState] = useState(initialComposerState);
  const [activeTab, setActiveTab] = useState<NoticeTab>("sent");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const landlordToken = landlordSession?.token;

    if (!landlordToken) {
      return;
    }

    let cancelled = false;

    async function loadNotices() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<LandlordNoticesResponse>("/landlord/notices", {
          token: landlordToken,
        });

        if (!cancelled) {
          setNoticeData(data);
          setComposerState((current) => ({
            ...current,
            type: current.type || data.formOptions.types[0]?.value || initialComposerState.type,
            audience:
              current.audience ||
              data.formOptions.audience[0]?.value ||
              initialComposerState.audience,
          }));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load notices.",
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
  }, [dataRefreshVersion, landlordSession?.token]);

  const tabs = useMemo(
    () => [
      { key: "sent" as const, label: "Sent", count: noticeData?.summary.sentCount ?? 0 },
      {
        key: "scheduled" as const,
        label: "Scheduled",
        count: noticeData?.summary.scheduledCount ?? 0,
      },
      { key: "drafts" as const, label: "Drafts", count: noticeData?.summary.draftCount ?? 0 },
    ],
    [noticeData?.summary.draftCount, noticeData?.summary.scheduledCount, noticeData?.summary.sentCount],
  );

  const visibleRows = useMemo(() => {
    if (activeTab === "sent") {
      return noticeData?.notices ?? [];
    }

    return [] as NoticeRow[];
  }, [activeTab, noticeData?.notices]);

  const description = noticeData
    ? `${noticeData.summary.total} notice(s) delivered with ${noticeData.summary.unreadTenantReads} tenant read(s)`
    : loading
      ? "Loading communication history..."
      : error || "Notices are unavailable.";

  useEffect(() => {
    if (activeModal !== "send-notice") {
      return;
    }

    setComposerState((current) => ({
      ...modalDefaultState(noticeData),
      type: current.type || noticeData?.formOptions.types[0]?.value || initialComposerState.type,
      audience:
        current.audience ||
        noticeData?.formOptions.audience[0]?.value ||
        initialComposerState.audience,
      subject: current.subject,
      body: current.body,
    }));
  }, [activeModal, noticeData]);

  function openComposer(template?: NoticeTemplate) {
    if (template) {
      setComposerState({
        type: template.type,
        audience: noticeData?.formOptions.audience[0]?.value ?? initialComposerState.audience,
        subject: template.defaultSubject ?? template.title,
        body: template.defaultBody ?? template.description,
      });
    } else {
      setComposerState((current) => ({
        ...modalDefaultState(noticeData),
        subject: current.subject,
        body: current.body,
        type: current.type || noticeData?.formOptions.types[0]?.value || initialComposerState.type,
        audience:
          current.audience ||
          noticeData?.formOptions.audience[0]?.value ||
          initialComposerState.audience,
      }));
    }

    openModal("send-notice");
  }

  function resetComposer() {
    setComposerState(modalDefaultState(noticeData));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!landlordSession?.token) {
      showToast("Landlord session missing. Please sign in again.", "error");
      return;
    }

    setSaving(true);
    const parsedAudience = parseAudienceValue(composerState.audience);

    try {
      await apiRequest("/landlord/notices", {
        method: "POST",
        token: landlordSession.token,
        body: {
          type: composerState.type,
          audience: parsedAudience.audience,
          propertyId: parsedAudience.propertyId,
          tenantId: parsedAudience.tenantId,
          subject: composerState.subject,
          body: composerState.body,
        },
      });

      showToast("Notice sent successfully", "success");
      setActiveTab("sent");
      closeModal();
      resetComposer();
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

  const actionButtons = [
    {
      label: "+ Send Notice",
      variant: "primary" as const,
      modal: "send-notice" as const,
      toastMessage: undefined,
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent - Notices" urlPath="/landlord/notices" />
      <LandlordPortalShell topbarTitle="Notices" breadcrumb="Dashboard -> Notices">
        <PageHeader
          title="Notices & Communication"
          description="Send notices, announcements, rent increase letters, and renewal updates."
          actions={actionButtons}
        />

        {error ? (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body" style={{ color: "var(--red)" }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="landlord-notices-layout">
          <section className="landlord-notices-board">
            <div className="landlord-notices-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={activeTab === tab.key ? "is-active" : ""}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <div className="landlord-notices-card">
              <div className="landlord-notices-table-head">
                <span>Subject</span>
                <span>Type</span>
                <span>Sent</span>
                <span>Status</span>
              </div>

              <div className="landlord-notices-table-body">
                {visibleRows.length ? (
                  visibleRows.map((notice) => (
                    <article key={notice.id} className="landlord-notices-row">
                      <div className="landlord-notices-subject">
                        <strong>{notice.subject}</strong>
                        <span>
                          {notice.recipients} · by {notice.createdByName}
                        </span>
                      </div>

                      <div>
                        <StatusBadge tone={toneForNotice(notice.type)}>
                          {notice.type}
                        </StatusBadge>
                      </div>

                      <div className="landlord-notices-sent">{notice.sent}</div>

                      <div>
                        <span className="landlord-notices-delivered">
                          <span className="landlord-notices-dot" />
                          {notice.status}
                        </span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="landlord-notices-empty">
                    {loading
                      ? "Loading notices..."
                      : activeTab === "scheduled"
                        ? "No scheduled notices yet."
                        : activeTab === "drafts"
                          ? "No drafts yet."
                          : "No notices sent yet."}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="landlord-notices-side">
            <div className="landlord-notices-side-label">Quick Actions</div>

            <div className="landlord-notices-side-list">
              {(noticeData?.quickTemplates ?? []).map((template) => (
                <button
                  key={template.type}
                  type="button"
                  className="landlord-notices-action"
                  onClick={() => openComposer(template)}
                >
                  <span className={`landlord-notices-action-icon tone-${template.tone}`}>
                    {templateGlyph(template.icon)}
                  </span>

                  <span className="landlord-notices-action-copy">
                    <strong>{template.title}</strong>
                    <span>{template.description}</span>
                  </span>

                  <span className="landlord-notices-action-arrow">{"->"}</span>
                </button>
              ))}
            </div>

            <div className="landlord-notices-summary-card">
              <div className="landlord-notices-summary-item">
                <span>Sent notices</span>
                <strong>{noticeData?.summary.sentCount ?? 0}</strong>
              </div>
              <div className="landlord-notices-summary-item">
                <span>Tenant reads</span>
                <strong>{noticeData?.summary.unreadTenantReads ?? 0}</strong>
              </div>
              <div className="landlord-notices-summary-item">
                <span>Rent increase</span>
                <strong>{noticeData?.summary.rentIncreaseCount ?? 0}</strong>
              </div>
              <div className="landlord-notices-summary-item">
                <span>Maintenance</span>
                <strong>{noticeData?.summary.maintenanceCount ?? 0}</strong>
              </div>
            </div>
          </aside>
        </div>

        {activeModal === "send-notice" ? (
          <div
            className="landlord-notices-modal-backdrop"
            onClick={() => {
              closeModal();
              resetComposer();
            }}
          >
            <div
              className="landlord-notices-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="send-notice-title"
            >
              <form onSubmit={handleSubmit}>
                <div className="landlord-notices-modal-head">
                  <h2 id="send-notice-title">Send Notice</h2>
                  <button
                    type="button"
                    className="landlord-notices-modal-close"
                    onClick={() => {
                      closeModal();
                      resetComposer();
                    }}
                  >
                    x
                  </button>
                </div>

                <div className="landlord-notices-modal-body">
                  <div className="form-group">
                    <label className="form-label">Notice Type *</label>
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
                      {(noticeData?.formOptions.types ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Recipients *</label>
                    <select
                      className="form-input"
                      value={composerState.audience}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setComposerState((current) => ({
                          ...current,
                          audience: event.target.value,
                        }))
                      }
                    >
                      {(noticeData?.formOptions.audience ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subject *</label>
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
                    <label className="form-label">Message *</label>
                    <textarea
                      className="form-input"
                      style={{ minHeight: 168 }}
                      value={composerState.body}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setComposerState((current) => ({
                          ...current,
                          body: event.target.value,
                        }))
                      }
                      placeholder="Write your notice..."
                    />
                  </div>
                </div>

                <div className="landlord-notices-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      closeModal();
                      resetComposer();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Sending..." : "Send Notice"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <style jsx global>{`
          .landlord-notices-layout {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
            gap: 24px;
            align-items: start;
          }

          .landlord-notices-tabs {
            display: flex;
            flex-wrap: wrap;
            gap: 24px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 18px;
          }

          .landlord-notices-tabs button {
            background: none;
            border: 0;
            border-bottom: 3px solid transparent;
            padding: 0 0 14px;
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: var(--ink2);
            cursor: pointer;
          }

          .landlord-notices-tabs button.is-active {
            color: var(--accent);
            border-bottom-color: var(--accent);
          }

          .landlord-notices-card {
            border: 1px solid var(--border);
            border-radius: 20px;
            overflow: hidden;
            background: var(--surface);
            box-shadow: var(--shadow-sm);
          }

          .landlord-notices-table-head,
          .landlord-notices-row {
            display: grid;
            grid-template-columns: minmax(0, 1.55fr) 0.8fr 0.45fr 0.55fr;
            gap: 16px;
            align-items: center;
          }

          .landlord-notices-table-head {
            padding: 18px 22px;
            background: var(--surface2);
            color: var(--ink3);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .landlord-notices-row {
            padding: 22px;
            border-top: 1px solid var(--border);
          }

          .landlord-notices-row:first-child {
            border-top: 0;
          }

          .landlord-notices-subject {
            display: grid;
            gap: 6px;
          }

          .landlord-notices-subject strong {
            font-size: 15px;
            line-height: 1.35;
          }

          .landlord-notices-subject span,
          .landlord-notices-sent {
            color: var(--ink2);
            font-size: 13px;
          }

          .landlord-notices-delivered {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border-radius: 999px;
            background: rgba(31, 120, 87, 0.12);
            color: #1f7857;
            font-size: 13px;
            font-weight: 700;
            text-transform: lowercase;
          }

          .landlord-notices-dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: currentColor;
          }

          .landlord-notices-empty {
            padding: 40px 22px;
            color: var(--ink2);
            font-size: 14px;
          }

          .landlord-notices-side {
            display: grid;
            gap: 14px;
          }

          .landlord-notices-side-label {
            color: var(--ink3);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .landlord-notices-side-list {
            display: grid;
            gap: 12px;
          }

          .landlord-notices-action {
            width: 100%;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 16px;
            align-items: center;
            padding: 18px 20px;
            border-radius: 18px;
            border: 1px solid var(--border);
            background: var(--surface);
            box-shadow: var(--shadow-sm);
            cursor: pointer;
            text-align: left;
          }

          .landlord-notices-action-icon {
            width: 56px;
            height: 56px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            font-size: 24px;
          }

          .landlord-notices-action-icon.tone-amber {
            background: rgba(236, 191, 108, 0.22);
          }

          .landlord-notices-action-icon.tone-red {
            background: rgba(220, 103, 80, 0.12);
          }

          .landlord-notices-action-icon.tone-green {
            background: rgba(31, 120, 87, 0.1);
          }

          .landlord-notices-action-icon.tone-blue {
            background: rgba(63, 112, 185, 0.12);
          }

          .landlord-notices-action-copy {
            display: grid;
            gap: 4px;
          }

          .landlord-notices-action-copy strong {
            font-size: 15px;
          }

          .landlord-notices-action-copy span {
            color: var(--ink2);
            font-size: 13px;
            line-height: 1.5;
          }

          .landlord-notices-action-arrow {
            color: var(--ink3);
            font-size: 18px;
          }

          .landlord-notices-summary-card {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            padding: 18px;
            border: 1px solid var(--border);
            border-radius: 18px;
            background: linear-gradient(180deg, rgba(26, 58, 42, 0.05), rgba(200, 169, 110, 0.08));
          }

          .landlord-notices-summary-item {
            display: grid;
            gap: 4px;
            padding: 14px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.72);
          }

          .landlord-notices-summary-item span {
            color: var(--ink2);
            font-size: 12px;
          }

          .landlord-notices-summary-item strong {
            font-size: 22px;
          }

          .landlord-notices-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 120;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(15, 18, 18, 0.35);
            backdrop-filter: blur(8px);
          }

          .landlord-notices-modal {
            width: min(100%, 720px);
            border-radius: 28px;
            background: var(--surface);
            box-shadow: var(--shadow-lg);
            overflow: hidden;
          }

          .landlord-notices-modal-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 28px 32px 20px;
            border-bottom: 1px solid var(--border);
          }

          .landlord-notices-modal-head h2 {
            margin: 0;
            font-size: 28px;
            font-family: var(--font-display);
          }

          .landlord-notices-modal-close {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            border: 1px solid var(--border);
            background: var(--surface2);
            color: var(--ink2);
            cursor: pointer;
          }

          .landlord-notices-modal-body {
            display: grid;
            gap: 18px;
            padding: 28px 32px 12px;
          }

          .landlord-notices-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 18px 32px 30px;
            border-top: 1px solid var(--border);
          }

          @media (max-width: 1080px) {
            .landlord-notices-layout {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 720px) {
            .landlord-notices-table-head {
              display: none;
            }

            .landlord-notices-row {
              grid-template-columns: 1fr;
              gap: 12px;
            }

            .landlord-notices-summary-card {
              grid-template-columns: 1fr 1fr;
            }

            .landlord-notices-modal-backdrop {
              align-items: flex-end;
              justify-content: flex-end;
              padding: 0;
            }

            .landlord-notices-modal {
              width: 100%;
              max-height: min(88vh, calc(100dvh - 8px));
              border-radius: 24px 24px 0 0;
              display: flex;
              flex-direction: column;
            }

            .landlord-notices-modal-head,
            .landlord-notices-modal-body,
            .landlord-notices-modal-actions {
              padding-left: 18px;
              padding-right: 18px;
            }

            .landlord-notices-modal-body {
              overflow-y: auto;
            }

            .landlord-notices-modal-actions {
              padding-bottom: calc(18px + env(safe-area-inset-bottom));
              flex-wrap: wrap;
            }

            .landlord-notices-modal-actions > * {
              flex: 1 1 100%;
            }
          }
        `}</style>
      </LandlordPortalShell>
    </>
  );
}
