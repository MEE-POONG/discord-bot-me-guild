import { ButtonInteraction, CategoryChannel, ChannelType, EmbedBuilder, GuildMember, Role, StringSelectMenuInteraction, TextChannel, User, VoiceChannel } from "discord.js";
import { Guild, PrismaClient, UserDB } from '@prisma/client';
import { client } from "../..";
import { userData, UserProfile } from "../prisma/userData";
import { IReply } from "../reply/interactionReply";
const prisma = new PrismaClient();

export async function acceptInviteGuild(interaction: StringSelectMenuInteraction) {
    let guildId = interaction.customId.split("-")[3].split("_")[0];
    let userIdList = interaction.values;
    let memberData = new guildManage(interaction.member as GuildMember);

    if (!memberData.checkPermission()) {
        return IReply(interaction, "เจ้าของกิลด์เท่านั้นที่จะสามารถตอบรับคำเชิญได้", "error", true);
    }

    let userAllowList: string[] = [];

    try {
        // Check if users are already in a guild
        for (let i = 0; i < userIdList.length; i++) {
            let userData = await prisma.guildMembers.findFirst({
                where: {
                    userId: userIdList[i]
                }
            });

            if (!userData) {
                userAllowList.push(userIdList[i]);
            }
        }

        if (userAllowList.length === 0) {
            return IReply(interaction, "ไม่พบผู้ใช้ที่สามารถเข้าร่วมกิลด์ได้ เนื่องจากผู้ใช้ทั้งหมดมีกิลด์อยู่แล้ว", "error", true);
        }

        let guild = await prisma.guild.findFirst({
            where: {
                id: guildId
            }
        });

        if (!guild) {
            return IReply(interaction, "ไม่พบกิลด์ที่คุณอยู่ในระบบ", "error", true);
        }

        let memberList = await prisma.guildMembers.findMany({
            where: {
                guildId: guildId
            }
        });

        let memberSize = memberList.length || 0;
        let guildLimit = guild.guild_size || 0;

        if (memberSize + userAllowList.length > guildLimit) {
            return IReply(interaction, "ไม่สามารถเชิญเข้าร่วมกิลด์ได้เนื่องจากสมาชิกกิลด์ของคุณเต็มแล้ว", "error", true);
        }

        // Prepare data for new members
        let memberDataList = userAllowList.map((userId) => ({
            userId: userId,
            guildId: guildId,
            position: "Member"
        }));

        // Add members to the guild
        await prisma.guildMembers.createMany({
            data: memberDataList
        });

        // Process roles and invitation cleanup
        for (let memberData of memberDataList) {
            try {
                let member = await interaction.guild?.members.fetch(memberData.userId);
                if (member) {
                    await member.roles.add(`${guild.guild_roleId}`);
                    await member.roles.add(`1286604614417776712`);
                    await prisma.inviteRequest.deleteMany({
                        where: {
                            userId: memberData.userId,
                            guildId: guildId
                        }
                    });
                }
            } catch (error) {
                console.log(error)
                await prisma.guildMembers.deleteMany({
                    where: {
                        userId: memberData.userId,
                        guildId: guildId
                    }
                });
            }
        }

        return IReply(interaction, "เชิญสมาชิกเข้ากิลด์สำเร็จ", "success", true);

    } catch (error) {
        console.log(error)
        return IReply(interaction, "ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้", "error", true);
    }
}

export async function joinGuild(interaction: StringSelectMenuInteraction) {
    let guildId = interaction.values[0];
    let memberData = new guildManage(interaction.member as GuildMember)
    let ownerData = await new userData(interaction.user).getProfile() as any;
    if (!ownerData) return IReply(interaction, "คุณไม่สามารถสร้างกิลด์ได้ เนื่องจากคุณไม่มีข้อมูลนักผจญภัย โปรดลงทะเบียนก่อนสร้างกิลด์", "error", true);
    if (await memberData.checkGuild(ownerData)) return IReply(interaction, "คุณไม่สามารถขอเข้ากิลด์ได้เนื่องจากคุณมีกิลด์อยู่แล้ว", "info", true);

    //check invite request
    let inviteRequest = await prisma.inviteRequest.findFirst({
        where: {
            guildId: guildId,
            userId: interaction.user.id
        }
    })

    if (inviteRequest) return IReply(interaction, "คุณเคยส่งคำขอเข้ากิลด์นี้แล้ว", "error", true);


    let guild = await prisma.guild.findFirst({
        where: {
            id: guildId
        }
    })

    let memberList = await prisma.guildMembers.findMany({
        where: {
            guildId: guildId
        }
    })

    let memberSize = memberList.length || 0;
    let guildLimit = guild?.guild_size || 0;

    if (memberSize >= guildLimit) return IReply(interaction, "ไม่สามารถเข้าร่วมกิลด์นี้เนื่องจากกิลด์นี้มีสมาชิกเต็มแล้ว", "error", true);

    prisma.inviteRequest.create({
        data: {
            guildId: guildId,
            userId: interaction.user.id
        }
    }).catch((err) => {
        console.log(err)
        return IReply(interaction, "ไม่สามารถส่งคำขอเข้ากิลด์ได้", "error", true);
    }).then(() => {
        IReply(interaction, "ส่งคำขอเข้ากิลด์สำเร็จ", "success", true)
    })
}

