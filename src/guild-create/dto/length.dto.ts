import { StringOption } from 'necord';

export class GuildCreateDto {
  @StringOption({
    name: 'guild-name',
    description: 'ชื่อกิลด์',
    required: true,
  })
  guildName: string;
}
