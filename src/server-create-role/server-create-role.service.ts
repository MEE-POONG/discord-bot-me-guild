import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  Guild,
} from 'discord.js';
import { Context, Options, StringSelect, StringSelectContext } from 'necord';
import { GuildCreateDto } from 'src/guild-create/dto/length.dto';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';
import { ServerCreateRoleNameDto } from './dto/length.dto';

@Injectable()
export class ServerCreateRoleService {
  private readonly logger = new Logger(ServerCreateRoleService.name);
  private roleName;

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) { }

  public onModuleInit() {
    this.logger.log('ServerCreateRoleService initialized');
  }

  // Step 1: Display Select Menu
  async ServerCreateRoleSystem(interaction: any, options: ServerCreateRoleNameDto) {
    this.roleName = options.rolename;

    const roleCheck = 'owner'; // Only owners can access this command
    const validationError = await validateServerAndRole(interaction, roleCheck, this.serverRepository);
    if (validationError) {
      return validationError; // Reply has already been handled
    }
    const serverId = interaction.guildId;

    const server = await this.serverRepository.getServerById(serverId);

    if (!server) {
      return interaction.reply({
        content: '❌ ไม่พบข้อมูลเซิร์ฟเวอร์ โปรดตรวจสอบอีกครั้ง!',
        ephemeral: true,
      });
    }
    console.log(53, server);


    const roleSelectionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(

      new StringSelectMenuBuilder()
        .setCustomId('SELECT_MENU_ROLE_TYPE')
        .setPlaceholder('เลือกบทบาทที่ต้องการจัดการ')
        .addOptions([
          { label: 'Admin Role', value: 'admin', description: 'จัดการบทบาทสำหรับ Admin' },
          { label: 'User Role', value: 'user', description: 'จัดการบทบาทสำหรับ User' },
          { label: 'Head Role', value: 'head', description: 'จัดการบทบาทสำหรับ head' },
          { label: 'Co Role', value: 'co', description: 'จัดการบทบาทสำหรับ User' },
        ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 จัดการบทบาทเซิร์ฟเวอร์')
          .setDescription(
            `กรุณาเลือกบทบาทที่คุณต้องการสร้างหรือจัดการจากรายการด้านล่าง:\n\n` +
            `- Admin: สำหรับจัดการเซิร์ฟเวอร์\n` +
            `- User: สำหรับผู้ใช้งานทั่วไป\n` +
            `- Head: สำหรับหัวหน้ากลุ่ม\n` +
            `- Co: สำหรับผู้ช่วยหรือผู้ร่วมกลุ่ม`,
          )
          .setColor(0x00bfff), // สีฟ้า
      ],
      components: [roleSelectionRow],
      ephemeral: true,
    });
  }
  private async replyStopCreate(interaction) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่สามารถสร้างบทบาทใหม่ได้')
          .setDescription(
            `บทบาท **Admin** นี้มีอยู่แล้วในเซิร์ฟเวอร์\n` +
            `หากต้องการแก้ไขบทบาท โปรดใช้คำสั่ง \`/server-update-role\``,
          )
          .setColor(0xffa500), // สีส้ม
      ],
      ephemeral: true, // แสดงเฉพาะกับผู้ใช้ที่เรียกคำสั่ง
    });
  }

  @StringSelect('SELECT_MENU_ROLE_TYPE')
  public async handleRoleRegistration(@Context() [interaction]: StringSelectContext) {

    const serverId = interaction.guildId;
    const serverDB = await this.serverRepository.getServerById(serverId);

    const newRole = await interaction.guild.roles.create({ name: this.roleName });
    const isAdmin = interaction.values[0] === "admin";
    const isUser = interaction.values[0] === "user";
    const isHead = interaction.values[0] === "head";
    console.log(69, newRole.guild.id);
    console.log(69, newRole.id);
    if (isAdmin) {
      if (serverDB.adminRoleId) {
        return this.replyStopCreate(interaction);
      }
      try {

        await this.serverRepository.updateServer(newRole.guild.id, {
          adminRoleId: newRole.id
        });
        return this.replySuccess(interaction);
      } catch (error) {
        return this.replyError(interaction);

      }
    } else if (isUser) {
      if (serverDB.userRoleId) {
        return this.replyStopCreate(interaction);
      }
      try {
        await this.serverRepository.updateServer(newRole.guild.id, {
          userRoleId: newRole.id
        });
        return this.replySuccess(interaction);
      } catch (error) {
        return this.replyError(interaction);
      }
    } else if (isHead) {
      if (serverDB.guildHeadRoleId) {
        return this.replyStopCreate(interaction);
      }
      try {
        await this.serverRepository.updateServer(newRole.guild.id, {
          guildHeadRoleId: newRole.id
        });
        return this.replySuccess(interaction);
      } catch (error) {
        return this.replyError(interaction);
      }
    } else {
      if (serverDB.guildCoRoleId) {
        return this.replyStopCreate(interaction);
      }
      try {
        await this.serverRepository.updateServer(newRole.guild.id, {
          guildCoRoleId: newRole.id
        });
        return this.replySuccess(interaction);
      } catch (error) {
        return this.replyError(interaction);
      }
    }
  }
  private replyError(interaction) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ เกิดข้อผิดพลาด')
          .setDescription(
            `ไม่สามารถสร้างบทบาท **${this.roleName}** ของประเภท **${interaction.values[0]}** ได้\n` +
            `โปรดตรวจสอบสิทธิ์หรือข้อมูลเซิร์ฟเวอร์ และลองใหม่อีกครั้ง`,
          )
          .setColor(0xff0000), // สีแดง
      ],
      ephemeral: true,
    });
  }

  private replySuccess(interaction) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ การสร้างบทบาทสำเร็จ')
          .setDescription(
            `🎉 บทบาท **${this.roleName}** สำหรับประเภท **${interaction.values[0]}** ถูกสร้างและบันทึกเรียบร้อยแล้ว`,
          )
          .setColor(0x00ff00), // สีเขียว
      ],
      ephemeral: true,
    });
  }
}
