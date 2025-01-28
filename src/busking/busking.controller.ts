import { Injectable } from '@nestjs/common';
import { BuskingService } from './busking.service';
import { CommandInteraction } from 'discord.js';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Injectable()
export class BuskingCommand {
  constructor(private readonly buskingService: BuskingService) {}

  @SlashCommand({
    name: 'busking',
    description: 'Busking command',
  })
  async busking(@Context() [interaction]: SlashCommandContext) {
    await this.buskingService.createBuskingChannel([interaction]);
  }
}
