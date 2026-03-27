import type { GetServerSidePropsContext } from "next";
import {
  fetchWorkspaceContextByHost,
  type PublicWorkspaceContext,
} from "./workspace-context";

export async function getWorkspaceContextFromRequest(
  context: GetServerSidePropsContext,
): Promise<PublicWorkspaceContext> {
  const hostHeader =
    (Array.isArray(context.req.headers["x-forwarded-host"])
      ? context.req.headers["x-forwarded-host"][0]
      : context.req.headers["x-forwarded-host"]) ??
    context.req.headers.host ??
    null;

  return (await fetchWorkspaceContextByHost(hostHeader)) ?? { workspace: null };
}
