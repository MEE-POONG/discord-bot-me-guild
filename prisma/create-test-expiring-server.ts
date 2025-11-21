import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestExpiringServer() {
    console.log('🧪 Creating test server for expiration notification...\n');

    // Calculate tomorrow at 9:00 AM
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    console.log(`Current time: ${now.toLocaleString('th-TH')}`);
    console.log(`Expiry time: ${tomorrow.toLocaleString('th-TH')}\n`);

    try {
        // Get the first server from database to update
        const existingServer = await prisma.serverDB.findFirst({
            where: {
                openBot: true,
            },
        });

        if (!existingServer) {
            console.log('❌ No active server found in database.');
            console.log('💡 Please register a server first using /server-register command in Discord.\n');
            return;
        }

        // Update the server to expire tomorrow
        const updatedServer = await prisma.serverDB.update({
            where: {
                id: existingServer.id,
            },
            data: {
                openUntilAt: tomorrow,
                openBot: true,
                updatedAt: new Date(),
            },
        });

        console.log('✅ Test server created successfully!\n');
        console.log('📋 Server Details:');
        console.log(`   Server ID: ${updatedServer.serverId}`);
        console.log(`   Server Name: ${updatedServer.serverName}`);
        console.log(`   Owner ID: ${updatedServer.ownerId}`);
        console.log(`   Open Bot: ${updatedServer.openBot}`);
        console.log(`   Expires At: ${updatedServer.openUntilAt.toLocaleString('th-TH')}`);
        console.log('');
        console.log('🧪 Now you can test the notification system:');
        console.log('   1. Run: /test-expiration-notification in Discord');
        console.log('   2. Check the terminal logs');
        console.log('   3. Check 🕍︰me-guild-center channel for notification');
        console.log('');
    } catch (error) {
        console.error('❌ Error creating test server:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestExpiringServer();
