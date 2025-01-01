import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CategoryChannel, ChannelType, EmbedBuilder, GuildMember, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js";
import { client } from "../..";
import { GameMatchDB, GameOnlineDB, PrismaClient, UserGameRank } from "@prisma/client";
import { generateArray, RandomNumber } from "../tools";
import { IReply } from "../reply/interactionReply";
const prisma = new PrismaClient()



export function rankModeSelect(interaction: StringSelectMenuInteraction) {
    const getData = client.cache.get(`rankModeSelect_${interaction.user.id}`);
    if (!getData) return interaction.deferUpdate().catch(() => { });
    const game = getData.game as GameOnlineDB;
    const rankMode = interaction.values[0];

    if (Number(rankMode) === 1) {

        checkRank(interaction).catch((err) => {
            console.log(err)
            return interaction.reply({ content: "ไม่สามารถตรวจสอบแรงค์ของคุณได้", ephemeral: true }).catch(() => { })
        }).then((rank) => {
            if (!rank) return updateRank(interaction, game)

            prisma.gameConditionMatchDB.findMany({
                where: { gameId: game.id }
            }).then((rankCondition) => {
                if (!rankCondition || rankCondition.length < 1) {
                    return createMatch(interaction, game, true);
                }

                const partyLimitSelect = `partyLimitSelect_${interaction.user.id}`;
                const partyLimit = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .setComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(partyLimitSelect)
                            .setMaxValues(1)
                            .setMinValues(1)
                            .setPlaceholder("โปรดเลือกขนาด Party")
                            .setOptions(rankCondition.map((condition) => ({ label: `ขนาด : ${condition.maxParty} คน`, value: `${condition.limitNumber}` }))
                            )
                    )

                interaction.reply({ components: [partyLimit], ephemeral: true }).then((party) => {
                    if (!party) return interaction.reply({ content: 'ไม่สามารถสร้าง ตัวเลือกขนาดปาร์ตี้ได้', ephemeral: true }).catch((e) => { })
                    client.cache.set(partyLimitSelect, {
                        game: game,
                    })

                    setTimeout(() => {
                        client.cache.delete(partyLimitSelect)
                    }, 1000 * 60 * 5)
                }).catch((e) => {
                    console.log(e)
                })
            });
        })
    } else {
        createMatch(interaction, game, false);
    }

}

export function partyLimitSelect(interaction: StringSelectMenuInteraction) {
    const partyLimit = interaction.values[0];
    const getData = client.cache.get(`partyLimitSelect_${interaction.user.id}`);
    if (!getData) return interaction.deferUpdate().catch(() => { });
    const gameRankSelect = `gameRankSelect_${interaction.user.id}_${partyLimit}`;
    const rankSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
        .setComponents(
            new StringSelectMenuBuilder()
                .setCustomId(gameRankSelect)
                .setMaxValues(1)
                .setMinValues(1)
                .setPlaceholder("กรุณาเลือกระดับความต่างแรงค์")
                .setOptions(generateArray(Number(partyLimit)))
        );

    interaction.reply({ components: [rankSelect], ephemeral: true }).then((inter) => {
    }).catch(() => {
        return interaction.reply({ content: 'ไม่สามารถสร้างเกมแมตช์ได้', ephemeral: true }).catch((e) => { })
    })
}

export function rankLevelSelect(interaction: StringSelectMenuInteraction) {
    const arg = interaction.customId.split("_")
    const getData = client.cache.get(`partyLimitSelect_${interaction.user.id}`);
    if (!getData) return interaction.deferUpdate().catch(() => { });
    const game = getData.game as GameOnlineDB;
    const rankLimit = interaction.values[0];
    createMatch(interaction, game, true, Number(rankLimit), Number(arg[2]));
}

