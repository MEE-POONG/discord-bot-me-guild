import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, Guild } from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class ServerclearRoleService {
  private readonly logger = new Logger(ServerclearRoleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}

  public onModuleInit() {
    this.logger.log('ServerclearRole initialized');
  }

  async ServerclearRoleSystem(interaction: any) {
    const roleCheck = 'admin'; // Required role for this command
    const validationError = await validateServerAndRole(
      interaction,
      roleCheck,
      this.serverRepository,
    );
    if (validationError) {
      return validationError; // Reply has already been handled
    }

    try {
      const guild: Guild = interaction.guild;

      if (!guild) {
        return interaction.reply({
          content: '❌ ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้',
          ephemeral: true,
        });
      }

      // ระบุ Role ที่ต้องการยกเว้น
      const excludeRoles = ['พระเจ้าผู้สร้าง', 'แท่นขอพร'];
      const roles = guild.roles.cache;

      // ตรวจสอบว่ามี Role หรือไม่
      if (roles.size === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ ไม่มี Role ให้ลบ')
              .setDescription('ไม่พบบทบาทในเซิร์ฟเวอร์ที่สามารถลบได้.')
              .setColor(0xff0000),
          ],
          ephemeral: true,
        });
      }

      // ลูปผ่าน Role ทั้งหมดในเซิร์ฟเวอร์
      for (const [roleId, role] of roles) {
        if (excludeRoles.includes(role.name)) {
          this.logger.log(`Skipped deleting role: ${role.name} (${roleId})`);
          continue; // ข้าม Role ที่ต้องการยกเว้น
        }

        // ลบ Role
        try {
          await role.delete(`Deleted by ${interaction.user.tag}`);
          this.logger.log(`Deleted role: ${role.name} (${roleId})`);
        } catch (deleteError) {
          this.logger.error(
            `❌ Failed to delete role: ${role.name} (${roleId}). Error: ${deleteError.message}`,
          );
        }
      }

      // ตอบกลับเมื่อสำเร็จ
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ ลบบทบาทสำเร็จ')
            .setDescription(
              `🎉 บทบาททั้งหมดในเซิร์ฟเวอร์ถูกลบเรียบร้อยแล้ว (ยกเว้นรายการที่ได้รับการยกเว้น)\n` +
                `- ยกเว้นบทบาท: "พระเจ้าผู้สร้าง", "แท่นขอพร"`,
            )
            .setColor(0x00ff00),
        ],
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error(`Error deleting roles: ${error.message}`);
      return interaction.reply({
        content: '❌ เกิดข้อผิดพลาดระหว่างการลบบทบาท กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }
}
