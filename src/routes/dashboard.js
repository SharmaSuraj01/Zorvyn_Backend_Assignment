const router = require("express").Router();
const { db } = require("../db");
const { authenticate } = require("../middleware/auth");

// GET /api/dashboard/summary
router.get("/summary", authenticate, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const params = [];
    let where = "WHERE deleted_at IS NULL";
    if (from) { where += " AND date >= ?"; params.push(from); }
    if (to)   { where += " AND date <= ?"; params.push(to); }

    const row = await db.get(
      `SELECT
        COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS total_expenses,
        COUNT(*) AS total_records
       FROM financial_records ${where}`,
      params
    );

    res.json({
      total_income:    parseFloat(row.total_income.toFixed(2)),
      total_expenses:  parseFloat(row.total_expenses.toFixed(2)),
      net_balance:     parseFloat((row.total_income - row.total_expenses).toFixed(2)),
      total_records:   row.total_records,
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/by-category
router.get("/by-category", authenticate, async (req, res, next) => {
  try {
    const { type, from, to } = req.query;
    const params = [];
    let where = "WHERE deleted_at IS NULL";
    if (type) { where += " AND type = ?"; params.push(type); }
    if (from) { where += " AND date >= ?"; params.push(from); }
    if (to)   { where += " AND date <= ?"; params.push(to); }

    const rows = await db.all(
      `SELECT category, type, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count
       FROM financial_records ${where}
       GROUP BY category, type
       ORDER BY total DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/dashboard/monthly-trends
router.get("/monthly-trends", authenticate, async (req, res, next) => {
  try {
    const { year } = req.query;
    const params = [];
    let where = "WHERE deleted_at IS NULL";
    if (year) { where += " AND strftime('%Y', date) = ?"; params.push(String(year)); }

    const rows = await db.all(
      `SELECT
        strftime('%Y-%m', date) AS month,
        ROUND(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 2) AS income,
        ROUND(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 2) AS expenses,
        ROUND(SUM(CASE WHEN type='income'  THEN amount ELSE -amount END), 2) AS net
       FROM financial_records ${where}
       GROUP BY month ORDER BY month ASC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/dashboard/recent
router.get("/recent", authenticate, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const rows = await db.all(
      `SELECT r.id, r.amount, r.type, r.category, r.date, r.notes, u.name AS created_by_name
       FROM financial_records r
       JOIN users u ON r.created_by = u.id
       WHERE r.deleted_at IS NULL
       ORDER BY r.created_at DESC LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/dashboard/weekly-trends
router.get("/weekly-trends", authenticate, async (req, res, next) => {
  try {
    const rows = await db.all(
      `SELECT
        strftime('%Y-W%W', date) AS week,
        ROUND(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 2) AS income,
        ROUND(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 2) AS expenses
       FROM financial_records
       WHERE deleted_at IS NULL
       GROUP BY week ORDER BY week DESC LIMIT 12`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
