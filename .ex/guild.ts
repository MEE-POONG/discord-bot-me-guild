import { ActionRowBuilder, ApplicationCommandOptionType, ApplicationCommandType, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, GuildMember, Role, StringSelectMenuBuilder, TextChannel, UserSelectMenuBuilder } from "discord.js";

import { guildManage } from "../../functions/guildManage";
import { PrismaClient } from "@prisma/client";
import { ClientBot } from "../../interfaces/client";
import { userData } from "../../functions/prisma/userData";
import { IReply } from "../../functions/reply/interactionReply";
let prisma = new PrismaClient();

module.exports = {
    name: "guild",
    description: "คำสั่งจัดการกิลด์",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "-create",
            description: "สร้างกิลด์ (ฟรี)",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "guild-name",
                    description: "ระบุชื่อกิลด์ที่ต้องการสร้าง",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        }, {
            name: "-kick",
            description: "เตะสมาชิก",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "member",
                    description: "เลือกสมาชิกที่คุณต้องการเตะ",
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        }, {
            name: "-invite",
            description: "เชิญสมาชิกเข้าร่วมกิลด์",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "member",
                    description: "เลือกสมาชิกที่คุณต้องการเชิญ",
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        }, {
            name: "-public",
            description: "เปิดให้สมาชิกทั่วไปเข้าร่วมกิลด์",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "mode",
                    description: "เลือกโหมดที่ต้องการ",
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: "เปิด",
                            value: "open"
                        }, {
                            name: "ปิด",
                            value: "close"
                        }
                    ]
                }
            ]
        }, {
            name: "-leave",
            description: "ออกจากกิลด์",
            type: ApplicationCommandOptionType.Subcommand
        }, {
            name: "-request",
            description: "ตรวจสอบคำขอเข้าร่วมกิลด์",
            type: ApplicationCommandOptionType.Subcommand
        }, {
            name: "-join",
            description: "-ขอเข้าร่วมกิลด์",
            type: ApplicationCommandOptionType.Subcommand,
        }, {
            name: "-delete",
            description: "ลบกิลด์",
            type: ApplicationCommandOptionType.Subcommand
        }
    ],

    run: async (client: ClientBot, interaction: CommandInteraction) => {
        let subCommand = interaction.options.data[0].name;
        let memberData = new guildManage(interaction.member as GuildMember)
        if (subCommand == "-create") {
            let ownerData = await new userData(interaction.user).getProfile() as any
            if (!ownerData) return IReply(interaction, "คุณไม่สามารถสร้างกิลด์ได้ เนื่องจากคุณไม่มีข้อมูลนักผจญภัย โปรดลงทะเบียนก่อนสร้างกิลด์", "error", true)

            let guildName = interaction.options.get("guild-name")?.value as string;
            if (guildName.length < 4 || guildName.length > 16) return IReply(interaction, "ชื่อกิลด์ของคุณต้องมีความยาวระหว่าง 4-16 ตัวอักษร", "warn", true);
            if (!(/^[a-zA-Z0-9_]+$/.test(guildName))) return IReply(interaction, "ชื่อกิลด์ของคุณผิดกฏ อนุญาตให้ใช้เพียง aA-zZ, 0-9 และ _ เท่านั้น ", "warn", true);
            let time = `<t:${((Date.now() / 1000) + 600).toFixed(0)}:R>`
            if (await memberData.checkGuild(ownerData)) return IReply(interaction, "คุณไม่สามารถสร้างกิลด์ได้เนื่องจากคุณมีกิลด์อยู่แล้ว", "info", true);
            let createEmbedFounded = new EmbedBuilder({
                title: "เลือกผู้ร่วมก่อตั้งสมาชิกของคุณ (1/4) คน",
                description: `- คุณจำเป็นที่จะต้องมีผู้ร่วมก่อตั้งกิลด์ 4 คน เพื่อทำการสร้างกิลด์\n- ระยะเวลาในการยอมรับ ${time}`,
                color: 9304831,
                image: {
                    url: "https://media.discordapp.net/attachments/861491684214833182/1224408324922015876/DALLE_2024-04-02_00.21.20_-_A_vibrant_watercolor_of_an_elven_archer_a_human_mage_and_a_dwarf_warrior_standing_triumphantly_atop_a_hill_looking_towards_the_horizon_at_dawn._The.webp?ex=661d621d&is=660aed1d&hm=29e373d7dea2b16ceddf3e45271ca343bf01c5e5b2bbfc1ee263503f04900ca7&=&format=webp&width=839&height=479"
                }
            })

            let createSelectMemberForFounded = new ActionRowBuilder<UserSelectMenuBuilder>()
                .setComponents(
                    new UserSelectMenuBuilder()
                        .setCustomId(`select_founded_id_${interaction.user.id}`)
                        .setMaxValues(10)
                        .setMinValues(4)
                        .setPlaceholder("โปรดเลือกผู้เริ่มก่อตั้ง")
                )

            interaction.reply({
                embeds: [createEmbedFounded],
                components: [createSelectMemberForFounded]
            }).catch((e) => {
                return IReply(interaction, "ไม่สามารถแสดงหน้าต่างเพื่อเลือกผู้ร่วมก่อตั้งได้", "error", true)
            }).then((inter) => {
                if (!inter) return;
                inter.createMessageComponentCollector({
                    filter: (i) => i.customId == `select_founded_id_${interaction.user.id}` && i.user.id == interaction.user.id,
                    max: 1
                }).on("collect", async (i) => {

                    if (!i.isUserSelectMenu()) return;
                    let users = i.values;
                    let userHasGuild = []

                    for (let i = 0; i < users.length; i++) {
                        let user = await prisma.guildMembers.findFirst({
                            where: {
                                userId: users[i]
                            }
                        })

                        if (user) userHasGuild.push(users[i])
                    }

                    if (userHasGuild.length > 0) {
                        let embeds = new EmbedBuilder().setDescription(`ผู้ร่วมก่อตั้งต่อไปนี้มีกิลด์อยู่แล้ว\n${userHasGuild.map((id) => `<@${id}>`).join(", ")}`).setColor("Red")
                        i.reply({
                            embeds: [embeds],
                            ephemeral: true
                        }).catch(() => { })
                        interaction.deleteReply().catch(() => { })
                        return
                    } else {
                        let createAcceptGuildEmbeds = new EmbedBuilder({
                            "description": `# ความคืบหน้า (1/4) ของกิลด์ ${guildName}`,
                            "color": 16759101,
                            "image": {
                                "url": "https://media.discordapp.net/attachments/861491684214833182/1224411890415829102/DALLE_2024-04-02_00.35.29_-_A_digital_illustration_of_a_group_of_adventurers_gathered_around_a_map_laid_out_on_a_rustic_wooden_table_their_expressions_serious_as_they_plan_their.webp?ex=661d656f&is=660af06f&hm=e9744b69a8c206d8b8f48fd1753bc9c5f2dd06d22ef7cac9b55cb986a43d08da&=&format=webp&width=839&height=479"
                            }
                        })

                        const channel = interaction.channel as TextChannel

                        channel.send({
                            content: `${interaction.member?.toString()}`,
                            embeds: [createAcceptGuildEmbeds]
                        }).then((msg) => {
                            if (!msg) return IReply(interaction, "ไม่สามารถสร้างข้อความได้", "error", true);

                            prisma.guildCreateReport.create({
                                data: {
                                    ownerId: interaction.user.id,
                                    channelId: msg.channel.id,
                                    messageId: msg.id,
                                    guildName: guildName,
                                    members: {
                                        set: [interaction.user.id]
                                    }
                                }
                            }).catch((e) => {
                                return IReply(interaction, "ไม่สามารถสร้างข้อมูลของการสมัครกิลด์ได้", "error", true)
                            }).then((guildReport) => {
                                if (!guildReport) return IReply(interaction, "ไม่สามารถสร้างข้อมูลของการสมัครกิลด์ได้", "error", true)


                                let users = i.values;
                                if (users.some((id) => { id == interaction.user.id })) return IReply(interaction, "คุณไม่สามารถเพิ่มตัวเองเข้าใน ผู้ร่วมก่อตั้งได้")

                                setTimeout(() => {
                                    msg?.delete().catch(() => { })
                                }, 1000 * 60 * 10)

                                let createActionAccept = new ActionRowBuilder<ButtonBuilder>()
                                    .setComponents(
                                        new ButtonBuilder()
                                            .setCustomId(`cancel_guild_invite_${guildReport.id}`)
                                            .setLabel("ปฏิเสธ")
                                            .setEmoji("✖")
                                            .setStyle(ButtonStyle.Danger),

                                        new ButtonBuilder()
                                            .setCustomId(`accept_guild_invite_${guildReport.id}`)
                                            .setLabel("ยอมรับ")
                                            .setEmoji("✅")
                                            .setStyle(ButtonStyle.Success)
                                    )

                                for (let i = 0; i < users.length; i++) {
                                    client.users.fetch(users[i]).catch((e) => {
                                    }).then((u) => {
                                        if (u) {
                                            u.send({
                                                components: [createActionAccept],
                                                content: `คุณได้ถูกเชิญช่วยให้เป็นผู้ร่วมก่อตั้งกิลด์ ${guildName} โดย ${interaction.user.toString()}`
                                            }).catch(() => { })
                                        }
                                    })
                                }



                            })

                        }).catch((e) => {
                            return IReply(interaction, "ไม่สามารถสร้างข้อความได้", "error", true)
                        })
                    }

                })
            })
        }

        if (subCommand == "-kick") {
            if (!memberData.checkPermission()) return IReply(interaction, "คุณไม่มีสิทธ์ในการเตะสมาชิกออกจากกิลด์", "error", true)

            let target = interaction.options.get("member")?.member as GuildMember;
            if (target.roles.cache.some((r) => r.id == "1224231744639864905" || r.id == "1224228166554488913")) return IReply(interaction, "ไม่สามารถเตะผู้ที่ตำแหน่งเท่ากนัหรือสูงกว่าคุณได้", "error", true)
            if (target.id == interaction.user.id) return IReply(interaction, "คุณไม่สามารถเตะตัวเองได้", "error", true)
            let targetProfile = await new userData(target.user).getProfile()
            if (!targetProfile) return IReply(interaction, "สมาชิกนี้ไม่มีข้อมูลนักผจญภัย", "error", true)

            memberData.kickMember(targetProfile).then((res) => {
                if (res == "สมาชิกถูกเตะออกจากกิลด์แล้ว") return IReply(interaction, "สมาชิกถูกเตะออกจากกิลด์แล้ว", "success", true)
                return IReply(interaction, res, "success", true)
            }).catch((e) => {
                return IReply(interaction, "เกิดข้อผิดพลาดไม่สามารถเตะสมาชิกได้", "error", true)
            })
        }

        if (subCommand == "-invite") {
            try {
                if (!memberData.checkPermission()) {
                    return IReply(interaction, "คุณไม่มีสิทธ์ในการเชิญสมาชิกเข้าร่วมกิลด์", "error", true);
                }
            
                let target = interaction.options.get("member")?.member as GuildMember;
                if (target.roles.cache.some((r) => r.id == "1286604569744375850" || r.id == "1286604609908903946" || r.id == "1286604614417776712")) {
                    return IReply(interaction, "สมาชิกนี้มีกิลด์อยู่แล้ว", "error", true);
                }
            
                if (target.id == interaction.user.id) {
                    return IReply(interaction, "คุณไม่สามารถเชิญตัวเองได้", "error", true);
                }
            
                // Attempt to get the target profile
                let targetProfile = await new userData(target.user).getProfile();
                if(!targetProfile) return IReply(interaction, "ไม่สามารถดึงข้อมูลสมาชิกได้", "error", true);
                if (!targetProfile.discord_id) {
                    return IReply(interaction, "สมาชิกนี้ไม่มีข้อมูลนักผจญภัย", "error", true);
                }
            
                // Try to invite the member
                let res = await memberData.inviteMember(targetProfile);
                if (res.status == "fail") {
                    return IReply(interaction, res.message, "error", true);
                }
            
                // Invite creation successful, proceed with sending the invitation
                let inviteId = res.inviteId;
                let buttonInvite = new ActionRowBuilder<ButtonBuilder>()
                    .setComponents(
                        new ButtonBuilder()
                            .setCustomId(`guildInvite_cancel`)
                            .setLabel(`ไม่เข้าร่วม`)
                            .setEmoji("📕")
                            .setStyle(ButtonStyle.Danger),
            
                        new ButtonBuilder()
                            .setCustomId(`guildInvite_${inviteId}`)
                            .setLabel(`เข้าร่วมกิลด์`)
                            .setEmoji("📗")
                            .setStyle(ButtonStyle.Success)
                    );
            
                let embeds = new EmbedBuilder()
                    .setAuthor({
                        name: `มีคำเชิญเข้าร่วมกิลด์จาก ${interaction.user.toString()}`,
                    })
                    .setFields(
                        {
                            name: `ชื่อกิลด์`,
                            value: `${memberData.guild?.guild_name ?? "ไม่ระบุชื่อกิลด์"}`
                        },
                        {
                            name: `เลเวลกิลด์`,
                            value: `${memberData.guild?.guild_level}`
                        }
                    )
                    .setColor("#A4FFED");
            
                // Try to send the invitation
                try {
                    await target.user.send({
                        embeds: [embeds],
                        components: [buttonInvite]
                    });
                    return IReply(interaction, "ส่งข้อความเชิญชวนไปยังสมาชิกแล้ว", "success", true);
                } catch (error) {
                    return IReply(interaction, "ไม่สามารถส่งข้อความไปยังสมาชิกได้เนื่องจาก สมาชิกปิดรับข้อความ", "error", true);
                }
            
            } catch (error) {
                console.log(error);
                return IReply(interaction, "ไม่สามารถสร้างคำเชิญได้", "error", true);
            }
            
        }
        if (subCommand == "-join") {
            let ownerData = await new userData(interaction.user).getProfile() as any;
            if (!ownerData) {
                return IReply(interaction, "คุณไม่สามารถขอเข้ากิลด์ได้ เนื่องจากคุณไม่มีข้อมูลนักผจญภัย โปรดลงทะเบียนก่อน", "error", true);
            }

            if (await memberData.checkGuild(ownerData)) {
                return IReply(interaction, "คุณไม่สามารถขอเข้ากิลด์ได้เนื่องจากคุณมีกิลด์อยู่แล้ว", "info", true);
            }

            try {
                let guildList = await prisma.guild.findMany();
                if (!guildList.length) {
                    return IReply(interaction, "ยังไม่มีกิลด์ใดๆในระบบ", "error", true);
                }

                let actionRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
                let guildSelectList: { value: string, label: string }[] = [];
                const gameSelectId = `join-guild-select`;

                guildList.forEach((guild, index) => {
                    guildSelectList.push({
                        value: guild.id,
                        label: `LV : ${guild.guild_level} | ${guild.guild_name}`
                    });

                    // When reaching 25 options or at the end of the list, push the select menu
                    if (guildSelectList.length === 25 || index === guildList.length - 1) {
                        const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(`${gameSelectId}_${actionRows.length}`)
                                    .setMaxValues(1)
                                    .setMinValues(1)
                                    .setPlaceholder("เลือกกิลด์ที่ต้องการเข้าร่วม")
                                    .addOptions(guildSelectList)
                            );

                        actionRows.push(actionRow);
                        guildSelectList = []; // Reset for the next batch
                    }
                });

                // Reply with the guild selection menu
                await interaction.reply({
                    content: "เลือกกิลด์ที่ต้องการเข้าร่วม",
                    components: actionRows,
                    ephemeral : true
                });

                const channel = interaction.channel as TextChannel;

                const collector = channel.createMessageComponentCollector({
                    filter: (i) => i.customId.startsWith(gameSelectId) && i.user.id === interaction.user.id,
                    max: 1,
                    time: 60000
                });

                collector.on("collect", async (i) => {
                    interaction.deleteReply().catch(() => { });
                })

            } catch (error) {
                return IReply(interaction, "ไม่สามารถดึงข้อมูลกิลด์ได้", "error", true);
            }

        }
        if (subCommand == "-delete") {
            if (!memberData.checkPermission()) return IReply(interaction, "เจ้าของกิลด์เท่านั้นที่จะสามารถลบกิลด์ได้", "error", true);
            return IReply(interaction, "คำสั่งนี้ยังไม่เปิดให้ใช้งาน", "warn", true)
        }
        if (subCommand == "-leave") {
            try {
                if (memberData.checkPermission()) {
                    return IReply(interaction, "คุณไม่สามารถออกจากเซิร์ฟเวอร์ได้เนื่องจากคุณเป็นเจ้าของกิลด์", "error", true);
                }

                let userProfile = await new userData(interaction.user).getProfile();
                if(!userProfile) return IReply(interaction, "ไม่สามารถดึงข้อมูลสมาชิกได้", "error", true);
                if (!userProfile.discord_id) {
                    return IReply(interaction, "สมาชิกนี้ไม่มีข้อมูลนักผจญภัย", "error", true);
                }
                let guild = await memberData.checkGuild(userProfile);
                let guildRole = await memberData.getGuild();

                if (!guild) {
                    return IReply(interaction, "คุณไม่มีกิลด์", "error", true);
                }

                if (!guildRole) {
                    return IReply(interaction, "ไม่พบข้อมูลกิลด์ในระบบ", "error", true);
                }

                await prisma.guildMembers.deleteMany({
                    where: {
                        userId: interaction.user.id
                    }
                });

                let member = interaction.member as GuildMember;
                await member.roles.remove(['1286604609908903946', '1286604614417776712']).catch(() => { });
                await member.roles.remove(guildRole?.guild_roleId as string).catch(() => { });

                return IReply(interaction, "คุณออกจากกิลด์แล้ว", "success", true);
            } catch (error) {
                return IReply(interaction, "ไม่สามารถออกจากกิลด์ได้", "error", true);
            }

        }
        if (subCommand == "-request") {
            if (!memberData.checkPermission()) {
                return IReply(interaction, "คุณไม่มีสิทธ์ในการตรวจสอบคำขอเข้าร่วมกิลด์", "error", true);
            }
            
            try {
                let ownerData = await new userData(interaction.user).getProfile();
                if(!ownerData) return IReply(interaction, "ไม่สามารถเข้าถึงข้อมูลของคุณได้", "error", true);
                let guild = await memberData.checkGuild(ownerData);
                if (!guild) {
                    return IReply(interaction, "เกิดข้อผิดพลาดคุณไม่มีกิลด์", "error", true);
                }
            
                console.log(guild);
                let requestList = await prisma.inviteRequest.findMany({
                    where: {
                        guildId: guild.guildId
                    }
                });
            
                if (!requestList.length) {
                    return IReply(interaction, "ไม่มีคำขอเข้าร่วมกิลด์", "error", true);
                }
            
                let actionRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
                let userSelect: { value: string, label: string }[] = [];
            
                const guildSelectId = `accept-guild-request-${guild.guildId}`;
            
                for (const [index, request] of requestList.entries()) {
                    const username = await client.users.fetch(request.userId)
            
                    userSelect.push({
                        value: username.id,
                        label: username.username
                    });
            
                    if (userSelect.length === 25 || index === requestList.length - 1) {
                        const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId(`${guildSelectId}_${actionRows.length}`)
                                    .setMinValues(1)
                                    .setPlaceholder("เลือกผู้ขอเข้าร่วมกิลด์")
                                    .addOptions(userSelect)
                            );
            
                        actionRows.push(actionRow);
                        userSelect = [];
                    }
                }
            
                await interaction.reply({
                    content: "เลือกผู้ขอเข้าร่วมกิลด์",
                    components: actionRows,
                    ephemeral : true
                });

                
                const channel = interaction.channel as TextChannel;

                const collector = channel.createMessageComponentCollector({
                    filter: (i) => i.customId.startsWith(guildSelectId) && i.user.id === interaction.user.id,
                    max: 1,
                    time: 60000
                });

                collector.on("collect", async (i) => {
                    interaction.deleteReply().catch(() => { });
                })
            
            } catch (error) {
                console.log(error)
                return IReply(interaction, "ไม่สามารถสร้างหน้าต่างเพื่อสมาชิกได้", "error", true);
            }
            

        }
    }
}