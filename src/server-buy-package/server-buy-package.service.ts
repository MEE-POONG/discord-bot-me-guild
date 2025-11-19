import { Injectable, Logger } from '@nestjs/common';
import { UserDB } from '@prisma/client';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  GuildMember,
  ModalSubmitInteraction,
  Guild,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  CacheType,
} from 'discord.js';
import { Button, ButtonContext, Context, Modal, ModalContext, StringSelect, StringSelectContext } from 'necord';
import { PrismaService } from 'src/prisma.service';
import { ServerRepository } from 'src/repository/server';
import { validateServerAndRole } from 'src/utils/server-validation.util';

@Injectable()
export class ServerBuyPackageService {
  private readonly logger = new Logger(ServerBuyPackageService.name);


  // ⭐ แพ็คเกจหลัก (Bot Meguild)
  private readonly mainPackages: {
    id: number;
    name: string;
    member: boolean;
    guildList: boolean;
    matchGame: boolean;
    botEvent: boolean;
    currency: boolean;
    live: boolean;
    donate: boolean;
    priceMonthly: number;
    priceYearly: number;
    musicBots: number;
    donateShare: number; // %
    entertainShare: string; // text เช่น "0%" หรือ "5%-20%"
    meguildShopShare: number; // %
  }[] = [
      {
        id: 1,
        name: '📦 Package 1 – Starter',
        // ฟีเจอร์
        member: true,        // ระบบสมาชิก
        guildList: true,     // ระบบสร้างกิลด์
        matchGame: true,     // ระบบแมตเกม
        botEvent: false,     // บอทกิจกรรม
        currency: false,     // ระบบสกุลเงิน
        live: false,         // ระบบไลฟ์รับโดเนท
        donate: false,       // ระบบโดเนท
        priceMonthly: 79,
        priceYearly: 790,
        musicBots: 1,
        donateShare: 0,
        entertainShare: '0%',
        meguildShopShare: 0,
      },
      {
        id: 2,
        name: '📦 Package 2 – Pro',
        member: true,
        guildList: true,
        matchGame: true,
        botEvent: true,
        currency: false,
        live: true,
        donate: true,
        priceMonthly: 169,
        priceYearly: 1690,
        musicBots: 2,
        donateShare: 5,
        entertainShare: '0%',
        meguildShopShare: 0,
      },
      {
        id: 3,
        name: '📦 Package 3 – Premium',
        member: true,
        guildList: true,
        matchGame: true,
        botEvent: true,
        currency: false,
        live: true,
        donate: true,
        priceMonthly: 299,
        priceYearly: 2990,
        musicBots: 3,
        donateShare: 10,
        entertainShare: '0%',
        meguildShopShare: 0,
      },
      {
        id: 4,
        name: '📦 Package 4 – Ultra (ใหม่)',
        member: true,
        guildList: true,
        matchGame: true,
        botEvent: true,
        currency: true,
        live: true,
        donate: true,
        priceMonthly: 499,
        priceYearly: 4990,
        musicBots: 5,
        donateShare: 15,
        entertainShare: '5% - 20%', // ระบบ Entertain
        meguildShopShare: 5,        // ระบบขายของออนไลน์ Meguild
      },
    ];


  private readonly musicAddons: {
    id: number;
    label: string;
    bots: number;
    price: number;
    avgPerBot: number;
    isCustom?: boolean;
  }[] = [
      { id: 1, label: '3 บอทเพลง', bots: 3, price: 59, avgPerBot: 19.67 },
      { id: 2, label: '5 บอทเพลง', bots: 5, price: 89, avgPerBot: 17.8 },
      { id: 3, label: '9 บอทเพลง', bots: 9, price: 149, avgPerBot: 16.56 },
      { id: 4, label: '15 บอทเพลง', bots: 15, price: 199, avgPerBot: 13.27 },
      { id: 5, label: 'Custom 25+ บอทเพลง', bots: 25, price: 250, avgPerBot: 10.0, isCustom: true },
    ];

