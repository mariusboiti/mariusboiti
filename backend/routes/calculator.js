const express = require("express");
const { getDb, nowIso } = require("../database");
const { sanitizeNullable, sanitizeText, toBoolInt, toInt } = require("../utils/security");
const { asyncHandler } = require("../utils/asyncHandler");

const publicRouter = express.Router();
const adminRouter = express.Router();

publicRouter.get("/calculator", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const [options, settings] = await Promise.all([
    db.all("SELECT * FROM calculator_options WHERE is_active = 1 ORDER BY step_key ASC, sort_order ASC, id ASC"),
    db.get("SELECT * FROM calculator_settings ORDER BY id DESC LIMIT 1")
  ]);

  return res.json({ options, settings: settings || {} });
}));

adminRouter.get("/calculator/options", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM calculator_options ORDER BY step_key ASC, sort_order ASC, id ASC");
  return res.json(rows);
}));

adminRouter.post("/calculator/options", asyncHandler(async (req, res) => {
  const payload = {
    step_key: sanitizeText(req.body.step_key, 120),
    step_title: sanitizeNullable(req.body.step_title, 500),
    option_label: sanitizeText(req.body.option_label, 500),
    option_value: sanitizeNullable(req.body.option_value, 255),
    option_type: sanitizeText(req.body.option_type, 20) === "checkbox" ? "checkbox" : "single",
    price_add: toInt(req.body.price_add, 0),
    base_price: toInt(req.body.base_price, 0),
    sort_order: toInt(req.body.sort_order, 0),
    is_active: toBoolInt(req.body.is_active),
    description: sanitizeNullable(req.body.description, 1000)
  };

  if (!payload.step_key || !payload.option_label) {
    return res.status(400).json({ error: "step_key si option_label sunt obligatorii." });
  }

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO calculator_options
    (step_key, step_title, option_label, option_value, option_type, price_add, base_price, sort_order, is_active, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.step_key,
      payload.step_title,
      payload.option_label,
      payload.option_value,
      payload.option_type,
      payload.price_add,
      payload.base_price,
      payload.sort_order,
      payload.is_active,
      payload.description
    ]
  );

  const created = await db.get("SELECT * FROM calculator_options WHERE id = ?", [result.lastID]);
  return res.status(201).json({ ok: true, data: created });
}));

adminRouter.put("/calculator/options/:id", asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, 0);
  const payload = {
    step_key: sanitizeText(req.body.step_key, 120),
    step_title: sanitizeNullable(req.body.step_title, 500),
    option_label: sanitizeText(req.body.option_label, 500),
    option_value: sanitizeNullable(req.body.option_value, 255),
    option_type: sanitizeText(req.body.option_type, 20) === "checkbox" ? "checkbox" : "single",
    price_add: toInt(req.body.price_add, 0),
    base_price: toInt(req.body.base_price, 0),
    sort_order: toInt(req.body.sort_order, 0),
    is_active: toBoolInt(req.body.is_active),
    description: sanitizeNullable(req.body.description, 1000)
  };

  const db = await getDb();
  const existing = await db.get("SELECT id FROM calculator_options WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  await db.run(
    `UPDATE calculator_options SET
      step_key=?, step_title=?, option_label=?, option_value=?, option_type=?, price_add=?, base_price=?, sort_order=?, is_active=?, description=?, updated_at=?
      WHERE id=?`,
    [
      payload.step_key,
      payload.step_title,
      payload.option_label,
      payload.option_value,
      payload.option_type,
      payload.price_add,
      payload.base_price,
      payload.sort_order,
      payload.is_active,
      payload.description,
      nowIso(),
      id
    ]
  );

  const updated = await db.get("SELECT * FROM calculator_options WHERE id = ?", [id]);
  return res.json({ ok: true, data: updated });
}));

adminRouter.delete("/calculator/options/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  await db.run("DELETE FROM calculator_options WHERE id = ?", [toInt(req.params.id, 0)]);
  return res.json({ ok: true });
}));

adminRouter.get("/calculator/settings", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM calculator_settings ORDER BY id DESC LIMIT 1");
  return res.json(row || {});
}));

adminRouter.put("/calculator/settings", asyncHandler(async (req, res) => {
  const payload = {
    max_multiplier: Number.parseFloat(req.body.max_multiplier) || 1.2,
    round_to: toInt(req.body.round_to, 100),
    start_threshold: toInt(req.body.start_threshold, 2000),
    business_threshold: toInt(req.body.business_threshold, 4500),
    premium_threshold: toInt(req.body.premium_threshold, 7000),
    custom_threshold: toInt(req.body.custom_threshold, 7000),
    result_intro_text: sanitizeNullable(req.body.result_intro_text, 3000),
    under_budget_message: sanitizeNullable(req.body.under_budget_message, 3000),
    start_message: sanitizeNullable(req.body.start_message, 3000),
    business_message: sanitizeNullable(req.body.business_message, 3000),
    premium_message: sanitizeNullable(req.body.premium_message, 3000),
    custom_message: sanitizeNullable(req.body.custom_message, 3000)
  };

  const db = await getDb();
  const existing = await db.get("SELECT id FROM calculator_settings ORDER BY id DESC LIMIT 1");

  if (!existing) {
    await db.run(
      `INSERT INTO calculator_settings
      (max_multiplier, round_to, start_threshold, business_threshold, premium_threshold, custom_threshold, result_intro_text, under_budget_message, start_message, business_message, premium_message, custom_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.max_multiplier,
        payload.round_to,
        payload.start_threshold,
        payload.business_threshold,
        payload.premium_threshold,
        payload.custom_threshold,
        payload.result_intro_text,
        payload.under_budget_message,
        payload.start_message,
        payload.business_message,
        payload.premium_message,
        payload.custom_message
      ]
    );
  } else {
    await db.run(
      `UPDATE calculator_settings SET
      max_multiplier=?, round_to=?, start_threshold=?, business_threshold=?, premium_threshold=?, custom_threshold=?, result_intro_text=?, under_budget_message=?, start_message=?, business_message=?, premium_message=?, custom_message=?, updated_at=?
      WHERE id=?`,
      [
        payload.max_multiplier,
        payload.round_to,
        payload.start_threshold,
        payload.business_threshold,
        payload.premium_threshold,
        payload.custom_threshold,
        payload.result_intro_text,
        payload.under_budget_message,
        payload.start_message,
        payload.business_message,
        payload.premium_message,
        payload.custom_message,
        nowIso(),
        existing.id
      ]
    );
  }

  const updated = await db.get("SELECT * FROM calculator_settings ORDER BY id DESC LIMIT 1");
  return res.json({ ok: true, data: updated });
}));

module.exports = {
  publicRouter,
  adminRouter
};
