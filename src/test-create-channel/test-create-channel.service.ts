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
            .setCustomId('user-input') // Custom ID สำหรับ Input
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
    const userInput = interaction.fields.getTextInputValue('user-input'); // รับค่าที่ผู้ใช้กรอก
    this.logger.log(`User input: ${userInput}`); // Log ข้อความที่กรอก

    try {
      const guild = interaction.guild as Guild;
      const roleId = '1314455560413904982'; // Role ID สำหรับกำหนดสิทธิ์
      const role: Role | undefined = guild.roles.cache.get(roleId);

      if (!role) {
        // หากไม่พบ Role
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ ไม่พบ Role ที่กำหนด')
              .setDescription(`กรุณาตรวจสอบ Role ID: ${roleId}`)
              .setColor(0xff0000),
          ],
          ephemeral: true,
        });
      }

      // สร้างหมวดหมู่
      const category = await guild.channels.create({
        name: `🕍 ${userInput}`,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id, // Everyone role
            deny: ['ViewChannel'], // ปิดการเข้าถึงสำหรับ Everyone
          },
          {
            id: role.id, // Role ที่อนุญาต
            allow: ['ViewChannel'], // เปิดสิทธิ์ดูสำหรับ Role นี้
          },
        ],
      });

      // สร้าง GuildStageVoice
      const stageChannel = await guild.channels.create({
        name: `👑・กิจกรรมกิลด์`,
        type: ChannelType.GuildStageVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id, // Everyone role
            deny: ['Connect'], // ปิดการเชื่อมต่อสำหรับ Everyone
          },
          {
            id: role.id, // Role ที่อนุญาต
            allow: ['Connect', 'ViewChannel'], // เปิดสิทธิ์สำหรับ Role นี้
          },
        ],
      });

      // ตอบกลับสำเร็จ
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ การสร้างห้องสำเร็จ')
            .setDescription(
              `🎉 หมวดหมู่และห้อง **${stageChannel.name}** ถูกสร้างสำเร็จ!\n` +
              `กำหนดสิทธิ์การเข้าถึงสำหรับ Role: **${role.name}**`,
            )
            .setColor(0x00ff00),
        ],
        ephemeral: true,
      });

    } catch (error: any) {
      this.logger.error(`Error creating channels: ${error.message}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ เกิดข้อผิดพลาด')
            .setDescription('ไม่สามารถสร้างห้องได้ กรุณาลองใหม่อีกครั้ง')
            .setColor(0xff0000),
        ],
        ephemeral: true,
      });
    }
  }
}
