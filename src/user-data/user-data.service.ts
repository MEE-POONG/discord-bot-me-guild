import { Injectable, Logger } from '@nestjs/common';
import { GuildMembers, PrismaClient, UserDB, MeGuildCoinDB } from '@prisma/client';
import { User } from 'discord.js';

@Injectable()
export class UserDataService {
  private logger = new Logger(UserDataService.name);

  constructor(private readonly prisma: PrismaClient) { }

  async getProfile(user: User) {
    try {
      // Fetch user data
      let userUserData = await this.prisma.userDB.findFirst({
        where: {
          discord_id: user.id,
        },
      });

      // Fetch guild members data
      let userGuildMembers = await this.prisma.guildMembers.findMany({
        where: {
          userId: user.id,
        },
      });

      // Fetch wallet data
      let userWallet = await this.prisma.meGuildCoinDB.findFirst({
        where: {
          userId: user.id,
        },
      });

      // Return the profile data
      return {
        ...userUserData,
        GuildMembers: userGuildMembers,
        meGuildCoinDB: userWallet,
      } as UserProfile;
    } catch (error) {
      this.logger.error('Error fetching user profile:', error);
      return null;
    }
  }
}

export interface UserProfile extends UserDB {
  GuildMembers: GuildMembers[];
  meGuildCoinDB: MeGuildCoinDB | null;
}
