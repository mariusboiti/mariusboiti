const express = require("express");
const fs = require("fs");
const path = require("path");
const { getDb, nowIso, stringifyJsonField } = require("../database");
const { mapPortfolio } = require("../utils/formatters");
const { sanitizeNullable, sanitizeText, toBoolInt, toInt, parseJsonInput, slugify } = require("../utils/security");
const { ensureUniqueSlug } = require("../utils/slugUtils");
const { asyncHandler } = require("../utils/asyncHandler");

const publicRouter = express.Router();
const adminRouter = express.Router();

const uploadDir = path.resolve(process.cwd(), "backend/uploads/portfolio");
fs.mkdirSync(uploadDir, { recursive: true });

function isHttpUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(String(url).trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function isAssetOrHttpUrl(url) {
  if (!url) return true;
  const value = String(url).trim();
  if (!value) return true;
  if (value.startsWith("/")) return true;
  return isHttpUrl(value);
}

function isPrivateHost(url) {
  let parsed;
  try {
    parsed = new URL(String(url || "").trim());
  } catch (_error) {
    return true;
  }

  const host = String(parsed.hostname || "").toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;

  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map((part) => Number(part));
    if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true;
    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  return false;
}

function normalizeStringList(value, maxLength = 200) {
  const list = Array.isArray(value) ? value : parseJsonInput(value, []);
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => sanitizeText(item, maxLength))
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBuiltItemsDetailed(value) {
  const list = Array.isArray(value) ? value : parseJsonInput(value, []);
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => {
      if (typeof item === "string") {
        const title = sanitizeText(item, 180);
        if (!title) return null;
        return { title, description: "", icon: "", sort_order: index + 1 };
      }
      const title = sanitizeText(item?.title, 180);
      const description = sanitizeText(item?.description, 1200);
      const icon = sanitizeText(item?.icon, 80);
      const sort_order = toInt(item?.sort_order, index + 1);
      if (!title && !description) return null;
      return { title, description, icon, sort_order };
    })
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function normalizeResultsItems(value) {
  const list = Array.isArray(value) ? value : parseJsonInput(value, []);
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => {
      if (typeof item === "string") {
        const title = sanitizeText(item, 180);
        if (!title) return null;
        return { title, description: "", metric: "", label: "", sort_order: index + 1 };
      }
      const title = sanitizeText(item?.title, 180);
      const description = sanitizeText(item?.description, 1200);
      const metric = sanitizeText(item?.metric, 160);
      const label = sanitizeText(item?.label, 160);
      const sort_order = toInt(item?.sort_order, index + 1);
      if (!title && !description && !metric && !label) return null;
      return { title, description, metric, label, sort_order };
    })
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function normalizeGallery(value) {
  const list = Array.isArray(value) ? value : parseJsonInput(value, []);
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => {
      if (typeof item === "string") {
        const image_url = sanitizeText(item, 500);
        if (!image_url) return null;
        return { image_url, caption: "", alt_text: "", sort_order: index + 1 };
      }
      const image_url = sanitizeText(item?.image_url, 500);
      const caption = sanitizeText(item?.caption, 500);
      const alt_text = sanitizeText(item?.alt_text, 255);
      const sort_order = toInt(item?.sort_order, index + 1);
      if (!image_url) return null;
      if (!isAssetOrHttpUrl(image_url)) return null;
      return { image_url, caption, alt_text, sort_order };
    })
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function normalizeSections(value) {
  const data = typeof value === "object" && value !== null ? value : parseJsonInput(value, {});
  if (!data || Array.isArray(data) || typeof data !== "object") return {};
  const clean = {};
  for (const [key, raw] of Object.entries(data)) {
    clean[sanitizeText(key, 60)] = sanitizeText(raw, 3000);
  }
  return clean;
}

function buildPayload(body = {}) {
  const title = sanitizeText(body.title, 255);
  const slug = slugify(body.slug || title);
  const builtItemsSimple = normalizeStringList(body.built_items_json, 400);
  const builtItemsDetailed = normalizeBuiltItemsDetailed(body.built_items_detailed_json);
  const resultsItems = normalizeResultsItems(body.results_items_json);
  const technologies = normalizeStringList(body.technologies_json, 120);
  const gallery = normalizeGallery(body.gallery_json);
  const sections = normalizeSections(body.project_sections_json);

  return {
    title,
    slug,
    project_type: sanitizeNullable(body.project_type, 255),
    short_description: sanitizeNullable(body.short_description, 1500),
    objective: sanitizeNullable(body.objective, 2000),
    long_description: sanitizeNullable(body.long_description, 10000),
    live_url: sanitizeNullable(body.live_url, 500),
    image_alt: sanitizeNullable(body.image_alt, 255),
    client_name: sanitizeNullable(body.client_name, 255),
    initial_problem: sanitizeNullable(body.initial_problem, 2500),
    target_audience: sanitizeNullable(body.target_audience, 1200),
    tone_style: sanitizeNullable(body.tone_style, 500),
    built_items_json: builtItemsSimple,
    built_items_detailed_json: builtItemsDetailed,
    results: sanitizeNullable(body.results, 2000),
    results_items_json: resultsItems,
    technologies_json: technologies,
    gallery_json: gallery,
    project_sections_json: sections,
    hero_title: sanitizeNullable(body.hero_title, 255),
    hero_subtitle: sanitizeNullable(body.hero_subtitle, 1500),
    challenge_title: sanitizeNullable(body.challenge_title, 255),
    challenge_text: sanitizeNullable(body.challenge_text, 3000),
    solution_title: sanitizeNullable(body.solution_title, 255),
    solution_text: sanitizeNullable(body.solution_text, 3000),
    results_title: sanitizeNullable(body.results_title, 255),
    results_text: sanitizeNullable(body.results_text, 3000),
    cta_title: sanitizeNullable(body.cta_title, 255),
    cta_text: sanitizeNullable(body.cta_text, 1200),
    cta_button_text: sanitizeNullable(body.cta_button_text, 120),
    cta_button_url: sanitizeNullable(body.cta_button_url, 500),
    image_url: sanitizeNullable(body.image_url, 500),
    project_url: sanitizeNullable(body.project_url, 500),
    sort_order: toInt(body.sort_order, 0),
    is_featured: toBoolInt(body.is_featured),
    is_active: toBoolInt(body.is_active),
    seo_title: sanitizeNullable(body.seo_title, 255),
    seo_description: sanitizeNullable(body.seo_description, 500),
    og_image: sanitizeNullable(body.og_image, 500),
    canonical_url: sanitizeNullable(body.canonical_url, 500),
    focus_keyword: sanitizeNullable(body.focus_keyword, 160),
    robots: sanitizeNullable(body.robots, 120)
  };
}

publicRouter.get("/portfolio", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM portfolio_projects WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
  return res.json(rows.map(mapPortfolio));
}));

