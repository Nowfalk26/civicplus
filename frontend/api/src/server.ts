import app from './app';
import { prisma, inMemoryDb } from './lib/prisma';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    // Attempt Prisma PostgreSQL connection
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost:5432/civicsplus')) {
      await prisma.$connect();
      console.log('✔ Connected to Supabase PostgreSQL database via Prisma ORM.');
    } else {
      console.log('ℹ Local development mode: Using pre-seeded in-memory store (Supabase DB connection optional).');
    }
  } catch (error: any) {
    console.warn('⚠ PostgreSQL connection not established. Falling back to active seeded civic store.');
  }

  // Ensure store is primed
  inMemoryDb.init();

  app.listen(PORT, () => {
    console.log(`
=====================================================
  🏛️  CIVICS PLUS - TAMIL NADU CIVIC AUTHORITY
=====================================================
  🚀 Server running on: http://localhost:${PORT}
  📡 API Health:        http://localhost:${PORT}/api/health
  👥 Pre-seeded users:  ${inMemoryDb.users.length} accounts
  📋 Complaints loaded: ${inMemoryDb.complaints.length} tickets
  🛡️  Fraud engine:     Active (Auto-ban > 80 pts)
=====================================================
    `);
  });
}

startServer();
