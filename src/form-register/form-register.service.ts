import { Injectable, Logger } from '@nestjs/common';
import { UserDB } from '@prisma/client';
import axios from 'axios';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  GuildMember,
  ModalSubmitInteraction,
} from 'discord.js';
import { Button, ButtonContext, Context, Modal, ModalContext } from 'necord';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { isValidEmail } from 'src/utils/validEmail';

@Injectable()
export class FormRegisterService {
  private readonly logger = new Logger(FormRegisterService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}
  public onModuleInit() {
    this.logger.log('FormRegisterService initialized');
  }

  async createRegistrationMessage(interaction: any) {
    this.logger.debug(
      `[createRegistrationMessage] Starting registration message creation for guild: ${interaction.guildId}`,
    );
    try {
      // ดึงข้อมูลเซิร์ฟเวอร์จากฐานข้อมูล
      const server = await this.prisma.serverDB.findUnique({
        where: { serverId: interaction.guildId },
      });
      this.logger.debug(
        `[createRegistrationMessage] Found server data: ${JSON.stringify(server)}`,
      );

      // ตรวจสอบว่ามี registerChannel เก่าหรือไม่
      if (server?.registerChannel) {
        this.logger.debug(
          `[createRegistrationMessage] Found existing register channel: ${server.registerChannel}`,
        );
        const oldChannel = await interaction.guild?.channels
          .fetch(server.registerChannel)
          .catch(() => null);
        if (oldChannel) {
          this.logger.debug(
            `[createRegistrationMessage] Attempting to delete old channel: ${oldChannel.id}`,
          );
          await oldChannel.delete().catch((e) => {
            this.logger.warn(`ไม่สามารถลบห้องเก่าได้: ${e.message}`);
          });
        }
      }

      // บันทึกห้องใหม่ที่ใช้คำสั่งลง registerChannel
      this.logger.debug(
        `[createRegistrationMessage] Updating server with new register channel: ${interaction.channelId}`,
      );
      await this.prisma.serverDB.update({
        where: { serverId: interaction.guildId },
        data: { registerChannel: interaction.channelId },
      });

      // สร้าง Embed ข้อความลงทะเบียน
      const embeds = new EmbedBuilder()
        .setTitle('ห้องทะเบียนนักผจญภัย')
        .setDescription(
          '- กรอกข้อมูลเพื่อนสร้างโปรไฟล์นักผจญภัยของคุณ คลิก "ลงทะเบียน"',
        )
        .setColor(16760137)
        .setFooter({
          text: 'ข้อมูลของคุณจะถูกเก็บเป็นความลับ',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/4104/4104800.png',
        })
        .setImage(
          'https://media.discordapp.net/attachments/1222826027445653536/1222826136359276595/registerguild.webp?ex=6617a095&is=66052b95&hm=17dfd3921b25470b1e99016eb9f89dd68fb1ada3481867d145c8acf81e25cec6&=&format=webp&width=839&height=400',
        )
        .setThumbnail(
          'https://cdn-icons-png.flaticon.com/512/6521/6521996.png',
        );

      // สร้างปุ่มลงทะเบียน
      const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
          .setCustomId('register-button')
          .setEmoji('📝')
          .setLabel('ลงทะเบียนนักผจญภัย')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('register-guild')
          .setEmoji('📝')
          .setLabel('ลงทะเบียนกิลล์')
          .setStyle(ButtonStyle.Primary),
      );

      // ส่ง Embed ลงทะเบียนไปยังห้องที่ใช้คำสั่ง
      const channel = interaction.channel as TextChannel;
      return channel.send({
        embeds: [embeds],
        components: [actionRow],
      });
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดในการสร้างข้อความลงทะเบียน', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาดในการสร้างข้อความลงทะเบียน',
        ephemeral: true,
      });
    }
  }

  @Button('register-button')
  async registerModal(@Context() [interaction]: ButtonContext) {
    this.logger.debug(
      `[registerModal] Button clicked by user: ${interaction.user.id}`,
    );
    const checkUser = interaction.member as GuildMember;

    const userDB = await this.prisma.userDB.findFirst({
      where: {
        OR: [{ discord_id: interaction.user.id }],
      },
    });
    this.logger.debug(
      `[registerModal] User DB check result: ${JSON.stringify(userDB)}`,
    );

    try {
      this.logger.debug(`[registerModalSubmit] Creating wallet account`);
      await axios({
        method: 'POST',
        url: 'https://me-coins-wallet.me-prompt-technology.com/api/auth/register',
          data: {
            email: interaction.user.username.toString().toLowerCase() + '@discord.com',
            username: interaction.user.username.toString().toLowerCase(),
            avatar: interaction.user.displayAvatarURL(),
            discordId: interaction.user.id,
            password: 'password123',
          },
      });
      this.logger.debug(
        `[registerModalSubmit] Wallet account created successfully`,{
          email: interaction.user.username.toString().toLowerCase() + '@discord.com',
          username: interaction.user.username.toString().toLowerCase(),
          avatar: interaction.user.displayAvatarURL(),
          discordId: interaction.user.id,
          password: 'password123',
        }
      );
    } catch (error) {
      this.logger.error(
        '[registerModalSubmit] ไม่สามารถสร้างบัญชีในเป๋าตังได้',
        error.response?.data || error,
      );
    }
    if (userDB) {
      this.logger.debug(`[registerModal] Existing user found, checking roles`);
      const server = await this.serverRepository.getServerById(
        interaction.guildId,
      );
      const member = interaction.member as GuildMember;

      // 🔍 ตรวจสอบว่าผู้ใช้มี Role อยู่หรือไม่
      const hasRoles = member.roles.cache.size > 1;
      this.logger.debug(`[registerModal] User has roles: ${hasRoles}`);

      // ✅ ถ้าไม่มี Role หรือออกจากเซิร์ฟแล้วกลับมาใหม่ ให้มอบ Role ที่เคยมีให้
      if (!hasRoles) {
        this.logger.debug(`[registerModal] Adding roles to user`);
        if (server.visitorRoleId) {
          await member.roles.remove(server.visitorRoleId).catch((e) => {
            this.logger.warn(`⚠️ ไม่สามารถลบ Visitor Role: ${e.message}`);
          });
        }

        if (server.adventurerRoleId) {
          await member.roles.add(server.adventurerRoleId).catch((e) => {
            this.logger.warn(`⚠️ ไม่สามารถเพิ่ม Adventurer Role: ${e.message}`);
          });
        }
      }

      // ✅ แสดงโปรไฟล์ของผู้ใช้ที่มีอยู่ในระบบ
      return this.showProfile(interaction, userDB);
    }

    try {
      this.logger.debug(
        `[registerModal] Creating registration modal for new user`,
      );
      const createTextInput = (
        customId: string,
        label: string,
        placeholder: string,
        minLength: number,
        maxLength: number,
      ) =>
        new TextInputBuilder()
          .setCustomId(customId)
          .setLabel(label)
          .setPlaceholder(placeholder)
          .setMinLength(minLength)
          .setMaxLength(maxLength)
          .setRequired(true)
          .setStyle(TextInputStyle.Short);

      const modal = new ModalBuilder()
        .setCustomId('register-modal')
        .setTitle('ลงทะเบียนนักผจญภัย')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            createTextInput('firstname', 'ชื่อ', 'โปรดระบุชื่อของคุณ', 2, 50),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            createTextInput(
              'lastname',
              'นามสกุล',
              'โปรดระบุนามสกุลของคุณ',
              2,
              50,
            ),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            createTextInput('email', 'อีเมล', 'โปรดระบุอีเมลของคุณ', 5, 100),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            createTextInput(
              'nickname',
              'นามแฝง',
              'โปรดระบุนามแฝงของคุณ',
              1,
              20,
            ),
          ),
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            createTextInput(
              'birthday',
              'วันเกิด (ค.ศ. ปี-เดือน-วัน เช่น 1997-03-27)',
              'กรอกวันเกิดในรูปแบบ YYYY-MM-DD',
              10,
              10,
            ),
          ),
        );

      await interaction.showModal(modal);
      this.logger.debug(`[registerModal] Modal displayed successfully`);
    } catch (error) {
      this.logger.error(
        '[registerModal] Error displaying registration modal:',
        error,
      );
      return interaction.reply({
        content: 'ไม่สามารถแสดงแบบฟอร์มการลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }

  @Modal('register-modal')
  async registerModalSubmit(@Context() [interaction]: ModalContext) {
    this.logger.debug(
      `[registerModalSubmit] Modal submitted by user: ${interaction.user.id}`,
    );
    let nickname = interaction.fields.getTextInputValue('nickname');
    let firstname = interaction.fields.getTextInputValue('firstname');
    let lastname = interaction.fields.getTextInputValue('lastname');
    let email = interaction.fields.getTextInputValue('email');
    let member = interaction.member as GuildMember;
    let birthdayInput = interaction.fields.getTextInputValue('birthday');
    let birthday: Date;

    this.logger.debug(
      `[registerModalSubmit] Form data received - Name: ${firstname} ${lastname}, Email: ${email}, Nickname: ${nickname}`,
    );

    try {
      birthday = new Date(birthdayInput);
      if (isNaN(birthday.getTime())) {
        this.logger.warn(
          `[registerModalSubmit] Invalid birthday format: ${birthdayInput}`,
        );
        throw new Error('Invalid date');
      }
      this.logger.debug(
        `[registerModalSubmit] Birthday parsed successfully: ${birthday}`,
      );
    } catch {
      return interaction.reply({
        content:
          'รูปแบบวันเกิดไม่ถูกต้อง (ควรกรอกเป็น YYYY-MM-DD เช่น 2008-03-27)',
        ephemeral: true,
      });
    }

    if (!isValidEmail(email)) {
      this.logger.warn(`[registerModalSubmit] Invalid email format: ${email}`);
      return interaction.reply({
        content: 'รูปแบบอีเมลไม่ถูกต้อง',
        ephemeral: true,
      });
    }

    try {
      this.logger.debug(`[registerModalSubmit] Checking for existing user`);
      const existingUser = await this.prisma.userDB.findFirst({
        where: {
          OR: [
            {
              AND: [{ firstname: firstname }, { lastname: lastname }],
            },
            { email: email },
            { nickname: nickname },
          ],
        },
      });

      if (existingUser) {
        this.logger.warn(
          `[registerModalSubmit] Found existing user: ${JSON.stringify(existingUser)}`,
        );
        let errorMessage = 'เกิดข้อผิดพลาด:';

        if (
          existingUser.firstname === firstname &&
          existingUser.lastname === lastname
        ) {
          errorMessage += '\n- มีผู้ใช้งานที่ใช้ชื่อและนามสกุลนี้แล้ว';
        }

        if (existingUser.email === email) {
          errorMessage += '\n- อีเมลนี้ถูกใช้แล้ว';
        }

        if (existingUser.nickname === nickname) {
          errorMessage += '\n- นามแฝงนี้ถูกใช้แล้ว';
        }

        return interaction.reply({
          content: errorMessage,
          ephemeral: true,
        });
      }

      this.logger.debug(`[registerModalSubmit] Creating new user record`);
      const now = new Date();
      const schema = {
        discord_id: interaction.user.id,
        email: email,
        nickname: nickname,
        birthday: birthday,
        firstname: firstname,
        lastname: lastname,
        createdAt: now,
        createdBy: 'system',
        updatedAt: now,
        updatedBy: 'system',
        deleteBy: '',
      };

      const data = await this.prisma.userDB.create({
        data: schema,
      });
      this.logger.debug(
        `[registerModalSubmit] User created successfully: ${JSON.stringify(data)}`,
      );

      const server = await this.serverRepository.getServerById(
        interaction.guildId,
      );
      this.logger.debug(`[registerModalSubmit] Updating user roles`);
      this.showProfile(interaction, data);
      if (server.visitorRoleId) {
        await member.roles.remove(server.visitorRoleId).catch((e) => {
          this.logger.warn(
            `[registerModalSubmit] Failed to remove visitor role: ${e.message}`,
          );
        });
      }

      if (server.adventurerRoleId) {
        await member.roles.add(server.adventurerRoleId).catch((e) => {
          this.logger.warn(
            `[registerModalSubmit] Failed to add adventurer role: ${e.message}`,
          );
        });
      }
    } catch (err) {
      this.logger.error(
        '[registerModalSubmit] ไม่สามารถตรวจสอบข้อมูลสมาชิกได้',
        err,
      );
      return interaction.reply({
        content: 'ไม่สามารถตรวจสอบข้อมูลสมาชิกได้',
        ephemeral: true,
      });
    }
  }

  async showProfile(
    interaction: ButtonInteraction | ModalSubmitInteraction,
    profile: UserDB,
  ) {
    this.logger.debug(
      `[showProfile] Showing profile for user: ${interaction.user.id}`,
    );
    try {
      const formattedBirthday = profile.birthday
        ? new Date(profile.birthday).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Bangkok',
          })
        : 'ไม่ระบุ';
      this.logger.debug(
        `[showProfile] Formatted birthday: ${formattedBirthday}`,
      );

      const embeds = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.guild?.name} | ข้อมูลนักผจญภัย`,
          iconURL: interaction.guild?.iconURL() ?? undefined,
        })
        .setFields(
          {
            name: 'ชื่อ - นามสกุล',
            value: `${profile.firstname} ${profile.lastname}`,
            inline: true,
          },
          {
            name: 'นามแฝง',
            value: `${profile.nickname}`,
            inline: true,
          },
          {
            name: 'วันเกิด',
            value: `${formattedBirthday}`,
            inline: true,
          },
          {
            name: 'อีเมล',
            value: `${profile.email}`,
            inline: true,
          },
          {
            name: 'ลิง์เป๋าตัง',
            value: `https://me-coins-wallet.me-prompt-technology.com`,
          },
          {
            name: 'username',
            value: interaction.user.username,
            inline: true,
          },
          {
            name: 'password',
            value: 'password123',
            inline: true,
          },
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor('#a0ff71');

      this.logger.debug(`[showProfile] Sending profile embed`);
      interaction.reply({
        embeds: [embeds],
        ephemeral: true,
      });

      setTimeout(async () => {
        try {
          this.logger.debug(
            `[showProfile] Attempting to delete profile message`,
          );
          await interaction.deleteReply();
          this.logger.debug(
            `[showProfile] Profile message deleted successfully`,
          );
        } catch (e) {
          this.logger.warn(`[showProfile] ไม่สามารถลบข้อความได้: ${e.message}`);
        }
      }, 100000);
    } catch (error) {
      this.logger.error('[showProfile] ไม่สามารถแสดงข้อมูลสมาชิกได้', error);
      interaction.reply({
        content: 'ไม่สามารถแสดงข้อมูลสมาชิกได้',
        ephemeral: true,
      });
    }
  }
}
