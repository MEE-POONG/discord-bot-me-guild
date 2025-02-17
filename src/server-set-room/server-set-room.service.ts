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
  ChannelType,
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

    const server = await this.serverRepository.getServerById(
      interaction.guildId,
    );
    if (!server) {
      return this.replyError(
        interaction,
        '❌ ไม่พบข้อมูลเซิร์ฟเวอร์ โปรดตรวจสอบอีกครั้ง!',
      );
    }

    const roomSelectionRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('SELECT_MENU_ROOM_TYPE')
          .setPlaceholder('เลือกบทบาทที่ต้องการจัดการ')
          .addOptions([
            {
              label: 'Welcome Room',
              value: 'welcome',
              description: 'สร้างห้อง Welcome',
            },
            {
              label: 'News Room',
              value: 'news',
              description: 'สร้างห้อง News',
            },
            {
              label: 'Register Room',
              value: 'register',
              description: 'สร้างห้อง Register',
            },
            // {
            //   label: 'Complaint Room',
            //   value: 'complaint',
            //   description: 'สร้างห้องแจ้งความร้องทุกข์',
            // },
            // {
            //   label: 'Suggestion Room',
            //   value: 'suggestion',
            //   description: 'สร้างห้องข้อเสนอแนะ',
            // },
            // {
            //   label: 'Trade Room',
            //   value: 'trade',
            //   description: 'สร้างห้อง Trade',
            // },
            {
              label: 'Guild Room',
              value: 'guild',
              description: 'สร้างห้องข้อเสนอแนะ',
            },
            {
              label: 'Busking Room',
              value: 'busking',
              description: 'สร้างหมวดหมู่และห้องแสดงความสามารถ',
            },
            {
              label: 'GameMatch Room',
              value: 'gamematch',
              description: 'สร้างห้อง GameMatch',
            },

          ]),
      );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 เลือกประเภทห้องที่ต้องการสร้าง')
          .setDescription(
            `กรุณาเลือกประเภทห้องที่คุณต้องการจากรายการด้านล่าง:\n\n` +
            `- **Welcome Room**: ห้องสำหรับต้อนรับสมาชิกใหม่ของ MeGuild\n` +
            `- **News Room**: ห้องสำหรับโพสต์ข่าวสารและอัปเดตเกี่ยวกับ MeGuild\n` +
            `- **Register Room**: ห้องสำหรับลงทะเบียนและสมัครสมาชิกระบบ MeGuild\n` +
            // `- **Complaint Room**: ห้องสำหรับแจ้งปัญหาและร้องเรียนเกี่ยวกับระบบ\n` +
            // `- **Suggestion Room**: ห้องสำหรับเสนอแนะไอเดียหรือปรับปรุงระบบ MeGuild\n` +
            // `- **Trade Room**: ห้องสำหรับการซื้อขายและแลกเปลี่ยนภายใน MeGuild\n` +
            `- **Guild Room**: ห้องสำหรับพูดคุยและบริหารจัดการกิลด์ภายในระบบ\n` +
            `- **GameMatch Room**: ห้องแจ้งเตือนและจัดการจับคู่เกมสำหรับสมาชิก\n` +
            `- **Busking Room**: ห้องแจ้งเตือนและจัดกิจกรรมการแสดงสดภายใน MeGuild`
          )
          .setColor(0x00bfff),
      ],
      components: [roomSelectionRow],
    });
  }

  @StringSelect('SELECT_MENU_ROOM_TYPE')
  public async handleRoomRegistration(
    @Context() [interaction]: StringSelectContext,
  ) {
    const server = await this.serverRepository.getServerById(
      interaction.guildId,
    );
    if (!server)
      return this.replyError(interaction, '❌ ไม่พบข้อมูลเซิร์ฟเวอร์');

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
      } else if (roomType === 'busking') {
        await this.createBuskingRoom(interaction);
      } else {
        await this.createSingleRoom(
          interaction,
          roomType,
          defaultRoomNames,
          roomFieldMapping,
        );
      }
    } catch (error) {
      this.logger.error(`Error creating room: ${error.message}`);

      let errorMessage = '❌ เกิดข้อผิดพลาดระหว่างการสร้างห้อง';
      if (error.message === 'Missing Permissions') {
        console.log(169, error.message === 'Missing Permissions');
        errorMessage = '❌ กรุณาให้สิทธิ์บทบาทขั้นสูงกับ Bot';
      }
      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ ข้อผิดพลาด')
            .setDescription(errorMessage)
            .setColor(0xff0000),
        ],
        components: [],
      });

    }
  }

  private getRoomFieldMapping() {
    return {
      welcome: 'welcomechannel',
      news: 'newsChannel',
      register: 'registerChannel',
      trade: 'tradeChannel',
      complaint: 'complaintChannel',
      suggestion: 'suggestionChannel',
      guild: 'guildChannel',
      gamematch: 'gameChannel',
      gamebtn: 'gamebtnChannel',
    };
  }

  private getDefaultRoomNames() {
    return {
      welcome: '🚪︰𝑾𝒆𝒍𝒄𝒐𝒎𝒆', // ห้องต้อนรับ
      news: '📢︰ข่าวสาร', // ห้องข่าวสาร
      register: '🧾︰ลงทะเบียน', // ห้องลงทะเบียน
      trade: '💱︰𝑻𝒓𝒂𝒅𝒆 ค้าขาย',
      complaint: '📢︰แจ้งความร้องทุกข์',
      suggestion: '💡︰ข้อเสนอแนะ',
      guild: '🎭︰𝑮𝒖𝒊𝒍𝒅-𝑳𝒊𝒔𝒕',
      gamematch: '👼︰หาปาร์ตี้เล่นเกม', // ห้องจับคู่เล่นเกม
      gamebtn: '💬︰หาห้องเกม', // ห้องควบคุมเกม
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
    let meguildPositionCreate = await this.serverRepository.getServerById(
      interaction.guildId,
    );
    let meguildCategory = guild.channels.cache.get(
      meguildPositionCreate?.meguildPositionCreate || '',
    );

    if (!meguildCategory || meguildCategory.type !== 4) {
      // ตรวจสอบว่าหมวดหมู่มีอยู่และเป็น Category
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
    const server = await this.serverRepository.getServerById(
      interaction.guildId,
    );

    // ตรวจสอบว่าห้อง REGISTER ถูกสร้างหรือยัง
    const registerChannelId = server?.registerChannel;
    const registerChannel =
      interaction.guild.channels.cache.get(registerChannelId);

    if (!registerChannel) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ ไม่สามารถสร้างห้อง GameMatch ได้')
            .setDescription(
              'กรุณาสร้างห้อง **REGISTER** ก่อนการสร้างห้อง GameMatch',
            )
            .setColor(0xff0000),
        ],
        ephemeral: true,
      });
    }

    // Create a category (group) for the game channels
    const gameCategory = await interaction.guild.channels.create({
      name: `〔🎮〕𝑮𝒂𝒎𝒆 𝑪𝒆𝒏𝒕𝒆𝒓`,
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
      .setColor(10513407)
      .setImage(
        'https://media.discordapp.net/attachments/855643137716650015/1287768914490691627/DALLE_2024-09-23_20.33.10_-_A_vibrant_fantasy-themed_banner_with_the_text_Game_Center_displayed_prominently._The_background_includes_a_magical_battlefield_scene_with_elements_l.webp?ex=66f2bfc2&is=66f16e42&hm=e3f5bf29bc2d01cd93f4868ac6c2d655ee4893c90ecffa3b6bb5f01cae705147&=&animated=true&width=840&height=480',
      )
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/6521/6521996.png');

    // Build the action row with buttons
    const actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId('game-create-room')
        .setEmoji('🎮') // ไอคอนสำหรับ "สร้างการจับคู่เกม"
        .setLabel('สร้างการจับคู่เกม')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('game-join')
        .setEmoji('🕹️') // ไอคอนสำหรับ "เข้าร่วมเกมธรรมดา"
        .setLabel('เข้าร่วมเกม')
        .setStyle(ButtonStyle.Primary),
    );

    // Send the embed and buttons to the game button channel
    await gameChannel.send({
      embeds: [embeds],
      components: [actionRow],
    });
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
      .setDescription(
        '- กรอกข้อมูลเพื่อนสร้างโปรไฟล์นักผจญภัยของคุณ คลิก "ลงทะเบียน"',
      )
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
      new ButtonBuilder()
        .setCustomId('register-guild')
        .setEmoji('📝')
        .setLabel('ลงทะเบียนกิลล์')
        .setStyle(ButtonStyle.Primary),
    );

    return channel.send({ embeds: [embed], components: [actionRow] });
  }

  private async createBuskingRoom(
    interaction: StringSelectMenuInteraction<CacheType>,
  ) {
    const guild = interaction.guild;
    const server = await this.serverRepository.getServerById(interaction.guildId);

    // ตรวจสอบหมวดหมู่ Busking Center
    let buskingCategory = guild.channels.cache.get(server?.buskingPositionCreate || '');

    if (!buskingCategory || buskingCategory.type !== ChannelType.GuildCategory) {
      this.logger.warn('หมวดหมู่ Busking Center ไม่มีอยู่หรือถูกลบ กำลังสร้างใหม่');

      // สร้างหมวดหมู่ใหม่
      buskingCategory = await guild.channels.create({
        name: '〔🎩〕𝑩𝒖𝒔𝒌𝒊𝒏𝒈 𝑪𝒆𝒏𝒕𝒆𝒓',
        type: ChannelType.GuildCategory,
      });

      // อัปเดต ID หมวดหมู่ในฐานข้อมูล
      await this.serverRepository.updateServer(interaction.guildId, {
        buskingPositionCreate: buskingCategory.id,
      });
    }

    // 🛑 ตรวจสอบว่าห้อง Busking มีอยู่แล้วหรือไม่
    let existingBuskingChannel = guild.channels.cache.get(server?.buskingChannel || '');
    if (existingBuskingChannel) {
      return this.replyStopCreate(interaction, 'busking', existingBuskingChannel.name);
    }

    this.logger.log('สร้างห้อง Busking ใหม่');

    // สร้างห้อง Busking
    const buskingChannel = await guild.channels.create({
      name: '🎩𝗘𝗻𝘁𝗲𝗿𝘁𝗮𝗶𝗻 𝗭𝗼𝗻𝗲',
      type: ChannelType.GuildText,
      parent: buskingCategory.id,
    });

    // อัปเดตข้อมูลในฐานข้อมูล
    await this.serverRepository.updateServer(interaction.guildId, {
      buskingChannel: buskingChannel.id,
    });

    this.roomName = buskingChannel.name;
    return this.replySuccess(interaction, 'busking');
  }

  private replyStopCreate(
    interaction: StringSelectMenuInteraction<CacheType>,
    roomType: string,
    existingChannelName: string,
  ) {
    return interaction.update({
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
      components: [],
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

  private replySuccess(
    interaction: StringSelectMenuInteraction<CacheType>,
    roomType: string,
  ) {
    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ การสร้างห้องสำเร็จ')
          .setDescription(
            `🎉 ห้อง **${this.roomName}** สำหรับประเภท **${roomType.toUpperCase()}** ถูกสร้างและบันทึกเรียบร้อยแล้ว!`,
          )
          .setColor(0x00ff00),
      ],
      components: [],
    });
  }
}
