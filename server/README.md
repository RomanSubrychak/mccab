# mccab server

The API for the mccab student ride-share app. The mobile app in `../mccab_mobile` talks to this server over HTTP.

**Stack:** Node.js 24 (see `../.nvmrc`), Express 5, TypeScript, Prisma 7, PostgreSQL 18.

For first-time computer setup (Node, PostgreSQL, creating the `rideshare` database), follow the [main README](../README.md#1-set-up-your-computer-one-time).

## Quick start

Run these inside `server/`:

```bash
npm install                  # installs packages
npx prisma generate          # creates the Prisma client (npm 11+ skips the postinstall script)
cp .env.example .env         # Windows PowerShell: Copy-Item .env.example .env
# edit .env: set DATABASE_URL for your computer and JWT_SECRET (see below)
npx prisma migrate deploy    # creates the tables
npm run dev                  # starts the API with auto-reload
```

Check it works: open <http://localhost:3000/health>. You should see `{"status":"ok"}`.

## Environment variables

Set these in `server/.env`. This file is git-ignored, so never commit it.

| Variable | Example | What it is |
| --- | --- | --- |
| `PORT` | `3000` | Port the API listens on. Defaults to `3000`. |
| `DATABASE_URL` | `postgresql://postgres:<password>@localhost:5432/rideshare` | PostgreSQL connection string. The format depends on your OS; see the [main README](../README.md#server-setup). |
| `JWT_SECRET` | `change-me` | Secret used to sign login tokens. Required: the server won't start without it. |
| `ALLOWED_EMAIL_DOMAIN` | `mccollege.edu` | Only emails at exactly this domain can sign up (subdomains are refused). Login and password reset are not limited. If missing or empty, it defaults to `mccollege.edu`. Set it to `*` to allow any email for local testing; the server then logs a warning. |

### Generating `JWT_SECRET`

Replace the `change-me` placeholder with a long random value. Run this on any OS, from any folder:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into `server/.env`:

```
JWT_SECRET=<the output>
```

Each teammate generates their own for local development, and a deployed server gets its own separate secret. Never share or commit it. If you change it, tokens that were already issued stop working, so users have to log in again.

### Adding a variable

If you add a variable, also add a placeholder to `.env.example` and tell the team.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the server with `tsx watch`, restarting on file changes |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server from `dist/` |
| `npx prisma studio` | Browser UI to view and edit database rows |
| `npx prisma migrate deploy` | Apply committed migrations (run after every pull) |
| `npx prisma migrate dev --name <name>` | Create a new migration after editing the schema |
| `npx prisma generate` | Regenerate the Prisma client |

## Project structure

```
server/
├── prisma/
│   ├── schema.prisma        # database models
│   └── migrations/          # committed SQL migrations (never edit old ones)
├── prisma.config.ts         # Prisma CLI config (schema path, DATABASE_URL)
├── src/
│   ├── index.ts             # Express app: middleware and routes
│   ├── lib/
│   │   ├── auth-token.ts    # create and check login tokens (JWT)
│   │   ├── password-strength.ts  # password rules and strength check (zxcvbn)
│   │   └── prisma.ts        # shared Prisma client, import it from here
│   ├── middleware/
│   │   └── require-auth.ts  # requireAuth: lets only signed-in users through
│   ├── routes/
│   │   ├── auth.ts          # /auth endpoints (sign up, sign in, password reset)
│   │   └── me.ts            # /me endpoints (the signed-in user's profile and account)
│   └── generated/prisma/    # generated client (git-ignored, do not edit)
├── .env.example
├── package.json
└── tsconfig.json
```

## API

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/health` | `{"status":"ok"}` |
| `POST` | `/auth/register` | Body `{name, email, password}`. `201` with `{token, user}`, `400` with `{error}` for invalid input or a weak password (8 characters minimum, zxcvbn score of 3 or higher), `409` with `{error}` if the email is taken. |
| `POST` | `/auth/login` | Body `{email, password}`. `200` with `{token, user}`. `400` with `{error}` when a field is missing. `401` with `{error}` for a wrong email or a wrong password (same message either way). |
| `POST` | `/auth/forgot-password` | Body `{email}`. `400` with `{error}` when the email is invalid. Otherwise `200` with `{ok: true}`, including when no account exists. If the account exists, the server prints a one-time code (valid for 15 minutes) in its terminal. No email is sent. |
| `POST` | `/auth/reset-password` | Body `{token, password}`. `200` with `{ok: true}` after the password is updated. `400` with `{error}` when the code is missing, expired, or already used, or when the new password is too weak. |

All requests and responses use JSON. CORS is enabled so the mobile app can call the API.

### Signed-in routes

These need the login token in an `Authorization: Bearer <token>` header. A missing, expired or revoked token gets `401` with `{error}`. Tokens are revoked when the password is changed or reset, or the account is deleted. Validation errors are `400` with `{error, field}`, where `field` names the input to show the message under.

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/me` | `200` with `{profile}`: every `User` field below except `passwordHash` and `tokenVersion`, plus `vehicle` (or `null`) and `stats` (ratings and ride counts, all zero until rides exist). |
| `PATCH` | `/me` | Body: any profile fields to change (see `PROFILE_FIELDS` in `routes/me.ts`). `200` with `{profile}`. Email and password can't be changed here. Empty text clears an optional field. Phones are US-only and stored as `+1XXXXXXXXXX`. Times are `"HH:MM"` (24-hour). |
| `POST` | `/me/terms` | Records that the student agreed to the Terms and Conditions (keeps the first date). `200` with `{profile}`. |
| `PUT` | `/me/vehicle` | Body `{make, model, year?, color, plate, seats}` (1 to 3 seats). Creates or replaces the user's car. `200` with `{profile}`. |
| `DELETE` | `/me/vehicle` | Removes the car. `200` with `{profile}`. |
| `POST` | `/me/password` | Body `{currentPassword, newPassword}`. `200` with `{token}`. Signs out every other device; use the new token on this one. |
| `DELETE` | `/me` | Body `{password}`. `204`. Deletes the account, its car and its reset codes. |

To protect a new route, add `requireAuth` (see `middleware/require-auth.ts`) and read the user with `currentUserId(res)`.

Ride and booking endpoints are not built yet. When you add a route, add it to these tables.

### Using the database in a route

Import the shared client. Don't create a new `PrismaClient` in each file.

```ts
import { prisma } from "./lib/prisma";

app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
```

## Database

Current models (see `prisma/schema.prisma`):

| Model | Fields |
| --- | --- |
| `User` | `id` (auto-increment), `email` (unique), `name`, `passwordHash` (bcrypt hash, never returned by the API), `tokenVersion` (goes up on every password change or reset, which revokes older login tokens), `createdAt`. Profile: `phone`, `bio`, `major`, `graduationYear`, `rideRole` (`RIDER`/`RIDER_DRIVER`, `null` until the student picks one), `termsAcceptedAt` (when the student agreed to the terms, or `null`), `campus` (`CHICAGO_MAIN`/`CHICAGO_DOWNTOWN`/`NAPERVILLE`/`EVERGREEN_PARK`), `homeArea`, `rideDays`, `arriveBy`, `leaveAt`, `pricePerSeatCents`, `chatPreference`, `musicOk`, `smokingOk`, `emergencyContactName`, `emergencyContactPhone`, `phoneVisibility`, `notifyRideUpdates`, `notifyMessages`, `notifyNews` |
| `Vehicle` | `id`, `userId` (unique: one car per user), `make`, `model`, `year`, `color`, `plate`, `seats` (1 to 3), `createdAt`, `updatedAt`. Deleted when the user is deleted. |
| `PasswordReset` | `id`, `userId`, `tokenHash` (unique SHA-256 of the reset code), `expiresAt`, `usedAt`, `createdAt`. Deleted when the user is deleted. |

To change the schema:

1. Tell the team. Only one schema change at a time.
2. Edit `prisma/schema.prisma`.
3. Run `npx prisma migrate dev --name <short_description>`, then `npx prisma generate` (Prisma 7 doesn't regenerate the client during migrate).
4. Commit `schema.prisma` **and** the new `prisma/migrations/` folder in the same PR.

## Rules

- **Stay on Prisma 7.** Never run `npx prisma@latest` or install `prisma` without `@7`.
- **TypeScript only.** Don't add `.js` source files.
- **Don't commit** `.env`, `node_modules/`, `dist/` or `src/generated/`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Can't reach database server` / `ECONNREFUSED 5432` | PostgreSQL isn't running. On Windows, start "postgresql-x64-18" in the Services app. |
| `database "rideshare" does not exist` | Create it (see the main README). |
| `password authentication failed` | Wrong user or password in `DATABASE_URL`. |
| `Cannot find module '../generated/prisma/client'` | Run `npx prisma generate`. |
| Missing tables or columns after pulling | Run `npx prisma migrate deploy`, then `npx prisma generate`. |
| `Unknown argument` from a Prisma call | The generated client is out of date. Run `npx prisma generate` and restart the server. |
| `Port 3000 is already in use` | Stop the other server, or set `PORT=3001` in `.env` and update `EXPO_PUBLIC_API_URL` in the mobile app. |

More fixes are in the [main README](../README.md#6-troubleshooting).
