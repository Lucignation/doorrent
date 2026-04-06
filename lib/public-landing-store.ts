import { promises as fs } from "node:fs";
import path from "node:path";
import {
  mergeLandingBuilderDraft,
  type LandingBuilderDraft,
  type LandingBuilderProfile,
  type LandingBuilderWorkspace,
} from "./landing-builder";

export interface PublishedLandingDraftRecord {
  workspaceSlug: string;
  workspaceType: LandingBuilderWorkspace;
  draft: LandingBuilderDraft;
  updatedAt: string;
}

const STORE_PATH = path.join(process.cwd(), "data", "published-landing-drafts.json");

async function readStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Record<string, PublishedLandingDraftRecord>;
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function writeStore(store: Record<string, PublishedLandingDraftRecord>) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeSlug(workspaceSlug: string) {
  return workspaceSlug.trim().toLowerCase();
}

export async function getPublishedLandingDraft(workspaceSlug?: string | null) {
  if (!workspaceSlug?.trim()) {
    return null;
  }

  const store = await readStore();
  return store[normalizeSlug(workspaceSlug)] ?? null;
}

export async function savePublishedLandingDraft(input: {
  workspaceSlug: string;
  workspaceType: LandingBuilderWorkspace;
  profile: LandingBuilderProfile;
  draft: Partial<LandingBuilderDraft> | LandingBuilderDraft;
}) {
  const slug = normalizeSlug(input.workspaceSlug);
  const store = await readStore();
  const normalizedDraft = mergeLandingBuilderDraft(
    input.workspaceType,
    input.profile,
    input.draft,
  );

  const record: PublishedLandingDraftRecord = {
    workspaceSlug: slug,
    workspaceType: input.workspaceType,
    draft: normalizedDraft,
    updatedAt: new Date().toISOString(),
  };

  store[slug] = record;
  await writeStore(store);

  return record;
}