  // 📘 Add-on อื่น ๆ
  private readonly extraAddons: {
    id: string;
    label: string;
    price: number;
    description: string;
  }[] = [
      {
        id: 'addon_currency',
        label: '🔧 ระบบสกุลเงิน (เพิ่มใน Package 1)',
        price: 49,
        description: 'เพิ่มระบบสกุลเงินประจำดิส (กำหนดเรทเองได้)',
      },
      {
        id: 'addon_donate_room',
        label: '💸 ห้องกิจกรรมโดเนท (เพิ่มใน Package 1)',
        price: 39,
        description: 'เปิดระบบห้องกิจกรรมโดเนท • ส่วนแบ่ง 5%',
      },
      {
        id: 'addon_event_bot',
        label: '🎉 บอทกิจกรรม (เพิ่มใน Package 1)',
        price: 29,
        description: 'สำหรับแจก ticket / coin / ของรางวัล',
      },
    ];


  constructor(
    private readonly prisma: PrismaService,
    private readonly serverRepository: ServerRepository,
  ) { }
  public onModuleInit() {
    this.logger.log('ServerBuyPackage initialized');
  }

  async ServerBuyPackageSystem(interaction: any) {
    const validationError = await validateServerAndRole(
      interaction,
      'owner',
      this.serverRepository,
    );
    if (validationError) return validationError;

    const server = await this.serverRepository.getServerById(interaction.guildId);
    if (!server) {
      return this.replyError(interaction, '❌ ไม่พบข้อมูลเซิร์ฟเวอร์ โปรดตรวจสอบอีกครั้ง!');
    }

    const selectRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('SERVER_BUY_PACKAGE_MENU')
          .setPlaceholder('เลือกหมวดแพ็คเกจที่ต้องการดู')
          .addOptions([
            {
              label: '⭐ แพ็คเกจหลัก (Bot Meguild)',
              value: 'main',
              description: 'แพ็คเกจ 1–4: Starter / Pro / Premium / Ultra',
              emoji: '⭐',
            },
            {
              label: '🎧 แพ็คเกจเพิ่มบอทเพลง (Add-on)',
              value: 'music',
              description: 'เพิ่มจำนวนบอทเพลงในดิสของคุณ',
              emoji: '🎧',
            },
            {
              label: '📘 ตัวเลือกเสริมอื่น ๆ (Add-on)',
              value: 'extra',
              description: 'เพิ่มระบบสกุลเงิน / ห้องโดเนท / บอทกิจกรรม',
              emoji: '📘',
            },
          ]),
      );


    const embed = new EmbedBuilder()
      .setTitle('⭐️✨【 📋 เลือกหมวดแพ็คเกจ MeGuild 📋 】✨⭐️')
      .setDescription(
        [
          'กรุณาเลือกหมวดที่ต้องการดูรายละเอียดแพ็คเกจจากเมนูด้านล่าง:',
          '',
          '• ⭐ แพ็คเกจหลัก (Bot Meguild)',
          '• 🎧 แพ็คเกจเพิ่มบอทเพลง (Add-on)',
          '• 📘 ตัวเลือกเสริมอื่น ๆ (Add-on)',
          '',
          '⏰ **หมายเหตุ:** ข้อความนี้จะหายไปอัตโนมัติใน 60 วินาที',
        ].join('\n'),
      )
      .setColor(0x00bfff);

    const reply = await interaction.reply({
      embeds: [embed],
      components: [selectRow],
      ephemeral: true,
      fetchReply: true,
    });

