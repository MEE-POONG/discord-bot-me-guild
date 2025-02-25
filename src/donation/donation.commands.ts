import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { DonationService } from './donation.service';

@Injectable()
export class DonationCommands {
  private readonly logger = new Logger(DonationCommands.name);
  constructor(private readonly donationService: DonationService) { }

  @SlashCommand({
    name: 'donate',
    description: 'เริ่มระบบ Donation',
  })
  async handleDonation(@Context() [interaction]: SlashCommandContext) {
    try {
      const embed = await this.donationService.generateDonationEmbed();
      const message = await interaction.channel.send({ embeds: [embed] });

      const gifts = ['🎉', '🎈', '💎', '🚀'];
      for (const emoji of gifts) {
        await message.react(emoji);
      }

      await interaction.reply({ content: '📢 ระบบ Donation พร้อมใช้งาน!', ephemeral: true });
    } catch (error) {
      this.logger.error('เกิดข้อผิดพลาดขณะพยายามเริ่มระบบ Donation:', error);
      return interaction.reply({
        content:
          '❌ **ไม่สามารถเริ่มระบบ Donation ได้**\n' +
          'เกิดข้อผิดพลาดระหว่างการประมวลผลคำสั่งของคุณ\n' +
          'โปรดลองอีกครั้ง หรือติดต่อผู้ดูแลเซิร์ฟเวอร์หากปัญหายังคงอยู่',
        ephemeral: true,
      });
    }
  }
}