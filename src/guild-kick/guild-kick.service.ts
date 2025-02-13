import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  CacheType,
  ChatInputCommandInteraction,
  GuildMember,
  User,
} from 'discord.js';
import {
  GuildManageService,
  UserProfile,
} from 'src/guild-manage/guild-manage.service';
import { PrismaService } from 'src/prisma.service';
import { UserDataService } from 'src/user-data/user-data.service';
import { GuildKickDto } from './dto/length.dto';

@Injectable()
export class GuildKickService implements OnModuleInit {
  private readonly logger = new Logger(GuildKickService.name);
  public constructor(private readonly prisma: PrismaService) { }
  public async onModuleInit() {
    this.logger.log('GuildKickService initialized');
  }

  public async kickMember(
    interaction: ChatInputCommandInteraction<CacheType>,
    options: GuildKickDto,
  ) {
    const checkPermission = await this.checkPermission(interaction);
    if (!checkPermission)
      return interaction.reply({
        content: 'คุณไม่มีสิทธิในการเตะสมาชิกออกจากกิลด์',
        ephemeral: true,
      });

    let target = options?.member as GuildMember;
    if (target.id == interaction.user.id)
      return interaction.reply({
        content: 'คุณไม่สามารถเตะตัวเองได้',
        ephemeral: true,
      });
    target = await interaction.guild?.members.fetch(target.id);

    if (
      target.roles.cache.some(
        (r) =>
          r.id == process.env.DISCORD_GUILD_FOUNDER_ROLE_ID ||
          r.id == process.env.DISCORD_GUILD_CO_FOUNDER_ROLE_ID,
      )
    )
      return interaction.reply({
        content: 'ไม่สามารถเตะหัวหน้ากิลล์หรือรองหัวหน้ากิลล์ได้',
        ephemeral: true,
      });

    let targetProfile = await this.getProfile(target.user);
    if (!targetProfile)
      return interaction.reply({
        content: 'สมาชิกนี้ไม่มีข้อมูลนักผจญภัย',
        ephemeral: true,
      });

    const result = await this.handleKickMember(targetProfile, target);

    if (result == 'สมาชิกถูกเตะออกจากกิลด์แล้ว')
      return interaction.reply({
        content: 'สมาชิกถูกเตะออกจากกิลด์แล้ว',
        ephemeral: true,
      });

    return interaction.reply({
      content: result,
      ephemeral: true,
    });
  }

  async handleKickMember(userData: UserProfile, member: GuildMember) {
    const guildId = userData.GuildMembers[0]?.guildId;
    if (!guildId) return 'สมาชิกนี้ไม่มีกิลด์';

    try {
      const guildMember = await this.prisma.guildMembers.findFirst({
        where: {
          guildId: guildId,
          userId: userData.discord_id,
        },
        include: {
          guildDB: true,
        },
      });

      if (!guildMember) return 'สมาชิกที่ต้องการจะเตะไม่ได้อยู่ในกิลด์นี้';

      const roleCoFounder = member.roles.cache.find(
        (r) => r.id === process.env.DISCORD_GUILD_CO_FOUNDER_ROLE_ID,
      );
      if (roleCoFounder)
        await member.roles
          .remove(roleCoFounder)
          .then(() => {
            console.log('ลบสิทธิ์สมาชิกสำเร็จ');
          })
          .catch((error) => {
            console.log('ลบสิทธิ์สมาชิกไม่สำเร็จ');
            return 'เกิดข้อผิดพลาดในการลบสิทธิ์สมาชิก';
          });

      const roleGuild = member.roles.cache.find(
        (r) => r.id === guildMember.guildDB?.guild_roleId,
      );

      if (roleGuild)
        await member.roles
          .remove(roleGuild)
          .then(() => {
            console.log('ลบสิทธิ์กิลด์สำเร็จ', guildMember.guildId);
          })
          .catch((error) => {
            console.log('ลบสิทธิ์กิลด์ไม่สำเร็จ', guildMember.guildId, error);
            return 'เกิดข้อผิดพลาดในการลบสิทธิ์กิลด์';
          });

      await this.prisma.guildMembers.delete({
        where: {
          id: guildMember.id,
        },
      });

      return 'สมาชิกถูกเตะออกจากกิลด์แล้ว';
    } catch (error) {
      return 'เกิดข้อผิดพลาดในการเตะสมาชิก';
    }
  }

  async checkPermission(interaction: ChatInputCommandInteraction<CacheType>) {
    if (interaction.member instanceof GuildMember) {
      return interaction.member.roles.cache.some(
        (r) => r.id === process.env.DISCORD_GUILD_FOUNDER_ROLE_ID,
      );
    }
    return false;
  }

  async getProfile(user: User) {
    try {
      let userUserData = await this.prisma.userDB.findFirst({
        where: {
          discord_id: user.id,
        },
      });

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
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
}
