import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { GuildCreateDto } from './dto/length.dto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChannelManager,
  ChatInputCommandInteraction,
  Client,
  ClientVoiceManager,
  EmbedBuilder,
  GuildManager,
  GuildMember,
  ModalSubmitInteraction,
  REST,
  ShardClientUtil,
  TextChannel,
  UserManager,
  UserSelectMenuBuilder,
  WebSocketManager,
} from 'discord.js';
import { GuildManageService, UserProfile } from 'src/guild-manage/guild-manage.service';
import { UserDataService } from 'src/user-data/user-data.service';
import { ServerRepository } from 'src/repository/server';
import { Button, ButtonContext, Context, On, StringSelectContext } from 'necord';

@Injectable()
export class GuildCreateService {
  private readonly logger = new Logger(GuildCreateService.name);
  constructor(
    private readonly prisma: PrismaClient,
    private readonly guildManage: GuildManageService,
    private readonly userData: UserDataService,
    private readonly serverRepository: ServerRepository,

    private readonly client: Client,
    private readonly channels: ChannelManager,
    private readonly guilds: GuildManager,
    private readonly users: UserManager,
    private readonly shard: ShardClientUtil,
    private readonly voice: ClientVoiceManager,
    private readonly ws: WebSocketManager,
    private readonly rest: REST,
  ) {}

  async onModuleInit() {
    this.logger.log('GuildCreateService initialized');
  }

