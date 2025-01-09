import { Guild } from "discord.js";

// owner , admin, user
export function checkOwner(interaction: any) {
    const guild = interaction.guild as Guild;

    if (!guild) {
        return interaction.reply(interaction, "ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์ได้", "error", true);
    }
    const owner = [{ discordServerID: guild.id, ownerId: guild.ownerId, serverName: guild.name }]

    return owner;
}
export function checkUser(Userlevel: string, interaction: any) {

}