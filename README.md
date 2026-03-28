# DoorRent

DoorRent is a multi-surface property operations platform with:

- `web`: Next.js landlord, tenant, caretaker, landing, and super admin experiences
- `api`: Express + Prisma backend for auth, properties, payments, agreements, notifications, and policy-linked account management
- `mobile/landlord-app`: Expo landlord mobile app
- `mobile/tenant-app`: Expo tenant mobile app

## Terminology

- In this project, `admin` means `super admin` unless a file explicitly says otherwise.
- Public-facing copy should prefer `super admin` over plain `admin`.
- Policy pages should describe customer-facing roles directly and should not expose internal platform-owner details unless intentionally required.
- The platform should support both `SOLO_LANDLORD` and `PROPERTY_MANAGER_COMPANY` workspace modes without forcing company-only complexity on self-managed landlords.
- The current workspace-mode direction is documented in `docs/workspace-modes.md`.

## Legal And Policy Surfaces

Public policy pages live in `pages/` and cover privacy, terms of use, refund handling, security, and account deletion. Keep public legal copy product-focused and avoid exposing internal operator details that are not meant for end users.

## Google Meet Add-on

DoorRent now includes a Google Meet add-on web companion under:

- `/meet-addon` for the side panel
- `/meet-addon/stage` for the main stage
- `/api/meet-addon/manifest` for a deployment manifest payload

To connect it inside Google Meet, set `NEXT_PUBLIC_GOOGLE_MEET_CLOUD_PROJECT_NUMBER` in the web environment and use the manifest URL when configuring the Meet add-on deployment in Google Cloud / Google Workspace Marketplace.
