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

## Legal And Policy Surfaces

Public policy pages live in `pages/` and cover privacy, terms of use, refund handling, security, and account deletion. Keep public legal copy product-focused and avoid exposing internal operator details that are not meant for end users.