export class guildManage {

    private member: GuildMember | null = null;
    private user: User
    public guild: Guild | null = null;

    constructor(member: GuildMember | User) {
        if (member instanceof GuildMember) {
            this.member = member;
            this.user = member.user;
        } else {
            this.user = member
        }
        this.getGuild()
    }

    async checkGuild(userData: UserProfile) {
        try {
            let guild = await prisma.guildMembers.findFirst({
                where: {
                    userId: userData.discord_id as string
                }
            })

            return guild;
        } catch (error) {
            throw error
        }
    }

    async cancelInviteCreate(interaction: ButtonInteraction) {
        let reportId = interaction.customId.split("_")[3]
        prisma.guildCreateReport.findFirst({
            where: {
                id: reportId
            }
        }).catch(() => {
            interaction.message.delete().catch(() => { })
            return IReply(interaction, "ยกเลิกคำขอสำเร็จ", "success", true)
        }).then((report) => {
            if (!report) return IReply(interaction, "ไม่พบรายงานที่คุณต้องการยกเลิก", "error", true)
            interaction.message.delete().catch(() => { })
            IReply(interaction, "ยกเลิกคำขอสำเร็จ", "success", true)


            client.users.fetch(report.ownerId).then((user) => {
                if (!user) return
                user.send({
                    content: `❌ เนื่องจากผู้ร่วมก่อตั้งกิลด์ ${report.guildName} ไม่เห็นด้วยกับคำขอของคุณ คำขอสร้างกิลด์ของคุณได้ถูกยกเลิกแล้ว`
                }).catch(() => { })
            })

            prisma.guildCreateReport.delete({
                where: {
                    id: reportId
                }
            }).catch(() => { })
        })
    }

