import { Injectable, Logger } from '@nestjs/common';
import { Context, On, ContextOf, SlashCommand, SlashCommandContext } from 'necord';
import { AttachmentBuilder, GuildMember, TextBasedChannel } from 'discord.js';
import { ServerRepository } from 'src/repository/server';
import axios from 'axios';
@Injectable()
export class WelcomeUpdate {
  private readonly logger = new Logger(WelcomeUpdate.name);
  constructor(private readonly serverRepository: ServerRepository) {}

  @On('guildMemberAdd')
  public async onGuildMemberAdd(@Context() [member]: ContextOf<'guildMemberAdd'>) {
    this.logger.debug(
      `New member joined: ${member.user.tag} (${member.user.id}) in guild: ${member.guild.name}`,
    );

    try {
      // Auto-assign visitor role
      await this.assignVisitorRole(member);

      // ส่งข้อความต้อนรับ
      await this.sendWelcomeMessage(member);
    } catch (error) {
      this.logger.error('Failed to handle guild member add', error);
    }
  }

  private async assignVisitorRole(member: GuildMember) {
    try {
      const server = await this.serverRepository.getServerById(member.guild.id);

      if (!server) {
        this.logger.warn(`Server data not found for guild: ${member.guild.id}`);
        return;
      }

      // ตรวจสอบว่าผู้ใช้เคยลงทะเบียนแล้วหรือไม่
      const isRegistered = await this.checkUserRegistration(member.user.id);

      if (isRegistered) {
        // ถ้าเคยลงทะเบียนแล้ว ให้บทบาท adventurer
        if (server.adventurerRoleId) {
          const adventurerRole = member.guild.roles.cache.get(server.adventurerRoleId);

          if (adventurerRole) {
            await member.roles.add(adventurerRole);
            this.logger.log(
              `✅ Added adventurer role to registered user ${member.user.tag} in ${member.guild.name}`,
            );
          } else {
            this.logger.warn(`Adventurer role not found in Discord: ${server.adventurerRoleId}`);
            // ถ้าไม่พบ adventurer role ให้ visitor role แทน
            await this.assignVisitorRoleFallback(member, server);
          }
        } else {
          this.logger.warn(
            `No adventurerRoleId found in server data for guild: ${member.guild.id}`,
          );
          // ถ้าไม่มี adventurer role ให้ visitor role แทน
          await this.assignVisitorRoleFallback(member, server);
        }
      } else {
        // ถ้ายังไม่เคยลงทะเบียน ให้บทบาท visitor
        await this.assignVisitorRoleFallback(member, server);
      }
    } catch (error) {
      this.logger.error(`Error assigning role to ${member.user.tag}:`, error);
    }
  }

  private async assignVisitorRoleFallback(member: GuildMember, server: any) {
    // ให้บทบาท visitor เป็น fallback สำหรับทุกคน
    if (server.visitorRoleId) {
      const visitorRole = member.guild.roles.cache.get(server.visitorRoleId);

      if (visitorRole) {
        await member.roles.add(visitorRole);
        this.logger.log(`✅ Added visitor role to user ${member.user.tag} in ${member.guild.name}`);
      } else {
        this.logger.warn(`Visitor role not found in Discord: ${server.visitorRoleId}`);
      }
    } else {
      this.logger.warn(`No visitorRoleId found in server data for guild: ${member.guild.id}`);
    }
  }

  private async checkUserRegistration(userId: string): Promise<boolean> {
    try {
      // ตรวจสอบในฐานข้อมูลว่าผู้ใช้เคยลงทะเบียนแล้วหรือไม่
      // ใช้ PrismaService เพื่อตรวจสอบ UserData
      const { PrismaService } = await import('../prisma.service');
      const prisma = new PrismaService();

      const userData = await prisma.userDB.findFirst({
        where: { discord_id: userId },
      });

      await prisma.$disconnect();

      return !!userData; // return true ถ้าพบข้อมูลผู้ใช้
    } catch (error) {
      this.logger.error(`Error checking user registration for ${userId}:`, error);
      return false; // ถ้าเกิด error ให้ถือว่าไม่เคยลงทะเบียน
    }
  }

