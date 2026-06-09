const express = require("express");
const nodemailer = require("nodemailer");
const { getDb, nowIso, stringifyJsonField } = require("../database");
const { mapLead } = require("../utils/formatters");
const { sanitizeNullable, sanitizeText, toInt, validateEmail } = require("../utils/security");
const { asyncHandler } = require("../utils/asyncHandler");

const publicRouter = express.Router();
const adminRouter = express.Router();

let smtpTransport = null;

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return smtpTransport;
}

async function notifyLead(lead) {
  const transport = getSmtpTransport();
  if (!transport || !process.env.LEAD_NOTIFY_EMAIL) return;

  const summaryText = lead.calculator_summary_json ? JSON.stringify(lead.calculator_summary_json, null, 2) : "-";

  await transport.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.LEAD_NOTIFY_EMAIL,
    subject: `[Lead nou] ${lead.name} - ${lead.project_type || "Proiect web"}`,
    text: [
      `Nume: ${lead.name}`,
      `Email: ${lead.email}`,
      `Telefon: ${lead.phone || "-"}`,
      `Tip proiect: ${lead.project_type || "-"}`,
      `Buget: ${lead.budget_range || "-"}`,
      `Termen: ${lead.timeline || "-"}`,
      `Mesaj: ${lead.message || "-"}`,
      `Estimare: ${lead.estimated_min || "-"} - ${lead.estimated_max || "-"}`,
      `Pachet recomandat: ${lead.recommended_package || "-"}`,
      `Calculator: ${summaryText}`
    ].join("\n")
  });
}

// Validate and clamp calculator_summary_json from untrusted public input.
// Rejects payloads that are too large or not a plain object/null.
function sanitizeCalculatorJson(raw) {
  if (raw === null || raw === undefined || raw === "") return null;

  // Must be a plain object (or already serialised string)
  let parsed = raw;
  if (typeof raw === "string") {
    if (raw.length > 8000) return null; // hard size cap
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) return null;

  // Serialise back to a controlled string to avoid prototype pollution
  const serialised = JSON.stringify(parsed);
  if (serialised.length > 8000) return null;
  return serialised;
}

publicRouter.post("/leads", asyncHandler(async (req, res) => {
  const payload = {
    name: sanitizeText(req.body.name, 255),
    email: sanitizeText(req.body.email, 255).toLowerCase(),
    phone: sanitizeNullable(req.body.phone, 120),
    project_type: sanitizeNullable(req.body.project_type, 255),
    budget_range: sanitizeNullable(req.body.budget_range, 255),
    timeline: sanitizeNullable(req.body.timeline, 255),
    message: sanitizeText(req.body.message, 8000),
    calculator_summary_json: sanitizeCalculatorJson(req.body.calculator_summary_json),
    estimated_min: req.body.estimated_min === undefined || req.body.estimated_min === null || req.body.estimated_min === "" ? null : toInt(req.body.estimated_min, 0),
    estimated_max: req.body.estimated_max === undefined || req.body.estimated_max === null || req.body.estimated_max === "" ? null : toInt(req.body.estimated_max, 0),
    recommended_package: sanitizeNullable(req.body.recommended_package, 255),
    budget_confirmed: req.body.budget_confirmed ? 1 : 0,
    source: sanitizeNullable(req.body.source, 120) || "contact_form",
    status: "new"
  };

  if (!payload.name || !payload.message || !validateEmail(payload.email)) {
    return res.status(400).json({ error: "Nume, email valid si mesaj sunt obligatorii." });
  }

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO leads
    (name, email, phone, project_type, budget_range, timeline, message, calculator_summary_json, estimated_min, estimated_max, recommended_package, budget_confirmed, source, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.name,
      payload.email,
      payload.phone,
      payload.project_type,
      payload.budget_range,
      payload.timeline,
      payload.message,
      payload.calculator_summary_json,
      payload.estimated_min,
      payload.estimated_max,
      payload.recommended_package,
      payload.budget_confirmed,
      payload.source,
      payload.status
    ]
  );

  const created = await db.get("SELECT * FROM leads WHERE id = ?", [result.lastID]);
  const mapped = mapLead(created);

  notifyLead(mapped).catch((_error) => {
    // SMTP is optional.
  });

  return res.status(201).json({ ok: true, message: "Cererea ta a fost trimisa cu succes.", data: mapped });
}));

adminRouter.get("/leads", asyncHandler(async (req, res) => {
  const status = sanitizeNullable(req.query.status, 30);
  const source = sanitizeNullable(req.query.source, 120);
  const projectType = sanitizeNullable(req.query.project_type, 255);
  const search = sanitizeNullable(req.query.search, 200);

  const clauses = [];
  const params = [];

  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }

  if (source) {
    clauses.push("source = ?");
    params.push(source);
  }

  if (projectType) {
    clauses.push("project_type = ?");
    params.push(projectType);
  }

  if (search) {
    clauses.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const db = await getDb();
  const rows = await db.all(`SELECT * FROM leads ${where} ORDER BY created_at DESC`, params);

  return res.json(rows.map(mapLead));
}));

adminRouter.get("/leads/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM leads WHERE id = ?", [toInt(req.params.id, 0)]);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapLead(row));
}));

adminRouter.put("/leads/:id", asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, 0);
  const payload = {
    status: sanitizeNullable(req.body.status, 30) || "new",
    internal_notes: sanitizeNullable(req.body.internal_notes, 8000),
    project_type: sanitizeNullable(req.body.project_type, 255),
    budget_range: sanitizeNullable(req.body.budget_range, 255),
    timeline: sanitizeNullable(req.body.timeline, 255),
    message: sanitizeNullable(req.body.message, 8000),
    budget_confirmed: req.body.budget_confirmed === undefined ? undefined : (req.body.budget_confirmed ? 1 : 0)
  };

  const db = await getDb();
  const existing = await db.get("SELECT id FROM leads WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  if (payload.budget_confirmed === undefined) {
    await db.run(
      `UPDATE leads SET status=?, internal_notes=?, project_type=?, budget_range=?, timeline=?, message=?, updated_at=? WHERE id=?`,
      [payload.status, payload.internal_notes, payload.project_type, payload.budget_range, payload.timeline, payload.message, nowIso(), id]
    );
  } else {
    await db.run(
      `UPDATE leads SET status=?, internal_notes=?, project_type=?, budget_range=?, timeline=?, message=?, budget_confirmed=?, updated_at=? WHERE id=?`,
      [payload.status, payload.internal_notes, payload.project_type, payload.budget_range, payload.timeline, payload.message, payload.budget_confirmed, nowIso(), id]
    );
  }

  const updated = await db.get("SELECT * FROM leads WHERE id = ?", [id]);
  return res.json({ ok: true, data: mapLead(updated) });
}));

adminRouter.delete("/leads/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  await db.run("DELETE FROM leads WHERE id = ?", [toInt(req.params.id, 0)]);
  return res.json({ ok: true });
}));

module.exports = {
  publicRouter,
  adminRouter
};
