import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';

@Injectable()
export class DonationService {
  private readonly logger = new Logger(DonationService.name);
  private donations: Record<string, number> = {};

  async addDonation(userId: string, amount: number): Promise<void> {
    if (!this.donations[userId]) {
      this.donations[userId] = 0;
    }
    this.donations[userId] += amount;
    this.logger.log(`✅ User ${userId} บริจาค ${amount} บาท (รวม: ${this.donations[userId]} บาท)`);
  }

  async getTotalDonation(userId: string): Promise<number> {
    return this.donations[userId] || 0;
  }

  async getTopDonors(limit: number = 5): Promise<{ userId: string; amount: number }[]> {
    return Object.entries(this.donations)
      .map(([userId, amount]) => ({ userId, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  async generateDonationEmbed(): Promise<EmbedBuilder> {
    return new EmbedBuilder()
      .setTitle('🎁 ระบบ Donation 🎁')
      .setDescription('เลือกของขวัญที่ต้องการส่งโดยกดอีโมจิด้านล่าง')
      .addFields(
        { name: '🎉 Party', value: '10 บาท', inline: true },
        { name: '🎈 Balloon', value: '50 บาท', inline: true },
        { name: '💎 Diamond', value: '100 บาท', inline: true },
        { name: '🚀 Rocket', value: '500 บาท', inline: true },
      )
      .setColor('#FFD700')
      .setFooter({ text: 'ขอบคุณที่สนับสนุน!' })
      .setTimestamp();
  }
}
