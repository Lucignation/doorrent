# Workspace Modes

This document defines how DoorRent should support both:

- self-managed landlords
- property manager companies

The goal is to keep the solo-landlord experience light while still allowing manager-company teams, branding, permissions, and owner approvals.

## Product Rule

Every operational account should belong to a `workspace`.

A workspace can be one of two modes:

- `SOLO_LANDLORD`
- `PROPERTY_MANAGER_COMPANY`

The workspace mode changes which fields, permissions, and UX surfaces appear. It must not force company-only complexity onto self-managed landlords.

## Current Compatibility

Today, the product is still centered on the `Landlord` model.

That is acceptable as a transition shape because a landlord account already holds:

- business identity (`companyName`)
- branding (`brandDisplayName`, `brandLogoUrl`, `brandPrimaryColor`, `brandAccentColor`)
- billing/subscription
- payout details
- properties, units, tenants, agreements, notices, reminders
- team members

This means the current landlord account can continue to act like a workspace root while the platform evolves toward a first-class workspace architecture.

## Target Data Model

### Core Entities

1. `Workspace`
- Represents the operating account shown across web, mobile, tenant surfaces, notices, agreements, receipts, and payments.
- Owns branding, subscription, plan, and product capabilities.
- Has a `mode` field:
  - `SOLO_LANDLORD`
  - `PROPERTY_MANAGER_COMPANY`

2. `WorkspaceMember`
- Represents a human user inside a workspace.
- Replaces the idea that one landlord record must represent both the business and the user.
- Typical member roles:
  - `OWNER`
  - `ADMIN`
  - `PORTFOLIO_MANAGER`
  - `FINANCE`
  - `OPERATIONS`
  - `LEASING`
  - `VIEWER`

3. `PortfolioOwner`
- Represents the beneficial owner of properties when a manager company operates them.
- Can be:
  - an individual landlord
  - a company landlord
- Stores owner-facing identity, payout preferences, approval rules, and reporting contact details.

4. `ManagedPortfolio`
- Groups properties that are operated for a specific owner under a manager company workspace.
- Allows one manager company to manage multiple owners cleanly.

5. `PropertyManagementAssignment`
- Connects a workspace to a property or portfolio with explicit responsibility.
- Defines whether the workspace:
  - owns the asset
  - manages the asset
  - co-manages the asset

6. `WorkspaceBranding`
- Logical branding object for the workspace.
- In the current schema this can remain stored on the root operational account until extracted.

### Simplified Prisma Direction

This is the target shape, not a drop-in migration:

```prisma
enum WorkspaceMode {
  SOLO_LANDLORD
  PROPERTY_MANAGER_COMPANY
}

enum WorkspaceMemberRole {
  OWNER
  ADMIN
  PORTFOLIO_MANAGER
  FINANCE
  OPERATIONS
  LEASING
  VIEWER
}

model Workspace {
  id                String   @id @default(cuid())
  mode              WorkspaceMode
  legalName         String
  displayName       String?
  logoUrl           String?
  primaryColor      String?
  accentColor       String?
  status            String   @default("ACTIVE")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  members           WorkspaceMember[]
  managedPortfolios ManagedPortfolio[]
  properties        Property[]
}

model WorkspaceMember {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  role        WorkspaceMemberRole
  status      String   @default("ACTIVE")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

model PortfolioOwner {
  id                String   @id @default(cuid())
  legalName         String
  contactName       String?
  email             String?
  phone             String?
  payoutBankName    String?
  payoutAccountName String?
  payoutAccountNo   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  portfolios        ManagedPortfolio[]
}

model ManagedPortfolio {
  id                String   @id @default(cuid())
  workspaceId       String
  ownerId           String
  name              String
  approvalMode      String   @default("OWNER_APPROVES_CRITICAL_ACTIONS")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  workspace         Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  owner             PortfolioOwner @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  properties        Property[]
}
```

## How Existing Roles Map

### Self-Managed Landlord

- One workspace
- Workspace mode is `SOLO_LANDLORD`
- Landlord is both the business owner and primary operator
- Team members are optional
- No owner/manager split is shown in the UI

### Property Manager Company

