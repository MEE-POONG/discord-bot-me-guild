<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Discord Bot Me Guild

Discord bot สำหรับจัดการกิลด์และฟีเจอร์ต่างๆ ใน Discord server

## 🚀 Features

- **Guild Management**: สร้างและจัดการกิลด์
- **Game System**: ระบบเกมและการแข่งขัน
- **Voice Time Tracking**: ติดตามเวลาใน voice channels
- **Blog System**: ระบบบทความและข่าวสาร
- **Role Management**: จัดการ roles และ permissions
- **Stage Channel**: จัดการ stage channels สำหรับ live streaming
- **Donation System**: ระบบรับบริจาค
- **Server Registration**: ลงทะเบียนเซิร์ฟเวอร์ในระบบ

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB
- Discord Bot Token
- Discord Application ID

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd discord-bot-me-guild
```

2. **Install dependencies**
```bash
npm install
# หรือ
yarn install
```

3. **Setup environment variables**
สร้างไฟล์ `.env` ในโฟลเดอร์หลัก:
```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here

# Database Configuration
DATABASE_URL=mongodb://localhost:27017/discord_bot_db

# Application Configuration
PORT=6001
NODE_ENV=development
```

4. **Setup Database**
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed database (optional)
npm run seed
```

5. **Start the application**
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## 🌐 Global Commands Setup

### การตั้งค่า Global Commands

บอทนี้ถูกตั้งค่าให้ใช้ **Global Commands** ซึ่งหมายความว่า slash commands จะทำงานได้ในทุก Discord server ที่บอทเข้าร่วม

#### ขั้นตอนการตั้งค่า:

1. **สร้าง Discord Application**
   - ไปที่ [Discord Developer Portal](https://discord.com/developers/applications)
   - สร้าง Application ใหม่
   - ไปที่ "Bot" section และสร้าง bot

2. **ตั้งค่า Bot Permissions**
   - ใน Bot section ให้เปิดใช้งาน permissions ต่อไปนี้:
     - `applications.commands` (สำหรับ slash commands)
     - `Send Messages`
     - `Use Slash Commands`
     - และ permissions อื่นๆ ตามที่ต้องการ

3. **Invite Bot to Servers**
   - ไปที่ OAuth2 > URL Generator
   - เลือก scopes: `bot` และ `applications.commands`
   - เลือก permissions ที่ต้องการ
   - ใช้ URL ที่ได้เพื่อเชิญบอทเข้า server

4. **Environment Variables**
   ```env
   DISCORD_BOT_TOKEN=your_bot_token_here
   DATABASE_URL=your_mongodb_url_here
   ```

### Development Mode (Optional)

หากต้องการทดสอบใน server เดียวก่อน สามารถเปิด development mode ได้:

```env
ENABLE_DEVELOPMENT_MODE=true
DISCORD_GUILD_ID=your_test_guild_id
```

## 📚 Available Commands

### General Commands
- `/ping` - ตรวจสอบ latency ของบอท
- `/bot-info` - แสดงข้อมูลเกี่ยวกับบอท
- `/remove-commands` - ลบ guild commands (เฉพาะใน server นั้น)

### Guild Management
- `/guild-create` - สร้างกิลด์ใหม่
- `/guild-invite` - เชิญสมาชิกเข้ากิลด์
- `/guild-kick` - ขับไล่สมาชิกออกจากกิลด์

### Game System
- `/game-create-room` - สร้างห้องเกม
- `/game-join` - เข้าร่วมเกม
- `/game-rank` - ดูอันดับเกม

### Server Management
- `/server-register` - ลงทะเบียนเซิร์ฟเวอร์
- `/server-create-role` - สร้าง role ใหม่
- `/server-update-role` - อัปเดต role

### Voice & Stage
- `/voice-time` - ดูเวลาใน voice channels
- `/stage-channel` - จัดการ stage channels

### Content
- `/blog-update` - ดูบทความล่าสุด
- `/news-update` - อัปเดตข่าวสาร

## 🏗️ Project Structure

```
src/
├── app.module.ts          # Main application module
├── app.service.ts         # Core application service
├── prisma.service.ts      # Database service
├── blog/                  # Blog system
├── game/                  # Game system
├── guild-*/              # Guild management modules
├── server-*/             # Server management modules
├── voice-time/           # Voice time tracking
├── stage-channel/        # Stage channel management
├── utils/                # Utility functions
└── repository/           # Data access layer
```

## 🔧 Development

### Running in Development Mode
```bash
npm run start:dev
```

### Building for Production
```bash
npm run build
```

### Running Tests
```bash
npm run test
npm run test:e2e
```

### Code Formatting
```bash
npm run format
npm run lint
```

## 🐳 Docker

### Build Docker Image
```bash
docker build -t discord-bot-me-guild .
```

### Run with Docker
```bash
docker run -p 6001:6001 --env-file .env discord-bot-me-guild
```

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DISCORD_BOT_TOKEN` | Discord bot token | Yes | - |
| `DATABASE_URL` | MongoDB connection string | Yes | - |
| `PORT` | Application port | No | 6001 |
| `NODE_ENV` | Environment mode | No | development |
| `DISCORD_GUILD_ID` | Guild ID for development | No | - |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

หากมีปัญหาหรือคำถาม สามารถติดต่อได้ที่:
- Email: warayut.tae@gmail.com
- Discord: [Your Discord Username]

## 🔄 Changelog

### v1.0.0
- Initial release
- Global commands support
- Guild management system
- Game system
- Voice time tracking
- Blog system


