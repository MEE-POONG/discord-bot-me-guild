import { Injectable, Logger } from '@nestjs/common';
import { Button, Context, SlashCommand, SlashCommandContext, ButtonContext } from 'necord';
import { NecordPaginationService } from '@necord/pagination';
import { EmbedBuilder, GuildMember } from 'discord.js';

@Injectable()
export class GameCreateRoomCommands {
  private readonly logger = new Logger(GameCreateRoomCommands.name);
  public constructor(private readonly paginationService: NecordPaginationService) {}

  @SlashCommand({ name: 'game-create-room', description: 'สร้างห้องเกมส์' })
  public async onGameCreateRoom(@Context() [interaction]: SlashCommandContext) {
    try {
      const pagination = this.paginationService.get('game_create_room');
      const page = await pagination.build();

      if (interaction.member instanceof GuildMember) {
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('❌ ไม่พบการเชื่อมต่อช่องเสียง')
                .setDescription('คุณต้องเชื่อมต่อกับช่องเสียงก่อนจึงจะสามารถใช้งานคำสั่งนี้ได้')
                .setColor('Red'), // ✅ สีแดง
              // .setThumbnail('https://cdn-icons-png.flaticon.com/512/1828/1828843.png'), // (optional) ไอคอนเตือน
            ],
            components: [],
            ephemeral: true, // 👈 ซ่อนข้อความให้เห็นเฉพาะคนกด (แนะนำ)
          });

          // ✅ ลบข้อความหลัง 10 วินาที
          setTimeout(async () => {
            try {
              await interaction.deleteReply();
            } catch (err) {
              console.warn('⚠️ ไม่สามารถลบข้อความ:', err.message);
            }
          }, 10000);

          return;
        }
      }

      return interaction.reply({ ...page, ephemeral: true });
    } catch (error) {
      console.error('Error in onGameCreateRoom:', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }

  @Button('game-create-room')
  public async onGameCreateRoomButton(@Context() [interaction]: ButtonContext) {
    try {
      this.logger.debug('Processing game create room button interaction');
      const pagination = this.paginationService.get('game_create_room');
      const page = await pagination.build();

      if (interaction.member instanceof GuildMember) {
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle('❌ ไม่พบการเชื่อมต่อช่องเสียง')
                .setDescription('คุณต้องเชื่อมต่อกับช่องเสียงก่อนจึงจะสามารถใช้งานคำสั่งนี้ได้')
                .setColor('Red'), // ✅ สีแดง
              // .setThumbnail('https://cdn-icons-png.flaticon.com/512/1828/1828843.png'), // (optional) ไอคอนเตือน
            ],
            components: [],
            ephemeral: true, // 👈 ซ่อนข้อความให้เห็นเฉพาะคนกด (แนะนำ)
          });

          // ✅ ลบข้อความหลัง 10 วินาที
          setTimeout(async () => {
            try {
              await interaction.deleteReply();
            } catch (err) {
              console.warn('⚠️ ไม่สามารถลบข้อความ:', err.message);
            }
          }, 10000);

          return;
        }
      }

      interaction.reply({ ...page, ephemeral: true });
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (e) {
          console.warn('ไม่สามารถลบข้อความได้:', e.message);
        }
      }, 300000); // 5 นาที
    } catch (error) {
      console.error('Error in onGameCreateRoomButton:', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }
}
