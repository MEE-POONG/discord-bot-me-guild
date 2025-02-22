import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { EmbedBuilder } from 'discord.js';
// import { DonationService } from './donation.service';

@Injectable()
export class DonationCommands {
    private readonly logger = new Logger(DonationCommands.name);
    // constructor(private readonly donationService: DonationService) { }

    @SlashCommand({
        name: 'donate-gift',
        description: 'เริ่มระบบ Donation',
    })
    async handleDonation(@Context() [interaction]: SlashCommandContext) {
        try {
            // await this.prototypeService.PrototypeSystem(interaction);
            return interaction.reply({
              content: 'สร้างหน้าลงทะเบียนสำเร็จ',
              ephemeral: true,
            });
          } catch (error) {
            this.logger.error('ไม่สามารถสร้างรูปแบบลงทะเบียนได้');
            return interaction.reply({
              content: 'ไม่สามารถสร้างรูปแบบลงทะเบียนได้',
              ephemeral: true,
            });
          }
        }
        // try {
        //     const gifts = {
        //         '🎉': 10,
        //         '🎈': 50,
        //         '💎': 100,
        //         '🚀': 500,
        //     };

        //     const embed = new EmbedBuilder()
        //         .setTitle('🎁 ระบบ Donation 🎁')
        //         .setDescription('เลือกของขวัญที่ต้องการส่งโดยกดอีโมจิ')
        //         .addFields(
        //             { name: '🎉 Party', value: '10 บาท', inline: true },
        //             { name: '🎈 Balloon', value: '50 บาท', inline: true },
        //             { name: '💎 Diamond', value: '100 บาท', inline: true },
        //             { name: '🚀 Rocket', value: '500 บาท', inline: true }
        //         )
        //         .setColor('#FFD700');

        //     const message = await interaction.channel.send({ embeds: [embed] });
        //     for (const emoji of Object.keys(gifts)) {
        //         await message.react(emoji);
        //     }
        //     await interaction.reply({ content: '📢 ระบบ Donation พร้อมใช้งาน!', ephemeral: true });
        // } catch (error) {
        //     this.logger.error('เกิดข้อผิดพลาดขณะพยายามเริ่มระบบ Donation:', error);
        //     return interaction.reply({
        //         content:
        //             '❌ **ไม่สามารถเริ่มระบบ Donation ได้**\n' +
        //             'เกิดข้อผิดพลาดระหว่างการประมวลผลคำสั่งของคุณ\n' +
        //             'โปรดลองอีกครั้ง หรือติดต่อผู้ดูแลเซิร์ฟเวอร์หากปัญหายังคงอยู่',
        //         ephemeral: true,
        //     });
        // }
}