const router = require("express").Router();
const { db } = require("../db");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const VALID_TYPES = ["income", "expense"];

// GET /api/records — all authenticated users
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { type, category, from, to, page = 1, limit = 20 } = req.query;
    const params = [];
    let where = "WHERE r.deleted_at IS NULL";

    if (type) {
      if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: "Type must be income or expense" });
      where += " AND r.type = ?"; params.push(type);
    }
    if (category) { where += " AND r.category LIKE ?"; params.push(`%${category}%`); }
    if (from)     { where += " AND r.date >= ?"; params.push(from); }
    if (to)       { where += " AND r.date <= ?"; params.push(to); }

    const countRow = await db.get(
      `SELECT COUNT(*) as count FROM financial_records r ${where}`, params
    );
    const total = countRow ? countRow.count : 0;

    const limitVal = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const pageVal   = Math.max(parseInt(page) || 1, 1);
    const offset    = (pageVal - 1) * limitVal;
    const records   = await db.all(
      `SELECT r.*, u.name as created_by_name
       FROM financial_records r
       JOIN users u ON r.created_by = u.id
       ${where} ORDER BY r.date DESC LIMIT ? OFFSET ?`,
      [...params, limitVal, offset]
    );

    res.json({ records, pagination: { page: pageVal, limit: limitVal, total } });
  } catch (err) { next(err); }
});

// GET /api/records/:id — all authenticated users
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const record = await db.get(
      `SELECT r.*, u.name as created_by_name
       FROM financial_records r
       JOIN users u ON r.created_by = u.id
       WHERE r.id = ? AND r.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  } catch (err) { next(err); }
});

// POST /api/records — analyst, admin
router.post(
  "/",
  authenticate,
  authorize("analyst", "admin"),
  validate("amount", "type", "category", "date"),
  async (req, res, next) => {
    try {
      const { amount, type, category, date, notes } = req.body;

      if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: "Type must be income or expense" });
      if (isNaN(amount) || parseFloat(amount) <= 0) return res.status(400).json({ error: "Amount must be a positive number" });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });

      const result = await db.run(
        "INSERT INTO financial_records (amount, type, category, date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [parseFloat(amount), type, category.trim(), date, notes || null, req.user.id]
      );

      const record = await db.get("SELECT * FROM financial_records WHERE id = ?", [result.lastID]);
      res.status(201).json({ message: "Record created", record });
    } catch (err) { next(err); }
  }
);

// PUT /api/records/:id — analyst (own), admin (any)
router.put("/:id", authenticate, authorize("analyst", "admin"), async (req, res, next) => {
  try {
    const record = await db.get(
      "SELECT * FROM financial_records WHERE id = ? AND deleted_at IS NULL",
      [req.params.id]
    );
    if (!record) return res.status(404).json({ error: "Record not found" });

    if (req.user.role === "analyst" && record.created_by !== req.user.id) {
      return res.status(403).json({ error: "You can only edit your own records" });
    }

    const { amount, type, category, date, notes } = req.body;

    if (type && !VALID_TYPES.includes(type)) return res.status(400).json({ error: "Type must be income or expense" });
    if (amount !== undefined && (isNaN(amount) || parseFloat(amount) <= 0)) return res.status(400).json({ error: "Amount must be a positive number" });
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });

    await db.run(
      `UPDATE financial_records SET
        amount     = COALESCE(?, amount),
        type       = COALESCE(?, type),
        category   = COALESCE(?, category),
        date       = COALESCE(?, date),
        notes      = COALESCE(?, notes),
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        amount !== undefined ? parseFloat(amount) : null,
        type || null,
        category ? category.trim() : null,
        date || null,
        notes !== undefined ? notes : null,
        req.params.id,
      ]
    );

    const updated = await db.get("SELECT * FROM financial_records WHERE id = ?", [req.params.id]);
    res.json({ message: "Record updated", record: updated });
  } catch (err) { next(err); }
});

// DELETE /api/records/:id — soft delete — analyst (own), admin (any)
router.delete("/:id", authenticate, authorize("analyst", "admin"), async (req, res, next) => {
  try {
    const record = await db.get(
      "SELECT * FROM financial_records WHERE id = ? AND deleted_at IS NULL",
      [req.params.id]
    );
    if (!record) return res.status(404).json({ error: "Record not found" });

    if (req.user.role === "analyst" && record.created_by !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own records" });
    }

    await db.run("UPDATE financial_records SET deleted_at = datetime('now') WHERE id = ?", [req.params.id]);
    res.json({ message: "Record deleted successfully" });
  } catch (err) { next(err); }
});

module.exports = router;