    async acceptInviteCreate(interaction: ButtonInteraction) {
        let cacheAccept = client.cache.get(`accept_${interaction.user.id}_${interaction.customId}`);
        if (cacheAccept) return IReply(interaction, "คุณได้ยืนยันคำขอนี้ไปแล้ว", "error", true);
        client.cache.set(`accept_${interaction.user.id}_${interaction.customId}`, true);
        try {
            let reportId = interaction.customId.split("_")[3];

            // Find the report
            const report = await prisma.guildCreateReport.findFirst({ where: { id: reportId } });
            if (!report) {
                return IReply(interaction, "ไม่พบรายงานที่คุณต้องการยอมรับ", "error", true);
            }

            if (report.members.length >= 4) {
                // Create the guild
                let membersList = report.members;
                membersList.push(interaction.user.id);
                const guild = await prisma.guild.create({
                    data: {
                        guild_name: report.guildName,
                        guild_roleId: null,
                        guild_size: 10,
                        guild_level: 1,
                        guild_copper: 0,
                        guild_leader: report.ownerId,
                        Logo: '',
                        createdBy: report.ownerId,    // or another identifier
                        updatedBy: report.ownerId,    // or another identifier
                        deleteBy: '',                 // or a nullable field if allowed

                    }
                });

                if (!guild) {
                    return IReply(interaction, "ไม่สามารถสร้างกิลด์ใหม่ได้ โปรดทำการก่อตั้งกิลด์ใหม่", "error", true);
                }

                const members = await prisma.guildMembers.createMany({
                    data: membersList.map(userId => ({
                        userId: userId,
                        position: userId === report.ownerId ? "Leader" : "Co-founder",
                        guildId: guild.id,
                    })),
                });

                if (!members.count) {
                    await deleteData(guild);
                    return IReply(interaction, "ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้", "error", true);
                }

                if (!members.count) {
                    await deleteData(guild);
                    return IReply(interaction, "ไม่สามารถเพิ่มสมาชิกลงในกิลด์ได้", "error", true);
                }


                this.createGuild(report.guildName).then(async (res) => {
                    if (res.role === undefined) {
                        await deleteData(guild);
                        return IReply(interaction, `กิลด์ ${report.guildName} ของคุณได้รับอนุมัติแล้ว แต่ไม่สามารถสร้างกิลด์ได้`, "error", true);
                    }

                    if (res.message !== "success") {
                        await deleteData(guild);
                        await res.role?.delete();
                        return IReply(interaction, `กิลด์ ${report.guildName} ของคุณได้รับอนุมัติแล้ว แต่ ${res.message}`, "error", true);
                    }

                    await prisma.guild.update({
                        data: { guild_roleId: res.role.id },
                        where: { id: guild.id },
                    });

                    IReply(interaction, "ยืนยันคำขอสำเร็จ", "success", true);

                    let Interguild = await client.guilds.fetch('1229834103872946247')
                    if (!Interguild) return IReply(interaction, "ไม่สามารถเข้าถึงดิสกิลด์ได้", "error", true);
                    const owner = await Interguild?.members.fetch(report.ownerId);
                    owner?.roles.add('1286604569744375850').catch(() => { console.log("Failed to add role to owner"); })

                    membersList.forEach(async (id) => {
                        const member = await Interguild?.members.fetch(id);
                        if (member) {
                            member.roles.add(`1286604609908903946`).catch(() => { console.log(`Failed to add role to member ${id}`); })
                            member.roles.add(res.role as Role).catch(() => { console.log(`Failed to add role to member ${id}`); }).then(() => { })
                            member.send({ content: `🎉 ยินดีด้วย! กิลด์ ${report.guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว` }).catch(() => { console.log(`Failed to send message to member ${id}`); });
                        }
                    })

                    updateMessage(report.channelId, report.messageId, report.guildName, membersList);

                    await prisma.guildCreateReport.delete({ where: { id: reportId } }).catch(() => { });

                    interaction.message.delete().catch(() => { console.log("Failed to delete interaction message"); });
                }).catch((error) => {
                    IReply(interaction, "เกิดข้อผิดพลาดในการยืนยันคำขอ โปรดลองอีกครั้ง", "error", true);
                })

            } else {
                await prisma.guildCreateReport.update({
                    data: { members: { push: interaction.user.id } },
                    where: { id: reportId },
                });

                IReply(interaction, "ยืนยันคำขอสำเร็จ", "success", true);
                interaction.message.delete().catch(() => { console.log("Failed to delete interaction message"); });

                updateMessage(report.channelId, report.messageId, report.guildName, [...report.members, interaction.user.id]);
            }

        } catch (error) {
            IReply(interaction, "เกิดข้อผิดพลาดในการยืนยันคำขอ โปรดลองอีกครั้ง", "error", true);
        }

        async function deleteData(guild: Guild) {
            await prisma.guild.delete({ where: { id: guild.id } }).catch(() => {
                console.log(`Failed to delete guild: ${guild.id}`);
            });
            await prisma.guildMembers.deleteMany({ where: { guildId: guild.id } }).catch(() => {
                console.log(`Failed to delete guild members for guild: ${guild.id}`);
            });
        }

        function updateMessage(channelId: string, messageId: string, guildName: string, members: string[]) {
            client.channels.fetch(channelId).then(async (channel) => {
                if (!channel) return;
                let ch = channel as TextChannel | VoiceChannel;
                const message = await ch.messages.fetch(messageId);
                if (!message) return;

                if (members.length >= 4) {
                    // Guild created
                    message.edit({
                        embeds: [new EmbedBuilder(message.embeds[0].toJSON())
                            .setTitle(`#🎉 กิลด์ ${guildName} ได้รับการก่อตั้งอย่างเป็นทางการแล้ว`)
                            .setColor("Gold")
                        ]
                    }).catch(() => { console.log("Failed to edit message"); });
                } else {
                    // Progress update
                    message.edit({
                        embeds: [new EmbedBuilder(message.embeds[0].toJSON())
                            .setTitle(`# ความคืบหน้า (${members.length}/4) ของกิลด์ ${guildName}`)
                        ]
                    }).catch(() => { console.log("Failed to edit progress message"); });
                }
            }).catch(() => { console.log("Failed to fetch channel or message"); });
        }
    }



