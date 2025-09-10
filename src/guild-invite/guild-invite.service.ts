import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  ButtonInteraction,
  CacheType,
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js';
import { InviteRequestDto } from './dto/invite-request.dto';
import { Button, ButtonContext, Context } from 'necord';
import { PermissionService } from './services/permission.service';
import { ProfileService } from './services/profile.service';
import { ValidationService } from './services/validation.service';
import { InviteService } from './services/invite.service';
import { NotificationService } from './services/notification.service';
import { ButtonFactory } from './factories/button.factory';
import { InviteResponseDto } from './dto/invite-response.dto';
import { ButtonInteractionDto } from './dto/button-interaction.dto';

@Injectable()
export class GuildInviteService implements OnModuleInit {
  private readonly logger = new Logger(GuildInviteService.name);

  constructor(
    private readonly permissionService: PermissionService,
    private readonly profileService: ProfileService,
    private readonly validationService: ValidationService,
    private readonly inviteService: InviteService,
    private readonly notificationService: NotificationService,
  ) {}
  public async onModuleInit() {
    this.logger.log('GuildInviteService initialized');
  }

  private async handleInteractionError(interaction: ChatInputCommandInteraction<CacheType>, error: Error): Promise<void> {
    this.logger.error(`[DEBUG] Interaction error - User: ${interaction.user.id}, Error: ${error.message}`);
    
    if (error.message.includes('Unknown interaction') || error.message.includes('10062')) {
      this.logger.error(`[DEBUG] Interaction expired - User: ${interaction.user.id}`);
      return;
    }
    throw error;
  }

  private async sendResponse(interaction: ChatInputCommandInteraction<CacheType>, message: string): Promise<void> {
    try {
      await interaction.editReply({ content: message });
    } catch (error) {
      this.logger.error(`[DEBUG] Failed to send response - User: ${interaction.user.id}, Error: ${error.message}`);
    }
  }

  private findInviteIdByUserId(userId: string): string | null {
    for (const [inviteId, data] of this.inviteService.getAllInviteData().entries()) {
      if (data.userId === userId) {
        return inviteId;
      }
    }
    return null;
  }

  private async deferInteraction(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
    if (interaction.replied || interaction.deferred) {
      this.logger.warn(`[DEBUG] Interaction already acknowledged - User: ${interaction.user.id}`);
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      this.logger.log(`[DEBUG] Interaction deferred successfully - User: ${interaction.user.id}`);
    } catch (error) {
      await this.handleInteractionError(interaction, error);
    }
  }

  public async inviteMember(
    interaction: ChatInputCommandInteraction<CacheType>,
    options: InviteRequestDto,
  ): Promise<void> {
    const startTime = Date.now();
    this.logger.log(
      `[DEBUG] Starting inviteMember - User: ${interaction.user.id}, Target: ${options?.member?.id}`,
    );

    try {
      // Defer interaction to prevent timeout
      await this.deferInteraction(interaction);

      // Check permissions
      const hasPermission = await this.permissionService.checkPermission(interaction);
      if (!hasPermission) {
        await this.sendResponse(interaction, 'คุณไม่มีสิทธิในการเชิญสมาชิกเข้าร่วมกิลด์');
        return;
      }

      // Fetch target member
      const target = await interaction.guild?.members.fetch(options.member.id);
      if (!target) {
        await this.sendResponse(interaction, 'ไม่พบสมาชิกที่ต้องการเชิญ');
        return;
      }

      // Get target profile
      const targetProfile = await this.profileService.getProfile(target);

      // Validate invite request
      const validation = await this.validationService.validateInviteRequest(target, interaction, targetProfile);
      if (!validation.isValid) {
        await this.sendResponse(interaction, validation.message || 'ไม่สามารถเชิญสมาชิกได้');
        return;
      }

      // Create invite
      const inviteResult = await this.inviteService.createInvite(targetProfile!, interaction);
      if (inviteResult.status === 'fail') {
        await this.sendResponse(interaction, inviteResult.message);
        return;
      }

      // Store invite data
      this.inviteService.storeInviteData(inviteResult.inviteId!, {
        userId: target.user.id,
        targetId: target.id,
        inviteId: inviteResult.inviteId!,
        member: options.member,
        guild: interaction.guild!,
      });

      // Create buttons and send notification
      const buttons = ButtonFactory.createInviteButtons();
      const notificationSent = await this.notificationService.sendInviteNotification(
        target,
        interaction.user.toString(),
        interaction.guild?.name || 'ไม่ระบุชื่อกิลด์',
        buttons
      );

      if (notificationSent) {
        await this.sendResponse(interaction, 'ส่งข้อความเชิญชวนไปยังสมาชิกแล้ว');
      } else {
        await this.sendResponse(interaction, 'ไม่สามารถส่งข้อความไปยังสมาชิกได้เนื่องจาก สมาชิกปิดรับข้อความ');
      }

    } catch (error) {
      this.logger.error(
        `[DEBUG] Error in inviteMember - User: ${interaction.user.id}, Error: ${error.message}`,
      );
      await this.sendResponse(interaction, 'เกิดข้อผิดพลาดในการดำเนินการ');
    } finally {
      const endTime = Date.now();
      this.logger.log(
        `[DEBUG] inviteMember completed - User: ${interaction.user.id}, Duration: ${endTime - startTime}ms`,
      );
    }
  }

