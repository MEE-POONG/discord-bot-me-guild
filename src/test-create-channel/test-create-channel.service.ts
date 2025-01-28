import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  Guild,
  ChannelType,
  Role,
  OverwriteResolvable,
} from 'discord.js';
import { Modal, ModalContext, Context } from 'necord';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class TestCreateChannelService {
  private readonly logger = new Logger(TestCreateChannelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) { }

  public onModuleInit() {
    this.logger.log('TestCreateChannel initialized');
  }

  // สร้าง Modal Input
  async TestCreateChannelSystem(interaction: any) {
    const roleCheck = 'admin'; // Required role for this command
    const validationError = await validateServerAndRole(
      interaction,
      roleCheck,
      this.serverRepository,
    );
    if (validationError) {
      return validationError; // Reply has already been handled
    }

    // สร้าง Modal
    const modal = new ModalBuilder()
      .setCustomId('test-create-channel-modal') // Custom ID สำหรับ Modal
      .setTitle('สร้างข้อความใหม่') // ชื่อหัวข้อ Modal
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('guildName') // Custom ID สำหรับ Input
            .setLabel('ระบุชื่อ Guild') // ป้ายข้อความ
            .setStyle(TextInputStyle.Short) // รูปแบบเป็น Single-line
            .setPlaceholder('พิมพ์ข้อความที่นี่...') // ข้อความตัวอย่าง
            .setRequired(true), // บังคับให้กรอก
        ),
      );

    await interaction.showModal(modal); // แสดง Modal
  }

  // จัดการเมื่อกด Submit Modal
  @Modal('test-create-channel-modal')
  async handleModalSubmission(
    @Context() [interaction]: ModalContext,
  ): Promise<any> {
    const guildName = interaction.fields.getTextInputValue('guildName'); // รับค่าที่ผู้ใช้กรอก
    this.logger.log(`User input: ${guildName}`); // Log ข้อความที่กรอก

    try {
      const guild = interaction.guild as Guild;
      const positionRole = guild.roles.cache.get('1314456120424792108'); // ตัวอย่าง Role ID

      const newRole = await guild.roles.create({
        name: `🕍 ${guildName}`,
        position: positionRole ? positionRole.position + 1 : undefined,
        color: "#A4F1FF",
        reason: `สร้างโดย ${interaction.user.tag}`,
      });

      this.logger.log(`✅ Role created successfully: ${newRole.name} (${newRole.id})`);

      // สร้างหมวดหมู่
      const category = await guild.channels.create({
        name: `🕍 ${guildName}`,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: ['ViewChannel'],
          },
          {
            id: newRole.id,
            allow: ['ViewChannel'],
          },
        ],
      });

      // เรียงลำดับการสร้างห้อง
      const textChannel = await guild.channels.create({
        name: `💬・แชท`,
        type: ChannelType.GuildText,
        parent: category.id,
      });

      const mainVoiceChannel = await guild.channels.create({
        name: `🎤・โถงหลัก`,
        type: ChannelType.GuildVoice,
        parent: category.id,
      });

      const secondaryVoiceChannel = await guild.channels.create({
        name: `🎤・โถงรอง`,
        type: ChannelType.GuildVoice,
        parent: category.id,
      });

      const guestRoom = await guild.channels.create({
        name: `🎁・เยี่ยมบ้าน`,
        type: ChannelType.GuildVoice,
        parent: category.id,
      });

      const stageChannel = await guild.channels.create({
        name: `👑・กิจกรรมกิลด์`,
        type: ChannelType.GuildStageVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: ['Connect'],
          },
          {
            id: newRole.id,
            allow: ['Connect', 'ViewChannel'],
          },
        ],
      });

      // ตอบกลับสำเร็จเมื่อทุกห้องถูกสร้าง
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ การสร้างห้องสำเร็จ')
            .setDescription('🎉 ห้องทั้งหมดถูกสร้างสำเร็จ!')
            .setColor(0x00ff00),
        ],
      });

    } catch (error: any) {
      this.logger.error(`Error creating channels: ${error.message}`);
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ เกิดข้อผิดพลาด')
            .setDescription('ไม่สามารถสร้างห้องได้ กรุณาลองใหม่อีกครั้ง')
            .setColor(0xff0000),
        ],
      });
    }
  }
}
