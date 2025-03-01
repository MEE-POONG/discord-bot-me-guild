import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class VoiceTimeService {
  private voiceTimeTracker = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  async deleteVoiceTime(userId: string) {
    return await this.prisma.voiceTime.deleteMany({
      where: { userId, channelId: { equals: "" }, duration: { equals: 5 } }
    });
  }

  // บันทึกเวลาใหม่
  async createVoiceTime(data: {
    userId: string;
    channelId: string;
    duration: number;
    timestamp: Date;
  }) {
    return await this.prisma.voiceTime.create({
      data
    });
  }

  // ดึงเวลารวมทั้งหมดของผู้ใช้
  async getTotalVoiceTime(userId: string): Promise<number> {
    const voiceTimes = await this.prisma.voiceTime.aggregate({
      where: { userId },
      _sum: { duration: true }
    });
    
    // รวมเวลาที่กำลังติดตามอยู่ (ถ้ามี)
    const currentTracking = this.voiceTimeTracker.get(userId);
    const currentDuration = currentTracking 
      ? Math.floor((Date.now() - currentTracking) / 1000)
      : 0;

    return (voiceTimes._sum.duration || 0) + currentDuration;
  }

  // ดึงเวลารวมในช่วงเวลาที่กำหนด
  async getVoiceTimeInRange(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const voiceTimes = await this.prisma.voiceTime.aggregate({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: { duration: true }
    });
    return voiceTimes._sum.duration || 0;
  }

  // ดึงข้อมูลแยกตาม channel
  async getVoiceTimeByChannel(userId: string): Promise<Array<{ channelId: string, totalDuration: number }>> {
    const voiceTimes = await this.prisma.voiceTime.groupBy({
      by: ['channelId'],
      where: { userId },
      _sum: { duration: true }
    });

    return voiceTimes.map(vt => ({
      channelId: vt.channelId,
      totalDuration: vt._sum.duration || 0
    }));
  }

  // ฟังก์ชันช่วยแปลงเวลาเป็นรูปแบบที่อ่านง่าย
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} ชั่วโมง`);
    if (minutes > 0) parts.push(`${minutes} นาที`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds} วินาที`);

    return parts.join(' ');
  }

  public startTracking(userId: string) {
    this.voiceTimeTracker.set(userId, Date.now());
  }

  public stopTracking(userId: string): number | null {
    const startTime = this.voiceTimeTracker.get(userId);
    if (startTime) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      this.voiceTimeTracker.delete(userId);
      return duration;
    }
    return null;
  }

  public resetTracking(userId: string) {
    this.voiceTimeTracker.set(userId, Date.now());
  }
} 