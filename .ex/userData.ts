import { GuildMembers, Prisma, PrismaClient, UserDB, Wallet } from "@prisma/client";
import { User } from "discord.js";

const prisma = new PrismaClient()

export class userData {
    private user : User
    constructor (user : User){
        this.user = user;
    }

    async getProfile() {
        try {
            // Fetch user data
            let userUserData = await prisma.userDB.findFirst({
                where: {
                    discord_id: this.user.id,
                }
            });
    
            // Fetch guild members data
            let userGuildMembers = await prisma.guildMembers.findMany({
                where: {
                    userId: this.user.id
                }
            });
    
            // Fetch wallet data
            let userWallet = await prisma.wallet.findFirst({
                where: {
                    userId: this.user.id
                }
            });
    
            // Return the profile data
            return {
                ...userUserData,
                GuildMembers: userGuildMembers,
                wallet: userWallet
            } as UserProfile;
    
        } catch (error) {
            console.error("Error fetching user profile:", error);
            // You can return null or throw the error depending on how you want to handle it in other parts of the code.
            return null;
        }
    }
    
}

export interface UserProfile extends UserDB {
    GuildMembers : GuildMembers[],
    wallet : Wallet | null
}
