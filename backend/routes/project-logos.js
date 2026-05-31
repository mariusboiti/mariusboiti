const express = require("express");
const { getDb, nowIso } = require("../database");
const { sanitizeNullable, sanitizeText, toBoolInt, toInt } = require("../utils/security");

const publicRouter = express.Router();
const adminRouter = express.Router();

function isValidProjectUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(String(url).trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function mapLogo(row) {
  if (!row) return row;
  return {
    ...row,
    is_active: Boolean(row.is_active),
    invert_on_dark: Boolean(row.invert_on_dark),
    display_scale: Number(row.display_scale || 100),
    background_mode: String(row.background_mode || "soft")
  };
}

function buildPayload(body = {}) {
  const name = sanitizeText(body.name, 255);
  const logo_url = sanitizeText(body.logo_url, 500);
  const alt_text = sanitizeNullable(body.alt_text, 255);
  const project_url = sanitizeNullable(body.project_url, 500);
  const sort_order = toInt(body.sort_order, 0);
  const is_active = toBoolInt(body.is_active);
  const display_scale = Math.min(180, Math.max(60, toInt(body.display_scale, 100)));
  const rawMode = sanitizeText(body.background_mode, 24) || "soft";
  const background_mode = ["soft", "light", "dark", "none"].includes(rawMode) ? rawMode : "soft";
  const invert_on_dark = toBoolInt(body.invert_on_dark);

  return { name, logo_url, alt_text, project_url, sort_order, is_active, display_scale, background_mode, invert_on_dark };
}

publicRouter.get("/project-logos", async (_req, res) => {
  const db = await getDb();
  const rows = await db.all(
    "SELECT id, name, logo_url, alt_text, project_url, sort_order, is_active, display_scale, background_mode, invert_on_dark FROM project_logos WHERE is_active = 1 ORDER BY sort_order ASC, id DESC"
  );
  return res.json(rows.map(mapLogo));
});

adminRouter.get("/project-logos", async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM project_logos ORDER BY sort_order ASC, id DESC");
  return res.json(rows.map(mapLogo));
});

adminRouter.post("/project-logos", async (req, res) => {
  const payload = buildPayload(req.body || {});
  if (!payload.name) return res.status(400).json({ error: "Numele este obligatoriu." });
  if (!payload.logo_url) return res.status(400).json({ error: "Logo URL este obligatoriu." });
  if (!isValidProjectUrl(payload.project_url)) return res.status(400).json({ error: "URL proiect invalid." });

  const db = await getDb();
  const result = await db.run(
    "INSERT INTO project_logos (name, logo_url, alt_text, project_url, sort_order, is_active, display_scale, background_mode, invert_on_dark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [payload.name, payload.logo_url, payload.alt_text, payload.project_url, payload.sort_order, payload.is_active, payload.display_scale, payload.background_mode, payload.invert_on_dark]
  );
  const created = await db.get("SELECT * FROM project_logos WHERE id = ?", [result.lastID]);
  return res.status(201).json({ ok: true, data: mapLogo(created) });
});

adminRouter.put("/project-logos/:id", async (req, res) => {
  const id = toInt(req.params.id, 0);
  const payload = buildPayload(req.body || {});
  if (!payload.name) return res.status(400).json({ error: "Numele este obligatoriu." });
  if (!payload.logo_url) return res.status(400).json({ error: "Logo URL este obligatoriu." });
  if (!isValidProjectUrl(payload.project_url)) return res.status(400).json({ error: "URL proiect invalid." });

  const db = await getDb();
  const existing = await db.get("SELECT id FROM project_logos WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  await db.run(
    `UPDATE project_logos SET
      name=?, logo_url=?, alt_text=?, project_url=?, sort_order=?, is_active=?, display_scale=?, background_mode=?, invert_on_dark=?, updated_at=?
     WHERE id=?`,
    [payload.name, payload.logo_url, payload.alt_text, payload.project_url, payload.sort_order, payload.is_active, payload.display_scale, payload.background_mode, payload.invert_on_dark, nowIso(), id]
  );
  const updated = await db.get("SELECT * FROM project_logos WHERE id = ?", [id]);
  return res.json({ ok: true, data: mapLogo(updated) });
});

adminRouter.delete("/project-logos/:id", async (req, res) => {
  const db = await getDb();
  await db.run("DELETE FROM project_logos WHERE id = ?", [toInt(req.params.id, 0)]);
  return res.json({ ok: true });
});

module.exports = {
  publicRouter,
  adminRouter
};
