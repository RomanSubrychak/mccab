# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Add your entry under `[Unreleased]` in the same PR as the change, in one of these groups: Added, Changed, Deprecated, Removed, Fixed, Security.

## [Unreleased]

### Added

- `POST /auth/forgot-password` and `POST /auth/reset-password`. A reset code is printed in the server terminal (no email is sent), stored as a hash, and expires after 15 minutes. Adds a `PasswordReset` table, so run `npx prisma migrate deploy` and `npx prisma generate` after pulling.
- Sign-up screen with per-field errors, and screens to request a reset code and set a new password.
- `CHANGELOG.md` to track project changes.
- After signing in, the app now shows sample Terms and Conditions the user must agree to, then a page to choose **Rider** or **Rider & Driver**, then a placeholder home screen. These screens are only reachable while signed in. Declining the terms signs the user out. For now the session, terms acceptance, and role are kept in memory only, so they reset when the app restarts.
- `POST /auth/login` endpoint on the server: checks the email and password and returns a 7-day JWT and the user, in the same format as `/auth/register`. A wrong email and a wrong password get the same `401` message and take the same time, so it can't be used to find out which emails have accounts.
- `POST /auth/register` sign-up endpoint on the server: bcrypt password hashing, a 7-day JWT, a zxcvbn password strength check, and an optional `ALLOWED_EMAIL_DOMAIN` restriction. Adds a required `passwordHash` column to `User`, so run `npx prisma migrate deploy` and `npx prisma generate`, and add `ALLOWED_EMAIL_DOMAIN` to `server/.env` after pulling. If your local `User` table has rows, delete them first or the migration fails.

### Changed

- Sign-up only accepts `@mccollege.edu` email addresses (exact domain, no subdomains). The app shows "Use your school email address (@mccollege.edu)." under the email field, and the server refuses other domains with the same message. `ALLOWED_EMAIL_DOMAIN` now defaults to `mccollege.edu` when missing or empty; set it to `*` to allow any email for local testing. Login and password reset are not limited.

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
