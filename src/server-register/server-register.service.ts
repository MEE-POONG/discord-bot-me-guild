import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, Guild } from 'discord.js';
import { ServerRepository } from 'src/repository/server';

@Injectable()
export class ServerRegisterService {
  private readonly logger = new Logger(ServerRegisterService.name);

  constructor(private readonly serverRepository: ServerRepository) {}

  public onModuleInit() {
    this.logger.log('ServerRegister initialized');
  }

  async ServerRegisterSystem(interaction: any) {
    const guild = interaction.guild as Guild;

    if (!guild) {
      return this.replyWithError(interaction, '❌ ข้อผิดพลาดในการดึงข้อมูล', 'ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์จาก Discord ได้');
    }

    if (guild.ownerId !== interaction.user.id) {
      return this.replyWithError(
        interaction,
        '⛔ ข้อผิดพลาดในการเข้าถึง',
        '🔒 คำสั่งนี้สามารถใช้งานได้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้น'
      );
    }

    const { id: serverId, ownerId, name: serverName } = guild;

    try {
      const existingServer = await this.serverRepository.getServerById(serverId);

      if (existingServer) {
        return this.replyWithWarning(
          interaction,
          '⚠️ ข้อผิดพลาดในการลงทะเบียน',
          `📌 เซิร์ฟเวอร์ "${existingServer.serverName}" ได้ลงทะเบียนไว้แล้ว`
        );
      }

      const newServer = await this.serverRepository.ServerRegister(serverId, serverName, ownerId);

      if (newServer) {
        return this.replyWithSuccess(
          interaction,
          '✅ ลงทะเบียนสำเร็จ',
          `🎉 เซิร์ฟเวอร์ "${newServer.serverName}" ลงทะเบียนสำเร็จแล้ว`
        );
      }

      return this.replyWithError(
        interaction,
        '❌ ข้อผิดพลาดในการลงทะเบียน',
        `ไม่สามารถลงทะเบียน "${serverName}" DiscordServer ได้`
      );
    } catch (error) {
      this.logger.error('Error registering server:', error);
      return this.replyWithError(
        interaction,
        '⚠️ ข้อผิดพลาดที่ไม่คาดคิด',
        `🚨 เกิดข้อผิดพลาดในการลงทะเบียน "${serverName}" DiscordServer`
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
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color);
  }
}
