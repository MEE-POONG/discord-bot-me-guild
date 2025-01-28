import { Injectable } from '@nestjs/common';
import { GuildCreateService } from './guild-create.service';
import {
  Button,
  ButtonContext,
  Context,
  Modal,
  ModalContext,
  Options,
  SlashCommand,
  SlashCommandContext,
} from 'necord';
import { GuildCreateDto } from './dto/length.dto';
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

@Injectable()
export class GuildCreateCommand {
  constructor(private readonly guildCreateService: GuildCreateService) {}

  @SlashCommand({
    name: 'guild-create',
    description: 'สร้างกิลด์ (ฟรี)',
  })
  async handle(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: GuildCreateDto,
  ): Promise<void> {
    await this.guildCreateService.createGuild(interaction, options);
  }

  @Button('register-guild')
  async handleRegisterGuild(
    @Context() [interaction]: ButtonContext,
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId('guild-create-modal')
      .setTitle('Create Guild')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('guild-name')
            .setLabel('ชื่อกิลด์')
            .setStyle(TextInputStyle.Short),
        ),
      );

    await interaction.showModal(modal);
  }

  @Modal('guild-create-modal')
  async handleGuildCreateModal(
    @Context() [interaction]: ModalContext,
  ): Promise<void> {
    const guildName = interaction.fields.getTextInputValue('guild-name');
    await this.guildCreateService.createGuild(interaction, { guildName });
  }
}
