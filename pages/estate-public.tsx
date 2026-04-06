import type { GetServerSideProps } from "next";
import { fetchWorkspaceContextByHost } from "../lib/workspace-context";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const hostHeader =
    (Array.isArray(context.req.headers["x-forwarded-host"])
      ? context.req.headers["x-forwarded-host"][0]
      : context.req.headers["x-forwarded-host"]) ??
    context.req.headers.host ??
    null;

  const workspaceContext = await fetchWorkspaceContextByHost(hostHeader);

  if (workspaceContext?.workspace?.workspaceSlug) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: "/",
      permanent: false,
    },
  };
};

export default function EstatePublicRedirectPage() {
  return null;
}
