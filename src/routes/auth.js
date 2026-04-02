const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../db");
const validate = require("../middleware/validate");

// POST /api/auth/register
router.post("/register", validate("name", "email", "password"), async (req, res, next) => {
  try {
    const { name, email, password, role = "viewer" } = req.body;

    const validRoles = ["viewer", "analyst", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(", ")}` });
    }

    const existing = await db.get("SELECT id FROM users WHERE email = ?", [email.toLowerCase().trim()]);
    if (existing) return res.status(409).json({ error: "Email is already registered" });

    const hashed = bcrypt.hashSync(password, 10);
    const result = await db.run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email.toLowerCase().trim(), hashed, role]
    );

    res.status(201).json({ message: "User registered successfully", userId: result.lastID });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post("/login", validate("email", "password"), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await db.get("SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (user.status === "inactive") {
      return res.status(403).json({ error: "Your account has been deactivated" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

module.exports = router;
