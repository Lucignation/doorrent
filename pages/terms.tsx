import Link from "next/link";
import PageMeta from "../components/layout/PageMeta";

export default function TermsPage() {
  const effectiveDate = "1 January 2025";
  const companyName = "ReSuply Technologies Limited";
  const productName = "DoorRent";
  const contactEmail = "legal@doorrent.com";

  return (
    <>
      <PageMeta title="DoorRent - Terms and Conditions" urlPath="/terms" />

      <div className="terms-page">
        <header className="terms-header">
          <Link href="/" className="terms-logo">
            {productName}
          </Link>
        </header>

        <main className="terms-main">
          <div className="terms-hero">
            <p className="terms-eyebrow">Legal</p>
            <h1>Terms and Conditions</h1>
            <p className="terms-meta">
              Effective date: {effectiveDate} &nbsp;·&nbsp; {companyName}
            </p>
          </div>

          <div className="terms-body">
            <p className="terms-intro">
              Please read these Terms and Conditions carefully before using {productName}, a property
              management platform operated by <strong>{companyName}</strong>. By creating an account
              or using our services, you agree to be bound by these terms.
            </p>

            <section>
              <h2>1. Definitions</h2>
              <p>
                <strong>"Platform"</strong> refers to the {productName} web application and API
                services accessible at doorrent.com and related subdomains.
              </p>
              <p>
                <strong>"Landlord"</strong> refers to any property owner or property manager who
                registers and uses the Platform to manage properties, units, and tenants.
              </p>
              <p>
                <strong>"Tenant"</strong> refers to any individual who accesses the Platform through
                a landlord invitation to manage their tenancy.
              </p>
              <p>
                <strong>"Services"</strong> refers to all features provided by the Platform including
                property management, rent collection, notices, agreements, reminders, and reporting.
              </p>
            </section>

            <section>
              <h2>2. Acceptance of Terms</h2>
              <p>
                By registering for an account, accessing the Platform, or using any of our Services,
                you confirm that you have read, understood, and agree to be bound by these Terms and
                Conditions and our Privacy Policy. If you do not agree to these terms, you may not
                use the Platform.
              </p>
              <p>
                These terms apply to all users of the Platform, including Landlords, Tenants, and
                any team members or caretakers added by a Landlord account.
              </p>
            </section>

            <section>
              <h2>3. Account Registration</h2>
              <p>
                To use the Platform as a Landlord, you must create an account by providing accurate,
                current, and complete information. You are responsible for maintaining the
                confidentiality of your login credentials and for all activity that occurs under your
                account.
              </p>
              <p>
                You agree to notify us immediately at{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a> if you become aware of any
                unauthorised use of your account.
              </p>
              <p>
                We reserve the right to suspend or terminate accounts that contain false information
                or that are used in violation of these terms.
              </p>
            </section>

            <section>
              <h2>4. Subscription and Payments</h2>
              <p>
                {productName} offers subscription-based and commission-based pricing plans. By
                selecting a plan and providing payment information, you authorise us to charge the
                applicable fees through our payment processor (Paystack).
              </p>
              <p>
                Subscription fees are billed in advance on a monthly or annual basis, as selected at
                registration. All fees are non-refundable except as required by applicable law.
              </p>
              <p>
                We reserve the right to modify our pricing with 30 days' written notice. Continued
                use of the Platform after a price change constitutes your acceptance of the new
                pricing.
              </p>
            </section>

            <section>
              <h2>5. Permitted Use</h2>
              <p>You agree to use the Platform only for lawful purposes and in accordance with these terms. You must not:</p>
              <ul>
                <li>Use the Platform for any fraudulent, misleading, or illegal purpose</li>
                <li>Upload false tenant records, fabricated payment histories, or inaccurate property information</li>
                <li>Attempt to gain unauthorised access to any part of the Platform or other users&apos; accounts</li>
                <li>Use automated tools, bots, or scripts to access the Platform without our prior written consent</li>
                <li>Reproduce, sell, or exploit any part of the Platform without our express authorisation</li>
                <li>Violate any applicable local, national, or international law or regulation</li>
              </ul>
            </section>

            <section>
              <h2>6. Landlord Responsibilities</h2>
              <p>
                As a Landlord using the Platform, you are solely responsible for the accuracy of all
                property, unit, tenant, and payment information you input. {productName} does not
                verify the accuracy of data entered by Landlords.
              </p>
              <p>
                You are responsible for ensuring that your use of the Platform complies with all
                applicable tenancy laws in your jurisdiction, including requirements around notices,
                rent increases, eviction procedures, and data protection.
              </p>
              <p>
                Any legal documents generated by the Platform (including agreements, notices, and
                pre-legal letters) are provided as templates and drafts only. You should seek
                independent legal advice before relying on such documents in any legal proceedings.
              </p>
            </section>

            <section>
              <h2>7. Data and Privacy</h2>
              <p>
                We collect and process personal data in accordance with our Privacy Policy. By using
                the Platform, you consent to such processing and warrant that all data you provide
                is accurate.
              </p>
              <p>
                As a Landlord, you act as a data controller in respect of tenant personal data you
                input into the Platform. You are responsible for ensuring you have a lawful basis
                to process such data and for complying with applicable data protection laws,
                including the Nigeria Data Protection Act (NDPA).
              </p>
              <p>
                We implement appropriate technical and organisational measures to protect personal
                data against unauthorised access, loss, or destruction.
              </p>
            </section>

            <section>
              <h2>8. Intellectual Property</h2>
              <p>
                The Platform, including its design, code, content, trademarks, and all associated
                intellectual property, is owned by {companyName} and is protected by applicable
                intellectual property laws.
              </p>
              <p>
                We grant you a limited, non-exclusive, non-transferable licence to access and use
                the Platform solely for your internal business purposes in accordance with these
                terms. No other rights are granted.
              </p>
            </section>

            <section>
              <h2>9. Third-Party Services</h2>
              <p>
                The Platform integrates with third-party services including Paystack (payment
                processing) and Resend (email delivery). Your use of these services is subject to
                their respective terms and privacy policies. We are not responsible for the
                availability, accuracy, or conduct of any third-party service.
              </p>
            </section>

            <section>
              <h2>10. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable law, {companyName} and its directors,
                employees, and agents shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages arising from your use of the Platform, including
                but not limited to loss of data, loss of revenue, or loss of profits.
              </p>
              <p>
                Our total liability to you for any claim arising under these terms shall not exceed
                the total fees paid by you to us in the three months preceding the claim.
              </p>
            </section>

            <section>
              <h2>11. Disclaimers</h2>
              <p>
                The Platform is provided on an "as is" and "as available" basis. We do not warrant
                that the Platform will be uninterrupted, error-free, or free of viruses or other
                harmful components.
              </p>
              <p>
                {productName} is not a law firm and does not provide legal advice. Nothing on the
                Platform constitutes legal, financial, or professional advice of any kind.
              </p>
            </section>

            <section>
              <h2>12. Termination</h2>
              <p>
                You may terminate your account at any time by contacting us at{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Upon termination, your
                access to the Platform will cease and your data will be handled in accordance with
                our Privacy Policy and applicable law.
              </p>
              <p>
                We may suspend or terminate your account immediately, without notice, if we
                reasonably believe you have violated these terms or if required to do so by law.
              </p>
            </section>

            <section>
              <h2>13. Changes to These Terms</h2>
              <p>
                We may update these Terms and Conditions from time to time. We will notify you of
                material changes by email or by posting a notice on the Platform at least 14 days
                before the changes take effect. Your continued use of the Platform after the
                effective date of the revised terms constitutes your acceptance of those changes.
              </p>
            </section>

            <section>
              <h2>14. Governing Law</h2>
              <p>
                These Terms and Conditions are governed by and construed in accordance with the laws
                of the Federal Republic of Nigeria. Any dispute arising from or in connection with
                these terms shall be subject to the exclusive jurisdiction of the courts of Nigeria.
              </p>
            </section>

            <section>
              <h2>15. Contact</h2>
              <p>
                If you have any questions about these Terms and Conditions, please contact us at:
              </p>
              <p>
                <strong>{companyName}</strong>
                <br />
                Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </p>
            </section>
          </div>

          <div className="terms-footer">
            <Link href="/portal" className="btn-back">
              ← Back to Portal
            </Link>
            <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .terms-page {
          min-height: 100vh;
          background: var(--bg, #f5f4f0);
          color: var(--ink, #1a1916);
        }

        .terms-header {
          padding: 20px 40px;
          border-bottom: 1px solid var(--border, #e8e6df);
          background: var(--surface, #fff);
        }

        .terms-logo {
          font-size: 20px;
          font-weight: 800;
          color: var(--ink, #1a1916);
          text-decoration: none;
          font-family: var(--font-display, serif);
        }

        .terms-main {
          max-width: 760px;
          margin: 0 auto;
          padding: 48px 24px 80px;
        }

        .terms-hero {
          margin-bottom: 40px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--border, #e8e6df);
        }

        .terms-eyebrow {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink2, #6b6860);
          margin: 0 0 12px;
        }

        .terms-hero h1 {
          margin: 0 0 12px;
          font-size: 36px;
          font-family: var(--font-display, serif);
          line-height: 1.2;
        }

        .terms-meta {
          font-size: 14px;
          color: var(--ink2, #6b6860);
          margin: 0;
        }

        .terms-intro {
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink, #1a1916);
          padding: 20px 24px;
          background: var(--surface, #fff);
          border: 1px solid var(--border, #e8e6df);
          border-radius: 16px;
          margin-bottom: 32px;
        }

        .terms-body section {
          margin-bottom: 32px;
        }

        .terms-body h2 {
          font-size: 18px;
          font-family: var(--font-display, serif);
          margin: 0 0 12px;
          color: var(--ink, #1a1916);
        }

        .terms-body p {
          font-size: 14px;
          line-height: 1.75;
          color: var(--ink, #1a1916);
          margin: 0 0 10px;
        }

        .terms-body ul {
          padding-left: 20px;
          margin: 0 0 10px;
        }

        .terms-body ul li {
          font-size: 14px;
          line-height: 1.75;
          margin-bottom: 6px;
        }

        .terms-body a {
          color: var(--accent, #1a3a2a);
          font-weight: 600;
        }

        .terms-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid var(--border, #e8e6df);
        }

        .terms-footer p {
          font-size: 13px;
          color: var(--ink2, #6b6860);
          margin: 0;
        }

        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid var(--border, #e8e6df);
          background: var(--surface, #fff);
          color: var(--ink, #1a1916);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }

        .btn-back:hover {
          background: var(--surface2, #f5f4f0);
        }

        @media (max-width: 600px) {
          .terms-header { padding: 16px 20px; }
          .terms-hero h1 { font-size: 28px; }
          .terms-footer { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </>
  );
}
