import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create default web settings
    await prisma.webDefaultDB.create({
      data: {
        logoSquare: 'https://example.com/logo-square.png',
        logoCircle: 'https://example.com/logo-circle.png',
        logoWide: 'https://example.com/logo-wide.png',
        defaultImg: 'https://example.com/default.png',
        defaultProfile: 'https://example.com/default-profile.png',
        facebook: 'https://facebook.com/meguild',
        instagram: 'https://instagram.com/meguild',
        youtube: 'https://youtube.com/meguild',
        tiktok: 'https://tiktok.com/@meguild',
        gmail: 'contact@meguild.com',
        createdBy: 'SYSTEM',
        updatedBy: 'SYSTEM',
        deleteBy: '',
      },
    });

    // Create admin shift types
    const adminShift = await prisma.adminShiftDB.upsert({
      where: {
        name: 'Super Admin',
      },
      update: {
        name: 'Super Admin',
      },
      create: {
        name: 'Super Admin',
      },
    });

    // Create default admin user
    const hashedPassword = await hash('admin123', 10);

    const admin = await prisma.adminDB.upsert({
      where: {
        username: 'admin',
      },
      update: {
        password: hashedPassword,
        name: 'System Admin',
        tel: '0000000000',
        email: 'admin@meguild.com',
        position: 'Super Admin',
        createdBy: 'SYSTEM',
        updatedBy: 'SYSTEM',
        deleteBy: '',
        adminShiftId: adminShift.id,
      },
      create: {
        username: 'admin',
        password: hashedPassword,
        name: 'System Admin',
        tel: '0000000000',
        email: 'admin@meguild.com',
        position: 'Super Admin',
        createdBy: 'SYSTEM',
        deleteBy: '',
      },
    });

    // Create game categories
    const gameCategories = [
      'แนวเกมส์',
      'MMORPG',
      'MOBA',
      'FPS',
      'Battle Royale',
      'RTS',
      'Simulation',
      'Sports',
      'Card Games',
      'Puzzle',
      'Adventure',
      'Casual',
      'Survival',
      'Rhythm',
    ];

    await Promise.all(
      gameCategories.map((title) =>
        prisma.gameCategoryDB.upsert({
          where: { title: title },
          update: {
            updatedAt: new Date(),
            updatedBy: admin.id,
          },
          create: {
            title,
            createdAt: new Date(),
            createdBy: admin.id,
            updatedAt: new Date(),
            updatedBy: admin.id,
            deleteBy: '',
          },
        }),
      ),
    );

    console.log('Game categories seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
