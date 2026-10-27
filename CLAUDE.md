# CLAUDE.md: Student Ride-Share App (school group project)

Handoff notes for Claude Code. Read this first. Items are marked **Decided** (the user confirmed it or already did it), **Recommended** (suggested in chat but not confirmed), or **Open** (undecided).

## 1. Project summary

A group school project: a ride-share mobile app for students of one school. A student with a car offers rides to 2 or 3 other students going to the same campus, for a small payment. The user is on a team and works on this alongside teammates, so everything must be easy for others to clone and run.

- Repo root folder on the user's Mac is named `mccab` (an earlier chat called it `rideshare`, which was only an example name).
- OS: macOS (Apple Silicon, Homebrew in `/opt/homebrew`). Shell: zsh.
- Audience: a class grade plus a demo. Optimize for clarity, reproducibility and finishing on a deadline, not for production scale.

## 2. Repo layout (monorepo, two independent Node projects)

```
mccab/
  mccab_mobile/  React Native + Expo app (its own package.json)
  server/     Express + Prisma API (its own package.json)
  README.md   root README (recommended: team, stack, setup steps)
```

- **Decided:** one GitHub repo (monorepo), not two repos.
- **Decided:** `mccab_mobile/` and `server/` are separate npm projects with separate `node_modules`. No npm workspaces (they tend to cause Expo/React Native dependency trouble).
- **Open:** a `shared/` folder for shared types. Skipped for now; copy small shared types or schemas into both projects if needed.

## 3. Language: TypeScript vs JavaScript

- The group originally said "JS for everything". The user then asked to convert the server to TypeScript, and that is **done in the server setup** (see section 4).
- **Done:** `mccab_mobile/` was scaffolded from the default TypeScript Expo Router template (screens in `src/app/`; demo files moved to the git-ignored `example/`). Do not mix `.js` and `.ts`/`.tsx` files inside one project.
- Trade-off recorded: TS catches mistakes early and Prisma generates types from the schema, but it has a learning curve for teammates new to it. Strict mode can stay on for the server; mobile can be looser if the team struggles.

## 4. Server (`server/`)

**Stack:** Node.js (LTS), Express, TypeScript, Prisma 7, PostgreSQL, `cors`, `dotenv`.

**Current state:**
- `npm init` done; `express cors dotenv` installed. TypeScript, `tsx`, `@types/node`, `@types/express`, `@types/cors` installed; `nodemon` removed.
- Entry point `src/index.ts` with `GET /health` returning `{ "status": "ok" }`, listening on `PORT` (default 3000).
- Scripts: `dev` = `tsx watch src/index.ts`, `build` = `tsc`, `start` = `node dist/index.js` (verified: `tsc` emits `dist/index.js`), `postinstall` = `prisma generate`.
- `tsconfig.json`: target ES2022, `module: commonjs`, `outDir: dist`, `rootDir: src`, `strict`, `esModuleInterop`, `skipLibCheck`, `types: ["node"]`, `include: ["src"]`.
- `package.json` should **not** have `"type": "module"` (commonjs was chosen on purpose to avoid mandatory `.js` extensions on relative imports).
- `server/.gitignore` contains `node_modules/`, `.env`, `dist/`, `/src/generated/prisma`.
- `server/.env.example` exists with placeholder values.
- `server/README.md` exists but is empty.

**Decided (verified 2026-10-26):** the Prisma 7 generated client works with `module: commonjs`. A test query (`prisma.user.count()`) succeeded both under `tsx` and from the `tsc` build run with plain `node`. No ESM switch needed.

## 5. Prisma and database

