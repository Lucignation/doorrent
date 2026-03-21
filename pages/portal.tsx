import Link from "next/link";
import { useState } from "react";
import PageMeta from "../components/layout/PageMeta";
import { usePrototypeUI } from "../context/PrototypeUIContext";

type RoleKey = "landlord" | "admin" | "tenant";

const roles: Record<RoleKey, { label: string; href: string; button: string }> = {
  landlord: {
    label: "Landlord",
    href: "/landlord",
    button: "Sign in as Landlord",
  },
  admin: {
    label: "Admin",
    href: "/admin",
    button: "Sign in as Admin",
  },
  tenant: {
    label: "Tenant",
    href: "/tenant",
    button: "Sign in as Tenant",
  },
};

export default function PortalPage() {
  const [role, setRole] = useState<RoleKey>("landlord");
  const { showToast } = usePrototypeUI();

  return (
    <>
      <PageMeta
        title="DoorRent — Demo Portal"
        description="Portal entry point for the landlord, admin, and tenant demo experiences."
      />

      <div id="auth-screen">
        <div className="auth-left">
          <div className="auth-logo">
            <div className="auth-logo-mark">P</div>
            <span className="auth-logo-name">DoorRent</span>
          </div>

          <div className="auth-tagline">
            <h1>
              Property management
              <br />
              <em>reimagined.</em>
            </h1>
            <p>
              The complete platform for landlords — from rent collection to
              agreements, reminders, and tenant communication.
            </p>
          </div>

          <div className="auth-stats">
            <div className="auth-stat">
              <strong>12K+</strong>
              <span>Properties managed</span>
            </div>
            <div className="auth-stat">
              <strong>₦4.2B</strong>
              <span>Rent collected</span>
            </div>
            <div className="auth-stat">
              <strong>98.3%</strong>
              <span>Uptime SLA</span>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-wrap">
            <h2>Welcome back</h2>
            <p>Sign in to your DoorRent account</p>

            <div className="role-pills">
              {Object.entries(roles).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  className={`role-pill ${role === key ? "active" : ""}`}
                  onClick={() => setRole(key as RoleKey)}
                >
                  {key === "landlord" ? "🏠" : key === "admin" ? "⚙️" : "🔑"}{" "}
                  {value.label}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                defaultValue="babatunde@lekki.io"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                defaultValue="password123"
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div className="checkbox-wrap">
                <input type="checkbox" id="remember" defaultChecked />
                <label htmlFor="remember">Remember me</label>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--accent)",
                  fontWeight: 500,
                }}
              >
                Forgot password?
              </span>
            </div>

            <Link href={roles[role].href} className="btn btn-primary btn-full" style={{ padding: 12 }}>
              {roles[role].button}
            </Link>

            <div className="auth-link">
              No account?{" "}
              <button
                type="button"
                onClick={() => showToast("Contact your platform admin to create an account", "info")}
                style={{ color: "var(--accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
              >
                Get started →
              </button>
            </div>

            <div
              style={{
                marginTop: 24,
                padding: 14,
                background: "var(--accent2-light)",
                border: "1px solid rgba(200,169,110,0.3)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--amber)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Demo Access
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link
                  href="/landlord"
                  style={{
                    fontSize: 12,
                    color: "var(--ink2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 4,
                    background: "var(--surface)",
                  }}
                >
                  <span>🏠</span> <strong>Landlord</strong> — Babatunde Adeyemi
                </Link>
                <Link
                  href="/admin"
                  style={{
                    fontSize: 12,
                    color: "var(--ink2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 4,
                    background: "var(--surface)",
                  }}
                >
                  <span>⚙️</span> <strong>Super Admin</strong> — DoorRent Team
                </Link>
                <Link
                  href="/tenant"
                  style={{
                    fontSize: 12,
                    color: "var(--ink2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 4,
                    background: "var(--surface)",
                  }}
                >
                  <span>🔑</span> <strong>Tenant</strong> — Amaka Obi
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
