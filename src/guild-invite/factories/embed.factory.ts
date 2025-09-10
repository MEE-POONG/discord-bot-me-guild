import { EmbedBuilder } from 'discord.js';

export class EmbedFactory {
  static createInviteEmbed(inviter: string, guildName: string): EmbedBuilder {
    return new EmbedBuilder()
      .setAuthor({
        name: `มีคำเชิญเข้าร่วมกิลด์จาก ${inviter}`,
      })
      .setFields({
        name: 'ชื่อกิลด์',
        value: `${guildName ?? 'ไม่ระบุชื่อกิลด์'}`,
      })
      .setColor('#A4FFED');
  }
}
