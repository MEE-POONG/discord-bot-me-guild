import { GuildMember } from 'discord.js';
import { StringOption, UserOption } from 'necord';

export class GuildKickDto {
  @UserOption({
    name: 'member-to-kick',
    description: 'สมาชิกที่จะถูกเตะ',
    required: true,
  })
  member: GuildMember;
}
