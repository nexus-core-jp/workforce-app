# Quality checklist (Workforce App)

This project prioritizes *correctness & safety* over speed.

## 0) Non-negotiables
- Multi-tenant safety: every query must be scoped by `tenantId`.
- Auth required for protected pages/APIs.
- Audit log for admin/approver actions that mutate other users' data.
- Keep `main` always runnable.

## 1) Tenancy
- [ ] Any DB read/write includes `tenantId = session.user.tenantId` in `where`.
- [ ] Any unique lookup uses compound keys with `tenantId` (e.g. `tenantId_email`).
- [ ] No client-provided `tenantId` is trusted.
- [ ] Admin views are still scoped to the tenant.

## 2) Auth / Session
- [ ] Sign-in uses `tenant slug + email + password`.
- [ ] Session contains `user.id`, `tenantId`, `role`, `departmentId` (typed, no `any`).
- [ ] Protected routes redirect to `/login`.

## 3) Attendance rules (MVP)
- [ ] Order constraints: cannot clock-out before clock-in; cannot end break without start; etc.
- [ ] One open TimeEntry per user per day.
- [ ] Work minutes computed consistently on server.

## 4) Leave rules (MVP)
- [ ] Insufficient paid balance -> `NEEDS_ATTENTION`.
- [ ] User can convert to `ABSENCE` (unpaid) and submit for approval.
- [ ] Approved `ABSENCE` day -> daily report not required.

## 5) Close (monthly)
- [ ] Closing locks the month.
- [ ] Post-close edits must go through correction request flow.

## 6) Audit
- [ ] Store before/after JSON for admin actions.
- [ ] Record actorUserId and timestamp.

## 7) Testing / Tooling
- [ ] At least smoke tests for critical business rules.
- [ ] Seed script creates demo tenant + admin.
- [ ] CI runs lint + typecheck.
