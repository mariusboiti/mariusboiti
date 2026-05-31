const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../database");
const { requireAuth } = require("../middleware/auth");
const { sanitizeText, validateEmail } = require("../utils/security");

const router = express.Router();

function signToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name
    },
    process.env.JWT_SECRET || "change-this-secret",
    { expiresIn: "12h" }
  );
}

router.post("/login", async (req, res) => {
  const email = sanitizeText(req.body.email || "", 200).toLowerCase();
  const password = String(req.body.password || "");

  if (!validateEmail(email) || !password) {
    return res.status(400).json({ error: "Email/parolă invalidă." });
  }

  const db = await getDb();
  const admin = await db.get("SELECT * FROM admins WHERE email = ?", [email]);

  if (!admin) {
    return res.status(401).json({ error: "Credențiale invalide." });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Credențiale invalide." });
  }

  const token = signToken(admin);

  res.cookie("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 12 * 60 * 60 * 1000
  });

  return res.json({
    ok: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name
    }
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("admin_token");
  return res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const db = await getDb();
  const admin = await db.get("SELECT id, name, email, created_at, updated_at FROM admins WHERE id = ?", [req.admin.id]);
  if (!admin) {
    return res.status(404).json({ error: "Admin not found" });
  }
  return res.json({ admin });
});

module.exports = router;
