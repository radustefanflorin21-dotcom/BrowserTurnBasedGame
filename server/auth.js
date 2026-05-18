import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail, getUserById } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-in-production";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload && payload.sub;
    if (!userId) return null;
    return getUserById(userId);
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session." });
    return;
  }
  req.user = user;
  next();
}

export async function registerUser(emailRaw, password) {
  const email = normalizeEmail(emailRaw);
  if (!EMAIL_RE.test(email)) {
    const err = new Error("Invalid email address.");
    err.status = 400;
    throw err;
  }
  if (typeof password !== "string" || password.length < 6) {
    const err = new Error("Password must be at least 6 characters.");
    err.status = 400;
    throw err;
  }
  if (findUserByEmail(email)) {
    const err = new Error("An account with this email already exists.");
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = createUser(email, passwordHash);
  const token = signToken(userId);
  return { token, email, userId };
}

export async function loginUser(emailRaw, password) {
  const email = normalizeEmail(emailRaw);
  const row = findUserByEmail(email);
  if (!row) {
    const err = new Error("Invalid email or password.");
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    const err = new Error("Invalid email or password.");
    err.status = 401;
    throw err;
  }
  const token = signToken(row.id);
  return { token, email: row.email, userId: row.id };
}

export function registerAuthRoutes(app) {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const result = await registerUser(email, password);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Registration failed." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const result = await loginUser(email, password);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Login failed." });
    }
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ email: req.user.email, userId: req.user.id });
  });
}
