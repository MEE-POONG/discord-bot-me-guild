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
import { Button, ButtonContext, Context, Modal, ModalContext } from 'necord';
import { ServerRepository } from 'src/repository/server';
import { PrismaService } from 'src/prisma.service';
import { ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

@Injectable()
export class ServerMeguildSetService {
  private readonly logger = new Logger(ServerMeguildSetService.name);

  constructor(
    private readonly serverRepository: ServerRepository,
    private readonly prisma: PrismaService,
  ) { }

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
      this.logger.debug(`[ServerMeguildSetSystem] Checking for existing 🕍︰me-guild-center channel`);
      const channels = guild.channels.cache;

      // ตรวจสอบว่ามีห้อง 🕍︰me-guild-center อยู่แล้วหรือไม่
      let meguildChannel = channels.find(
        (channel) => channel.name === '🕍︰me-guild-center' && channel.isTextBased(),
      );

      if (meguildChannel) {
        this.logger.debug(
          `[ServerMeguildSetSystem] 🕍︰me-guild-center channel already exists: ${meguildChannel.id}`,
        );
        return this.replyWithWarning(
          interaction,
          'ℹ️ ห้องมีอยู่แล้ว',
          `ห้อง "🕍︰me-guild-center" มีอยู่แล้วในเซิร์ฟเวอร์\n📍 <#${meguildChannel.id}>`,
        );
      }

      // สร้างห้อง 🕍︰me-guild-center ใหม่
      meguildChannel = await this.createSystemChannel(guild, interaction.user);
      if (meguildChannel) {
        return this.replyWithSuccess(
          interaction,
          '✅ สร้างห้องสำเร็จ',
          `🎉 ห้อง "🕍︰me-guild-center" ถูกสร้างเรียบร้อยแล้ว\n📍 <#${meguildChannel.id}>\n\n🔒 เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้นที่สามารถเห็นห้องนี้`,
        );
      }
    } catch (error) {
      this.logger.error('Error creating 🕍︰me-guild-center channel:', error);

      // Check if it's a permission error
      if (error.message && error.message.includes('missing required permissions')) {
        return this.replyWithError(
          interaction,
          '⚠️ ขาดสิทธิ์ในการสร้างห้อง',
          `🚨 Bot ไม่มีสิทธิ์ที่จำเป็นในการสร้างห้อง\n\n` +
          `**วิธีแก้ไข:**\n` +
          `1. ไปที่ Server Settings > Roles\n` +
          `2. เลือก Role ของ Bot\n` +
          `3. เปิดสิทธิ์ "Manage Channels", "View Channels", และ "Send Messages"\n` +
          `4. บันทึกการเปลี่ยนแปลง\n` +
          `5. ลองใช้คำสั่งอีกครั้ง\n\n` +
          `📋 **รายละเอียด:** ${error.message}`,
        );
      }

      return this.replyWithError(
        interaction,
        '⚠️ ข้อผิดพลาดที่ไม่คาดคิด',
        `🚨 เกิดข้อผิดพลาดในการสร้างห้อง "🕍︰me-guild-center"`,
      );
    }
  }

  public async createSystemChannel(guild: Guild, user: any) {
    this.logger.debug(`[ServerMeguildSetSystem] Creating 🕍︰me-guild-center channel`);

    // Check if bot has required permissions
    const botMember = await guild.members.fetchMe();
    const requiredPermissions = [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
    ];

    const missingPermissions = requiredPermissions.filter(
      (perm) => !botMember.permissions.has(perm)
    );

    if (missingPermissions.length > 0) {
      const permissionNames = missingPermissions.map(perm => {
        if (perm === PermissionFlagsBits.ManageChannels) return 'Manage Channels';
        if (perm === PermissionFlagsBits.ViewChannel) return 'View Channels';
        if (perm === PermissionFlagsBits.SendMessages) return 'Send Messages';
        return 'Unknown';
      });

      const errorMsg = `Bot is missing required permissions: ${permissionNames.join(', ')}. Please grant these permissions to the bot role in Server Settings > Roles.`;
      this.logger.error(`[ServerMeguildSetSystem] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const userTag = user?.tag ?? user?.username ?? 'UnknownUser';
    const userId = user?.id ?? guild.ownerId; // fallback เป็น owner ถ้าไม่มี user

    const meguildChannel = await guild.channels.create({
      name: '🕍︰me-guild-center',
      type: 0, // Text channel
      reason: `Created by ${userTag} using /server-meguild-set command`,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone role
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: userId, // Channel creator (server owner)
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

    await this.createSetupMessage(meguildChannel as TextChannel);
    return meguildChannel;
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
        .setLabel('ล้างเซิฟเวอร์')
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
            '• สร้างห้อง 🕍︰me-guild-center ใหม่\n' +
            '• ไม่สามารถย้อนกลับได้',
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
  @Button('server-code')
  public async handleServerCodeButton(@Context() [interaction]: ButtonContext) {
    this.logger.debug('server-code button clicked');

    const modal = new ModalBuilder()
      .setCustomId('PACKAGE_CODE_MODAL')
      .setTitle('กรอก Code แพ็คเกจ');

    const codeInput = new TextInputBuilder()
      .setCustomId('package_code_input')
      .setLabel('รหัสโค้ด')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('กรอกโค้ดที่ได้รับมา')
      .setRequired(true);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  @Modal('PACKAGE_CODE_MODAL')
  public async handlePackageCodeModal(@Context() [interaction]: ModalContext) {
    const code = interaction.fields.getTextInputValue('package_code_input');
    this.logger.debug(`Checking package code: ${code}`);

    const packageCode = await this.prisma.packageCodeDB.findUnique({
      where: { code },
    });

    if (!packageCode) {
      return interaction.reply({
        content: '❌ โค้ดไม่ถูกต้อง',
        ephemeral: true,
      });
    }

    if (packageCode.isUsed) {
      return interaction.reply({
        content: '❌ โค้ดนี้ถูกใช้งานไปแล้ว',
        ephemeral: true,
      });
    }

    // Update server expiration
    const server = await this.serverRepository.getServerById(interaction.guildId);
    if (!server) {
      return interaction.reply({
        content: '❌ ไม่พบข้อมูลเซิร์ฟเวอร์',
        ephemeral: true
      });
    }

    const currentExpire = server.openUntilAt ? new Date(server.openUntilAt) : new Date();
    const now = new Date();
    const baseDate = currentExpire > now ? currentExpire : now;

    const newExpire = new Date(baseDate);
    newExpire.setDate(newExpire.getDate() + packageCode.days);

    await this.prisma.$transaction([
      this.prisma.serverDB.update({
        where: { serverId: interaction.guildId },
        data: { openUntilAt: newExpire }
      }),
      this.prisma.packageCodeDB.update({
        where: { id: packageCode.id },
        data: {
          isUsed: true,
          usedBy: interaction.guildId,
          usedAt: new Date()
        }
      })
    ]);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ เติมแพ็คเกจสำเร็จ')
          .setDescription(`คุณได้รับวันใช้งานเพิ่ม ${packageCode.days} วัน\n📅 หมดอายุวันที่: ${newExpire.toLocaleDateString('th-TH')}`)
          .setColor(0x00ff00)
      ],
      ephemeral: true
    });
  }
}
