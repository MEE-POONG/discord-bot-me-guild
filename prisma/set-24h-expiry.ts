import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setExpiringServerForTesting() {
    console.log('🧪 Setting server to expire in exactly 24 hours...\n');

    const targetGuildId = '1170370117708828712';

    // Calculate exactly 24 hours from now
    const now = new Date();
    const expiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    console.log(`Current time: ${now.toLocaleString('th-TH')}`);
    console.log(`Expiry time: ${expiryTime.toLocaleString('th-TH')}`);
    console.log(`Hours until expiry: 24\n`);

    try {
        // Update the server
        const updatedServer = await prisma.serverDB.update({
            where: {
                serverId: targetGuildId,
            },
            data: {
                openUntilAt: expiryTime,
                openBot: true,
                updatedAt: new Date(),
            },
        });

        console.log('✅ Server updated successfully!\n');
        console.log('📋 Server Details:');
        console.log(`   Server ID: ${updatedServer.serverId}`);
        console.log(`   Server Name: ${updatedServer.serverName}`);
        console.log(`   Expires At: ${updatedServer.openUntilAt.toLocaleString('th-TH')}`);
        console.log(`   Expires At (UTC): ${updatedServer.openUntilAt.toISOString()}`);
        console.log('');
        console.log('🧪 Now run: /test-expiration-notification in Discord');
        console.log('');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

setExpiringServerForTesting();
