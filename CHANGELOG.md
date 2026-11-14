# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Add your entry under `[Unreleased]` in the same PR as the change, in one of these groups: Added, Changed, Deprecated, Removed, Fixed, Security.

## [Unreleased]

### Added

- `CHANGELOG.md` to track project changes.
- `POST /auth/login` endpoint on the server: checks the email and password and returns a 7-day JWT and the user. A wrong email and a wrong password get the same `401` message and take the same time, so it can't be used to find out which emails have accounts. Accounts with an unverified email get a `403` and can't sign in.
- `POST /auth/register` sign-up endpoint on the server: bcrypt password hashing, a 7-day JWT, a zxcvbn password strength check, and an optional `ALLOWED_EMAIL_DOMAIN` restriction. Adds a required `passwordHash` column to `User`, so run `npx prisma migrate deploy` and `npx prisma generate`, and add `ALLOWED_EMAIL_DOMAIN` to `server/.env` after pulling. If your local `User` table has rows, delete them first or the migration fails.
- Email verification on sign up: a 6-digit code is emailed right after registration, expires after 15 minutes and can be re-sent. New endpoints `POST /auth/verify-email` and `POST /auth/resend-verification`, and a verify email screen in the app. In `server/`, run `npm install`, `npx prisma migrate deploy` and `npx prisma generate` after pulling. Accounts that already exist count as unverified.
- Placeholder role selection screen, shown after verifying.

### Changed

- `POST /auth/register` no longer returns a token. It returns `{user, emailSent}`.

### Fixed

- On web, the app no longer logs a React hydration error in dark mode. The page was rendered on the server in the light theme, but the browser's first render used the dark one. It now starts in light and switches to dark right after loading.
- Setup docs now say to run `npx prisma generate` after `npm install`, because npm 11+ skips the `postinstall` script that used to do it.
- Setup docs now explain how to generate `JWT_SECRET`.

## 2026-11-02

### Added

- `server/README.md` with setup, scripts, API and database notes (#1).

## 2026-10-27

### Changed

- Stopped tracking files that are git-ignored.

### Fixed

- Restored the iOS icon symbol under a clean filename.

### Removed

- Duplicate Finder copies from mobile assets.
- Unused example entry from the mobile `.gitignore`.

## 2026-10-26

### Added

- Initial project setup.
- Express + TypeScript API server with a `GET /health` route.
- Prisma 7 with PostgreSQL, a `User` model and the `init` migration.
- Expo Router mobile app with a placeholder home screen.
- Team README covering setup on macOS, Windows and Linux, the team workflow, project rules and troubleshooting.
- `.nvmrc` pinning Node 24.22.1.
