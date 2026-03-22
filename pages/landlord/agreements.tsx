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

interface AgreementSummary {
  total: number;
  draft: number;
  sent: number;
  signed: number;
  expired: number;
}

interface AgreementsResponse {
  count: number;
  summary: AgreementSummary;
  agreements: Array<LandlordAgreementRow & { id: string }>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "DRAFT" | "SENT" | "SIGNED" | "EXPIRED">("");

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
        const { data } = await apiRequest<AgreementsResponse>(
          `/landlord/agreements${query}`,
          {
            token: landlordToken,
          },
        );

        if (!cancelled) {
          setAgreementData(data);
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

  const agreementColumns: TableColumn<LandlordAgreementRow & { id: string }>[] =
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
              <button type="button" className="btn btn-ghost btn-xs">
                View
              </button>
              {row.status === "sent" ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => showToast("Reminder flow coming next", "info")}
                >
                  Resend
                </button>
              ) : null}
              {row.status === "signed" ? (
                <button type="button" className="btn btn-secondary btn-xs">
                  Download
                </button>
              ) : null}
            </div>
          ),
        },
      ],
      [showToast],
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
      </LandlordPortalShell>
    </>
  );
}