    async getGuild() {
        let guildMembers = await prisma.guildMembers.findFirst({
            where: {
                userId: this.user.id
            }
        })

        if (!guildMembers) return this.guild = null;

        let guild = await prisma.guild.findFirst({
            where: {
                id: guildMembers?.guildId
            }
        })

        if (!guild) return this.guild = null;
        this.guild = guild;
        return guild;
    }

    async createGuild(guildName: string, guildId: any = null): Promise<{
        role: Role | undefined,
        message: string
    }> {
        let guildServer = await client.guilds.fetch('1229834103872946247').catch(() => { })

        let positionRole = guildServer?.roles.cache.get('1232782889616146443')
        return new Promise((resolve, rejects) => {
            guildServer?.roles.create({
                name: `🕍 ${guildName}`,
                position: positionRole ? positionRole.position + 1 : undefined,
                color: "#A4F1FF"
            }).then(async (roles) => {
                if (!roles) return resolve({
                    role: undefined,
                    message: "ไม่สามารถสร้างบทบาท กิลด์ของคุณได้"
                });
                return resolve({
                    role: roles,
                    message: await this.createChannel(roles)
                });
            }).catch((error) => {
                return resolve({
                    role: undefined,
                    message: "ไม่สามารถสร้างห้องกิลด์ได้"
                })
            })
        })
    }
    private async createChannel(roles: Role): Promise<createChannelRes> {
        try {

            let guildServer = await client.guilds.fetch('1229834103872946247').catch(() => { })
            const positionGuild = guildServer?.channels.cache.get("1230547534200443023") as CategoryChannel;

            const category = await guildServer?.channels.create({
                name: roles.name,
                type: ChannelType.GuildCategory,
                position: positionGuild ? positionGuild.position + 1 : undefined,
                permissionOverwrites: [
                    {
                        id: '1229834103872946247',
                        allow: ["ViewChannel"],
                        deny: ["Connect"]
                    }, {
                        id: roles.id,
                        allow: ["ViewChannel", "Connect"]
                    }
                ]
            })

            if (!category) {
                return "ไม่สามารถสร้างห้องหมวดหมู่กิลด์ได้";
            }

            const createVoiceChannel = async (name: string, state = 0, publicView = false) => {
                const voiceChannel = await category.children.create({
                    type: state == 0 ? ChannelType.GuildVoice : state == 1 ? ChannelType.GuildStageVoice : ChannelType.GuildText,
                    name,
                    permissionOverwrites: publicView ? [
                        {
                            id: '1229840434914918452',
                            allow: ['ViewChannel', 'Connect']
                        }
                    ] : undefined
                });
                if (!voiceChannel) {
                    if (category.children.cache.size > 0) {
                        category.children.cache.forEach(c => {
                            c.delete().catch(() => { })
                        })
                    }
                    category.delete().catch(() => { })
                    throw new Error(`ไม่สามารถสร้างห้อง ${name} ได้`);
                }

                return voiceChannel;
            };

            await Promise.all([
                createVoiceChannel("💬・แชท", 2),
                createVoiceChannel("🎤・โถงหลัก", 0),
                createVoiceChannel("🎤・โถงรอง", 0),
                createVoiceChannel("🎁・เยี่ยมบ้าน", 0, true),
                createVoiceChannel("👑・กิจกรรมกิลด์", 1, true)
            ]);

            return "success";
        } catch (error: any) {
            return error.message || "เกิดข้อผิดพลาดในการสร้างห้อง";
        }
    }

    async findMemberInGuild(guildId: string, userId: string) {
        try {
            let guild = await prisma.guildMembers.findFirst({
                where: {
                    id: guildId,
                    AND: {
                        userId: userId
                    }
                }
            })
            return guild;
        } catch (error) {
            throw error
        }
    }

    async kickMember(userData: UserProfile) {
        let guildId = userData.GuildMembers[0]?.guildId; // Use optional chaining to handle potential undefined
        if (!guildId) return "สมาชิกนี้ไม่มีกิลด์";

        try {
            const guildMember = await this.findMemberInGuild(guildId, userData.id);
            if (!guildMember) return "สมาชิกที่ต้องการจะเตะไม่ได้อยู่ในกิลด์นี้";

            await prisma.guildMembers.delete({
                where: {
                    id: guildMember.id
                }
            });

            const deletedGuildMember = await this.findMemberInGuild(guildId, userData.id);
            if (!deletedGuildMember) {
                return "สมาชิกถูกเตะออกจากกิลด์แล้ว";
            } else {
                return "เกิดข้อผิดพลาดในการเตะสมาชิก";
            }
        } catch (error) {
            return "เกิดข้อผิดพลาดในการเตะสมาชิก"
        }
    }

