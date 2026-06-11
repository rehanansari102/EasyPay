# EasyPay — Digital Banking & Wallet Platform

A full-stack fintech application covering the end-to-end concerns of a real digital wallet product: secure authentication (including 2FA and Google OAuth), wallet management, virtual cards, Stripe-powered top-ups, peer-to-peer transfers, KYC document review, real-time notifications, and a full admin back-office.

Built as a learning project to demonstrate production-grade patterns across the entire stack — database design, REST API design, atomic transactions, Redis caching, file uploads, Stripe webhooks, SSE, and more.

---

## Features

### Authentication & Security
- Email/password registration with email verification flow
- Google OAuth 2.0 sign-in
- JWT-based sessions — 15 min access token + 7 day refresh token stored in httpOnly cookies
- Two-factor authentication (TOTP — compatible with Google Authenticator, Authy, etc.)
- Forgot/reset password via email
- Account lockout after repeated failed login attempts
- Request ID middleware and full audit logging for every sensitive action

### Wallet
- One wallet per user with a unique 10-digit account number
- Real-time balance updates pushed via Server-Sent Events
- Top up balance via Stripe (PaymentIntent + webhook confirmation)
- Withdraw to a bank account (scaffold ready)
- Virtual card creation with AES-256-GCM encrypted card numbers and CVVs
- Per-card daily spending limits
- Card freeze / unfreeze / delete

### Transactions
- Peer-to-peer transfers by account number
- Dynamic fees — 1% up to $1,000, 2% up to $10,000, 3% above
- Daily transfer limit enforcement
- Atomic database transactions — no partial balance state on failure
- Paginated, filterable transaction history
- CSV export

### KYC (Know Your Customer)
- Document upload: CNIC, NICOP, or Passport (front + back + selfie)
- Files stored securely on Cloudflare R2 with 1-hour presigned URLs
- Status flow: PENDING → SUBMITTED → APPROVED / REJECTED
- Admin review interface with inline image preview

### Real-time Notifications
- Per-user SSE stream — no polling required
- In-app notification center with unread count badge
- Toast alerts on the frontend when transfers are received or balance changes
- Notification types: TRANSACTION, SECURITY, SYSTEM, PROMOTION

### Admin Back-office
- Platform stats dashboard (total users, active users, transaction volume, pending KYC)
- User management — search, view, suspend, activate, manually approve KYC
- Wallet management — suspend / activate individual wallets
- Transaction review and reversal (atomic rollback with fee refund)
- Full audit log viewer, filterable by user

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript 5.4, Tailwind CSS 3 |
| **Backend** | NestJS 11, TypeScript 5.7 |
| **Database** | PostgreSQL via Prisma ORM |
| **Cache** | Redis (ioredis) |
| **Auth** | Passport.js (local, JWT, Google OAuth 2.0), otplib (TOTP) |
| **Payments** | Stripe — PaymentIntent + webhook verification |
| **File Storage** | Cloudflare R2 (S3-compatible) |
| **Email** | Nodemailer + Brevo SMTP |
| **UI Components** | Radix UI primitives, Lucide React icons, Recharts, Sonner toasts |
| **State / Data** | Zustand (auth), TanStack React Query, React Hook Form + Zod |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Containers** | Docker + Docker Compose |
| **Testing** | Jest (unit), Playwright (E2E) |

---

## Project Structure

```
easypay/
├── apps/
│   ├── api/                        # NestJS REST API — port 3001
│   │   └── src/
│   │       ├── auth/               # Registration, login, OAuth, 2FA, password reset
│   │       ├── users/              # Profile read/update, avatar upload
│   │       ├── wallet/             # Wallet info, virtual cards
│   │       ├── transactions/       # P2P transfers, history, CSV export
│   │       ├── payments/           # Stripe top-ups, withdrawals, webhooks
│   │       ├── notifications/      # SSE stream, notification CRUD
│   │       ├── kyc/                # Document upload and status tracking
│   │       ├── admin/              # Admin-only endpoints
│   │       ├── health/             # DB + Redis liveness check
│   │       └── common/             # Sanitize pipe, request-id middleware
│   └── web/                        # Next.js frontend — port 3000
│       └── src/app/
│           ├── auth/               # Login, register, 2FA, email verify, OAuth callback
│           └── dashboard/
│               ├── page.tsx        # Overview — balance, recent transactions, chart
│               ├── wallet/         # Top-up, account details
│               ├── cards/          # Virtual card management
│               ├── transactions/   # History, filters, CSV export
│               ├── notifications/  # Notification center
│               ├── settings/       # Profile, avatar, change password
│               ├── kyc/            # KYC document submission
│               ├── withdraw/       # Withdrawal request
│               └── admin/          # Admin pages (users, wallets, KYC, transactions, audit)
├── packages/
│   ├── database/                   # Prisma schema, migrations, seed scripts
│   └── shared/                     # Shared TypeScript types, constants, fee calculator
├── docker-compose.dev.yml          # Dev infrastructure (Postgres, Redis + GUIs)
└── docker-compose.yml              # Production full-stack compose
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 22 — [nodejs.org](https://nodejs.org)
- **pnpm** >= 9 — `npm install -g pnpm`
- **Docker Desktop** — [docker.com](https://www.docker.com/products/docker-desktop)

### 1. Clone and install

```bash
git clone https://github.com/your-username/easypay.git
cd easypay
pnpm install
```

### 2. Start infrastructure

```bash
pnpm docker:up
```

This starts four services in the background:

| Service | URL | Purpose |
|---|---|---|
| PostgreSQL | `localhost:5432` | Primary database |
| Redis | `localhost:6379` | Cache and session store |
| pgAdmin | http://localhost:5050 | PostgreSQL GUI |
| Redis Commander | http://localhost:8081 | Redis key browser |

### 3. Configure environment variables

Create `apps/api/.env`:

```env
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/easypay
REDIS_URL=redis://localhost:6379

# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000

# Stripe — get from dashboard.stripe.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare R2 — for KYC document storage (create a bucket at dash.cloudflare.com)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=easypay-kyc

# AES-256-GCM key for virtual card encryption (must be 64-char hex = 32 bytes)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CARD_ENCRYPTION_KEY=

# Google OAuth (optional — skip if not using Google sign-in)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback

# Email transport (optional — emails are logged to console if not set)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@easypay.dev
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Set up the database

```bash
pnpm db:generate   # generate Prisma client from schema
pnpm db:migrate    # run all migrations
pnpm db:seed       # seed demo accounts
```

### 5. Start the dev servers

```bash
pnpm dev
```

| App | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger docs | http://localhost:3001/api/docs |

Open Prisma Studio to browse your database:

```bash
pnpm db:studio
```

---

## Demo Accounts

After running `pnpm db:seed`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@finvault.com | Admin@123456 |
| User | alice@example.com | Alice@123456 |
| User | bob@example.com | Bob@123456 |

---

## API Reference

All endpoints are prefixed `/api/v1/`. The full interactive Swagger documentation is available at `http://localhost:3001/api/docs` when running locally.

| Module | Base path | Key endpoints |
|---|---|---|
| **Auth** | `/auth` | `POST /register`, `POST /login`, `POST /refresh`, `DELETE /logout`, `GET /google`, `POST /2fa/enable`, `POST /2fa/verify`, `POST /forgot-password`, `POST /reset-password` |
| **Users** | `/users` | `GET /me`, `PATCH /me`, `POST /me/avatar` |
| **Wallet** | `/wallet` | `GET /` (balance + details), `GET /cards`, `POST /cards`, `PATCH /cards/:id/toggle-freeze`, `DELETE /cards/:id` |
| **Transactions** | `/transactions` | `POST /transfer`, `GET /` (paginated), `GET /:id`, `GET /export` (CSV) |
| **Payments** | `/payments` | `POST /topup`, `POST /withdraw`, `POST /webhook` |
| **Notifications** | `/notifications` | `GET /stream` (SSE), `GET /`, `GET /unread-count`, `PATCH /:id/read`, `PATCH /read-all` |
| **KYC** | `/kyc` | `POST /submit` (multipart), `GET /status` |
| **Admin** | `/admin` | `/stats`, `/users`, `/kyc`, `/wallets`, `/transactions`, `/audit-logs` |
| **Health** | `/health` | `GET /` — DB + Redis liveness |

---

## Available Scripts

```bash
# Development
pnpm dev              # Run all apps in parallel watch mode
pnpm build            # Build all apps
pnpm test             # Run all unit tests (Jest)
pnpm lint             # Lint all packages
pnpm format           # Format all files with Prettier

# Infrastructure
pnpm docker:up        # Start PostgreSQL, Redis, pgAdmin, Redis Commander
pnpm docker:down      # Stop all infrastructure containers

# Database
pnpm db:generate      # Generate Prisma client from schema
pnpm db:migrate       # Apply all pending migrations
pnpm db:seed          # Seed demo data
pnpm db:studio        # Open Prisma Studio at http://localhost:5555
```

---

## Stripe Test Cards

No real money is charged in test mode. Use these card numbers:

| Card | Number |
|---|---|
| Success | `4242 4242 4242 4242` |
| Requires authentication | `4000 0025 0000 3155` |
| Declined | `4000 0000 0000 9995` |

Any future expiry date and any 3-digit CVV will work.

---

## Learning Path

If you're using this project to learn, work through the layers in this order:

1. **Database design** → `packages/database/prisma/schema.prisma`
2. **NestJS fundamentals** → `apps/api/src/main.ts`, `app.module.ts`
3. **JWT authentication** → `apps/api/src/auth/`
4. **REST API design** → `apps/api/src/wallet/`, `apps/api/src/transactions/`
5. **Atomic DB operations** → `TransactionsService.transfer()` — Prisma `$transaction`
6. **Redis caching** → `AuthService` refresh token storage
7. **Stripe integration** → `apps/api/src/payments/` — PaymentIntent lifecycle + webhook verification
8. **File uploads** → `apps/api/src/kyc/` — Cloudflare R2 via the S3 SDK
9. **Server-Sent Events** → `apps/api/src/notifications/` — real-time push without WebSockets
10. **Next.js App Router** → `apps/web/src/app/dashboard/`
11. **React Query + Zustand** → data fetching and client state patterns
12. **Docker Compose** → `docker-compose.dev.yml` + Dockerfiles
13. **Writing tests** → extend the existing Jest specs in `*.service.spec.ts` files

---

## License

MIT
