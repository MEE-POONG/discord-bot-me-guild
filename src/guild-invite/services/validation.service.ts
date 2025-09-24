import { Injectable, Logger } from '@nestjs/common';
import { ChatInputCommandInteraction, CacheType, GuildMember } from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { UserProfile } from 'src/guild-manage/guild-manage.service';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateInviteRequest(
    target: GuildMember,
    inviter: ChatInputCommandInteraction<CacheType>,
    targetProfile: UserProfile | null,
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    this.logger.log(
      `[DEBUG] Starting validation - Target: ${target.id}, Inviter: ${inviter.user.id}`,
    );

    try {
      // Check if user is trying to invite themselves
      const isSelf = target.id === inviter.user.id;
      if (isSelf) {
        this.logger.log(`[DEBUG] Self invite attempt - User: ${inviter.user.id}`);
        return {
          isValid: false,
          message: 'คุณไม่สามารถเชิญตัวเองได้',
        };
      }

      // Check if target is already in a guild
      this.logger.log(`[DEBUG] Checking if target is in guild - Target: ${target.id}`);
      const isInGuild = await this.prisma.guildMembers.findFirst({
        where: {
          userId: target.id,
        },
      });

      if (isInGuild) {
        this.logger.log(`[DEBUG] Target already in guild - Target: ${target.id}`);
        return {
          isValid: false,
          message: 'สมาชิกนี้มีกิลด์อยู่แล้ว',
        };
      }

      // Check if target has a profile
      if (!targetProfile) {
        this.logger.log(`[DEBUG] Target profile not found - Target: ${target.id}`);
        return {
          isValid: false,
          message: 'สมาชิกนี้ไม่มีข้อมูลนักผจญภัย',
        };
      }

      this.logger.log(
        `[DEBUG] Validation passed - Target: ${target.id}, Inviter: ${inviter.user.id}`,
      );
      return { isValid: true };
    } catch (error) {
      this.logger.error(
        `[DEBUG] Error during validation - Target: ${target.id}, Inviter: ${inviter.user.id}, Error: ${error.message}`,
      );
      return {
        isValid: false,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
      };
    } finally {
      const endTime = Date.now();
      this.logger.log(
        `[DEBUG] Validation completed - Target: ${target.id}, Inviter: ${inviter.user.id}, Duration: ${endTime - startTime}ms`,
      );
    }
  }
}
