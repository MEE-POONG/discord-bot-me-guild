import { Injectable, Logger } from '@nestjs/common';
import {
  EmbedBuilder,
  Guild,
} from 'discord.js';
import { ServerRepository } from 'src/repository/server';

@Injectable()
export class ServerRegisterService {
  private readonly logger = new Logger(ServerRegisterService.name);
  constructor(
    private readonly serverRepository: ServerRepository,
  ) { }
  public onModuleInit() {
    this.logger.log('ServerRegister initialized');
  }
  async ServerRegisterSystem(interaction: any) {
    const guild = interaction.guild as Guild;
  
    // ตรวจสอบว่า guild มีข้อมูลหรือไม่
    if (!guild) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ ข้อผิดพลาดในการดึงข้อมูล')
            .setDescription('ไม่สามารถดึงข้อมูลเซิร์ฟเวอร์จาก Discord ได้')
            .setColor(0xff0000) // สีแดง
        ],
        ephemeral: true,
      });
    }
  
    // ตรวจสอบว่า user เป็นเจ้าของเซิร์ฟเวอร์หรือไม่
    if (guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⛔ ข้อผิดพลาดในการเข้าถึง')
            .setDescription('🔒 คำสั่งนี้สามารถใช้งานได้เฉพาะเจ้าของเซิร์ฟเวอร์เท่านั้น')
            .setColor(0xff0000) // สีแดง
        ],
        ephemeral: true,
      });
    }
  
    // กำหนดข้อมูลเซิร์ฟเวอร์
    const serverId = guild.id; // Discord Server ID
    const ownerId = guild.ownerId; // Owner ID
    const serverName = guild.name; // Discord Server Name
  
    try {
      // ตรวจสอบว่ามีเซิร์ฟเวอร์นี้ในระบบแล้วหรือไม่
      const existingServer = await this.serverRepository.getServerById(serverId);
      if (existingServer) {
        // แจ้งเตือนว่า serverId ลงทะเบียนไปแล้ว
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('⚠️ ข้อผิดพลาดในการลงทะเบียน') // หัวข้อ
              .setDescription(`📌 เซิร์ฟเวอร์ "${existingServer.serverName}" ได้ลงทะเบียนไว้แล้ว`) // รายละเอียด
              .setColor(0xffa500) // สีส้ม (เตือน)
          ],
          ephemeral: true,
        });
      }
  
      // ดำเนินการลงทะเบียนเซิร์ฟเวอร์
      const newServer = await this.serverRepository.ServerRegister(
        serverId,
        serverName,
        ownerId
      );
  
      // ตรวจสอบว่าการลงทะเบียนสำเร็จหรือไม่
      if (newServer) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('✅ ลงทะเบียนสำเร็จ') // หัวข้อ
              .setDescription(`🎉 เซิร์ฟเวอร์ "${newServer.serverName}" ลงทะเบียนสำเร็จแล้ว`) // รายละเอียด
              .setColor(0x00ff00) // สีเขียว (สำเร็จ)
          ],
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ ข้อผิดพลาดในการลงทะเบียน') // หัวข้อ
              .setDescription(`ไม่สามารถลงทะเบียน "${serverName}" DiscordServer ได้`) // รายละเอียด
              .setColor(0xff0000) // สีแดง
          ],
          ephemeral: true,
        });
      }
    } catch (error) {
      // จัดการข้อผิดพลาดและแจ้งเตือน
      console.error('Error registering server:', error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ ข้อผิดพลาดที่ไม่คาดคิด') // หัวข้อ
            .setDescription(`🚨 เกิดข้อผิดพลาดในการลงทะเบียน "${serverName}" DiscordServer`) // รายละเอียด
            .setColor(0xff0000) // สีแดง
        ],
        ephemeral: true,
      });
    }
  }
}
