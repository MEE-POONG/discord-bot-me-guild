import { EmbedBuilder, Guild } from 'discord.js';
import { ServerRepository } from 'src/repository/server';

export async function validateServerAndRole(
  interaction: any,
  roleCheck: 'owner' | 'admin' | 'user',
  serverRepository: ServerRepository,
) {
  const guild = interaction.guild as Guild;

  // ตรวจสอบว่า interaction มาจาก guild หรือไม่
  if (!guild) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ข้อผิดพลาดในการดึงข้อมูล')
          .setDescription('ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์จาก Discord ได้')
          .setColor(0xff0000), // สีแดง
      ],
      ephemeral: true,
    });
  }

  const existingServer = await serverRepository.getServerById(guild.id);

  // ตรวจสอบว่าเซิร์ฟเวอร์ลงทะเบียนในระบบหรือไม่
  if (!existingServer) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่พบการลงทะเบียน')
          .setDescription(`เซิร์ฟเวอร์ "${guild.name}" ยังไม่ได้ลงทะเบียนในระบบ`)
          .setColor(0xff0000), // สีแดง
      ],
      ephemeral: true,
    });
  }

  // ตรวจสอบว่าหมดอายุใช้งานหรือไม่
  const now = new Date();
  if (existingServer.openUntilAt && now > new Date(existingServer.openUntilAt)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⛔ หมดอายุการใช้งาน')
          .setDescription(
            `การใช้งาน Bot สำหรับเซิร์ฟเวอร์ "${guild.name}" หมดอายุแล้ว\n` +
            `โปรดติดต่อแอดมินเพื่อขยายเวลาการใช้งาน`,
          )
          .setColor(0xff0000), // สีแดง
      ],
      ephemeral: true,
    });
  }

  // ตรวจสอบข้อมูลที่ลงทะเบียนว่าตรงหรือไม่
  if (existingServer.serverName !== guild.name || existingServer.ownerId !== guild.ownerId) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⚠️ พบความไม่ถูกต้อง')
          .setDescription(
            `ข้อมูลเซิร์ฟเวอร์ไม่ตรงกับข้อมูลในระบบ:\n` +
              `**ชื่อเซิร์ฟเวอร์:** "${guild.name}"\n` +
              `**เจ้าของ:** ${guild.ownerId}`,
          )
          .setColor(0xffa500), // สีส้ม
      ],
      ephemeral: true,
    });
  }

  // เจ้าของเซิร์ฟเวอร์ (owner) สามารถใช้งานได้ทุกคำสั่ง
  if (guild.ownerId === interaction.user.id) {
    return null; // Validation passed
  }

  const member = guild.members.cache.get(interaction.user.id);

  if (!member) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่พบข้อมูลสมาชิก')
          .setDescription('ไม่สามารถดึงข้อมูลสมาชิกจาก Discord ได้')
          .setColor(0xff0000), // สีแดง
      ],
      ephemeral: true,
    });
  }

  // ตรวจสอบบทบาทสำหรับ adminRoleId
  if (roleCheck === 'admin' || roleCheck === 'user') {
    if (existingServer.adminRoleId && member.roles.cache.has(existingServer.adminRoleId)) {
      return null; // Admin can access both admin and user commands
    }
  }

  // ตรวจสอบบทบาทสำหรับ userRoleId
  if (roleCheck === 'user') {
    if (existingServer.userRoleId && member.roles.cache.has(existingServer.userRoleId)) {
      return null; // User can access user commands
    }
  }

  // หากไม่มีสิทธิ์
  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('⛔ ข้อผิดพลาดในการเข้าถึง')
        .setDescription('🔒 คุณไม่มีสิทธิ์ในการใช้งานคำสั่งนี้')
        .setColor(0xff0000), // สีแดง
    ],
    ephemeral: true,
  });
}
