# HAP Workforce 360

Smart Attendance & Workforce Management System for AKIJ Light Engineering Ltd. - Home Appliance Production (HAP).

## Tech Stack
- Backend: Node.js + Express
- Database: SQLite (node:sqlite) by default; configurable via env. For centralized multi-user deployment, run the server on a shared host and point clients to it.
- Frontend: React + Vite + Tailwind CSS

## Setup

### Server
```
cd hap-workforce-360
npm install
node server/seed.js   # creates admin/admin123 and operator/operator123
npm start             # runs on PORT (default 3001)
```

### Client (dev)
```
cd client
npm install
npm run dev           # http://localhost:5173, proxies /api to 3001
```

### Production build
```
cd client && npm run build
# server will serve client/dist automatically
npm start
```

## Environment Variables
- `PORT` - server port (default 3001)
- `JWT_SECRET` - secret for JWT (change in production)
- `DATA_DIR` - directory for SQLite DB (default ./data)
- `DB_PATH` - full path to SQLite DB file

## Default Users
- admin / admin123 (change password after first login)
- operator / operator123

## Database
SQLite file stored in `data/hap_workforce_360.db`. Back up this file regularly. For high-concurrency or centralized MSSQL/PostgreSQL, replace the DB adapter in server/db.js.

## Cloud Deployment (24/7, works without your PC)

To make the app accessible even when your PC is off, deploy to a cloud host.

### Option A: Render.com (free tier)
1. Create a free account at https://render.com
2. Push this project to a GitHub repository
3. In Render: New → Web Service → connect your repo
4. Build command: `npm install && cd client && npm install && npm run build && cd ..`
5. Start command: `node server/index.js`
6. Add a Disk (paid) mounted at `/app/data` for SQLite persistence, OR migrate to Postgres

### Option B: Railway.app
1. Create account at https://railway.app
2. New Project → Deploy from GitHub
3. Railway auto-detects Node.js; set start command `node server/index.js`

### Database persistence note
The default SQLite file lives in `data/`. On free/ephemeral cloud hosts, the filesystem resets on restart, losing data. For production, either:
- Add a persistent disk (Render paid disk), or
- Migrate to PostgreSQL (change DB adapter in server/db.js)

### Environment variables for cloud
Set `JWT_SECRET` to a strong random string, and `PORT` as provided by the host.

## Modules
Dashboard, Employee Management, Daily Attendance, Attendance History, Overtime Management, Employee Movement, Attendance Reports, Manpower Reports, Absenteeism, Attendance Calendar, Ex-Employees, User Management, Settings.


