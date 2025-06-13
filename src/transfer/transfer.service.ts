import { Injectable, Logger } from '@nestjs/common';
import { CommandInteraction } from 'discord.js';
import axios from 'axios';
import { TransferDto } from './dto/transfer.dto';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);
  private readonly API_URL = 'https://me-coins-wallet.me-prompt-technology.com/api/transfers';

  async transfer(interaction: CommandInteraction, options: TransferDto) {
    try {
      const response = await axios.post(
        `${this.API_URL}/${interaction.user.id}`,
        {
          receiverAccountNumber: options.receiverAccountNumber,
          amount: options.amount,
          comment: options.comment,
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Transfer failed:', error.response?.data || error.message);
      throw error;
    }
  }
} 