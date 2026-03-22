import LandlordPortalShell from "../../components/auth/LandlordPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  landlordNoticeTemplates,
  landlordNotices,
} from "../../data/landlord";
import type {
  BadgeTone,
  LandlordNoticeRow,
  LandlordQuickNoticeAction,
  TableColumn,
} from "../../types/app";

function noticeTone(type: LandlordNoticeRow["type"]): BadgeTone {
  if (type === "Rent Increase") {
    return "amber";
  }

  if (type === "Maintenance") {
    return "blue";
  }

  if (type === "Reminder") {
    return "red";
  }

  return "green";
}

function statusTone(status: LandlordNoticeRow["status"]): BadgeTone {
  if (status === "scheduled") {
    return "amber";
  }

  if (status === "draft") {
    return "gray";
  }

  return "green";
}

function actionSwatch(tone: LandlordQuickNoticeAction["tone"]) {
  if (tone === "amber") {
    return { background: "var(--amber-light)", color: "var(--amber)" };
  }

  if (tone === "red") {
    return { background: "var(--red-light)", color: "var(--red)" };
  }

  if (tone === "green") {
    return { background: "var(--green-light)", color: "var(--green)" };
  }

  if (tone === "blue") {
    return { background: "var(--blue-light)", color: "var(--blue)" };
  }

  return { background: "var(--surface2)", color: "var(--ink2)" };
}

export default function LandlordNoticesPage() {
  const { openModal } = usePrototypeUI();
  const noticeColumns: TableColumn<LandlordNoticeRow>[] = [
    {
      key: "subject",
      label: "Subject",
      render: (row) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{row.subject}</div>
          <div className="td-muted" style={{ fontSize: 11 }}>
            {row.recipients}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => <StatusBadge tone={noticeTone(row.type)}>{row.type}</StatusBadge>,
    },
    {
      key: "sent",
      label: "Sent",
      render: (row) => <span className="td-muted">{row.sent}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Notices" />
      <LandlordPortalShell topbarTitle="Notices" breadcrumb="Dashboard → Notices">
        <PageHeader
          title="Notices & Communication"
          description="Send notices, announcements & rent increase letters"
          actions={[{ label: "+ Send Notice", modal: "send-notice", variant: "primary" }]}
        />

        <div className="grid-2">
          <div>
            <div className="tabs">
              <div className="tab active">Sent (18)</div>
              <div className="tab">Scheduled (2)</div>
              <div className="tab">Drafts (1)</div>
            </div>

            <div className="card">
              <DataTable columns={noticeColumns} rows={landlordNotices} />
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              Quick Actions
            </div>

            {landlordNoticeTemplates.map((item) => {
              const swatch = actionSwatch(item.tone);

              return (
                <button
                  key={item.title}
                  type="button"
                  className="mini-card"
                  onClick={() => openModal("send-notice")}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    marginBottom: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: swatch.background,
                        color: swatch.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                        {item.description}
                      </div>
                    </div>
                    <span style={{ marginLeft: "auto", color: "var(--ink3)" }}>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </LandlordPortalShell>
    </>
  );
}
