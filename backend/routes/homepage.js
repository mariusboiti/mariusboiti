const express = require("express");
const { getDb, nowIso, stringifyJsonField } = require("../database");
const { mapHomepageSection } = require("../utils/formatters");
const { sanitizeNullable, sanitizeText, toBoolInt, toInt, parseJsonInput } = require("../utils/security");

const publicRouter = express.Router();
const adminRouter = express.Router();

publicRouter.get("/homepage", async (_req, res) => {
  const db = await getDb();
  const sections = await db.all(
    "SELECT * FROM homepage_sections WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  );
  return res.json(sections.map(mapHomepageSection));
});

adminRouter.get("/homepage", async (_req, res) => {
  const db = await getDb();
  const sections = await db.all("SELECT * FROM homepage_sections ORDER BY sort_order ASC, id ASC");
  return res.json(sections.map(mapHomepageSection));
});

adminRouter.put("/homepage/:sectionKey", async (req, res) => {
  const sectionKey = sanitizeText(req.params.sectionKey, 120);
  const payload = {
    title: sanitizeNullable(req.body.title, 400),
    subtitle: sanitizeNullable(req.body.subtitle, 5000),
    content: sanitizeNullable(req.body.content, 15000),
    button_primary_text: sanitizeNullable(req.body.button_primary_text, 255),
    button_primary_url: sanitizeNullable(req.body.button_primary_url, 500),
    button_secondary_text: sanitizeNullable(req.body.button_secondary_text, 255),
    button_secondary_url: sanitizeNullable(req.body.button_secondary_url, 500),
    image_url: sanitizeNullable(req.body.image_url, 500),
    extra_json: parseJsonInput(req.body.extra_json, {}),
    sort_order: toInt(req.body.sort_order, 0),
    is_active: toBoolInt(req.body.is_active)
  };

  const db = await getDb();
  const existing = await db.get("SELECT * FROM homepage_sections WHERE section_key = ?", [sectionKey]);

  if (!existing) {
    await db.run(
      `INSERT INTO homepage_sections
      (section_key, title, subtitle, content, button_primary_text, button_primary_url, button_secondary_text, button_secondary_url, image_url, extra_json, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sectionKey,
        payload.title,
        payload.subtitle,
        payload.content,
        payload.button_primary_text,
        payload.button_primary_url,
        payload.button_secondary_text,
        payload.button_secondary_url,
        payload.image_url,
        stringifyJsonField(payload.extra_json),
        payload.sort_order,
        payload.is_active
      ]
    );
  } else {
    await db.run(
      `UPDATE homepage_sections SET
      title=?, subtitle=?, content=?, button_primary_text=?, button_primary_url=?, button_secondary_text=?, button_secondary_url=?,
      image_url=?, extra_json=?, sort_order=?, is_active=?, updated_at=? WHERE section_key=?`,
      [
        payload.title,
        payload.subtitle,
        payload.content,
        payload.button_primary_text,
        payload.button_primary_url,
        payload.button_secondary_text,
        payload.button_secondary_url,
        payload.image_url,
        stringifyJsonField(payload.extra_json),
        payload.sort_order,
        payload.is_active,
        nowIso(),
        sectionKey
      ]
    );
  }

  const section = await db.get("SELECT * FROM homepage_sections WHERE section_key = ?", [sectionKey]);
  return res.json({ ok: true, data: mapHomepageSection(section) });
});

module.exports = {
  publicRouter,
  adminRouter
};
