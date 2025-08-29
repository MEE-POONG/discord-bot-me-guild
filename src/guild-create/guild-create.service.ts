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
  ModalBuilder,
  ModalSubmitInteraction,
  REST,
  ShardClientUtil,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  UserManager,
  UserSelectMenuBuilder,
  WebSocketManager,
} from 'discord.js';
import { GuildManageService, UserProfile } from 'src/guild-manage/guild-manage.service';
import { UserDataService } from 'src/user-data/user-data.service';
import { ServerRepository } from 'src/repository/server';
import { Button, ButtonContext, Context, Modal, ModalContext, On, StringSelectContext } from 'necord';

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
  ) { }

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

    // ตรวจสอบความยาวชื่อกิลด์
    if (guildName.length < 4 || guildName.length > 16) {
      if (interaction.isModalSubmit()) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ ชื่อกิลด์ไม่ถูกต้อง')
          .setDescription(
            `💡 **ปัญหา:** ชื่อกิลด์ต้องมีความยาว 4-16 ตัวอักษร\n` +
            `📏 **ความยาวปัจจุบัน:** ${guildName.length} ตัวอักษร\n` +
            `📝 **ชื่อที่ใส่:** "${guildName}"\n\n` +
            `🔄 **วิธีแก้ไข:** กรุณาใช้คำสั่ง \`/guild-create\` ใหม่อีกครั้ง`
          )
          .setColor(0xff4444)
          .setFooter({ text: '💡 ข้อความนี้จะหายไปในอีก 5 วินาที' })
          .setTimestamp();

        const reply = await interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true,
        });

        // Auto delete after 5 seconds
        setTimeout(async () => {
          try {
            await interaction.deleteReply();
          } catch (error) {
            // Message might already be deleted
          }
        }, 5000);
        
        return reply;
      } else {
        const errorMessage = `ชื่อกิลด์ต้องมีความยาว 4-16 ตัวอักษร (ปัจจุบัน: ${guildName.length} ตัวอักษร)\n\nโปรดใส่ชื่อกิลด์ใหม่ที่มีความยาวเหมาะสม`;
        const modal = this.createGuildNameModal(errorMessage);
        return interaction.showModal(modal);
      }
    }

    // ตรวจสอบรูปแบบชื่อกิลด์
    if (!/^[a-zA-Z0-9_]+$/.test(guildName)) {
      if (interaction.isModalSubmit()) {
        const invalidChars = guildName.match(/[^a-zA-Z0-9_]/g);
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ รูปแบบชื่อกิลด์ไม่ถูกต้อง')
          .setDescription(
            `💡 **ปัญหา:** ชื่อกิลด์มีตัวอักษรที่ไม่ได้รับอนุญาต\n` +
            `📝 **ชื่อที่ใส่:** "${guildName}"\n` +
            `❌ **ตัวอักษรที่ผิด:** ${invalidChars ? invalidChars.join(', ') : 'ไม่ทราบ'}\n` +
            `✅ **อนุญาตเฉพาะ:** a-z, A-Z, 0-9, และ _ เท่านั้น\n\n` +
            `🔄 **วิธีแก้ไข:** กรุณาใช้คำสั่ง \`/guild-create\` ใหม่อีกครั้ง`
          )
          .setColor(0xff4444)
          .setFooter({ text: '💡 ข้อความนี้จะหายไปในอีก 5 วินาที' })
          .setTimestamp();

        const reply = await interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true,
        });

        // Auto delete after 5 seconds
        setTimeout(async () => {
          try {
            await interaction.deleteReply();
          } catch (error) {
            // Message might already be deleted
          }
        }, 5000);
        
        return reply;
      } else {
        const errorMessage = `ชื่อกิลด์ "${guildName}" มีตัวอักษรที่ไม่ได้รับอนุญาต\n\nอนุญาตเฉพาะ: a-z, A-Z, 0-9, และ _ เท่านั้น\n\nโปรดแก้ไขชื่อกิลด์ให้ถูกต้อง`;
        const modal = this.createGuildNameModal(errorMessage);
        return interaction.showModal(modal);
      }
    }

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
          const errorEmbed = new EmbedBuilder()
            .setTitle('❌ ไม่สามารถเลือกตัวเองได้')
            .setDescription(
              `🚫 **ข้อผิดพลาด:** คุณไม่สามารถเพิ่มตัวเองเป็นผู้ร่วมก่อตั้งได้\n\n` +
              `👑 **เหตุผล:** คุณจะได้รับสถานะเป็นหัวหน้ากิลด์โดยอัตโนมัติ\n` +
              `🎯 **การดำเนินการ:** กรุณาเลือกสมาชิกคนอื่นเป็นผู้ร่วมก่อตั้ง\n\n` +
              `💡 **คำแนะนำ:** เลือกสมาชิกที่คุณไว้วางใจและต้องการให้ช่วยบริหารกิลด์`
            )
            .setColor(0xff4444)
            .setFooter({ text: '💨 ข้อความนี้จะหายไปในอีก 5 วินาที' })
            .setTimestamp();

          await interaction.editReply({
            content: '',
            embeds: [errorEmbed],
            components: [],
          });

          // Auto delete after 5 seconds
          setTimeout(async () => {
            try {
              await interaction.deleteReply();
            } catch (error) {
              // Message might already be deleted
            }
          }, 5000);
          
          return;
        }

        const userHasGuild = await this.checkUsersGuildStatus(users);
        console.log('[interactionHandler]: userHasGuild', userHasGuild);

        if (userHasGuild.length > 0) {
          // แสดง 5 วินาทีค่อย 
          await this.replyWithExistingGuilds(i, userHasGuild);
          setTimeout(async () => {
            await interaction.deleteReply();
          }, 10000);
          // await interaction.deleteReply();
          return;
        }

        const totalInvited = users.length + 1; // include owner
        const allInvitedUsers = [interaction.user.id, ...users]; // owner + invited users
        const createAcceptGuildEmbeds = this.createGuildProgressEmbed(guildName, 1, totalInvited, allInvitedUsers);
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

        // Auto delete progress message after 3 minutes
        setTimeout(async () => {
          try {
            await msg.delete();
          } catch (error) {
            // Message might already be deleted
          }
        }, 3 * 60 * 1000);
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
      .setTitle('🚫 ไม่สามารถก่อตั้งกิลด์ได้')
      .setDescription(
        `💡 **เหตุผล:** มีสมาชิกที่ถูกเชิญมีกิลด์อยู่แล้ว\n\n` +
        `👥 **รายชื่อผู้ที่ไม่สามารถเข้าร่วมได้:**\n` +
        `${userHasGuild.map((id, index) => `${index + 1}. <@${id}>`).join('\n')}\n\n` +
        `✨ **คำแนะนำ:** กรุณาเลือกสมาชิกคนอื่นที่ยังไม่มีกิลด์เพื่อเข้าร่วมก่อตั้งกิลด์ใหม่`
      )
      .setColor(0xff4444)
      .setFooter({ text: '💫 ข้อความนี้จะหายไปในอีกไม่กี่วินาที' })
      .setTimestamp();
    await i.update({ embeds: [embeds], components: [], content: '' });
  }

  private createGuildProgressEmbed(guildName: string, confirmedCount: number = 1, totalInvited: number = 4, invitedUserIds: string[] = []): EmbedBuilder {
    const progressBar = this.createProgressBar(confirmedCount, totalInvited);
    const progressPercentage = Math.round((confirmedCount / totalInvited) * 100);
    
    let invitedList = '';
    if (invitedUserIds.length > 0) {
      invitedList = '\n\n🎯 **คำเชิญชวนร่วมก่อตั้งได้ส่งไปยัง:**\n';
      invitedUserIds.forEach((userId, index) => {
        const status = index < confirmedCount ? '✅' : '⏳';
        invitedList += `${status} ${index + 1}. <@${userId}>\n`;
      });
      invitedList += '\n⏰ **ข้อความนี้จะปิดตัวเองใน 3 นาที**';
    }

    return new EmbedBuilder()
      .setTitle(`🏰 ความคืบหน้าการก่อตั้งกิลด์ "${guildName}"`)
      .setDescription(
        `${progressBar} **${confirmedCount}/${totalInvited}** (${progressPercentage}%)\n\n` +
        `📊 **สถานะปัจจุบัน:**\n` +
        `✅ ยืนยันแล้ว: **${confirmedCount}** คน\n` +
        `⏳ รอการยืนยัน: **${totalInvited - confirmedCount}** คน${invitedList}`
      )
      .setColor(confirmedCount === totalInvited ? 0x00ff00 : 0xffa500)
      .setFooter({ 
        text: `🎮 กิลด์ ${guildName} • กำลังรอการยืนยันจากสมาชิก`,
        iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png'
      })
      .setTimestamp()
      .setImage('https://media.discordapp.net/attachments/861491684214833182/1224411890415829102/DALLE_2024-04-02_00.35.29_-_A_digital_illustration_of_a_group_of_adventurers_gathered_around_a_map_laid_out_on_a_rustic_wooden_table_their_expressions_serious_as_they_plan_their.webp?ex=661d656f&is=660af06f&hm=e9744b69a8c206d8b8f48fd1753bc9c5f2dd06d22ef7cac9b55cb986a43d08da&=&format=webp&width=839&height=479');
  }

  private createProgressBar(current: number, total: number): string {
    const filled = Math.round((current / total) * 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
  }

  private createGuildNameModal(errorMessage?: string): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId('guild-create-retry-modal')
      .setTitle(errorMessage ? 'แก้ไขชื่อกิลด์' : 'สร้างกิลด์ใหม่')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('guild-name')
            .setLabel('ชื่อกิลด์')
            .setPlaceholder('ใส่ชื่อกิลด์ (4-16 ตัวอักษร, aA-zZ, 0-9, _ เท่านั้น)')
            .setStyle(TextInputStyle.Short)
            .setMinLength(4)
            .setMaxLength(16)
            .setRequired(true)
        ),
      );

    if (errorMessage) {
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('error-info')
            .setLabel('❌ ข้อผิดพลาด')
            .setValue(errorMessage)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
        ),
      );
    }

    return modal;
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
        .setLabel('ปฏิเสธการเชิญ')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`accept_guild_invite_${GuildCreateReportId}`)
        .setLabel('ยอมรับและเข้าร่วม')
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Success),
    );
    for (const userId of users) {
      try {
        const user = await this.users.fetch(userId);
        console.log('[sendGuildInvitations]: user', user);
        const invitationEmbed = new EmbedBuilder()
          .setTitle(`🏰 คำเชิญเข้าร่วมก่อตั้งกิลด์ "${guildName}"`)
          .setDescription(
            `🌟 **คุณได้รับเกียรติให้เป็นผู้ร่วมก่อตั้งกิลด์!**\n\n` +
            `👑 **ผู้เชิญ:** ${inviter}\n` +
            `🎯 **บทบาท:** ผู้ร่วมก่อตั้งกิลด์\n` +
            `💎 **สิทธิพิเศษ:** เข้าถึงพื้นที่ส่วนตัว, จัดการกิจกรรม, มีสิทธิ์ในการตัดสินใจ\n\n` +
            `⏰ **ระยะเวลา:** คุณมีเวลา 5 นาทีในการตัดสินใจ\n` +
            `🎮 **หมายเหตุ:** เมื่อครบจำนวนผู้ร่วมก่อตั้งจะสร้างกิลด์ทันที!`
          )
          .setColor(0x9932cc)
          .setFooter({ text: '✨ การตัดสินใจของคุณมีความสำคัญต่อการก่อตั้งกิลด์' })
          .setTimestamp()
          .setThumbnail('https://media.discordapp.net/attachments/861491684214833182/1224408324922015876/DALLE_2024-04-02_00.21.20_-_A_vibrant_watercolor_of_an_elven_archer_a_human_mage_and_a_dwarf_warrior_standing_triumphantly_atop_a_hill_looking_towards_the_horizon_at_dawn._The.webp?ex=661d621d&is=660aed1d&hm=29e373d7dea2b16ceddf3e45271ca343bf01c5e5b2bbfc1ee263503f04900ca7&=&format=webp&width=839&height=479');

        await user.send({
          content: `🌟 **คุณได้รับคำเชิญพิเศษจากกิลด์ ${guildName}!** 🌟`,
          embeds: [invitationEmbed],
          components: [createActionAccept],
        });
        console.log('[sendGuildInvitations]: user sent');
      } catch (error) {
        this.logger.error('Error sending DM to user', error);
      }
    }
    
    // Schedule automatic cancellation after 5 minutes
    this.scheduleGuildCancellation(GuildCreateReportId);
  }

  private async scheduleGuildCancellation(guildReportId: string) {
    setTimeout(async () => {
      try {
        const report = await this.prisma.guildCreateReport.findFirst({
          where: { id: guildReportId }
        });

        if (!report) return; // Already processed or deleted

        // Check if guild was completed (all members confirmed)
        if (report.confirmedMembers.length >= report.invitedMembers.length) return;

        // Cancel the guild creation
        await this.cancelExpiredGuild(report);
      } catch (error) {
        this.logger.error('Error in scheduled guild cancellation', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async cancelExpiredGuild(report: any) {
    try {
      // แจ้งเตือนผู้ส่งคำเชิญว่ากิลด์หมดเวลา
      await this.guildManage.sendProgressUpdateToCreator(
        report.ownerId,
        report.guildName,
        report.confirmedMembers,
        'failed',
        report.invitedMembers,
        'หมดเวลา 5 นาที สมาชิกไม่ยืนยันครบ'
      );

      // Try to edit the original DM message first
      try {
        const channel = await this.client.channels.fetch(report.channelId);
        if (channel && channel.isDMBased()) {
          const message = await channel.messages.fetch(report.messageId);
          if (message) {
            const timeoutEmbed = new EmbedBuilder()
              .setTitle('⏰ การสร้างกิลด์หมดเวลา')
              .setDescription(
                `🏰 **กิลด์ "${report.guildName}"**\n\n` +
                `💔 **สถานะ:** ยกเลิกแล้ว\n` +
                `📝 **เหตุผล:** หมดเวลา 5 นาที\n` +
                `📊 **ยืนยันแล้ว:** ${report.confirmedMembers.length}/${report.invitedMembers.length} คน\n\n` +
                `🔄 **คำแนะนำ:** คุณสามารถลองสร้างกิลด์ใหม่ได้อีกครั้ง`
              )
              .setColor(0xff6b6b)
              .setFooter({ text: '💡 ลองเชิญสมาชิกที่ออนไลน์อยู่เพื่อการตอบกลับที่รวดเร็ว' })
              .setTimestamp();

            await message.edit({
              content: `⏰ **การสร้างกิลด์ "${report.guildName}" หมดเวลา**`,
              embeds: [timeoutEmbed],
              components: [] // Remove dismiss button
            });
          }
        }
      } catch (editError) {
        this.logger.warn('Could not edit original DM for timeout cancellation');
      }

      // Delete the report from database
      await this.prisma.guildCreateReport.delete({
        where: { id: report.id }
      }).catch(() => {
        this.logger.warn('Could not delete expired guild report');
      });

      this.logger.log(`Guild creation timeout: ${report.guildName} (${report.id})`);
    } catch (error) {
      this.logger.error('Error canceling expired guild:', error);
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
