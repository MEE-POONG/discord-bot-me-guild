import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { ServerCreateRoleService } from './server-create-role.service';
import { ServerCreateRoleNameDto } from './dto/length.dto';

@Injectable()
export class ServerCreateRoleCommands {
  private readonly logger = new Logger(ServerCreateRoleCommands.name);
  constructor(private readonly ServerCreateRoleService: ServerCreateRoleService) { }

  @SlashCommand({
    name: 'server-create-role',
    description: 'ลงทะเบียนโลใช้งาน',
  })
  async handleServerCreateRole(@Context() [interaction]: SlashCommandContext, @Options() options: ServerCreateRoleNameDto) {
    try {
      await this.ServerCreateRoleService.ServerCreateRoleSystem(interaction,options);

      // return interaction.reply({
      //   content: 'สร้างหน้าลงทะเบียนสำเร็จ',
      //   ephemeral: true,
      // });
    } catch (error) {
      this.logger.error('คำสั่ง server-create-role ผิดพลาด');
      return interaction.reply({
        content: 'ไม่สามารถสร้าง คำสั่ง server-create-role ได้',
        ephemeral: true,
      });
    }
  }
}
