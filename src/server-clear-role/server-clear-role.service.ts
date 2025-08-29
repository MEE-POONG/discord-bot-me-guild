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
        return interaction.editReply({
          content: '❌ ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้',
        });
      }

      // ระบุ Role ที่ต้องการยกเว้น (รวม @everyone role)
      const excludeRoles = ['พระเจ้าผู้สร้าง', 'แท่นขอพร', '@everyone'];
      const roles = guild.roles.cache;

      // ตรวจสอบว่ามี Role หรือไม่
      if (roles.size === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ ไม่มี Role ให้ลบ')
              .setDescription('ไม่พบบทบาทในเซิร์ฟเวอร์ที่สามารถลบได้.')
              .setColor(0xff0000),
          ],
        });
      }

      // ลูปผ่าน Role ทั้งหมดในเซิร์ฟเวอร์
      for (const [roleId, role] of roles) {
        // ข้าม @everyone role และ role ที่ยกเว้น
        if (role.name === '@everyone' || excludeRoles.includes(role.name)) {
          this.logger.log(`Skipped deleting role: ${role.name} (${roleId})`);
          continue; // ข้าม Role ที่ต้องการยกเว้น
        }

        // ตรวจสอบว่า role สามารถลบได้หรือไม่
        if (role.managed || role.id === guild.id) {
          this.logger.log(`Skipped deleting managed/system role: ${role.name} (${roleId})`);
          continue;
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
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ ลบบทบาทสำเร็จ')
            .setDescription(
              `🎉 บทบาททั้งหมดในเซิร์ฟเวอร์ถูกลบเรียบร้อยแล้ว (ยกเว้นรายการที่ได้รับการยกเว้น)\n` +
                `- ยกเว้นบทบาท: "พระเจ้าผู้สร้าง", "แท่นขอพร", "@everyone"`,
            )
            .setColor(0x00ff00),
        ],
      });
    } catch (error) {
      this.logger.error(`Error deleting roles: ${error.message}`);
      return interaction.editReply({
        content: '❌ เกิดข้อผิดพลาดระหว่างการลบบทบาท กรุณาลองใหม่อีกครั้ง',
      });
    }
  }
}
