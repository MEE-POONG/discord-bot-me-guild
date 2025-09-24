import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';
import { SlashCommand, SlashCommandContext } from 'necord';
import { EmbedBuilder } from 'discord.js';
import { ServerRepository } from './repository/server';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly serverRepository: ServerRepository,
  ) {}

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`app.service Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('messageCreate')
  public onMessageCreate(@Context() [message]: ContextOf<'messageCreate'>) {
    this.logger.log(message.content);
  }

  @SlashCommand({
    name: 'ping',
    description: 'Ping command!',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Pong JS NestJS !' });
  }

  @SlashCommand({
    name: 'remove',
    description: 'ลบคำสั่งทั้งหมดในกิลด์นี้',
  })
  public async onRemove(@Context() [interaction]: SlashCommandContext) {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({ content: '❌ ไม่พบ Guild ID', ephemeral: true });
    }

    // ลบเฉพาะ Guild Commands
    await interaction.client.application.commands.set([], guildId);

    return interaction.reply({
      content: '✅ ลบคำสั่งทั้งหมดในกิลด์นี้เรียบร้อยแล้ว!',
      ephemeral: true,
    });
  }

  @SlashCommand({
    name: 'health',
    description: 'แสดงคำสั่งทั้งหมดในระบบพร้อมรายละเอียด',
  })
  public async onHealth(@Context() [interaction]: SlashCommandContext) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const commands = await interaction.client.application.commands.fetch();
      const guildCommands = await interaction.guild?.commands.fetch();

      const allCommands = new Map();

      // รวม Global Commands
      commands.forEach((command) => {
        allCommands.set(command.name, {
          name: command.name,
          description: command.description,
          type: 'Global',
          options: command.options || [],
        });
      });

      // รวม Guild Commands
      guildCommands?.forEach((command) => {
        allCommands.set(command.name, {
          name: command.name,
          description: command.description,
          type: 'Guild',
          options: command.options || [],
        });
      });

      const embed = new EmbedBuilder()
        .setTitle('🏥 ระบบสุขภาพ Discord Bot')
        .setDescription(
          `**จำนวนคำสั่งทั้งหมด: ${allCommands.size}**\n\nรายละเอียดคำสั่งทั้งหมดในระบบ:`,
        )
        .setColor('#00ff00')
        .setTimestamp()
        .setFooter({
          text: `Bot: ${interaction.client.user?.username} | Server: ${interaction.guild?.name}`,
          iconURL: interaction.client.user?.displayAvatarURL(),
        });

      // จัดกลุ่มคำสั่งตามหมวดหมู่
      const commandCategories = {
        '🛠️ ระบบจัดการ': [
          'server-register',
          'server-create-role',
          'server-update-role',
          'server-clear',
          'server-clear-role',
          'server-set-room',
          'server-try-it-on',
        ],
        '🎮 ระบบเกม': ['game-create-room', 'game-join', 'game-rank', 'game-type', 'form-game'],
        '👥 ระบบกิลด์': ['guild-create', 'guild-invite', 'guild-kick', 'guild-manage'],
        '📝 ระบบลงทะเบียน': ['form-register', 'prototype'],
        '🎤 ระบบเสียง': [
          'voice-time',
          'voice-time-range',
          'voice-time-channel',
          'stage-channel',
          'busking',
        ],
        '💰 ระบบการเงิน': ['donate'],
        '📰 ระบบข่าวสาร': ['blog-update', 'news-latest'],
        '🔧 คำสั่งพื้นฐาน': [
          'ping',
          'remove',
          'health',
          'test-welcome',
          'check-expiry',
          'notify-admin',
        ],
      };

      let fieldCount = 0;
      const maxFields = 25; // Discord embed limit

      for (const [category, commandNames] of Object.entries(commandCategories)) {
        if (fieldCount >= maxFields) break;

        const categoryCommands = [];
        for (const commandName of commandNames) {
          const command = allCommands.get(commandName);
          if (command) {
            const optionsText =
              command.options.length > 0
                ? `\n└ ตัวเลือก: ${command.options.map((opt) => `\`${opt.name}\``).join(', ')}`
                : '';
            categoryCommands.push(`**/${command.name}** - ${command.description}${optionsText}`);
          }
        }

        if (categoryCommands.length > 0) {
          embed.addFields({
            name: category,
            value: categoryCommands.join('\n'),
            inline: false,
          });
          fieldCount++;
        }
      }

      // แสดงคำสั่งที่ไม่ได้จัดหมวดหมู่
      const categorizedCommands = Object.values(commandCategories).flat();
      const uncategorizedCommands = Array.from(allCommands.values()).filter(
        (cmd) => !categorizedCommands.includes(cmd.name),
      );

      if (uncategorizedCommands.length > 0 && fieldCount < maxFields) {
        const uncategorizedList = uncategorizedCommands.map((cmd) => {
          const optionsText =
            cmd.options.length > 0
              ? `\n└ ตัวเลือก: ${cmd.options.map((opt) => `\`${opt.name}\``).join(', ')}`
              : '';
          return `**/${cmd.name}** - ${cmd.description}${optionsText}`;
        });

        embed.addFields({
          name: '📋 คำสั่งอื่นๆ',
          value: uncategorizedList.join('\n'),
          inline: false,
        });
      }

      // เพิ่มข้อมูลสถิติ
      const statsEmbed = new EmbedBuilder()
        .setTitle('📊 สถิติระบบ')
        .setColor('#0099ff')
        .addFields(
          { name: '🤖 Bot Status', value: '🟢 Online', inline: true },
          { name: '📡 Ping', value: `${interaction.client.ws.ping}ms`, inline: true },
          { name: '🏠 Servers', value: `${interaction.client.guilds.cache.size}`, inline: true },
          { name: '👥 Users', value: `${interaction.client.users.cache.size}`, inline: true },
          { name: '⚡ Uptime', value: this.formatUptime(interaction.client.uptime), inline: true },
          {
            name: '💾 Memory',
            value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed, statsEmbed],
        content: '✅ ข้อมูลระบบพร้อมใช้งานแล้ว!',
      });
    } catch (error) {
      this.logger.error('Health command error:', error);
      await interaction.editReply({
        content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลระบบ กรุณาลองใหม่อีกครั้ง',
      });
    }
  }

  @SlashCommand({
    name: 'check-expiry',
    description: 'ตรวจสอบวันหมดอายุการใช้งานบอทของเซิร์ฟเวอร์นี้',
  })
  public async onCheckExpiry(@Context() [interaction]: SlashCommandContext) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      if (!guild) {
        return interaction.editReply({
          content: '❌ ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้',
        });
      }

      const server = await this.serverRepository.getServerById(guild.id);
      if (!server) {
        return interaction.editReply({
          content: '❌ ไม่พบข้อมูลเซิร์ฟเวอร์ในระบบ กรุณาลงทะเบียนก่อน',
        });
      }

      const now = new Date();
      const embed = new EmbedBuilder()
        .setTitle('⏰ ตรวจสอบวันหมดอายุ')
        .setColor('#0099ff')
        .addFields(
          { name: '🏠 เซิร์ฟเวอร์', value: server.serverName, inline: true },
          {
            name: '📅 สถานะการใช้งาน',
            value: server.openBot ? '🟢 เปิดใช้งาน' : '🔴 ปิดใช้งาน',
            inline: true,
          },
        );

      if (server.openUntilAt) {
        const expiryDate = new Date(server.openUntilAt);
        const timeDiff = expiryDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

        embed.addFields(
          { name: '📅 วันหมดอายุ', value: expiryDate.toLocaleDateString('th-TH'), inline: true },
          {
            name: '⏱️ เวลาที่เหลือ',
            value: daysLeft > 0 ? `${daysLeft} วัน` : '❌ หมดอายุแล้ว',
            inline: true,
          },
        );

        if (daysLeft <= 0) {
          embed.setColor('#ff0000');
          embed.setDescription('⚠️ **การใช้งานบอทหมดอายุแล้ว** กรุณาติดต่อแอดมินเพื่อขยายเวลา');
        } else if (daysLeft <= 7) {
          embed.setColor('#ff9900');
          embed.setDescription('⚠️ **การใช้งานบอทใกล้หมดอายุ** กรุณาเตรียมการต่ออายุ');
        } else {
          embed.setDescription('✅ **การใช้งานบอทยังคงใช้งานได้ปกติ**');
        }
      } else {
        embed.addFields(
          { name: '📅 วันหมดอายุ', value: 'ไม่ได้กำหนด', inline: true },
          { name: '⏱️ เวลาที่เหลือ', value: 'ไม่จำกัด', inline: true },
        );
        embed.setDescription('✅ **การใช้งานบอทไม่มีกำหนดหมดอายุ**');
      }

      embed.setTimestamp();
      embed.setFooter({
        text: `ตรวจสอบโดย ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.logger.error('Check expiry command error:', error);
      return interaction.editReply({
        content: '❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่อีกครั้ง',
      });
    }
  }

  @SlashCommand({
    name: 'notify-admin',
    description: 'แจ้งเตือนแอดมินเกี่ยวกับปัญหาหรือข้อสอบถาม',
  })
  public async onNotifyAdmin(@Context() [interaction]: SlashCommandContext) {
    try {
      const guild = interaction.guild;
      if (!guild) {
        return interaction.reply({
          content: '❌ ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้',
          ephemeral: true,
        });
      }

      const server = await this.serverRepository.getServerById(guild.id);
      if (!server) {
        return interaction.reply({
          content: '❌ ไม่พบข้อมูลเซิร์ฟเวอร์ในระบบ กรุณาลงทะเบียนก่อน',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('📞 ติดต่อแอดมิน')
        .setDescription(
          '**ช่องทางการติดต่อแอดมิน:**\n\n' +
            '🔗 **เว็บไซต์:** https://www.me-poong.com\n' +
            '📧 **อีเมล:** admin@me-poong.com\n' +
            '💬 **Discord:** สามารถแจ้งปัญหาใน DM ได้\n\n' +
            '**ข้อมูลเซิร์ฟเวอร์สำหรับการแจ้งปัญหา:**\n' +
            `📍 **ชื่อเซิร์ฟเวอร์:** ${guild.name}\n` +
            `🆔 **Server ID:** ${guild.id}\n` +
            `👤 **ผู้แจ้งปัญหา:** ${interaction.user.username} (${interaction.user.id})`,
        )
        .setColor('#0099ff')
        .setTimestamp()
        .setFooter({
          text: 'ME-POONG Bot Support',
          iconURL: interaction.client.user?.displayAvatarURL(),
        });

      // ส่งข้อความส่วนตัวให้ผู้ใช้
      await interaction.reply({ embeds: [embed], ephemeral: true });

      // ลองส่งข้อความแจ้งเตือนให้เจ้าของเซิร์ฟเวอร์
      try {
        const owner = await guild.fetchOwner();
        if (owner) {
          const ownerNotifyEmbed = new EmbedBuilder()
            .setTitle('🚨 มีการแจ้งปัญหาจากสมาชิก')
            .setDescription(
              `**สมาชิก ${interaction.user.username} ได้ใช้คำสั่ง notify-admin**\n\n` +
                `**เซิร์ฟเวอร์:** ${guild.name}\n` +
                `**ผู้แจ้ง:** ${interaction.user.tag} (${interaction.user.id})\n` +
                `**เวลา:** ${new Date().toLocaleString('th-TH')}`,
            )
            .setColor('#ff9900')
            .setTimestamp();

          await owner.send({ embeds: [ownerNotifyEmbed] });
        }
      } catch (dmError) {
        this.logger.warn('Could not send DM to server owner:', dmError.message);
        // ไม่แสดงข้อผิดพลาดนี้ให้ผู้ใช้เห็น เพราะเป็นเรื่องปกติที่ส่ง DM ไม่ได้
      }
    } catch (error) {
      this.logger.error('Notify admin command error:', error);
      return interaction.reply({
        content: '❌ เกิดข้อผิดพลาดในการแจ้งเตือน กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }

  private formatUptime(uptime: number): string {
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }
}
