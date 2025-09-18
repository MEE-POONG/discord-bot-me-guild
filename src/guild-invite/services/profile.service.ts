import { Injectable, Logger } from '@nestjs/common';
import { GuildMember } from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { UserProfile } from 'src/guild-manage/guild-manage.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: GuildMember | { id: string }): Promise<UserProfile | null> {
    const startTime = Date.now();
    this.logger.log(`[DEBUG] Starting getProfile - User: ${user.id}`);

    try {
      this.logger.log(`[DEBUG] Fetching user data from DB - User: ${user.id}`);
      const userUserData = await this.prisma.userDB.findFirst({
        where: {
          discord_id: user.id,
        },
      });
      this.logger.log(
        `[DEBUG] User data result: ${userUserData ? 'FOUND' : 'NOT_FOUND'} - User: ${user.id}`,
      );

      this.logger.log(`[DEBUG] Fetching guild members - User: ${user.id}`);
      const userGuildMembers = await this.prisma.guildMembers.findMany({
        where: {
          userId: user.id,
        },
      });
      this.logger.log(`[DEBUG] Guild members count: ${userGuildMembers.length} - User: ${user.id}`);

      // Fetch wallet data
      this.logger.log(`[DEBUG] Fetching wallet data - User: ${user.id}`);
      const userWallet = await this.prisma.meGuildCoinDB.findFirst({
        where: {
          userId: user.id,
        },
      });
      this.logger.log(
        `[DEBUG] Wallet data result: ${userWallet ? 'FOUND' : 'NOT_FOUND'} - User: ${user.id}`,
      );

      // Return the profile data
      const profile = {
        ...userUserData,
        GuildMembers: userGuildMembers,
        meGuildCoinDB: userWallet,
      } as UserProfile;

      this.logger.log(
        `[DEBUG] Profile created successfully - User: ${user.id}, HasUserData: ${!!userUserData}, GuildMembers: ${userGuildMembers.length}, HasWallet: ${!!userWallet}`,
      );
      return profile;
    } catch (error) {
      this.logger.error(
        `[DEBUG] Error fetching user profile - User: ${user.id}, Error: ${error.message}, Stack: ${error.stack}`,
      );
      return null;
    } finally {
      const endTime = Date.now();
      this.logger.log(
        `[DEBUG] getProfile completed - User: ${user.id}, Duration: ${endTime - startTime}ms`,
      );
    }
  }
}
