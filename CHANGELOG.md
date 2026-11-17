# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Add your entry under `[Unreleased]` in the same PR as the change, in one of these groups: Added, Changed, Deprecated, Removed, Fixed, Security.

## [Unreleased]

### Added

- Ride and booking endpoints on the server (no screens yet): post a ride (`POST /rides`), search rides near you on your campus (`GET /rides`), ride details, ask for a seat, accept or decline (drivers), cancel a seat or a whole ride, and `GET /me/rides`. Phone numbers, the car and plate, and the rider's pickup address are only shared once the driver accepts, and only until a day after the ride. Distances are measured from a point a few hundred metres from the driver's home, so it can't be found. A `DRIVER`-only account can't book seats. Two accepts can't take the last seat twice. Removing your car or licence, or switching to Rider, cancels your upcoming rides. See `server/README.md`.
- `Ride` and `Booking` tables for rides and bookings (no endpoints or screens yet). A ride is one trip to or from a campus on one date, with 1 to 3 seats and a price per seat; payment happens outside the app. A booking is one rider's seat request, which the driver accepts or declines. In `server/`, run `npx prisma migrate deploy` and `npx prisma generate` after pulling (migration `add_rides_and_bookings`).
- User profile. In the app: Home, Rides and Profile tabs. The Profile tab shows the student's details, rating and ride counts, with screens to edit About me, My route (one of the four Chicago-area MCC campuses, home area, days and times), Ride preferences (price per seat, conversation, music, smoking), Safety (emergency contact, who sees your phone number), notification settings, light/dark theme, change password, log out and delete account. On the server: `GET`/`PATCH /me`, `POST /me/terms`, `PUT`/`DELETE /me/vehicle`, `POST /me/password` and `DELETE /me`, behind a new `requireAuth` middleware. Adds profile columns (including `rideRole` and `termsAcceptedAt`) to `User` and a `Vehicle` table. This and the two entries below add three migrations (`add_user_profile`, `add_terms_and_role_choice`, `add_driver_licence_and_mode`), so run `npx prisma migrate deploy` and `npx prisma generate` after pulling. Existing accounts keep working; they see the terms and the role choice once.
- Driving section in the profile, for Drivers and Riders & Drivers: My car (make, model, year, colour, plate, 1 to 3 seats), driver's licence and insurance. Licence: issuing state, last 4 characters of the number and expiration date. Insurance: company, last 4 of the policy number (optional) and expiration date. Only the last 4 characters are stored, expired dates are refused, and the app warns when a document has expired or expires within 30 days.
- Three roles: Rider, Driver, or Rider & Driver, switched with one tap at the top of the Profile tab (and offered on the role screen after the terms). A Rider & Driver switches between Riding and Driving on Home. Driving needs a valid licence and a car; the server refuses it otherwise and Home lists what's missing. Adds `activeMode`, the licence and insurance columns, and a `DRIVER` role.
- The app stays signed in: the login token is saved with `expo-secure-store` on phones and in browser storage on web. Signed-out users can only see the login, sign-up and password reset screens. Run `npm install` in `mccab_mobile/` after pulling.
- The light/dark theme choice is saved and survives restarts.
- `POST /auth/forgot-password` and `POST /auth/reset-password`. A reset code is printed in the server terminal (no email is sent), stored as a hash, and expires after 15 minutes. Adds a `PasswordReset` table, so run `npx prisma migrate deploy` and `npx prisma generate` after pulling.
- Sign-up screen with per-field errors, and screens to request a reset code and set a new password.
- `CHANGELOG.md` to track project changes.
- After signing in, the app now shows sample Terms and Conditions the user must agree to, then a page to choose **Rider**, **Driver** or **Rider & Driver**, then the Home tab. These screens are only reachable while signed in. Declining the terms signs the user out. The terms acceptance and the role are saved on the server (`User.termsAcceptedAt` and `User.rideRole`), and the login is saved on the device, so they survive app restarts. The role can be changed later at the top of the Profile tab.
- `POST /auth/login` endpoint on the server: checks the email and password and returns a 7-day JWT and the user. A wrong email and a wrong password get the same `401` message and take the same time, so it can't be used to find out which emails have accounts. Accounts with an unverified email get a `403` and can't sign in.
- `POST /auth/register` sign-up endpoint on the server: bcrypt password hashing, a zxcvbn password strength check, and an optional `ALLOWED_EMAIL_DOMAIN` restriction. It doesn't sign the student in: the account must be verified first (see email verification below). Adds a required `passwordHash` column to `User`, so run `npx prisma migrate deploy` and `npx prisma generate`, and add `ALLOWED_EMAIL_DOMAIN` to `server/.env` after pulling. If your local `User` table has rows, delete them first or the migration fails.
- Email verification on sign up: a 6-digit code is emailed right after registration, expires after 15 minutes and can be re-sent. New endpoints `POST /auth/verify-email` and `POST /auth/resend-verification`, and a verify email screen in the app. In `server/`, run `npm install`, `npx prisma migrate deploy` and `npx prisma generate` after pulling. Accounts that already exist count as unverified.
- After entering the code, the app signs the student in and continues to the Terms and Conditions and the role choice. Signing in to an unverified account opens the verify email screen, where a new code can be requested.
- Signed-in routes (`requireAuth`) refuse unverified accounts with `401`, so anyone still signed in from before email verification existed is signed out and asked to verify.
- Home address search on My route: as the student types, the app suggests real addresses from the Chicago area (anywhere in the US if nothing matches there) and the student picks one. The full address and its coordinates are private; other students will only see the neighbourhood or city (`homeArea`, e.g. "Pilsen, Chicago"). Uses [Geoapify](https://www.geoapify.com) (OpenStreetMap data) through the server, so the key never ships in the app. New endpoint `GET /places/autocomplete`, and `PATCH /me` takes `homePlace`. In `server/`, add `GEOAPIFY_API_KEY` to `.env` (free key, see `server/README.md`), then run `npx prisma migrate deploy` and `npx prisma generate`: the `add_home_address` migration adds `homeAddress`, `homeLat` and `homeLng` to `User`.

### Changed

- `homeArea` is no longer typed by the student. It's set from the chosen home address, and `PATCH /me` refuses it on its own. Areas typed before stay until the student picks an address. The profile checklist now asks for a home address.
- `POST /auth/register` no longer returns a token. It returns `{user, emailSent}`.
- Sign-up only accepts `@mccollege.edu` email addresses (exact domain, no subdomains). The app shows "Use your school email address." under the email field, and the server refuses other domains with the same message. The message doesn't name the allowed domain. `ALLOWED_EMAIL_DOMAIN` now defaults to `mccollege.edu` when missing or empty; set it to `*` to allow any email for local testing. Login and password reset are not limited.

### Security

- Changing or resetting a password now signs out every other device. Login tokens carry a version number that goes up on each change, and older tokens are refused.

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
