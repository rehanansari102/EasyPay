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
- [x] Global `SanitizePipe` (XSS strip on body + query)
- [x] Swagger / OpenAPI docs (`/api/docs`)
- [x] Environment validation with `class-validator`
- [x] `PrismaService` with lifecycle hooks
- [x] Redis cache module (global, via ioredis)
- [x] Rate limiting (`ThrottlerModule`)
- [x] Request ID middleware (`X-Request-Id` header propagation)
- [x] Health check endpoint with DB + Redis ping (`GET /api/v1/health`)
- [x] Winston structured logging (colorized dev, JSON production)

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
- [x] `RolesGuard` with `@Roles()` decorator
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
- [x] `DELETE /wallet/cards/:id` — cancel a card
- [x] Card number + CVV encryption at rest (AES-256-GCM via `CryptoService`)
- [x] Spending limit enforcement on card transactions
- [x] Wallet suspension / reactivation (via admin endpoints)

---

## Phase 7 — Transactions API ✅

- [x] `POST /transactions/transfer` — atomic user-to-user transfer with fee
- [x] Balance checks (insufficient funds, self-transfer, suspended wallet)
- [x] Dynamic fee calculation (1–3% based on amount)
- [x] Daily transfer limit enforcement
- [x] `GET /transactions` — paginated history with filters (type, status, date range)
- [x] `GET /transactions/:id` — single transaction detail
- [x] `GET /transactions/export` — export to CSV
- [x] Post-transfer notifications sent to both parties
- [ ] Scheduled / recurring transfers

---

## Phase 8 — Payments (Stripe) ✅

- [x] `POST /payments/topup` — create Stripe PaymentIntent
- [x] `POST /payments/webhook` — handle `payment_intent.succeeded` + `payment_intent.payment_failed`
- [x] Stripe webhook signature verification (`stripe.webhooks.constructEvent`)
- [x] Idempotency guard (skip if `PaymentOrder` already `succeeded`)
- [x] Credit wallet + create `DEPOSIT` transaction on success
- [x] Notify user on successful top-up
- [x] `POST /payments/withdraw` — withdrawal / cash-out flow
- [ ] Refund flow (Stripe refund API)
- [ ] Saved payment methods (Stripe Customer + PaymentMethod)

---

## Phase 9 — Notifications API ✅

- [x] `GET /notifications/stream` — real-time SSE endpoint (RxJS Observable)
- [x] `GET /notifications` — list with optional `onlyUnread` filter
- [x] `GET /notifications/unread-count`
- [x] `PATCH /notifications/:id/read`
- [x] `PATCH /notifications/read-all`
- [x] Redis channel publish on new notification
- [ ] Push notifications (Web Push API / Firebase)
- [ ] Email notifications on key events (transfer received, top-up confirmed)

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
- [x] `/auth/verify-email` — email verification page
- [x] `/auth/forgot-password` — request reset
- [x] `/auth/reset-password` — set new password
- [x] `/auth/two-factor` — TOTP code entry screen
- [x] Route guard in dashboard layout (redirect if unauthenticated)
- [x] Google OAuth login button

---

## Phase 12 — Frontend Dashboard ✅

- [x] Dashboard layout (Sidebar + Header)
- [x] Sidebar with active route highlighting
- [x] Dark mode toggle in header
- [x] Unread notification badge in header
- [x] Dashboard home page with balance card, quick actions, charts
- [x] `BalanceCard` — shows balance + copy account number
- [x] `QuickActions` — send, top-up, cards links
- [x] `RecentTransactions` — last 5 with incoming/outgoing color
- [x] `SpendingChart` — Recharts bar chart, last 7 days

---

## Phase 13 — Frontend Transactions Page ✅

- [x] Full transaction history list with status badges
- [x] Send money modal (account number + amount + description)
- [x] CSV export button
- [x] Invalidates wallet + transactions query on success

---

## Phase 14 — Frontend Wallet & Cards Page ✅

- [x] `/dashboard/wallet` — wallet details + top-up button
- [x] Stripe Elements integration (`PaymentElement`)
- [x] Top-up flow: create PaymentIntent → Stripe UI → confirm
- [x] `/dashboard/withdraw` — withdrawal form with bank account details
- [x] `/dashboard/cards` — list virtual cards with masked numbers
- [x] Create card modal
- [x] Freeze / unfreeze card actions
- [x] Delete card action

---

## Phase 15 — Frontend Notifications Page ✅

- [x] `/dashboard/notifications` — full notifications list
- [x] Real-time updates via SSE (connects to backend event stream)
- [x] Mark individual / all as read
- [x] Unread count badge in header
- [ ] Notification grouping by type (transaction, security, system)

---

## Phase 16 — Frontend Profile & Settings ✅

