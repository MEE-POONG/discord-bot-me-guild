import { Injectable, Logger } from '@nestjs/common';
import { ChatInputCommandInteraction, CacheType } from 'discord.js';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkPermission(interaction: ChatInputCommandInteraction<CacheType>): Promise<boolean> {
    const startTime = Date.now();
    this.logger.log(`[DEBUG] Starting checkPermission - User: ${interaction.user.id}`);

    try {
      const result = await this.prisma.guildMembers.findFirst({
        where: {
          userId: interaction.user.id,
          position: 'Leader',
        },
      });

      this.logger.log(
        `[DEBUG] Permission check result: ${result ? 'GRANTED' : 'DENIED'} - User: ${interaction.user.id}, GuildId: ${result?.guildId || 'N/A'}`,
      );
      return !!result;
    } catch (error) {
      this.logger.error(
        `[DEBUG] Error checking permission - User: ${interaction.user.id}, Error: ${error.message}, Stack: ${error.stack}`,
      );
      return false;
    } finally {
      const endTime = Date.now();
      this.logger.log(
        `[DEBUG] checkPermission completed - User: ${interaction.user.id}, Duration: ${endTime - startTime}ms`,
      );
    }
  }
}
