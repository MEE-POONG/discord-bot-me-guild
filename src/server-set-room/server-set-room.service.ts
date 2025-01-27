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

  async ServerSetRoomSystem(interaction: any) {
    await interaction.deferReply({ ephemeral: true });

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
          { label: 'News Room', value: 'news', description: 'สร้างห้อง News' },
          { label: 'Register Room', value: 'register', description: 'สร้างห้อง Register' },
          { label: 'GameMatch Room', value: 'gamematch', description: 'สร้างห้อง GameMatch' },
        ]),
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 เลือกประเภทห้องที่ต้องการสร้าง')
          .setDescription(
            `กรุณาเลือกประเภทห้องที่คุณต้องการจากรายการ:\n` +
            `- **Welcome Room**: ห้องสำหรับต้อนรับสมาชิกใหม่\n` +
            `- **News Room**: ห้องสำหรับโพสต์ข่าว MeGuild\n` +
            `- **Register Room**: ห้องสำหรับฟอร์มลงทะเบียนระบบ MeGuild\n` +
            `- **GameMatch Room**: ห้องแจ้งเตือนการจับคู่เกม`,
          )
          .setColor(0x00bfff),
      ],
      components: [roomSelectionRow],
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
      news: 'newsChannel',
      register: 'registerChannel',
      gamematch: 'gameChannel',
      gamebtn: 'gamebtnChannel',
    };
  }

  private getDefaultRoomNames() {
    return {
      welcome: '🚪︰𝑾𝒆𝒍𝒄𝒐𝒎𝒆 𝑯𝒂𝒍𝒍', // ห้องต้อนรับ
      news: '📢︰𝑵𝒆𝒘𝒔 𝑪𝒐𝒓𝒏𝒆𝒓', // ห้องข่าวสาร
      register: '🖋︰𝑹𝒆𝒈𝒊𝒔𝒕𝒓𝒂𝒕𝒊𝒐𝒏 𝑭𝒐𝒓𝒎', // ห้องลงทะเบียน
      gamematch: '🎮︰𝑮𝒂𝒎𝒆𝒓𝒔 𝑴𝒂𝒕𝒄𝒉', // ห้องจับคู่เล่นเกม
      gamebtn: '🕹︰𝑮𝒂𝒎𝒆 𝑪𝒐𝒏𝒕𝒓𝒐𝒍', // ห้องควบคุมเกม
    };
  }

  private async createSingleRoom(
    interaction: StringSelectMenuInteraction<CacheType>,
    roomType: string,
    defaultRoomNames: any,
    roomFieldMapping: any,
  ) {
    const guild = interaction.guild;
  
    // ตรวจสอบหมวดหมู่ 𝑴𝒆𝑮𝒖𝒊𝒍𝒅 𝑪𝒆𝒏𝒕𝒆𝒓
    let meguildPositionCreate = await this.serverRepository.getServerById(interaction.guildId);
    let meguildCategory = guild.channels.cache.get(meguildPositionCreate?.meguildPositionCreate || '');
  
    if (!meguildCategory || meguildCategory.type !== 4) { // ตรวจสอบว่าหมวดหมู่มีอยู่และเป็น Category
      // สร้างหมวดหมู่ใหม่
      const newCategory = await guild.channels.create({
        name: `〔👑〕𝑴𝒆𝑮𝒖𝒊𝒍𝒅 𝑪𝒆𝒏𝒕𝒆𝒓`,
        type: 4, // Category Channel
        position: 0,
      });
  
      // บันทึก ID ของหมวดหมู่ในฐานข้อมูล
      await this.serverRepository.updateServer(interaction.guildId, {
        meguildPositionCreate: newCategory.id,
      });
  
      meguildCategory = newCategory;
    }
  
    // จัดลำดับห้องใน 𝑴𝒆𝑮𝒖𝒊𝒍𝒅 𝑪𝒆𝒏𝒕𝒆𝒓
    const channelPositionMapping = {
      welcome: 0,
      news: 1,
      register: 2,
    };
  
    const newRoom = await guild.channels.create({
      name: defaultRoomNames[roomType],
      type: 0, // Text Channel
      parent: meguildCategory.id, // ตั้ง parent เป็น 𝑴𝒆𝑮𝒖𝒊𝒍𝒅 𝑪𝒆𝒏𝒕𝒆𝒓
      position: channelPositionMapping[roomType], // กำหนดลำดับห้อง
    });
  
    // บันทึกข้อมูลห้องในฐานข้อมูล
    await this.serverRepository.updateServer(interaction.guildId, {
      [roomFieldMapping[roomType]]: newRoom.id,
    });
  
    // กำหนดชื่อห้องใหม่ให้ `this.roomName`
    this.roomName = newRoom.name;
  
    if (roomType === 'register') {
      await this.createRegistrationMessage(newRoom);
    }
  
    return this.replySuccess(interaction, roomType);
  }
  
  private async createGameMatchRooms(
    interaction: StringSelectMenuInteraction<CacheType>,
    defaultRoomNames: any,
  ) {
    const server = await this.serverRepository.getServerById(interaction.guildId);
  
    // ตรวจสอบว่าห้อง REGISTER ถูกสร้างหรือยัง
    const registerChannelId = server?.registerChannel;
    const registerChannel = interaction.guild.channels.cache.get(registerChannelId);
  
    if (!registerChannel) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ ไม่สามารถสร้างห้อง GameMatch ได้')
            .setDescription('กรุณาสร้างห้อง **REGISTER** ก่อนการสร้างห้อง GameMatch')
            .setColor(0xff0000),
        ],
        ephemeral: true,
      });
    }
  
    // Create a category (group) for the game channels
    const gameCategory = await interaction.guild.channels.create({
      name: `〔🎮〕Game Center`,
      type: 4, // Category Channel
    });
  
    // Create game button text channel under the category
    const gameChannel = await interaction.guild.channels.create({
      name: defaultRoomNames['gamebtn'],
      type: 0, // Text Channel
      parent: gameCategory.id, // Set the category as the parent
    });
  
    // Create game match text channel under the category
    const gamePositionCreate = await interaction.guild.channels.create({
      name: defaultRoomNames['gamematch'],
      type: 0, // Text Channel
      parent: gameCategory.id, // Set the category as the parent
    });
  
    // Update the database with the new channels
    await this.serverRepository.updateServer(interaction.guildId, {
      gameChannel: gameChannel.id,
      gamePostChannel: gamePositionCreate.id,
      gamePositionCreate: gameCategory.id,
    });
  
    // Build the embed message
    const embeds = new EmbedBuilder()
      .setTitle('𝑴𝒆𝑮𝒖𝒊𝒍𝒅 𝑮𝒂𝒎𝒆𝒔 𝑪𝒆𝒏𝒕𝒆𝒓')
      .setColor(10513407);
  
    // Reply to the interaction to confirm the creation
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ การสร้างห้องสำเร็จ')
          .setDescription(
            `🎉 ห้อง **${defaultRoomNames['gamebtn']}** และ **${defaultRoomNames['gamematch']}** ถูกสร้างและบันทึกเรียบร้อยแล้วในหมวดหมู่ **Game Center**!`,
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