**Decided: PostgreSQL with Prisma** (not SQLite, not MongoDB). Reasons: the data is relational (users, rides, bookings, ratings); Postgres gives proper transactions and locking (needed so two riders can't book the last seat at the same time), enums, and PostGIS for location queries ("rides near this campus"). SQLite was rejected because the file lives on one machine, free hosts wipe ephemeral disks, concurrency is weak, and Prisma's SQLite has no native enums or arrays.

**Prisma version: pin to 7.x. Do NOT upgrade to Prisma 8.**
- Since August 2026, `npm install prisma` or `npx prisma` with no version pin installs a **Prisma 8 release candidate** (`latest` tag is an RC; Prisma 7 is the stable line, tagged `prev`). Prisma 8 is a different design (different schema file and commands, `prisma init` scaffolds agent "skills" folders, etc.) and its API may still change.
- The user already ran an unpinned `npx prisma init` and got the RC. It created `prisma.config.ts`, a `postinstall: "prisma skills sync || exit 0"` script, and folders `.claude/`, `.cursor/`, `.agents/`, `.devin/` inside `server/`, but **no `prisma/` folder or `schema.prisma`**.
- **Cleanup done (2026-10-26):** RC folders/files removed (`.agents/`, `.claude/`, `.windsurf/`, `skills-lock.json`), `postinstall` now runs `prisma generate`, config is `server/prisma.config.ts`. Original plan was: delete `.claude .cursor .agents .devin prisma.config.ts` in `server/`, remove the `postinstall` line, then install Prisma 7:
  ```bash
  npm install -D prisma@7 @types/pg
  npm install @prisma/client@7 @prisma/adapter-pg pg dotenv
  npx prisma init --output ../src/generated/prisma
  ```
  (`--datasource-provider` is not accepted by the CLI version the user had; omit it and check the datasource says `provider = "postgresql"`.)
- Never run `npx prisma@latest` or an unpinned install. Check `package.json` that `prisma` and `@prisma/client` are both `7.x`. Use `npx prisma --version` (not `-v`).

**Prisma 7 specifics (from the current quickstart):**
- `schema.prisma` generator: `provider = "prisma-client"`, `output = "../src/generated/prisma"` (output is inside `src/` so it sits under `tsconfig` `rootDir`). Datasource block has `provider = "postgresql"` and no `url` (the URL comes from `prisma.config.ts`, which reads `DATABASE_URL` via `dotenv/config`).
- The client needs a driver adapter. `src/lib/prisma.ts`:
  ```ts
  import "dotenv/config";
  import { PrismaPg } from "@prisma/adapter-pg";
  import { PrismaClient } from "../generated/prisma/client";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  export const prisma = new PrismaClient({ adapter });
  ```
- Commands: `npx prisma migrate dev --name init`, `npx prisma generate`, `npx prisma studio`. Teammates run `npx prisma migrate deploy` to apply committed migrations.
- Commit `prisma/` (schema and `migrations/`). Do not commit `src/generated/`; teammates run `npx prisma generate` after `npm install` (consider a safe `postinstall` or documenting it).
- A placeholder `User` model (id, unique email, name) was suggested only to test the setup. It is **not** the real schema.

**Database hosting:**
- The user installed **PostgreSQL 18 via Homebrew** (`/opt/homebrew/opt/postgresql@18/bin`). Plan: `brew services start postgresql@18`, add that `bin` folder to PATH in `~/.zshrc`, `createdb rideshare`, and use `DATABASE_URL="postgresql://<mac-username>@localhost:5432/rideshare"` (no password by default). It is not confirmed whether the user has done these steps yet.
- Trade-off: a local DB is only on one machine. Each teammate rebuilds identical tables from the committed migrations, but data is not shared. For a shared demo database, use a hosted free tier (**Neon** or **Supabase**) and point the deployed server at it. With Neon, use the direct (non-pooled) connection string for migrations. Only one person at a time should create new migrations (`migrate dev`) against a shared database.

**Open: the real schema.** Not designed yet. Proposed starting entities for the group to agree on: `User` (school email, name, role/driver flag, optional rating), `Ride` (driver, campus, departure time, seats total/available, price, status enum such as OPEN/FULL/COMPLETED/CANCELLED), `Booking` (ride, rider, status), and later `Rating`. Booking must be done in a transaction so seats can't be oversold.

## 6. Mobile (`mccab_mobile/`)

- **Decided:** React Native with Expo (scaffolded as `mccab_mobile/`).
- The default template is TypeScript and uses **Expo Router** (file-based routing in `app/`). The `--template blank` option gives plain JS with no navigation (it would need React Navigation). Expo Router is Expo's recommended option and works in plain JS too.
- `npm run reset-project` strips the demo screens into `app-example/`.
- API base URL goes in `mccab_mobile/.env` as `EXPO_PUBLIC_API_URL`. On a real phone use the computer's LAN IP (for example `http://192.168.x.x:3000`), not `localhost`.
- Candidate libraries: `expo-location` (GPS), Google Maps or Mapbox for maps, Expo Push Notifications, Socket.IO client for real-time updates.

## 7. Environment variables and secrets

- **Decided:** two separate `.env` files, `server/.env` and `mccab_mobile/.env`, not one shared root file.
- Reason: anything in the mobile app is public (Expo bundles `EXPO_PUBLIC_*` values into the app). Real secrets (database URL, JWT secret, payment keys) must live only in `server/.env`. A single shared file makes it easy to leak a secret into the mobile bundle.
- Commit `.env.example` files with placeholder values in each folder. Never commit real `.env` files. If a secret is ever pushed, rotate it (it stays in git history).
- `server/.env.example`: `PORT=3000`, `DATABASE_URL=...`, `JWT_SECRET=...`. `mccab_mobile/.env.example`: `EXPO_PUBLIC_API_URL=...`.

## 8. Tooling and Node

- Node is managed with **nvm**. The user removed v25.5.0 (an odd-numbered "Current" release, not LTS) and installed the current LTS as default. Pin it for the team: `node -v > .nvmrc` at the repo root; teammates run `nvm use`.
- Expo, React Native tooling and Prisma are tested against LTS versions.

## 9. GitHub and team workflow

- Personal GitHub accounts are enough; no organization or paid plan needed. One person creates the repo and adds the others under Settings > Collaborators. An optional free GitHub Organization is tidier but not required. Suggest the GitHub Student Developer Pack to teammates.
- Workflow: branch per feature (`feature/login`, `feature/ride-booking`), open pull requests, protect `main` with a PR-required branch rule, use Issues and a Projects board to split tasks (also shows contributions to the instructor).
- Root README should cover: what the app is, team and roles, tech stack, setup steps (`nvm use`, server steps, mobile steps), env variables (point to `.env.example`). A starter was drafted but not yet written to the repo; ask the user for the app name and team members.

## 10. Product scope and trade-offs

**Suggested MVP (recommended, not confirmed by the group):** sign up with school email, driver posts a ride (campus, time, seats, price), riders browse and book a seat, basic ride status. Defer real-time tracking and real payments.

- **Auth:** JWT with bcrypt password hashing, or Supabase Auth to skip building it. Restrict signup to school email addresses (`@school.edu`) and consider email verification.
- **Real-time:** Socket.IO (works with Express and React Native) for seat availability and ride status; optional for MVP.
- **Payments:** Stripe Connect is the proper way to pay drivers but is heavy for a class project. Recommended: mock payments or an "agreed price, settle in cash/Venmo" flow, and list Stripe as future work.
- **Maps and matching:** `expo-location` for GPS; Google Maps or Mapbox on the client; PostGIS (Postgres extension) for "rides near campus" queries if needed.
- **Push notifications:** Expo Push Notifications.
- **Safety and trust (worth showing the instructor):** school-email verification, ratings, emergency contact sharing.
- **Liability and insurance:** personal car insurance may not cover paid rides. Not something to solve in code, but worth mentioning in the presentation.
- **Hosting for a demo:** Render, Railway or Fly.io for the Node server (free or cheap tiers). Persistent disks are not guaranteed on free tiers, which is another reason for hosted Postgres.

## 11. Immediate next steps

Done (2026-10-26): Prisma 7.10.1 installed and RC leftovers removed; Postgres 18 running with `rideshare` DB; `init` migration applied; CommonJS verified; scripts fixed; `.env.example` files filled; `mccab_mobile/` scaffolded (TS); root `.nvmrc` and `.gitignore` written.

1. Root README has setup + workflow; ask the user for app name and team members to add (and fill `server/README.md`, currently empty).
2. Help the group draft the real schema (users, rides, bookings), then the REST endpoints, before work is split up.
3. Make the first commit of `server/`, `mccab_mobile/`, `CLAUDE.md` (check no `.env` is staged).

## 12. Guidance for Claude Code

- Do not upgrade to Prisma 8 or run unpinned `prisma` commands. Verify any Prisma instruction against the installed version, since many tutorials are outdated or describe the RC.
- Never commit `.env` files or secrets. Never put server secrets in `mccab_mobile/`.
- Keep one language setup per project and keep the code simple and readable; teammates of varying experience will maintain it.
- Ask the user before making group-level decisions (language for `mccab_mobile/`, schema, auth approach, payments); prefer the recommendations above unless told otherwise.
- The user is a student with a full-time job, so give exact commands and explain errors plainly rather than assuming deep Node or Prisma knowledge.
