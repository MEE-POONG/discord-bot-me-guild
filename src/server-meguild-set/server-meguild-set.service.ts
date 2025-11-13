import { Injectable, Logger } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import { Button, ButtonContext, Context } from 'necord';
import { ServerRepository } from 'src/repository/server';

@Injectable()
export class ServerMeguildSetService {
  private readonly logger = new Logger(ServerMeguildSetService.name);

  constructor(private readonly serverRepository: ServerRepository) { }

  public onModuleInit() {
    this.logger.log('ServerMeguildSet initialized');
  }

  async ServerMeguildSetSystem(interaction: any) {
    const guild = interaction.guild as Guild;

    if (!guild) {
      return this.replyWithError(
        interaction,
        '❌ ข้อผิดพลาดในการดึงข้อมูล',
        'ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์จาก Discord ได้',
      );
    }

    if (guild.ownerId !== interaction.user.id) {
      return this.replyWithError(
        interaction,
        '⛔ ข้อผิดพลาดในการเข้าถึง',
        '🔒 คำสั่งนี้สามารถใช้งานได้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้น',
      );
    }

    try {
      this.logger.debug(`[ServerMeguildSetSystem] Checking for existing me-guild-set-server channel`);
      const channels = guild.channels.cache;

      // ตรวจสอบว่ามีห้อง me-guild-set-server อยู่แล้วหรือไม่
      let meguildChannel = channels.find(
        (channel) => channel.name === 'me-guild-set-server' && channel.isTextBased(),
      );

      if (meguildChannel) {
        this.logger.debug(
          `[ServerMeguildSetSystem] me-guild-set-server channel already exists: ${meguildChannel.id}`,
        );
        return this.replyWithWarning(
          interaction,
          'ℹ️ ห้องมีอยู่แล้ว',
          `ห้อง "me-guild-set-server" มีอยู่แล้วในเซิร์ฟเวอร์\n📍 <#${meguildChannel.id}>`,
        );
      }

      // สร้างห้อง me-guild-set-server ใหม่
      this.logger.debug(`[ServerMeguildSetSystem] Creating me-guild-set-server channel`);
      meguildChannel = await guild.channels.create({
        name: 'me-guild-set-server',
        type: 0, // Text channel
        reason: `Created by ${interaction.user.tag} using /server-meguild-set command`,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone role
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id, // Channel creator (server owner)
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
            ],
          },
        ],
      });

      this.logger.log(
        `[ServerMeguildSetSystem] Created channel: ${meguildChannel.name} (${meguildChannel.id})`,
      );

      // ส่งข้อความพร้อมปุ่มคำสั่งต่างๆ ลงในห้องที่สร้าง
      await this.createSetupMessage(meguildChannel as TextChannel);

      return this.replyWithSuccess(
        interaction,
        '✅ สร้างห้องสำเร็จ',
        `🎉 ห้อง "me-guild-set-server" ถูกสร้างเรียบร้อยแล้ว\n📍 <#${meguildChannel.id}>\n\n🔒 เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้นที่สามารถเห็นห้องนี้`,
      );
    } catch (error) {
      this.logger.error('Error creating me-guild-set-server channel:', error);
      return this.replyWithError(
        interaction,
        '⚠️ ข้อผิดพลาดที่ไม่คาดคิด',
        `🚨 เกิดข้อผิดพลาดในการสร้างห้อง "me-guild-set-server"`,
      );
    }
  }

  private replyWithError(interaction: any, title: string, description: string) {
    return interaction.reply({
      embeds: [this.createEmbed(title, description, 0xff0000)],
      ephemeral: true,
    });
  }

  private replyWithWarning(interaction: any, title: string, description: string) {
    return interaction.reply({
      embeds: [this.createEmbed(title, description, 0xffa500)],
      ephemeral: true,
    });
  }

  private replyWithSuccess(interaction: any, title: string, description: string) {
    return interaction.reply({
      embeds: [this.createEmbed(title, description, 0x00ff00)],
      ephemeral: true,
    });
  }

  private createEmbed(title: string, description: string, color: number) {
    return new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);
  }

  private async createSetupMessage(channel: TextChannel) {
    const embed = new EmbedBuilder()
      .setTitle('🎮 ตั้งค่าเซิร์ฟเวอร์ MeGuildBot')
      .setDescription(
        '**ยินดีต้อนรับสู่ระบบจัดการเซิร์ฟเวอร์!**\n\n' +
        '✨ เริ่มต้นด้วยการลงทะเบียนเซิร์ฟเวอร์ของคุณ!',
      )
      .setColor(0x5865f2)
      .setImage('https://imagedelivery.net/QZ6TuL-3r02W7wQjQrv5DA/d9240c0b-83cc-4ab7-20e7-a6ea93621b00/700')
      .setFooter({ text: '🔒 เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้นที่สามารถใช้คำสั่งเหล่านี้ได้' })
      .setTimestamp();

    // สร้างปุ่มแถวที่ 1 (คำสั่งหลัก)
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('server-register')
        .setLabel('ลงทะเบียนเซิร์ฟเวอร์')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('server-code')
        .setLabel('กรอก Code แพ็คเกจ')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Success),

    );

    // สร้างปุ่มแถวที่ 2 (คำสั่งจัดการ)
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('server-set-room')
        .setLabel(`MeGuild Channel สร้างห้องกิจกรรม`)
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Primary),
    );

    // สร้างปุ่มแถวที่ 3 (คำสั่งเพิ่มเติม)
    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('server-clear')
        .setLabel('ล้างห้อง')
        .setEmoji('⭐')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('server-clear-role')
        .setLabel('ล้าง Roles')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );

    return channel.send({ embeds: [embed], components: [row1, row2, row3] });
  }

  // Button Handlers สำหรับปุ่มคำสั่งต่างๆ

  @Button('server-clear')
  public async handleServerClearButton(@Context() [interaction]: ButtonContext) {
    this.logger.debug('server-clear button clicked');
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⭐ ล้างห้องในเซิร์ฟเวอร์')
          .setDescription(
            '🔧 **กรุณาใช้คำสั่ง:** `/server-clear`\n\n' +
            '⚠️ **คำเตือน:** คำสั่งนี้จะ:\n' +
            '• ลบห้องทั้งหมดในเซิร์ฟเวอร์ (ยกเว้นห้องพิเศษ)\n' +
            '• สร้างห้อง me-guild-set-server ใหม่\n' +
            '• ไม่สามารถย้อนกลับได้',
          )
          .setColor(0xff0000)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }

  @Button('server-clear-role')
  public async handleServerClearRoleButton(@Context() [interaction]: ButtonContext) {
    this.logger.debug('server-clear-role button clicked');
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🗑️ ล้าง Roles')
          .setDescription(
            '🔧 **กรุณาใช้คำสั่ง:** `/server-clear-role`\n\n' +
            '⚠️ **คำเตือน:** คำสั่งนี้จะ:\n' +
            '• ลบ roles ทั้งหมด (ยกเว้น roles พิเศษ)\n' +
            '• ไม่สามารถย้อนกลับได้\n' +
            '• อาจส่งผลต่อสิทธิ์ของสมาชิก',
          )
          .setColor(0xff0000)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }

  @Button('server-create-role')
  public async handleServerCreateRoleButton(@Context() [interaction]: ButtonContext) {
    this.logger.debug('server-create-role button clicked');
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('➕ สร้าง Roles')
          .setDescription(
            '🔧 **กรุณาใช้คำสั่ง:** `/server-create-role`\n\n' +
            '📋 คำสั่งนี้จะช่วยคุณ:\n' +
            '• สร้าง roles ใหม่สำหรับเซิร์ฟเวอร์\n' +
            '• กำหนดสิทธิ์และสีของ roles\n' +
            '• จัดระเบียบสมาชิก',
          )
          .setColor(0x5865f2)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }

  @Button('server-update-role')
  public async handleServerUpdateRoleButton(@Context() [interaction]: ButtonContext) {
    this.logger.debug('server-update-role button clicked');
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🔄 อัปเดต Roles')
          .setDescription(
            '🔧 **กรุณาใช้คำสั่ง:** `/server-update-role`\n\n' +
            '📋 คำสั่งนี้จะช่วยคุณ:\n' +
            '• แก้ไข roles ที่มีอยู่\n' +
            '• เปลี่ยนสิทธิ์และสีของ roles\n' +
            '• ปรับปรุงโครงสร้างสมาชิก',
          )
          .setColor(0x5865f2)
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }
}
