import { useEffect, useState } from "react";
import AdminPortalShell from "../../components/auth/AdminPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import DataTable from "../../components/ui/DataTable";
import IdentityCell from "../../components/ui/IdentityCell";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAdminPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import type { TableColumn } from "../../types/app";

interface StaffRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  joinedAt: string;
}

interface StaffResponse {
  count: number;
  staff: StaffRow[];
}

export default function AdminStaffPage() {
  const { adminSession } = useAdminPortalSession();
  const { dataRefreshVersion } = usePrototypeUI();
  const [data, setData] = useState<StaffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!adminSession?.token) return;
    const token = adminSession.token;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: result } = await apiRequest<StaffResponse>("/admin/staff", { token });
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load staff.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [dataRefreshVersion, adminSession?.token]);

  const columns: TableColumn<StaffRow>[] = [
    { key: "name", label: "Name", render: (row) => <IdentityCell primary={row.name} secondary={row.email} /> },
    { key: "role", label: "Role", render: (row) => <StatusBadge tone="red">{row.role}</StatusBadge> },
    { key: "phone", label: "Phone", render: (row) => <span className="td-muted">{row.phone ?? "—"}</span> },
    { key: "joinedAt", label: "Joined", render: (row) => <span className="td-muted">{row.joinedAt}</span> },
  ];

  return (
    <>
      <PageMeta title="DoorRent — Staff & Roles" />
      <AdminPortalShell topbarTitle="Staff & Roles" breadcrumb="Dashboard → Staff & Roles">
        <PageHeader
          title="Staff & Roles"
          description={data ? `${data.count} admin account${data.count === 1 ? "" : "s"}` : loading ? "Loading..." : error || "No staff found."}
        />

        {error ? (
          <div className="card">
            <div className="card-body" style={{ color: "var(--red)" }}>{error}</div>
          </div>
        ) : (
          <div className="card">
            <DataTable
              columns={columns}
              rows={data?.staff ?? []}
              emptyMessage={loading ? "Loading staff..." : "No staff accounts found."}
            />
          </div>
        )}
      </AdminPortalShell>
    </>
  );
}
