# Launch-Critical Checklist

Use this before any release candidate goes live. The goal is to keep launch scope focused on flows that must work every time, then make the remaining provider-side checks explicit instead of assumed.

## 1. Automated Gate

Run all of these from the repo root:

- `npm --prefix api run build`
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `npm run build`
- `npm run qa:critical`
- `npm run qa:web`

Release only if all five pass.

## 2. Landlord Critical Flows

- Landlord web login works on root domain and branded workspace subdomain.
- Landlord mobile restores a valid session and cleanly drops expired sessions.
- Create property works on web and mobile.
- Create unit works on web and mobile.
- `Billing Frequency` changes keep derived rent integer-safe on web and mobile.
- Disabled derived money fields stay disabled.
- Tenant invite only shows units for the selected property on web and mobile.
- Tenant invite sends a valid onboarding link and does not submit float rent values.
- Settings page can:
  - update profile
  - update payout
  - show notification toggles
  - open plan options
  - start renewal
  - cancel at period end
  - resume renewal

## 3. Tenant Critical Flows

- Tenant onboarding page loads from invite token.
- Tenant onboarding shows field-specific validation instead of generic `Required`.
- Tenant onboarding accepts optional ID upload and optional ID number.
- Tenant onboarding generates a guarantor signing link after submission.
- Tenant login stays locked to the correct workspace.
- Tenant rent dashboard loads the right workspace branding and billing values.
- Tenant payment initialization works for Basic, Pro, and Enterprise-eligible workspaces.

## 4. Workspace Isolation

- `usedoorrent.com` shows the public landing page.
- `workspace.usedoorrent.com` redirects root to `/portal`.
- Workspace subdomain login pages load the correct logo, colors, and login background.
- Users from one workspace cannot authenticate into another workspace host.
- Downgraded workspaces lose access to branding, subdomain, and Enterprise-only features immediately after entitlement changes.

## 5. Plan Lifecycle

- Basic enforces the `5 unit` limit.
- Basic allows Paystack payments, receipts, in-app notifications, reminders, biometrics, and account deletion.
- Basic only sends landlord SMS on successful tenant payment.
- Pro unlocks branding, notices, meetings, push, SMS, automations, caretakers, emergency, offline support, and risk workflows.
- Enterprise unlocks staff logins, company-owned Paystack, white-label, branded public pages, and guided onboarding.
- `Basic -> Pro` updates immediately without checkout.
- `Basic/Pro -> Enterprise` requires checkout and does not activate before payment verification.
- Cancel-at-period-end preserves access through the current billing period.

## 6. Provider / Staging Checks

These are not covered fully by local automation and must be tested in staging or production-safe test mode.

- Paystack test payment hits the correct workspace payout path.
- Enterprise company-owned Paystack routes to the company-owned Paystack integration.
- Renewal timing behaves correctly for:
  - saved authorization
  - manual renewal fallback
  - cancel-at-period-end
- Transaction webhooks update the correct workspace and tenant.
- Email sends reach:
  - tenant invite recipient
  - tenant onboarding recipient
  - guarantor recipient
  - staff invite recipient
  - enterprise onboarding internal inbox
- SMS sends reach the intended landlord/tenant contact for the exact enabled preference.

## 7. Manual Acceptance Pass

Do one short manual pass with seeded staging data:

- `Basic` self-managed landlord
- `Pro` branded workspace
- `Enterprise` property management company
- one tenant
- one caretaker
- one staff member

Walk through:

- landlord dashboard
- property + unit creation
- invite tenant
- tenant onboarding
- agreement send/sign
- payment initiation
- notices
- meetings
- settings
- plan upgrade / downgrade

## 8. Do Not Ship If

- Any flow still depends on browser-native `Required` messages instead of explicit validation.
- Any rent amount path still sends floats to the API.
- Any workspace host can see another organization’s auth/session flow.
- Any Enterprise-only feature still appears usable after downgrade.
- Any invite email goes to the wrong recipient.
- Any provider callback path is unverified in test mode.

## 9. Known Remaining Manual Areas

- Real email inbox delivery
- Real SMS delivery
- Real Paystack settlement timing
- Real mobile device UX across multiple handset sizes
- Google Meet / external meeting-provider behavior
