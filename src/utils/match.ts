// import { GameMatchDB, GameOnlineDB, PrismaClient } from "@prisma/client";
// import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, GuildMember, StringSelectMenuBuilder, StringSelectMenuInteraction, TextChannel, VoiceChannel } from "discord.js";
// import { client } from "../..";
// import { IReply } from "../reply/interactionReply";
// import { RandomNumber } from "../tools";
// import { createMatch } from "../selectEvent/functions";
// const prisma = new PrismaClient()
// export async function createEmbedForRoom(roomIndex: number, rooms: GameMatchDB[]) {
//     const room = rooms[roomIndex];
//     let embed = new EmbedBuilder()
//         .setDescription(`ห้อง : <#${room.channel_id}>\nผู้สร้าง : <@${room.members[0]}>`)
//     if (room.rank) {
//         try {
//             let rankMatch = await prisma.gameRankDB.findFirst({
//                 where: {
//                     id: room.selectRankID as string
//                 }
//             })

//             if (rankMatch) {
//                 embed.addFields({ name: "โหมด", value: room.rank ? `แรงค์ (${rankMatch.nameRank})` : 'ธรรมดา', inline: true })
//             }
//         } catch (e) {
//             console.log(e)
//             embed.addFields({ name: "โหมด", value: room.rank ? `แรงค์ (ไม่สามารถระบุได้)` : 'ธรรมดา', inline: true })
//         }
//     }
//     embed.addFields(
//         { name: "ขนาดปาร์ตี้", value: `${room.members.length}`, inline: true },
//         { name: "ขนาดปาร์ตี้สูงสุด", value: `${room.partyLimit}`, inline: true }
//     )

//     return embed;
// };

// export function createActionRow(currentIndex: number, game_id: string, rooms: GameMatchDB[]) {
//     return new ActionRowBuilder<ButtonBuilder>()
//         .addComponents(
//             new ButtonBuilder()
//                 .setCustomId(`previous_${currentIndex}_${game_id}`)
//                 .setDisabled(currentIndex === 0)
//                 .setEmoji('⬅')
//                 .setLabel("ย้อนกลับ")
//                 .setStyle(ButtonStyle.Secondary),
//             new ButtonBuilder()
//                 .setCustomId(`join_${rooms[currentIndex].id}`)
//                 .setDisabled(false)
//                 .setEmoji('✅')
//                 .setLabel("เข้าร่วม")
//                 .setDisabled(rooms[currentIndex].partyLimit == rooms[currentIndex].members.length)
//                 .setStyle(ButtonStyle.Success),
//             new ButtonBuilder()
//                 .setCustomId(`next_${currentIndex}_${game_id}`)
//                 .setDisabled(currentIndex === rooms.length - 1)
//                 .setEmoji('➡')
//                 .setLabel("ถัดไป")
//                 .setStyle(ButtonStyle.Secondary)
//         );
// };


// export async function rankSetButton(interaction: ButtonInteraction) {
//     try {
//         const user_data = await prisma.userDB.findFirst({
//             where: {
//                 discord_id: interaction.user.id
//             }
//         });

//         if (!user_data) {
//             return interaction.reply({ content: `กรุณาลงทะเบียน นักผจญภัยเพื่อใช้งานระบบนี้`, ephemeral: true });
//         }

//         const gameCategory = await prisma.gameTypeDB.findMany({
//             where: {
//                 categoryId: '66d2d5da2b0108700c98ea44'
//             }
//         });

//         if (!gameCategory || gameCategory.length < 1) {
//             return IReply(interaction, "ยังไม่มีห้องเล่นเกมในระบบ", "error", true);
//         }

//         let actionRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
//         let gameSelectList: { value: string, label: string }[] = [];
//         const gameSelectId = `category_rankset_${RandomNumber(1000, 9999)}`;

//         gameCategory.forEach((game, index) => {
//             gameSelectList.push({
//                 value: game.id,
//                 label: game.title
//             });

//             if (gameSelectList.length === 25 || index === gameCategory.length - 1) {
//                 const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
//                     .addComponents(
//                         new StringSelectMenuBuilder()
//                             .setCustomId(`${gameSelectId}_${actionRows.length}`)
//                             .setMaxValues(1)
//                             .setMinValues(1)
//                             .setPlaceholder("เลือกประเภทเกม")
//                             .addOptions(gameSelectList)
//                     );

//                 actionRows.push(actionRow);
//                 gameSelectList = [];
//             }
//         });

//         await interaction.reply({ components: actionRows, ephemeral: true });

