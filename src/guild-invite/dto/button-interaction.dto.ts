import { ButtonInteraction, CacheType } from 'discord.js';

export class ButtonInteractionDto {
  interaction: ButtonInteraction<CacheType>;
  userId: string;
  inviteId?: string;

  constructor(interaction: ButtonInteraction<CacheType>) {
    this.interaction = interaction;
    this.userId = interaction.user.id;
  }
}
