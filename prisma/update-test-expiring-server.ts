import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTestExpiringServer() {
    console.log('🧪 Updating test server for expiration notification...\n');

    const targetGuildId = '1170370117708828712';

    // Calculate tomorrow at 9:00 AM
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    console.log(`Current time: ${now.toLocaleString('th-TH')}`);
    console.log(`Expiry time: ${tomorrow.toLocaleString('th-TH')}\n`);

    try {
        // Find the specific server
        const existingServer = await prisma.serverDB.findUnique({
            where: {
                serverId: targetGuildId,
            },
        });

        if (!existingServer) {
            console.log(`❌ Server ${targetGuildId} not found in database.`);
            console.log('💡 Please register this server first using /server-register command in Discord.\n');
            return;
        }

        // Update the server to expire tomorrow
        const updatedServer = await prisma.serverDB.update({
            where: {
                serverId: targetGuildId,
            },
            data: {
                openUntilAt: tomorrow,
                openBot: true,
                updatedAt: new Date(),
            },
        });

        console.log('✅ Test server updated successfully!\n');
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
        console.error('❌ Error updating test server:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateTestExpiringServer();
