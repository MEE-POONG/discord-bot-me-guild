import { Canvas, loadImage, FontLibrary } from 'skia-canvas';
import { GuildMember } from 'discord.js';
import * as path from 'path';

export function generateImage(member: GuildMember) {
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      // ใช้ path.resolve() เพื่อให้แน่ใจว่า path ถูกต้อง
      const fontPath = path.resolve('./src/utils/generateImage/fonts/Sriracha.ttf');

      // ลงทะเบียนฟอนต์ด้วย FontLibrary.use()
      FontLibrary.use('CustomFonts', fontPath);

      // สร้าง Canvas
      const canvas = new Canvas(840, 480);
      const ctx = canvas.getContext('2d');

      // โหลดภาพพื้นหลัง
      const imagePath = path.resolve('./src/utils/generateImage/image.png');
      const image = await loadImage(imagePath);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 100;

      // วาดวงกลมและคลิป
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // โหลดภาพโปรไฟล์
      const innerImage = await loadImage(member.user.displayAvatarURL({ extension: 'png' }));
      ctx.drawImage(innerImage, centerX - radius, centerY - radius, radius * 2, radius * 2);
      ctx.restore();

      // ตั้งค่าการวาดข้อความ
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // ใช้ฟอนต์ CustomFonts
      ctx.font = '70px CustomFonts';
      ctx.fillStyle = '#fcfdf0';
      const text = `${member.user.username}`;
      const textWidth = ctx.measureText(text).width;
      const textX = (canvas.width - textWidth) / 2;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#00838f';
      ctx.strokeText(text, textX, centerY + 150);
      ctx.fillText(text, textX, centerY + 150);

      ctx.font = '50px CustomFonts';
      ctx.fillStyle = '#fbfeee';
      const text2 = 'ยินดีต้อนรับผู้มาเยือนสู่ MeGuild';
      const textWidth2 = ctx.measureText(text2).width;
      const textX2 = (canvas.width - textWidth2) / 2;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#00838f';
      ctx.strokeText(text2, textX2, centerY + 200);
      ctx.fillText(text2, textX2, centerY + 200);

      // ส่งกลับ Buffer ของภาพ
      const buffer = await canvas.toBuffer('png');
      resolve(buffer);
    } catch (err) {
      console.error('Error generating image:', err);
      reject(err);
    }
  });
}