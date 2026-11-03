# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Add your entry under `[Unreleased]` in the same PR as the change, in one of these groups: Added, Changed, Deprecated, Removed, Fixed, Security.

## [Unreleased]

### Added

- `CHANGELOG.md` to track project changes.

### Fixed

- Setup docs now say to run `npx prisma generate` after `npm install`, because npm 11+ skips the `postinstall` script that used to do it.

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
