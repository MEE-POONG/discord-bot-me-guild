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
import { ServerUpdateRoleNameDto } from './dto/length.dto';

@Injectable()
export class ServerUpdateRoleService {
  private readonly logger = new Logger(ServerUpdateRoleService.name);
  private roleName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) { }

  public onModuleInit() {
    this.logger.log('ServerUpdateRoleService initialized');
  }

  // Step 1: Display Select Menu
  async ServerUpdateRoleSystem(interaction: any, options: ServerUpdateRoleNameDto) {
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
        .setCustomId('SELECT_MENU_ROLE_TYPE_UPDATE')
        .setPlaceholder('เลือกบทบาทที่ต้องการจัดการ')
        .addOptions([
          { label: 'Admin Role', value: 'admin', description: 'จัดการบทบาทสำหรับ Admin' },
          { label: 'User Role', value: 'user', description: 'จัดการบทบาทสำหรับ User' },
          { label: 'Head Role', value: 'head', description: 'จัดการบทบาทสำหรับ Head' },
          { label: 'Co Role', value: 'co', description: 'จัดการบทบาทสำหรับ Co' },
        ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 จัดการบทบาทเซิร์ฟเวอร์')
          .setDescription(
            `กรุณาเลือกบทบาทที่คุณต้องการสร้างหรือจัดการจากรายการด้านล่าง:\n` +
            `- Admin: สำหรับจัดการเซิร์ฟเวอร์\n` +
            `- User: สำหรับผู้ใช้งานทั่วไป\n` +
            `- Head: สำหรับหัวหน้ากลุ่ม\n` +
            `- Co: สำหรับผู้ช่วยหรือผู้ร่วมกลุ่ม`,
          )
          .setColor(0x00bfff),
      ],
      components: [roleSelectionRow],
      ephemeral: true,
    });
  }

  @StringSelect('SELECT_MENU_ROLE_TYPE_UPDATE')
  public async handleRoleRegistration(@Context() [interaction]: StringSelectContext) {
    const server = await this.serverRepository.getServerById(interaction.guildId);
    if (!server) return this.replyError(interaction, '❌ ไม่พบข้อมูลเซิร์ฟเวอร์');

    const newRole = await interaction.guild.roles.create({ name: this.roleName });
    const roleType = interaction.values[0];
    const roleFieldMapping = {
      admin: 'adminRoleId',
      user: 'userRoleId',
      head: 'guildHeadRoleId',
      co: 'guildCoRoleId',
    };
    
    await interaction.guild.roles.delete(server[roleFieldMapping[roleType]]);

    try {
      await this.serverRepository.updateServer(newRole.guild.id, {
        [roleFieldMapping[roleType]]: newRole.id,
      });
      return this.replySuccess(interaction, roleType);
    } catch (error) {
      this.logger.error(`Error updating server role: ${error.message}`);
      return this.replyError(interaction, '❌ เกิดข้อผิดพลาดระหว่างการสร้างบทบาท');
    }
  }

  private replyStopUpdate(interaction: StringSelectMenuInteraction<CacheType>, roleType: string) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่สามารถสร้างบทบาทใหม่ได้')
          .setDescription(
            `บทบาท **${roleType.toUpperCase()}** มีอยู่แล้วในเซิร์ฟเวอร์\n` +
            `หากต้องการแก้ไข โปรดใช้คำสั่ง \`/server-update-role\``,
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
            `🎉 บทบาท **${this.roleName}** สำหรับประเภท **${roleType.toUpperCase()}** ถูกสร้างและบันทึกเรียบร้อยแล้ว`,
          )
          .setColor(0x00ff00),
      ],
      ephemeral: true,
    });
  }
}
