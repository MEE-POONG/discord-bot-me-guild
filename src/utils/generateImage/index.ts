import { createCanvas, loadImage, registerFont } from 'canvas';
import { GuildMember } from 'discord.js';

export function generateImage(member: GuildMember) {
  return new Promise<Buffer>((resolve, reject) => {
    registerFont('./src/utils/generateImage/FC Mission Rounded [Non-commercial].ttf', {
      family: 'CustomFont',
    });
    const canvas = createCanvas(840, 480);
    const ctx = canvas.getContext('2d');
    const imagePath = './src/utils/generateImage/image.png';
    loadImage(imagePath)
      .then((image) => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 100;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        loadImage(member.user.displayAvatarURL({ extension: 'png' }))
          .then((innerImage) => {
            ctx.drawImage(
              innerImage,
              centerX - radius,
              centerY - radius,
              radius * 2,
              radius * 2,
            );

            ctx.restore();

            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            ctx.font = '50px "CustomFont"';
            ctx.fillStyle = 'blue';
            const text = `${member.user.username}`;
            const textWidth = ctx.measureText(text).width;
            const textX = (canvas.width - textWidth) / 2;
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'white';
            ctx.strokeText(text, textX, centerY + 150);
            ctx.fillText(text, textX, centerY + 150);

            ctx.font = '40px "CustomFont"';
            ctx.fillStyle = 'yellow';
            const text2 = 'ยินดีต้อนรับผู้มาเยือนสู่ MeGuild';
            const textWidth2 = ctx.measureText(text2).width;
            const textX2 = (canvas.width - textWidth2) / 2;
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'black';
            ctx.strokeText(text2, textX2, centerY + 200);
            ctx.fillText(text2, textX2, centerY + 200);

            return resolve(canvas.toBuffer('image/png'));
          })
          .catch((err) => {
            console.error('Error loading inner image:', err);
            return reject(err);
          });
      })
      .catch((err) => {
        console.error('Error loading image or font:', err);
        return reject(err);
      });
  });
}
