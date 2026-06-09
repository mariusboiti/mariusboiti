const express = require("express");
const { getDb, nowIso, stringifyJsonField } = require("../database");
const { mapPackage } = require("../utils/formatters");
const { sanitizeNullable, sanitizeText, toBoolInt, toInt, parseJsonInput, slugify } = require("../utils/security");
const { asyncHandler } = require("../utils/asyncHandler");

const publicRouter = express.Router();
const adminRouter = express.Router();

function buildPayload(body) {
  const name = sanitizeText(body.name, 255);
  return {
    name,
    slug: slugify(body.slug || name),
    short_description: sanitizeNullable(body.short_description, 1500),
    price_from: body.price_from === null || body.price_from === "" ? null : toInt(body.price_from, 0),
    show_price: toBoolInt(body.show_price),
    features_json: parseJsonInput(body.features_json, []),
    cta_text: sanitizeNullable(body.cta_text, 255),
    cta_url: sanitizeNullable(body.cta_url, 500),
    sort_order: toInt(body.sort_order, 0),
    is_recommended: toBoolInt(body.is_recommended),
    is_active: toBoolInt(body.is_active)
  };
}

publicRouter.get("/packages", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM packages WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
  return res.json(rows.map(mapPackage));
}));

adminRouter.get("/packages", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM packages ORDER BY sort_order ASC, id ASC");
  return res.json(rows.map(mapPackage));
}));

adminRouter.post("/packages", asyncHandler(async (req, res) => {
  const payload = buildPayload(req.body || {});
  if (!payload.name) return res.status(400).json({ error: "Numele este obligatoriu." });
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO packages
      (name, slug, short_description, price_from, show_price, features_json, cta_text, cta_url, sort_order, is_recommended, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.name,
      payload.slug,
      payload.short_description,
      payload.price_from,
      payload.show_price,
      stringifyJsonField(payload.features_json),
      payload.cta_text,
      payload.cta_url,
      payload.sort_order,
      payload.is_recommended,
      payload.is_active
    ]
  );

  const created = await db.get("SELECT * FROM packages WHERE id = ?", [result.lastID]);
  return res.status(201).json({ ok: true, data: mapPackage(created) });
}));

adminRouter.get("/packages/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM packages WHERE id = ?", [toInt(req.params.id, 0)]);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapPackage(row));
}));

adminRouter.put("/packages/:id", asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, 0);
  const payload = buildPayload(req.body || {});
  if (!payload.name) return res.status(400).json({ error: "Numele este obligatoriu." });

  const db = await getDb();
  const existing = await db.get("SELECT id FROM packages WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  await db.run(
    `UPDATE packages SET
      name=?, slug=?, short_description=?, price_from=?, show_price=?, features_json=?, cta_text=?, cta_url=?,
      sort_order=?, is_recommended=?, is_active=?, updated_at=? WHERE id=?`,
    [
      payload.name,
      payload.slug,
      payload.short_description,
      payload.price_from,
      payload.show_price,
      stringifyJsonField(payload.features_json),
      payload.cta_text,
      payload.cta_url,
      payload.sort_order,
      payload.is_recommended,
      payload.is_active,
      nowIso(),
      id
    ]
  );

  const updated = await db.get("SELECT * FROM packages WHERE id = ?", [id]);
  return res.json({ ok: true, data: mapPackage(updated) });
}));

adminRouter.delete("/packages/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  await db.run("DELETE FROM packages WHERE id = ?", [toInt(req.params.id, 0)]);
  return res.json({ ok: true });
}));

module.exports = {
  publicRouter,
  adminRouter
};
