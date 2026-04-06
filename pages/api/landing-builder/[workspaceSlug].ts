import type { NextApiRequest, NextApiResponse } from "next";
import { API_BASE_URL } from "../../../lib/api";

type ApiResponse =
  | {
      success: true;
      data: unknown;
    }
  | {
      success: false;
      message: string;
    };

function getWorkspaceSlug(queryValue: string | string[] | undefined) {
  if (Array.isArray(queryValue)) {
    return queryValue[0] ?? "";
  }

  return queryValue ?? "";
}

function getHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function relayUpstreamResponse(
  upstream: Response,
  response: NextApiResponse<ApiResponse>,
) {
  const payload = (await upstream.json().catch(() => null)) as ApiResponse | null;

  if (payload) {
    response.status(upstream.status).json(payload);
    return;
  }

  response.status(upstream.status).json(
    upstream.ok
      ? {
          success: true,
          data: null,
        }
      : {
          success: false,
          message: "We could not complete your request.",
        },
  );
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<ApiResponse>,
) {
  const workspaceSlug = getWorkspaceSlug(request.query.workspaceSlug);

  if (!workspaceSlug.trim()) {
    response.status(400).json({
      success: false,
      message: "Workspace slug is required.",
    });
    return;
  }

  if (request.method === "GET") {
    const upstream = await fetch(
      `${API_BASE_URL}/auth/workspace/landing-page?slug=${encodeURIComponent(workspaceSlug)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    await relayUpstreamResponse(upstream, response);
    return;
  }

  if (request.method === "PUT") {
    const authorization = getHeaderValue(request.headers.authorization);
    const workspaceHost = getHeaderValue(request.headers["x-workspace-host"]);
    const upstream = await fetch(`${API_BASE_URL}/landlord/settings/landing-page`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(workspaceHost ? { "x-workspace-host": workspaceHost } : {}),
      },
      body: JSON.stringify({
        ...(request.body && typeof request.body === "object" ? request.body : {}),
        workspaceSlug,
      }),
    });

    await relayUpstreamResponse(upstream, response);
    return;
  }

  response.setHeader("Allow", "GET, PUT");
  response.status(405).json({
    success: false,
    message: "Method not allowed.",
  });
}
