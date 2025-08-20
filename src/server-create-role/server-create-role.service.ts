import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  Guild,
  CacheType,
} from 'discord.js';
import { Context, StringSelect, StringSelectContext } from 'necord';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';
import { ServerCreateRoleNameDto } from './dto/length.dto';

@Injectable()
export class ServerCreateRoleService {
  private readonly logger = new Logger(ServerCreateRoleService.name);
  private roleName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}

  public onModuleInit() {
    this.logger.log('ServerCreateRoleService initialized');
  }

  // Step 1: Display Select Menu
  async ServerCreateRoleSystem(interaction: any, options: ServerCreateRoleNameDto) {
    this.roleName = options.rolename;

    const validationError = await validateServerAndRole(
      interaction,
      'owner',
      this.serverRepository,
    );
    if (validationError) return validationError;

    const server = await this.serverRepository.getServerById(interaction.guildId);
    if (!server) {
      return this.replyError(interaction, '❌ ไม่พบข้อมูลเซิร์ฟเวอร์ โปรดตรวจสอบอีกครั้ง!');
    }

    const roleSelectionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('SELECT_MENU_ROLE_TYPE')
        .setPlaceholder('เลือกประเภทบทบาทที่คุณต้องการจัดการ')
        .addOptions([
          {
            label: 'Admin Role',
            value: 'admin',
            description: 'บทบาทสำหรับผู้ดูแลเซิร์ฟเวอร์ (Admin)',
          },
          { label: 'User Role', value: 'user', description: 'บทบาทสำหรับผู้ใช้งานทั่วไป (User)' },
          { label: 'Head Role', value: 'head', description: 'บทบาทสำหรับหัวหน้ากลุ่ม (Head)' },
          { label: 'Co Role', value: 'co', description: 'บทบาทสำหรับผู้ช่วยกลุ่ม (Co)' },
        ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 เลือกบทบาทเซิร์ฟเวอร์ที่คุณต้องการสร้าง')
          .setDescription(
            `กรุณาเลือกประเภทบทบาทที่คุณต้องการจากรายการด้านล่าง:\n` +
              `- **Admin**: บทบาทสำหรับจัดการเซิร์ฟเวอร์\n` +
              `- **User**: บทบาทสำหรับสมาชิกทั่วไป\n` +
              `- **Visitor**: บทบาทสำหรับสมาชิกไม่ทางการ\n` +
              `- **Adventurer**: บทบาทสำหรับสมาชิกเป็นทางการ\n` +
              `- **Head**: บทบาทสำหรับหัวหน้ากลุ่ม\n` +
              `- **Co**: บทบาทสำหรับผู้ช่วยกลุ่ม`,
          )
          .setColor(0x00bfff),
      ],
      components: [roleSelectionRow],
      ephemeral: true,
    });
  }

  @StringSelect('SELECT_MENU_ROLE_TYPE')
  public async handleRoleRegistration(@Context() [interaction]: StringSelectContext) {
    const server = await this.serverRepository.getServerById(interaction.guildId);
    if (!server) return this.replyError(interaction, '❌ ไม่พบข้อมูลเซิร์ฟเวอร์');

    const newRole = await interaction.guild.roles.create({ name: this.roleName });
    const roleType = interaction.values[0];
    const roleFieldMapping = {
      admin: 'adminRoleId',
      user: 'userRoleId',
      adventurer: 'adventurerRoleId',
      visitor: 'visitorRoleId',
      head: 'guildHeadRoleId',
      co: 'guildCoRoleId',
    };

    if (server[roleFieldMapping[roleType]]) {
      return this.replyStopCreate(interaction, roleType);
    }

    try {
      await this.serverRepository.updateServer(newRole.guild.id, {
        [roleFieldMapping[roleType]]: newRole.id,
      });
      return this.replySuccess(interaction, roleType);
    } catch (error) {
      this.logger.error(`Error updating server role: ${error.message}`);
      return this.replyError(
        interaction,
        '❌ ไม่พบข้อมูลเซิร์ฟเวอร์ในระบบ โปรดตรวจสอบการตั้งค่าและลองใหม่อีกครั้ง!',
      );
    }
  }

  private replyStopCreate(interaction: StringSelectMenuInteraction<CacheType>, roleType: string) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่สามารถสร้างบทบาทได้')
          .setDescription(
            `บทบาท **${roleType.toUpperCase()}** มีอยู่แล้วในเซิร์ฟเวอร์นี้\n` +
              `หากคุณต้องการอัปเดตบทบาทนี้ โปรดใช้คำสั่ง \`/server-update-role\``,
          )
          .setColor(0xffa500),
      ],
      ephemeral: true,
    });
  }

  private replyError(interaction: any, message: string) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ เกิดข้อผิดพลาด')
          .setDescription(message)
          .setFooter({ text: 'โปรดติดต่อผู้ดูแลเซิร์ฟเวอร์หากปัญหายังคงอยู่' })
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  private replySuccess(interaction: StringSelectMenuInteraction<CacheType>, roleType: string) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ การสร้างบทบาทสำเร็จ')
          .setDescription(
            `🎉 บทบาท **${this.roleName}** สำหรับประเภท **${roleType.toUpperCase()}** ถูกสร้างและบันทึกเรียบร้อยแล้ว!`,
          )
          .setColor(0x00ff00),
      ],
      ephemeral: true,
    });
  }
}
