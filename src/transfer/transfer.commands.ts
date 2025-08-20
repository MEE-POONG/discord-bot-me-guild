import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { TransferService } from './transfer.service';
import { TransferDto } from './dto/transfer.dto';

@Injectable()
export class TransferCommands {
  private readonly logger = new Logger(TransferCommands.name);

  constructor(private readonly transferService: TransferService) {}

  // @SlashCommand({
  //   name: 'transfer',
  //   description: 'โอนเหรียญไปยังบัญชีอื่น',
  // })
  async handleTransfer(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: TransferDto,
  ) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const result = await this.transferService.transfer(interaction, options);

      await interaction.editReply({
        content: `✅ โอนเหรียญสำเร็จ!\nจำนวน: ${options.amount} เหรียญ\nไปยัง: ${options.receiverAccountNumber}\nชื่อผู้รับ: ${result.receiver.username}\nหมายเหตุ: ${result.comment}`,
      });
    } catch (error) {
      this.logger.error('Transfer command failed:', error);
      await interaction.editReply({
        content: '❌ ไม่สามารถโอนเหรียญได้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  }
}
