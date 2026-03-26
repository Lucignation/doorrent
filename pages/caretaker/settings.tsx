import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import CaretakerPortalShell from "../../components/auth/CaretakerPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import AccountDeletionConsentModal from "../../components/ui/AccountDeletionConsentModal";
import PageHeader from "../../components/ui/PageHeader";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { useCaretakerPortalSession } from "../../context/TenantSessionContext";
import { apiRequest } from "../../lib/api";

export default function CaretakerSettingsPage() {
  const router = useRouter();
  const { showToast } = usePrototypeUI();
  const { caretakerSession, clearCaretakerSession } = useCaretakerPortalSession();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function deleteAccount() {
    if (!caretakerSession?.token || deletingAccount) {
      return;
    }

    setDeletingAccount(true);

    try {
      await apiRequest("/caretaker/account", {
        method: "DELETE",
        token: caretakerSession.token,
      });
      setShowDeleteModal(false);
      await router.replace("/account-deletion");
      clearCaretakerSession();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not delete this caretaker account.",
        "error",
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  const description = caretakerSession
    ? `${caretakerSession.caretaker.organizationName} · ${caretakerSession.caretaker.email}`
    : "Manage your caretaker account and policy access.";

  return (
    <>
      <PageMeta title="DoorRent — Caretaker Settings" urlPath="/caretaker/settings" />
      <CaretakerPortalShell topbarTitle="Settings" breadcrumb="Workspace → Settings">
        <PageHeader title="Settings" description={description} />

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Caretaker Profile</div>
                <div className="card-subtitle">Current identity and assignment access.</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <input
                    className="form-input"
                    value={caretakerSession?.caretaker.organizationName ?? "—"}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input
                    className="form-input"
                    value={caretakerSession?.caretaker.contactName ?? "—"}
                    disabled
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-input"
                    value={caretakerSession?.caretaker.email ?? "—"}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={caretakerSession?.caretaker.phone ?? "—"}
                    disabled
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Assignments</label>
                  <input
                    className="form-input"
                    value={`${caretakerSession?.caretaker.assignmentsCount ?? 0}`}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Landlords</label>
                  <input
                    className="form-input"
                    value={`${caretakerSession?.caretaker.landlordCount ?? 0}`}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Legal & Account Deletion</div>
                <div className="card-subtitle">
                  Review policies and permanently close this caretaker account.
                </div>
              </div>
            </div>
            <div className="card-body">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <Link href="/terms" className="btn btn-secondary btn-xs">
                  Terms of Use
                </Link>
                <Link href="/privacy" className="btn btn-secondary btn-xs">
                  Privacy Policy
                </Link>
                <Link href="/refund-policy" className="btn btn-secondary btn-xs">
                  Refund Policy
                </Link>
                <Link href="/account-deletion" className="btn btn-secondary btn-xs">
                  Account Deletion
                </Link>
              </div>

              <div
                style={{
                  border: "1px solid rgba(220, 64, 64, 0.18)",
                  background: "rgba(220, 64, 64, 0.05)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  Danger Zone
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink2)",
                    lineHeight: 1.6,
                    marginBottom: 14,
                  }}
                >
                  Deleting this caretaker account removes its active sessions and assignment
                  access. Historical records may be retained only where required for legal, audit,
                  or security reasons.
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deletingAccount}
                >
                  {deletingAccount ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <AccountDeletionConsentModal
          open={showDeleteModal}
          title="Delete caretaker account?"
          description="This permanently removes this caretaker's DoorRent access and assignment reach."
          consequences={[
            "Caretaker sign-in access and active sessions will be revoked.",
            "Assignment access is removed from active workspace use.",
            "Some historical records may be retained for legal, audit, security, or incident review purposes.",
          ]}
          consentLabel="I understand that deleting this caretaker account is permanent."
          busy={deletingAccount}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={deleteAccount}
        />
      </CaretakerPortalShell>
    </>
  );
}
