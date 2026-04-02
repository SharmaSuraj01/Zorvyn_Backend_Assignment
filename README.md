# FinanceOS

A backend system for managing financial records with role-based access control, built as part of a backend engineering assignment.

The idea was simple — build something that actually works like a real finance dashboard would, not just a bunch of CRUD endpoints thrown together. So I added proper auth, role-based permissions, analytics APIs, and a lightweight UI so you can see it running without needing Postman.

---

## Getting Started

```bash
npm install
node server.js
```

That's it. The server auto-seeds demo data on first run.

Then open: **http://localhost:3000/login**

---

## Demo Accounts

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@finance.com      | admin123    |
| Analyst | analyst@finance.com    | analyst123  |
| Viewer  | viewer@finance.com     | viewer123   |

Each role has different permissions — worth logging in with all three to see the difference.

---

## What's Inside

```
├── src/
│   ├── middleware/
│   │   ├── auth.js        # JWT verification + role guard
│   │   └── validate.js    # Request body validation
│   ├── routes/
│   │   ├── auth.js        # Register + Login
│   │   ├── users.js       # User management (admin only)
│   │   ├── records.js     # Financial records CRUD
│   │   └── dashboard.js   # Analytics + summary APIs
│   ├── app.js             # Express setup
│   └── db.js              # SQLite + schema
├── views/                 # EJS templates (login, register, dashboard)
├── public/                # CSS + frontend JS
├── seed.js                # Auto-runs on first startup
└── server.js              # Entry point
```

---

## Tech Stack

- **Node.js + Express** — straightforward, no unnecessary complexity
- **SQLite** — zero config, file-based, perfect for a self-contained project. Schema is written the same way I'd write it for PostgreSQL
- **JWT** — stateless auth, no session store needed
- **EJS + Vanilla JS** — single server serves everything, no separate frontend build step needed

---

## Role Permissions

| Action                  | Viewer | Analyst | Admin |
|-------------------------|--------|---------|-------|
| View dashboard          | Yes    | Yes     | Yes    |
| View records            | Yes    | Yes     | Yes    |
| Create records          | NO     | Yes     | Yes    |
| Edit own records        | NO     | Yes     | Yes    |
| Edit any record         | NO     | NO      | Yes    |
| Delete own records      | NO     | Yes     | Yes    |
| Delete any record       | NO     | NO      | Yes    |
| Manage users            | No     | NO      | Yes    |

---

## API Reference

### Auth
```
POST /api/auth/register   { name, email, password, role? }
POST /api/auth/login      { email, password }
```

### Records
```
GET    /api/records              ?type, category, from, to, page, limit
GET    /api/records/:id
POST   /api/records              { amount, type, category, date, notes? }
PUT    /api/records/:id
DELETE /api/records/:id
```

### Dashboard
```
GET /api/dashboard/summary
GET /api/dashboard/by-category
GET /api/dashboard/monthly-trends
GET /api/dashboard/weekly-trends
GET /api/dashboard/recent
```

### Users (Admin only)
```
GET    /api/users
GET    /api/users/me
GET    /api/users/:id
PATCH  /api/users/:id     { name?, role?, status? }
DELETE /api/users/:id
```

All protected routes need: `Authorization: Bearer <token>`

---

## A Few Decisions Worth Mentioning

**Soft delete on records**
Financial data shouldn't just disappear. Setting `deleted_at` instead of actually deleting keeps the audit trail intact — which matters in any real finance system.

**Analyst ownership rule**
Analysts can only edit or delete records they created themselves. This felt like the right business rule — you shouldn't be able to modify someone else's entries without admin-level trust.

**Single server for UI + API**
I could've built a separate React frontend, but that would mean two servers, two `npm install` commands, and CORS config to worry about. Keeping everything in one Express server felt cleaner for this context.

**Rate limiting on auth**
Login and register are capped at 20 requests per 15 minutes. Small thing, but it shows awareness of basic security — brute force on login endpoints is a real concern.

**JWT in localStorage**
Fine for a demo. In production I'd use HttpOnly cookies to avoid XSS exposure.

---

## Environment Variables

```env
PORT=3000
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
```

Copy `.env.example` to `.env` and update the values.