  async createGuild(
    interaction: ChatInputCommandInteraction<CacheType> | ModalSubmitInteraction<CacheType>,
    options: GuildCreateDto,
  ) {
    const ownerData = (await this.userData.getProfile(interaction.user)) as UserProfile;

    console.log('[createGuild]: ownerData', ownerData);

    if (!ownerData)
      return interaction.reply({
        content: `คุณไม่สามารถสร้างกิลด์ได้ เนื่องจากคุณไม่มีข้อมูลนักผจญภัย โปรดลงทะเบียนก่อนสร้างกิลด์`,
        ephemeral: true,
      });

    const guildName = options.guildName;
    console.log('[createGuild]: guildName', guildName);

    if (guildName.length < 4 || guildName.length > 16)
      return interaction.reply({
        content: `ชื่อกิลด์ของคุณต้องมีความยาวระหว่าง 4-16 ตัวอักษร`,
        ephemeral: true,
      });

    if (!/^[a-zA-Z0-9_]+$/.test(guildName))
      return interaction.reply({
        content: `ชื่อกิลด์ของคุณผิดกฏ อนุญาตให้ใช้เพียง aA-zZ, 0-9 และ _ เท่านั้น `,
        ephemeral: true,
      });

    const time = `<t:${(Date.now() / 1000 + 600).toFixed(0)}:R>`;

    const checkGuild = await this.guildManage.checkGuild(ownerData);
    console.log('[createGuild]: checkGuild', checkGuild);

    if (checkGuild)
      return interaction.reply({
        content: `คุณไม่สามารถสร้างกิลด์ได้เนื่องจากคุณมีกิลด์อยู่แล้ว`,
        ephemeral: true,
      });

    // ตรวจสอบว่า ServerDB มี guildHeadRoleId และ guildCoRoleId หรือไม่
    const serverData = await this.serverRepository.getServerById(interaction.guildId);
    console.log('[createGuild]: serverData', serverData);

    if (!serverData) {
      return interaction.reply({
        content: `❌ ไม่พบข้อมูลเซิร์ฟเวอร์ กรุณาติดต่อเจ้าของเซิร์ฟเวอร์เพื่อลงทะเบียนเซิร์ฟเวอร์ก่อน`,
        ephemeral: true,
      });
    }

    console.log('[createGuild]: serverData.guildHeadRoleId', serverData.guildHeadRoleId);
    console.log('[createGuild]: serverData.guildCoRoleId', serverData.guildCoRoleId);

    if (!serverData.guildHeadRoleId || !serverData.guildCoRoleId) {
      const guildOwner = await interaction.guild.fetchOwner();
      console.log('[createGuild]: guildOwner', guildOwner);

      return interaction.reply({
        content:
          `❌ **ไม่สามารถสร้างกิลด์ได้**\n\n` +
          `🔧 **กรุณาแจ้งเจ้าของเซิร์ฟเวอร์** ${guildOwner?.toString()} **ให้ทำการ:**\n` +
          `1. ใช้คำสั่ง \`/server-set-room\`\n` +
          `2. เลือก **"Guild Room"**\n` +
          `3. รอให้ระบบสร้างบทบาทหัวหน้าและรองหัวหน้า\n\n` +
          `⚠️ **หมายเหตุ**: ระบบต้องมีบทบาทหัวหน้าและรองหัวหน้าก่อนจึงจะสามารถสร้างกิลด์ได้`,
        ephemeral: true,
      });
    }

    const createEmbedFounded = new EmbedBuilder({
      title: `เลือกผู้ร่วมก่อตั้งสมาชิกของคุณ`,
      description: `- คุณจำเป็นที่จะต้องมีผู้ร่วมก่อตั้งกิลด์ 4 คน เพื่อทำการสร้างกิลด์ ${guildName}\n- ระยะเวลาในการยอมรับ ${time}`,
      color: 9304831,
      image: {
        url: 'https://media.discordapp.net/attachments/861491684214833182/1224408324922015876/DALLE_2024-04-02_00.21.20_-_A_vibrant_watercolor_of_an_elven_archer_a_human_mage_and_a_dwarf_warrior_standing_triumphantly_atop_a_hill_looking_towards_the_horizon_at_dawn._The.webp?ex=661d621d&is=660aed1d&hm=29e373d7dea2b16ceddf3e45271ca343bf01c5e5b2bbfc1ee263503f04900ca7&=&format=webp&width=839&height=479',
      },
    });

    const createSelectMemberForFounded =
      new ActionRowBuilder<UserSelectMenuBuilder>().setComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`select_founded_id_${interaction.user.id}`)
          .setMaxValues(10)
          .setMinValues(1)
          .setPlaceholder('โปรดเลือกผู้เริ่มก่อตั้ง'),
      );

    await this.interactionHandler(
      interaction as ChatInputCommandInteraction<CacheType>,
      createEmbedFounded,
      createSelectMemberForFounded,
      guildName,
    );
  }

  private async interactionHandler(
    interaction: ChatInputCommandInteraction<CacheType>,
    createEmbedFounded: EmbedBuilder,
    createSelectMemberForFounded: ActionRowBuilder<UserSelectMenuBuilder>,
    guildName: string,
  ) {
    console.log('[interactionHandler]: guildName', guildName);

    try {
      await interaction.reply({
        embeds: [createEmbedFounded],
        components: [createSelectMemberForFounded],
        ephemeral: true,
      });

      const inter = await interaction.fetchReply();
      if (!inter) return;

      const collector = inter.createMessageComponentCollector({
        filter: (i) =>
          i.customId === `select_founded_id_${interaction.user.id}` &&
          i.user.id === interaction.user.id,
        max: 1,
      });

      collector.on('collect', async (i) => {
        if (!i.isUserSelectMenu()) return;

        const users = i.values;
        if (users.includes(interaction.user.id)) {
          await interaction.editReply({
            content: 'คุณไม่สามารถเพิ่มตัวเองเข้าใน ผู้ร่วมก่อตั้งได้',
            components: [],
            embeds: [],
          });
          return;
        }

        const userHasGuild = await this.checkUsersGuildStatus(users);
        console.log('[interactionHandler]: userHasGuild', userHasGuild);

        if (userHasGuild.length > 0) {
          await this.replyWithExistingGuilds(i, userHasGuild);
          await interaction.deleteReply();
          return;
        }

        const createAcceptGuildEmbeds = this.createGuildProgressEmbed(guildName);
        console.log('[interactionHandler]: createAcceptGuildEmbeds', createAcceptGuildEmbeds);
        const channel = interaction;
        const msg = await channel.followUp({
          content: `${interaction.member?.toString()}`,
          embeds: [createAcceptGuildEmbeds],
          ephemeral: true,
        });

        const GuildCreateReport = await this.createGuildReport(interaction, msg, guildName);
        const GuildCreateReportId = GuildCreateReport.id;
        console.log('[interactionHandler]: guildReport', GuildCreateReport);

        await interaction.deleteReply();

        await this.scheduleMessageDeletion(msg);
        await this.sendGuildInvitations(
          users,
          GuildCreateReportId, // GuildCreateReport
          guildName,
          interaction.user.toString(),
        );
      });
    } catch (error) {
      await interaction.reply({
        content: 'ไม่สามารถแสดงหน้าต่างเพื่อเลือกผู้ร่วมก่อตั้งได้',
        ephemeral: true,
      });
    }
  }

  private async checkUsersGuildStatus(users: string[]): Promise<string[]> {
    const userHasGuild = [];
    for (const userId of users) {
      const user = await this.prisma.guildMembers.findFirst({
        where: { userId },
      });
      if (user) userHasGuild.push(userId);
    }
    return userHasGuild;
  }

  private async replyWithExistingGuilds(i: any, userHasGuild: string[]) {
    const embeds = new EmbedBuilder()
      .setDescription(
        `ผู้ร่วมก่อตั้งต่อไปนี้มีกิลด์อยู่แล้ว\n${userHasGuild.map((id) => `<@${id}>`).join(', ')}`,
      )
      .setColor('Red');
    await i.update({ embeds: [embeds], components: [], content: '' });
  }

  private createGuildProgressEmbed(guildName: string): EmbedBuilder {
    return new EmbedBuilder({
      description: `# ความคืบหน้า (1/4) ของกิลด์ ${guildName}`,
      color: 16759101,
      image: {
        url: 'https://media.discordapp.net/attachments/861491684214833182/1224411890415829102/DALLE_2024-04-02_00.35.29_-_A_digital_illustration_of_a_group_of_adventurers_gathered_around_a_map_laid_out_on_a_rustic_wooden_table_their_expressions_serious_as_they_plan_their.webp?ex=661d656f&is=660af06f&hm=e9744b69a8c206d8b8f48fd1753bc9c5f2dd06d22ef7cac9b55cb986a43d08da&=&format=webp&width=839&height=479',
      },
    });
  }

  private async createGuildReport(
    interaction: ChatInputCommandInteraction<CacheType>,
    msg: any,
    guildName: string,
  ) {
    console.log('[createGuildReport]: msg', msg);
    console.log('[createGuildReport]: guildName', guildName);

    return await this.prisma.guildCreateReport.create({
      data: {
        ownerId: interaction.user.id,
        serverId: interaction.guildId!,
        channelId: msg.channel.id,
        messageId: msg.id,
        guildName: guildName,
        invitedMembers: [interaction.user.id],
        confirmedMembers: [interaction.user.id],
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      },
    });
  }

  private async scheduleMessageDeletion(msg: any) {
    return setTimeout(
      () => {
        msg?.delete().catch(() => {});
      },
      1000 * 60 * 10,
    );
  }

  private async sendGuildInvitations(
    users: string[],
    GuildCreateReportId: string,
    guildName: string,
    inviter: string,
  ) {
    console.log('[sendGuildInvitations]: GuildCreateReportId', GuildCreateReportId);
    console.log('[sendGuildInvitations]: guildName', guildName);
    console.log('[sendGuildInvitations]: inviter', inviter);

    const createActionAccept = new ActionRowBuilder<ButtonBuilder>().setComponents(
      new ButtonBuilder()
        .setCustomId(`cancel_guild_invite_${GuildCreateReportId}`)
        .setLabel('ปฏิเสธ')
        .setEmoji('✖')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`accept_guild_invite_${GuildCreateReportId}`)
        .setLabel('ยอมรับ')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
    );
    for (const userId of users) {
      try {
        const user = await this.users.fetch(userId);
        console.log('[sendGuildInvitations]: user', user);
        await user.send({
          components: [createActionAccept],
          content: `คุณได้ถูกเชิญช่วยให้เป็นผู้ร่วมก่อตั้งกิลด์ ${guildName} โดย ${inviter}`,
        });
        console.log('[sendGuildInvitations]: user sent');
      } catch (error) {
        this.logger.error('Error sending DM to user', error);
      }
    }
  }

  @Button('accept_guild_invite_:GuildCreateReportId')
  async acceptGuildInvite(@Context() [interaction]: ButtonContext): Promise<void> {
    this.logger.debug('Processing accept guild invite request');
    
    const GuildCreateReportId = interaction.customId.replace('accept_guild_invite_', '');
    this.logger.debug(`Extracted GuildCreateReportId: ${GuildCreateReportId}`);

    await this.guildManage.acceptInviteCreate(interaction, GuildCreateReportId);
  }

  @Button('cancel_guild_invite_:GuildCreateReportId')
  async cancelGuildInvite(@Context() [interaction]: ButtonContext): Promise<void> {
    const GuildCreateReportId = interaction.customId.replace('cancel_guild_invite_', '');
    this.logger.debug(`Extracted GuildCreateReportId: ${GuildCreateReportId}`);
    
    await this.guildManage.cancelInviteCreate(interaction, GuildCreateReportId);
  }
}
