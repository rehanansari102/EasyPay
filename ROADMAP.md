# EasyPay — Project Roadmap

Track every phase from scaffold to production-ready product.

**Legend:** ✅ Completed · 🔄 In Progress · ⬜ Pending

---

## Phase 1 — Project Foundation ✅

- [x] Turborepo monorepo setup
- [x] Root `package.json` with workspaces
- [x] `turbo.json` pipeline configuration
- [x] Prettier + ESLint config
- [x] `.gitignore`
- [x] TypeScript base config per package

---

## Phase 2 — Database Design ✅

- [x] PostgreSQL + Prisma ORM setup (`packages/database`)
- [x] `User` model (roles, KYC status, 2FA fields)
- [x] `Session` model (refresh token tracking)
- [x] `Wallet` model (balance, account number, currency)
- [x] `Transaction` model (transfer, deposit, reversal, fee types)
- [x] `VirtualCard` model
- [x] `PaymentOrder` model (Stripe integration)
- [x] `Notification` model
- [x] `AuditLog` model
- [x] `KycDocument` model
- [x] Database seed script (admin + demo users + sample transactions)

---

## Phase 3 — Shared Package ✅

- [x] Shared TypeScript types (`UserDto`, `WalletDto`, `TransactionDto`, `AuthTokens`, etc.)
- [x] Shared constants (fee %, limits, Redis key generators, cache TTLs)
- [x] `formatCurrency`, `toCents`, `calculateFee` utility functions
- [x] Input validators (`isValidEmail`, `isValidPassword`, `isValidAccountNumber`)

---

## Phase 4 — Backend API (NestJS) ✅

- [x] NestJS app scaffolded with global prefix + URI versioning
- [x] Helmet + compression middleware
- [x] CORS configuration
- [x] Global `ValidationPipe` (whitelist + transform)
- [x] Swagger / OpenAPI docs (`/api/docs`)
- [x] Environment validation with `class-validator`
- [x] `PrismaService` with lifecycle hooks
- [x] Redis cache module (global, via ioredis)
- [x] Rate limiting (`ThrottlerModule`)
- [x] Health check endpoint (`GET /api/v1/health`)

---

## Phase 5 — Authentication & Security ✅

- [x] JWT access token (15 min expiry)
- [x] JWT refresh token (7 days, stored in Redis, rotated on use)
- [x] `POST /auth/register` — create user + wallet atomically
- [x] `POST /auth/login` — LocalStrategy (email + password)
- [x] `POST /auth/refresh` — rotate refresh token
- [x] `DELETE /auth/logout` — invalidate refresh token in Redis
- [x] Google OAuth 2.0 (`passport-google-oauth20`)
- [x] `JwtAuthGuard` with `@Public()` bypass decorator
- [x] `@CurrentUser()` param decorator
- [x] Audit log on login
- [x] Password hashing with bcrypt (cost 12)
- [x] Email verification flow (send token → verify link)
- [x] Forgot password / reset password flow
- [x] Two-Factor Authentication (TOTP via `otplib`)
- [x] Login attempt tracking + account lockout

---

## Phase 6 — Wallet & Cards API ✅

- [x] `GET /wallet` — fetch balance + account number
- [x] `GET /wallet/cards` — list virtual cards (masked numbers)
- [x] `POST /wallet/cards` — generate virtual card (number + CVV)
- [x] `PATCH /wallet/cards/:id/toggle-freeze` — freeze / unfreeze card
- [ ] Card number + CVV encryption at rest (AES-256-GCM)
- [ ] Spending limit enforcement on card transactions
- [ ] `DELETE /wallet/cards/:id` — cancel a card
- [ ] Wallet suspension / reactivation (admin)

---

## Phase 7 — Transactions API ✅

- [x] `POST /transactions/transfer` — atomic user-to-user transfer with fee
- [x] Balance checks (insufficient funds, self-transfer, suspended wallet)
- [x] 0.5% platform fee calculation (min $0.10)
- [x] `GET /transactions` — paginated history with filters (type, status, date range)
- [x] `GET /transactions/:id` — single transaction detail
- [x] Post-transfer notifications sent to both parties
- [ ] Daily transfer limit enforcement ($50,000/day)
- [ ] Transaction reversal (admin only)
- [ ] Scheduled / recurring transfers
- [ ] Export transactions to CSV

