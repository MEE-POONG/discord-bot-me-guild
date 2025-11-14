# Discord Bot Me Guild – Team Onboarding & Collaboration Guide

## 1. Project Vision & Audience
Discord Bot Me Guild is a NestJS-driven Discord automation platform that centralises guild management, social features, and community tooling for Thai-speaking servers. The bot coordinates slash commands via Necord/Discord.js, persists state in MongoDB through Prisma, and aggregates a broad set of features spanning game coordination, content, onboarding, and analytics. This guide gives new team members enough context to divide feature ownership, extend modules confidently, and cross-collaborate with adjacent projects.

## 2. Core Technology Stack
- **NestJS + TypeScript** for modular server design (`AppModule` wires all feature modules).【F:src/app.module.ts†L1-L117】
- **Necord + discord.js** to receive slash commands and map them to NestJS providers.【F:src/app.module.ts†L45-L85】
- **Prisma Client** configured for MongoDB to abstract database access with type-safe queries.【F:src/prisma.service.ts†L1-L39】【F:prisma/schema.prisma†L1-L38】
- **pnpm / Node.js 18+** for dependency management and runtime (see installation workflow).【F:README.md†L118-L173】

## 3. High-Level Architecture
1. **Command Dispatch** – Necord registers global slash commands using the Discord bot token and guild intents. Incoming interactions are routed to command handlers declared in each feature module.【F:src/app.module.ts†L45-L113】
2. **Service Layer** – Business logic lives in `*.service.ts` files. Services inject shared infrastructure such as `PrismaService` or repository helpers and encapsulate data access patterns (e.g., aggregations, validation).【F:src/voice-time/voice-time.service.ts†L1-L72】
3. **Persistence** – Prisma models represent MongoDB collections. Relations describe how features (games, blogs, donations, etc.) are stored and queried.【F:prisma/schema.prisma†L1-L200】
4. **Presentation** – Command handlers convert service results into Discord-friendly responses (messages, embeds, pagination) and decide on ephemeral vs. public replies. Pagination helpers from `NecordPaginationModule` standardise navigation buttons.【F:src/app.module.ts†L70-L85】

### Cross-Cutting Services
- `PrismaService` centralises the Prisma client lifecycle so every module can inject a single shared instance.【F:src/prisma.service.ts†L1-L39】
- `ServerRepository` provides reusable data access for server-level settings shared by guild management features.【F:src/app.module.ts†L6-L9】
- Utility helpers in `src/utils` (e.g., email validation, guild formatting) support form workflows and server provisioning.【F:src/utils/validEmail.ts†L1-L4】【F:src/utils/server-validation.util.ts†L1-L107】

## 4. Feature Module Map
`AppModule` imports discrete feature packages. Each follows the NestJS triad (`*.module.ts`, `*.service.ts`, optional `*.commands.ts`/`*.controller.ts`). Use this matrix to allocate ownership:

| Domain | Directory | Primary Responsibilities |
| --- | --- | --- |
| **Guild Lifecycle** | `src/guild-create`, `src/guild-manage`, `src/guild-invite`, `src/guild-kick`, `src/transfer` | Provision guilds, manage membership, handle invites/kicks, coordinate resource transfers.【F:src/app.module.ts†L12-L113】 |
| **Role & Server Automation** | `src/server-register`, `src/server-create-role`, `src/server-update-role`, `src/server-clear`, `src/server-clear-role`, `src/server-set-room`, `src/server-try-it-out` | Register new servers, scaffold roles/rooms, update or clear role assignments, manage trial experiences.【F:src/app.module.ts†L85-L113】 |
| **Content & Communication** | `src/blog`, `src/news-update`, `src/welcome`, `src/stage-channel` | Publish announcements, welcome newcomers, manage stage channels, surface multimedia content.【F:src/app.module.ts†L12-L113】 |
| **Gaming Ecosystem** | `src/game`, `src/game-type`, `src/game-rank`, `src/game-create-room`, `src/game-join`, `src/game-condition-match`, `src/form-game`, `src/form-register` | Catalogue supported games, maintain rank ladders, collect form submissions, orchestrate room matchmaking.【F:prisma/schema.prisma†L125-L201】 |
| **Engagement & Analytics** | `src/voice-time`, `src/busking`, `src/donation`, `src/user-data`, `src/prototype` | Track voice activity, handle donation flows, capture user metrics, experiment with new experiences.【F:src/app.module.ts†L12-L111】【F:src/voice-time/voice-time.service.ts†L1-L72】 |

