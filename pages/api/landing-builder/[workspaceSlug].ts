import type { NextApiRequest, NextApiResponse } from "next";
import type {
  LandingBuilderDraft,
  LandingBuilderProfile,
  LandingBuilderWorkspace,
} from "../../../lib/landing-builder";
import {
  getPublishedLandingDraft,
  savePublishedLandingDraft,
} from "../../../lib/public-landing-store";

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

function isWorkspaceType(value: unknown): value is LandingBuilderWorkspace {
  return value === "estate" || value === "property";
}

function isProfile(value: unknown): value is LandingBuilderProfile {
  return Boolean(
    value &&
      typeof value === "object" &&
      "companyName" in value &&
      typeof (value as LandingBuilderProfile).companyName === "string",
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
    const record = await getPublishedLandingDraft(workspaceSlug);

    response.status(200).json({
      success: true,
      data: record,
    });
    return;
  }

  if (request.method === "PUT") {
    const body = request.body as {
      workspaceType?: LandingBuilderWorkspace;
      profile?: LandingBuilderProfile;
      draft?: Partial<LandingBuilderDraft> | LandingBuilderDraft;
    };

    if (!isWorkspaceType(body.workspaceType)) {
      response.status(400).json({
        success: false,
        message: "A valid workspace type is required.",
      });
      return;
    }

    if (!isProfile(body.profile)) {
      response.status(400).json({
        success: false,
        message: "A valid workspace profile is required.",
      });
      return;
    }

    const record = await savePublishedLandingDraft({
      workspaceSlug,
      workspaceType: body.workspaceType,
      profile: body.profile,
      draft: body.draft ?? {},
    });

    response.status(200).json({
      success: true,
      data: record,
    });
    return;
  }

  response.setHeader("Allow", "GET, PUT");
  response.status(405).json({
    success: false,
    message: "Method not allowed.",
  });
}
