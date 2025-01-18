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
import { isValidEmail } from 'src/utils/validEmail';

@Injectable()
export class FormRegisterService {
  private readonly logger = new Logger(FormRegisterService.name);
  constructor(private readonly prisma: PrismaService) {}
  public onModuleInit() {
    this.logger.log('FormRegisterService initialized');
  }

  async createRegistrationMessage(interaction: any) {
    const embeds = new EmbedBuilder()
      .setTitle('ลงทะเบียนนักผจญภัย')
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
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/6521/6521996.png');

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId('register-button')
        .setEmoji('📝')
        .setLabel('ลงทะเบียน')
        .setStyle(ButtonStyle.Primary),
    );

    const channel = interaction.channel as TextChannel;
    return channel.send({
      embeds: [embeds],
      components: [actionRow],
    });
  }

  @Button('register-button')
  async registerModal(@Context() [interaction]: ButtonContext) {
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
          content: 'ชื่อผู้ใช้งาน หรือ ข้อมูลนี้มีอยู่ในระบบแล้ว',
          ephemeral: true,
        });
      }

      const schema = {
        discord_id: interaction.user.id,
        email: email,
        nickname: nickname,
        deleteBy: '',
        birthday: new Date('01/01/1980'),
        firstname: firstname,
        lastname: lastname,
        updatedBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const data = await this.prisma.userDB.create({
        data: schema,
      });

      this.showProfile(interaction, data);
      await member.roles.remove('1229840227820896257').catch((e) => {});
      await member.roles.add('1229840434914918452').catch((e) => {});
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