export async function createMatch(interaction: StringSelectMenuInteraction, game: GameOnlineDB, ranking: boolean, limitNumber: number = 0, partyLimit: number = 0) {
    const user_data = await prisma.userDB.findFirst({
        where: {
            discord_id: interaction.user.id
        }
    })

    if (!user_data) return interaction.reply({ content: `กรุณาลงทะเบียน นักผจญภัยเพื่อใช้งานระบบนี้`, ephemeral: true }).catch((e) => { })


    let rank_user = await prisma.userGameRank.findFirst({
        where: {
            userId: interaction.user.id,
            gameId: game.id
        }
    })

    if (ranking && (!rank_user || !rank_user.gameRankId)) return interaction.reply({ content: `กรุณาตั้งค่าแรงค์ของคุณก่อนสร้างแมตช์ คำสั่ง /rank-set`, ephemeral: true }).catch((e) => { })


    prisma.gameMatchDB.create({
        data: {
            userId: user_data?.id as string,
            gameId: game.id,
            partyLimit: game.partyLimit,
            status: true,
            deleteBy: '',
            rank: ranking,
            selectRankID: ranking ? rank_user?.gameRankId : null,
            members: [
                `${interaction.user.id}`
            ],
            updatedBy: 'admin',
            limitNumber: limitNumber,
            channel_id: 'wait'
        }
    }).then((createData) => {
        return createGameChannel(interaction, game, createData as GameMatchDB);
    }).catch((e) => {
        return interaction.reply({ content: 'ไม่สามารถสร้างเกมแมตช์ได้', ephemeral: true }).catch((e) => { })
    });
}

export function createGameChannel(interaction: StringSelectMenuInteraction, game: GameOnlineDB, createData: GameMatchDB) {
    const member = interaction.member as GuildMember
    interaction.guild?.channels.create({
        name: `📔・${game.game_name} | ${interaction.user.username}`,
        type: ChannelType.GuildVoice,
        parent: interaction.guild.channels.cache.get("1230547534200443023") as CategoryChannel
    }).then((voiceChannel) => {
        if (!voiceChannel) {
            prisma.gameCategoryDB.delete({ where: { id: createData.id } }).catch(() => { })
            return interaction.reply({ content: "ไม่สามารถสร้างช่องเสียงได้ ลองอีกครั้ง", ephemeral: true }).catch(() => { })
        } else {
            prisma.gameMatchDB.update({
                data: {
                    channel_id: voiceChannel.id
                },
                where: {
                    id: createData.id
                }
            }).catch(() => {
                return interaction.reply({ content: "ไม่สามารถอัปเดตข้อมูลได้ ลองอกีครั้ง", ephemeral: true }).catch(() => { })
            }).then(() => {
                prisma.gameCategoryDB.delete({ where: { id: createData.id } }).catch(() => { })
                member.voice.setChannel(voiceChannel).then(async () => {
                    prisma.gameOnlineDB.update({
                        where: {
                            id: game.id
                        }, data: {
                            numberMatch: +1
                        }
                    }).catch(() => { })
                    await interaction.reply({ content: "สร้างแมตช์เกมสำเร็จ", ephemeral: true }).catch(() => { })
                    interaction.guild?.channels.fetch("1231999085209325722").catch((err) => {
                        // console.log(err)
                    }).then(async (channel) => {
                        if (channel && channel.isTextBased()) {

                            let embed = new EmbedBuilder()
                                .setAuthor({ name: `Game: ${game.game_name}` })
                                .setDescription(`ห้อง : <#${voiceChannel.id}>\nผู้สร้าง : <@${createData.members[0]}>`)
                            if (createData.rank) {
                                try {
                                    let rankMatch = await prisma.gameRankDB.findFirst({
                                        where: {
                                            id: createData.selectRankID as string
                                        }
                                    })

                                    if (rankMatch) {
                                        embed.addFields({ name: "โหมด", value: createData.rank ? `แรงค์ (${rankMatch.nameRank})` : 'ธรรมดา', inline: true })
                                    }
                                } catch (e) {
                                    console.log(e)
                                    embed.addFields({ name: "โหมด", value: createData.rank ? `แรงค์ (ไม่สามารถระบุได้)` : 'ธรรมดา', inline: true })
                                }
                            }
                            embed.addFields(
                                { name: "ขนาดปาร์ตี้", value: `${createData.members.length}`, inline: true },
                                { name: "ขนาดปาร์ตี้สูงสุด", value: `${createData.partyLimit}`, inline: true }
                            )



                            let actionRow = new ActionRowBuilder<ButtonBuilder>()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`join_${createData.id}`)
                                        .setDisabled(false)
                                        .setEmoji('✅')
                                        .setLabel("เข้าร่วม")
                                        .setStyle(ButtonStyle.Success)
                                );

                            channel.send({
                                embeds: [embed],
                                components: [actionRow]
                            }).catch(() => { })
                        }
                    })
                }).catch(() => {
                    interaction.reply({ content: "ไม่สามารถย้ายคุณไปยังช่องเสียงได้", ephemeral: true }).catch(() => { })
                });
            })
        }
    });
}

