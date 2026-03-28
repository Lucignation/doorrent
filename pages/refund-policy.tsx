import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import LegalDocument from "../components/legal/LegalDocument";
import { POLICY_SUMMARY, resolveLegalWorkspaceContext } from "../lib/legal";
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

export default function RefundPolicyPage({
  workspace,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const legal = resolveLegalWorkspaceContext(workspace);

  return (
    <LegalDocument
      title="Refund Policy"
      summary={POLICY_SUMMARY.refund}
      urlPath="/refund-policy"
      workspace={workspace}
      contactEmail={legal.billingEmail}
      contactPhone={legal.supportPhone}
      legalAddress={legal.legalAddress}
    >
      <section>
        <h2>1. Scope</h2>
        <p>
          This policy explains how DoorRent handles refund requests for subscription fees,
          commission-related billing errors, duplicate charges, and exceptional platform failures.
        </p>
      </section>

      <section>
        <h2>2. Subscription Fees</h2>
        <p>
          Subscription charges for <strong>Basic</strong> and <strong>Enterprise</strong> are
          billed in advance on a monthly basis. Unless required by law, paid subscription
          periods are generally non-refundable once access to that billing period has started.
        </p>
        <p>
          We may review refund requests for duplicate charges, accidental multiple renewals, or
          platform-side billing errors reported promptly.
        </p>
        <p>
          If you cancel a subscription, the cancellation applies at the end of the current paid
          billing period. Cancellation does not create an automatic refund for the active month.
        </p>
      </section>

      <section>
        <h2>3. Pro Commission Fees</h2>
        <p>
          Pro plan fees tied to successfully processed rent payments are generally non-refundable
          once the underlying payment has been completed and settled, except where we determine
          the charge was made in error.
        </p>
        <p>
          Chargebacks, reversals, or processor disputes may require a case-by-case review based
          on the underlying payment evidence and the payment processor’s final outcome.
        </p>
      </section>

      <section>
        <h2>4. Situations That May Qualify</h2>
        <ul>
          <li>Duplicate or clearly erroneous charges.</li>
          <li>Charges caused by a documented DoorRent billing failure.</li>
          <li>Unauthorised billing confirmed after investigation.</li>
          <li>Service credits or partial refunds approved by DoorRent in exceptional cases.</li>
        </ul>
      </section>

      <section>
        <h2>5. Situations That Usually Do Not Qualify</h2>
        <ul>
          <li>Change of mind after a billing cycle has started.</li>
          <li>Failure to use the service after purchase or renewal.</li>
          <li>Misconfiguration, incomplete onboarding, or data-entry mistakes by the customer.</li>
          <li>Guided onboarding effort already provided for Enterprise after activation.</li>
          <li>Charges correctly applied under the selected plan or commercial model.</li>
        </ul>
      </section>

      <section>
        <h2>6. How to Request a Refund</h2>
        <p>
          Send the account email, charge date, amount, payment reference, and reason for the
          request to <a href={`mailto:${legal.billingEmail}`}>{legal.billingEmail}</a>.
        </p>
        <p>
          We recommend submitting requests within 7 days of the charge date so we can investigate
          while processor data is fresh.
        </p>
      </section>

      <section>
        <h2>7. Review Timeline</h2>
        <p>
          We aim to acknowledge billing requests within 3 business days and provide a decision as
          quickly as the available payment and account evidence allows. Approved refunds are sent
          back through the original payment channel where possible. Where a workspace uses its
          own payment processor account, the final processor timeline may depend on that
          provider’s own rules and settlement process.
        </p>
      </section>

      <section>
        <h2>8. Relationship to Account Deletion</h2>
        <p>
          Deleting an account does not automatically create a refund entitlement. Refund reviews
          remain subject to this policy even if the account is later closed.
        </p>
      </section>
    </LegalDocument>
  );
}
