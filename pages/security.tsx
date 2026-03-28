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

export default function SecurityPage({
  workspace,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const legal = resolveLegalWorkspaceContext(workspace);

  return (
    <LegalDocument
      title="Security"
      summary={POLICY_SUMMARY.security}
      urlPath="/security"
      workspace={workspace}
      contactEmail={legal.securityEmail}
      contactPhone={legal.supportPhone}
      legalAddress={legal.legalAddress}
    >
      <section>
        <h2>1. Security Approach</h2>
        <p>
          DoorRent uses layered security controls designed to protect account access, payment
          flows, internal operations, and customer data across web, API, and mobile surfaces.
        </p>
      </section>

      <section>
        <h2>2. Account Protection</h2>
        <ul>
          <li>Authenticated landlord, tenant, caretaker, and internal operations sessions.</li>
          <li>Password hashing, one-time codes, and time-limited magic-link workflows.</li>
          <li>Role-scoped access controls across protected product areas.</li>
          <li>Biometric unlock on supported mobile experiences.</li>
          <li>Workspace-aware login controls for branded subdomains and scoped access surfaces.</li>
          <li>Session invalidation when accounts are deleted.</li>
        </ul>
      </section>

      <section>
        <h2>3. Operational Controls</h2>
        <p>
          We use logging, request validation, access checks, and dependency-managed services to
          reduce abuse, unauthorised access, and avoidable data exposure. Access to production
          tooling is limited to authorised personnel who require it to operate the service.
        </p>
        <p>
          Sensitive processor credentials and reusable billing authorisations are stored using
          application-level protection controls and are not exposed through public product flows.
        </p>
      </section>

      <section>
        <h2>4. Third-Party Providers</h2>
        <p>
          DoorRent relies on carefully selected providers for infrastructure, email, and payment
          processing. Those providers maintain their own security and compliance programs, and we
          use them only for the portions of the workflow they are intended to support.
        </p>
        <p>
          Some workflows may also depend on third-party meeting, messaging, push-notification, or
          payment services. Their availability and security posture remain subject to their own
          policies and platform controls.
        </p>
      </section>

      <section>
        <h2>5. Incident Response</h2>
        <p>
          If we become aware of a security incident that materially affects DoorRent data or
          service integrity, we will investigate, contain, remediate, and notify affected parties
          when required by law or where we determine notice is appropriate.
        </p>
      </section>

      <section>
        <h2>6. Responsible Disclosure</h2>
        <p>
          If you discover a potential vulnerability, please report it privately to{" "}
          <a href={`mailto:${legal.securityEmail}`}>{legal.securityEmail}</a> with enough
          detail for us to reproduce and assess the issue. Please do not exploit the issue, access
          data you do not own, or disrupt the service.
        </p>
      </section>
    </LegalDocument>
  );
}
