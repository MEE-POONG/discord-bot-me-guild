import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  Guild,
  CacheType,
  TextChannel,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Context, StringSelect, StringSelectContext } from 'necord';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';
import { ServerSetRoomDto } from './dto/length.dto';

@Injectable()
export class ServerSetRoomService {
  private readonly logger = new Logger(ServerSetRoomService.name);
  private roomName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) { }

  public onModuleInit() {
    this.logger.log('ServerSetRoomService initialized');
  }

  // Step 1: Display Select Menu
  async ServerSetRoomSystem(interaction: any, options: ServerSetRoomDto) {
    this.roomName = options.roomName;

    const validationError = await validateServerAndRole(
      interaction,
      'owner',
      this.serverRepository,
    );
    if (validationError) return validationError;

    const server = await this.serverRepository.getServerById(interaction.guildId);
    if (!server) {
      return this.replyError(interaction, '❌ ไม่พบข้อมูลเซิร์ฟเวอร์ โปรดตรวจสอบอีกครั้ง!');
    }

    const roomSelectionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('SELECT_MENU_ROOM_TYPE')
        .setPlaceholder('เลือกบทบาทที่ต้องการจัดการ')
        .addOptions([
          { label: 'Welcome Room', value: 'welcome', description: 'สร้างห้อง Welcome' },
          { label: 'Register Room', value: 'register', description: 'สร้างห้อง Register' },
          // { label: 'News Room', value: 'news', description: 'สร้างห้อง News' },
          { label: 'GameMatch Room', value: 'gamematch', description: 'สร้างห้อง GameMatch' },
        ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 เลือกประเภทห้องที่ต้องการสร้าง')
          .setDescription(
            `กรุณาเลือกประเภทห้องที่คุณต้องการจากรายการ:\n` +
            `- **Welcome Room**: ห้องสำหรับต้อนรับสมาชิกใหม่\n` +
            `- **Register Room**: ห้องสำหรับฟอร์มลงทะเบียนระบบ MeGuild\n` +
            `- **GameMatch Room**: ห้องแจ้งเตือนการจับคู่เกม`,
          )
          .setColor(0x00bfff),
      ],
      components: [roomSelectionRow],
      ephemeral: true,
    });

  }

  @StringSelect('SELECT_MENU_ROOM_TYPE')
  public async handleRoomRegistration(@Context() [interaction]: StringSelectContext) {
    // getServerById
    const server = await this.serverRepository.getServerById(interaction.guildId);
    if (!server) return this.replyError(interaction, '❌ ไม่พบข้อมูลเซิร์ฟเวอร์');

    const roomType = interaction.values[0];
    const roomFieldMapping = {
      welcome: 'welcomechannel',
      register: 'registerChannel',
      // news: 'newsChannel',
      gamematch: 'gameChannel',
    };

    const existingChannel = interaction.guild.channels.cache.find(
      channel => channel.id === server[roomFieldMapping[roomType]]
    );

    if (existingChannel) {
      // หากพบห้อง ให้หยุดการทำงานและแจ้งเตือนผู้ใช้
      return this.replyStopCreate(interaction, roomType, existingChannel.name);
    }

    const newRoom = await interaction.guild.channels.create({ name: this.roomName });
    if (roomType === 'register') {
      await this.createRegistrationMessage(newRoom); // เรียกฟังก์ชันส่งข้อความ
    }
    try {
      await this.serverRepository.updateServer(newRoom.guild.id, {
        [roomFieldMapping[roomType]]: newRoom.id,
      });
      return this.replySuccess(interaction, roomType);
    } catch (error) {
      this.logger.error(`Error updating server room: ${error.message}`);
      return this.replyError(interaction, '❌ เกิดข้อผิดพลาดระหว่างการสร้างบทบาท');
    }
  }

  private createRegistrationMessage(channel: TextChannel) {
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

    return channel.send({
      embeds: [embeds],
      components: [actionRow],
    });
  }
  private createGameCenterMessage(channel: TextChannel) {
    const embeds = new EmbedBuilder()
      .setTitle('𝑴𝒆𝑮𝒖𝒊𝒍𝒅 𝑮𝒂𝒎𝒆𝒔 𝑪𝒆𝒏𝒕𝒆𝒓')
      .setColor(10513407) // ใช้ค่าจากสีเดิม
      .setImage(
        'https://media.discordapp.net/attachments/855643137716650015/1287768914490691627/DALLE_2024-09-23_20.33.10_-_A_vibrant_fantasy-themed_banner_with_the_text_Game_Center_displayed_prominently._The_background_includes_a_magical_battlefield_scene_with_elements_l.webp?ex=66f2bfc2&is=66f16e42&hm=e3f5bf29bc2d01cd93f4868ac6c2d655ee4893c90ecffa3b6bb5f01cae705147&=&animated=true&width=840&height=480',
      )
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/6521/6521996.png');

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId("create-game-match")
        .setEmoji("🎮")
        .setLabel("สร้างการจับคู่เกม")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("join-game-match")
        .setEmoji("🎎")
        .setLabel("เข้าร่วมเกมธรรมดา")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("join-game-match-rank")
        .setEmoji("🏆")
        .setLabel("เข้าร่วมเกมแรงค์")
        .setStyle(ButtonStyle.Primary
        ),
    );

    return channel.send({
      embeds: [embeds],
      components: [actionRow],
    });
  }


  private replyStopCreate(
    interaction: StringSelectMenuInteraction<CacheType>,
    roomType: string,
    existingChannelName: string,
  ) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่สามารถสร้างห้องใหม่ได้')
          .setDescription(
            `ห้อง **${roomType.toUpperCase()}** มีอยู่แล้วในเซิร์ฟเวอร์:\n` +
            `**${existingChannelName}**\n` +
            `หากต้องการสร้างใหม่ กรุณาลบห้องนี้ก่อน`,
          )
          .setColor(0xffa500),
      ],
      ephemeral: true,
    });
  }

  private replyError(interaction: any, message: string) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ เกิดข้อผิดพลาด')
          .setDescription(message)
          .setFooter({ text: 'โปรดติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่' })
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  private replySuccess(interaction: StringSelectMenuInteraction<CacheType>, roomType: string) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ การสร้างห้องสำเร็จ')
          .setDescription(
            `🎉 ห้อง **${this.roomName}** สำหรับประเภท **${roomType.toUpperCase()}** ถูกสร้างและบันทึกเรียบร้อยแล้ว!`,
          )
          .setColor(0x00ff00),
      ],
      ephemeral: true,
    });
  }
}
