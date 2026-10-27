# mccab: Student Ride-Share

A ride-share mobile app for students of our school. A student with a car offers a ride to 2 or 3 other students going to the same campus, for a small payment.

| Part | Folder | Stack |
| --- | --- | --- |
| Mobile app | `mccab_mobile/` | React Native, Expo, Expo Router, TypeScript |
| API server | `server/` | Node.js, Express, TypeScript, Prisma 7, PostgreSQL |

`mccab_mobile/` and `server/` are two separate npm projects. Each has its own `package.json` and `node_modules`, so you run `npm install` in each folder, not at the root.

## Contents

1. [Set up your computer (one time)](#1-set-up-your-computer-one-time)
2. [Get the code and run the server](#2-get-the-code-and-run-the-server)
3. [Run the mobile app (iOS and Android)](#3-run-the-mobile-app-ios-and-android)
4. [Team workflow](#4-team-workflow)
5. [Rules that keep the project working](#5-rules-that-keep-the-project-working)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Set up your computer (one time)

You need: **Git**, **Node.js 24 (LTS)** installed through a version manager, **PostgreSQL 18**, and a way to run the app (your own phone, an emulator, or both).

The exact Node version is pinned in [`.nvmrc`](.nvmrc). Everyone should use that version.

### macOS

```bash
# 1. Homebrew (skip if `brew -v` already works)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Git
brew install git

# 3. nvm (Node Version Manager), then restart the terminal
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash

# 4. PostgreSQL 18
brew install postgresql@18
brew services start postgresql@18
echo 'export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
createdb rideshare
```

On macOS, Homebrew Postgres creates a database user with your Mac username and no password.

### Windows

Use **PowerShell** (not the old Command Prompt).

1. **Git:** install [Git for Windows](https://git-scm.com/download/win) and keep the default options.
2. **nvm-windows:** install `nvm-setup.exe` from [nvm-windows releases](https://github.com/coreybutler/nvm-windows/releases). If you already installed Node another way, uninstall it first. Open a new PowerShell window afterwards.
3. **PostgreSQL 18:** install it with the [EnterpriseDB installer](https://www.postgresql.org/download/windows/).
   - Remember the password you set for the `postgres` user. You will need it in `server/.env`.
   - Keep port `5432`. You can skip Stack Builder.
4. Create the database. Open **SQL Shell (psql)** from the Start menu, press Enter for the defaults, type your password, then run:
   ```sql
   CREATE DATABASE rideshare;
   ```

> nvm-windows does **not** read `.nvmrc`. Open `.nvmrc`, see the version (for example `v24.22.1`), and type it yourself in step 2 below.

### Linux (Ubuntu / Debian)

```bash
# 1. Git and curl
sudo apt update
sudo apt install -y git curl

# 2. nvm, then restart the terminal
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash

# 3. PostgreSQL 18 from the official PostgreSQL repository
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install -y postgresql-18

# 4. Create a database user with your Linux username, then the database
sudo -u postgres createuser --superuser "$USER"
createdb rideshare
```

On Fedora or other distros, install PostgreSQL 18 with your package manager (see [postgresql.org/download/linux](https://www.postgresql.org/download/linux/)) and follow the same steps.

### Running the app: phone, emulator or simulator

| Option | macOS | Windows | Linux |
| --- | --- | --- | --- |
| Your own phone with **Expo Go** (easiest) | yes | yes | yes |
| **Android emulator** (Android Studio) | yes | yes | yes |
| **iOS simulator** (Xcode) | yes | no | no |

- **Expo Go:** install it from the App Store or Google Play. Your phone and computer must be on the **same Wi-Fi network**.
- **Android emulator:** install [Android Studio](https://developer.android.com/studio). Open **Device Manager**, create a virtual device (for example a recent Pixel), and start it before you run the app.
- **iOS simulator (Mac only):** install **Xcode** from the Mac App Store and open it once to finish the setup. Then go to Xcode > Settings > Components and install an iOS simulator.

Windows and Linux users can't run the iOS simulator. To test on iOS, use an iPhone with Expo Go.

### Code editor

We recommend [VS Code](https://code.visualstudio.com/) with the ESLint and Prisma extensions.

---

## 2. Get the code and run the server

### Clone and pick the Node version

```bash
git clone git@github.com:RomanSubrychak/mccab.git
cd mccab

# macOS / Linux
nvm install      # reads .nvmrc
nvm use

# Windows (PowerShell): type the version from .nvmrc
nvm install 24.22.1
nvm use 24.22.1

node -v          # should print the version in .nvmrc
```

If `git clone git@github.com:...` fails, you have not set up an SSH key. Use `https://github.com/RomanSubrychak/mccab.git` instead, or [add an SSH key to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

### Server setup

```bash
cd server
npm install                # also runs `prisma generate` automatically
```

Create your own `server/.env` from the example:

```bash
cp .env.example .env               # macOS / Linux
Copy-Item .env.example .env        # Windows PowerShell
```

Open `server/.env` and set `DATABASE_URL` for your computer:

| OS | `DATABASE_URL` |
| --- | --- |
| macOS (Homebrew) | `postgresql://<your-mac-username>@localhost:5432/rideshare` |
| Linux | `postgresql://<your-linux-username>@localhost:5432/rideshare`. If that asks for a password, set one with `sudo -u postgres psql -c "ALTER USER <name> PASSWORD '<pw>';"` and use `postgresql://<name>:<pw>@localhost:5432/rideshare` |
| Windows | `postgresql://postgres:<your-postgres-password>@localhost:5432/rideshare` |

Run `whoami` to see your username. If your password has special characters such as `@`, `#` or `/`, they must be URL-encoded (for example `@` becomes `%40`).

Create the tables and start the server:

```bash
npx prisma migrate deploy  # creates tables from the committed migrations
npm run dev                # starts the API with auto-reload
```

Check that it works: open <http://localhost:3000/health> in a browser. You should see `{"status":"ok"}`.

Useful server commands (run inside `server/`):

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the server, restarting on file changes |
| `npm run build` then `npm start` | Compile to `dist/` and run the compiled version |
| `npx prisma studio` | Open a browser UI to look at and edit database rows |
| `npx prisma migrate deploy` | Apply new migrations after you pull |
| `npx prisma generate` | Regenerate the Prisma client (after pulling schema changes) |

---

## 3. Run the mobile app (iOS and Android)

Keep the server running in one terminal, and open a **second terminal** for the app.

```bash
cd mccab_mobile
npm install
cp .env.example .env               # macOS / Linux
Copy-Item .env.example .env        # Windows PowerShell
```

### Point the app at your server

The app needs your computer's address on the Wi-Fi network. `localhost` doesn't work on a real phone, because on the phone `localhost` means the phone itself.

Find your computer's LAN IP:

| OS | Command | Look for |
| --- | --- | --- |
| macOS | `ipconfig getifaddr en0` | e.g. `192.168.1.113` |
| Windows | `ipconfig` | "IPv4 Address" under your Wi-Fi adapter |
| Linux | `hostname -I` | the first address |

Put it in `mccab_mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.113:3000
```

After you change `.env`, restart Expo with a cleared cache: `npx expo start -c`.

Your IP can change when you switch networks (home, school, café). If the app suddenly can't reach the server, check this value first.

### Start the app

```bash
npx expo start
```

A QR code and a menu appear in the terminal:

| Target | How |
| --- | --- |
| **iPhone** (Expo Go) | Scan the QR code with the iPhone **Camera** app |
| **Android phone** (Expo Go) | Scan the QR code from inside the **Expo Go** app |
| **iOS simulator** (Mac only) | Press `i` in the Expo terminal |
| **Android emulator** | Start the emulator in Android Studio first, then press `a` |

Other keys: `r` reloads the app, `j` opens the debugger, `m` opens the dev menu. Saving a file updates the app automatically.

**If your phone can't connect** (school or public Wi-Fi often blocks devices from seeing each other), run `npx expo start --tunnel`. The tunnel only carries the app bundle, so the phone still can't reach your server. For that, the server has to be deployed, or you can use your phone's hotspot for both devices.

---

## 4. Team workflow

### Overview

```
main  ──●──────────●──────────●──────   (always working, protected)
         \        / \        /
          ●──●──●    ●──●──●            feature/xyz branches → Pull Request → review → merge
```

- `main` must always run. Nobody pushes directly to `main`.
- Every task is done on its own branch and merged through a **Pull Request (PR)** that at least one teammate approves.
- Tasks live in **GitHub Issues** and on the **Projects** board (columns: To do, In progress, In review, Done). This also shows the instructor who did what.

### Step by step for each task

1. **Pick a task.** Assign yourself an Issue on the board and move it to "In progress". If there is no Issue, create one.
2. **Update `main` and create a branch:**
   ```bash
   git checkout main
   git pull
   git checkout -b feature/ride-booking
   ```
   Branch names: `feature/<short-name>` for new things, `fix/<short-name>` for bug fixes, `docs/<short-name>` for documentation.
3. **After pulling, sync your setup.** Someone may have added packages or changed the database:
   ```bash
   cd server && npm install && npx prisma migrate deploy
   cd ../mccab_mobile && npm install
   ```
4. **Work and commit often**, in small commits with clear messages:
   ```bash
   git add <files>
   git commit -m "Add booking endpoint with seat check"
   ```
   Before committing, run `git status` and make sure no `.env` file is listed.
5. **Push and open a PR:**
   ```bash
   git push -u origin feature/ride-booking
   ```
   On GitHub, open a Pull Request into `main`. In the description, write what changed and how to test it, and add `Closes #12` (the Issue number) so the Issue closes when it merges.
6. **Review.** A teammate pulls the branch, runs it, and approves or asks for changes. Fix the comments by pushing more commits to the same branch.
7. **Merge** on GitHub (use "Squash and merge" to keep history tidy), then delete the branch.
8. **Keep long branches fresh.** If your branch lives for more than a day or two, bring in the latest `main`:
   ```bash
   git checkout main && git pull
   git checkout feature/ride-booking
   git merge main
   ```
   If Git reports conflicts, open the files, keep the right parts, then `git add` and `git commit`. Ask for help if unsure; don't guess.

### Reviewing a teammate's PR

```bash
git fetch
git checkout feature/their-branch
# then run the server and app as usual
```

Check that it runs, does what the Issue asks, and doesn't commit secrets or generated files.

### Changing the database schema

Database changes are the easiest place to break each other's setup, so follow this exactly:

1. Tell the team in chat that you are changing the schema. **Only one schema change at a time.**
2. Edit `server/prisma/schema.prisma`.
3. Create a migration (inside `server/`):
   ```bash
   npx prisma migrate dev --name add_rides_table
   ```
   This updates your local database, creates a folder in `server/prisma/migrations/`, and regenerates the client.
4. Commit **both** `schema.prisma` and the new migration folder in the same PR.
5. After the PR is merged, everyone else runs `npx prisma migrate deploy` (step 3 of the workflow).

Never edit or delete a migration folder that is already on `main`. If something is wrong, make a new migration that fixes it.

### Repository setup (repo owner, one time)

- **Settings > Collaborators:** invite each teammate by GitHub username.
- **Settings > Branches > Add branch protection rule** for `main`: turn on "Require a pull request before merging" and "Require approvals: 1".
- Create a **Project** board (Projects tab) and link it to the repo.

Teammates: the [GitHub Student Developer Pack](https://education.github.com/pack) is free and worth having.

---

## 5. Rules that keep the project working

- **Never commit `.env` files.** They are git-ignored; keep it that way. If you add a new variable, add a placeholder to the matching `.env.example` and tell the team. If a real secret is ever pushed, tell the team so it can be changed; deleting the commit is not enough.
- **Secrets only go in `server/.env`.** Everything in `mccab_mobile/.env` (`EXPO_PUBLIC_*`) is built into the app and is readable by anyone who has it. Never put database URLs, JWT secrets or API keys there.
- **Prisma stays on version 7.** Never run `npx prisma@latest` or `npm install prisma` without `@7`. The `latest` tag is a Prisma 8 release candidate that works differently and breaks our setup. Check with `npx prisma --version`.
- **Adding packages:**
  - Server: `npm install <package>` inside `server/`.
  - Mobile: use **`npx expo install <package>`** inside `mccab_mobile/`, not `npm install`. It picks the version that matches our Expo SDK.
  - Commit the updated `package.json` **and** `package-lock.json`.
- **Don't commit generated folders:** `node_modules/`, `server/dist/`, `server/src/generated/`, `mccab_mobile/.expo/`. They are already git-ignored.
- **TypeScript only.** Both projects use `.ts` / `.tsx` files. Don't add `.js` source files.
- **Use the Node version in `.nvmrc`.** Run `nvm use` when you open the project.

---

## 6. Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm run dev` fails with `Can't reach database server` / `ECONNREFUSED 5432` | Postgres isn't running. macOS: `brew services start postgresql@18`. Linux: `sudo systemctl start postgresql`. Windows: start "postgresql-x64-18" in the Services app. |
| `database "rideshare" does not exist` | Create it: `createdb rideshare` (macOS/Linux) or `CREATE DATABASE rideshare;` in SQL Shell (Windows). |
| `password authentication failed` | Wrong user or password in `DATABASE_URL`. See the table in section 2. |
| `Cannot find module '../generated/prisma/client'` | Run `npx prisma generate` inside `server/`. |
| Errors about missing tables or columns after pulling | Run `npx prisma migrate deploy` inside `server/`. |
| `Port 3000 is already in use` | Another server is running. Stop it, or set `PORT=3001` in `server/.env` (and update `EXPO_PUBLIC_API_URL`). |
| App loads but API calls fail (`Network request failed`) | Check that `EXPO_PUBLIC_API_URL` uses your current LAN IP (not `localhost`), that the server is running, and that both devices are on the same Wi-Fi. Restart with `npx expo start -c`. On Windows, allow Node.js through the firewall when asked, or in Windows Defender Firewall settings. |
| Android emulator can't reach the server | Use your LAN IP as above, or `http://10.0.2.2:3000` (the emulator's name for your computer). |
| Phone can't load the app / QR code does nothing | Same Wi-Fi? Try `npx expo start --tunnel`. |
| Expo Go says the project's SDK is not supported | Update Expo Go from the App Store or Play Store. |
| `nvm: command not found` | Restart the terminal after installing nvm. On macOS, check that `~/.zshrc` contains the nvm lines. |
| Strange errors after switching branches | Run `npm install` again in the folder that broke. For the app, also try `npx expo start -c`. |

Still stuck? Post in the team chat with the exact error message and what you ran.
