import { Injectable, Logger } from '@nestjs/common';
import {
  GuildDB,
  GuildMembers,
  PrismaClient,
  UserDB,
  Wallet,
} from '@prisma/client';
import {
  ButtonInteraction,
  CacheType,
  CategoryChannel,
  ChannelType,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GuildMember,
  Role,
  TextChannel,
  User,
  UserManager,
  VoiceChannel,
} from 'discord.js';

@Injectable()
export class GuildManageService {
  private readonly logger = new Logger(GuildManageService.name);
  public guildDB: GuildDB | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly users: UserManager,
    private readonly client: Client,
  ) {}

  async onModuleInit() {
    this.logger.log('GuildManageService initialized');
  }

  async getGuild(user: User) {
    const guildMembers = await this.prisma.guildMembers.findFirst({
      where: { userId: user.id },
    });

    if (!guildMembers) return (this.guildDB = null);

    const guild = await this.prisma.guildDB.findFirst({
      where: { id: guildMembers.guildId },
    });

    this.guildDB = guild || null;
    return this.guildDB;
  }

  async checkGuild(userData: UserProfile) {
    try {
      return await this.prisma.guildMembers.findFirst({
        where: { userId: userData.discord_id as string },
      });
    } catch (error) {
      throw error;
    }
  }

  async cancelInviteCreate(interaction: ButtonInteraction, reportId: string) {
    try {
      const report = await this.prisma.guildCreateReport.findFirst({
        where: { id: reportId },
      });

      if (!report) {
        return interaction.reply({
          content: 'ไม่พบรายงานที่คุณต้องการยอเลิก',
          ephemeral: true,
        });
      }

      interaction.message.delete().catch(() => {});
      interaction.reply({
        content: 'ยกเลิกคำขอสำเร็จ',
        ephemeral: true,
      });

      if ('ownerId' in report && 'guildName' in report) {
        const user = await this.users.fetch(report.ownerId);
        if (user) {
          user
            .send({
              content: `❌ เนื่องจากผู้ร่วมก่อตั้งกิลด์ ${report.guildName} ไม่เห็นด้วยกับคำขอของคุณ คำขอสร้างกิลด์ของคุณได้ถูกยกเลิกแล้ว`,
            })
            .catch(() => {});
        }

        await this.prisma.guildCreateReport
          .delete({
            where: { id: reportId },
          })
          .catch(() => {});
      }
    } catch {
      interaction.message.delete().catch(() => {});
      interaction.reply({
        content: 'ยกเลิกคำขอสำเร็จ',
        ephemeral: true,
      });
    }
  }

  async acceptInviteCreate(interaction: ButtonInteraction, reportId: string) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const report = await this.prisma.guildCreateReport.findFirst({
        where: { id: reportId },
      });

      if (!report) {
        return interaction.editReply({
          content: 'ไม่พบรายงานที่คุณต้องการยอมรับ',
        });
      }

      if (report.members.length >= 1) {
        const membersList = [...report.members, interaction.user.id];
        const guild = await this.prisma.guildDB.create({
          data: {
            guild_name: report.guildName,
            guild_roleId: null,
            guild_size: 10,
            guild_level: 1,
            guild_copper: 0,
            guild_leader: report.ownerId,
            Logo: '',
          },
        });

        if (!guild) {
          return interaction.editReply({
            content: 'ไม่สามารถสร้างกิลด์ใหม่ได้ โปรดทำการก่อตั้งกิลด์ใหม่',
          });
        }

        const members = await this.prisma.guildMembers.createMany({
          data: membersList.map((userId) => ({
            userId,
            position: userId === report.ownerId ? 'Leader' : 'Co-founder',
            guildId: guild.id,
          })),
        });

        if (!members.count) {
          await this.deleteData(guild);
          return interaction.editReply({
            content: 'ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้',
          });
        }

        const res = await this.createGuild(report.guildName);
        if (!res.role || res.message !== 'success') {
          await this.deleteData(guild);
          await res.role?.delete();
          return interaction.editReply({
            content: `กิลด์ ${report.guildName} ของคุณได้รับอนุมัติแล้ว แต่ ${res.message}`,
          });
        }

        await this.prisma.guildDB.update({
          data: { guild_roleId: res.role.id },
          where: { id: guild.id },
        });

        interaction.editReply({
          content: 'ยืนยันคำขอสำเร็จ',
        });

        const Interguild = await this.client.guilds.fetch(
          process.env.DISCORD_GUILD_ID,
        );
        if (!Interguild) {
          return interaction.editReply({
            content: 'ไม่สามารถเข้าถึงดิสกิลด์ได้',
          });
        }

        const owner = await Interguild.members.fetch(report.ownerId);

        owner?.roles
          .add(process.env.DISCORD_GUILD_FOUNDER_ROLE_ID)
          .catch((error) => {
            console.log('Failed to add role to owner', error);
          });
        owner?.roles.add(res.role).catch((error) => {
          console.log('Failed to add role to owner', error);
        });

        for (const id of membersList.filter((id) => id !== report.ownerId)) {
          const member = await Interguild.members.fetch(id);
          if (member) {
            member.roles
              .add(process.env.DISCORD_GUILD_CO_FOUNDER_ROLE_ID)
              .catch((error) => {
                console.log(`Failed to add role to member ${id}`, error);
              });
            member.roles.add(res.role).catch((error) => {
              console.log(`Failed to add role to member ${id}`, error);
            });
            member
              .send({
                content: `🎉 ยินดีด้วย! กิลด์ ${report.guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว`,
              })
              .catch(() => {
                console.log(`Failed to send message to member ${id}`);
              });
          }
        }

        this.updateMessage(
          report.channelId,
          report.messageId,
          report.guildName,
          membersList,
        );

        await this.prisma.guildCreateReport
          .delete({ where: { id: reportId } })
          .catch(() => {});

        interaction.message.delete().catch(() => {
          console.log('Failed to delete interaction message');
        });
      } else {
        await this.prisma.guildCreateReport.update({
          data: { members: { push: interaction.user.id } },
          where: { id: reportId },
        });

        interaction.editReply({
          content: 'ยืนยันคำขอสำเร็จ',
        });
        interaction.message.delete().catch(() => {
          console.log('Failed to delete interaction message');
        });

        this.updateMessage(
          report.channelId,
          report.messageId,
          report.guildName,
          [...report.members, interaction.user.id],
        );
      }
    } catch (error) {
      console.log('error', error);
      interaction.editReply({
        content: 'เกิดข้อผิดพลาดในการยืนยันคำขอ โปรดลองอีกครั้ง',
      });
    }
  }

  async deleteData(guildDB: GuildDB) {
    await this.prisma.guildDB.delete({ where: { id: guildDB.id } }).catch(() => {
      console.log(`Failed to delete guild: ${guildDB.id}`);
    });
    await this.prisma.guildMembers
      .deleteMany({ where: { guildId: guildDB.id } })
      .catch(() => {
        console.log(`Failed to delete guild members for guild: ${guildDB.id}`);
      });
  }

  async updateMessage(
    channelId: string,
    messageId: string,
    guildName: string,
    members: string[],
  ) {
    try {
      const channel = (await this.client.channels.fetch(channelId)) as
        | TextChannel
        | VoiceChannel;
      if (!channel) return;

      const message = await channel.messages.fetch(messageId);
      if (!message) return;

      const embed = new EmbedBuilder(message.embeds[0].toJSON());
      if (members.length >= 4) {
        embed
          .setTitle(
            `#🎉 กิลด์ ${guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว`,
          )
          .setColor('Gold');
      } else {
        embed.setTitle(
          `# ความคืบหน้า (${members.length}/4) ของกิลด์ ${guildName}`,
        );
      }

      await message.edit({ embeds: [embed] }).catch(() => {
        console.log('Failed to edit message');
      });
    } catch {
      console.log('Failed to fetch channel or message');
    }
  }

  async createGuild(
    guildName: string,
    guildId: any = null,
  ): Promise<{ role: Role | undefined; message: string }> {
    const guildServer = await this.client.guilds
      .fetch(process.env.DISCORD_GUILD_ID)
      .catch((error) => {
        this.logger.error('Failed to fetch guild:', error);
        return undefined;
      });

    if (!guildServer) {
      return { role: undefined, message: 'ไม่สามารถเข้าถึงดิสกิลด์ได้' };
    }

    const positionRole = guildServer.roles.cache.get(
      process.env.DISCORD_GUILD_ROLE_ID,
    );
    const position = positionRole ? positionRole.position - 1 : undefined;

    try {
      const role = await guildServer.roles.create({
        name: `🕍 ${guildName}`,
        position,
        color: '#A4F1FF',
      });

      const message = await this.createChannel(role);
      return { role, message };
    } catch (error) {
      console.log('error ไม่สามารถสร้างห้องกิลด์ได้', error);
      return { role: undefined, message: 'ไม่สามารถสร้างห้องกิลด์ได้' };
    }
  }

  private async createChannel(roles: Role): Promise<string> {
    try {
      const guildServer = await this.client.guilds.fetch(
        process.env.DISCORD_GUILD_ID,
      );
      if (!guildServer) {
        this.logger.error('Failed to fetch guild');
        return 'ไม่สามารถเข้าถึงดิสกิลด์ได้';
      }

      const positionGuild = guildServer.channels.cache.get(
        process.env.DISCORD_GUILD_CATEGORY_ID,
      ) as CategoryChannel;

      const category = await guildServer.channels.create({
        name: roles.name,
        type: ChannelType.GuildCategory,
        position: positionGuild ? positionGuild.position + 1 : undefined,
        permissionOverwrites: [
          {
            id: process.env.DISCORD_GUILD_ID,
            allow: ['ViewChannel'],
            deny: ['Connect'],
          },
          {
            id: roles.id,
            allow: ['ViewChannel', 'Connect'],
          },
        ],
      });

      if (!category) {
        this.logger.error('Failed to create guild category');
        return 'ไม่สามารถสร้างห้องหมวดหมู่กิลด์ได้';
      }

      const createVoiceChannel = async (
        name: string,
        state = 0,
        publicView = false,
      ) => {
        try {
          const voiceChannel = await category.children.create({
            type:
              state === 0
                ? ChannelType.GuildVoice
                : state === 1
                  ? ChannelType.GuildStageVoice
                  : ChannelType.GuildText,
            name,
            permissionOverwrites: publicView
              ? [
                  {
                    id: process.env.DISCORD_GUILD_CATEGORY_ID_PARTY,
                    allow: ['ViewChannel', 'Connect'],
                  },
                ]
              : undefined,
          });

          return voiceChannel;
        } catch (error) {
          this.logger.error(`Failed to create channel ${name}:`, error);
          throw new Error(`ไม่สามารถสร้างห้อง ${name} ได้`);
        }
      };

      await Promise.all([
        createVoiceChannel('💬・แชท', 2),
        createVoiceChannel('🎤・โถงหลัก', 0),
        createVoiceChannel('🎤・โถงรอง', 0),
        // createVoiceChannel('🎁・เยี่ยมบ้าน', 0, true),
        // createVoiceChannel('👑・กิจกรรมกิลด์', 1, true),
      ]);

      return 'success';
    } catch (error: any) {
      this.logger.error('Error in createChannel:', error);
      return error.message || 'เกิดข้อผิดพลาดในการสร้างห้อง';
    }
  }
}

export interface UserProfile extends UserDB {
  GuildMembers: GuildMembers[];
  wallet: Wallet | null;
}
