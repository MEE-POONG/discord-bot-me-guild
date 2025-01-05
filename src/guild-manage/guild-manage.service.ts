import { Injectable, Logger } from '@nestjs/common';
import {
  Guild,
  GuildMembers,
  PrismaClient,
  UserDB,
  Wallet,
} from '@prisma/client';
import {
  ButtonInteraction,
  CategoryChannel,
  ChannelType,
  Client,
  EmbedBuilder,
  Role,
  TextChannel,
  User,
  UserManager,
  VoiceChannel,
} from 'discord.js';
import { GuildMember } from 'discord.js';

@Injectable()
export class GuildManageService {
  private readonly logger = new Logger(GuildManageService.name);
  public guild: Guild | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly users: UserManager,
    private readonly client: Client,
  ) {}

  async onModuleInit() {
    this.logger.log('GuildManageService initialized');
  }

  async getGuild(user: User) {
    let guildMembers = await this.prisma.guildMembers.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!guildMembers) return (this.guild = null);

    const guild = await this.prisma.guild.findFirst({
      where: {
        id: guildMembers?.guildId,
      },
    });

    if (!guild) return (this.guild = null);
    this.guild = guild;
    return guild;
  }

  async checkGuild(userData: UserProfile) {
    try {
      let guild = await this.prisma.guildMembers.findFirst({
        where: {
          userId: userData.discord_id as string,
        },
      });

      return guild;
    } catch (error) {
      throw error;
    }
  }

  async cancelInviteCreate(interaction: ButtonInteraction, reportId: string) {
    this.prisma.guildCreateReport
      .findFirst({
        where: {
          id: reportId,
        },
      })
      .catch(() => {
        interaction.message.delete().catch(() => {});
        return interaction.reply({
          content: 'ยกเลิกคำขอสำเร็จ',
          ephemeral: true,
        });
      })
      .then((report) => {
        if (!report)
          return interaction.reply({
            content: 'ไม่พบรายงานที่คุณต้องการยกเลิก',
            ephemeral: true,
          });
        interaction.message.delete().catch(() => {});
        interaction.reply({
          content: 'ยกเลิกคำขอสำเร็จ',
          ephemeral: true,
        });

        if ('ownerId' in report && 'guildName' in report) {
          this.users.fetch(report.ownerId).then((user) => {
            if (!user) return;
            user
              .send({
                content: `❌ เนื่องจากผู้ร่วมก่อตั้งกิลด์ ${report.guildName} ไม่เห็นด้วยกับคำขอของคุณ คำขอสร้างกิลด์ของคุณได้ถูกยกเลิกแล้ว`,
            })
            .catch(() => {});
        });

        this.prisma.guildCreateReport
          .delete({
            where: {
              id: reportId,
            },
          })
          .catch(() => {});
      }
    });
  }

  async acceptInviteCreate(interaction: ButtonInteraction, reportId: string) {
    try {
      console.log('reportId', reportId);
      // Find the report
      const report = await this.prisma.guildCreateReport.findFirst({
        where: { id: reportId },
      });

      if (!report) {
        return interaction.reply({
          content: 'ไม่พบรายงานที่คุณต้องการยอมรับ',
          ephemeral: true,
        });
      }

      if (report.members.length >= 4) {
        // Create the guild
        let membersList = report.members;
        membersList.push(interaction.user.id);
        const guild = await this.prisma.guild.create({
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
          return interaction.reply({
            content: 'ไม่สามารถสร้างกิลด์ใหม่ได้ โปรดทำการก่อตั้งกิลด์ใหม่',
            ephemeral: true,
          });
        }

        const members = await this.prisma.guildMembers.createMany({
          data: membersList.map((userId) => ({
            userId: userId,
            position: userId === report.ownerId ? 'Leader' : 'Co-founder',
            guildId: guild.id,
          })),
        });

        if (!members.count) {
          await this.deleteData(guild);
          return interaction.reply({
            content: 'ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้',
            ephemeral: true,
          });
        }

        this.createGuild(report.guildName)
          .then(async (res) => {
            
            console.log('res.role', res.role);
            if (res.role === undefined) {
              await this.deleteData(guild);
              return interaction.reply({
                content: `กิลด์ ${report.guildName} ของคุณได้รับอนุมัติแล้ว แต่ไม่สามารถสร้างกิลด์ได้`,
                ephemeral: true,
              });
            }

            console.log('res.message', res.message);
            if (res.message !== 'success') {
              await this.deleteData(guild);
              await res.role?.delete();
              return interaction.reply({
                content: `กิลด์ ${report.guildName} ของคุณได้รับอนุมัติแล้ว แต่ ${res.message}`,
                ephemeral: true,
              });
            }

            await this.prisma.guild.update({
              data: { guild_roleId: res.role.id },
              where: { id: guild.id },
            });

            console.log('res.role.id', res.role.id);
            

            interaction.reply({
              content: 'ยืนยันคำขอสำเร็จ',
              ephemeral: true,
            });

            let Interguild = await this.client.guilds.fetch(
              '1229834103872946247',
            );
            console.log('Interguild', Interguild);
            if (!Interguild)
              return interaction.reply({
                content: 'ไม่สามารถเข้าถึงดิสกิลด์ได้',
                ephemeral: true,
              });
            const owner = await Interguild?.members.fetch(report.ownerId);
            console.log('owner', owner);
            owner?.roles.add('1286604569744375850').catch(() => {
              console.log('Failed to add role to owner');
            });

            membersList.forEach(async (id) => {
              const member = await Interguild?.members.fetch(id);
              if (member) {
                console.log('member', member);
                member.roles.add(`1286604609908903946`).catch(() => {
                  console.log(`Failed to add role to member ${id}`);
                });
                member.roles
                  .add(res.role as Role)
                  .catch(() => {
                    console.log(`Failed to add role to member ${id}`);
                  })
                  .then(() => {});
                member
                  .send({
                    content: `🎉 ยินดีด้วย! กิลด์ ${report.guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว`,
                  })
                  .catch(() => {
                    console.log(`Failed to send message to member ${id}`);
                  });
              }
            });

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
          })
          .catch((error) => {
            interaction.reply({
              content: 'เกิดข้อผิดพลาดในการยืนยันคำขอ โปรดลองอีกครั้ง',
              ephemeral: true,
            });
          });
      } else {
        await this.prisma.guildCreateReport.update({
          data: { members: { push: interaction.user.id } },
          where: { id: reportId },
        });

        interaction.reply({
          content: 'ยืนยันคำขอสำเร็จ',
          ephemeral: true,
        });
        interaction.message.delete().catch(() => {
          console.log('Failed to delete interaction message');
        });

        this.updateMessage(report.channelId, report.messageId, report.guildName, [
          ...report.members,
          interaction.user.id,
        ]);
      }
    } catch (error) {
      interaction.reply({
        content: 'เกิดข้อผิดพลาดในการยืนยันคำขอ โปรดลองอีกครั้ง',
        ephemeral: true,
      });
    }
  }

  async deleteData(guild: Guild) {
    await this.prisma.guild.delete({ where: { id: guild.id } }).catch(() => {
      console.log(`Failed to delete guild: ${guild.id}`);
    });
    await this.prisma.guildMembers
      .deleteMany({ where: { guildId: guild.id } })
      .catch(() => {
        console.log(`Failed to delete guild members for guild: ${guild.id}`);
      });
  }

  async updateMessage(
    channelId: string,
    messageId: string,
    guildName: string,
    members: string[],
  ) {
    this.client.channels
      .fetch(channelId)
      .then(async (channel) => {
        if (!channel) return;
        let ch = channel as TextChannel | VoiceChannel;
        const message = await ch.messages.fetch(messageId);
        if (!message) return;

        if (members.length >= 4) {
          // Guild created
          message
            .edit({
              embeds: [
                new EmbedBuilder(message.embeds[0].toJSON())
                  .setTitle(
                    `#🎉 กิลด์ ${guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว`,
                  )
                  .setColor('Gold'),
              ],
            })
            .catch(() => {
              console.log('Failed to edit message');
            });
        } else {
          // Progress update
          message
            .edit({
              embeds: [
                new EmbedBuilder(message.embeds[0].toJSON()).setTitle(
                  `# ความคืบหน้า (${members.length}/4) ของกิลด์ ${guildName}`,
                ),
              ],
            })
            .catch(() => {
              console.log('Failed to edit progress message');
            });
        }
      })
      .catch(() => {
        console.log('Failed to fetch channel or message');
      });
  }

  async createGuild(
    guildName: string,
    guildId: any = null,
  ): Promise<{
    role: Role | undefined;
    message: string;
  }> {
    let guildServer = await this.client.guilds
      .fetch('1229834103872946247')
      .catch((error) => {
        this.logger.error('Failed to fetch guild:', error);
        return undefined;
      });

    if (!guildServer) {
      return {
        role: undefined,
        message: 'ไม่สามารถเข้าถึงดิสกิลด์ได้',
      };
    }

    let positionRole = guildServer.roles.cache.get('1232782889616146443');
    return new Promise((resolve, rejects) => {
      guildServer.roles
        .create({
          name: `🕍 ${guildName}`,
          position: positionRole ? positionRole.position + 1 : undefined,
          color: '#A4F1FF',
        })
        .then(async (roles) => {
          if (!roles)
            return resolve({
              role: undefined,
              message: 'ไม่สามารถสร้างบทบาท กิลด์ของคุณได้',
            });
          return resolve({
            role: roles,
            message: await this.createChannel(roles),
          });
        })
        .catch((error) => {
          return resolve({
            role: undefined,
            message: 'ไม่สามารถสร้างห้องกิลด์ได้',
          });
        });
    });
  }

  private async createChannel(roles: Role): Promise<string> {
    try {
      let guildServer = await this.client.guilds
        .fetch('1229834103872946247')
        .catch((error) => {
          this.logger.error('Failed to fetch guild:', error);
          return undefined;
        });

      if (!guildServer) {
        return 'ไม่สามารถเข้าถึงดิสกิลด์ได้';
      }

      const positionGuild = guildServer.channels.cache.get(
        '1230547534200443023',
      ) as CategoryChannel;

      const category = await guildServer.channels.create({
        name: roles.name,
        type: ChannelType.GuildCategory,
        position: positionGuild ? positionGuild.position + 1 : undefined,
        permissionOverwrites: [
          {
            id: '1229834103872946247',
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
        return 'ไม่สามารถสร้างห้องหมวดหมู่กิลด์ได้';
      }

      const createVoiceChannel = async (
        name: string,
        state = 0,
        publicView = false,
      ) => {
        const voiceChannel = await category.children.create({
          type:
            state == 0
              ? ChannelType.GuildVoice
              : state == 1
              ? ChannelType.GuildStageVoice
              : ChannelType.GuildText,
          name,
          permissionOverwrites: publicView
            ? [
                {
                  id: '1229840434914918452',
                  allow: ['ViewChannel', 'Connect'],
                },
              ]
            : undefined,
        });
        if (!voiceChannel) {
          if (category.children.cache.size > 0) {
            category.children.cache.forEach((c) => {
              c.delete().catch(() => {});
            });
          }
          category.delete().catch(() => {});
          throw new Error(`ไม่สามารถสร้างห้อง ${name} ได้`);
        }

        return voiceChannel;
      };

      await Promise.all([
        createVoiceChannel('💬・แชท', 2),
        createVoiceChannel('🎤・โถงหลัก', 0),
        createVoiceChannel('🎤・โถงรอง', 0),
        createVoiceChannel('🎁・เยี่ยมบ้าน', 0, true),
        createVoiceChannel('👑・กิจกรรมกิลด์', 1, true),
      ]);

      return 'success';
    } catch (error: any) {
      return error.message || 'เกิดข้อผิดพลาดในการสร้างห้อง';
    }
  }
}

export interface UserProfile extends UserDB {
  GuildMembers: GuildMembers[];
  wallet: Wallet | null;
}
