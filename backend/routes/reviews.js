const express = require("express");
const { getDb, nowIso } = require("../database");
const { sanitizeNullable, sanitizeText, toBoolInt, toInt } = require("../utils/security");

const publicRouter = express.Router();
const adminRouter = express.Router();

publicRouter.get("/reviews", async (_req, res) => {
  const db = await getDb();
  const reviews = await db.all(
    "SELECT * FROM google_reviews WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  );
  return res.json(reviews);
});

adminRouter.get("/reviews", async (_req, res) => {
  const db = await getDb();
  const reviews = await db.all(
    "SELECT * FROM google_reviews ORDER BY sort_order ASC, id ASC"
  );
  return res.json(reviews);
});

adminRouter.post("/reviews", async (req, res) => {
  const payload = {
    reviewer_name: sanitizeText(req.body.reviewer_name, 200),
    rating: Math.min(5, Math.max(1, toInt(req.body.rating, 5))),
    review_text: sanitizeNullable(req.body.review_text, 3000),
    reviewer_url: sanitizeNullable(req.body.reviewer_url, 600),
    sort_order: toInt(req.body.sort_order, 0),
    is_active: toBoolInt(req.body.is_active)
  };

  if (!payload.reviewer_name) {
    return res.status(400).json({ error: "Numele recenzorului este obligatoriu." });
  }

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO google_reviews (reviewer_name, rating, review_text, reviewer_url, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.reviewer_name,
      payload.rating,
      payload.review_text,
      payload.reviewer_url,
      payload.sort_order,
      payload.is_active,
      nowIso(),
      nowIso()
    ]
  );
  const review = await db.get("SELECT * FROM google_reviews WHERE id = ?", [result.lastID]);
  return res.json({ ok: true, data: review });
});

adminRouter.put("/reviews/:id", async (req, res) => {
  const id = toInt(req.params.id, 0);
  if (!id) return res.status(400).json({ error: "ID invalid." });

  const payload = {
    reviewer_name: sanitizeText(req.body.reviewer_name, 200),
    rating: Math.min(5, Math.max(1, toInt(req.body.rating, 5))),
    review_text: sanitizeNullable(req.body.review_text, 3000),
    reviewer_url: sanitizeNullable(req.body.reviewer_url, 600),
    sort_order: toInt(req.body.sort_order, 0),
    is_active: toBoolInt(req.body.is_active)
  };

  if (!payload.reviewer_name) {
    return res.status(400).json({ error: "Numele recenzorului este obligatoriu." });
  }

  const db = await getDb();
  await db.run(
    `UPDATE google_reviews
     SET reviewer_name=?, rating=?, review_text=?, reviewer_url=?, sort_order=?, is_active=?, updated_at=?
     WHERE id=?`,
    [
      payload.reviewer_name,
      payload.rating,
      payload.review_text,
      payload.reviewer_url,
      payload.sort_order,
      payload.is_active,
      nowIso(),
      id
    ]
  );
  const review = await db.get("SELECT * FROM google_reviews WHERE id = ?", [id]);
  if (!review) return res.status(404).json({ error: "Recenzie negăsită." });
  return res.json({ ok: true, data: review });
});

adminRouter.delete("/reviews/:id", async (req, res) => {
  const id = toInt(req.params.id, 0);
  if (!id) return res.status(400).json({ error: "ID invalid." });

  const db = await getDb();
  const existing = await db.get("SELECT id FROM google_reviews WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Recenzie negăsită." });

  await db.run("DELETE FROM google_reviews WHERE id = ?", [id]);
  return res.json({ ok: true });
});

module.exports = { publicRouter, adminRouter };