publicRouter.get("/portfolio/:slug", asyncHandler(async (req, res) => {
  const db = await getDb();
  const safeSlug = slugify(req.params.slug || "");
  if (!safeSlug) return res.status(404).json({ error: "Not found" });
  const row = await db.get("SELECT * FROM portfolio_projects WHERE slug = ? AND is_active = 1", [safeSlug]);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapPortfolio(row));
}));

adminRouter.get("/portfolio", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM portfolio_projects ORDER BY sort_order ASC, id ASC");
  return res.json(rows.map(mapPortfolio));
}));

adminRouter.post("/portfolio", asyncHandler(async (req, res) => {
  const payload = buildPayload(req.body || {});
  if (!payload.title) return res.status(400).json({ error: "Titlul este obligatoriu." });
  if (payload.project_url && !isHttpUrl(payload.project_url)) return res.status(400).json({ error: "Project URL invalid." });
  if (payload.live_url && !isHttpUrl(payload.live_url)) return res.status(400).json({ error: "Live URL invalid." });
  if (payload.image_url && !isAssetOrHttpUrl(payload.image_url)) return res.status(400).json({ error: "Image URL invalid." });
  if (payload.og_image && !isAssetOrHttpUrl(payload.og_image)) return res.status(400).json({ error: "OG image invalid." });
  if (payload.canonical_url && !isHttpUrl(payload.canonical_url)) return res.status(400).json({ error: "Canonical URL invalid." });
  if (payload.cta_button_url && !isAssetOrHttpUrl(payload.cta_button_url)) return res.status(400).json({ error: "CTA URL invalid." });

  const db = await getDb();
  payload.slug = await ensureUniqueSlug(db, "portfolio_projects", payload.slug);

  const result = await db.run(
    `INSERT INTO portfolio_projects
    (title, slug, project_type, short_description, objective, built_items_json, results, technologies_json, image_url, project_url, sort_order, is_featured, is_active, seo_title, seo_description,
     long_description, live_url, image_alt, client_name, initial_problem, target_audience, tone_style, built_items_detailed_json, results_items_json, gallery_json, project_sections_json,
     hero_title, hero_subtitle, challenge_title, challenge_text, solution_title, solution_text, results_title, results_text, cta_title, cta_text, cta_button_text, cta_button_url, og_image, canonical_url, focus_keyword, robots)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.title,
      payload.slug,
      payload.project_type,
      payload.short_description,
      payload.objective,
      stringifyJsonField(payload.built_items_json),
      payload.results,
      stringifyJsonField(payload.technologies_json),
      payload.image_url,
      payload.project_url,
      payload.sort_order,
      payload.is_featured,
      payload.is_active,
      payload.seo_title,
      payload.seo_description,
      payload.long_description,
      payload.live_url,
      payload.image_alt,
      payload.client_name,
      payload.initial_problem,
      payload.target_audience,
      payload.tone_style,
      stringifyJsonField(payload.built_items_detailed_json),
      stringifyJsonField(payload.results_items_json),
      stringifyJsonField(payload.gallery_json),
      stringifyJsonField(payload.project_sections_json),
      payload.hero_title,
      payload.hero_subtitle,
      payload.challenge_title,
      payload.challenge_text,
      payload.solution_title,
      payload.solution_text,
      payload.results_title,
      payload.results_text,
      payload.cta_title,
      payload.cta_text,
      payload.cta_button_text,
      payload.cta_button_url,
      payload.og_image,
      payload.canonical_url,
      payload.focus_keyword,
      payload.robots
    ]
  );

  const created = await db.get("SELECT * FROM portfolio_projects WHERE id = ?", [result.lastID]);
  return res.status(201).json({ ok: true, data: mapPortfolio(created) });
}));

adminRouter.get("/portfolio/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const row = await db.get("SELECT * FROM portfolio_projects WHERE id = ?", [toInt(req.params.id, 0)]);
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(mapPortfolio(row));
}));

adminRouter.put("/portfolio/:id", asyncHandler(async (req, res) => {
  const id = toInt(req.params.id, 0);
  const payload = buildPayload(req.body || {});
  if (!payload.title) return res.status(400).json({ error: "Titlul este obligatoriu." });
  if (payload.project_url && !isHttpUrl(payload.project_url)) return res.status(400).json({ error: "Project URL invalid." });
  if (payload.live_url && !isHttpUrl(payload.live_url)) return res.status(400).json({ error: "Live URL invalid." });
  if (payload.image_url && !isAssetOrHttpUrl(payload.image_url)) return res.status(400).json({ error: "Image URL invalid." });
  if (payload.og_image && !isAssetOrHttpUrl(payload.og_image)) return res.status(400).json({ error: "OG image invalid." });
  if (payload.canonical_url && !isHttpUrl(payload.canonical_url)) return res.status(400).json({ error: "Canonical URL invalid." });
  if (payload.cta_button_url && !isAssetOrHttpUrl(payload.cta_button_url)) return res.status(400).json({ error: "CTA URL invalid." });

  const db = await getDb();
  const existing = await db.get("SELECT id FROM portfolio_projects WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  payload.slug = await ensureUniqueSlug(db, "portfolio_projects", payload.slug, id);

  await db.run(
    `UPDATE portfolio_projects SET
      title=?, slug=?, project_type=?, short_description=?, objective=?, built_items_json=?, results=?, technologies_json=?,
      image_url=?, project_url=?, sort_order=?, is_featured=?, is_active=?, seo_title=?, seo_description=?, updated_at=?,
      long_description=?, live_url=?, image_alt=?, client_name=?, initial_problem=?, target_audience=?, tone_style=?, built_items_detailed_json=?, results_items_json=?, gallery_json=?, project_sections_json=?,
      hero_title=?, hero_subtitle=?, challenge_title=?, challenge_text=?, solution_title=?, solution_text=?, results_title=?, results_text=?, cta_title=?, cta_text=?, cta_button_text=?, cta_button_url=?, og_image=?, canonical_url=?, focus_keyword=?, robots=?
      WHERE id=?`,
    [
      payload.title,
      payload.slug,
      payload.project_type,
      payload.short_description,
      payload.objective,
      stringifyJsonField(payload.built_items_json),
      payload.results,
      stringifyJsonField(payload.technologies_json),
      payload.image_url,
      payload.project_url,
      payload.sort_order,
      payload.is_featured,
      payload.is_active,
      payload.seo_title,
      payload.seo_description,
      nowIso(),
      payload.long_description,
      payload.live_url,
      payload.image_alt,
      payload.client_name,
      payload.initial_problem,
      payload.target_audience,
      payload.tone_style,
      stringifyJsonField(payload.built_items_detailed_json),
      stringifyJsonField(payload.results_items_json),
      stringifyJsonField(payload.gallery_json),
      stringifyJsonField(payload.project_sections_json),
      payload.hero_title,
      payload.hero_subtitle,
      payload.challenge_title,
      payload.challenge_text,
      payload.solution_title,
      payload.solution_text,
      payload.results_title,
      payload.results_text,
      payload.cta_title,
      payload.cta_text,
      payload.cta_button_text,
      payload.cta_button_url,
      payload.og_image,
      payload.canonical_url,
      payload.focus_keyword,
      payload.robots,
      id
    ]
  );

  const updated = await db.get("SELECT * FROM portfolio_projects WHERE id = ?", [id]);
  return res.json({ ok: true, data: mapPortfolio(updated) });
}));

adminRouter.delete("/portfolio/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  await db.run("DELETE FROM portfolio_projects WHERE id = ?", [toInt(req.params.id, 0)]);
  return res.json({ ok: true });
}));

adminRouter.post("/portfolio/preview", asyncHandler(async (req, res) => {
  const targetUrl = sanitizeText(req.body?.url, 1000);
  if (!targetUrl || !isHttpUrl(targetUrl)) {
    return res.status(400).json({ error: "URL invalid. Foloseste http:// sau https://." });
  }
  if (isPrivateHost(targetUrl)) {
    return res.status(400).json({ error: "URL-ul este blocat din motive de securitate." });
  }

  const screenshotApiTemplate = String(process.env.SCREENSHOT_API_URL || "").trim();
  if (!screenshotApiTemplate) {
    return res.status(503).json({ error: "Preview automat indisponibil. Poti urca manual o imagine." });
  }

  const encodedTarget = encodeURIComponent(targetUrl);
  const screenshotApiUrl = screenshotApiTemplate
    .replaceAll("{url}", encodedTarget)
    .replaceAll("{raw_url}", targetUrl);

  const headers = {};
  const apiKey = String(process.env.SCREENSHOT_API_KEY || "").trim();
  const apiKeyHeader = String(process.env.SCREENSHOT_API_KEY_HEADER || "x-api-key").trim();
  if (apiKey) {
    headers[apiKeyHeader] = apiKey;
  }
  const bearer = String(process.env.SCREENSHOT_API_BEARER || "").trim();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(screenshotApiUrl, {
      method: "GET",
      headers,
      signal: controller.signal
    });
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!response.ok || !contentType.startsWith("image/")) {
      return res
        .status(502)
        .json({ error: "Nu am putut genera preview-ul automat. Poti incerca din nou sau urca manual o imagine." });
    }

    const extensionByType = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp"
    };
    const extension = extensionByType[contentType.split(";")[0]] || ".jpg";
    const fileName = `${Date.now()}-portfolio-preview${extension}`;
    const diskPath = path.join(uploadDir, fileName);
    const publicUrl = `/uploads/portfolio/${fileName}`;
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(diskPath, buffer);

    const db = await getDb();
    await db.run(
      "INSERT INTO media (filename, original_name, mime_type, size, url, alt_text) VALUES (?, ?, ?, ?, ?, ?)",
      [`portfolio/${fileName}`, `portfolio-preview${extension}`, contentType.split(";")[0], buffer.length, publicUrl, "Preview proiect"]
    );

    return res.status(201).json({ ok: true, url: publicUrl, mime_type: contentType.split(";")[0] });
  } catch (error) {
    console.error("[portfolio.preview] error", error);
    return res
      .status(502)
      .json({ error: "Nu am putut genera preview-ul automat. Poti incerca din nou sau poti urca o imagine manual." });
  } finally {
    clearTimeout(timeout);
  }
}));

module.exports = {
  publicRouter,
  adminRouter
};
