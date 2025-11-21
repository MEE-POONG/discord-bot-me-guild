import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    ButtonInteraction,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ModalSubmitInteraction,
    PermissionFlagsBits,
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { NecordExecutionContext } from 'necord';
import { ServerRepository } from 'src/repository/server';
import { ServerMeguildSetService } from 'src/server-meguild-set/server-meguild-set.service';

@Injectable()
export class PackageGuard implements CanActivate {
    private readonly logger = new Logger(PackageGuard.name);

    constructor(
        private readonly serverRepository: ServerRepository,
        private readonly serverMeguildSetService: ServerMeguildSetService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const necordContext = NecordExecutionContext.create(context);
        const [interaction] = necordContext.getContext<'interactionCreate'>();

        // Check if interaction exists and has the required method (it might be an event context)
        if (!interaction || typeof interaction.isChatInputCommand !== 'function') {
            return true;
        }

        if (
            !interaction.isChatInputCommand() &&
            !interaction.isButton() &&
            !interaction.isModalSubmit() &&
            !interaction.isStringSelectMenu()
        ) {
            return true;
        }

        const guild = interaction.guild;
        if (!guild) return true; // DM or unknown context

        // Bypass for specific commands/buttons
        const commandName =
            (interaction as ChatInputCommandInteraction).commandName ||
            (interaction as ButtonInteraction).customId ||
            (interaction as ModalSubmitInteraction).customId;

        if (
            commandName === 'server-code' ||
            commandName === 'PACKAGE_CODE_MODAL' ||
            commandName === 'server-buy-pagekage' ||
            commandName?.startsWith('server_buy_package') ||
            commandName === 'SERVER_BUY_PACKAGE_MENU'
        ) {
            return true;
        }

        // 1. Check/Create me-guild-center
        const meguildChannel = guild.channels.cache.find(
            (c) => c.name === '🕍︰me-guild-center' && c.isTextBased(),
        );

        if (!meguildChannel) {
            this.logger.warn(
                `[PackageGuard] '🕍︰me-guild-center' missing in ${guild.name} (${guild.id}). Creating...`,
            );
            try {
                await this.serverMeguildSetService.createSystemChannel(guild, guild.members.cache.get(guild.ownerId)?.user);
            } catch (error) {
                this.logger.error(`[PackageGuard] Failed to create system channel: ${error}`);
            }
        }

        // 2. Check Package Expiration
        const server = await this.serverRepository.getServerById(guild.id);
        if (!server) {
            // If server not found in DB, maybe let it pass or block? 
            // Usually should be registered. Let's block and ask to register/contact admin.
            // But for now, assuming server exists if they are using the bot.
            return true;
        }

        if (server.openUntilAt && new Date() > new Date(server.openUntilAt)) {
            this.logger.warn(`[PackageGuard] Package expired for ${guild.name} (${guild.id})`);

            if (interaction.isRepliable()) {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ แพ็คเกจหมดอายุ')
                    .setDescription('แพ็คเกจของเซิร์ฟเวอร์นี้หมดอายุแล้ว กรุณาต่ออายุเพื่อใช้งานต่อ')
                    .setColor(0xff0000);

                // We can add a button to enter code here if we want, but the requirement says "show modal"
                // But we can't show modal directly from a guard easily without interaction response.
                // So we reply with ephemeral message telling them to use /server-code or button in me-guild-center

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('server-code')
                        .setLabel('ต่ออายุแพ็คเกจ')
                        .setEmoji('📝')
                        .setStyle(ButtonStyle.Success),
                );

                await interaction.reply({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true
                });
            }
            return false;
        }

        return true;
    }
}
