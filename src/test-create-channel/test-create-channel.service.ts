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
        await interaction.deferReply({ ephemeral: true });
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ ไม่พบ Role ที่กำหนด')
              .setDescription(`กรุณาตรวจสอบ Role ID: ${roleId}`)
              .setColor(0xff0000),
          ],
        });
      }
      await interaction.deferReply({ ephemeral: true }); // ตั้งค่ารอการตอบกลับ

      // สร้างหมวดหมู่
      const category = await guild.channels.create({
        name: `🕍 ${userInput}`,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: ['ViewChannel'],
          },
          {
            id: role.id,
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

      if (textChannel) {
        const mainVoiceChannel = await guild.channels.create({
          name: `🎤・โถงหลัก`,
          type: ChannelType.GuildVoice,
          parent: category.id,
        });

        if (mainVoiceChannel) {
          const secondaryVoiceChannel = await guild.channels.create({
            name: `🎤・โถงรอง`,
            type: ChannelType.GuildVoice,
            parent: category.id,
          });

          if (secondaryVoiceChannel) {
            const guestRoom = await guild.channels.create({
              name: `🎁・เยี่ยมบ้าน`,
              type: ChannelType.GuildVoice,
              parent: category.id,
            });

            if (guestRoom) {
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
                    id: role.id,
                    allow: ['Connect', 'ViewChannel'],
                  },
                ],
              });
              if (stageChannel) {
                this.logger.log('✅ ทุกห้องถูกสร้างสำเร็จ');
              } else {
                this.logger.error('❌ ไม่สามารถสร้างห้อง Stage Room ได้');
              }
            } else {
              this.logger.error('❌ ไม่สามารถสร้างห้อง Guest Room ได้');
            }
          } else {
            this.logger.error('❌ ไม่สามารถสร้างห้อง Secondary Voice Channel ได้');
          }
        } else {
          this.logger.error('❌ ไม่สามารถสร้างห้อง Main Voice Channel ได้');
        }
      } else {
        this.logger.error('❌ ไม่สามารถสร้างห้อง Text Channel ได้');
      }

      // ตอบกลับสำเร็จเมื่อทุกห้องถูกสร้าง
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
