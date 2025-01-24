import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  TextChannel,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
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
  ) {}

  public onModuleInit() {
    this.logger.log('ServerSetRoomService initialized');
  }

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
          { label: 'News Room', value: 'news', description: 'สร้างห้อง News' },
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
    const server = await this.serverRepository.getServerById(interaction.guildId);
    if (!server) return this.replyError(interaction, '❌ ไม่พบข้อมูลเซิร์ฟเวอร์');

    const roomType = interaction.values[0];
    const roomFieldMapping = this.getRoomFieldMapping();
    const defaultRoomNames = this.getDefaultRoomNames();

    const existingChannel = interaction.guild.channels.cache.find(
      (channel) => channel.id === server[roomFieldMapping[roomType]],
    );

    if (existingChannel) {
      return this.replyStopCreate(interaction, roomType, existingChannel.name);
    }

    try {
      if (roomType === 'gamematch') {
        await this.createGameMatchRooms(interaction, defaultRoomNames);
      } else {
        await this.createSingleRoom(interaction, roomType, defaultRoomNames, roomFieldMapping);
      }
    } catch (error) {
      this.logger.error(`Error creating room: ${error.message}`);
      return this.replyError(interaction, '❌ เกิดข้อผิดพลาดระหว่างการสร้างห้อง');
    }
  }

  private getRoomFieldMapping() {
    return {
      welcome: 'welcomechannel',
      register: 'registerChannel',
      gamematch: 'gameChannel',
      gamebtn: 'gamebtnChannel',
    };
  }

  private getDefaultRoomNames() {
    return {
      welcome: '🚪𝒘𝒆𝒍𝒄𝒐𝒎𝒆',
      register: '🧾︰ลงทะเบียน',
      news: '📢︰ประกาศ-discord',
      gamematch: '👼︰หาปาร์ตี้เล่นเกม',
      gamebtn: '💬︰หาห้องเกม',
    };
  }

  private async createSingleRoom(
    interaction: StringSelectMenuInteraction<CacheType>,
    roomType: string,
    defaultRoomNames: any,
    roomFieldMapping: any,
  ) {
    const newRoom = await interaction.guild.channels.create({
      name: defaultRoomNames[roomType],
      type: 0,
    });

    await this.serverRepository.updateServer(interaction.guildId, {
      [roomFieldMapping[roomType]]: newRoom.id,
    });

    if (roomType === 'register') {
      await this.createRegistrationMessage(newRoom);
    }

    return this.replySuccess(interaction, roomType);
  }

  private async createGameMatchRooms(
    interaction: StringSelectMenuInteraction<CacheType>,
    defaultRoomNames: any,
  ) {
    const gameBtnChannel = await interaction.guild.channels.create({
      name: defaultRoomNames['gamebtn'],
      type: 0,
    });

    const gameChannel = await interaction.guild.channels.create({
      name: defaultRoomNames['gamematch'],
      type: 2,
    });

    await this.serverRepository.updateServer(interaction.guildId, {
      gamebtnChannel: gameBtnChannel.id,
      gameChannel: gameChannel.id,
    });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ การสร้างห้องสำเร็จ')
          .setDescription(
            `🎉 ห้อง **${defaultRoomNames['gamebtn']}** และ **${defaultRoomNames['gamematch']}** ถูกสร้างและบันทึกเรียบร้อยแล้ว!`,
          )
          .setColor(0x00ff00),
      ],
      ephemeral: true,
    });
  }

  private async createRegistrationMessage(channel: TextChannel) {
    const embed = new EmbedBuilder()
      .setTitle('ลงทะเบียนนักผจญภัย')
      .setDescription('- กรอกข้อมูลเพื่อนสร้างโปรไฟล์นักผจญภัยของคุณ คลิก "ลงทะเบียน"')
      .setColor(16760137)
      .setFooter({ text: 'ข้อมูลของคุณจะถูกเก็บเป็นความลับ' })
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/6521/6521996.png');

    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId('register-button')
        .setEmoji('📝')
        .setLabel('ลงทะเบียน')
        .setStyle(ButtonStyle.Primary),
    );

    return channel.send({ embeds: [embed], components: [actionRow] });
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
