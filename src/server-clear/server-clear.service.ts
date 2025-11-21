import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  CacheType,
  Guild,
  PermissionFlagsBits,
} from 'discord.js';
import { ServerRepository } from 'src/repository/server';
import { PrismaService } from 'src/prisma.service';
import { validateServerAndRole } from 'src/utils/server-validation.util';
import { StringSelect, StringSelectContext, Context } from 'necord';
import { ServerMeguildSetService } from '@/server-meguild-set/server-meguild-set.service';

@Injectable()
export class ServerClearService {
  private readonly logger = new Logger(ServerClearService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
    private readonly serverMeguildSetService: ServerMeguildSetService, // 👈 เพิ่มตรงนี้
  ) { }

  public onModuleInit() {
    this.logger.log('ServerClear initialized');
  }

  // -------------------------------------------------------------
  // เมนูเริ่มต้นเลือกการล้าง
  // -------------------------------------------------------------
  async ServerClearSystem(interaction: any) {
    const roleCheck = 'admin';

    const validationError = await validateServerAndRole(
      interaction,
      roleCheck,
      this.serverRepository,
    );

    if (validationError) {
      return this.replyError(interaction, '⛔ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้');
    }

    const guild: Guild = interaction.guild;
    if (!guild) return this.replyError(interaction, '❌ ไม่พบเซิร์ฟเวอร์');

    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('SELECT_CLEAR')
        .setPlaceholder('เลือกหัวข้อการล้างเซิร์ฟเวอร์')
        .addOptions([
          {
            label: '🧨 ล้างห้อง + ลบบทบาท (ทั้งหมด)',
            value: 'all',
            description: 'ล้างทุกอย่าง (ไม่รวมระบบที่ยกเว้น)',
            emoji: '🧨',
          },
          {
            label: '🧹 ล้างห้องทั้งหมด',
            value: 'channel',
            description: 'ลบห้องทั้งหมด ยกเว้นที่ระบบยกเว้นให้',
            emoji: '🧹',
          },
          {
            label: '🗑️ ลบบทบาททั้งหมด',
            value: 'role',
            description: 'ลบบทบาททั้งหมด ยกเว้นที่ระบบยกเว้นให้',
            emoji: '🗑️',
          },
        ]),
    );

    const embed = new EmbedBuilder()
      .setTitle('🧹✨【 ระบบล้างเซิร์ฟเวอร์ MeGuild 】✨🧹')
      .setDescription(
        [
          'กรุณาเลือกประเภทการล้างด้านล่าง:',
          '',
          '• 🧨 ล้างห้อง + ลบบทบาท (ทั้งหมด)',
          '• 🧹 ล้างห้องทั้งหมด',
          '• 🗑️ ลบบทบาททั้งหมด',
          '',
          '⚠️ **คำเตือน:** การล้างไม่สามารถย้อนกลับได้',
          '⏰ ข้อความนี้จะหายไปอัตโนมัติใน 40 วินาที',
        ].join('\n'),
      )
      .setColor(0x3498db);

    const reply = await interaction.reply({
      embeds: [embed],
      components: [selectMenu],
      ephemeral: true,
      fetchReply: true,
    });

