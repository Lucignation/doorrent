import type { ReactNode } from "react";
import Link from "next/link";
import PageMeta from "../layout/PageMeta";
import {
  LEGAL_COMPANY_NAME,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LINKS,
  LEGAL_PRODUCT_NAME,
} from "../../lib/legal";

interface LegalDocumentProps {
  title: string;
  summary: string;
  urlPath: string;
  effectiveDate?: string;
  children: ReactNode;
}

export default function LegalDocument({
  title,
  summary,
  urlPath,
  effectiveDate = LEGAL_EFFECTIVE_DATE,
  children,
}: LegalDocumentProps) {
  return (
    <>
      <PageMeta title={`${LEGAL_PRODUCT_NAME} - ${title}`} urlPath={urlPath} />

      <div className="legal-page">
        <header className="legal-header">
          <Link href="/" className="legal-logo">
            {LEGAL_PRODUCT_NAME}
          </Link>
          <nav className="legal-nav" aria-label="Legal navigation">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="legal-main">
          <section className="legal-hero">
            <p className="legal-eyebrow">Legal</p>
            <h1>{title}</h1>
            <p className="legal-meta">
              Effective date: {effectiveDate} · {LEGAL_COMPANY_NAME}
            </p>
            <p className="legal-summary">{summary}</p>
          </section>

          <section className="legal-body">{children}</section>
        </main>

        <footer className="legal-footer">
          <div className="legal-footer-links">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="legal-footer-bottom">
            <Link href="/portal" className="btn-back">
              Open Portal
            </Link>
            <p>
              © {new Date().getFullYear()} {LEGAL_COMPANY_NAME}. All rights reserved.
            </p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .legal-page {
          min-height: 100vh;
          background: #f5f4ef;
          color: #17231d;
        }

        .legal-header {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 32px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(23, 35, 29, 0.08);
        }

        .legal-logo {
          font-size: 18px;
          font-weight: 800;
          color: #1a3a2a;
          text-decoration: none;
          letter-spacing: -0.02em;
        }

        .legal-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
        }

        .legal-nav :global(a) {
          font-size: 13px;
          color: #4d5d55;
          text-decoration: none;
        }

        .legal-nav :global(a:hover),
        .legal-footer-links :global(a:hover),
        .legal-body :global(a:hover) {
          color: #1a6b4a;
        }

        .legal-main {
          max-width: 980px;
          margin: 0 auto;
          padding: 52px 24px 20px;
        }

        .legal-hero {
          background: linear-gradient(135deg, #173829, #214c36);
          color: #fff;
          border-radius: 28px;
          padding: 34px 32px;
          box-shadow: 0 24px 64px rgba(23, 56, 41, 0.2);
        }

        .legal-eyebrow {
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 11px;
          opacity: 0.72;
        }

        .legal-hero h1 {
          margin: 0 0 10px;
          font-size: 40px;
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .legal-meta {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.72);
        }

        .legal-summary {
          margin: 18px 0 0;
          max-width: 720px;
          font-size: 16px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.88);
        }

        .legal-body {
          padding: 28px 0 0;
        }

        .legal-body :global(section) {
          background: #fff;
          border: 1px solid rgba(23, 35, 29, 0.08);
          border-radius: 20px;
          padding: 24px 24px 22px;
          margin-bottom: 16px;
          box-shadow: 0 12px 30px rgba(23, 35, 29, 0.04);
        }

        .legal-body :global(h2) {
          margin: 0 0 12px;
          font-size: 20px;
          line-height: 1.25;
          color: #173829;
        }

        .legal-body :global(p),
        .legal-body :global(li) {
          margin: 0 0 12px;
          font-size: 15px;
          line-height: 1.75;
          color: #45544d;
        }

        .legal-body :global(ul),
        .legal-body :global(ol) {
          margin: 0;
          padding-left: 22px;
        }

        .legal-body :global(strong) {
          color: #17231d;
        }

        .legal-body :global(a) {
          color: #1a6b4a;
        }

        .legal-footer {
          max-width: 980px;
          margin: 0 auto;
          padding: 12px 24px 48px;
        }

        .legal-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 18px;
        }

        .legal-footer-links :global(a) {
          font-size: 13px;
          color: #4d5d55;
          text-decoration: none;
        }

        .legal-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          color: #6a7770;
          font-size: 13px;
        }

        .btn-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          background: #1a3a2a;
          color: #fff;
          text-decoration: none;
          font-weight: 600;
        }

        @media (max-width: 800px) {
          .legal-header {
            padding: 16px 18px;
            align-items: flex-start;
            flex-direction: column;
          }

          .legal-main {
            padding: 28px 16px 16px;
          }

          .legal-hero {
            padding: 24px 20px;
            border-radius: 22px;
          }

          .legal-hero h1 {
            font-size: 30px;
          }

          .legal-body :global(section) {
            padding: 20px 18px 18px;
          }

          .legal-footer {
            padding: 8px 16px 36px;
          }

          .legal-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}
