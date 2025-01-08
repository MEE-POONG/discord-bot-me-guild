import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { NecordPaginationService } from '@necord/pagination';

@Injectable()
export class RegisterServerCommands {
  public constructor(
    private readonly paginationService: NecordPaginationService,
  ) {}

  @SlashCommand({ name: 'register-server', description: 'ลงทะเบียน Discord Server' })
  public async onRegisterServer(@Context() [interaction]: SlashCommandContext) {
    const pagination = this.paginationService.get('register-server');
    const page = await pagination.build();

    return interaction.reply({ ...page, ephemeral: true });
  }
}
