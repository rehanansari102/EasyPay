import { PrismaClient, UserRole, KycStatus, WalletStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function generateAccountNumber(): Promise<string> {
  const num = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  return num;
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin User ────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@finvault.com' },
    update: {},
    create: {
      email: 'admin@finvault.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'FinVault',
      role: UserRole.ADMIN,
      kycStatus: KycStatus.APPROVED,
      emailVerified: true,
      isActive: true,
    },
  });

  // Admin wallet
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      balance: 100000,
      currency: 'USD',
      status: WalletStatus.ACTIVE,
      accountNumber: await generateAccountNumber(),
    },
  });

  // ── Demo User 1 ───────────────────────────────────────────
  const alicePassword = await bcrypt.hash('Alice@123456', 12);
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      passwordHash: alicePassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: UserRole.USER,
      kycStatus: KycStatus.APPROVED,
      emailVerified: true,
      isActive: true,
    },
  });

  const aliceWallet = await prisma.wallet.upsert({
    where: { userId: alice.id },
    update: {},
    create: {
      userId: alice.id,
      balance: 5000,
      currency: 'USD',
      status: WalletStatus.ACTIVE,
      accountNumber: await generateAccountNumber(),
    },
  });

  // ── Demo User 2 ───────────────────────────────────────────
  const bobPassword = await bcrypt.hash('Bob@123456', 12);
  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      passwordHash: bobPassword,
      firstName: 'Bob',
      lastName: 'Smith',
      role: UserRole.USER,
      kycStatus: KycStatus.APPROVED,
      emailVerified: true,
      isActive: true,
    },
  });

  const bobWallet = await prisma.wallet.upsert({
    where: { userId: bob.id },
    update: {},
    create: {
      userId: bob.id,
      balance: 2500,
      currency: 'USD',
      status: WalletStatus.ACTIVE,
      accountNumber: await generateAccountNumber(),
    },
  });

  // ── Sample Transactions ───────────────────────────────────
  await prisma.transaction.createMany({
    data: [
      {
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amount: 5000,
        fee: 0,
        currency: 'USD',
        description: 'Initial deposit via Stripe',
        receiverWalletId: aliceWallet.id,
        metadata: { stripePaymentIntentId: 'pi_demo_001' },
      },
      {
        type: 'TRANSFER',
        status: 'COMPLETED',
        amount: 200,
        fee: 1,
        currency: 'USD',
        description: 'Payment for services',
        senderWalletId: aliceWallet.id,
        receiverWalletId: bobWallet.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed complete!');
  console.log('\n👤 Demo accounts:');
  console.log('   Admin  → admin@finvault.com  / Admin@123456');
  console.log('   Alice  → alice@example.com   / Alice@123456');
  console.log('   Bob    → bob@example.com     / Bob@123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
