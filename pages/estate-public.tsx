import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import PageMeta from "../components/layout/PageMeta";
import {
  fetchWorkspaceContextByHost,
  type PublicWorkspaceContext,
} from "../lib/workspace-context";
import { isWorkspaceSubdomainHost, normalizeBrowserHost } from "../lib/frontend-security";
import { getApiRequestBaseUrl } from "../lib/api";

type EstatePublicData = {
  estate: {
    id: string;
    name: string;
    location: string;
    description?: string | null;
    landingTemplateId?: string | null;
    landingHeroTitle?: string | null;
    landingHeroSubtitle?: string | null;
    landingPrimaryCta?: string | null;
    landingSecondaryCta?: string | null;
  } | null;
  workspace: PublicWorkspaceContext["workspace"] | null;
};

type Props = {
  data: EstatePublicData;
  portalUrl: string;
};

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const hostHeader =
    (Array.isArray(context.req.headers["x-forwarded-host"])
      ? context.req.headers["x-forwarded-host"][0]
      : context.req.headers["x-forwarded-host"]) ??
    context.req.headers.host ??
    null;

  const workspaceContext = await fetchWorkspaceContextByHost(hostHeader);

  if (!workspaceContext?.workspace || workspaceContext.workspace.workspaceMode !== "ESTATE_ADMIN") {
    return { redirect: { destination: "/portal", permanent: false } };
  }

  let estate: EstatePublicData["estate"] = null;

  try {
    const res = await fetch(
      `${getApiRequestBaseUrl()}/estate/public-profile?workspaceSlug=${workspaceContext.workspace.workspaceSlug}`,
    );
    if (res.ok) {
      const payload = (await res.json()) as { data?: { estate?: EstatePublicData["estate"] } };
      estate = payload.data?.estate ?? null;
    }
  } catch {
    // fall through — render with branding only
  }

  const isSubdomain = isWorkspaceSubdomainHost(normalizeBrowserHost(hostHeader));
  const portalUrl = isSubdomain ? "/portal" : `/portal`;

  return {
    props: {
      data: {
        estate,
        workspace: workspaceContext.workspace,
      },
      portalUrl,
    },
  };
};

export default function EstatePublicPage({
  data,
  portalUrl,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { workspace, estate } = data;
  const name = estate?.name ?? workspace?.companyName ?? "Estate";
  const heroTitle = estate?.landingHeroTitle ?? `Welcome to ${name}`;
  const heroSubtitle =
    estate?.landingHeroSubtitle ??
    "A well-managed, secure, and connected community.";
  const primaryCta = estate?.landingPrimaryCta ?? "Resident Portal";
  const secondaryCta = estate?.landingSecondaryCta ?? "Contact Us";
  const primaryColor = workspace?.branding?.primaryColor ?? "#1A1A1A";
  const supportEmail = workspace?.publicSupportEmail;
  const supportPhone = workspace?.publicSupportPhone;

  return (
    <>
      <PageMeta
        title={`${name} — Estate`}
        description={heroSubtitle}
      />

      <div style={{ minHeight: "100vh", fontFamily: "var(--font-sans, system-ui, sans-serif)", background: "#FAFAF8" }}>
        {/* Nav */}
        <nav style={{ background: "#fff", borderBottom: "1px solid #E5E5E0", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: primaryColor, letterSpacing: "-0.02em" }}>
            {workspace?.branding?.displayName ?? name}
          </div>
          <Link
            href={portalUrl}
            style={{ background: primaryColor, color: "#fff", borderRadius: 8, padding: "8px 20px", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
          >
            {primaryCta}
          </Link>
        </nav>

        {/* Hero */}
        <section style={{ background: primaryColor, color: "#fff", padding: "80px 32px", textAlign: "center" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
              {heroTitle}
            </h1>
            <p style={{ fontSize: 20, opacity: 0.85, lineHeight: 1.6, marginBottom: 36 }}>
              {heroSubtitle}
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href={portalUrl}
                style={{ background: "#fff", color: primaryColor, borderRadius: 10, padding: "14px 32px", fontWeight: 700, fontSize: 16, textDecoration: "none" }}
              >
                {primaryCta}
              </Link>
              {secondaryCta && supportEmail ? (
                <a
                  href={`mailto:${supportEmail}`}
                  style={{ border: "2px solid rgba(255,255,255,0.4)", color: "#fff", borderRadius: 10, padding: "14px 32px", fontWeight: 600, fontSize: 16, textDecoration: "none" }}
                >
                  {secondaryCta}
                </a>
              ) : null}
            </div>
          </div>
        </section>

        {/* Feature strip */}
        <section style={{ padding: "60px 32px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
            {[
              { title: "Secure Access", body: "QR-code gate control and visitor pass management for every residence." },
              { title: "Estate Dues", body: "Transparent billing, online payment tracking, and receipt issuance." },
              { title: "Community Governance", body: "Resolutions, committees, polls, and announcements — all in one place." },
              { title: "Resident Portal", body: "Residents manage their profile, dues, and requests from any device." },
            ].map((item) => (
              <div key={item.title} style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", border: "1px solid #EAEAE6" }}>
                <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 10, color: primaryColor }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        {(supportEmail || supportPhone) ? (
          <section style={{ background: "#F0EDE8", padding: "48px 32px", textAlign: "center" }}>
            <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Get in touch</h2>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
              {supportEmail ? (
                <a href={`mailto:${supportEmail}`} style={{ color: primaryColor, fontWeight: 600, textDecoration: "none" }}>
                  {supportEmail}
                </a>
              ) : null}
              {supportPhone ? (
                <a href={`tel:${supportPhone}`} style={{ color: primaryColor, fontWeight: 600, textDecoration: "none" }}>
                  {supportPhone}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Footer */}
        <footer style={{ padding: "24px 32px", textAlign: "center", borderTop: "1px solid #E5E5E0", fontSize: 13, color: "#888" }}>
          {name} · Powered by DoorRent
        </footer>
      </div>
    </>
  );
}