- [x] `/dashboard/settings` — profile update (name, phone, avatar upload)
- [x] Change password form
- [x] Enable / disable 2FA (QR code setup + verify flow)
- [x] `/dashboard/kyc` — KYC document upload (type selector, front/back/selfie, status display)

---

## Phase 17 — Admin Panel ✅

- [x] `RolesGuard` + `@Roles('ADMIN')` on all admin API routes
- [x] `GET /admin/stats` — platform-wide stats
- [x] `GET /admin/users` — paginated user list with search
- [x] `PATCH /admin/users/:id/suspend` + `/activate`
- [x] `PATCH /admin/users/:id/kyc` — approve / reject KYC
- [x] `GET /admin/kyc` — all KYC submissions with presigned URLs
- [x] `GET /admin/wallets` — all wallets
- [x] `PATCH /admin/wallets/:id/suspend` + `/activate`
- [x] `GET /admin/transactions` — all transactions system-wide
- [x] `POST /admin/transactions/:id/reverse` — atomic transaction reversal
- [x] `GET /admin/audit-logs` — full audit trail
- [x] Frontend `/dashboard/admin` — stats overview
- [x] Frontend `/dashboard/admin/users` — user management
- [x] Frontend `/dashboard/admin/kyc` — KYC review with image preview
- [x] Frontend `/dashboard/admin/wallets` — wallet management
- [x] Frontend `/dashboard/admin/transactions` — transaction review + reversal UI
- [x] Frontend `/dashboard/admin/audit-logs` — audit log viewer

---

## Phase 18 — Testing 🔄

- [x] `TransactionsService` unit tests (Jest)
- [x] `AuthService` unit tests (Jest)
- [x] `WalletService` unit tests (Jest)
- [x] `PaymentsService` unit tests (Jest)
- [x] Playwright E2E test scaffold
- [ ] Full unit test coverage for all services
- [ ] Integration tests with test database
- [ ] E2E: complete transfer flow (login → send money → check balance)
- [ ] E2E: top-up flow with Stripe test cards
- [ ] API contract tests (Supertest)

---

## Phase 19 — Security Hardening 🔄

- [x] Input sanitization middleware (XSS strip via `SanitizePipe`)
- [x] SQL injection protection (Prisma parameterized queries)
- [x] `SameSite` + `httpOnly` cookie policy for auth tokens
- [ ] `Content-Security-Policy` headers (Helmet CSP — relaxed in dev)
- [ ] OWASP dependency audit (`pnpm audit`)
- [ ] Secrets rotation procedure documented
- [ ] HTTPS enforced in production (redirect HTTP → HTTPS)

---

## Phase 20 — Observability 🔄

- [x] Structured JSON logging (Winston — JSON in prod, colorized in dev)
- [x] Request ID propagation (`X-Request-Id` correlation header)
- [x] Health check with DB + Redis ping
- [ ] Prometheus metrics endpoint (`/metrics`)
- [ ] Uptime monitoring

---

## Phase 21 — CI/CD & Deployment 🔄

- [x] GitHub Actions — lint + test on PR (`ci.yml`)
- [x] GitHub Actions — build + push Docker images on merge to `main` (`deploy.yml`)
- [x] Dockerfiles for API and web (multi-stage builds)
- [ ] `prisma migrate deploy` in API startup / entrypoint script
- [ ] Environment-specific secrets management (Docker secrets / Vault)
- [ ] Deploy to cloud (Railway / Render / AWS ECS)
- [ ] Custom domain + SSL certificate
- [ ] CDN for static Next.js assets

---

## Phase 22 — Documentation 🔄

- [x] `README.md` — full setup guide, stack overview, API table, demo accounts, learning path
- [x] `ROADMAP.md` — this file
- [ ] Swagger `@ApiProperty` annotations on all DTOs
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
| 5 — Auth & Security | ✅ Done |
| 6 — Wallet & Cards API | ✅ Done |
| 7 — Transactions API | ✅ Done |
| 8 — Payments (Stripe) | ✅ Done |
| 9 — Notifications API | ✅ Done |
| 10 — Frontend Foundation | ✅ Done |
| 11 — Auth Pages | ✅ Done |
| 12 — Dashboard | ✅ Done |
| 13 — Transactions Page | ✅ Done |
| 14 — Wallet & Cards UI | ✅ Done |
| 15 — Notifications UI | ✅ Done |
| 16 — Profile & Settings | ✅ Done |
| 17 — Admin Panel | ✅ Done |
| 18 — Testing | 🔄 Partial |
| 19 — Security Hardening | 🔄 Partial |
| 20 — Observability | 🔄 Partial |
| 21 — CI/CD & Deployment | 🔄 Partial |
| 22 — Documentation | 🔄 Partial |
