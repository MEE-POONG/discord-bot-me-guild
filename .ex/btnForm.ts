import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export function AdventurerForm(interaction: ButtonInteraction) {
    const modal = new ModalBuilder()
        .setCustomId("register_adventurer")
        .setTitle("ลงทะเบียนนักผจญภัย")
        .setComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .setComponents(
                    new TextInputBuilder()
                        .setCustomId("firstname")
                        .setLabel("ชื่อ")
                        .setPlaceholder("ระบุชื่อ")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(50)
                ),
            new ActionRowBuilder<TextInputBuilder>()
                .setComponents(
                    new TextInputBuilder()
                        .setCustomId("lastname")
                        .setLabel("นามสกุล")
                        .setPlaceholder("ระบุนามสกุล")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(50)
                ),
            new ActionRowBuilder<TextInputBuilder>()
                .setComponents(
                    new TextInputBuilder()
                        .setCustomId("age")
                        .setLabel("อายุ")
                        .setPlaceholder("ระบุอายุ")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(2)
                )
        )
    interaction.showModal(modal).catch((e) => {
        console.log(e)
        interaction.reply({
            content: "เกิดข้อผิดพลาด"
        }).catch(() => { })
    })
}