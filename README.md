# FinanceOS — Finance Data Processing & Access Control Backend

A full-stack finance dashboard with role-based access control, built with Node.js, Express, SQLite, and a server-rendered UI.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Seed demo data (creates 3 users + 42 sample records)
node seed.js

# 3. Start the server
node server.js

# 4. Open in browser
http://localhost:3000/login
```

### Demo Credentials

| Role    | Email                  | Password    | Access                          |
|---------|------------------------|-------------|---------------------------------|
| Admin   | admin@finance.com      | admin123    | Full access — users + records   |
| Analyst | analyst@finance.com    | analyst123  | Create/edit own records         |
| Viewer  | viewer@finance.com     | viewer123   | Read-only dashboard             |

---

## Tech Stack

| Layer      | Choice         | Why                                                        |
|------------|----------------|------------------------------------------------------------|
| Runtime    | Node.js        | Fast, non-blocking I/O — ideal for API servers             |
| Framework  | Express.js     | Minimal, flexible, widely understood                       |
| Database   | SQLite         | Zero-config, file-based, perfect for self-contained demos  |
| Auth       | JWT            | Stateless, no session store needed                         |
| UI         | EJS + Vanilla JS | Single server, no build step, evaluator runs one command |
| Charts     | Chart.js CDN   | Lightweight, no npm install needed                         |

---

## Project Structure

```
├── src/
│   ├── middleware/
│   │   ├── auth.js        # JWT verification + role guard
│   │   └── validate.js    # Required field validation
│   ├── routes/
│   │   ├── auth.js        # POST /register, POST /login
│   │   ├── users.js       # User CRUD (admin only)
│   │   ├── records.js     # Financial records CRUD
│   │   └── dashboard.js   # Analytics & summary APIs
│   ├── app.js             # Express app setup
│   └── db.js              # SQLite connection + schema
├── views/
│   ├── login.ejs          # Login page
│   ├── register.ejs       # Register page
│   └── app.ejs            # Main app shell (SPA-style)
├── public/
│   ├── css/app.css        # Dark premium theme
│   └── js/app.js          # Frontend logic (routing, API calls, charts)
├── server.js              # Entry point
├── seed.js                # Demo data seeder
└── .env                   # Environment config
```

---

## Role Permissions

| Action                    | Viewer | Analyst | Admin |
|---------------------------|--------|---------|-------|
| View dashboard            | ✅     | ✅      | ✅    |
| View records              | ✅     | ✅      | ✅    |
| Create records            | ❌     | ✅      | ✅    |
| Edit own records          | ❌     | ✅      | ✅    |
| Edit any record           | ❌     | ❌      | ✅    |
| Delete own records        | ❌     | ✅      | ✅    |
| Delete any record         | ❌     | ❌      | ✅    |
| View all users            | ❌     | ❌      | ✅    |
| Change user roles/status  | ❌     | ❌      | ✅    |
| Delete users              | ❌     | ❌      | ✅    |

---

## API Reference

### Auth
```
POST /api/auth/register   Body: { name, email, password, role? }
POST /api/auth/login      Body: { email, password }
```

### Records
```
GET    /api/records              Query: type, category, from, to, page, limit
GET    /api/records/:id
POST   /api/records              Body: { amount, type, category, date, notes? }
PUT    /api/records/:id          Body: any subset of above
DELETE /api/records/:id          Soft delete
```

### Dashboard
```
GET /api/dashboard/summary         Query: from?, to?
GET /api/dashboard/by-category     Query: type?, from?, to?
GET /api/dashboard/monthly-trends  Query: year?
GET /api/dashboard/weekly-trends
GET /api/dashboard/recent          Query: limit?
```

### Users (Admin only)
```
GET    /api/users           Query: role?, status?, page, limit
GET    /api/users/me
GET    /api/users/:id
PATCH  /api/users/:id       Body: { name?, role?, status? }
DELETE /api/users/:id
```

All protected routes require: `Authorization: Bearer <token>`

---

## Design Decisions & Assumptions

**SQLite over PostgreSQL/MongoDB**
Chosen for zero-config setup. The evaluator runs `node seed.js && node server.js` — no database server to install or configure. The schema and query patterns are identical to what would be used in PostgreSQL.

**Server-rendered UI over React/MERN**
A single `node server.js` command starts everything. No separate frontend server, no `npm install` in two directories, no CORS configuration for the evaluator to worry about. The UI is a lightweight SPA-style app using vanilla JS with Chart.js for visualizations.

**Soft delete on records**
Records are never permanently deleted — `deleted_at` timestamp is set instead. This preserves data integrity and audit history, which is critical in financial systems.

**JWT stored in localStorage**
Acceptable for a demo/assessment context. In production, HttpOnly cookies would be preferred to prevent XSS token theft.

**Rate limiting on auth endpoints**
Login and register are limited to 20 requests per 15 minutes per IP. This prevents brute-force attacks — a basic but important security measure.

**Analyst can only edit/delete their own records**
This is a deliberate business rule. Analysts are trusted to manage their own entries but should not be able to modify records created by others without admin oversight.

---

## Environment Variables

```env
PORT=3000
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```
