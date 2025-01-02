import { ButtonInteraction, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { IReply } from "@/functions/reply/interactionReply";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export const handleRegisterModal = async (interaction: ButtonInteraction) => {
    if (interaction.customId === "register-button") {
        try {
            // Create the modal for user registration
            const modal = new ModalBuilder()
                .setCustomId('register-modal')
                .setTitle("ลงทะเบียนนักผจญภัย")
                .setComponents(
                    new ActionRowBuilder<TextInputBuilder>().setComponents(
                        new TextInputBuilder()
                            .setCustomId('name')
                            .setLabel("ชื่อ")
                            .setPlaceholder("โปรดระบุชื่อเต็มของคุณ")
                            .setMinLength(2)
                            .setMaxLength(50)
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                    ),
                    new ActionRowBuilder<TextInputBuilder>().setComponents(
                        new TextInputBuilder()
                            .setCustomId('email')
                            .setLabel("อีเมล")
                            .setPlaceholder("โปรดระบุอีเมลของคุณ")
                            .setMinLength(5)
                            .setMaxLength(100)
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                    ),
                    new ActionRowBuilder<TextInputBuilder>().setComponents(
                        new TextInputBuilder()
                            .setCustomId('nickname')
                            .setLabel("นามแฝง")
                            .setPlaceholder("โปรดระบุนามแฝงของคุณ")
                            .setMinLength(1)
                            .setMaxLength(20)
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                    ),
                    new ActionRowBuilder<TextInputBuilder>().setComponents(
                        new TextInputBuilder()
                            .setCustomId('gender')
                            .setLabel("เพศ")
                            .setPlaceholder("ระบุเพศของคุณ (ชาย/หญิง/อื่นๆ)")
                            .setMinLength(2)
                            .setMaxLength(10)
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                    )
                );

            // Show the modal to the user
            await interaction.showModal(modal);
        } catch (error) {
            console.error("Error displaying registration modal:", error);
            return IReply(interaction, "ไม่สามารถแสดงแบบฟอร์มการลงทะเบียนได้", "error", true);
        }
    }
};