    setTimeout(async () => {
      try {
        await (reply as any).delete().catch(() => null);
      } catch (err) {
        this.logger.warn(
          '[ServerBuyPackageSystem] Failed to auto delete menu message:',
          (err as any).message,
        );
      }
    }, 60_000);
    //  select package
  }

  @StringSelect('SERVER_BUY_PACKAGE_MENU')
  async handlePackageMenu(@Context() [interaction]: StringSelectContext) {
    const selected = interaction.values[0]; // main | music | extra
    this.logger.debug('[handlePackageMenu] selected:', selected);

    if (selected === 'main') {
      return this.showMainPackages(interaction);
    } else if (selected === 'music') {
      return this.showMusicAddons(interaction);
    } else if (selected === 'extra') {
      return this.showExtraAddons(interaction);
    }

    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ ไม่พบหมวดแพ็คเกจ')
          .setDescription('กรุณาลองเลือกหมวดใหม่อีกครั้ง')
          .setColor(0xff0000),
      ],
      components: [],
    });
  }

  private async showMainPackages(interaction: StringSelectMenuInteraction<CacheType>,) {
    const embed = new EmbedBuilder()
      .setTitle('⭐ แพ็คเกจหลัก (Bot MeGuild)')
      .setColor(0x00bcd4);

    const featureFields = (p: any) => [
      {
        name: '⚙️ ระบบหลัก',
        value: [
          `${p.member ? '✅' : '❌'}\` 👥 : สมาชิก \``,
          `${p.guildList ? '✅' : '❌'}\` 🛡️ : สร้างกิลด์ \``,
          `${p.matchGame ? '✅' : '❌'}\` 🎮 : แมตเกม \``,
          `${p.botEvent ? '✅' : '❌'}\`🎉 : บอทกิจกรรม \``,
          `${p.currency ? '✅' : '❌'}\` 💰 : สกุลเงิน \``,
        ].join('\n'),
        inline: true,
      },
      {
        name: '💼 ระบบเสริม',
        value: [
          `${p.live ? '✅' : '❌'}\`📺 : ไลฟ์โดเนท \``,
          `${p.donate ? '✅' : '❌'}\` 🎁 : โดเนท \``,
          `${p.entertainShare !== '0%' ? '✅' : '❌'}\` 🎭 : Entertain \``,
          `${p.meguildShopShare > 0 ? '✅' : '❌'}\` 🛒 : Meguild Shop \``,
          `${p.musicBots} ตัว\` 🎵 : บอทเพลง \``,
        ].join('\n'),
        inline: true,
      },
      {
        name: '💸 รายได้ & ส่วนแบ่ง',
        value: [
          `${p.donateShare}%\` 💸 ห้องกิจกรรมโดเนท: \``,
          `${p.entertainShare}\` 🎭 ส่วนแบ่ง Entertain: \``,
          `${p.meguildShopShare}%\` 🛒 ส่วนแบ่ง Shop: \``,
        ].join('\n'),
        inline: true,
      }
    ];
    for (const p of this.mainPackages) {
      embed.addFields(
        {
          name: `__${p.name}__`,
          value: `💳 ราคา: \`${p.priceMonthly}฿ / เดือน\` • \`${p.priceYearly}฿ / ปี\``,
          inline: false,
        },
        ...featureFields(p),
      );
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...this.mainPackages.map((p) =>
        new ButtonBuilder()
          .setCustomId(`server_buy_package_main_${p.id}`)
          .setLabel(`${p.name} (${p.priceMonthly}฿/เดือน)`)
          .setStyle(ButtonStyle.Primary),
      ),
    );

    const reply = await interaction.update({
      embeds: [embed],
      components: [row],
    });

    // auto delete หลัง 20 วิ (เหมือนแลก coin)
    setTimeout(async () => {
      try {
        await (interaction.message as any)?.delete().catch(() => null);
      } catch (err) {
        this.logger.warn(
          '[showMainPackages] Failed to auto delete message:',
          (err as any).message,
        );
      }
    }, 20_000);

    return reply;
  }

  // ---------- แสดง 🎧 แพ็คเกจเพิ่มบอทเพลง ----------
  private async showMusicAddons(interaction: StringSelectMenuInteraction<CacheType>) {
    const embed = new EmbedBuilder()
      .setTitle('⭐️✨【 🎧 แพ็คเกจเพิ่มบอทเพลง (Add-on) 🎧 】✨⭐️')
      .setDescription(
        [
          'ใช้เมื่อคุณต้องการบอทเพลงหลายตัวสำหรับหลายห้อง หรือหลายกิลด์',
          '',
          '💡 Custom 25+ ตัว คิดราคาขั้นต่ำ ~10฿ / 1 ตัว (เริ่ม 250฿ ต่อเดือน)',
        ].join('\n'),
      )
      .setColor(0x9c27b0);

    const fields = this.musicAddons.map((a) => ({
      name: `__${a.label}__`,
      value: [
        ` * 💳 ราคา: \`${a.price.toLocaleString('th-TH')}฿ / เดือน\``,
        ` * 🎵 จำนวนบอทเพลง: \`${a.bots} ตัว\``,
        ` * ⚖️ เฉลี่ยต่อ 1 ตัว: \`${a.avgPerBot.toFixed(2)}฿\``,
        a.isCustom ? '📌 Custom: เริ่มต้นที่ 25 ตัวขึ้นไป ปรับดีลได้กับผู้ให้บริการ' : '',
      ]
        .filter(Boolean)
        .join('\n'),
      inline: true,
    }));

    embed.addFields(...fields);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...this.musicAddons.map((a) =>
        new ButtonBuilder()
          .setCustomId(`server_buy_package_music_${a.id}`)
          .setLabel(`${a.label} (${a.price}฿/เดือน)`)
          .setStyle(ButtonStyle.Primary),
      ),
    );

    const reply = await interaction.update({
      embeds: [embed],
      components: [row],
    });

    setTimeout(async () => {
      try {
        await (interaction.message as any)?.delete().catch(() => null);
      } catch (err) {
        this.logger.warn(
          '[showMusicAddons] Failed to auto delete message:',
          (err as any).message,
        );
      }
    }, 20_000);

    return reply;
  }

  // ---------- แสดง 📘 Add-on อื่น ๆ ----------
  private async showExtraAddons(interaction: StringSelectMenuInteraction<CacheType>) {
    const embed = new EmbedBuilder()
      .setTitle('⭐️✨【 📘 ตัวเลือกเสริมอื่น ๆ (Add-on) 📘 】✨⭐️')
      .setDescription(
        [
          'ใช้ได้โดยเฉพาะกับผู้ที่ใช้ Package 1 – Starter ที่อยากอัปเกรดบางระบบเฉพาะจุด',
          '',
          '• เพิ่มระบบสกุลเงินประจำดิส',
          '• เพิ่มห้องกิจกรรมโดเนท',
          '• เพิ่มบอทกิจกรรมแจกของ',
        ].join('\n'),
      )
      .setColor(0x4caf50);

    const fields = this.extraAddons.map((a) => ({
      name: `__${a.label}__`,
      value: [
        ` * 💳 ราคา: \`${a.price.toLocaleString('th-TH')}฿ / เดือน\``,
        ` * ℹ️ ${a.description}`,
      ].join('\n'),
      inline: false,
    }));

    embed.addFields(...fields);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...this.extraAddons.map((a) =>
        new ButtonBuilder()
          .setCustomId(`server_buy_package_extra_${a.id}`)
          .setLabel(`${a.label} (${a.price}฿/เดือน)`)
          .setStyle(ButtonStyle.Primary),
      ),
    );

    const reply = await interaction.update({
      embeds: [embed],
      components: [row],
    });

    setTimeout(async () => {
      try {
        await (interaction.message as any)?.delete().catch(() => null);
      } catch (err) {
        this.logger.warn(
          '[showExtraAddons] Failed to auto delete message:',
          (err as any).message,
        );
      }
    }, 20_000);

    return reply;
  }

  private replyError(interaction: any, message: string) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ เกิดข้อผิดพลาด')
          .setDescription(message)
          .setFooter({ text: 'แจ้งผู้ให้บริการหริอตรวจสอบสิทธิใน Discord' })
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }
}
