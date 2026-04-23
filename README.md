# EasyPay — Digital Banking & Wallet Platform

A full-stack fintech project built for learning, covering frontend, backend, database design, auth, payments, Redis, Docker and testing.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript, Passport.js |
| Database | PostgreSQL + Prisma ORM |
| Cache / Queue | Redis (via ioredis) |
| Auth | JWT (access + refresh tokens), Google OAuth 2.0 |
| Payments | Stripe (PaymentIntent + webhooks) |
| Monorepo | Turborepo |
| Containers | Docker + Docker Compose |

## Project Structure

```
finvault/
├── apps/
│   ├── api/                  # NestJS REST API
│   │   └── src/
│   │       ├── auth/         # JWT, Google OAuth, guards, strategies
│   │       ├── users/        # User profile management
│   │       ├── wallet/       # Wallet + virtual cards
│   │       ├── transactions/ # Transfer, transaction history
│   │       ├── payments/     # Stripe top-ups + webhooks
│   │       ├── notifications/# In-app notifications (Redis-backed)
│   │       ├── database/     # PrismaService
│   │       └── health/       # Health check endpoint
│   └── web/                  # Next.js 14 frontend
│       └── src/
│           ├── app/          # App Router pages
│           │   ├── auth/     # Login, Register, OAuth callback
│           │   └── dashboard/# Main dashboard, transactions, etc.
│           ├── components/   # Reusable UI components
│           ├── store/        # Zustand auth store
│           └── lib/          # API client, utilities
├── packages/
│   ├── database/             # Prisma schema + seed
│   └── shared/               # Types, constants, utilities (shared)
├── docker-compose.dev.yml    # Dev services (Postgres, Redis, GUIs)
└── docker-compose.yml        # Production full-stack
```

## Getting Started

### Prerequisites
- Node.js ≥ 22
- Docker Desktop
- pnpm ≥ 9 (`npm install -g pnpm`)

### 1. Clone & install

```bash
git clone <your-repo>
cd finvault
pnpm install
```

### 2. Start infrastructure

```bash
pnpm docker:up
# Starts: PostgreSQL (5432), Redis (6379), pgAdmin (5050), Redis Commander (8081)
```

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local — fill in JWT secrets, Stripe keys, etc.
```

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Run database migrations & seed

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run migrations  
pnpm db:seed       # Seed demo data
```

### 5. Start development servers

```bash
# From root
pnpm dev
# API: http://localhost:3001
# Web: http://localhost:3000
# Swagger: http://localhost:3001/api/docs
```

## Demo Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@finvault.com | Admin@123456 |
| User | alice@example.com | Alice@123456 |
| User | bob@example.com | Bob@123456 |

## API Endpoints

| Module | Endpoint | Description |
|---|---|---|
| Auth | `POST /api/v1/auth/register` | Register new user |
| Auth | `POST /api/v1/auth/login` | Login → JWT tokens |
| Auth | `POST /api/v1/auth/refresh` | Refresh access token |
| Auth | `DELETE /api/v1/auth/logout` | Logout |
| Auth | `GET /api/v1/auth/google` | Google OAuth |
| Wallet | `GET /api/v1/wallet` | Get wallet + balance |
| Wallet | `POST /api/v1/wallet/cards` | Create virtual card |
| Transactions | `POST /api/v1/transactions/transfer` | Transfer money |
| Transactions | `GET /api/v1/transactions` | Transaction history |
| Payments | `POST /api/v1/payments/topup` | Create Stripe PaymentIntent |
| Payments | `POST /api/v1/payments/webhook` | Stripe webhook |
| Notifications | `GET /api/v1/notifications` | List notifications |

## Learning Path

Work through these in order:

1. **Database Design** → `packages/database/prisma/schema.prisma`
2. **NestJS Basics** → `apps/api/src/main.ts`, `app.module.ts`
3. **JWT Auth** → `apps/api/src/auth/`
4. **REST API Design** → `apps/api/src/transactions/`
5. **Atomic DB Transactions** → `TransactionsService.transfer()` — Prisma `$transaction`
6. **Redis Caching** → `AuthService` refresh token storage
7. **Stripe Webhooks** → `apps/api/src/payments/`
8. **Next.js App Router** → `apps/web/src/app/`
9. **React Query + Zustand** → State management patterns
10. **Docker** → `docker-compose.dev.yml` + Dockerfiles
11. **Testing** → Write tests for `TransactionsService`

## Running Tests

```bash
npm run test              # Unit tests (Jest)
npm run test:e2e          # E2E tests (Playwright)
```

## Stripe Test Cards

Use these in development (no real money charged):
- Success: `4242 4242 4242 4242`
- Auth required: `4000 0025 0000 3155`
- Decline: `4000 0000 0000 9995`

Use any future expiry date, any 3-digit CVV.

## GUI Tools (dev only)

| Tool | URL | Purpose |
|---|---|---|
| pgAdmin | http://localhost:5050 | PostgreSQL GUI |
| Redis Commander | http://localhost:8081 | Redis key browser |
| Swagger | http://localhost:3001/api/docs | API documentation |