//         const channel = interaction.channel as TextChannel;
//         const categoryCollector = channel.createMessageComponentCollector({
//             filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(gameSelectId),
//             max: 1,
//             time: 60 * 1000 * 2
//         });

//         categoryCollector?.on("collect", async (categorySelect: StringSelectMenuInteraction) => {
//             try {
//                 await interaction.deleteReply();
//             } catch (error) {
//                 console.error("Error deleting reply:", error);
//             }
//         });

//     } catch (error) {
//         console.error("Error handling rankSetButton interaction:", error);
//         return IReply(interaction, "ไม่สามารถดำเนินการในระบบเลือกเกมได้", "error", true);
//     }
// }



// export function switchPage(interaction: ButtonInteraction) {
//     try {
//         const [action, currentIndexStr, game_id] = interaction.customId.split('_');
//         const matchData = client.cache.get(`gameFind_${interaction.user.id}_${game_id}`);
//         if (!matchData) return interaction.deferUpdate().catch(() => { })
//         prisma.gameMatchDB.findMany(matchData).catch(() => {
//             return interaction.reply({ content: "ไม่สามารถค้นหาห้องเล่นเกมได้", ephemeral: true }).catch((e) => { })
//         }).then(async (gameMatch) => {
//             if (!Array.isArray(gameMatch) || gameMatch.length < 1) {

//                 return interaction.reply({ content: "ยังไม่มีสมาชิกสร้างห้องเล่นเกมนี้", ephemeral: true }).catch((e) => { })

//             }
//             const currentIndex = parseInt(currentIndexStr);
//             let newIndex = currentIndex;

//             if (action === "previous" && currentIndex > 0) newIndex -= 1;
//             if (action === "next" && currentIndex < gameMatch.length - 1) newIndex += 1;

//             await interaction.update({
//                 embeds: [await createEmbedForRoom(newIndex, gameMatch)],
//                 components: [createActionRow(newIndex, game_id, gameMatch)],
//             });
//         })
//     } catch (error) {
//         console.log(error);
//     }
// }


// export function joinParty(interaction: ButtonInteraction) {
//     const matchId = interaction.customId.split("_")[1];

//     prisma.gameMatchDB.findFirst({
//         where: {
//             id: matchId,
//             status: true
//         }
//     }).catch((err) => {
//         return interaction.reply({ content: "ไม่สามารถค้นหาข้อมูลห้องนี้ในระบบได้หรือถูกปิดไปแล้ว", ephemeral: true }).catch(() => { })
//     }).then(async (mathData) => {
//         try {
//             if (!mathData) return interaction.reply({ content: "ไม่พบข้อมูลห้องนี้ในระบบได้หรือถูกปิดไปแล้ว", ephemeral: true }).catch(() => { });
//             const data = mathData as GameMatchDB;
//             if (data.members.length == data.partyLimit) return interaction.reply({ content: "คุณมาช้าไปห้องนี้เต็มแล้ว", ephemeral: true }).catch(() => { });
//             if (data.status == false) return interaction.reply({ content: "ห้องหี้ปิดไปแล้ว", ephemeral: true }).catch(() => { });
//             if (data.members.some((v) => v == interaction.user.id)) return interaction.reply({ content: "คุณเข้าร่วมเกมนี้แล้ว", ephemeral: true }).catch(() => { });

//             if (data.rank) {
//                 try {
//                     const userRank = await prisma.userGameRank.findFirst({
//                         where: {
//                             userId: interaction.user.id,
//                             gameId: data.gameId
//                         }
//                     });

//                     if (!userRank) return interaction.reply({ content: "โปรดตั้งค่าแรงค์ของคุณโดยใช้คำสั่ง /rank-set เพื่อเข้าร่วมโหมดแรงค์ในแต่ละเกม", ephemeral: true }).catch(() => { });

//                     const gameCondition = await prisma.conditionGameMatchDB.findFirst({
//                         where: {
//                             gameId: data.gameId,
//                             limitNumber: data.limitNumber
//                         }
//                     });

//                     const ownerMatch = await prisma.userGameRank.findFirst({
//                         where: {
//                             gameId: data.gameId,
//                             userId: data.userId
//                         }
//                     });

//                     const gameRankDB = await prisma.gameRankDB.findFirst({
//                         where: {
//                             gameId: data.gameId,
//                         }
//                     });

