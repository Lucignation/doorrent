import type { InferGetServerSidePropsType } from "next";
import { PortalExperience, getWorkspaceAuthServerSideProps } from "../portal";

export const getServerSideProps = getWorkspaceAuthServerSideProps;

export default function TenantLoginPage({
  workspaceBranding,
}: InferGetServerSidePropsType<typeof getWorkspaceAuthServerSideProps>) {
  return (
    <PortalExperience
      forcedRole="tenant"
      workspaceBranding={workspaceBranding}
    />
  );
}
