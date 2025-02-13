import { Injectable, Logger } from '@nestjs/common';
import { UserDB } from '@prisma/client';
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

  ) { }
  public onModuleInit() {
    this.logger.log('FormRegisterService initialized');
  }

  async createRegistrationMessage(interaction: any) {
    try {
      // ดึงข้อมูลเซิร์ฟเวอร์จากฐานข้อมูล
      const server = await this.prisma.serverDB.findUnique({
        where: { serverId: interaction.guildId },
      });

      // ตรวจสอบว่ามี registerChannel เก่าหรือไม่
      if (server?.registerChannel) {
        const oldChannel = await interaction.guild?.channels.fetch(server.registerChannel).catch(() => null);
        if (oldChannel) {
          await oldChannel.delete().catch((e) => {
            this.logger.warn(`ไม่สามารถลบห้องเก่าได้: ${e.message}`);
          });
        }
      }

      // บันทึกห้องใหม่ที่ใช้คำสั่งลง registerChannel
      await this.prisma.serverDB.update({
        where: { serverId: interaction.guildId },
        data: { registerChannel: interaction.channelId },
      });

      // สร้าง Embed ข้อความลงทะเบียน
      const embeds = new EmbedBuilder()
        .setTitle('ห้องทะเบียนนักผจญภัย')
        .setDescription('- กรอกข้อมูลเพื่อนสร้างโปรไฟล์นักผจญภัยของคุณ คลิก "ลงทะเบียน"')
        .setColor(16760137)
        .setFooter({
          text: 'ข้อมูลของคุณจะถูกเก็บเป็นความลับ',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/4104/4104800.png',
        })
        .setImage(
          'https://media.discordapp.net/attachments/1222826027445653536/1222826136359276595/registerguild.webp?ex=6617a095&is=66052b95&hm=17dfd3921b25470b1e99016eb9f89dd68fb1ada3481867d145c8acf81e25cec6&=&format=webp&width=839&height=400',
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/6521/6521996.png');

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
    const checkUser = interaction.member as GuildMember;
    const userDB = await this.prisma.userDB.findFirst({
      where: {
        OR: [
          { discord_id: interaction.user.id },
        ],
      },
    });

    if (userDB) {
      const server = await this.serverRepository.getServerById(interaction.guildId);
      const member = interaction.member as GuildMember;

      // 🔍 ตรวจสอบว่าผู้ใช้มี Role อยู่หรือไม่
      const hasRoles = member.roles.cache.size > 1; // มากกว่า 1 เพราะทุกคนมี @everyone role

      // ✅ ถ้าไม่มี Role หรือออกจากเซิร์ฟแล้วกลับมาใหม่ ให้มอบ Role ที่เคยมีให้
      if (!hasRoles) {
        if (server.visitorRoleId) {
          await member.roles.remove(server.visitorRoleId).catch((e) => {
            console.log(`⚠️ ไม่สามารถลบ Visitor Role: ${e.message}`);
          });
        }

        if (server.adventurerRoleId) {
          await member.roles.add(server.adventurerRoleId).catch((e) => {
            console.log(`⚠️ ไม่สามารถเพิ่ม Adventurer Role: ${e.message}`);
          });
        }
      }

      // ✅ แสดงโปรไฟล์ของผู้ใช้ที่มีอยู่ในระบบ
      return this.showProfile(interaction, userDB);
    }

    try {
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
        );

      await interaction.showModal(modal);
    } catch (error) {
      console.error('Error displaying registration modal:', error);
      return interaction.reply({
        content: 'ไม่สามารถแสดงแบบฟอร์มการลงทะเบียนได้',
        ephemeral: true,
      });
    }
  }

  @Modal('register-modal')
  async registerModalSubmit(@Context() [interaction]: ModalContext) {
    let nickname = interaction.fields.getTextInputValue('nickname');
    let firstname = interaction.fields.getTextInputValue('firstname');
    let lastname = interaction.fields.getTextInputValue('lastname');
    let email = interaction.fields.getTextInputValue('email');
    let member = interaction.member as GuildMember;

    if (!isValidEmail(email)) {
      return interaction.reply({
        content: 'รูปแบบอีเมลไม่ถูกต้อง',
        ephemeral: true,
      });
    }

    try {
      const user = await this.prisma.userDB.findFirst({
        where: {
          OR: [
            { nickname: nickname },
            { email: email },
            { discord_id: interaction.user.id },
          ],
        },
      });

      if (user) {
        return interaction.reply({
          content: 'เกิดข้อผิดพลาด',
          ephemeral: true,
        });
      }
      const now = new Date();
      const schema = {
        discord_id: interaction.user.id,
        email: email,
        nickname: nickname,
        birthday: new Date('01/01/1980'),
        firstname: firstname,
        lastname: lastname,
        createdAt: now,
        createdBy: 'system', // หรือ interaction.user.id
        updatedAt: now,
        updatedBy: 'system', // หรือ interaction.user.id
        deleteBy: '', // ค่าเริ่มต้นเป็นค่าว่าง
      };

      const data = await this.prisma.userDB.create({
        data: schema,
      });

      const server = await this.serverRepository.getServerById(interaction.guildId);
      this.showProfile(interaction, data);
      if (server.visitorRoleId) {
        await member.roles.remove(server.visitorRoleId).catch((e) => {
        });
      }

      if (server.adventurerRoleId) {
        await member.roles.add(server.adventurerRoleId).catch((e) => {
        });
      }
    } catch (err) {
      this.logger.error('ไม่สามารถตรวจสอบข้อมูลสมาชิกได้', err);
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
    try {
      const embeds = new EmbedBuilder()
        .setAuthor({
          name: `ลงทะเบียนนักผจญภัยสำเร็จ | ${interaction.guild?.name}`,
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
            value: `${profile.birthday}`,
            inline: true,
          },
          {
            name: 'อีเมล',
            value: `${profile.email}`,
            inline: true,
          },
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor('#a0ff71');

      interaction.reply({
        embeds: [embeds],
        ephemeral: true,
      });
    } catch (error) {
      interaction.reply({
        content: 'ไม่สามารถแสดงข้อมูลสมาชิกได้',
        ephemeral: true,
      });
      this.logger.error('ไม่สามารถแสดงข้อมูลสมาชิกได้', error);
    }
  }
}
