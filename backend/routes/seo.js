const express = require("express");
const { getDb, nowIso } = require("../database");
const { sanitizeNullable, sanitizeText } = require("../utils/security");
const { asyncHandler } = require("../utils/asyncHandler");

const publicRouter = express.Router();
const adminRouter = express.Router();

publicRouter.get("/seo/:pageKey", asyncHandler(async (req, res) => {
  const pageKey = sanitizeText(req.params.pageKey, 100);
  const db = await getDb();
  const row = await db.get("SELECT * FROM seo_pages WHERE page_key = ?", [pageKey]);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
}));

adminRouter.get("/seo", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM seo_pages ORDER BY page_key ASC");
  return res.json(rows);
}));

adminRouter.put("/seo/:pageKey", asyncHandler(async (req, res) => {
  const pageKey = sanitizeText(req.params.pageKey, 100);
  const payload = {
    page_title: sanitizeNullable(req.body.page_title, 255),
    meta_title: sanitizeNullable(req.body.meta_title, 255),
    meta_description: sanitizeNullable(req.body.meta_description, 500),
    og_title: sanitizeNullable(req.body.og_title, 255),
    og_description: sanitizeNullable(req.body.og_description, 500),
    og_image: sanitizeNullable(req.body.og_image, 500),
    canonical_url: sanitizeNullable(req.body.canonical_url, 500),
    robots: sanitizeNullable(req.body.robots, 120)
  };

  const db = await getDb();
  const existing = await db.get("SELECT id FROM seo_pages WHERE page_key = ?", [pageKey]);

  if (!existing) {
    await db.run(
      `INSERT INTO seo_pages
      (page_key, page_title, meta_title, meta_description, og_title, og_description, og_image, canonical_url, robots)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pageKey,
        payload.page_title,
        payload.meta_title,
        payload.meta_description,
        payload.og_title,
        payload.og_description,
        payload.og_image,
        payload.canonical_url,
        payload.robots || "index,follow"
      ]
    );
  } else {
    await db.run(
      `UPDATE seo_pages SET
      page_title=?, meta_title=?, meta_description=?, og_title=?, og_description=?, og_image=?, canonical_url=?, robots=?, updated_at=?
      WHERE page_key=?`,
      [
        payload.page_title,
        payload.meta_title,
        payload.meta_description,
        payload.og_title,
        payload.og_description,
        payload.og_image,
        payload.canonical_url,
        payload.robots,
        nowIso(),
        pageKey
      ]
    );
  }

  const updated = await db.get("SELECT * FROM seo_pages WHERE page_key = ?", [pageKey]);
  return res.json({ ok: true, data: updated });
}));

module.exports = {
  publicRouter,
  adminRouter
};