  private async sendWelcomeMessage(member: GuildMember) {
    try {
      const buffer = await axios({
        method: 'POST',
        url: 'https://me-draw.me-prompt-technology.com/draw/image-me-guild-welcome',
        data: {
          displayName: member.displayName,
          avatar: member.user.displayAvatarURL({ extension: 'png' }),
        },
        responseType: 'arraybuffer',
      });

      const server = await this.serverRepository.getServerById(member.guild.id);
      if (!server) {
        this.logger.warn(`Server with ID ${member.guild.id} is not registered in the database.`);
        return;
      }

      if (!server.welcomechannel) {
        this.logger.warn(`No welcome channel configured for server ID ${member.guild.id}`);
        return;
      }
      const channel = (await member.guild.channels.fetch(
        server.welcomechannel,
      )) as TextBasedChannel;
      if (channel && channel.isTextBased() && 'send' in channel) {
        await channel.send({
          files: [new AttachmentBuilder(buffer.data, { name: 'welcome.png' })],
          content: `🎉 ยินดีต้อนรับ ${member.toString()} เข้าสู่เซิร์ฟเวอร์!`,
        });
      } else {
        this.logger.warn(`The channel is not text-based or does not support sending messages.`);
      }
    } catch (error) {
      this.logger.error('Failed to send welcome message', error);
    }
  }

  // ฟังก์ชันสำหรับเปลี่ยน role จาก visitor เป็น adventurer
  async promoteToAdventurer(member: GuildMember, guildId: string) {
    this.logger.debug(`Promoting ${member.user.tag} to adventurer in guild: ${guildId}`);

    try {
      // ดึงข้อมูล server
      const server = await this.serverRepository.getServerById(guildId);

      if (!server) {
        this.logger.warn(`Server data not found for guild: ${guildId}`);
        return false;
      }

      // ตรวจสอบ visitorRoleId และ adventurerRoleId
      if (!server.visitorRoleId || !server.adventurerRoleId) {
        this.logger.warn(`Missing role IDs in server data for guild: ${guildId}`);
        return false;
      }

      const visitorRole = member.guild.roles.cache.get(server.visitorRoleId);
      const adventurerRole = member.guild.roles.cache.get(server.adventurerRoleId);

      if (!visitorRole || !adventurerRole) {
        this.logger.warn(`Roles not found in Discord for guild: ${guildId}`);
        return false;
      }

      // ลบ visitor role และเพิ่ม adventurer role
      if (member.roles.cache.has(visitorRole.id)) {
        await member.roles.remove(visitorRole);
        this.logger.log(`Removed visitor role from ${member.user.tag}`);
      }

      await member.roles.add(adventurerRole);
      this.logger.log(`Added adventurer role to ${member.user.tag}`);

      return true;
    } catch (error) {
      this.logger.error(`Error promoting ${member.user.tag} to adventurer:`, error);
      return false;
    }
  }

  // ฟังก์ชันสำหรับเปลี่ยน role จาก adventurer เป็น visitor (กรณีต้องการ downgrade)
  async demoteToVisitor(member: GuildMember, guildId: string) {
    this.logger.debug(`Demoting ${member.user.tag} to visitor in guild: ${guildId}`);

    try {
      // ดึงข้อมูล server
      const server = await this.serverRepository.getServerById(guildId);

      if (!server) {
        this.logger.warn(`Server data not found for guild: ${guildId}`);
        return false;
      }

      // ตรวจสอบ visitorRoleId และ adventurerRoleId
      if (!server.visitorRoleId || !server.adventurerRoleId) {
        this.logger.warn(`Missing role IDs in server data for guild: ${guildId}`);
        return false;
      }

      const visitorRole = member.guild.roles.cache.get(server.visitorRoleId);
      const adventurerRole = member.guild.roles.cache.get(server.adventurerRoleId);

      if (!visitorRole || !adventurerRole) {
        this.logger.warn(`Roles not found in Discord for guild: ${guildId}`);
        return false;
      }

      // ลบ adventurer role และเพิ่ม visitor role
      if (member.roles.cache.has(adventurerRole.id)) {
        await member.roles.remove(adventurerRole);
        this.logger.log(`Removed adventurer role from ${member.user.tag}`);
      }

      await member.roles.add(visitorRole);
      this.logger.log(`Added visitor role to ${member.user.tag}`);

      return true;
    } catch (error) {
      this.logger.error(`Error demoting ${member.user.tag} to visitor:`, error);
      return false;
    }
  }

  @SlashCommand({
    name: 'test-welcome',
    description: 'ตั้งค่าสำหรับการส่งข้อความยินดีต้อนรับ',
  })
  public async welcomeCommand(@Context() [interaction]: SlashCommandContext) {
    await this.onGuildMemberAdd([interaction.member as GuildMember]);
  }
}