//                     if (!gameCondition) {
//                         try {
//                             await updateGameMatchMembers(data.id, interaction.user.id);
//                             await moveMemberToVoiceChannel(interaction, data.channel_id);
//                             replySuccess(interaction);
//                         } catch (err: any) {
//                             console.error(err);
//                             interaction.reply({ content: err?.message ?? "ข้อผิดพลาดที่ไม่ทราบสาเหตุ", ephemeral: true }).catch(() => { });
//                         }
//                     } else {
//                         if (!userRank) return interaction.reply({ content: "โปรดตั้งค่าแรงค์ของคุณโดยใช้คำสั่ง /rank-set เพื่อเข้าร่วมโหมดแรงค์ในแต่ละเกม", ephemeral: true }).catch(() => { });
//                         if (!ownerMatch) return interaction.reply({ content: "ไม่สามารถเช็คข้อมูลของหัวห้องนี้ได้", ephemeral: true }).catch(() => { });
//                         const rankCurrent = await prisma.gameRankDB.findFirst({
//                             where: {
//                                 id: userRank.gameRankId
//                             }
//                         });

//                         if (!rankCurrent) return interaction.reply({ content: "เกิดข้อผิดพลาดในข้อมูลแรงค์ โปรดแจ้งผู้ดูแล", ephemeral: true }).catch(() => { });

//                         let rankAllowList = rankCondition(gameRankDB?.number as number, data.limitNumber);

//                         if (rankAllowList.some((v) => v == rankCurrent.number)) {
//                             try {
//                                 await updateGameMatchMembers(data.id, interaction.user.id);
//                                 await moveMemberToVoiceChannel(interaction, data.channel_id);
//                                 replySuccess(interaction);
//                             } catch (err: any) {
//                                 console.error(err);
//                                 interaction.reply({ content: err?.message ?? "ข้อผิดพลาดที่ไม่ทราบสาเหตุ", ephemeral: true }).catch(() => { });
//                             }
//                         } else {
//                             return interaction.reply({ content: "คุณไม่สามารถเล่นห้องนี้ได้เนื่องจากแรงค์ของคุณ ต่ำ หรือ สูงเกินกำหนด", ephemeral: true }).catch(() => { });
//                         }
//                     }
//                 } catch (err: any) {
//                     console.error(err);
//                 }
//             } else {
//                 try {
//                     await updateGameMatchMembers(data.id, interaction.user.id);
//                     await moveMemberToVoiceChannel(interaction, data.channel_id);
//                     replySuccess(interaction);
//                 } catch (err: any) {
//                     console.error(err);
//                     interaction.reply({ content: err?.message ?? "ข้อผิดพลาดที่ไม่ทราบสาเหตุ", ephemeral: true }).catch(() => { });
//                 }
//             }

//         } catch (err: any) {
//             console.error(err);
//         }
//     });
// }

// async function updateGameMatchMembers(matchId: string, userId: string) {
//     try {
//         return await prisma.gameMatchDB.update({
//             data: {
//                 members: {
//                     push: userId
//                 }
//             },
//             where: {
//                 id: matchId
//             }
//         });
//     } catch (err: any) {
//         console.error("Error updating game match members", err);
//         throw new Error("ไม่สามารถนำคุณเข้าสู่ห้องได้ โปรดลองอีกครั้ง");
//     }
// }

// async function moveMemberToVoiceChannel(interaction: ButtonInteraction, channelId: string) {
//     try {
//         interaction.guild?.channels.fetch(channelId).catch(() => {
//             throw new Error("ไม่พบช่องเสียงที่กำหนด")
//         }).then(async (channel) => {
//             if (!channel) throw new Error("ไม่พบช่องเสียงที่กำหนด");
//             let member = interaction.member as GuildMember;
//             await member.voice.setChannel(channel as VoiceChannel);
//         })

//     } catch (err: any) {
//         console.error("Error moving member to voice channel", err);
//         throw new Error("ไม่สามารถนำคุณเข้าสู่ห้องได้ โปรดลองอีกครั้ง");
//     }
// }


// function replySuccess(interaction: ButtonInteraction) {
//     interaction.reply({ content: "เข้าร่วมเกมสำเร็จ", ephemeral: true }).catch((err) => {
//         console.error("Error replying success message", err);
//     });
// }


// function rankCondition(currentRank: number, restrictionSteps: number): number[] {
//     const minRank = currentRank - restrictionSteps;
//     const maxRank = currentRank + restrictionSteps;

//     const playableRanks = [];
//     for (let rank = minRank; rank <= maxRank; rank++) {
//         playableRanks.push(rank);
//     }

//     return playableRanks;
// }

