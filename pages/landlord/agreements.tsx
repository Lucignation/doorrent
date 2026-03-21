import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { landlordAgreements, landlordNav, landlordUser } from "../../data/landlord";
import type { BadgeTone, LandlordAgreementRow, TableColumn } from "../../types/app";

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

export default function LandlordAgreementsPage() {
  const { showToast } = usePrototypeUI();
  const agreementColumns: TableColumn<LandlordAgreementRow>[] = [
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
      render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" className="btn btn-ghost btn-xs">
            View
          </button>
          {row.status === "sent" ? (
            <button type="button" className="btn btn-secondary btn-xs" onClick={() => showToast("Reminder sent", "success")}>
              Resend
            </button>
          ) : null}
          {row.status === "signed" ? (
            <button type="button" className="btn btn-secondary btn-xs">
              Download
            </button>
          ) : null}
          {row.status === "draft" ? (
            <button type="button" className="btn btn-primary btn-xs" onClick={() => showToast("Agreement sent to tenant", "success")}>
              Send
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Agreements" />
      <AppShell
        user={landlordUser}
        topbarTitle="Agreements"
        breadcrumb="Dashboard → Agreements"
        navSections={landlordNav}
      >
        <PageHeader
          title="Agreements"
          description="Tenancy agreements & e-signature tracking"
          actions={[
            { label: "Upload Template", variant: "secondary" },
            { label: "+ New Agreement", toastMessage: "Select a tenant to generate agreement", toastTone: "info", variant: "primary" },
          ]}
        />

        <div className="tabs">
          <div className="tab active">All Agreements (12)</div>
          <div className="tab" onClick={() => showToast("Filter applied", "info")}>Pending (2)</div>
          <div className="tab" onClick={() => showToast("Filter applied", "info")}>Signed (9)</div>
          <div className="tab" onClick={() => showToast("Filter applied", "info")}>Expired (1)</div>
        </div>

        <div className="card">
          <DataTable columns={agreementColumns} rows={landlordAgreements} />
        </div>
      </AppShell>
    </>
  );
}