---

## Phase 8 — Payments (Stripe) ✅

- [x] `POST /payments/topup` — create Stripe PaymentIntent
- [x] `POST /payments/webhook` — handle `payment_intent.succeeded` + `payment_intent.payment_failed`
- [x] Idempotency guard (skip if `PaymentOrder` already `succeeded`)
- [x] Credit wallet + create `DEPOSIT` transaction on success
- [x] Notify user on successful top-up
- [ ] Withdrawal / cash-out flow
- [ ] Refund flow (Stripe refund API)
- [ ] Saved payment methods (Stripe Customer + PaymentMethod)
- [ ] Stripe webhook signature verification (already scaffolded, needs real secret)

---

## Phase 9 — Notifications API ✅

- [x] `GET /notifications` — list with optional `onlyUnread` filter
- [x] `GET /notifications/unread-count`
- [x] `PATCH /notifications/:id/read`
- [x] `PATCH /notifications/read-all`
- [x] Redis channel publish on new notification
- [ ] Real-time delivery via Server-Sent Events (SSE) endpoint
- [ ] Push notifications (Web Push API / Firebase)
- [ ] Email notifications (Resend / Nodemailer)

---

## Phase 10 — Frontend Foundation (Next.js 15) ✅

- [x] Next.js 15 + React 19 + TypeScript
- [x] Tailwind CSS + CSS variables for light/dark theme
- [x] `next-themes` dark mode support
- [x] TanStack Query (server state) + Zustand (client auth state)
- [x] Axios API client with JWT interceptor + silent token refresh
- [x] `Providers` component wrapping QueryClient + ThemeProvider
- [x] `Sonner` toast notifications
- [x] Monorepo `@easypay/shared` types consumed in frontend

---

## Phase 11 — Frontend Auth Pages ✅

- [x] `/auth/login` — email + password form with Zod validation
- [x] `/auth/register` — full registration form
- [x] `/auth/callback` — Google OAuth token exchange page
- [x] Route guard in dashboard layout (redirect if unauthenticated)
- [x] Google OAuth login button
- [x] `/auth/verify-email` — email verification page
- [x] `/auth/forgot-password` — request reset
- [x] `/auth/reset-password` — set new password
- [x] 2FA entry screen (TOTP code)

---

## Phase 12 — Frontend Dashboard ✅

- [x] Dashboard layout (Sidebar + Header)
- [x] Sidebar with active route highlighting
- [x] Dark mode toggle in header
- [x] Unread notification badge in header (polls every 30s)
- [x] Dashboard home page with balance card, quick actions, charts
- [x] `BalanceCard` — shows balance + copy account number
- [x] `QuickActions` — send, top-up, cards links
- [x] `RecentTransactions` — last 5 with incoming/outgoing color
- [x] `SpendingChart` — Recharts bar chart, last 7 days

---

## Phase 13 — Frontend Transactions Page ✅

- [x] Full transaction history list with status badges
- [x] Send money modal (account number + amount + description)
- [x] Invalidates wallet + transactions query on success

---

## Phase 14 — Frontend Wallet & Cards Page ⬜

- [ ] `/dashboard/wallet` — wallet details + top-up button
- [ ] Stripe Elements integration (`CardElement` or `PaymentElement`)
- [ ] Top-up flow: create PaymentIntent → Stripe UI → confirm
- [ ] `/dashboard/cards` — list virtual cards with masked numbers
- [ ] Create card modal
- [ ] Freeze / cancel card actions

---

## Phase 15 — Frontend Notifications Page ⬜

- [ ] `/dashboard/notifications` — full notifications list
- [ ] Mark individual / all as read
- [ ] Real-time updates via SSE (connects to backend event stream)
- [ ] Notification grouping by type (transaction, security, system)

---

## Phase 16 — Frontend Profile & Settings Page ⬜

- [ ] `/dashboard/profile` — avatar, name, phone update
- [ ] Change password form
- [ ] Enable / disable 2FA (QR code + verify)
- [ ] KYC document upload form
- [ ] Connected accounts (Google OAuth)

---

## Phase 17 — Admin Panel ⬜

