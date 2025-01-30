import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Guild,
  GuildMember,
  User,
} from 'discord.js';
import { GuildInviteDto } from './dto/length.dto';
import { UserProfile } from 'src/guild-manage/guild-manage.service';
import { PrismaService } from 'src/prisma.service';
import { Button, ButtonContext, Context } from 'necord';

@Injectable()
export class GuildInviteService implements OnModuleInit {
  private readonly logger = new Logger(GuildInviteService.name);
  private readonly guildInviteId = new Map<string, string>();
  private DISCORD_GUILD_MEMBER = new Map<string, GuildMember>();
  private DISCORD_GUILD = new Map<string, Guild>();
  private readonly client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
    ],
  });
  public constructor(private readonly prisma: PrismaService) { }
  public async onModuleInit() {
    this.logger.log('GuildInviteService initialized');
  }

  async checkPermission(interaction: ChatInputCommandInteraction<CacheType>) {
    if (interaction.member instanceof GuildMember) {
      return interaction.member.roles.cache.some(
        (r) => r.id === process.env.DISCORD_GUILD_FOUNDER_ROLE_ID,
      );
    }
    return false;
  }

  async getProfile(user: GuildMember | { id: string }) {
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

  async handleInviteMember(
    userData: UserProfile,
    interaction: ChatInputCommandInteraction<CacheType>,
  ) {
    try {
      const guild = await this.prisma.guildMembers.findFirst({
        where: {
          userId: userData.discord_id,
        },
      });

      if (guild) {
        return {
          status: 'fail',
          message: 'สมาชิกนี้มีกิลด์อยู่แล้ว',
          inviteId: null,
        };
      }

      const owner = await this.prisma.guildMembers.findFirst({
        where: {
          userId: interaction.user.id,
        },
        include: {
          guildDB: true,
        },
      });

      const invite = await this.prisma.guildInviteDataDB.create({
        data: {
          guildId: owner.guildDB.id,
          userId: userData.discord_id,
        },
      });

      return {
        status: 'success',
        message: 'สร้างคำเชิญสำเร็จ',
        inviteId: invite.id,
      };
    } catch (error) {
      console.log(error);
      return {
        status: 'fail',
        message: 'ไม่สามารถสร้างคำเชิญได้',
        inviteId: null,
      };
    }
  }

  public async inviteMember(
    interaction: ChatInputCommandInteraction<CacheType>,
    options: GuildInviteDto,
  ) {
    this.logger.log('Inviting member');
    const checkPermission = await this.checkPermission(interaction);
    let target = options?.member as GuildMember;
    target = await interaction.guild?.members.fetch(target.id);
    const targetProfile = await this.getProfile(target);
    const isSelf = target.id == interaction.user.id;
    const isInGuild = target.roles.cache.some(
      (r) =>
        r.id == process.env.DISCORD_GUILD_FOUNDER_ROLE_ID ||
        r.id == process.env.DISCORD_GUILD_CO_FOUNDER_ROLE_ID,
    );

    if (!checkPermission)
      return interaction.reply({
        content: 'คุณไม่มีสิทธิในการเตะสมาชิกออกจากกิลด์',
        ephemeral: true,
      });

    if (isSelf)
      return interaction.reply({
        content: 'คุณไม่สามารถเชิญตัวเองได้',
        ephemeral: true,
      });

    if (isInGuild) {
      return interaction.reply({
        content: 'สมาชิกนี้มีกิลด์อยู่แล้ว',
        ephemeral: true,
      });
    }

    if (!targetProfile)
      return interaction.reply({
        content: 'สมาชิกนี้ไม่มีข้อมูลนักผจญภัย',
        ephemeral: true,
      });

    const invite = await this.handleInviteMember(targetProfile, interaction);

    if (invite.status == 'fail') {
      return interaction.reply({
        content: invite.message,
        ephemeral: true,
      });
    }

    const buttonInvite = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(`guild-invite-cancel`)
        .setLabel(`ไม่เข้าร่วม`)
        .setEmoji('📕')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`guild-invite-accept`)
        .setLabel(`เข้าร่วมกิลด์`)
        .setEmoji('📗')
        .setStyle(ButtonStyle.Success),
    );

    this.guildInviteId.set('USER_ID', target.user.id);
    this.guildInviteId.set('TARGET_ID', target.id);
    this.guildInviteId.set('INVITE_ID', invite.inviteId);
    this.DISCORD_GUILD_MEMBER.set(target.id, options?.member);
    this.DISCORD_GUILD.set(target.id, interaction.guild);

    let embeds = new EmbedBuilder()
      .setAuthor({
        name: `มีคำเชิญเข้าร่วมกิลด์จาก ${interaction.user.toString()}`,
      })
      .setFields({
        name: `ชื่อกิลด์`,
        value: `${interaction.guild?.name ?? 'ไม่ระบุชื่อกิลด์'}`,
      })
      .setColor('#A4FFED');

    try {
      await target.user.send({
        embeds: [embeds],
        components: [buttonInvite],
      });
      return interaction.reply({
        content: 'ส่งข้อความเชิญชวนไปยังสมาชิกแล้ว',
        ephemeral: true,
      });
    } catch (error) {
      return interaction.reply({
        content:
          'ไม่สามารถส่งข้อความไปยังสมาชิกได้เนื่องจาก สมาชิกปิดรับข้อความ',
        ephemeral: true,
      });
    }
  }

  @Button('guild-invite-cancel')
  async cancelInvite(@Context() [interaction]: ButtonContext): Promise<void> {
    this.logger.log('คุณได้ตอบปฏิเสธคำเชิญนี้แล้ว');

    interaction.update({
      content: 'คุณได้ตอบปฏิเสธคำเชิญนี้แล้ว',
      components: [],
      embeds: [],
      files: [],
    });

    return;
  }

  @Button('guild-invite-accept')
  async acceptInvite(@Context() [interaction]: ButtonContext): Promise<void> {
    try {
      const userId = interaction.user.id;
      const guild = this.DISCORD_GUILD.get(userId);

      const userProfile = await this.getProfile({ id: userId });
      if (!userProfile) {
        interaction.reply({
          content: 'ไม่สามารถยอมรับคำขอนี้ได้เนื่องจากคุณไม่มีข้อมูลนักผจญภัย',
          ephemeral: true,
        });
        return;
      }

      if (userProfile.GuildMembers.length > 0) {
        interaction.reply({
          content: 'คุณไม่สามารถตอบรับคำเชิญนี้ได้เนื่องจากคุณมีกิลด์อยู่แล้ว',
          ephemeral: true,
        });
        return;
      }

      const guildInviteDataDB = await this.prisma.guildInviteDataDB.findFirst({
        where: { id: this.guildInviteId.get('INVITE_ID') },
      });

      if (!guildInviteDataDB) {
        interaction.reply({
          content: 'ไม่พบคำเชิญที่คุณต้องการยอมรับ',
          ephemeral: true,
        });
        return;
      }

      const guildData = await this.prisma.guildDB.findFirst({
        where: { id: guildInviteDataDB.guildId },
      });

      if (!guildData) {
        interaction.reply({
          content: 'ไม่พบกิลด์ที่คุณจะเข้าร่วมในระบบ',
          ephemeral: true,
        });
        return;
      }

      const memberList = await this.prisma.guildMembers.findMany({
        where: { guildId: guildInviteDataDB.guildId },
      });

      const memberSize = memberList.length || 0;
      if (memberSize >= guildData.guild_size) {
        interaction.reply({
          content:
            'คุณไม่สามารถเข้าร่วมกิลด์ได้เนื่องจาก สมาชิกในกิลด์นี้ถึงขีดจำกัดแล้ว',
          ephemeral: true,
        });
        return;
      }

      const newMember = await this.prisma.guildMembers.create({
        data: {
          guildId: guildInviteDataDB.guildId,
          position: 'Member',
          userId: interaction.user.id,
        },
      });

      if (!newMember) {
        interaction.reply({
          content: 'ไม่สามารถเพิ่มข้อมูลของคุณลงในกิลด์ได้',
          ephemeral: true,
        });
        return;
      }

      const member = await guild.members.fetch(userId);
      await member.roles.add(guildData.guild_roleId as string);

      this.prisma.guildInviteDataDB
        .delete({
          where: { id: guildInviteDataDB.id },
        })
        .catch(() => { });

      interaction.message
        .edit({
          components: [],
        })
        .catch(() => { });

      interaction.reply({
        content: `ระบบได้เพิ่มคุณเข้าสู่กิลด์ ${guildData.guild_name} เรียบร้อยแล้วค่ะ`,
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error(error);
      console.log(error);
      interaction.update({
        content: 'เกิดข้อผิดพลาดในการดำเนินการ',
        components: [],
        embeds: [],
        files: [],
      });
    }
  }
}
