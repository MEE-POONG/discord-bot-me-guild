import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export class ButtonFactory {
  static createInviteButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId('guild-invite-cancel')
        .setLabel('ไม่เข้าร่วม')
        .setEmoji('📕')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('guild-invite-accept')
        .setLabel('เข้าร่วมกิลด์')
        .setEmoji('📗')
        .setStyle(ButtonStyle.Success),
    );
  }
}