- [ ] Role guard (`@Roles('ADMIN')`) on API routes
- [ ] `GET /admin/users` — paginated user list with filters
- [ ] `PATCH /admin/users/:id/status` — suspend / activate user
- [ ] `GET /admin/transactions` — all transactions system-wide
- [ ] `POST /admin/transactions/:id/reverse` — reverse a transaction
- [ ] `PATCH /admin/kyc/:userId/approve` — approve / reject KYC
- [ ] Frontend admin dashboard (separate route group)
- [ ] System-wide analytics (total volume, active users, daily signups)

---

## Phase 18 — Testing ⬜

- [x] `TransactionsService` unit tests (Jest) — transfer validation cases
- [x] Playwright E2E test scaffold (auth flow)
- [ ] Full unit test coverage for `AuthService`
- [ ] Full unit test coverage for `WalletService`
- [ ] Full unit test coverage for `PaymentsService`
- [ ] Integration tests with test database (Docker)
- [ ] E2E: complete transfer flow (login → send money → check balance)
- [ ] E2E: top-up flow with Stripe test cards
- [ ] API contract tests (Supertest)

---

## Phase 19 — Security Hardening ⬜

- [ ] Encrypt virtual card numbers + CVV at rest (AES-256-GCM)
- [ ] `Content-Security-Policy` headers
- [ ] Input sanitization middleware
- [ ] SQL injection protection audit (Prisma parameterized queries — already safe)
- [ ] OWASP dependency audit (`npm audit`)
- [ ] Secrets rotation procedure documented
- [ ] HTTPS enforced in production (redirect HTTP → HTTPS)
- [ ] `SameSite` cookie policy for any cookie usage

---

## Phase 20 — Observability ⬜

- [ ] Structured JSON logging (Pino / Winston)
- [ ] Request ID propagation (correlation IDs)
- [ ] Prometheus metrics endpoint (`/metrics`)
- [ ] Error tracking (Sentry integration)
- [ ] Health check extended (DB + Redis ping)
- [ ] Uptime monitoring

---

## Phase 21 — CI/CD & Deployment ⬜

- [ ] GitHub Actions workflow — lint + test on PR
- [ ] GitHub Actions workflow — build + push Docker images on merge to `main`
- [ ] Environment-specific `.env` management (staging vs production)
- [ ] Production `docker-compose.yml` review + secrets via Docker secrets / Vault
- [ ] `prisma migrate deploy` in API startup script
- [ ] Deploy to cloud (Railway / Render / AWS ECS)
- [ ] Custom domain + SSL certificate
- [ ] CDN for static Next.js assets

---

## Phase 22 — Documentation ⬜

- [x] `README.md` — setup guide, stack overview, API table, demo accounts
- [x] `ROADMAP.md` — this file
- [ ] Swagger auto-generated docs fully annotated (`@ApiProperty` on all DTOs)
- [ ] Architecture diagram (Mermaid)
- [ ] Database ERD diagram
- [ ] Contributing guide

---

## Progress Summary

| Phase | Status |
|---|---|
| 1 — Foundation | ✅ Done |
| 2 — Database | ✅ Done |
| 3 — Shared Package | ✅ Done |
| 4 — Backend API | ✅ Done |
| 5 — Auth & Security | 🔄 Partial (email verify + 2FA pending) |
| 6 — Wallet & Cards API | 🔄 Partial (encryption + limits pending) |
| 7 — Transactions API | 🔄 Partial (daily limit + export pending) |
| 8 — Payments (Stripe) | 🔄 Partial (withdrawal + refund pending) |
| 9 — Notifications API | 🔄 Partial (SSE + email pending) |
| 10 — Frontend Foundation | ✅ Done |
| 11 — Auth Pages | 🔄 Partial (verify email + 2FA UI pending) |
| 12 — Dashboard | ✅ Done |
| 13 — Transactions Page | ✅ Done |
| 14 — Wallet & Cards UI | ⬜ Pending |
| 15 — Notifications UI | ⬜ Pending |
| 16 — Profile & Settings | ⬜ Pending |
| 17 — Admin Panel | ⬜ Pending |
| 18 — Testing | 🔄 Partial (scaffold only) |
| 19 — Security Hardening | ⬜ Pending |
| 20 — Observability | ⬜ Pending |
| 21 — CI/CD & Deployment | ⬜ Pending |
| 22 — Documentation | 🔄 Partial |
