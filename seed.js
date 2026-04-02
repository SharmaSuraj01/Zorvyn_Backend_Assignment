const bcrypt = require("bcryptjs");
const { db, init } = require("./src/db");

const seed = async () => {
  await init;

  // don't re-seed if data already exists
  const existing = await db.get("SELECT id FROM users LIMIT 1");
  if (existing) return;

  console.log("🌱 Seeding demo data...");

  const users = [
    { name: "Admin User",   email: "admin@finance.com",   password: "admin123",   role: "admin"   },
    { name: "Analyst User", email: "analyst@finance.com", password: "analyst123", role: "analyst" },
    { name: "Viewer User",  email: "viewer@finance.com",  password: "viewer123",  role: "viewer"  },
  ];

  const ids = [];
  for (const u of users) {
    const r = await db.run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [u.name, u.email, bcrypt.hashSync(u.password, 10), u.role]
    );
    ids.push(r.lastID);
  }

  const records = [
    { amount: 85000, type: "income",  category: "Salary",    date: "2026-03-01", notes: "March salary",        created_by: ids[0] },
    { amount: 25000, type: "expense", category: "Rent",      date: "2026-03-04", notes: null,                  created_by: ids[0] },
    { amount: 14500, type: "income",  category: "Freelance", date: "2026-03-18", notes: "Client project done", created_by: ids[1] },
    { amount: 3200,  type: "expense", category: "Groceries", date: "2026-03-22", notes: null,                  created_by: ids[1] },
    { amount: 85000, type: "income",  category: "Salary",    date: "2026-04-01", notes: "April salary",        created_by: ids[0] },
    { amount: 1600,  type: "expense", category: "Utilities", date: "2026-04-07", notes: "Light + wifi bill",   created_by: ids[0] },
  ];

  for (const r of records) {
    await db.run(
      "INSERT INTO financial_records (amount, type, category, date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [r.amount, r.type, r.category, r.date, r.notes, r.created_by]
    );
  }

  console.log("✅ Demo data ready — 3 users, 6 records");
};

module.exports = seed;