// export async function selectGameCategory(interaction: ButtonInteraction, action: "create" | "join", rank_mode: boolean = false) {
//     const user_data = await prisma.userDB.findFirst({
//         where: {
//             discord_id: interaction.user.id
//         }
//     })

//     if (!user_data) return interaction.reply({ content: `กรุณาลงทะเบียน นักผจญภัยเพื่อใช้งานระบบนี้`, ephemeral: true }).catch((e) => { })

//     prisma.gameTypeDB.findMany({
//         where: {
//             categoryId: '66d2d5da2b0108700c98ea44'
//         }
//     })
//         .catch(() => {
//             return IReply(interaction, "ไม่สามารถค้นหาข้อมูลห้องเล่นเกมได้", "error", true);
//         })
//         .then(async (gameCategory) => {
//             if (!Array.isArray(gameCategory) || gameCategory.length < 1) {
//                 return IReply(interaction, "ยังไม่มีห้องเล่นเกมในระบบ", "error", true);
//             }

//             let actionRows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];
//             let gameSelectList: { value: string, label: string }[] = [];
//             const gameSelectId = `categorySelect_${action}_${rank_mode == true ? "1" : "0"}_${RandomNumber(1000, 9999)}`;

//             gameCategory.forEach((game, index) => {
//                 gameSelectList.push({
//                     value: game.id,
//                     label: game.title
//                 });

//                 if (gameSelectList.length === 25 || index === gameCategory.length - 1) {
//                     const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
//                         .addComponents(
//                             new StringSelectMenuBuilder()
//                                 .setCustomId(`${gameSelectId}_${actionRows.length}`)
//                                 .setMaxValues(1)
//                                 .setMinValues(1)
//                                 .setPlaceholder("เลือกประเภทเกม")
//                                 .addOptions(gameSelectList)
//                         );

//                     actionRows.push(actionRow);
//                     gameSelectList = [];
//                 }
//             });

//             interaction.reply({ components: actionRows, ephemeral: true }).catch(() => { }).then(() => {
//                 const channel = interaction.channel as TextChannel;
//                 const categoryCollector = channel.createMessageComponentCollector({
//                     filter: (i) => (i.user.id === interaction.user.id && i.customId.startsWith(gameSelectId)),
//                     max: 1,
//                     time: 60 * 1000 * 2
//                 });

//                 categoryCollector?.on("collect", (categorySelect: StringSelectMenuInteraction) => {
//                     interaction.deleteReply().catch(() => { });
//                 })
//             })

//         })
//         .catch(() => {
//             return IReply(interaction, "ไม่สามารถดำเนินการในระบบเลือกเกมได้", "error", true);
//         });
// }


// export async function selectGameCategorySubmit(interaction: StringSelectMenuInteraction) {
//     const user_data = await prisma.userDB.findFirst({
//         where: {
//             discord_id: interaction.user.id
//         }
//     })

//     if (!user_data) return interaction.reply({ content: `กรุณาลงทะเบียน นักผจญภัยเพื่อใช้งานระบบนี้`, ephemeral: true }).catch((e) => { })

//     const [_, action, rankModeFlag] = interaction.customId.split("_");
//     const rank_mode = rankModeFlag === "1";
//     const categoryType = interaction.values[0];

//     try {
//         const gameInType = await prisma.gameTypeGame.findMany({
//             where: { typeId: categoryType }
//         });

//         let gameList = await prisma.gameOnlineDB.findMany({
//             where: {
//                 id: {
//                     in: gameInType.map((game) => game.gameId)
//                 }
//             }
//         });


//         if (!Array.isArray(gameList) || gameList.length < 1) {
//             return interaction.reply({ content: "ไม่พบข้อมูลเกมในประเภทนี้", ephemeral: true });
//         }

//         const gameSelectId = `gameSelect_${RandomNumber(1000, 9999)}`;
//         const gameSelect = new ActionRowBuilder<StringSelectMenuBuilder>()
//             .setComponents(
//                 new StringSelectMenuBuilder()
//                     .setCustomId(gameSelectId)
//                     .setMaxValues(1)
//                     .setMinValues(1)
//                     .setPlaceholder("กรุณาเลือกเกม")
//                     .setOptions(gameList.map((game) => ({
//                         value: game.id,
//                         label: game.game_name
//                     })))
//             );

