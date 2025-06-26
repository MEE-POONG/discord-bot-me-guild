import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';
import { SlashCommand, SlashCommandContext } from 'necord';
import { EmbedBuilder, ApplicationCommandType } from 'discord.js';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

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
        .setDescription(`**จำนวนคำสั่งทั้งหมด: ${allCommands.size}**\n\nรายละเอียดคำสั่งทั้งหมดในระบบ:`)
        .setColor('#00ff00')
        .setTimestamp()
        .setFooter({ 
          text: `Bot: ${interaction.client.user?.username} | Server: ${interaction.guild?.name}`,
          iconURL: interaction.client.user?.displayAvatarURL()
        });

      // จัดกลุ่มคำสั่งตามหมวดหมู่
      const commandCategories = {
        '🛠️ ระบบจัดการ': [
          'server-register', 'server-create-role', 'server-update-role', 
          'server-clear', 'server-clear-role', 'server-set-room', 'server-try-it-on'
        ],
        '🎮 ระบบเกม': [
          'game-create-room', 'game-join', 'game-rank', 'game-type', 'form-game'
        ],
        '👥 ระบบกิลด์': [
          'guild-create', 'guild-invite', 'guild-kick', 'guild-manage'
        ],
        '📝 ระบบลงทะเบียน': [
          'form-register', 'prototype'
        ],
        '🎤 ระบบเสียง': [
          'voice-time', 'voice-time-range', 'voice-time-channel', 'stage-channel', 'busking'
        ],
        '💰 ระบบการเงิน': [
          'donate'
        ],
        '📰 ระบบข่าวสาร': [
          'blog-update', 'news-latest'
        ],
        '🔧 คำสั่งพื้นฐาน': [
          'ping', 'remove', 'health', 'test-welcome'
        ]
      };

      let fieldCount = 0;
      const maxFields = 25; // Discord embed limit

      for (const [category, commandNames] of Object.entries(commandCategories)) {
        if (fieldCount >= maxFields) break;

        const categoryCommands = [];
        for (const commandName of commandNames) {
          const command = allCommands.get(commandName);
          if (command) {
            const optionsText = command.options.length > 0 
              ? `\n└ ตัวเลือก: ${command.options.map(opt => `\`${opt.name}\``).join(', ')}`
              : '';
            categoryCommands.push(`**/${command.name}** - ${command.description}${optionsText}`);
          }
        }

        if (categoryCommands.length > 0) {
          embed.addFields({
            name: category,
            value: categoryCommands.join('\n'),
            inline: false
          });
          fieldCount++;
        }
      }

      // แสดงคำสั่งที่ไม่ได้จัดหมวดหมู่
      const categorizedCommands = Object.values(commandCategories).flat();
      const uncategorizedCommands = Array.from(allCommands.values())
        .filter(cmd => !categorizedCommands.includes(cmd.name));

      if (uncategorizedCommands.length > 0 && fieldCount < maxFields) {
        const uncategorizedList = uncategorizedCommands.map(cmd => {
          const optionsText = cmd.options.length > 0 
            ? `\n└ ตัวเลือก: ${cmd.options.map(opt => `\`${opt.name}\``).join(', ')}`
            : '';
          return `**/${cmd.name}** - ${cmd.description}${optionsText}`;
        });

        embed.addFields({
          name: '📋 คำสั่งอื่นๆ',
          value: uncategorizedList.join('\n'),
          inline: false
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
          { name: '💾 Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ 
        embeds: [embed, statsEmbed],
        content: '✅ ข้อมูลระบบพร้อมใช้งานแล้ว!'
      });

    } catch (error) {
      this.logger.error('Health command error:', error);
      await interaction.editReply({
        content: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลระบบ กรุณาลองใหม่อีกครั้ง',
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
