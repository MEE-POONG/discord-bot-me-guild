import { ActionRowBuilder, ButtonInteraction, EmbedBuilder, GuildMember, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js";

import { PrismaClient, UserDB } from '@prisma/client';
import { IReply } from "../reply/interactionReply";
const prisma = new PrismaClient();

export async function createModalWhiteList(interaction: ButtonInteraction) {

    let data = await prisma.userDB.findFirst({
        where: {
            discord_id: interaction.user.id
        }
    })

    if (data != null) return bypass(interaction, data)

    let modalCreate = new ModalBuilder()
        .setCustomId('whitelist_modal')
        .setTitle("ลงทะเขียนนักผจญภัย")
        .setComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .setComponents(
                    new TextInputBuilder()
                        .setCustomId('firstname_lastname')
                        .setLabel("ชื่อจริง นามสกุล")
                        .setPlaceholder("โปรดระบุชื่อจริงชื่อจริง นามสกุล")
                        .setMinLength(2)
                        .setMaxLength(50)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)),

            new ActionRowBuilder<TextInputBuilder>()
                .setComponents(
                    new TextInputBuilder()
                        .setCustomId('birthdate')
                        .setLabel("วันเกิด (วัน/เดือน/ปี คริสต์ศักราช)")
                        .setPlaceholder("ตัวอย่าง 18/01/2005")
                        .setMinLength(10)
                        .setMaxLength(10)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                ),
            new ActionRowBuilder<TextInputBuilder>()
                .setComponents(
                    new TextInputBuilder()
                        .setCustomId('gmail')
                        .setLabel("Gmail")
                        .setPlaceholder("โปรดระบุอีเมล")
                        .setMinLength(10)
                        .setMaxLength(100)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                ),
            new ActionRowBuilder<TextInputBuilder>()
                .setComponents(
                    new TextInputBuilder()
                        .setCustomId('nickname')
                        .setLabel("นามแฝง")
                        .setPlaceholder("โปรดระบุนามแฝง")
                        .setMinLength(1)
                        .setMaxLength(20)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                )
        )

    interaction.showModal(modalCreate).catch((err) => {
    })
}

export async function processWhiteList(interaction: ModalSubmitInteraction) {
    let nickname = interaction.fields.getTextInputValue("nickname");
    let firstname_lastname = interaction.fields.getTextInputValue("firstname_lastname")
    let FL_name = firstname_lastname.split(" ")
    let gmail = interaction.fields.getTextInputValue("gmail");
    let birthdateString = interaction.fields.getTextInputValue("birthdate"); // วัน/เดือน/ปี(พศ) ที่รับมาเป็น string
    if (!isValidBirthdate(birthdateString)) return IReply(interaction, "วันเกิดของคุณไม่ถูกต้อง", "warn", true)
    let birthdateISO = convertToISODate(birthdateString);
    let member = interaction.member as GuildMember
    if (!isValidEmail(gmail)) return IReply(interaction, "รูปแบบอีเมลไม่ถูกต้อง", "warn", true)

    prisma.userDB.findFirst({
        where: {
            discord_id: interaction.user.id,
            OR: [
                { nickname: nickname },
                { email: gmail }
            ]
        }
    }).then((user) => {
        if (user) return IReply(interaction, "ชื่อผู้ใช้งาน หรือ ข้อมูลนี้มีอยู่ในระบบแล้ว", "warn", true)
        prisma.userDB.create({
            data: {
                discord_id: interaction.user.id,
                email: gmail, //อีเมล
                nickname: nickname, //ชื่อผู้ใช้
                alternativeGender: "",
                birthday: birthdateISO, //วันเกิด
                deleteBy: '',
                firstname: FL_name[0], //ชื่อจริง
                gender: "",  //เพศ
                lastname: FL_name[1], //นามสกุล
                updatedBy: "system",
            }
        }).then((data) => {
            showProfile(interaction, data)
            member.roles.remove("1229840227820896257").catch((e) => { })
            member.roles.add("1229840434914918452").catch((e) => { })
        }).catch((err) => {
            return IReply(interaction, "ไม่สามารถเพิ่มข้อมูลลงในระบบได้", "error", true)
        })
    }).catch((err) => {
        return IReply(interaction, "ไม่สามารถตรวจสอบข้อมูลสมาชิกได้", "error", true)
    })
}


function showProfile(interaction: ButtonInteraction | ModalSubmitInteraction, profile: UserDB) {
    const embeds = new EmbedBuilder()
        .setAuthor({
            name: `ลงทะเบียนนักผจญภัยสำเร็จ | ${interaction.guild?.name}`,
            iconURL: interaction.guild?.iconURL() ?? undefined
        })
        .setFields(
            {
                name: 'ชื่อ - นามสกุล',
                value: `${profile.firstname} ${profile.lastname}`,
                inline: true
            },
            {
                name: 'นามแฝง',
                value: `${profile.nickname}`,
                inline: true
            },
            {
                name: 'วันเกิด',
                value: `${profile.birthday}`,
                inline: true
            },
            {
                name: 'อีเมล',
                value: `${profile.email}`,
                inline: true
            },
        ).setThumbnail(interaction.user.displayAvatarURL())
        .setColor("#a0ff71")

    interaction.reply({
        embeds : [embeds],
        ephemeral : true
    }).catch(() => {})
}

function isValidBirthdate(birthdateString: string) {
    const regexPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const matches = birthdateString.match(regexPattern);

    if (!matches) return false;

    const day = parseInt(matches[1], 10);
    const month = parseInt(matches[2], 10) - 1;
    const year = parseInt(matches[3], 10);

    if (year < 1900 || year > new Date().getFullYear()) return false;

    const birthdate = new Date(year, month, day);

    if (birthdate.getFullYear() !== year || birthdate.getMonth() !== month || birthdate.getDate() !== day) {
        return false;
    }

    return true;
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function convertToISODate(birthdateString: string): string {
    let [day, month, year] = birthdateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toISOString();
}

// function checkReliability(birthdateTimestamp: number) {
//     const minBirthdateTimestamp = new Date("1954-01-01").getTime();
//     const maxBirthdateTimestamp = Date.now();

//     if (birthdateTimestamp < minBirthdateTimestamp || birthdateTimestamp > maxBirthdateTimestamp) {
//         return false;
//     } else {
//         return true;
//     }
// }

// function phoneVerify(phoneNumber: string): Promise<phoneRes> {
//     return new Promise<phoneRes>((resolve, reject) => {
//         fetch(`https://phonevalidation.abstractapi.com/v1/?api_key=${process.env.PHONE_KEY}&phone=${phoneNumber.replace("0", "66")}`, {
//             method: "GET"
//         }).then(response => response.json())
//             .then((response: PhoneNumberInfo) => {
//                 if (!response.valid) return resolve("phone-invalid");
//                 if (response.country.code == "TH") return resolve("verify-success");
//                 return resolve("verify-fail")
//             })
//             .catch(err => {
//                 return resolve("api-error")
//             });
//     })
// }

function bypass(interaction: ButtonInteraction, profile: UserDB) {
    let member = interaction.member as GuildMember;

    showProfile(interaction, profile)
    member.roles.remove("1229840227820896257").catch((e) => { })
    member.roles.add("1229840434914918452").catch((e) => { })
}

type phoneRes = "phone-invalid" | "verify-success" | "verify-fail" | "api-error"

interface PhoneNumberInfo {
    phone: string;
    valid: boolean;
    format: {
        international: string;
        local: string;
    };
    country: {
        code: string;
        name: string;
        prefix: string;
    };
    location: string;
    type: string;
    carrier: string;
}