import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import LegalDocument from "../components/legal/LegalDocument";
import { LEGAL_PRODUCT_NAME, POLICY_SUMMARY, resolveLegalWorkspaceContext } from "../lib/legal";
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

export default function PrivacyPage({
  workspace,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const legal = resolveLegalWorkspaceContext(workspace);

  return (
    <LegalDocument
      title="Privacy Policy"
      summary={POLICY_SUMMARY.privacy}
      urlPath="/privacy"
      workspace={workspace}
      contactEmail={legal.privacyEmail}
      contactPhone={legal.supportPhone}
      legalAddress={legal.legalAddress}
    >
      <section>
        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly, including account identity details,
          contact information, tenancy records, property records, notices, agreements, payment
          metadata, support requests, and communication preferences.
        </p>
        <p>
          We also collect technical and security data such as session activity, device/browser
          information, IP address, timestamps, and logs required to keep the service available,
          secure, and auditable.
        </p>
      </section>

      <section>
        <h2>2. How We Use Information</h2>
        <ul>
          <li>To provide landlord, tenant, caretaker, and internal platform operations functionality.</li>
          <li>To authenticate users and secure accounts.</li>
          <li>To process payments, receipts, notices, reminders, and agreements.</li>
          <li>To improve reliability, support, abuse prevention, and fraud monitoring.</li>
          <li>To send transactional emails, verification messages, and service updates.</li>
          <li>To comply with legal obligations, resolve disputes, and enforce our policies.</li>
        </ul>
      </section>

      <section>
        <h2>3. How Information Is Shared</h2>
        <p>
          We share data only where needed to operate the service, including with infrastructure,
          email, payment, and other service providers acting on our instructions, and with
          counterparties inside the product as required by a tenancy workflow.
        </p>
        <p>
          For example, tenants may receive landlord-generated notices or agreements, caretakers
          may access records within assigned scopes, and payment providers may process billing
          data needed to complete transactions.
        </p>
      </section>

      <section>
        <h2>4. Legal Bases and User Responsibilities</h2>
        <p>
          We process information where needed to perform our contract, operate legitimate product
          and security workflows, comply with legal duties, or act on consent when consent is the
          appropriate basis.
        </p>
        <p>
          Landlords remain responsible for ensuring they have a lawful basis to upload and manage
          tenant and caretaker information in DoorRent.
        </p>
      </section>

      <section>
        <h2>5. Retention and Deletion</h2>
        <p>
          We retain personal data only for as long as needed to provide the service, meet
          contractual or legal obligations, protect against fraud and abuse, or resolve disputes.
        </p>
        <p>
          Account-specific deletion handling, including retained records and deletion timelines,
          is described in the <a href="/account-deletion">Account Deletion Policy</a>.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          We use management, technical, and organisational controls designed to protect
          personal data. More detail is available in the <a href="/security">Security</a> page.
        </p>
      </section>

      <section>
        <h2>7. Your Choices and Rights</h2>
        <p>
          Subject to applicable law, you may request access, correction, deletion, or restriction
          of personal information. You may also update profile information directly in supported
          product areas.
        </p>
        <p>
          Privacy requests can be sent to{" "}
          <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>.
        </p>
      </section>

      <section>
        <h2>8. International Transfers</h2>
        <p>
          DoorRent may rely on service providers located in multiple jurisdictions. Where data is
          transferred across borders, we apply reasonable contractual and operational safeguards
          appropriate to the nature of the information and the services involved.
        </p>
      </section>

      <section>
        <h2>9. Children's Privacy</h2>
        <p>
          {LEGAL_PRODUCT_NAME} is built for adult tenancy and property-management workflows and is
          not directed to children. Do not use the platform to knowingly submit children's
          information except where strictly necessary under applicable law and with appropriate
          authority.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Privacy questions and requests should be sent to{" "}
          <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
