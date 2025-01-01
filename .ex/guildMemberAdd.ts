import { AttachmentBuilder, TextChannel } from "discord.js";
import { client } from "..";
import { generateImage } from "../functions/image/imageGenerate";

client.on("guildMemberAdd", async (member) => {
    if (member.guild.id == "1229834103872946247") {
        try {
            const buffer = await generateImage(member)
            const image = new AttachmentBuilder(buffer, {name : "welcome.png"})
            member.guild.channels.fetch("1230530007500066836").catch(() => {

            }).then((channel : any) => {
                if(!channel) return;

                channel.send({
                    files : [image],
                    content : `${member.toString()}`
                }).catch(() => {})
                
            })
        } catch (error) {
            console.log(error)
        }
    }
})