//         await interaction.reply({ components: [gameSelect], ephemeral: true });
//         let channel = interaction.channel as TextChannel
//         const gameCollector = channel.createMessageComponentCollector({
//             filter: (i) => (i.user.id === interaction.user.id && i.customId === gameSelectId),
//             max: 1,
//             time: 60 * 1000 * 5
//         });
//         gameCollector?.on("collect", async (gameSelectCollect: StringSelectMenuInteraction) => {
//             const gameId = gameSelectCollect.values[0];
//             if (action === 'join') {
//                 try {
//                     const game = await prisma.gameOnlineDB.findFirst({ where: { id: gameId } });
//                     if (!game) {
//                         return gameSelectCollect.reply({ content: "ไม่พบข้อมูลเกม", ephemeral: true });
//                     }

//                     const gameMatch = await prisma.gameMatchDB.findMany({
//                         where: {
//                             gameId,
//                             status: true,
//                             rank: rank_mode,
//                             NOT: { userId: interaction.user.id }
//                         },
//                         orderBy: { partyLimit: 'desc' }
//                     });

//                     if (!Array.isArray(gameMatch) || gameMatch.length < 1) {
//                         return gameSelectCollect.reply({ content: "ยังไม่มีสมาชิกสร้างห้องเล่นเกมนี้", ephemeral: true });
//                     }

//                     const embed = await createEmbedForRoom(0, gameMatch);
//                     const actionRow = createActionRow(0, gameId, gameMatch);

//                     await gameSelectCollect.reply({
//                         embeds: [embed],
//                         components: [actionRow],
//                         ephemeral: true
//                     });

//                     client.cache.set(`gameFind_${interaction.user.id}_${gameId}`, {
//                         where: {
//                             gameId,
//                             status: true,
//                             rank: rank_mode,
//                             NOT: { userId: interaction.user.id }
//                         },
//                         orderBy: { partyLimit: 'desc' }
//                     });
//                 } catch (err) {
//                     console.log(err);
//                     return gameSelectCollect.reply({ content: "ไม่สามารถค้นหาห้องเล่นเกมได้", ephemeral: true });
//                 }
//             } else {
//                 handleCreateGame(gameSelectCollect, gameId);
//             }
//         });

//         gameCollector?.on("end", () => {
//             interaction.deleteReply().catch(() => { });
//         });
//     } catch (err) {
//         console.log(err);
//         return interaction.reply({ content: "ไม่พบข้อมูลเกมในประเภทนี้", ephemeral: true });
//     }

//     // Handle the creation of a new game
//     async function handleCreateGame(selectGameInteraction: StringSelectMenuInteraction, gameId: string) {
//         try {
//             const game = await prisma.gameOnlineDB.findFirst({ where: { id: gameId } });
//             if (!game) {
//                 return selectGameInteraction.reply({ content: "ไม่พบข้อมูลเกม", ephemeral: true });
//             }
//             createGame(selectGameInteraction, gameId, game);
//         } catch (err) {
//             console.log(err);
//             return selectGameInteraction.reply({ content: "ไม่สามารถดึงข้อมูลเกมได้", ephemeral: true });
//         }
//     }

//     // Handle ranking and match creation
//     function createGame(selectGameInteraction: StringSelectMenuInteraction, gameId: string, game: GameOnlineDB) {
//         if (game.ranking) {
//             const rankModeSelect = `rankModeSelect_${interaction.user.id}_${gameId}`;
//             const rankMode = new ActionRowBuilder<StringSelectMenuBuilder>()
//                 .setComponents(
//                     new StringSelectMenuBuilder()
//                         .setCustomId(rankModeSelect)
//                         .setMaxValues(1)
//                         .setMinValues(1)
//                         .setPlaceholder("กรุณาเลือกระดับการเล่น")
//                         .setOptions([
//                             { label: "ลงแรงค์", value: "1" },
//                             { label: "ธรรมดา", value: "0" }
//                         ])
//                 );

//             selectGameInteraction.reply({ components: [rankMode], ephemeral: true }).then(() => {
//                 // Cache rank selection interaction and cleanup after timeout
//                 client.cache.set(`rankModeSelect_${interaction.user.id}`, { game });
//                 setTimeout(() => {
//                     client.cache.delete(`rankModeSelect_${interaction.user.id}`);
//                 }, 1000 * 60); // 1-minute timeout for rank mode selection
//             }).catch((error) => {
//                 console.log("Error: ไม่สามารถดำเนินการในระบบเลือกแรงค์ได้", error);
//                 return selectGameInteraction.reply({ content: 'ไม่สามารถดำเนินการในระบบเลือกแรงค์ได้', ephemeral: true });
//             });
//         } else {
//             createMatch(selectGameInteraction, game, false);
//         }
//     }
// }