export async function checkRank(interaction: StringSelectMenuInteraction) {
    return new Promise<UserGameRank | null>((resolve, rejects) => {
        prisma.userGameRank.findFirst({
            where: {
                userId: interaction.user.id,
                gameId: interaction.customId.split("_")[2]
            }
        }).catch((err) => {
            return rejects(err)
        }).then((rank) => {
            return resolve(rank as UserGameRank)
        })
    })
}

export async function updateRank(interaction: StringSelectMenuInteraction, game: GameOnlineDB) {
    prisma.gameRankDB.findMany({
        where: {
            gameId: game.id
        }
    }).catch((err) => {
        return interaction.reply({ content: 'ไม่สามารถตรวจสอบข้อมูลของแรงค์เกมได้', ephemeral: true }).catch((e) => { })
    }).then((gameRank) => {
        if (!Array.isArray(gameRank) || gameRank.length < 1) return interaction.reply({ content: 'เกมนี้ไม่ยังไม่มีข้อมูลแรงค์โปรดรอการอัปเดต', ephemeral: true }).catch((e) => { })

        const gameRankSelect = `updateRankGameSelect_${game.id}`;
        const rankSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
            .setComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(gameRankSelect)
                    .setMaxValues(1)
                    .setMinValues(1)
                    .setPlaceholder(`เลือกระดับแรงค์เกมของคุณในเกม ${game.game_name}`)
                    .setOptions(gameRank.map((rank) => ({ label: rank.nameRank, value: rank.id })))
            );

        interaction.reply({
            content: "โปรดตั้งค่าแรงค์ของคุณตอนนี้",
            components: [rankSelect],
            ephemeral: true
        }).catch(() => { })
    })
}

export async function gameRankSelectGame(interaction: StringSelectMenuInteraction) {
    const gameId = interaction.values[0];
    prisma.gameRankDB.findMany({
        where: {
            gameId: gameId
        }
    }).catch((err) => {
        return interaction.reply({ content: 'ไม่สามารถตรวจสอบข้อมูลของแรงค์เกมได้', ephemeral: true }).catch((e) => { })
    }).then((gameRank) => {
        if (!Array.isArray(gameRank) || gameRank.length < 1) return interaction.reply({ content: 'เกมนี้ไม่ยังไม่มีข้อมูลแรงค์โปรดรอการอัปเดต', ephemeral: true }).catch((e) => { })

        const gameRankSelect = `updateRankGameSelect_${gameId}_command`;
        const rankSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
            .setComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(gameRankSelect)
                    .setMaxValues(1)
                    .setMinValues(1)
                    .setPlaceholder(`เลือกระดับแรงค์เกมของคุณ`)
                    .setOptions(gameRank.map((rank) => ({ label: rank.nameRank, value: rank.id })))
            );

        interaction.reply({
            content: "โปรดตั้งค่าแรงค์ของคุณตอนนี้",
            components: [rankSelect],
            ephemeral: true
        }).catch(() => { })
    })
}

