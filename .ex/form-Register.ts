import { ActionRowBuilder, ApplicationCommandOptionType, ApplicationCommandType, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, TextChannel } from "discord.js";
import { ClientBot } from "@/interfaces/client";
import { IReply } from "@/functions/reply/interactionReply";

module.exports = {
    name: "user",
    type: ApplicationCommandType.ChatInput,
    description: 'ระบบสำหรับผู้ใช้',
    options: [
        {
            name: "register",
            description: "ระบบยืนยันตัวตนเข้าดิส",
            type: ApplicationCommandOptionType.Subcommand
        }
    ],


    run: async (client: ClientBot, interaction: CommandInteraction) => {
        let subcommand = interaction.options.data[0].name
        if (subcommand == "register") {
            let embeds = new EmbedBuilder({
                "title": "ลงทะเบียนนักผจญภัย",
                "description": "- กรอกข้อมูลเพื่อนสร้างโปรไฟล์นักผจญภัยของคุณ คลิก \"ลงทะเบียน\"",
                "color": 16760137,
                "footer": {
                    "text": "ข้อมูลของคุณจะถูกเก็บเป็นความลับ",
                    "icon_url": "https://cdn-icons-png.flaticon.com/512/4104/4104800.png"
                },
                "image": {
                    "url": "https://media.discordapp.net/attachments/1222826027445653536/1222826136359276595/registerguild.webp?ex=6617a095&is=66052b95&hm=17dfd3921b25470b1e99016eb9f89dd68fb1ada3481867d145c8acf81e25cec6&=&format=webp&width=839&height=400"
                },
                "thumbnail": {
                    "url": "https://cdn-icons-png.flaticon.com/512/6521/6521996.png"
                }
            })

            let actionRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
                new ButtonBuilder()
                    .setCustomId("register-button")
                    .setEmoji("📝")
                    .setLabel("ลงทะเบียน")
                    .setStyle(ButtonStyle.Primary)
            )
            let channel = interaction.channel as TextChannel
            channel.send({
                embeds: [embeds],
                components: [actionRow]
            }).catch((e) => {
                return IReply(interaction, "ไม่สามารถสร้างรูปแบบลงทะเบียนได้", "error", true)
            }).then(() => {
                return IReply(interaction, "สร้างหน้าลงทะเบียนสำเร็จ", "success", true)
            })
        }
    }
};