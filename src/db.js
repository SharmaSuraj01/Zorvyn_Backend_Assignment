const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../finance.db");
const raw = new sqlite3.Database(dbPath);

// sqlite3 is callback-based by default, so wrapping in promises
// to keep the route handlers clean with async/await
const db = {
  run: (sql, params = []) =>
    new Promise((resolve, reject) =>
      raw.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      })
    ),
  get: (sql, params = []) =>
    new Promise((resolve, reject) =>
      raw.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
    ),
  all: (sql, params = []) =>
    new Promise((resolve, reject) =>
      raw.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
    ),
  exec: (sql) =>
    new Promise((resolve, reject) =>
      raw.exec(sql, (err) => (err ? reject(err) : resolve()))
    ),
};

const init = db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer','analyst','admin')),
    status     TEXT    NOT NULL DEFAULT 'active'  CHECK(status IN ('active','inactive')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS financial_records (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      REAL    NOT NULL CHECK(amount > 0),
    type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
    category    TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    notes       TEXT,
    created_by  INTEGER NOT NULL REFERENCES users(id),
    deleted_at  TEXT    DEFAULT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = { db, init };
