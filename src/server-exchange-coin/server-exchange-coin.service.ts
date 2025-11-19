import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class ServerExchangCoinService {
  private readonly logger = new Logger(ServerExchangCoinService.name);
  private readonly packages = [
    // ขั้นต้น
    { id: 1, tier: 'basic', emoji: `:moneybag:`, name: 'แพ็ค 1', price: 10, bonus: 0.0, copper: 2_090 },
    { id: 2, tier: 'basic', emoji: `:moneybag:`, name: 'แพ็ค 2', price: 29, bonus: 1.5, copper: 6_152 },
    { id: 3, tier: 'basic', emoji: `:moneybag:`, name: 'แพ็ค 3', price: 59, bonus: 3.0, copper: 12_701 },
    { id: 4, tier: 'basic', emoji: `:moneybag:`, name: 'แพ็ค 4', price: 99, bonus: 4.5, copper: 21_623 },
    { id: 5, tier: 'basic', emoji: `:moneybag:`, name: 'แพ็ค 5', price: 199, bonus: 6.0, copper: 44_087 },

    // ขั้นกลาง
    { id: 6, tier: 'medium', emoji: `:moneybag:`, name: 'แพ็ค 6', price: 399, bonus: 7.5, copper: 89_646 },
    { id: 7, tier: 'medium', emoji: `:moneybag:`, name: 'แพ็ค 7', price: 999, bonus: 9.0, copper: 227_583 },
    { id: 8, tier: 'medium', emoji: `:moneybag:`, name: 'แพ็ค 8', price: 2999, bonus: 10.5, copper: 692_605 },

    // ขั้นสุด
    { id: 9, tier: 'premium', emoji: `:moneybag:`, name: 'แพ็ค 9', price: 5999, bonus: 12.0, copper: 1_404_246 },
    { id: 10, tier: 'premium', emoji: `:moneybag:`, name: 'แพ็ค 10', price: 9999, bonus: 13.0, copper: 2_361_464 },
  ];
  constructor(
    private readonly serverRepository: ServerRepository,
  ) { }
  public onModuleInit() {
    this.logger.log('ServerExchangCoin initialized');
  }

  async ServerExchangCoinSystem(interaction: any) {
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
  
    const basicPackages = this.packages.filter(p => p.tier === 'basic');
    const mediumPackages = this.packages.filter(p => p.tier === 'medium');
    const premiumPackages = this.packages.filter(p => p.tier === 'premium');
  
    const packageToField = (p: any) => ({
      name: `__${p.emoji} > ${p.name} • ${p.price.toLocaleString('th-TH')}฿__`,
      value: [
        `โบนัส: \`${p.bonus}%\``,
        `Copper รวม: \`${p.copper.toLocaleString('th-TH')}\``,
      ].join('\n'),
      inline: true,
    });
  
    const basicEmbed = new EmbedBuilder()
      .setTitle('💼 แพ็คเกจขั้นต้น')
      .setDescription('แพ็คเกจเริ่มต้นสำหรับการเติม Copper')
      .addFields(...basicPackages.map(packageToField))
      .setColor(0x00bcd4);
  
    const mediumEmbed = new EmbedBuilder()
      .setTitle('🚀 แพ็คเกจขั้นกลาง')
      .setDescription('แพ็คเกจสำหรับผู้ใช้ทั่วไปที่ต้องการเติมเพิ่ม')
      .addFields(...mediumPackages.map(packageToField))
      .setColor(0x4caf50);
  
    const premiumEmbed = new EmbedBuilder()
      .setTitle('👑 แพ็คเกจขั้นสุด')
      .setDescription('แพ็คเกจสำหรับสายเปย์ระดับสูง')
      .addFields(...premiumPackages.map(packageToField))
      .setColor(0xff9800);
  
    // ปุ่มของแต่ละชุด (แสดงตามลำดับเดียวกับ embed)
    const rowBasic = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...basicPackages.map(p =>
        new ButtonBuilder()
          .setCustomId(`server_buy_package_${p.id}`)
          .setLabel(`${p.name} (${p.price}฿)`)
          .setEmoji('1285525086366994465')
          .setStyle(ButtonStyle.Primary),
      ),
    );
  
    const rowMedium = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...mediumPackages.map(p =>
        new ButtonBuilder()
          .setCustomId(`server_buy_package_${p.id}`)
          .setLabel(`${p.name} (${p.price}฿)`)
          .setEmoji('1285525086366994465')
          .setStyle(ButtonStyle.Success),
      ),
    );
  
    const rowPremium = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...premiumPackages.map(p =>
        new ButtonBuilder()
          .setCustomId(`server_buy_package_${p.id}`)
          .setLabel(`${p.name} (${p.price}฿)`)
          .setEmoji('1285525086366994465')
          .setStyle(ButtonStyle.Danger),
      ),
    );
  
    const basicMessage = await interaction.reply({
      embeds: [basicEmbed],
      components: [rowBasic],
      ephemeral: true,
      fetchReply: true,
    });
  
    const mediumMessage = await interaction.followUp({
      embeds: [mediumEmbed],
      components: [rowMedium],
      ephemeral: true,
      fetchReply: true,
    });
  
    const premiumMessage = await interaction.followUp({
      embeds: [premiumEmbed],
      components: [rowPremium],
      ephemeral: true,
      fetchReply: true,
    });
  
    setTimeout(async () => {
      try { await basicMessage.delete().catch(() => null); } catch {}
      try { await mediumMessage.delete().catch(() => null); } catch {}
      try { await premiumMessage.delete().catch(() => null); } catch {}
    }, 20_000);
  }
  

  private replyError(interaction: any, message: string) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ เกิดข้อผิดพลาด')
          .setDescription(message)
          .setFooter({ text: 'แจ้งผู้ให้บริการหริอตรวจสอบสิทธิใน Discord' })
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }
}
