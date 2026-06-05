const express = require("express");
const { getDb, nowIso } = require("../database");
const { sanitizeNullable, sanitizeText } = require("../utils/security");

const publicRouter = express.Router();
const adminRouter = express.Router();

publicRouter.get("/settings", async (_req, res) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM site_settings ORDER BY id DESC LIMIT 1");
  return res.json(row || {});
});

adminRouter.get("/settings", async (_req, res) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM site_settings ORDER BY id DESC LIMIT 1");
  return res.json(row || {});
});

adminRouter.put("/settings", async (req, res) => {
  const payload = {
    site_name: sanitizeText(req.body.site_name, 255),
    tagline: sanitizeNullable(req.body.tagline, 500),
    email: sanitizeNullable(req.body.email, 255),
    phone: sanitizeNullable(req.body.phone, 120),
    whatsapp: sanitizeNullable(req.body.whatsapp, 120),
    facebook_url: sanitizeNullable(req.body.facebook_url, 500),
    instagram_url: sanitizeNullable(req.body.instagram_url, 500),
    linkedin_url: sanitizeNullable(req.body.linkedin_url, 500),
    youtube_url: sanitizeNullable(req.body.youtube_url, 500),
    logo_text: sanitizeNullable(req.body.logo_text, 255),
    logo_image: sanitizeNullable(req.body.logo_image, 500),
    favicon: sanitizeNullable(req.body.favicon, 500),
    default_meta_title: sanitizeNullable(req.body.default_meta_title, 255),
    default_meta_description: sanitizeNullable(req.body.default_meta_description, 500),
    ga_measurement_id: sanitizeNullable(req.body.ga_measurement_id, 50)
  };

  const db = await getDb();
  const existing = await db.get("SELECT id FROM site_settings ORDER BY id DESC LIMIT 1");

  if (existing) {
    await db.run(
      `UPDATE site_settings SET
        site_name=?, tagline=?, email=?, phone=?, whatsapp=?, facebook_url=?, instagram_url=?, linkedin_url=?, youtube_url=?,
        logo_text=?, logo_image=?, favicon=?, default_meta_title=?, default_meta_description=?, ga_measurement_id=?, updated_at=?
       WHERE id=?`,
      [
        payload.site_name,
        payload.tagline,
        payload.email,
        payload.phone,
        payload.whatsapp,
        payload.facebook_url,
        payload.instagram_url,
        payload.linkedin_url,
        payload.youtube_url,
        payload.logo_text,
        payload.logo_image,
        payload.favicon,
        payload.default_meta_title,
        payload.default_meta_description,
        payload.ga_measurement_id,
        nowIso(),
        existing.id
      ]
    );
  } else {
    await db.run(
      `INSERT INTO site_settings
      (site_name, tagline, email, phone, whatsapp, facebook_url, instagram_url, linkedin_url, youtube_url, logo_text, logo_image, favicon, default_meta_title, default_meta_description, ga_measurement_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.site_name,
        payload.tagline,
        payload.email,
        payload.phone,
        payload.whatsapp,
        payload.facebook_url,
        payload.instagram_url,
        payload.linkedin_url,
        payload.youtube_url,
        payload.logo_text,
        payload.logo_image,
        payload.favicon,
        payload.default_meta_title,
        payload.default_meta_description,
        payload.ga_measurement_id
      ]
    );
  }

  const updated = await db.get("SELECT * FROM site_settings ORDER BY id DESC LIMIT 1");
  return res.json({ ok: true, data: updated });
});

module.exports = {
  publicRouter,
  adminRouter
};
