# Arc Systems IT Audit Tool

A local, self-hosted app for capturing on-site IT audits during MSP client onboarding: customers, sites, internet
connections, infrastructure, comms rooms, software, and third-party vendor support, with photo capture. Runs
entirely on `localhost` — Node.js + Express + React (Vite) + PostgreSQL, no Docker.

## Prerequisites

- **Node.js** 18 or later ([nodejs.org](https://nodejs.org)) — includes `npm`.
- **PostgreSQL** 14 or later, installed locally and running ([postgresql.org/download](https://www.postgresql.org/download/)).
  Free, no license required.

## One-time setup

1. **Create a database.** Using `psql` or pgAdmin:
   ```sql
   CREATE DATABASE it_audit;
   ```

2. **Install dependencies** (from the repo root — this uses npm workspaces, so one command covers both
   `client/` and `server/`):
   ```
   npm install
   ```

3. **Configure the server.** Copy `server/.env.example` to `server/.env` and adjust if needed:
   ```
   PORT=4000
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/it_audit
   UPLOADS_DIR=./uploads
   ```
   Update the username/password/port in `DATABASE_URL` to match your local PostgreSQL install.

   > **Port 5432 already in use?** Docker Desktop and WSL sometimes reserve port 5432 for their own networking
   > even with no containers running. If PostgreSQL won't start on 5432, install/run it on another port (e.g.
   > 5433) and update `DATABASE_URL` to match — this doesn't affect anything else on the machine.

   > **No admin rights / can't install PostgreSQL or Node.js normally?** Both ship as portable, no-install ZIP
   > distributions that run fine from a regular user folder: Node.js from the "Windows Binary (.zip)" link on
   > [nodejs.org/download](https://nodejs.org/en/download), and PostgreSQL from the "binaries" ZIP at
   > [enterprisedb.com/download-postgresql-binaries](https://www.enterprisedb.com/download-postgresql-binaries).
   > Extract PostgreSQL, then create and start a local cluster with:
   > ```
   > bin\initdb -D <data-folder> -U postgres --pwfile=<file containing a password>
   > bin\pg_ctl -D <data-folder> -l logfile -o "-p 5433" start
   > ```

4. **Run the database migration** (creates all tables and the concerns view):
   ```
   npm run db:migrate
   ```

> This machine already has a working portable setup at `%USERPROFILE%\tools\node` and `%USERPROFILE%\tools\pgsql`
> (data in `%USERPROFILE%\tools\pgsql-data`, running on port 5433). Use `start-local.ps1` / `stop-local.ps1` in
> this folder to start/stop that exact instance instead of repeating the steps above.

## Running the app

**Day-to-day use** (single process, single port):
```
npm run build
npm start
```
Then open **http://localhost:4000** in a browser.

**Active development** (hot-reload client + server):
```
npm run dev
```
This starts the API on port 4000 and the Vite dev server on port 5173 (proxying `/api` and `/uploads` to the
API). Open **http://localhost:5173**.

## Using the app

1. Create a **customer**, then add its **site(s)** on the customer detail page.
2. Start a **new audit** against that customer, selecting which site(s) this visit covers, and record the
   Autotask ticket number for correlation.
3. Work through the audit's tabs — Internet Connections, Infrastructure, Comms Rooms, Software, Vendor Support,
   Photos — saving each section as you go. Each section saves independently so nothing is lost if the laptop
   sleeps mid-visit.
   - For **servers**, record whether it's Physical, a Hypervisor, or a Virtual Machine. Hypervisors get a
     type field (VMware/Hyper-V/Other); virtual machines get a dropdown to pick which hypervisor they run on.
     **Capture and save physical hosts/hypervisors before their VMs**, since a VM can only reference a
     hypervisor that's already been saved (at the same site). Servers can also be tagged with one or more
     roles (Domain Controller, File Server, Print Server, Application Server, Backup Server, NPS Server).
4. Open the audit's **Review** tab to see automatically detected concerns (end-of-life equipment,
   faulted/poor condition, expired warranties/licenses/contracts) plus any manually flagged concerns.

Every audit is saved to Postgres and stays searchable/filterable from the Audits list (by customer, ticket
number, status, and date range) for future reference.

## Data safety note

All data lives in your local PostgreSQL instance and the `server/uploads/` folder. Since this is a
single-laptop tool, periodically back up with `pg_dump` — there's no server-side redundancy.
