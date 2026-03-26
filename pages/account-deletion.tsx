import Link from "next/link";
import LegalDocument from "../components/legal/LegalDocument";
import { LEGAL_EMAILS, POLICY_SUMMARY } from "../lib/legal";

export default function AccountDeletionPage() {
  return (
    <LegalDocument
      title="Account Deletion Policy"
      summary={POLICY_SUMMARY.accountDeletion}
      urlPath="/account-deletion"
    >
      <section>
        <h2>1. Self-Service Deletion Paths</h2>
        <p>
          DoorRent supports in-app account deletion for supported landlord, tenant, and caretaker
          experiences.
        </p>
        <ul>
          <li>
            Landlords: sign in and open <strong>Settings</strong>, then use the account deletion
            action in the danger zone.
          </li>
          <li>
            Tenants: sign in and open <strong>Profile</strong>, then use the account deletion
            action in the danger zone.
          </li>
          <li>
            Caretakers: sign in and open <strong>Settings</strong>, then use the account deletion
            action in the danger zone.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Web Resource for Deletion Requests</h2>
        <p>
          If you cannot access the app, you may initiate deletion by emailing{" "}
          <a href={`mailto:${LEGAL_EMAILS.privacy}`}>{LEGAL_EMAILS.privacy}</a> from the email
          address associated with your DoorRent account. Include your role and the reason you
          cannot sign in.
        </p>
        <p>
          You can also access DoorRent's sign-in flows from the web:
        </p>
        <ul>
          <li><Link href="/portal">Landlord portal</Link></li>
          <li><Link href="/tenant/login">Tenant portal</Link></li>
          <li><Link href="/caretaker/login">Caretaker portal</Link></li>
        </ul>
      </section>

      <section>
        <h2>3. What Happens When an Account Is Deleted</h2>
        <p>
          When a landlord account is deleted, related landlord workspace records tied to that
          account are removed from active access, including sessions and the landlord-managed data
          associated with that workspace.
        </p>
        <p>
          When a tenant or caretaker account is deleted, their direct account access is revoked,
          active sessions are removed, and related portal-level data is deleted or detached based
          on the underlying record type.
        </p>
      </section>

      <section>
        <h2>4. Data That May Be Retained</h2>
        <p>
          We may retain limited records where reasonably necessary to meet legal obligations,
          resolve disputes, prevent fraud or abuse, enforce agreements, keep financial/audit
          records, or preserve backups for a short operational recovery window.
        </p>
      </section>

      <section>
        <h2>5. Timing</h2>
        <p>
          Self-service deletion requests take effect immediately on the active account record. Any
          retained backups or processor-side records may remain for the minimum time reasonably
          required for security, accounting, or legal compliance workflows.
        </p>
      </section>

      <section>
        <h2>6. Subscriptions and Payments</h2>
        <p>
          Deleting an account does not automatically cancel or reverse past charges. Refunds and
          billing questions are handled under the <Link href="/refund-policy">Refund Policy</Link>.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          For deletion-related support, contact{" "}
          <a href={`mailto:${LEGAL_EMAILS.privacy}`}>{LEGAL_EMAILS.privacy}</a> or{" "}
          <a href={`mailto:${LEGAL_EMAILS.support}`}>{LEGAL_EMAILS.support}</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
