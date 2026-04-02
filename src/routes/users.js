const router = require("express").Router();
const { db } = require("../db");
const { authenticate, authorize } = require("../middleware/auth");

const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, created_at: u.created_at });

// GET /api/users — admin only
router.get("/", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const params = [];
    let where = "WHERE 1=1";

    if (role)   { where += " AND role = ?";   params.push(role); }
    if (status) { where += " AND status = ?"; params.push(status); }

    const limitVal = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const pageVal   = Math.max(parseInt(page) || 1, 1);
    const total     = (await db.get(`SELECT COUNT(*) as count FROM users ${where}`, params)).count;
    const offset    = (pageVal - 1) * limitVal;

    const users = (await db.all(
      `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitVal, offset]
    )).map(safeUser);

    res.json({ users, pagination: { page: pageVal, limit: limitVal, total } });
  } catch (err) { next(err); }
});

// GET /api/users/me — any authenticated user
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(safeUser(user));
  } catch (err) { next(err); }
});

// GET /api/users/:id — admin only
router.get("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(safeUser(user));
  } catch (err) { next(err); }
});

// PATCH /api/users/:id — admin only
router.patch("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const { role, status, name } = req.body;
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (parseInt(req.params.id) === req.user.id && role && role !== "admin") {
      return res.status(400).json({ error: "You cannot change your own role" });
    }

    const validRoles = ["viewer", "analyst", "admin"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(", ")}` });
    }
    const validStatuses = ["active", "inactive"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    await db.run(
      `UPDATE users SET
        role   = COALESCE(?, role),
        status = COALESCE(?, status),
        name   = COALESCE(?, name)
       WHERE id = ?`,
      [role || null, status || null, name || null, req.params.id]
    );

    const updated = await db.get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User updated", user: safeUser(updated) });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — admin only
router.delete("/:id", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    const user = await db.get("SELECT id FROM users WHERE id = ?", [req.params.id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    await db.run("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) { next(err); }
});

module.exports = router;
