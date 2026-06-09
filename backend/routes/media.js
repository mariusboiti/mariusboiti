const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const { getDb, nowIso } = require("../database");
const { sanitizeNullable, sanitizeText, toInt } = require("../utils/security");
const { asyncHandler } = require("../utils/asyncHandler");

const publicRouter = express.Router();
const adminRouter = express.Router();

const uploadDir = path.resolve(process.cwd(), "backend/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon"
]);
const allowedVideoMimeTypes = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
    cb(null, `${Date.now()}-${basename}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const extAllowed = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".ico"].includes(ext);
    if (!allowedMimeTypes.has(file.mimetype) && !extAllowed) {
      return cb(new Error("Doar imagini jpg/jpeg/png/webp/svg/ico sunt permise."));
    }
    return cb(null, true);
  }
});

const uploadVideo = multer({
  storage,
  limits: {
    fileSize: 80 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const extAllowed = [".mp4", ".webm", ".mov"].includes(ext);
    if (!allowedVideoMimeTypes.has(file.mimetype) && !extAllowed) {
      return cb(new Error("Doar fisiere video mp4/webm/mov sunt permise."));
    }
    return cb(null, true);
  }
});

adminRouter.post("/media/upload", upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fisier lipsa." });

  const db = await getDb();
  const url = `/uploads/${req.file.filename}`;
  const result = await db.run(
    `INSERT INTO media (filename, original_name, mime_type, size, url, alt_text) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.file.filename,
      sanitizeText(req.file.originalname, 255),
      req.file.mimetype,
      req.file.size,
      url,
      sanitizeNullable(req.body.alt_text, 255)
    ]
  );

  const created = await db.get("SELECT * FROM media WHERE id = ?", [result.lastID]);
  return res.status(201).json({
    ok: true,
    data: created,
    url,
    filename: req.file.filename,
    original_name: req.file.originalname
  });
}));

adminRouter.post("/media/upload-video", uploadVideo.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fisier lipsa." });
  const url = `/uploads/${req.file.filename}`;
  const db = await getDb();
  const result = await db.run(
    "INSERT INTO media (filename, original_name, mime_type, size, url, alt_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, url, "", nowIso()]
  );
  const created = await db.get("SELECT * FROM media WHERE id = ?", [result.lastID]);
  return res.status(201).json({
    ok: true,
    data: created,
    url,
    filename: req.file.filename,
    original_name: req.file.originalname
  });
}));

adminRouter.get("/media", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM media ORDER BY created_at DESC");
  return res.json(rows);
}));

adminRouter.put("/media/:id", asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, 0);
  const db = await getDb();
  const existing = await db.get("SELECT * FROM media WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  await db.run("UPDATE media SET alt_text = ? WHERE id = ?", [sanitizeNullable(req.body.alt_text, 255), id]);
  const updated = await db.get("SELECT * FROM media WHERE id = ?", [id]);
  return res.json({ ok: true, data: updated });
}));

adminRouter.delete("/media/:id", asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, 0);
  const db = await getDb();
  const existing = await db.get("SELECT * FROM media WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const filePath = path.join(uploadDir, existing.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await db.run("DELETE FROM media WHERE id = ?", [id]);
  return res.json({ ok: true });
}));

module.exports = {
  publicRouter,
  adminRouter
};
