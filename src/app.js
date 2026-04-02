require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { init } = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again after 15 minutes" },
});

// API Routes
app.use("/api/auth",      authLimiter, require("./routes/auth"));
app.use("/api/users",     require("./routes/users"));
app.use("/api/records",   require("./routes/records"));
app.use("/api/dashboard", require("./routes/dashboard"));

// Health check
app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// UI Routes — serve the SPA shell for all non-API routes
app.get("/login",     (_, res) => res.render("login"));
app.get("/register",  (_, res) => res.render("register"));
app.get("/",          (_, res) => res.render("app"));
app.get("/dashboard", (_, res) => res.render("app"));
app.get("/records",   (_, res) => res.render("app"));
app.get("/users",     (_, res) => res.render("app"));

// 404 for unknown API routes
app.use("/api", (req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// Fallback to app shell
app.use((_, res) => res.render("app"));

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  if (req.path.startsWith("/api")) {
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
  res.status(500).render("login", { error: "Something went wrong" });
});

module.exports = { app, init };