  @Button('guild-invite-cancel')
  async cancelInvite(@Context() [interaction]: ButtonContext): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`[DEBUG] Starting cancelInvite - User: ${interaction.user.id}`);

    try {
      if (interaction.replied || interaction.deferred) {
        this.logger.warn(`[DEBUG] Button interaction already acknowledged - User: ${interaction.user.id}`);
        return;
      }

      const userId = interaction.user.id;
      const inviteId = this.findInviteIdByUserId(userId);
      
      if (inviteId) {
        await this.inviteService.cancelInvite(inviteId, userId);
      }

      await interaction.update({
        content: 'คุณได้ตอบปฏิเสธคำเชิญนี้แล้ว',
        components: [],
        embeds: [],
        files: [],
      });

    } catch (error) {
      this.logger.error(`[DEBUG] Error in cancelInvite - User: ${interaction.user.id}, Error: ${error.message}`);
    } finally {
      const endTime = Date.now();
      this.logger.log(`[DEBUG] cancelInvite completed - User: ${interaction.user.id}, Duration: ${endTime - startTime}ms`);
    }
  }

  @Button('guild-invite-accept')
  async acceptInvite(@Context() [interaction]: ButtonContext): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`[DEBUG] Starting acceptInvite - User: ${interaction.user.id}`);

    try {
      if (interaction.replied || interaction.deferred) {
        this.logger.warn(`[DEBUG] Button interaction already acknowledged - User: ${interaction.user.id}`);
        return;
      }

      const userId = interaction.user.id;
      const inviteId = this.findInviteIdByUserId(userId);

      if (!inviteId) {
        this.logger.warn(`[DEBUG] No invite data found for user - User: ${userId}`);
        await interaction.update({
          content: 'ไม่พบข้อมูลคำเชิญหรือคำเชิญนี้หมดอายุแล้ว',
          components: [],
          embeds: [],
          files: [],
        });
        return;
      }

      // Get user profile to check if they're already in a guild
      const userProfile = await this.profileService.getProfile({ id: userId });
      if (!userProfile) {
        await interaction.update({
          content: 'ไม่สามารถยอมรับคำขอนี้ได้เนื่องจากคุณไม่มีข้อมูลนักผจญภัย',
          components: [],
          embeds: [],
          files: [],
        });
        return;
      }

      if (userProfile.GuildMembers.length > 0) {
        await interaction.update({
          content: 'คุณไม่สามารถตอบรับคำเชิญนี้ได้เนื่องจากคุณมีกิลด์อยู่แล้ว',
          components: [],
          embeds: [],
          files: [],
        });
        return;
      }

      // Accept the invite
      const result = await this.inviteService.acceptInvite(inviteId, userId);
      
      if (result.status === 'success') {
        // Clean up invite data
        this.inviteService.removeInviteData(inviteId);
        
        // Remove components from message
        interaction.message.edit({ components: [] }).catch((error) => {
          this.logger.error(`[DEBUG] Error editing message - Error: ${error.message}, User: ${userId}`);
        });

        await interaction.update({
          content: result.message,
          components: [],
          embeds: [],
          files: [],
        });
      } else {
        await interaction.update({
          content: result.message,
          components: [],
          embeds: [],
          files: [],
        });
      }

    } catch (error) {
      this.logger.error(`[DEBUG] Error in acceptInvite - User: ${interaction.user.id}, Error: ${error.message}`);
      
      // Clean up invite data on error
      const userId = interaction.user.id;
      const inviteId = this.findInviteIdByUserId(userId);
      if (inviteId) {
        this.inviteService.removeInviteData(inviteId);
      }

      if (!interaction.replied && !interaction.deferred) {
        await interaction.update({
          content: 'เกิดข้อผิดพลาดในการดำเนินการ',
          components: [],
          embeds: [],
          files: [],
        });
      }
    } finally {
      const endTime = Date.now();
      this.logger.log(`[DEBUG] acceptInvite completed - User: ${interaction.user.id}, Duration: ${endTime - startTime}ms`);
    }
  }
}
