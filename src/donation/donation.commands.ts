import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { DonationService } from './donation.service';
import { PermissionFlagsBits } from 'discord.js';

@Injectable()
export class DonationCommands {
  private readonly logger = new Logger(DonationCommands.name);

  constructor(private readonly donationService: DonationService) { }

  @SlashCommand({
    name: 'donate',
    description: 'เริ่มระบบ Donation',
    defaultMemberPermissions: PermissionFlagsBits.SendMessages,
  })
  async handleDonation(@Context() [interaction]: SlashCommandContext) {
    await interaction.deferReply({ ephemeral: true });

    try {
      if (!interaction.channel) {
        throw new Error('❌ ไม่สามารถเข้าถึงช่องข้อความได้');
      }

      const embed = await this.donationService.generateDonationEmbed();
      const message = await interaction.channel.send({ embeds: [embed] });

      const gifts = ['🎉', '🎈', '💎', '🚀'];

      for (const emoji of gifts) {
        try {
          await message.react(emoji);
        } catch (error) {
          this.logger.warn(`❗ ไม่สามารถเพิ่มปฏิกิริยา: ${emoji} - ${error.message}`);
        }
      }

      await interaction.editReply({ content: '📢 ระบบ Donation พร้อมใช้งานแล้ว!' });
    } catch (error) {
      this.logger.error('❌ เกิดข้อผิดพลาดขณะเริ่มระบบ Donation:', error);
      await interaction.editReply({
        content:
          '❌ **ไม่สามารถเริ่มระบบ Donation ได้**\n' +
          'โปรดลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลเซิร์ฟเวอร์',
      });
    }
  }
}
