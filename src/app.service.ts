import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On, Once } from 'necord';
import { SlashCommand, SlashCommandContext } from 'necord';
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`app.service Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }

  @On('messageCreate')
  public onMessageCreate(@Context() [message]: ContextOf<'messageCreate'>) {
    this.logger.log(message.content);
  }

  @SlashCommand({
    name: 'ping',
    description: 'Ping command!',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Pong JS NestJS !' });
  }

  @SlashCommand({
    name: 'remove',
    description: 'ลบคำสั่งทั้งหมด',
  })
  public async onHelp(@Context() [interaction]: SlashCommandContext) {
    interaction.client.application.commands.set([]);
    interaction.guild.commands.set([]);
    return interaction.reply({
      content: 'คำสั่งทั้งหมดถูกลบ',
    });
  }
}
