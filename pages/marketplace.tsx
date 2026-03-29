import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import PageMeta from "../components/layout/PageMeta";
import { apiRequest } from "../lib/api";
import { LOGO_PATH } from "../lib/site";

type ListingStatus = "vacant" | "in_process" | "occupied";
type ProcessStep = "verification" | "reservation" | "clearance";

interface CareContact {
  name: string;
  phone: string;
  email: string;
  avatar: string;
}

interface Landlord {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  company: string;
  verified: boolean;
}

interface Listing {
  id: string;
  propertyName: string;
  unitNumber: string;
  fullAddress: string;
  city: string;
  area: string;
  state: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number;
  floor: number;
  furnished: boolean;
  amenities: string[];
  rent: number;
  serviceCharge: number;
  frequency: string;
  status: ListingStatus;
  processStep?: ProcessStep;
  processedAt?: string;
  availableFrom: string;
  landlord: Landlord;
  care: CareContact;
  photos: string[];
  description: string;
  postedAt: string;
}

interface MarketplaceResponse {
  summary: {
    totalListings: number;
    availableCount: number;
    reservedCount: number;
  };
  filters: {
    areas: string[];
  };
  listings: Listing[];
}

const BRAND = {
  page: "#08110d",
  header: "#0d1914",
  headerEnd: "#08110d",
  panel: "#102018",
  panelAlt: "#13241c",
  modal: "#0f1d17",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(200,169,110,0.18)",
  surfaceSoft: "rgba(255,255,255,0.04)",
  surfaceMuted: "rgba(255,255,255,0.06)",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.62)",
  textSoft: "rgba(255,255,255,0.38)",
  accent: "#C8A96E",
  accentText: "#E2C58D",
  accentBg: "rgba(200,169,110,0.12)",
  accentBorder: "rgba(200,169,110,0.25)",
  success: "#6ADBA8",
  successText: "#93E7BF",
  successBg: "rgba(26,107,74,0.22)",
  successBorder: "rgba(106,219,168,0.22)",
  neutralText: "rgba(255,255,255,0.72)",
};

const STATUS_CONFIG = {
  vacant: {
    label: "Available",
    icon: "✦",
    color: BRAND.success,
    bg: BRAND.successBg,
    text: BRAND.successText,
    description: "Ready to move in",
  },
  in_process: {
    label: "Reserved",
    icon: "◎",
    color: BRAND.accent,
    bg: BRAND.accentBg,
    text: BRAND.accentText,
    description: "Temporarily on verified hold",
  },
  occupied: {
    label: "Unavailable",
    icon: "●",
    color: "rgba(255,255,255,0.24)",
    bg: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.55)",
    description: "Currently occupied",
  },
} as const;

const PROCESS_STEPS: Record<ProcessStep, { label: string; step: number }> = {
  verification: { label: "Verification Hold", step: 1 },
  reservation: { label: "Reservation Hold", step: 2 },
  clearance: { label: "Move-in Clearance", step: 3 },
};

type FilterKey = "all" | "vacant" | "in_process";
type SortKey = "newest" | "price_asc" | "price_desc" | "size_desc";
type BedFilter = "any" | "1" | "2" | "3" | "4+";

const BED_FILTERS: BedFilter[] = ["any", "1", "2", "3", "4+"];

const fmt = (value: number) => `₦${value.toLocaleString("en-NG")}`;
const MARKETPLACE_PAGE_GUTTER = "clamp(20px, 2vw, 32px)";

function MarketplaceSiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const navLinkStyle: React.CSSProperties = {
    color: BRAND.textMuted,
    textDecoration: "none",
    fontSize: 14,
    padding: "8px 12px",
    borderRadius: 10,
  };

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 16px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
  };

  return (
    <header
      ref={headerRef}
      style={{
        background: `linear-gradient(180deg, ${BRAND.header} 0%, ${BRAND.headerEnd} 100%)`,
        borderBottom: `1px solid ${BRAND.surfaceSoft}`,
      }}
    >
      <div style={{ width: "100%", padding: `18px ${MARKETPLACE_PAGE_GUTTER}` }}>
        {/* Main row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src={LOGO_PATH} alt="DoorRent logo" style={{ width: 42, height: 42, objectFit: "contain" }} />
            <span style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 22, letterSpacing: "-0.02em", color: BRAND.text }}>
              DoorRent
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="mkt-desktop-links" style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", marginRight: 12 }}>
            <Link href="/" style={navLinkStyle}>Home</Link>
            <Link href="/#features" style={navLinkStyle}>Features</Link>
            <Link href="/#pricing" style={navLinkStyle}>Why it&apos;s free</Link>
          </div>

          {/* Desktop CTA buttons */}
          <div className="mkt-desktop-cta" style={{ display: "flex", gap: 10 }}>
            <Link href="/portal" style={{ ...buttonStyle, background: "#ffffff", border: "1px solid rgba(255,255,255,0.12)", color: "#151712" }}>
              Sign in
            </Link>
            <Link href="/portal" style={{ ...buttonStyle, background: "#1A6B4A", border: "1px solid #1A6B4A", color: "#ffffff" }}>
              Get started →
            </Link>
          </div>

          {/* Mobile: hamburger only */}
          <button
            type="button"
            className={`mkt-hamburger${menuOpen ? " is-open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="mkt-bar mkt-bar-top" />
            <span className="mkt-bar mkt-bar-mid" />
            <span className="mkt-bar mkt-bar-bot" />
          </button>
        </div>

        {/* Animated mobile menu */}
        <div className={`mkt-mobile-menu${menuOpen ? " is-open" : ""}`} aria-hidden={!menuOpen}>
          <Link href="/" className="mkt-mitem" style={{ "--i": 0 } as React.CSSProperties} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/#features" className="mkt-mitem" style={{ "--i": 1 } as React.CSSProperties} onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="/#pricing" className="mkt-mitem" style={{ "--i": 2 } as React.CSSProperties} onClick={() => setMenuOpen(false)}>Why it&apos;s free</Link>
          <div className="mkt-mdivider" />
          <Link href="/portal" className="mkt-mitem" style={{ "--i": 3 } as React.CSSProperties} onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link href="/portal" className="mkt-mitem mkt-mitem-cta" style={{ "--i": 4 } as React.CSSProperties} onClick={() => setMenuOpen(false)}>Get started →</Link>
        </div>
      </div>

      <style>{`
        .mkt-hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 10px;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
          position: relative;
          transition: background 0.25s, border-color 0.25s;
        }
        .mkt-hamburger:hover { background: rgba(255,255,255,0.18); }

        .mkt-bar {
          position: absolute;
          left: 50%;
          width: 20px;
          height: 2px;
          border-radius: 2px;
          background: ${BRAND.text};
          transform-origin: center;
          transition: transform 0.35s cubic-bezier(0.23,1,0.32,1),
                      opacity 0.25s ease,
                      top 0.35s cubic-bezier(0.23,1,0.32,1);
          translate: -50% 0;
        }
        .mkt-bar-top { top: 13px; }
        .mkt-bar-mid { top: 19px; }
        .mkt-bar-bot { top: 25px; }
        .mkt-hamburger.is-open .mkt-bar-top { top: 19px; transform: translateX(-50%) rotate(45deg); }
        .mkt-hamburger.is-open .mkt-bar-mid { opacity: 0; transform: translateX(-50%) scaleX(0); }
        .mkt-hamburger.is-open .mkt-bar-bot { top: 19px; transform: translateX(-50%) rotate(-45deg); }

        @keyframes mkt-menu-in {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mkt-item-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .mkt-mobile-menu {
          display: none;
          flex-direction: column;
          gap: 2px;
          border-top: 1px solid ${BRAND.surfaceSoft};
          margin-top: 8px;
          padding: 10px 0 14px;
        }
        .mkt-mobile-menu.is-open {
          display: flex;
          animation: mkt-menu-in 0.3s cubic-bezier(0.23,1,0.32,1) both;
        }
        .mkt-mitem {
          display: flex;
          align-items: center;
          padding: 11px 14px;
          font-size: 15px;
          font-weight: 500;
          color: ${BRAND.textMuted};
          text-decoration: none;
          border-radius: 10px;
          opacity: 0;
          animation: mkt-item-in 0.3s cubic-bezier(0.23,1,0.32,1) both;
          animation-delay: calc(var(--i) * 50ms + 60ms);
          transition: background 0.15s, color 0.15s;
        }
        .mkt-mitem:hover { background: rgba(255,255,255,0.07); color: ${BRAND.text}; }
        .mkt-mitem-cta {
          justify-content: center;
          background: #1A6B4A;
          color: #fff !important;
          font-weight: 600;
          margin-top: 4px;
        }
        .mkt-mitem-cta:hover { background: #15583c !important; }
        .mkt-mdivider { height: 1px; background: ${BRAND.surfaceSoft}; margin: 6px 2px; }

        @media (max-width: 760px) {
          .mkt-desktop-links, .mkt-desktop-cta { display: none !important; }
          .mkt-hamburger { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

function frequencySuffix(frequency: string) {
  const normalized = frequency.trim().toLowerCase();

  if (normalized === "daily") {
    return "/ day";
  }

  if (normalized === "yearly") {
    return "/ year";
  }

  return "/ month";
}

function compactFrequencySuffix(frequency: string) {
  const normalized = frequency.trim().toLowerCase();

  if (normalized === "daily") {
    return "/day";
  }

  if (normalized === "yearly") {
    return "/yr";
  }

  return "/mo";
}

function MarketplaceSiteFooter() {
  const headingStyle = {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    marginBottom: 16,
  };

  const listStyle = {
    listStyle: "none",
    display: "grid",
    gap: 10,
    padding: 0,
    margin: 0,
  } as const;

  const linkStyle = {
    color: BRAND.textMuted,
    textDecoration: "none",
    fontSize: 15,
    lineHeight: 1.6,
  } as const;

  return (
    <footer
      style={{
        background: BRAND.header,
        borderTop: `1px solid ${BRAND.surfaceSoft}`,
        padding: `56px ${MARKETPLACE_PAGE_GUTTER} 36px`,
      }}
    >
      <div style={{ width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 32,
            marginBottom: 40,
          }}
        >
          <div style={{ maxWidth: 340 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <img
                src={LOGO_PATH}
                alt="DoorRent logo"
                style={{ width: 42, height: 42, objectFit: "contain" }}
              />
              <span
                style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: 22,
                  letterSpacing: "-0.02em",
                  color: BRAND.text,
                }}
              >
                DoorRent
              </span>
            </div>
            <p style={{ color: BRAND.textMuted, lineHeight: 1.7, fontSize: 15 }}>
              The complete property management platform for Nigerian landlords.
              Collect rent, manage tenants, and grow your portfolio.
            </p>
          </div>

          <div>
            <h4 style={headingStyle}>Product</h4>
            <ul style={listStyle}>
              <li>
                <Link href="/marketplace" style={linkStyle}>
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/#features" style={linkStyle}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#pricing" style={linkStyle}>
                  Why it's free
                </Link>
              </li>
              <li>
                <Link href="/#roles" style={linkStyle}>
                  For Landlords
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={headingStyle}>Company</h4>
            <ul style={listStyle}>
              <li>
                <Link href="/#testimonials" style={linkStyle}>
                  Testimonials
                </Link>
              </li>
              <li>
                <Link href="/portal" style={linkStyle}>
                  Live Demo
                </Link>
              </li>
              <li>
                <a href="mailto:hello@doorrent.com" style={linkStyle}>
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={headingStyle}>Legal</h4>
            <ul style={listStyle}>
              <li>
                <a href="/privacy" style={linkStyle}>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" style={linkStyle}>
                  Terms of Use
                </a>
              </li>
              <li>
                <a href="/security" style={linkStyle}>
                  Security
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: `1px solid ${BRAND.surfaceSoft}`,
            paddingTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <p style={{ color: BRAND.textSoft, fontSize: 13 }}>
            © 2026 DoorRent – Subsidiary of ReSuply Technologies Limited. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <a href="https://x.com/usedoorrent" target="_blank" rel="noreferrer" style={linkStyle}>
              Twitter / X
            </a>
            <a href="https://www.linkedin.com/company/doorrent/" target="_blank" rel="noreferrer" style={linkStyle}>
              LinkedIn
            </a>
            <a href="https://www.instagram.com/usedoorrent" target="_blank" rel="noreferrer" style={linkStyle}>
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ProcessStepper({ step }: { step: ProcessStep }) {
  const cfg = PROCESS_STEPS[step];
  const steps = [
    { label: "Verification", done: cfg.step >= 1 },
    { label: "Reservation", done: cfg.step >= 2 },
    { label: "Clearance", done: cfg.step >= 3 },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {steps.map((item, index) => (
          <React.Fragment key={item.label}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                width: 80,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: item.done ? BRAND.accentBg : BRAND.surfaceSoft,
                  border: `1.5px solid ${
                    item.done ? BRAND.accentBorder : "rgba(255,255,255,0.1)"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: BRAND.accentText,
                }}
              >
                {item.done ? "✓" : ""}
              </div>
              <span
                style={{
                  fontSize: 9,
                  textAlign: "center",
                  lineHeight: 1.4,
                  color: item.done ? BRAND.accentText : "rgba(255,255,255,0.3)",
                  fontWeight: item.done ? 500 : 400,
                }}
              >
                {item.label}
              </span>
            </div>
            {index < 2 && (
              <div
                style={{
                  flex: 1,
                  height: 1.5,
                  background: steps[index + 1].done
                    ? "rgba(200,169,110,0.4)"
                    : "rgba(255,255,255,0.08)",
                  marginBottom: 18,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <p
        style={{
          fontSize: 11,
          color: BRAND.accentText,
          textAlign: "center",
          marginTop: 6,
          fontWeight: 500,
        }}
      >
        {cfg.label}
      </p>
    </div>
  );
}

function AmenityPill({ label }: { label: string }) {
  return (
    <span
      style={{
        background: BRAND.surfaceSoft,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 20,
        padding: "4px 10px",
        fontSize: 11,
        color: BRAND.textMuted,
      }}
    >
      {label}
    </span>
  );
}

function ContactRow({
  label,
  value,
  type,
  icon,
}: {
  label: string;
  value: string;
  type: "phone" | "email";
  icon: string;
}) {
  return (
    <a
      href={type === "phone" ? `tel:${value}` : `mailto:${value}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        textDecoration: "none",
        borderBottom: `1px solid ${BRAND.surfaceSoft}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: BRAND.surfaceMuted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: BRAND.textSoft, marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, color: BRAND.neutralText, fontWeight: 500 }}>
          {value}
        </div>
      </div>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: BRAND.surfaceMuted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: BRAND.textSoft,
          fontSize: 14,
        }}
      >
        ›
      </div>
    </a>
  );
}

function DetailModal({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const status = STATUS_CONFIG[listing.status];
  const [contactTab, setContactTab] = useState<"care" | "landlord">("care");
  const [photoIdx, setPhotoIdx] = useState(0);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 580,
          maxHeight: "92vh",
          background: BRAND.modal,
          borderRadius: "20px 20px 0 0",
          border: `1px solid ${BRAND.border}`,
          borderBottom: "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.12)",
            }}
          />
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                background: `linear-gradient(160deg, ${listing.photos[photoIdx]}, ${BRAND.modal})`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: 20,
                    background: status.bg,
                    color: status.text,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {status.icon} {status.label}
                </span>
                <span
                  style={{
                    background: "rgba(0,0,0,0.32)",
                    color: BRAND.textMuted,
                    padding: "4px 8px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  {photoIdx + 1}/{listing.photos.length}
                </span>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                {listing.photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setPhotoIdx(index)}
                    style={{
                      width: index === photoIdx ? 20 : 6,
                      height: 6,
                      borderRadius: 3,
                      background:
                        index === photoIdx
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(255,255,255,0.3)",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: "20px 20px 32px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ flex: 1, marginRight: 12 }}>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: BRAND.text,
                    margin: "0 0 6px",
                    letterSpacing: -0.4,
                  }}
                >
                  {listing.type}
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: BRAND.textSoft,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {listing.fullAddress}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: BRAND.surfaceMuted,
                  border: `1px solid ${BRAND.border}`,
                  color: BRAND.textMuted,
                  fontSize: 16,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: BRAND.accent,
                    letterSpacing: -0.8,
                  }}
                >
                  {fmt(listing.rent)}
                  <span
                    style={{
                      fontSize: 14,
                      color: BRAND.textSoft,
                      fontWeight: 400,
                    }}
                  >
                    {" "}
                    {frequencySuffix(listing.frequency)}
                  </span>
                </div>
                {listing.serviceCharge > 0 && (
                  <div
                    style={{
                      fontSize: 12,
                      color: BRAND.textSoft,
                      marginTop: 2,
                    }}
                  >
                    + {fmt(listing.serviceCharge)} service charge
                  </div>
                )}
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "6px 12px",
                  borderRadius: 20,
                  background: status.bg,
                  color: status.text,
                  border: `1px solid ${status.color}40`,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {status.icon} {status.label}
              </span>
            </div>

            {listing.status === "in_process" && listing.processStep && (
              <div
                style={{
                  background: BRAND.accentBg,
                  border: `1px solid ${BRAND.accentBorder}`,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>⚠</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: BRAND.accentText,
                    }}
                  >
                    Unit currently on verified hold
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(226,197,141,0.9)",
                    lineHeight: 1.6,
                    margin: "0 0 12px",
                  }}
                >
                  A verified booking is progressing on this unit through
                  DoorRent. The unit is temporarily withheld from the public
                  marketplace to avoid duplicate reservations. It becomes
                  available again if the hold lapses or is cancelled.
                </p>
                <ProcessStepper step={listing.processStep} />
                {listing.processedAt && (
                  <p
                    style={{
                      fontSize: 11,
                      color: BRAND.textSoft,
                      textAlign: "right",
                      marginTop: 8,
                      fontFamily: "monospace",
                    }}
                  >
                    Hold updated: {listing.processedAt}
                  </p>
                )}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {[
                { icon: "🛏", label: "Bedrooms", value: String(listing.bedrooms) },
                {
                  icon: "🚿",
                  label: "Bathrooms",
                  value: String(listing.bathrooms),
                },
                {
                  icon: "📐",
                  label: "Size",
                  value: `${listing.sizeSqm} m²`,
                },
                {
                  icon: "🏢",
                  label: "Floor",
                  value: listing.floor === 0 ? "Ground" : `Floor ${listing.floor}`,
                },
                {
                  icon: "🪑",
                  label: "Furnished",
                  value: listing.furnished ? "Yes" : "No",
                },
                {
                  icon: "📅",
                  label: "Available",
                  value: listing.availableFrom,
                },
              ].map((fact) => (
                <div
                  key={fact.label}
                  style={{
                    background: BRAND.surfaceSoft,
                    border: `1px solid ${BRAND.border}`,
                    borderRadius: 10,
                    padding: "12px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{fact.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: BRAND.textSoft,
                      textAlign: "center",
                    }}
                  >
                    {fact.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: BRAND.neutralText,
                      textAlign: "center",
                    }}
                  >
                    {fact.value}
                  </span>
                </div>
              ))}
            </div>

            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                margin: "0 0 10px",
              }}
            >
              About this unit
            </h4>
            <p
              style={{
                fontSize: 13,
                color: BRAND.textMuted,
                lineHeight: 1.7,
                margin: "0 0 20px",
              }}
            >
              {listing.description}
            </p>

            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                margin: "0 0 10px",
              }}
            >
              Amenities
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {listing.amenities.map((amenity) => (
                <AmenityPill key={amenity} label={amenity} />
              ))}
            </div>

            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                margin: "0 0 12px",
              }}
            >
              Get in touch
            </h4>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {(["care", "landlord"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setContactTab(tab)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor:
                      contactTab === tab ? BRAND.accentBorder : BRAND.border,
                    background:
                      contactTab === tab ? BRAND.accentBg : BRAND.surfaceSoft,
                    color:
                      contactTab === tab ? BRAND.accentText : BRAND.textMuted,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {tab === "care" ? "🎧  DoorRent Care" : "🏠  Landlord"}
                </button>
              ))}
            </div>

            {contactTab === "care" ? (
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        background: BRAND.surfaceMuted,
                        border: `1.5px solid ${BRAND.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        color: BRAND.neutralText,
                      }}
                    >
                      {listing.care.avatar}
                    </div>
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: BRAND.success,
                        border: `2px solid ${BRAND.modal}`,
                      }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: BRAND.text,
                      }}
                    >
                      {listing.care.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: BRAND.textSoft,
                        marginTop: 2,
                      }}
                    >
                      DoorRent Care Agent
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 5,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: BRAND.success,
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          color: BRAND.successText,
                          fontWeight: 500,
                        }}
                      >
                        Available now
                      </span>
                    </div>
                  </div>
                </div>
                <ContactRow
                  label="Call directly"
                  value={listing.care.phone}
                  type="phone"
                  icon="📞"
                />
                <ContactRow
                  label="Send email"
                  value={listing.care.email}
                  type="email"
                  icon="✉"
                />
                <div
                  style={{
                    background: BRAND.surfaceSoft,
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: BRAND.textMuted,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    DoorRent Care can help with viewing requests, property
                    questions, and marketplace guidance from first enquiry to
                    handover.
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      background: BRAND.surfaceMuted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      color: BRAND.neutralText,
                      flexShrink: 0,
                    }}
                  >
                    {listing.landlord.avatar}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: BRAND.text,
                        }}
                      >
                        {listing.landlord.name}
                      </span>
                      {listing.landlord.verified && (
                        <span
                          style={{
                            background: BRAND.successBg,
                            color: BRAND.successText,
                            border: `1px solid ${BRAND.successBorder}`,
                            borderRadius: 20,
                            padding: "2px 7px",
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: BRAND.textSoft,
                        marginTop: 2,
                      }}
                    >
                      {listing.landlord.company}
                    </div>
                  </div>
                </div>
                <ContactRow
                  label="Call landlord"
                  value={listing.landlord.phone}
                  type="phone"
                  icon="📞"
                />
                <ContactRow
                  label="Email landlord"
                  value={listing.landlord.email}
                  type="email"
                  icon="✉"
                />
                <div
                  style={{
                    background: BRAND.surfaceSoft,
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: BRAND.textMuted,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    All verified booking steps and payment confirmations should
                    be completed through DoorRent for security and record
                    keeping.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListingCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: () => void;
}) {
  const status = STATUS_CONFIG[listing.status];
  const processStep = listing.processStep ? PROCESS_STEPS[listing.processStep] : null;

  return (
    <div
      onClick={onPress}
      style={{
        background: BRAND.panel,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-2px)";
        event.currentTarget.style.borderColor = BRAND.borderStrong;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.borderColor = BRAND.border;
      }}
    >
      <div
        style={{
          height: 140,
          background: `linear-gradient(160deg, ${listing.photos[0]}, ${BRAND.panel})`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 12,
          position: "relative",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            alignSelf: "flex-start",
            padding: "5px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            background: status.bg,
            color: status.text,
            border: `1px solid ${status.color}35`,
          }}
        >
          <span style={{ fontSize: 9 }}>{status.icon}</span> {status.label}
        </span>
        <div>
          <div
            style={{
              fontSize: 11,
              color: BRAND.textMuted,
              fontWeight: 500,
            }}
          >
            {listing.propertyName}
          </div>
          <div
            style={{
              fontSize: 13,
              color: BRAND.neutralText,
              fontWeight: 600,
            }}
          >
            Unit {listing.unitNumber}
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {listing.type}
          </span>
          {listing.furnished && (
            <span
              style={{
                background: BRAND.accentBg,
                color: BRAND.accentText,
                border: `1px solid ${BRAND.accentBorder}`,
                borderRadius: 20,
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 500,
              }}
            >
              Furnished
            </span>
          )}
        </div>

        <p
          style={{
            fontSize: 12,
            color: BRAND.textSoft,
            margin: "0 0 10px",
            lineHeight: 1.5,
          }}
          title={listing.fullAddress}
        >
          {listing.fullAddress.length > 60
            ? `${listing.fullAddress.slice(0, 60)}…`
            : listing.fullAddress}
        </p>

        {listing.status === "in_process" && processStep && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: BRAND.accentBg,
              border: `1px solid ${BRAND.accentBorder}`,
              borderRadius: 8,
              padding: "6px 10px",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 12, color: BRAND.accentText }}>◎</span>
            <span
              style={{
                fontSize: 11,
                color: BRAND.accentText,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {processStep.label}
            </span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 14 }}>
          {[
            { icon: "🛏", value: String(listing.bedrooms) },
            { icon: "🚿", value: String(listing.bathrooms) },
            { icon: "📐", value: `${listing.sizeSqm}m²` },
            { icon: "🏢", value: listing.floor === 0 ? "GF" : `F${listing.floor}` },
          ].map((stat, index) => (
            <React.Fragment key={`${stat.icon}-${stat.value}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12 }}>{stat.icon}</span>
                <span
                  style={{
                    fontSize: 12,
                    color: BRAND.textMuted,
                    fontWeight: 500,
                  }}
                >
                  {stat.value}
                </span>
              </div>
              {index < 3 && (
                <div
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                    margin: "0 8px",
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: `1px solid ${BRAND.surfaceSoft}`,
            paddingTop: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: BRAND.accent,
                letterSpacing: -0.5,
              }}
            >
              {fmt(listing.rent)}
              <span
                style={{
                  fontSize: 12,
                  color: BRAND.textSoft,
                  fontWeight: 400,
                }}
              >
                {compactFrequencySuffix(listing.frequency)}
              </span>
            </div>
            {listing.serviceCharge > 0 && (
              <div style={{ fontSize: 10, color: BRAND.textSoft, marginTop: 1 }}>
                +{fmt(listing.serviceCharge)} SC
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={`tel:${listing.care.phone}`}
              onClick={(event) => event.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px",
                borderRadius: 8,
                background: BRAND.surfaceSoft,
                border: `1px solid ${BRAND.border}`,
                color: BRAND.textMuted,
                fontSize: 12,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              📞 Care
            </a>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onPress();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px",
                borderRadius: 8,
                background: BRAND.accentBg,
                border: `1px solid ${BRAND.accentBorder}`,
                color: BRAND.accentText,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              View →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterKey>("all");
  const [bedFilter, setBedFilter] = useState<BedFilter>("any");
  const [areaFilter, setAreaFilter] = useState("All Areas");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showSort, setShowSort] = useState(false);
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketplace() {
      setLoading(true);
      setError("");

      try {
        const { data } = await apiRequest<MarketplaceResponse>(
          "/marketplace/listings",
        );

        if (!cancelled) {
          setMarketplaceData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load marketplace listings.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMarketplace();

    return () => {
      cancelled = true;
    };
  }, [retryNonce]);

  const listings = marketplaceData?.listings ?? [];
  const areas = ["All Areas", ...(marketplaceData?.filters.areas ?? [])];

  const filtered = listings.filter((listing) => {
    if (statusFilter === "vacant" && listing.status !== "vacant") {
      return false;
    }

    if (statusFilter === "in_process" && listing.status !== "in_process") {
      return false;
    }

    if (bedFilter !== "any") {
      if (bedFilter === "4+" && listing.bedrooms < 4) {
        return false;
      }

      if (bedFilter !== "4+" && listing.bedrooms !== Number.parseInt(bedFilter, 10)) {
        return false;
      }
    }

    if (areaFilter !== "All Areas" && listing.area !== areaFilter) {
      return false;
    }

    if (search) {
      const query = search.toLowerCase();
      if (
        !`${listing.propertyName} ${listing.type} ${listing.area} ${listing.fullAddress}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
    }

    return true;
  });

  const sorted = [...filtered].sort((left, right) => {
    if (sortBy === "price_asc") {
      return left.rent - right.rent;
    }

    if (sortBy === "price_desc") {
      return right.rent - left.rent;
    }

    if (sortBy === "size_desc") {
      return right.sizeSqm - left.sizeSqm;
    }

    return new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime();
  });

  const availableCount =
    marketplaceData?.summary.availableCount ??
    listings.filter((listing) => listing.status === "vacant").length;
  const reservedCount =
    marketplaceData?.summary.reservedCount ??
    listings.filter((listing) => listing.status === "in_process").length;
  const totalCount = marketplaceData?.summary.totalListings ?? listings.length;
  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== "all" ||
    bedFilter !== "any" ||
    areaFilter !== "All Areas";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setBedFilter("any");
    setAreaFilter("All Areas");
  };

  const emptyTitle = loading
    ? "Loading marketplace"
    : error
      ? "Marketplace unavailable"
      : "No properties match";
  const emptyMessage = loading
    ? "We are pulling the latest DoorRent listings for you."
    : error || "Try adjusting your filters or search term to see more listings.";

  return (
    <>
      <PageMeta
        title="DoorRent — Marketplace"
        description="Browse available and reserved property listings on DoorRent."
        urlPath="/marketplace"
      />

      <div
        style={{
          minHeight: "100vh",
          background: BRAND.page,
          color: BRAND.text,
          fontFamily: '"DM Sans", system-ui, sans-serif',
        }}
      >
        <MarketplaceSiteHeader />

        <div
          style={{
            background: `linear-gradient(180deg, ${BRAND.header} 0%, ${BRAND.headerEnd} 100%)`,
            padding: `24px ${MARKETPLACE_PAGE_GUTTER} 0`,
            position: "sticky",
            top: 0,
            zIndex: 100,
            borderBottom: `1px solid ${BRAND.surfaceSoft}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: BRAND.accent,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: BRAND.accent,
                    letterSpacing: 0.5,
                  }}
                >
                  DoorRent Public Marketplace
                </span>
              </div>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: -0.5,
                  color: BRAND.text,
                }}
              >
                Find Properties
              </h1>
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowSort((current) => !current)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: BRAND.surfaceSoft,
                  border: `1px solid ${BRAND.border}`,
                  color: BRAND.textMuted,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                ⇅ Sort
              </button>
              {showSort && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 200 }}
                    onClick={() => setShowSort(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 6,
                      background: BRAND.panel,
                      border: `1px solid ${BRAND.border}`,
                      borderRadius: 12,
                      overflow: "hidden",
                      minWidth: 200,
                      zIndex: 201,
                      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px 6px",
                        fontSize: 11,
                        color: BRAND.textSoft,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Sort by
                    </div>
                    {(
                      [
                        { key: "newest", label: "Newest listings first" },
                        { key: "price_asc", label: "Rent: Lowest first" },
                        { key: "price_desc", label: "Rent: Highest first" },
                        { key: "size_desc", label: "Largest units first" },
                      ] as Array<{ key: SortKey; label: string }>
                    ).map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setSortBy(option.key);
                          setShowSort(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "11px 16px",
                          textAlign: "left",
                          background:
                            sortBy === option.key ? BRAND.accentBg : "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 13,
                          color:
                            sortBy === option.key
                              ? BRAND.accentText
                              : BRAND.textMuted,
                          fontWeight: sortBy === option.key ? 500 : 400,
                        }}
                      >
                        {option.label}
                        {sortBy === option.key && (
                          <span style={{ color: BRAND.accentText }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 500,
                background: BRAND.successBg,
                color: BRAND.successText,
                border: `1px solid ${BRAND.successBorder}`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: BRAND.success,
                  display: "inline-block",
                }}
              />
              {availableCount} Available
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 500,
                background: BRAND.accentBg,
                color: BRAND.accentText,
                border: `1px solid ${BRAND.accentBorder}`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: BRAND.accent,
                  display: "inline-block",
                }}
              />
              {reservedCount} Reserved
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 500,
                background: BRAND.surfaceSoft,
                color: BRAND.textMuted,
                border: `1px solid ${BRAND.border}`,
              }}
            >
              {totalCount} Total Units
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: BRAND.surfaceSoft,
              border: `1px solid ${BRAND.border}`,
              borderRadius: 10,
              padding: "0 14px",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 14, opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, type, or area…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "12px 0",
                fontSize: 13,
                color: BRAND.text,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  background: "none",
                  border: "none",
                  color: BRAND.textSoft,
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              marginBottom: 8,
              paddingBottom: 2,
            }}
          >
            {(
              [
                { key: "all", label: "⊞ All" },
                { key: "vacant", label: "✦ Available" },
                { key: "in_process", label: "◎ Reserved" },
              ] as Array<{ key: FilterKey; label: string }>
            ).map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                style={{
                  whiteSpace: "nowrap",
                  padding: "6px 12px",
                  borderRadius: 20,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor:
                    statusFilter === filter.key
                      ? BRAND.successBorder
                      : BRAND.border,
                  background:
                    statusFilter === filter.key
                      ? BRAND.successBg
                      : BRAND.surfaceSoft,
                  color:
                    statusFilter === filter.key
                      ? BRAND.successText
                      : BRAND.textMuted,
                  fontSize: 12,
                  fontWeight: statusFilter === filter.key ? 500 : 400,
                }}
              >
                {filter.label}
              </button>
            ))}

            <div
              style={{
                width: 1,
                background: "rgba(255,255,255,0.08)",
                margin: "4px 4px",
              }}
            />

            {BED_FILTERS.map((bedroomCount) => (
              <button
                key={bedroomCount}
                onClick={() => setBedFilter(bedroomCount)}
                style={{
                  whiteSpace: "nowrap",
                  padding: "6px 12px",
                  borderRadius: 20,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor:
                    bedFilter === bedroomCount
                      ? BRAND.accentBorder
                      : BRAND.border,
                  background:
                    bedFilter === bedroomCount
                      ? BRAND.accentBg
                      : BRAND.surfaceSoft,
                  color:
                    bedFilter === bedroomCount
                      ? BRAND.accentText
                      : BRAND.textMuted,
                  fontSize: 12,
                  fontWeight: bedFilter === bedroomCount ? 500 : 400,
                }}
              >
                {bedroomCount === "any" ? "🛏 Any" : `${bedroomCount} Bed`}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 14 }}>
            {areas.map((area) => (
              <button
                key={area}
                onClick={() => setAreaFilter(area)}
                style={{
                  whiteSpace: "nowrap",
                  padding: "5px 12px",
                  borderRadius: 20,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor:
                    areaFilter === area ? BRAND.borderStrong : BRAND.border,
                  background:
                    areaFilter === area ? BRAND.surfaceMuted : "transparent",
                  color:
                    areaFilter === area ? "rgba(255,255,255,0.85)" : BRAND.textSoft,
                  fontSize: 12,
                  fontWeight: areaFilter === area ? 500 : 400,
                }}
              >
                {area === "All Areas" ? `📍 ${area}` : area}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: `16px ${MARKETPLACE_PAGE_GUTTER} 80px` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 12, color: BRAND.textSoft }}>
              {loading ? "Loading units..." : `${sorted.length} ${sorted.length === 1 ? "unit" : "units"} found`}
            </span>
            {hasActiveFilters && !loading && (
              <button
                onClick={clearFilters}
                style={{
                  background: "none",
                  border: "none",
                  color: BRAND.textMuted,
                  fontSize: 12,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {sorted.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "60px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  background: BRAND.surfaceSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  marginBottom: 20,
                }}
              >
                🏘
              </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  margin: "0 0 8px",
                  letterSpacing: -0.4,
                }}
              >
                {emptyTitle}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: BRAND.textMuted,
                  margin: "0 0 20px",
                  lineHeight: 1.6,
                }}
              >
                {emptyMessage}
              </p>
              {!loading && (
                <button
                  onClick={() => {
                    if (error) {
                      setRetryNonce((current) => current + 1);
                      return;
                    }

                    clearFilters();
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    background: BRAND.surfaceMuted,
                    border: `1px solid ${BRAND.border}`,
                    color: BRAND.textMuted,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {error ? "Try again" : "Clear all filters"}
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {sorted.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={() => setSelectedListing(listing)}
                />
              ))}
            </div>
          )}
        </div>

        <MarketplaceSiteFooter />

        {selectedListing && (
          <DetailModal
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
          />
        )}
      </div>
    </>
  );
}