- One workspace
- Workspace mode is `PROPERTY_MANAGER_COMPANY`
- Workspace has multiple members
- Workspace can manage multiple owner portfolios
- Each portfolio can have different approval rules, payout destinations, and property sets

### Caretaker

- Remains an operational external assignment
- Should not become the same thing as a property manager company
- Can still be attached at:
  - workspace level
  - portfolio level
  - property level

## UX Rules

### Mode Selection

During onboarding or account setup, ask:

- `I manage my own properties`
- `We manage properties for clients`

This selection sets the workspace mode and determines which setup fields appear.

### Solo Landlord UX

The solo-landlord experience should stay simple:

- show `My Properties`
- show `My Tenants`
- show `My Team` only if they add staff
- hide owner/client portfolio language
- keep settings focused on:
  - profile
  - branding
  - payouts
  - notifications
  - legal/policies

### Property Manager Company UX

Add company-oriented navigation:

- Dashboard
- Portfolios
- Owners / Clients
- Properties
- Tenants
- Team
- Finance / Payouts
- Branding
- Settings

Key company-only surfaces:

- owner list
- per-owner portfolio view
- staff permission matrix
- approval queue
- owner reporting exports

### Tenant UX

Tenant-facing branding should always resolve from the workspace currently operating the tenancy.

That means:

- manager company branding if a manager company operates the property
- solo landlord branding if the landlord self-manages
- DoorRent defaults if no branding is configured

Tenant UX must not expose internal role complexity. A tenant should simply see:

- who manages the property
- who to contact
- who sent the notice/agreement/payment request

## Permission Model

Permissions should be capability-based, not only role-label-based.

Suggested capabilities:

- `properties.read`
- `properties.write`
- `tenants.read`
- `tenants.write`
- `agreements.manage`
- `payments.read`
- `payments.manage`
- `notices.manage`
- `meetings.manage`
- `branding.manage`
- `workspace.members.manage`
- `portfolio.approvals.manage`
- `payouts.manage`
- `reports.read`

### Critical Actions

In manager-company mode, certain actions may require owner approval:

- changing payout destination
- granting grace period above threshold
- approving legal escalation
- selling or releasing a unit at a discounted rate
- changing management scope

Approval rules should be per portfolio, not global.

## Rollout Plan

### Phase 1: Keep Current Model, Clarify Meaning

Use the current `Landlord` model as the active workspace root.

Do now:

- treat landlord account as the workspace identity
- keep branding on this record
- describe current mode internally as `workspace-root landlord`
- update product language so solo mode remains the default mental model

### Phase 2: Extract Workspace From Landlord

Introduce:

- `Workspace`
- `WorkspaceMember`
- `WorkspaceMode`

Then migrate current landlord-root accounts into workspaces:

- each landlord becomes one workspace
- the original landlord user becomes the first workspace member
- existing branding moves to workspace

### Phase 3: Add Managed Portfolios

Introduce:

- `PortfolioOwner`
- `ManagedPortfolio`
- approval rules
- owner-facing reporting

This enables one manager company to operate multiple landlord portfolios without collapsing them into one generic landlord record.

### Phase 4: Optional White-Label Expansion

When needed for premium clients:

- branded subdomains
- custom email sender domains
- premium PDF branding
- separate native mobile builds per company

## Guardrails

To avoid making the product feel heavy for solo landlords:

- default new workspaces to `SOLO_LANDLORD`
- never show owner/portfolio/company-client concepts in solo mode
- keep company-only fields hidden unless the workspace mode requires them
- avoid forcing extra approval layers in solo mode

## Immediate Implementation Guidance

If we continue building incrementally on the current codebase, the next practical moves should be:

1. Add a `workspaceMode` field to the operational root account.
2. Rename or document current landlord-root logic as `workspace` logic in service code.
3. Replace generic `team members` copy with permission-aware workspace member language where appropriate.
4. Keep tenant branding resolution tied to the active workspace operating that tenancy.
5. Delay full portfolio-owner extraction until the manager-company workflow is ready to ship end to end.

## Summary

DoorRent should not become company-only.

It should support:

- a simple landlord who manages directly
- a manager company with staff and multiple owner portfolios

The correct product model is:

- one workspace architecture
- two clean workspace modes
- one light UX for solo landlords
- one richer UX for manager companies
