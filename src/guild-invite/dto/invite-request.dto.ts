import { GuildMember } from 'discord.js';
import { UserOption } from 'necord';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InviteRequestDto {
  @UserOption({
    name: 'member-to-invite',
    description: 'สมาชิกที่จะถูกเชิญ',
    required: true,
  })
  @IsNotEmpty({ message: 'กรุณาเลือกสมาชิกที่จะเชิญ' })
  @ValidateNested()
  @Type(() => GuildMember)
  member: GuildMember;
}
