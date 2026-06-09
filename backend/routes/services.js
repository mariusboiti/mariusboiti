const express = require("express");
const { getDb, nowIso, stringifyJsonField } = require("../database");
const { mapService } = require("../utils/formatters");
const { sanitizeNullable, sanitizeText, toBoolInt, toInt, parseJsonInput, slugify } = require("../utils/security");
const { asyncHandler } = require("../utils/asyncHandler");

const publicRouter = express.Router();
const adminRouter = express.Router();

function buildServicePayload(body) {
  const title = sanitizeText(body.title, 255);
  return {
    title,
    slug: slugify(body.slug || title),
    short_description: sanitizeNullable(body.short_description, 1500),
    long_description: sanitizeNullable(body.long_description, 8000),
    icon: sanitizeNullable(body.icon, 120),
    includes_json: parseJsonInput(body.includes_json, []),
    suitable_for: sanitizeNullable(body.suitable_for, 1500),
    cta_text: sanitizeNullable(body.cta_text, 255),
    cta_url: sanitizeNullable(body.cta_url, 500),
    sort_order: toInt(body.sort_order, 0),
    is_featured: toBoolInt(body.is_featured),
    is_active: toBoolInt(body.is_active),
    seo_title: sanitizeNullable(body.seo_title, 255),
    seo_description: sanitizeNullable(body.seo_description, 500)
  };
}

publicRouter.get("/services", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
  return res.json(rows.map(mapService));
}));

publicRouter.get("/services/:slug", asyncHandler(async (req, res) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM services WHERE slug = ? AND is_active = 1", [sanitizeText(req.params.slug, 120)]);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapService(row));
}));

adminRouter.get("/services", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM services ORDER BY sort_order ASC, id ASC");
  return res.json(rows.map(mapService));
}));

adminRouter.post("/services", asyncHandler(async (req, res) => {
  const payload = buildServicePayload(req.body || {});
  if (!payload.title) return res.status(400).json({ error: "Titlul este obligatoriu." });

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO services
    (title, slug, short_description, long_description, icon, includes_json, suitable_for, cta_text, cta_url, sort_order, is_featured, is_active, seo_title, seo_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.title,
      payload.slug,
      payload.short_description,
      payload.long_description,
      payload.icon,
      stringifyJsonField(payload.includes_json),
      payload.suitable_for,
      payload.cta_text,
      payload.cta_url,
      payload.sort_order,
      payload.is_featured,
      payload.is_active,
      payload.seo_title,
      payload.seo_description
    ]
  );

  const created = await db.get("SELECT * FROM services WHERE id = ?", [result.lastID]);
  return res.status(201).json({ ok: true, data: mapService(created) });
}));

adminRouter.get("/services/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM services WHERE id = ?", [toInt(req.params.id, 0)]);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapService(row));
}));

adminRouter.put("/services/:id", asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, 0);
  const payload = buildServicePayload(req.body || {});
  if (!payload.title) return res.status(400).json({ error: "Titlul este obligatoriu." });

  const db = await getDb();
  const existing = await db.get("SELECT id FROM services WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  await db.run(
    `UPDATE services SET
      title=?, slug=?, short_description=?, long_description=?, icon=?, includes_json=?, suitable_for=?, cta_text=?, cta_url=?,
      sort_order=?, is_featured=?, is_active=?, seo_title=?, seo_description=?, updated_at=?
      WHERE id=?`,
    [
      payload.title,
      payload.slug,
      payload.short_description,
      payload.long_description,
      payload.icon,
      stringifyJsonField(payload.includes_json),
      payload.suitable_for,
      payload.cta_text,
      payload.cta_url,
      payload.sort_order,
      payload.is_featured,
      payload.is_active,
      payload.seo_title,
      payload.seo_description,
      nowIso(),
      id
    ]
  );

  const updated = await db.get("SELECT * FROM services WHERE id = ?", [id]);
  return res.json({ ok: true, data: mapService(updated) });
}));

adminRouter.delete("/services/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  await db.run("DELETE FROM services WHERE id = ?", [toInt(req.params.id, 0)]);
  return res.json({ ok: true });
}));

module.exports = {
  publicRouter,
  adminRouter
};
