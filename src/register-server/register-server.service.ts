import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CacheType, ChatInputCommandInteraction, Guild, PermissionsBitField } from 'discord.js';
import { ServerRepository } from 'src/repository/server';

@Injectable()
export class RegisterServerService {
  private readonly logger = new Logger(RegisterServerService.name);
  constructor(private readonly prisma: PrismaClient, private readonly serverRepository: ServerRepository) { }

  async onModuleInit() {
    this.logger.log('ServerService initialized');
  }

  async registerServer(interaction: ChatInputCommandInteraction<CacheType>) {
    const guild = interaction.guild as Guild;

    if (!guild) {
      return interaction.reply({ content: 'ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้', ephemeral: true });
    }

    const member = guild.members.cache.get(interaction.user.id);
    if (!member) {
      return interaction.reply({ content: 'ไม่สามารถระบุข้อมูลสมาชิกในเซิร์ฟเวอร์ได้', ephemeral: true });
    }

    if (guild.ownerId !== interaction.user.id) {
      return interaction.reply({ content: 'คำสั่งนี้สามารถใช้งานได้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้น', ephemeral: true });
    }

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'คุณต้องเป็นผู้ดูแลระบบ (Admin) เพื่อใช้งานคำสั่งนี้', ephemeral: true });
    }

    const serverId = guild.id;
    const ownerId = guild.ownerId;
    const serverName = guild.name;

    try {
      await this.serverRepository.registerServer(serverId, serverName, ownerId, true);
      return interaction.reply({ content: `เซิร์ฟเวอร์ "${serverName}" ลงทะเบียนสำเร็จ!`, ephemeral: true });
    } catch (error) {
      console.error('Error registering server:', error);
      return interaction.reply({ content: 'เกิดข้อผิดพลาดในการลงทะเบียนเซิร์ฟเวอร์!', ephemeral: true });
    }
  }
}
