import { PrismaClient } from '@prisma/client';
import { buildSeedData } from '../src/data/seedData';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Supabase PostgreSQL database for Civics Plus...');
  const data = buildSeedData();

  // Clear existing in reverse dependency order
  await prisma.fraudFlag.deleteMany({});
  await prisma.timeline.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.user.deleteMany({});

  console.log(`Inserting ${data.users.length} users...`);
  for (const user of data.users) {
    await prisma.user.create({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        password: user.password,
        role: user.role,
        location: user.location,
        avatarUrl: user.avatarUrl,
        fraudScore: user.fraudScore,
        isBanned: user.isBanned,
        bannedUntil: user.bannedUntil ? new Date(user.bannedUntil) : null,
      },
    });
  }

  console.log(`Inserting ${data.complaints.length} complaints with photos and timelines...`);
  for (const cmp of data.complaints) {
    await prisma.complaint.create({
      data: {
        id: cmp.id,
        complaintId: cmp.complaintId,
        category: cmp.category,
        description: cmp.description,
        location: cmp.location,
        latitude: cmp.latitude,
        longitude: cmp.longitude,
        status: cmp.status,
        priority: cmp.priority,
        rejectionReason: cmp.rejectionReason,
        assignedAt: cmp.assignedAt ? new Date(cmp.assignedAt) : null,
        resolvedAt: cmp.resolvedAt ? new Date(cmp.resolvedAt) : null,
        reportedById: cmp.reportedById,
        assignedToId: cmp.assignedToId,
        photos: {
          create: cmp.photos.map((p) => ({
            id: p.id,
            url: p.url,
            type: p.type,
          })),
        },
        timeline: {
          create: cmp.timeline.map((t) => ({
            id: t.id,
            stage: t.stage,
            officerName: t.officerName,
            notes: t.notes,
            timestamp: new Date(t.timestamp),
          })),
        },
        fraudFlags: {
          create: cmp.fraudFlags.map((f) => ({
            id: f.id,
            reason: f.reason,
            score: f.score,
          })),
        },
      },
    });
  }

  console.log('✅ Supabase PostgreSQL seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
