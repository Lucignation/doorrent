import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/layout/PageMeta";
import {
  resolveBrandDisplayName,
  resolveBrandLogoUrl,
  type WorkspaceBranding,
} from "../../lib/branding";
import { apiRequest } from "../../lib/api";
import { getWorkspaceContextFromRequest } from "../../lib/workspace-ssr";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

type PublicVerifyResponse = {
  payment: {
    reference: string;
    amount: string;
    status: string;
    date: string;
  };
};

export const getServerSideProps: GetServerSideProps<{
  branding: WorkspaceBranding | null;
  companyName: string | null;
}> = async (context) => {
  const workspaceContext = await getWorkspaceContextFromRequest(context);

  return {
    props: {
      branding: workspaceContext.workspace?.branding ?? null,
      companyName: workspaceContext.workspace?.companyName ?? null,
    },
  };
};

export default function TenantPaymentCallbackPage({
  branding,
  companyName,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Confirming your Paystack payment...");
  const [reference, setReference] = useState<string | null>(null);

  const brandPrimary = branding?.primaryColor ?? "#6f1d33";
  const brandAccent = branding?.accentColor ?? "#d7ba76";
  const appLabel = resolveBrandDisplayName(
    branding,
    companyName ?? "DoorRent",
  );
  const brandLogo = branding?.logoUrl
    ? resolveBrandLogoUrl(branding, "") || null
    : null;

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const nextReference =
      typeof router.query.reference === "string"
        ? router.query.reference
        : typeof router.query.trxref === "string"
          ? router.query.trxref
          : null;

    setReference(nextReference);

    if (!nextReference) {
      setStatus("error");
      setMessage("We could not find the Paystack payment reference for this checkout.");
      return;
    }

    let cancelled = false;

    async function verifyPayment() {
      try {
        const { data } = await apiRequest<PublicVerifyResponse>(
          "/tenant/payments/verify-public",
          {
            method: "POST",
            body: {
              reference: nextReference,
            },
          },
        );

        if (cancelled) {
          return;
        }

        setStatus("success");
        setMessage(
          `Payment confirmed. Receipt ${data.payment.reference} was recorded successfully.`,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "We could not verify this payment yet.",
        );
      }
    }

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.reference, router.query.trxref]);

  const tone = useMemo(() => {
    if (status === "success") {
      return {
        border: "rgba(26,107,74,0.2)",
        background: "rgba(26,107,74,0.08)",
        title: "Payment confirmed",
      };
    }

    if (status === "error") {
      return {
        border: "rgba(173,61,61,0.22)",
        background: "rgba(173,61,61,0.08)",
        title: "Payment verification pending",
      };
    }

    return {
      border: "rgba(111,29,51,0.18)",
      background: "rgba(111,29,51,0.06)",
      title: "Confirming payment",
    };
  }, [status]);

  return (
    <>
      <PageMeta title="DoorRent — Payment Callback" />
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "32px 16px",
          background:
            "radial-gradient(circle at top left, rgba(111,29,51,0.12), transparent 34%), #f7f4ef",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            borderRadius: 28,
            border: `1px solid ${tone.border}`,
            background: "#ffffff",
            boxShadow: "0 24px 80px rgba(17, 24, 39, 0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 24,
              background: `linear-gradient(135deg, ${brandPrimary}, ${brandAccent})`,
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={`${appLabel} logo`}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    objectFit: "cover",
                    background: "rgba(255,255,255,0.12)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.14)",
                  }}
                >
                  {appLabel.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, opacity: 0.88 }}>Secure rent payment</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{appLabel}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <div
              style={{
                borderRadius: 20,
                border: `1px solid ${tone.border}`,
                background: tone.background,
                padding: 18,
                marginBottom: 18,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                {tone.title}
              </div>
              <div style={{ color: "#4b5563", lineHeight: 1.6 }}>{message}</div>
            </div>

            {reference ? (
              <div
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  marginBottom: 20,
                }}
              >
                Reference: <span style={{ fontWeight: 600, color: "#111827" }}>{reference}</span>
              </div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link
                href="/tenant/login"
                className="btn btn-primary"
                style={{ minWidth: 180, justifyContent: "center" }}
              >
                Open tenant portal
              </Link>
              <Link
                href="/tenant/pay"
                className="btn btn-secondary"
                style={{ minWidth: 180, justifyContent: "center" }}
              >
                Back to payment page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
