import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { ServerUpdateRoleService } from './server-update-role.service';
import { ServerUpdateRoleNameDto } from './dto/length.dto';

@Injectable()
export class ServerUpdateRoleCommands {
  private readonly logger = new Logger(ServerUpdateRoleCommands.name);
  constructor(private readonly ServerUpdateRoleService: ServerUpdateRoleService) { }

  @SlashCommand({
    name: 'server-update-role',
    description: 'ลงทะเบียนโลใช้งาน',
    defaultMemberPermissions:'8'
  })
  async handleServerUpdateRole(@Context() [interaction]: SlashCommandContext, @Options() options: ServerUpdateRoleNameDto) {
    try {
      await this.ServerUpdateRoleService.ServerUpdateRoleSystem(interaction,options);

      // return interaction.reply({
      //   content: 'สร้างหน้าลงทะเบียนสำเร็จ',
      //   ephemeral: true,
      // });
    } catch (error) {
      this.logger.error('คำสั่ง server-update-role ผิดพลาด');
      return interaction.reply({
        content: 'ไม่สามารถสร้าง คำสั่ง server-update-role ได้',
        ephemeral: true,
      });
    }
  }
}
