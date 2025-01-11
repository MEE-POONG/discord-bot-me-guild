import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { ServerRoleService } from './server-role.service';

@Injectable()
export class ServerRoleCommands {
  private readonly logger = new Logger(ServerRoleCommands.name);
  constructor(private readonly serverroleService: ServerRoleService) {}

  @SlashCommand({
    name: 'server-role',
    description: 'ลงทะเบียนโลใช้งาน',
  })
  async handleServerRole(@Context() [interaction]: SlashCommandContext) {
    try {
      await this.serverroleService.ServerRoleSystem(interaction);
      // return interaction.reply({
      //   content: 'สร้างหน้าลงทะเบียนสำเร็จ',
      //   ephemeral: true,
      // });
    } catch (error) {
      this.logger.error('คำสั่ง server-role ผิดพลาด');
      return interaction.reply({
        content: 'ไม่สามารถสร้าง คำสั่ง server-role ได้',
        ephemeral: true,
      });
    }
  }
}