export async function gameRankSelect(interaction: StringSelectMenuInteraction) {
    const game_type = interaction.values[0];
    const user_data = await prisma.userDB.findFirst({
        where: {
            discord_id: interaction.user.id
        }
    })

    if (!user_data) return interaction.reply({ content: `กรุณาลงทะเบียน นักผจญภัยเพื่อใช้งานระบบนี้`, ephemeral: true }).catch((e) => { })

    let gameInType = await prisma.gameTypeGame.findMany({
        where: {
            typeId: game_type,

        }
    })

    prisma.gameOnlineDB.findMany({
        where: {
            id: {
                in: gameInType.map((game) => game.gameId)
            }
        }
    }).catch(() => {
        return interaction.reply({ content: "ไม่พบข้อมูลเกมในประเภทนี้", ephemeral: true }).catch((e) => { })
    }).then((gameList) => {
        if (!Array.isArray(gameList) || gameList.length < 1) {
            return interaction.reply({ content: "ไม่พบข้อมูลเกมในประเภทนี้", ephemeral: true }).catch((e) => { })
        }
        const gameSelectId = `gameSelect_rank_${RandomNumber(1000, 9999)}`;
        const gameSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
            .setComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(gameSelectId)
                    .setMaxValues(1)
                    .setMinValues(1)
                    .setPlaceholder("กรุณาเลือกเกม")
                    .setOptions(gameList.map((game) => ({
                        value: game.id,
                        label: game.game_name
                    })))
            );

        interaction.reply({ components: [gameSelect], ephemeral: true }).then((inter) => {
            if (!inter) {
                return interaction.reply({ content: "ไม่สามารถแสดงเมนูเกมได้", ephemeral: true }).catch((e) => { })
            }

            inter.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id && i.customId === gameSelectId,
                max: 1,
                time: 60 * 1000 * 5
            }).on("collect", (interCollect) => {
                interaction.deleteReply().catch(() => { })
            })
        }).catch(() => {
            return interaction.reply({ content: "ไม่สามารถแสดงหน้าต่างแก้ไขได้", ephemeral: true }).catch((e) => { })
        })
    })
}

export async function updateRankSubmit(interaction: StringSelectMenuInteraction, update: boolean = false) {
    const rankId = interaction.values[0];
    const gameId = interaction.customId.split("_")[1];

    try {
        const currentRank = await prisma.userGameRank.findFirst({
            where: {
                userId: interaction.user.id,
                gameId: gameId
            }
        });

        if (currentRank) {
            await prisma.userGameRank.update({
                where: {
                    id: currentRank.id
                },
                data: {
                    gameRankId: rankId
                }
            });
            await interaction.reply({ content: `อัปเดตแรงค์ของคุณเรียบร้อยแล้ว ${update ? "" : "โปรดใช้คำสั่งค้าหา match อีกครั้ง"}`, ephemeral: true }).catch(() => { })
        } else {
            await prisma.userGameRank.create({
                data: {
                    gameRankId: rankId,
                    gameId: gameId,
                    updatedBy: 'system',
                    deleteBy: '',
                    userId: interaction.user.id,
                    invitation: false
                }
            });
            await interaction.reply({ content: `อัปเดตแรงค์ใหม่ของคุณสำเร็จสำเร็จ ${update ? "" : "โปรดใช้คำสั่งค้าหา match อีกครั้ง"}`, ephemeral: true }).catch(() => { })
        }
    } catch (error) {
        await interaction.reply({ content: 'เกิดข้อผิดพลาดในการอัปเดตแรงค์ของคุณ', ephemeral: true }).catch((e) => { });
    }
}

export function paymentTypeSelected(interaction: StringSelectMenuInteraction) {
    const typeSelect = interaction.values[0];
    if (typeSelect == "truemoney") {
        if (!process.env.TRUEWALLET_PHONENUMBER) {
            return IReply(interaction, 'ไม่สามารถใช้ระบบนี้ได้เนื่องจากผู้ดูแลระบบยังไม่ได้ตั้งค่าระบบชำระเงินนี้ไม่สำเร็จ', "error", true)
        }

        const modalPayment = new ModalBuilder()
            .setCustomId("truewallet_payment")
            .setTitle("TrueWallet Payment")
            .setComponents(
                new ActionRowBuilder<TextInputBuilder>()
                    .setComponents(
                        new TextInputBuilder()
                            .setCustomId("truewallet_voucher")
                            .setPlaceholder(`https://gift.truemoney.com/campaign/?v=xxxxxxxxxxxxxxxxxxxxxx`)
                            .setRequired(true)
                            .setStyle(TextInputStyle.Short)
                            .setLabel("ลิงก์ซองอั่งเปา TrueMoney Wallet")
                    )
            )

        interaction.showModal(modalPayment).catch(() => {
            return IReply(interaction, 'ไม่สามารถสร้าง Modal สำหรับการชำระเงินได้', "error", true)
        })
    }
    if (typeSelect == "promptpay") {
        return interaction.reply({ content: "กรุณากรอกข้อมูลของคุณ", ephemeral: true }).catch(() => { })
    }
    if (typeSelect == "slipcheck") {
        return interaction.reply({ content: "กรุณากรอกข้อมูลของคุณ", ephemeral: true }).catch(() => { })
    }
}
