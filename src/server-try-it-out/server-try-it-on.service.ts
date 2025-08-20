import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder, ButtonInteraction } from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole, validateServerOwner } from 'src/utils/server-validation.util';

@Injectable()
export class ServerTryItOnService {
  private readonly logger = new Logger(ServerTryItOnService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}

  public onModuleInit() {
    this.logger.log('ServerTryItOn initialized');
  }

  // Handle the try-it-on system
  async ServerTryItOnSystem(interaction: any) {
    const validationError = await validateServerOwner(interaction, this.serverRepository);
    if (validationError) {
      return validationError; // Reply has already been handled
    }

    const serverId = interaction.guildId;

    try {
      // Fetch server information
      const server = await this.serverRepository.getServerById(serverId);

      if (!server) {
        return interaction.reply({
          content: '❌ ไม่พบข้อมูลเซิร์ฟเวอร์ โปรดตรวจสอบอีกครั้ง!',
          ephemeral: true,
        });
      }

      const now = new Date();
      if (server.openBot) {
        if (server.openUntilAt && now <= new Date(server.openUntilAt)) {
          const remainingDays = Math.ceil(
            (new Date(server.openUntilAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('📋 สถานะการใช้งาน Bot')
                .setDescription(
                  `Bot ได้เปิดใช้งานแล้ว และยังสามารถใช้งานได้อีก **${remainingDays} วัน**\n` +
                    `**วันหมดอายุ:** ${new Date(server.openUntilAt).toLocaleDateString()}`,
                )
                .setColor(0x00ff00),
            ],
            ephemeral: true,
          });
        }

        // Expired bot usage
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ การใช้งาน Bot หมดอายุแล้ว')
              .setDescription(
                'การใช้งาน Bot ของคุณหมดอายุแล้ว โปรดซื้อแพ็คเกจใหม่เพื่อเปิดใช้งานอีกครั้ง',
              )
              .setColor(0xff0000),
          ],
          ephemeral: true,
        });
      }

      // Activate bot usage for 30 days
      const openUntilAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await this.serverRepository.updateServer(serverId, {
        openBot: true,
        openUntilAt,
        updatedAt: now,
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ เปิดใช้งาน Bot สำเร็จ')
            .setDescription(
              `🎉 Bot ได้ถูกเปิดใช้งานแล้วและสามารถใช้งานได้จนถึง:\n` +
                `**วันหมดอายุ:** ${openUntilAt.toLocaleDateString()}`,
            )
            .setColor(0x00bfff),
        ],
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error(`Error handling try-it-on system: ${error.message}`);
      return interaction.reply({
        content: '❌ เกิดข้อผิดพลาดระหว่างการดำเนินการ โปรดลองอีกครั้ง',
        ephemeral: true,
      });
    }
  }
}
