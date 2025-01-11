import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  Guild,
} from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class ServerRoleService {
  private readonly logger = new Logger(ServerRoleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) {}

  public onModuleInit() {
    this.logger.log('ServerRole initialized');
  }

  // Step 1: Display Select Menu
  async ServerRoleSystem(interaction: any) {
    const roleCheck = 'owner'; // Only owners can access this command
    const validationError = await validateServerAndRole(interaction, roleCheck, this.serverRepository);
    if (validationError) {
      return validationError; // Reply has already been handled
    }

    const roleSelectionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('selectRole')
        .setPlaceholder('เลือกบทบาทที่จะลงทะเบียน')
        .addOptions([
          { label: 'Admin Role', value: 'admin', description: 'ลงทะเบียนบทบาทสำหรับ Admin' },
          { label: 'User Role', value: 'user', description: 'ลงทะเบียนบทบาทสำหรับ User' },
        ]),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 เลือกบทบาทที่จะลงทะเบียน')
          .setDescription('กรุณาเลือกบทบาทที่คุณต้องการลงทะเบียน (Admin หรือ User)')
          .setColor(0x00bfff),
      ],
      components: [roleSelectionRow],
      ephemeral: true,
    });
  }

  // Step 2: Handle Role Selection and Show Modal
  async handleRoleSelection(interaction: StringSelectMenuInteraction) {
    const selectedRole = interaction.values[0]; // Get selected role (admin/user)

    const modal = new ModalBuilder()
      .setCustomId(`registerRole_${selectedRole}`)
      .setTitle('ลงทะเบียนบทบาท')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('roleIdInput')
            .setLabel(`กรุณากรอกรหัสบทบาทสำหรับ ${selectedRole === 'admin' ? 'Admin' : 'User'}`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );

    await interaction.showModal(modal);
  }

  // Step 3: Handle Role Registration
  async handleRoleRegistration(interaction: ModalSubmitInteraction) {
    const roleId = interaction.fields.getTextInputValue('roleIdInput');
    const [_, roleType] = interaction.customId.split('_'); // Extract "admin" or "user" from customId

    const guild = interaction.guild as Guild;
    if (!guild) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ ข้อผิดพลาด')
            .setDescription('ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์จาก Discord ได้')
            .setColor(0xff0000),
        ],
        ephemeral: true,
      });
    }

    try {
      // Update the server roles in the database
      await this.serverRepository.updateServer(guild.id, {
        ...(roleType === 'admin' ? { adminRoleId: roleId } : { userRoleId: roleId }),
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ ลงทะเบียนสำเร็จ')
            .setDescription(
              `🎉 บทบาทสำหรับ **${roleType === 'admin' ? 'Admin' : 'User'}** ได้รับการลงทะเบียนเรียบร้อย:\n` +
              `**Role ID:** ${roleId}`,
            )
            .setColor(0x00ff00),
        ],
        ephemeral: true,
      });
    } catch (error) {
      this.logger.error(`Error updating server roles: ${error.message}`);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ ข้อผิดพลาด')
            .setDescription('เกิดข้อผิดพลาดระหว่างการลงทะเบียนบทบาท')
            .setColor(0xff0000),
        ],
        ephemeral: true,
      });
    }
  }
}
