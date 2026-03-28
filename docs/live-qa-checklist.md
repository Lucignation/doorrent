# Live QA Checklist

Use this after `npm run qa:critical` and the Playwright smoke suite pass.

## 1. Subscription and plan lifecycle

- Verify `Basic -> Pro` switches immediately with no checkout and Pro features unlock.
- Verify `Basic -> Enterprise` and `Pro -> Enterprise` create a real checkout and only unlock after successful payment verification.
- Verify `Cancel At Period End` keeps the current month active and only suspends access after the current billing period ends.
- Verify `Resume Auto-Renew` clears the cancellation state.
- Verify downgrade behavior removes access to the higher-tier features immediately after the billing state changes.

## 2. Workspace isolation

- Confirm a landlord on `lekki.usedoorrent.com` cannot sign in on `abuja.usedoorrent.com`.
- Confirm a tenant on `lekki.usedoorrent.com` cannot verify login on another workspace host.
- Confirm a caretaker assignment only appears inside the correct workspace host.
- Confirm downgraded workspaces lose branded subdomain access if the plan no longer allows it.

## 3. Payments and money routing

- In Paystack test mode, initialize a tenant payment and verify the correct destination:
  - Basic/Pro workspace collection path
  - Enterprise company-owned Paystack path
- Confirm webhook verification marks the payment as paid.
- Confirm receipts and payment detail screens update after webhook confirmation.
- Confirm Pro commission math matches the expected rent-year multiplier.
- Confirm the payout/bank account configured for the workspace is the one used for collection routing.

## 4. Email delivery

- Verify landlord signup/onboarding emails reach the correct email address.
- Verify tenant invitation emails reach the invited tenant.
- Verify support-staff invites go to the invited staff email, not only the internal DoorRent inbox.
- Verify password reset emails reach the intended user.
- Verify enterprise onboarding request mail reaches the internal team and the requestor acknowledgement reaches the requestor.

## 5. SMS delivery

- Confirm Basic only receives payment-success SMS.
- Confirm Pro/Enterprise receive the additional SMS flows they are entitled to.
- Confirm emergency escalation SMS uses the correct contact list and sender ID.

## 6. Web acceptance

- Test the landing page on desktop and mobile widths.
- Test the root portal versus workspace subdomain portal behavior.
- Test workspace branding on login, sidebar, and public legal pages.
- Test `Invite Tenant` property -> unit dependency and disabled derived rent field.
- Test meetings, notices, notifications, and upgrade flows on responsive screens.

## 7. Mobile acceptance

- Landlord mobile:
  - auth restore / expired session
  - add property
  - add unit
  - invite tenant
  - settings / upgrade flow
  - branding colors
- Tenant mobile:
  - workspace lock by slug/deep link
  - login / verify
  - rent dashboard
  - payment flow
  - notices / meetings / receipts
- Confirm offline queue/sync behavior on flaky network.

## 8. Emergency and communication

- Confirm emergency tools appear only on plans that allow them.
- Confirm notices and meetings are hidden/blocked for plans that should not have them.
- Confirm push device registration only happens for plans that allow push notifications.

## 9. Provider logs

- Review Render logs for:
  - failed webhooks
  - 401/403 spikes
  - renewal failures
  - provider callback errors
- Review Resend logs for bounces or rejected sends.
- Review Termii logs for failed SMS sends.
