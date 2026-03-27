import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import LegalDocument from "../components/legal/LegalDocument";
import {
  LEGAL_PRODUCT_NAME,
  POLICY_SUMMARY,
  resolveLegalWorkspaceContext,
} from "../lib/legal";
import { getWorkspaceContextFromRequest } from "../lib/workspace-ssr";

export const getServerSideProps: GetServerSideProps<{
  workspace: Awaited<ReturnType<typeof getWorkspaceContextFromRequest>>["workspace"] | null;
}> = async (context) => {
  const workspaceContext = await getWorkspaceContextFromRequest(context);

  return {
    props: {
      workspace: workspaceContext?.workspace ?? null,
    },
  };
};

export default function TermsPage({
  workspace,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const legal = resolveLegalWorkspaceContext(workspace);

  return (
    <LegalDocument
      title="Terms of Use"
      summary={POLICY_SUMMARY.terms}
      urlPath="/terms"
      workspace={workspace}
      contactEmail={legal.legalEmail}
      contactPhone={legal.supportPhone}
      legalAddress={legal.legalAddress}
    >
      <section>
        <h2>1. Scope</h2>
        <p>
          These Terms of Use govern access to and use of {LEGAL_PRODUCT_NAME}'s marketing
          website, landlord portal, tenant portal, caretaker workspace, APIs, and mobile
          applications operated by <strong>{legal.operatorName}</strong>.
        </p>
        <p>
          By creating an account, signing in, or otherwise using the service, you agree to
          these terms and the related policies linked from this page.
        </p>
      </section>

      <section>
        <h2>2. Roles on the Platform</h2>
        <p>
          <strong>Landlords</strong> create and manage portfolio records, tenancy workflows,
          notices, payments, agreements, and team access.
        </p>
        <p>
          <strong>Tenants</strong> access rent, receipts, agreements, notices, meetings, and
          community features associated with a landlord-managed tenancy.
        </p>
        <p>
          <strong>Caretakers</strong> access only the properties and landlord scopes assigned
          to them by an authorised landlord.
        </p>
      </section>

      <section>
        <h2>3. Eligibility and Account Security</h2>
        <p>
          You must provide accurate account information and keep it current. You are
          responsible for safeguarding credentials, one-time login codes, magic links, and
          any device that remains signed in to your DoorRent account.
        </p>
        <p>
          You must notify us promptly at{" "}
          <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a> if you suspect
          unauthorised access or misuse.
        </p>
      </section>

      <section>
        <h2>4. Acceptable Use</h2>
        <p>You may not use DoorRent to:</p>
        <ul>
          <li>Break the law, infringe rights, or misrepresent tenancy or payment records.</li>
          <li>Access accounts, APIs, or data without authorisation.</li>
          <li>Upload malicious code, scrape protected areas, or abuse automation.</li>
          <li>Send fraudulent, harassing, discriminatory, or unlawful communications.</li>
          <li>Reverse engineer, resell, or exploit the service beyond permitted use.</li>
        </ul>
      </section>

      <section>
        <h2>5. Platform Content and Customer Data</h2>
        <p>
          Landlords are responsible for the accuracy and legal basis of the property, unit,
          tenant, payment, notice, and agreement information they upload or generate in the
          platform.
        </p>
        <p>
          DoorRent provides workflow tools and document templates, but DoorRent is not a law
          firm and does not provide legal advice. Users should obtain independent professional
          advice before relying on generated notices, agreements, defaults, or dispute steps.
        </p>
      </section>

      <section>
        <h2>6. Billing, Plans, and Fees</h2>
        <p>
          DoorRent currently supports subscription-based and commission-based commercial
          arrangements. Pricing, billing intervals, and feature access may vary by plan.
        </p>
        <p>
          Payments authorise us and our payment partners to collect applicable charges. Refund
          handling is described in the <a href="/refund-policy">Refund Policy</a>.
        </p>
      </section>

      <section>
        <h2>7. Privacy and Data Protection</h2>
        <p>
          We handle personal data according to the <a href="/privacy">Privacy Policy</a> and
          apply retention and deletion rules described in the{" "}
          <a href="/account-deletion">Account Deletion Policy</a>.
        </p>
        <p>
          Where landlords upload tenant or caretaker data, landlords remain responsible for
          having an appropriate legal basis and for complying with applicable tenancy and data
          protection laws in their jurisdiction, including the Nigeria Data Protection Act
          where applicable.
        </p>
      </section>

      <section>
        <h2>8. Suspension and Termination</h2>
        <p>
          We may suspend access, restrict features, or terminate accounts where required by law,
          for suspected fraud, abuse, security risk, unpaid fees, or material breach of these
          terms.
        </p>
        <p>
          Users may also delete their accounts using the in-app controls available in supported
          landlord, tenant, and caretaker experiences, or by following the public instructions
          in the <a href="/account-deletion">Account Deletion Policy</a>.
        </p>
      </section>

      <section>
        <h2>9. Intellectual Property</h2>
        <p>
          DoorRent, its software, branding, documentation, layouts, and service materials are
          owned by {legal.operatorName} or its licensors. Except for the limited right to use
          the service as provided, no ownership rights are transferred to you.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers and Liability</h2>
        <p>
          DoorRent is provided on an "as available" basis. We work to maintain reliability and
          security but do not guarantee uninterrupted service, perfect accuracy of user-supplied
          records, or suitability for every legal or operational workflow.
        </p>
        <p>
          To the maximum extent permitted by law, indirect, incidental, and consequential losses
          are excluded. Our aggregate liability arising from these terms is limited to fees paid
          directly to us in the three months preceding the event giving rise to the claim.
        </p>
      </section>

      <section>
        <h2>11. Governing Law</h2>
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria unless
          mandatory local law requires otherwise. Courts in Nigeria will have exclusive
          jurisdiction over disputes relating to these terms, subject to any mandatory consumer
          rights that apply to you.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${legal.legalEmail}`}>{legal.legalEmail}</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
