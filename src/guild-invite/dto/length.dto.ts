import { GuildMember } from 'discord.js';
import { StringOption, UserOption } from 'necord';

export class GuildInviteDto {
  @UserOption({
    name: 'member-to-invite',
    description: 'สมาชิกที่จะถูกเชิญ',
    required: true,
  })
  member: GuildMember;
}
