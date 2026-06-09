const express = require("express");
const { getDb, nowIso } = require("../database");
const { sanitizeText, sanitizeNullable, toInt, toBoolInt } = require("../utils/security");
const { asyncHandler } = require("../utils/asyncHandler");

const publicRouter = express.Router();
const adminRouter = express.Router();

publicRouter.get("/faq", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM faq_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
  return res.json(rows);
}));

adminRouter.get("/faq", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM faq_items ORDER BY sort_order ASC, id ASC");
  return res.json(rows);
}));

adminRouter.post("/faq", asyncHandler(async (req, res) => {
  const payload = {
    question: sanitizeText(req.body.question, 600),
    answer: sanitizeText(req.body.answer, 5000),
    sort_order: toInt(req.body.sort_order, 0),
    is_active: toBoolInt(req.body.is_active)
  };

  if (!payload.question || !payload.answer) {
    return res.status(400).json({ error: "Intrebarea si raspunsul sunt obligatorii." });
  }

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO faq_items (question, answer, sort_order, is_active) VALUES (?, ?, ?, ?)`,
    [payload.question, payload.answer, payload.sort_order, payload.is_active]
  );

  const created = await db.get("SELECT * FROM faq_items WHERE id = ?", [result.lastID]);
  return res.status(201).json({ ok: true, data: created });
}));

adminRouter.get("/faq/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM faq_items WHERE id = ?", [toInt(req.params.id, 0)]);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
}));

adminRouter.put("/faq/:id", asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, 0);
  const payload = {
    question: sanitizeText(req.body.question, 600),
    answer: sanitizeText(req.body.answer, 5000),
    sort_order: toInt(req.body.sort_order, 0),
    is_active: toBoolInt(req.body.is_active)
  };

  const db = await getDb();
  const existing = await db.get("SELECT id FROM faq_items WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  await db.run(
    `UPDATE faq_items SET question=?, answer=?, sort_order=?, is_active=?, updated_at=? WHERE id=?`,
    [payload.question, payload.answer, payload.sort_order, payload.is_active, nowIso(), id]
  );

  const updated = await db.get("SELECT * FROM faq_items WHERE id = ?", [id]);
  return res.json({ ok: true, data: updated });
}));

adminRouter.delete("/faq/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  await db.run("DELETE FROM faq_items WHERE id = ?", [toInt(req.params.id, 0)]);
  return res.json({ ok: true });
}));

module.exports = {
  publicRouter,
  adminRouter
};
