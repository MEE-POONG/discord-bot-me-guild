import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  Guild,
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
          .setTitle('📋 จัดการบทบาทเซิร์ฟเวอร์')
          .setDescription(
            `กรุณาเลือกบทบาทที่คุณต้องการสร้างหรือจัดการจากรายการด้านล่าง:\n` +
            `- Welcome: ห้องต้อนรับผู้มาใหม่\n` +
            `- Register: ห้องฟอร์มลงทะเบียน ระบบ MeGuild\n` +
            // `- News: ช่องสำหรับ Post ข่าวสาร\n` +
            `- GameMatch: ห้องแจ้งเตือนการแมตช์`,
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

    const newRoom = await interaction.guild.channels.create({ name: this.roomName });
    const roomType = interaction.values[0];
    const roomFieldMapping = {
      welcome: 'welcomechannel',
      register: 'registerChannel',
      // news: 'newsChannel',
      gamematch: 'gameChannel',
    };

    if (server[roomFieldMapping[roomType]]) {
      return this.replyStopCreate(interaction, roomType);
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

  private replyStopCreate(interaction: StringSelectMenuInteraction<CacheType>, roomType: string) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่สามารถสร้างบทบาทใหม่ได้')
          .setDescription(
            `บทบาท **${roomType.toUpperCase()}** มีอยู่แล้วในเซิร์ฟเวอร์\n` +
            `หากต้องการแก้ไข โปรดใช้คำสั่ง \`/server-update-room\``,
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
          .setTitle('✅ การสร้างบทบาทสำเร็จ')
          .setDescription(
            `🎉 บทบาท **${this.roomName}** สำหรับประเภท **${roomType.toUpperCase()}** ถูกสร้างและบันทึกเรียบร้อยแล้ว`,
          )
          .setColor(0x00ff00),
      ],
      ephemeral: true,
    });
  }
}