When spinning up new features, mirror existing module layout: create a directory with `dto/` (if needed), implement services for Prisma access, add command or controller bindings, and register the module within `AppModule`.

## 5. Data Model Reference
Prisma schema segments collections by business domain. Key highlights:
- **Activity & Content** – `ActDetailDB`, `ActType`, and `BlogDB` capture events, categories, and long-form posts.【F:prisma/schema.prisma†L16-L69】
- **User Tracking** – `CheckOnlineDB` and `CommentDB` record engagement data for analytics and moderation insights.【F:prisma/schema.prisma†L72-L100】
- **Customer & Server** – `CustomerDB` enforces unique Discord IDs, emails, and servers to prevent duplicates during registration flows.【F:prisma/schema.prisma†L106-L119】
- **Gaming Metadata** – Models like `GameOnlineDB`, `GameConditionMatchDB`, `GameMatchDB`, and `GameTypeDB` define matchmaking parameters and relationships.【F:prisma/schema.prisma†L124-L201】
Use these models to derive DTOs and Prisma queries; maintain the naming convention `<Domain><Entity>DB` for collections to keep alignment with existing tables.

## 6. Local Development Workflow
1. **Install dependencies** with pnpm (preferred) and configure the `.env` file following the template in the README.【F:README.md†L118-L151】
2. **Generate Prisma client** and sync MongoDB schemas before running the bot.【F:README.md†L153-L163】
3. **Start the bot** with `pnpm run start:dev` to leverage Nest’s hot reload; production builds use `pnpm run build` + `pnpm run start:prod`.【F:README.md†L165-L173】
4. **Register slash commands** by ensuring the bot is invited with `applications.commands` scope. Necord handles deployment automatically when the app boots with the configured token and guild ID.【F:README.md†L175-L214】【F:src/app.module.ts†L70-L85】

## 7. Collaboration & Task Breakdown Patterns
- **Feature Squads**: Assign each squad a domain from the Feature Module Map. Teams can work in parallel because NestJS modules are isolated and expose providers explicitly via their module definitions.【F:src/app.module.ts†L12-L115】
- **Shared Contracts**: Define DTOs and repository interfaces in each module’s `dto/` or `repository/` folder so other teams can consume them without leaking implementation details.【F:src/repository/repository.ts†L1-L52】
- **Database Changes**: Coordinate schema updates via Prisma migrations; communicate breaking changes to dependent squads before running `prisma db push`.
- **Command Consistency**: Reuse Necord decorators and pagination helpers to keep interaction patterns uniform (button labels already localised to Thai).【F:src/app.module.ts†L70-L85】
- **Testing & Verification**: Add unit tests under `test/` or module-level specs when extending services, then run `pnpm run test` or targeted command suites before raising PRs.【F:README.md†L48-L58】

## 8. Extending to Other Projects
Because each feature module is self-contained, teams can:
- Extract reusable providers (e.g., `PrismaService`, `ServerRepository`) into shared packages for reuse across sister bots or microservices.【F:src/app.module.ts†L6-L9】
- Port individual modules (like `voice-time`) into another NestJS project by copying the module directory, wiring dependencies in the destination `AppModule`, and pointing Prisma to the same MongoDB schema.【F:src/voice-time/voice-time.module.ts†L1-L11】【F:src/voice-time/voice-time.service.ts†L1-L72】
- Share DTOs and utility functions via a monorepo workspace or npm package to maintain consistent validation and data formatting rules across projects.【F:src/utils/guilds.ts†L1-L10】

## 9. Checklist for New Contributors
- [ ] Configure `.env` with Discord and MongoDB credentials.
- [ ] Run Prisma generate & database sync.
- [ ] Review the module corresponding to your squad and its service/command contracts.
- [ ] Document new slash commands or API endpoints for support teams.
- [ ] Add tests/documentation updates for every feature change.

With this guide, the team can confidently split responsibilities, onboard newcomers quickly, and replicate proven patterns across new Discord automation projects.
