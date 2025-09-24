import { EmbedBuilder, Guild } from 'discord.js';
import { ServerRepository } from 'src/repository/server';

export async function validateServerAndRole(
  interaction: any,
  roleCheck: 'owner' | 'admin' | 'user',
  serverRepository: ServerRepository,
) {
  console.log(`[validateServerAndRole] Starting validation for roleCheck: ${roleCheck}`);
  const guild = interaction.guild as Guild;
  console.log(`[validateServerAndRole] Guild: ${guild?.name} (${guild?.id})`);

  // ตรวจสอบว่า interaction มาจาก guild หรือไม่
  if (!guild) {
    console.log(`[validateServerAndRole] No guild found`);
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

  // ดึงข้อมูลเซิร์ฟเวอร์จากฐานข้อมูล
  console.log(`[validateServerAndRole] Fetching server data for guild: ${guild.id}`);
  const server = await serverRepository.getServerById(guild.id);
  console.log(`[validateServerAndRole] Server data:`, server);
  if (!server) {
    console.log(`[validateServerAndRole] Server not found in database`);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่พบการลงทะเบียนในระบบ')
          .setDescription(`เซิร์ฟเวอร์ "${guild.name}" ยังไม่ได้ลงทะเบียนในระบบ`)
          .setColor(0xff0000), // สีแดง
      ],
      ephemeral: true,
    });
  }

  // ตรวจสอบว่าหมดอายุการใช้งานหรือไม่
  const now = new Date();
  if (server.openUntilAt && now > new Date(server.openUntilAt) && server.openBot) {
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

  if (!server.openBot) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⛔ ยังไม่รับอนุญาติใช้งาน')
          .setDescription(
            `การใช้งาน Bot สำหรับเซิร์ฟเวอร์ "${guild.name}" ยังไม่รับอนุญาติใช้งาน\n` +
              `ติดต่อผู้ให้บริการ`,
          )
          .setColor(0xff0000), // สีแดง
      ],
      ephemeral: true,
    });
  }

  // ตรวจสอบข้อมูลที่ลงทะเบียนว่าตรงหรือไม่
  if (server.serverName !== guild.name || server.ownerId !== guild.ownerId) {
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
  console.log(
    `[validateServerAndRole] Checking ownership: guild.ownerId=${guild.ownerId}, user.id=${interaction.user.id}`,
  );
  if (guild.ownerId === interaction.user.id) {
    console.log(`[validateServerAndRole] User is owner, validation passed`);
    return null; // Validation ผ่าน
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

  // ตรวจสอบบทบาทสำหรับ adminRoleId หรือ userRoleId
  if (roleCheck === 'admin' || roleCheck === 'user') {
    const roleIdToCheck = roleCheck === 'admin' ? server.adminRoleId : server.userRoleId;

    if (roleIdToCheck && member.roles.cache.has(roleIdToCheck)) {
      return null; // ผ่านการตรวจสอบบทบาท
    }
  }

  // หากไม่มีสิทธิ์
  const errorMessage =
    roleCheck === 'owner' || roleCheck === 'admin'
      ? '🔒 คำสั่งนี้สามารถใช้งานได้เฉพาะเจ้าของเซิร์ฟเวอร์หรือแอดมินเท่านั้น'
      : '🔒 คุณไม่มีสิทธิ์ในการใช้งานคำสั่งนี้ กรุณาติดต่อแอดมินหรือผู้ดูแลเซิร์ฟเวอร์';

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle('⛔ ข้อผิดพลาดในการเข้าถึง')
        .setDescription(errorMessage)
        .setColor(0xff0000), // สีแดง
    ],
    ephemeral: true,
  });
}

export async function validateServerOwner(interaction: any, serverRepository: ServerRepository) {
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

  // ดึงข้อมูลเซิร์ฟเวอร์จากฐานข้อมูล
  const server = await serverRepository.getServerById(guild.id);
  if (!server) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่พบการลงทะเบียนในระบบ')
          .setDescription(`เซิร์ฟเวอร์ "${guild.name}" ยังไม่ได้ลงทะเบียนในระบบ`)
          .setColor(0xff0000), // สีแดง
      ],
      ephemeral: true,
    });
  }

  // ตรวจสอบว่า user เป็นเจ้าของเซิร์ฟเวอร์หรือไม่
  if (guild.ownerId !== interaction.user.id) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⛔ ข้อผิดพลาดในการเข้าถึง')
          .setDescription('🔒 คำสั่งนี้สามารถใช้งานได้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้น')
          .setColor(0xff0000), // สีแดง
      ],
      ephemeral: true,
    });
  }

  // หากผ่านการตรวจสอบทั้งหมด
  return null; // Validation ผ่าน
}
