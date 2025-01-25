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
  ) {}

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
            .setLabel('กรอกข้อความที่ต้องการแสดง') // ป้ายข้อความ
            .setStyle(TextInputStyle.Paragraph) // รูปแบบเป็น Paragraph
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

    // ตอบกลับข้อความ
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ ข้อความของคุณถูกส่งสำเร็จ')
          .setDescription(`📩 ข้อความที่คุณกรอก: \n"${userInput}"`) // แสดงข้อความที่กรอก
          .setColor(0x00ff00), // สีเขียว (สำเร็จ)
      ],
      ephemeral: true, // แสดงเฉพาะผู้ใช้งานที่ส่ง Modal
    });
  }
}