    async inviteMember(userData: UserProfile) {
        try {
            const guild = await prisma.guildMembers.findFirst({
                where: {
                    userId: this.member?.id
                }
            })

            if (!guild) {
                return {
                    status: "fail",
                    message: "คุณไม่มีกิลด์",
                    inviteId: null
                };
            }

            const invite = await prisma.inviteData.create({
                data: {
                    guildId: guild.guildId,
                    userId: userData.discord_id
                }
            });

            return {
                status: "success",
                message: "สร้างคำเชิญสำเร็จ",
                inviteId: invite.id
            };
        } catch (error) {
            console.log(error)
            return {
                status: "fail",
                message: "ไม่สามารถสร้างคำเชิญได้",
                inviteId: null
            };
        }
    }
    checkPermission() {
        return this.member?.roles.cache.some((r) => r.id == "1286604569744375850")
    }

    async acceptInvite(interaction: ButtonInteraction) {
        if (interaction.customId === "guildInvite_cancel") {
            try {
                await interaction.message.delete();
                await interaction.deferUpdate();
            } catch (error) {
                // Handle any potential errors here, if necessary
            }
        } else {
            try {
                let userProfile = await new userData(this.user).getProfile();
                if (userProfile == null) {
                    return IReply(interaction, "ไม่สามารถยอมรับคำขอนี้ได้เนื่องจากคุณไม่มีข้อมูลนักผจญภัย", "error", true);
                }

                if (this.guild) {
                    return IReply(interaction, "คุณไม่สามารถตอบรับคำเชิญนี้ได้เนื่องจากคุณมีกิลด์อยู่แล้ว", "error", true);
                }

                let inviteId = interaction.customId.split("_")[1];

                let inviteData = await prisma.inviteData.findFirst({
                    where: { id: inviteId }
                });

                if (!inviteData) {
                    return IReply(interaction, "ไม่พบคำเชิญที่คุณต้องการยอมรับ", "error", true);
                }

                let guild = await prisma.guild.findFirst({
                    where: { id: inviteData.guildId }
                });

                if (!guild) {
                    return IReply(interaction, "ไม่พบกิลด์ที่คุณจะเข้าร่วมในระบบ", "error", true);
                }

                let memberList = await prisma.guildMembers.findMany({
                    where: { guildId: inviteData.guildId }
                });

                let memberSize = memberList.length || 0;
                if (memberSize >= guild.guild_size) {
                    return IReply(interaction, "คุณไม่สามารถเข้าร่วมกิลด์ได้เนื่องจาก สมาชิกในกิลด์นี้ถึงขีดจำกัดแล้ว", "error", true);
                }

                let newMember = await prisma.guildMembers.create({
                    data: {
                        guildId: inviteData.guildId,
                        position: "Member",
                        userId: interaction.user.id
                    }
                });

                if (!newMember) {
                    return IReply(interaction, "ไม่สามารถเพิ่มข้อมูลของคุณลงในกิลด์ได้", "error", true);
                }

                let disGuild = await client.guilds.fetch(process.env.GUILD_ID as string);
                if (!disGuild) {
                    return IReply(interaction, "ไม่พบเซิร์ฟเวอร์ในดิสของเรา", "error", true);
                }

                let member = await disGuild.members.fetch(this.user.id);
                if (!member) {
                    return IReply(interaction, "เกิดข้อผิดพลาดไม่พบคุณในดิสของเรา", "error", true);
                }

                await member.roles.add('1286604614417776712');
                await member.roles.add(guild.guild_roleId as string);

                prisma.inviteData.delete({
                    where: { id: inviteId }
                }).catch(() => { })

                interaction.message.edit({
                    components: []
                }).catch(() => { })

                return IReply(interaction, `ระบบได้เพิ่มคุณเข้าสู่กิลด์ ${guild.guild_name} เรียบร้อยแล้วค่ะ`, "success", true);
            } catch (error) {
                console.log(error)
                return IReply(interaction, "เกิดข้อผิดพลาดในการดำเนินการ", "error", true);
            }
        }

    }
}

type createChannelRes = string