    setTimeout(() => reply.delete().catch(() => null), 40_000);
  }

  // -------------------------------------------------------------
  // Handler เลือกเมนูล้าง
  // -------------------------------------------------------------
  @StringSelect('SELECT_CLEAR')
  async handlePackageMenu(@Context() [interaction]: StringSelectContext) {
    const selected = interaction.values[0];
    const guild: Guild = interaction.guild;

    if (!guild) return this.replyError(interaction, '❌ ไม่พบเซิร์ฟเวอร์');

    // ตรวจสอบสิทธิ์อีกครั้ง
    const validationError = await validateServerAndRole(
      interaction,
      'admin',
      this.serverRepository,
    );
    if (validationError) return this.replyError(interaction, '⛔ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้');

    // ต้องเป็นเจ้าของเซิร์ฟเวอร์เท่านั้น
    if (guild.ownerId !== interaction.user.id) {
      return this.replyError(
        interaction,
        '🔒 เฉพาะ **เจ้าของเซิร์ฟเวอร์** เท่านั้นที่สามารถล้างเซิร์ฟเวอร์ได้',
      );
    }

    // เลือกประเภทล้าง
    if (selected === 'all') {
      const ch = await this.clearChannelCore(guild, interaction.user);
      const rl = await this.clearRoleCore(guild, interaction.user.tag);

      const reply = await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('🧨 ล้างเซิร์ฟเวอร์เรียบร้อยแล้ว (ครบชุด)')
            .setDescription(
              [
                `🧹 **ล้างห้อง**: ลบไปแล้ว \`${ch.deletedCount}\` ห้อง`,
                `• ยกเว้น: ${ch.excludeChannels.join(', ')}`,
                ch.createdMeGuild ? '• สร้างห้อง 🕍︰me-guild-set-server ใหม่' : '',
                '',
                `🗑️ **ลบบทบาท**: ลบไปแล้ว \`${rl.deletedCount}\` บทบาท`,
                `• ยกเว้น: ${rl.excludeRoles.join(', ')}`,
              ]
                .filter(Boolean)
                .join('\n'),
            )
            .setColor(0x2ecc71),
        ],
        components: [],
      });

      setTimeout(() => reply.delete().catch(() => null), 30_000);
      return reply;
    }

    if (selected === 'channel') {
      const result = await this.clearChannelCore(guild, interaction.user);

      const reply = await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('🧹 เคลียร์ห้องสำเร็จ')
            .setDescription(
              [
                `ลบห้องทั้งหมดแล้ว: \`${result.deletedCount}\` ห้อง`,
                `ยกเว้น: ${result.excludeChannels.join(', ')}`,
                result.createdMeGuild
                  ? 'ห้อง **🕍︰me-guild-set-server** ถูกสร้างใหม่'
                  : 'ห้อง **🕍︰me-guild-set-server** ถูกคงไว้',
              ].join('\n'),
            )
            .setColor(0x2ecc71),
        ],
        components: [],
      });

      // 🔥 ตั้งเวลาให้ข้อความลบตัวเองภายใน 30 วินาที
      setTimeout(() => reply.delete().catch(() => null), 30_000);

      return reply;
    }

    if (selected === 'role') {
      const result = await this.clearRoleCore(guild, interaction.user.tag);

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('🗑️ ลบบทบาทสำเร็จ')
            .setDescription(
              [
                `ลบบทบาทไปแล้ว \`${result.deletedCount}\` บทบาท`,
                `ยกเว้น: ${result.excludeRoles.join(', ')}`,
              ].join('\n'),
            )
            .setColor(0x2ecc71),
        ],
        components: [],
      });
    }

    // ถ้า value ไม่ตรง
    return this.replyError(interaction, '❌ ไม่พบตัวเลือกที่ระบุ');
  }

  // -------------------------------------------------------------
  // Core: ล้างห้อง
  // -------------------------------------------------------------
  // เดิม
  // private async clearChannelCore(guild: Guild, userTag: string) {

  private async clearChannelCore(guild: Guild, user: any) {
    const excludeChannels = ['🕍︰me-guild-set-server', 'rules', 'moderator-only'];
    const channels = guild.channels.cache;
    let deletedCount = 0;

    let meguildChannel = channels.find(
      (c) => c.name === '🕍︰me-guild-set-server' && c.isTextBased(),
    );

    for (const [id, channel] of channels) {
      if (excludeChannels.includes(channel.name)) continue;

      try {
        // ใช้ชื่อแท็กใน reason
        const userTag = user?.tag ?? user?.username ?? 'UnknownUser';
        await channel.delete(`Deleted by ${userTag}`);
        deletedCount++;
      } catch (err) {
        this.logger.error(`Delete channel failed: ${channel.name}`, err);
      }
    }

    let createdMeGuild = false;

    if (!meguildChannel) {
      // ✅ เรียกใช้ service กลางให้สร้างห้อง + ส่ง setup message
      meguildChannel = await this.serverMeguildSetService.createSystemChannel(guild, user);
      createdMeGuild = true;
    }

    return { deletedCount, excludeChannels, createdMeGuild };
  }


  // -------------------------------------------------------------
  // Core: ลบบทบาท
  // -------------------------------------------------------------
  private async clearRoleCore(guild: Guild, userTag: string) {
    const excludeRoles = ['พระเจ้าผู้สร้าง', 'แท่นขอพร', '@everyone'];
    const roles = guild.roles.cache;
    let deletedCount = 0;

    for (const [id, role] of roles) {
      if (excludeRoles.includes(role.name)) continue;
      if (role.managed) continue; // เป็น system role
      if (role.name === '@everyone') continue;

      try {
        await role.delete(`Deleted by ${userTag}`);
        deletedCount++;
      } catch (err) {
        this.logger.error(`Delete role failed: ${role.name}`, err);
      }
    }

    return { deletedCount, excludeRoles };
  }

  // -------------------------------------------------------------
  // replyError ให้เรียกใช้แบบเดียวทุกที่
  // -------------------------------------------------------------
  private async replyError(interaction: any, message: string) {
    const reply = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ เกิดข้อผิดพลาด')
          .setDescription(message)
          .setColor(0xff0000),
      ],
      ephemeral: false, // 👈 เปลี่ยนเป็น false เพื่อลบได้
    });

    setTimeout(() => reply.delete().catch(() => null), 30_000);

    return reply;
  }
}
