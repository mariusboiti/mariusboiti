const express = require("express");
const rateLimit = require("express-rate-limit");
const { getDb, nowIso, stringifyJsonField, parseJsonField } = require("../database");
const { sanitizeNullable, sanitizeText, toBoolInt, toInt, slugify } = require("../utils/security");
const { normalizeDeep } = require("../utils/encoding");
const { analyzeBlogPost } = require("../services/seoAnalyzer");
const { ensureUniqueSlug } = require("../utils/slugUtils");
const aiService = require("../services/aiService");
const { asyncHandler } = require("../utils/asyncHandler");

const publicRouter = express.Router();
const adminRouter = express.Router();

const VALID_STATUSES = new Set(["draft", "published", "scheduled", "archived"]);
const VALID_PROVIDERS = new Set(["openai", "gemini"]);
const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const DEFAULT_OPENAI_TEXT_MODEL = "gpt-4o-mini";
const DEFAULT_GEMINI_IMAGE_MODEL = "imagen-3.0-generate-002";
const DEFAULT_OPENAI_IMAGE_MODEL = "dall-e-3";

const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: "Prea multe cereri AI într-un timp scurt.",
    error: "AI_RATE_LIMIT"
  }
});

function ok(res, data, message = "OK", status = 200) {
  return res.status(status).json({
    success: true,
    data,
    message,
    error: null
  });
}

function fail(res, status, message, error = null) {
  return res.status(status).json({
    success: false,
    data: null,
    message,
    error: error || message
  });
}

function sanitizeHtmlContent(input) {
  const raw = String(input || "");
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeText(v, 80)).filter(Boolean);
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => sanitizeText(v, 80)).filter(Boolean);
      }
    } catch (_e) {
      // no-op
    }
    return raw
      .split(",")
      .map((v) => sanitizeText(v, 80))
      .filter(Boolean);
  }
  return [];
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadingTime(content) {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  if (!words) return 1;
  return Math.max(1, Math.ceil(words / 220));
}

// ensureUniqueSlug is now imported from utils/slugUtils.js

async function getAiSettingsRow(db) {
  let row = await db.get("SELECT * FROM ai_settings ORDER BY id ASC LIMIT 1");
  if (!row) {
    const provider = VALID_PROVIDERS.has(process.env.AI_DEFAULT_PROVIDER) ? process.env.AI_DEFAULT_PROVIDER : "gemini";
    const model = provider === "openai"
      ? (process.env.OPENAI_MODEL || DEFAULT_OPENAI_TEXT_MODEL)
      : (process.env.GEMINI_MODEL || DEFAULT_GEMINI_TEXT_MODEL);
    await db.run(
      `INSERT INTO ai_settings (provider, model, temperature, max_tokens, system_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [provider, model, 0.7, 1200, "Ești copywriter SEO în limba română. Scrii clar, profesionist și orientat spre conversie.", nowIso(), nowIso()]
    );
    row = await db.get("SELECT * FROM ai_settings ORDER BY id ASC LIMIT 1");
  }
  const normalizedGeminiTextModel = row.gemini_text_model === "gemini-2.0-flash"
    ? DEFAULT_GEMINI_TEXT_MODEL
    : (row.gemini_text_model || DEFAULT_GEMINI_TEXT_MODEL);
  const normalizedOpenaiTextModel = row.openai_text_model || DEFAULT_OPENAI_TEXT_MODEL;
  const normalizedGeminiImageModel = row.gemini_image_model || DEFAULT_GEMINI_IMAGE_MODEL;
  const normalizedOpenaiImageModel = row.openai_image_model || DEFAULT_OPENAI_IMAGE_MODEL;
  const normalizedProvider = VALID_PROVIDERS.has(row.provider) ? row.provider : "gemini";
  return {
    ...row,
    provider: normalizedProvider,
    model: normalizedProvider === "openai" ? normalizedOpenaiTextModel : normalizedGeminiTextModel,
    gemini_text_model: normalizedGeminiTextModel,
    openai_text_model: normalizedOpenaiTextModel,
    gemini_image_model: normalizedGeminiImageModel,
    openai_image_model: normalizedOpenaiImageModel
  };
}

function maskKey(key) {
  if (!key || String(key).trim().length < 8) return "";
  const k = String(key).trim();
  return `${k.slice(0, 4)}${"•".repeat(Math.min(20, k.length - 8))}${k.slice(-4)}`;
}

function mapCategory(row) {
  if (!row) return null;
  return normalizeDeep({
    ...row,
    is_active: Boolean(row.is_active)
  });
}

function mapPost(row) {
  if (!row) return null;
  return normalizeDeep({
    ...row,
    tags_json: parseJsonField(row.tags_json, []),
    seo_analysis_json: parseJsonField(row.seo_analysis_json, null),
    category: row.category_id
      ? {
          id: row.category_id,
          name: row.category_name || null,
        slug: row.category_slug || null
      }
      : null
  });
}

function buildPostPayload(body = {}) {
  const title = sanitizeText(body.title, 255);
  const rawSlug = sanitizeText(body.slug || title, 255);
  const status = sanitizeText(body.status || "draft", 40).toLowerCase();
  const categoryId = body.category_id ? toInt(body.category_id, 0) : null;
  const tags = parseTags(body.tags_json);
  const publishedAtRaw = sanitizeNullable(body.published_at, 60);

  return {
    title,
    slug: rawSlug,
    excerpt: sanitizeNullable(body.excerpt, 2000),
    content: sanitizeHtmlContent(body.content),
    status: VALID_STATUSES.has(status) ? status : "draft",
    featured_image: sanitizeNullable(body.featured_image, 500),
    featured_image_alt: sanitizeNullable(body.featured_image_alt, 255),
    category_id: categoryId || null,
    tags_json: tags,
    focus_keyword: sanitizeNullable(body.focus_keyword, 255),
    seo_title: sanitizeNullable(body.seo_title, 255),
    seo_description: sanitizeNullable(body.seo_description, 500),
    og_title: sanitizeNullable(body.og_title, 255),
    og_description: sanitizeNullable(body.og_description, 500),
    og_image: sanitizeNullable(body.og_image, 500),
    canonical_url: sanitizeNullable(body.canonical_url, 500),
    robots: sanitizeNullable(body.robots, 120) || "index,follow",
    published_at: publishedAtRaw
  };
}

function parsePageLimit(query = {}) {
  const page = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(30, Math.max(1, toInt(query.limit, 9)));
  return { page, limit, offset: (page - 1) * limit };
}

publicRouter.get("/blog-categories", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all(
    "SELECT * FROM blog_categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC"
  );
  return ok(res, rows.map(mapCategory));
}));

publicRouter.get("/blog", asyncHandler(async (req, res) => {
  const db = await getDb();
  const { page, limit, offset } = parsePageLimit(req.query || {});
  const search = sanitizeText(req.query.search || "", 120);
  const category = sanitizeText(req.query.category || "", 120);
  const tag = sanitizeText(req.query.tag || "", 120).toLowerCase();

  const where = ["p.status = 'published'"];
  const params = [];

  if (search) {
    where.push("(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (category) {
    where.push("(c.slug = ? OR c.name = ?)");
    params.push(category, category);
  }

  if (tag) {
    where.push("LOWER(COALESCE(p.tags_json, '')) LIKE ?");
    params.push(`%${tag}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await db.get(
    `SELECT COUNT(*) AS total
     FROM blog_posts p
     LEFT JOIN blog_categories c ON c.id = p.category_id
     ${whereSql}`,
    params
  );

  // Exclude heavy `content` column from list — full content only needed on detail view
  const rows = await db.all(
    `SELECT
      p.id, p.title, p.slug, p.excerpt, p.status,
      p.featured_image, p.featured_image_alt,
      p.category_id, p.tags_json, p.focus_keyword,
      p.seo_title, p.seo_description, p.og_title, p.og_description, p.og_image,
      p.canonical_url, p.robots, p.seo_score,
      p.reading_time_minutes, p.published_at, p.created_at, p.updated_at,
      c.name AS category_name,
      c.slug AS category_slug
     FROM blog_posts p
     LEFT JOIN blog_categories c ON c.id = p.category_id
     ${whereSql}
     ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return ok(res, {
    items: rows.map(mapPost),
    pagination: {
      page,
      limit,
      total: totalRow?.total || 0,
      totalPages: Math.max(1, Math.ceil((totalRow?.total || 0) / limit))
    }
  });
}));

publicRouter.get("/blog/:slug", asyncHandler(async (req, res) => {
  const db = await getDb();
  const slug = sanitizeText(req.params.slug, 255);
  const row = await db.get(
    `SELECT
      p.*,
      c.name AS category_name,
      c.slug AS category_slug
     FROM blog_posts p
     LEFT JOIN blog_categories c ON c.id = p.category_id
     WHERE p.slug = ? AND p.status = 'published'
     LIMIT 1`,
    [slug]
  );

  if (!row) {
    return fail(res, 404, "Articolul nu a fost găsit.", "NOT_FOUND");
  }

  const similar = await db.all(
    `SELECT id, title, slug, excerpt, featured_image, published_at
     FROM blog_posts
     WHERE status = 'published' AND id <> ?
     ORDER BY COALESCE(published_at, created_at) DESC
     LIMIT 3`,
    [row.id]
  );

  return ok(res, {
    post: mapPost(row),
    similar
  });
}));

adminRouter.get("/blog/posts", asyncHandler(async (req, res) => {
  const db = await getDb();
  const { page, limit, offset } = parsePageLimit(req.query || {});
  const status = sanitizeText(req.query.status || "", 40).toLowerCase();
  const search = sanitizeText(req.query.search || "", 120);
  const categoryId = toInt(req.query.category_id, 0);

  const where = ["1=1"];
  const params = [];

  if (VALID_STATUSES.has(status)) {
    where.push("p.status = ?");
    params.push(status);
  }
  if (search) {
    where.push("(p.title LIKE ? OR p.excerpt LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (categoryId > 0) {
    where.push("p.category_id = ?");
    params.push(categoryId);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const totalRow = await db.get(
    `SELECT COUNT(*) AS total FROM blog_posts p ${whereSql}`,
    params
  );
  const rows = await db.all(
    `SELECT
      p.*,
      c.name AS category_name,
      c.slug AS category_slug
     FROM blog_posts p
     LEFT JOIN blog_categories c ON c.id = p.category_id
     ${whereSql}
     ORDER BY p.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return ok(res, {
    items: rows.map(mapPost),
    pagination: {
      page,
      limit,
      total: totalRow?.total || 0,
      totalPages: Math.max(1, Math.ceil((totalRow?.total || 0) / limit))
    }
  });
}));

adminRouter.post("/blog/posts", asyncHandler(async (req, res) => {
  const db = await getDb();
  const payload = buildPostPayload(req.body || {});
  if (!payload.title) return fail(res, 400, "Titlul este obligatoriu.", "VALIDATION_ERROR");

  if (payload.category_id) {
    const category = await db.get("SELECT id FROM blog_categories WHERE id = ?", [payload.category_id]);
    if (!category) return fail(res, 400, "Categoria selectată nu există.", "INVALID_CATEGORY");
  }

  const slug = await ensureUniqueSlug(db, "blog_posts", payload.slug);
  const readingTime = estimateReadingTime(payload.content);
  const publishedAt = payload.status === "published"
    ? (payload.published_at || nowIso())
    : payload.published_at;
  const analysis = analyzeBlogPost({ ...payload, slug });

  const result = await db.run(
    `INSERT INTO blog_posts
      (title, slug, excerpt, content, status, featured_image, featured_image_alt, category_id, tags_json, focus_keyword, seo_title, seo_description, og_title, og_description, og_image, canonical_url, robots, seo_score, seo_analysis_json, reading_time_minutes, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.title,
      slug,
      payload.excerpt,
      payload.content,
      payload.status,
      payload.featured_image,
      payload.featured_image_alt,
      payload.category_id,
      stringifyJsonField(payload.tags_json),
      payload.focus_keyword,
      payload.seo_title,
      payload.seo_description,
      payload.og_title,
      payload.og_description,
      payload.og_image,
      payload.canonical_url,
      payload.robots,
      analysis.score,
      stringifyJsonField(analysis),
      readingTime,
      publishedAt,
      nowIso(),
      nowIso()
    ]
  );

  const created = await db.get("SELECT * FROM blog_posts WHERE id = ?", [result.lastID]);
  return ok(res, mapPost(created), "Articol creat.", 201);
}));

adminRouter.get("/blog/posts/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const id = toInt(req.params.id, 0);
  const row = await db.get(
    `SELECT
      p.*,
      c.name AS category_name,
      c.slug AS category_slug
     FROM blog_posts p
     LEFT JOIN blog_categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    [id]
  );
  if (!row) return fail(res, 404, "Articolul nu a fost găsit.", "NOT_FOUND");
  return ok(res, mapPost(row));
}));

adminRouter.put("/blog/posts/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const id = toInt(req.params.id, 0);
  const existing = await db.get("SELECT * FROM blog_posts WHERE id = ?", [id]);
  if (!existing) return fail(res, 404, "Articolul nu a fost găsit.", "NOT_FOUND");

  const payload = buildPostPayload(req.body || {});
  if (!payload.title) return fail(res, 400, "Titlul este obligatoriu.", "VALIDATION_ERROR");

  if (payload.category_id) {
    const category = await db.get("SELECT id FROM blog_categories WHERE id = ?", [payload.category_id]);
    if (!category) return fail(res, 400, "Categoria selectată nu există.", "INVALID_CATEGORY");
  }

  const slug = await ensureUniqueSlug(db, "blog_posts", payload.slug, id);
  const readingTime = estimateReadingTime(payload.content);
  const publishedAt = payload.status === "published"
    ? (payload.published_at || existing.published_at || nowIso())
    : payload.published_at;
  const analysis = analyzeBlogPost({ ...payload, slug });

  await db.run(
    `UPDATE blog_posts SET
      title=?, slug=?, excerpt=?, content=?, status=?, featured_image=?, featured_image_alt=?, category_id=?, tags_json=?, focus_keyword=?, seo_title=?, seo_description=?, og_title=?, og_description=?, og_image=?, canonical_url=?, robots=?, seo_score=?, seo_analysis_json=?, reading_time_minutes=?, published_at=?, updated_at=?
     WHERE id=?`,
    [
      payload.title,
      slug,
      payload.excerpt,
      payload.content,
      payload.status,
      payload.featured_image,
      payload.featured_image_alt,
      payload.category_id,
      stringifyJsonField(payload.tags_json),
      payload.focus_keyword,
      payload.seo_title,
      payload.seo_description,
      payload.og_title,
      payload.og_description,
      payload.og_image,
      payload.canonical_url,
      payload.robots,
      analysis.score,
      stringifyJsonField(analysis),
      readingTime,
      publishedAt,
      nowIso(),
      id
    ]
  );

  const updated = await db.get("SELECT * FROM blog_posts WHERE id = ?", [id]);
  return ok(res, mapPost(updated), "Articol actualizat.");
}));

adminRouter.delete("/blog/posts/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const id = toInt(req.params.id, 0);
  await db.run("DELETE FROM blog_posts WHERE id = ?", [id]);
  return ok(res, { id }, "Articol șters.");
}));

adminRouter.get("/blog/categories", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const rows = await db.all("SELECT * FROM blog_categories ORDER BY sort_order ASC, name ASC");
  return ok(res, rows.map(mapCategory));
}));

adminRouter.post("/blog/categories", asyncHandler(async (req, res) => {
  const db = await getDb();
  const name = sanitizeText(req.body.name, 120);
  if (!name) return fail(res, 400, "Numele categoriei este obligatoriu.", "VALIDATION_ERROR");
  const slug = await ensureUniqueSlug(db, "blog_categories", req.body.slug || name);

  const result = await db.run(
    `INSERT INTO blog_categories (name, slug, description, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      slug,
      sanitizeNullable(req.body.description, 800),
      toInt(req.body.sort_order, 0),
      toBoolInt(req.body.is_active),
      nowIso(),
      nowIso()
    ]
  );

  const created = await db.get("SELECT * FROM blog_categories WHERE id = ?", [result.lastID]);
  return ok(res, mapCategory(created), "Categorie creată.", 201);
}));

adminRouter.put("/blog/categories/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const id = toInt(req.params.id, 0);
  const existing = await db.get("SELECT * FROM blog_categories WHERE id = ?", [id]);
  if (!existing) return fail(res, 404, "Categoria nu a fost găsită.", "NOT_FOUND");

  const name = sanitizeText(req.body.name, 120);
  if (!name) return fail(res, 400, "Numele categoriei este obligatoriu.", "VALIDATION_ERROR");
  const slug = await ensureUniqueSlug(db, "blog_categories", req.body.slug || name, id);

  await db.run(
    `UPDATE blog_categories SET
      name=?, slug=?, description=?, sort_order=?, is_active=?, updated_at=?
     WHERE id=?`,
    [
      name,
      slug,
      sanitizeNullable(req.body.description, 800),
      toInt(req.body.sort_order, 0),
      toBoolInt(req.body.is_active),
      nowIso(),
      id
    ]
  );

  const updated = await db.get("SELECT * FROM blog_categories WHERE id = ?", [id]);
  return ok(res, mapCategory(updated), "Categorie actualizată.");
}));

adminRouter.delete("/blog/categories/:id", asyncHandler(async (req, res) => {
  const db = await getDb();
  const id = toInt(req.params.id, 0);
  await db.run("UPDATE blog_posts SET category_id = NULL WHERE category_id = ?", [id]);
  await db.run("DELETE FROM blog_categories WHERE id = ?", [id]);
  return ok(res, { id }, "Categorie ștearsă.");
}));

adminRouter.post("/blog/posts/:id/analyze-seo", asyncHandler(async (req, res) => {
  const db = await getDb();
  const id = toInt(req.params.id, 0);
  const row = await db.get("SELECT * FROM blog_posts WHERE id = ?", [id]);
  if (!row) return fail(res, 404, "Articolul nu a fost găsit.", "NOT_FOUND");

  const analysis = analyzeBlogPost(row);
  await db.run(
    "UPDATE blog_posts SET seo_score = ?, seo_analysis_json = ?, updated_at = ? WHERE id = ?",
    [analysis.score, stringifyJsonField(analysis), nowIso(), id]
  );

  return ok(res, analysis, "Analiza SEO a fost actualizată.");
}));

adminRouter.get("/ai/settings", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const settings = await getAiSettingsRow(db);
  const { gemini_api_key, openai_api_key, ...safeSettings } = settings;
  return ok(res, {
    ...safeSettings,
    gemini_key_masked: maskKey(gemini_api_key || process.env.GEMINI_API_KEY),
    openai_key_masked: maskKey(openai_api_key || process.env.OPENAI_API_KEY),
    api_key_status: {
      gemini: Boolean(gemini_api_key || process.env.GEMINI_API_KEY),
      openai: Boolean(openai_api_key || process.env.OPENAI_API_KEY)
    }
  });
}));

adminRouter.put("/ai/settings", asyncHandler(async (req, res) => {
  const db = await getDb();
  const current = await getAiSettingsRow(db);
  const provider = VALID_PROVIDERS.has(req.body.provider) ? req.body.provider : current.provider;
  const temperature = Number.isFinite(Number(req.body.temperature)) ? Number(req.body.temperature) : Number(current.temperature || 0.7);
  const maxTokens = Number.isFinite(Number(req.body.max_tokens)) ? Number(req.body.max_tokens) : Number(current.max_tokens || 1200);
  const systemPrompt = sanitizeNullable(req.body.system_prompt, 6000);

  // Model fields
  const geminiTextModel = sanitizeText(req.body.gemini_text_model || current.gemini_text_model || DEFAULT_GEMINI_TEXT_MODEL, 120);
  const openaiTextModel = sanitizeText(req.body.openai_text_model || current.openai_text_model || DEFAULT_OPENAI_TEXT_MODEL, 120);
  const geminiImageModel = sanitizeText(req.body.gemini_image_model || current.gemini_image_model || DEFAULT_GEMINI_IMAGE_MODEL, 120);
  const openaiImageModel = sanitizeText(req.body.openai_image_model || current.openai_image_model || DEFAULT_OPENAI_IMAGE_MODEL, 120);

  // API keys — only update if a non-placeholder value is sent
  const newGeminiKey = sanitizeText(req.body.gemini_api_key || "", 500);
  const newOpenaiKey = sanitizeText(req.body.openai_api_key || "", 500);
  const isMasked = (v) => v && /^[A-Za-z0-9]{2,8}•/.test(v); // looks like a masked key

  const geminiKey = (newGeminiKey && !isMasked(newGeminiKey)) ? newGeminiKey : (current.gemini_api_key || null);
  const openaiKey = (newOpenaiKey && !isMasked(newOpenaiKey)) ? newOpenaiKey : (current.openai_api_key || null);

  // model column kept for legacy compat — set from provider-specific field
  const legacyModel = provider === "openai" ? openaiTextModel : geminiTextModel;

  await db.run(
    `UPDATE ai_settings SET
      provider=?, model=?, temperature=?, max_tokens=?, system_prompt=?,
      gemini_api_key=?, openai_api_key=?,
      gemini_text_model=?, openai_text_model=?,
      gemini_image_model=?, openai_image_model=?,
      updated_at=? WHERE id=?`,
    [provider, legacyModel, temperature, maxTokens, systemPrompt,
     geminiKey, openaiKey, geminiTextModel, openaiTextModel, geminiImageModel, openaiImageModel,
     nowIso(), current.id]
  );

  const updated = await getAiSettingsRow(db);
  const { gemini_api_key: gak, openai_api_key: oak, ...safeUpdated } = updated;
  return ok(res, {
    ...safeUpdated,
    gemini_key_masked: maskKey(gak || process.env.GEMINI_API_KEY),
    openai_key_masked: maskKey(oak || process.env.OPENAI_API_KEY),
    api_key_status: {
      gemini: Boolean(gak || process.env.GEMINI_API_KEY),
      openai: Boolean(oak || process.env.OPENAI_API_KEY)
    }
  }, "Setările AI au fost salvate.");
}));

function resolveProviderAndModel(payload = {}, settings = {}) {
  const providerFromPayload = sanitizeText(payload.provider || "", 20).toLowerCase();
  const provider = VALID_PROVIDERS.has(providerFromPayload)
    ? providerFromPayload
    : (VALID_PROVIDERS.has(settings.provider) ? settings.provider : (process.env.AI_DEFAULT_PROVIDER || "gemini"));

  // Choose the correct text model for this provider
  const dbTextModel = provider === "openai"
    ? (settings.openai_text_model || settings.model || DEFAULT_OPENAI_TEXT_MODEL)
    : (settings.gemini_text_model || settings.model || DEFAULT_GEMINI_TEXT_MODEL);
  const envModel = provider === "openai" ? process.env.OPENAI_MODEL : process.env.GEMINI_MODEL;
  let model = sanitizeText(payload.model || dbTextModel || envModel || "", 120);
  if (provider === "gemini" && model === "gemini-2.0-flash") {
    model = DEFAULT_GEMINI_TEXT_MODEL;
  }

  // Resolve API key: DB key takes precedence over env var
  const dbKey = provider === "openai" ? settings.openai_api_key : settings.gemini_api_key;
  const apiKey = dbKey || (provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY) || "";

  return {
    provider,
    model,
    apiKey,
    temperature: Number.isFinite(Number(payload.temperature)) ? Number(payload.temperature) : Number(settings.temperature || 0.7),
    maxTokens: Number.isFinite(Number(payload.maxTokens || payload.max_tokens))
      ? Number(payload.maxTokens || payload.max_tokens)
      : Number(settings.max_tokens || 1200),
    systemPrompt: sanitizeNullable(payload.systemPrompt || payload.system_prompt || settings.system_prompt, 6000) || undefined
  };
}

function resolveImageConfig(payload = {}, settings = {}) {
  const provider = VALID_PROVIDERS.has(sanitizeText(payload.provider || "", 20).toLowerCase())
    ? sanitizeText(payload.provider, 20).toLowerCase()
    : (settings.provider || "openai");

  const dbImageModel = provider === "openai"
    ? (settings.openai_image_model || "dall-e-3")
    : (settings.gemini_image_model || "imagen-3.0-generate-002");
  const model = sanitizeText(payload.model || dbImageModel, 120);

  const dbKey = provider === "openai" ? settings.openai_api_key : settings.gemini_api_key;
  const apiKey = dbKey || (provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY) || "";

  return { provider, model, apiKey };
}

async function handleAiAction(req, res, actionFn, message) {
  try {
    const db = await getDb();
    const settings = await getAiSettingsRow(db);
    const config = resolveProviderAndModel(req.body || {}, settings);
    const result = await actionFn({ ...(req.body || {}), ...config });
    return ok(res, result, message);
  } catch (error) {
    const status = Number(error?.statusCode) || 400;
    return fail(res, status, error.message || "A apărut o eroare la procesarea AI.", "AI_ERROR");
  }
}

adminRouter.post("/ai/blog/generate-outline", aiLimiter, (req, res) =>
  handleAiAction(req, res, aiService.generateBlogOutline, "Outline generat.")
);
adminRouter.post("/ai/blog/generate-title-excerpt", aiLimiter, (req, res) =>
  handleAiAction(req, res, aiService.generateBlogTitleExcerpt, "Titlu și excerpt generate.")
);
adminRouter.post("/ai/blog/generate-article", aiLimiter, (req, res) =>
  handleAiAction(req, res, aiService.generateBlogArticle, "Articol generat.")
);
adminRouter.post("/ai/blog/improve-content", aiLimiter, (req, res) =>
  handleAiAction(req, res, aiService.improveBlogContent, "Conținut îmbunătățit.")
);
adminRouter.post("/ai/blog/generate-seo", aiLimiter, (req, res) =>
  handleAiAction(req, res, aiService.generateSeoMetadata, "SEO metadata generat.")
);
adminRouter.post("/ai/blog/fix-seo", aiLimiter, (req, res) =>
  handleAiAction(req, res, aiService.fixSeoIssues, "Propuneri SEO generate.")
);
adminRouter.post("/ai/blog/fix-seo-item", aiLimiter, (req, res) =>
  handleAiAction(req, res, aiService.fixSeoIssueItem, "Fix SEO item aplicat.")
);
adminRouter.post("/ai/blog/generate-field", aiLimiter, (req, res) =>
  handleAiAction(req, res, aiService.generateBlogField, "Câmp generat.")
);
// Stateless live analysis — runs on posted form data, no DB write, works for unsaved posts
adminRouter.post("/ai/blog/analyze", (req, res) => {
  try {
    const b = req.body || {};
    const postLike = {
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      content: b.content,
      focus_keyword: b.focus_keyword ?? b.focusKeyword,
      seo_title: b.seo_title ?? b.seoTitle,
      seo_description: b.seo_description ?? b.seoDescription,
      featured_image: b.featured_image ?? b.featuredImage,
      featured_image_alt: b.featured_image_alt ?? b.featuredImageAlt
    };
    const analysis = analyzeBlogPost(postLike);
    return ok(res, analysis, "Analiză SEO live generată.");
  } catch (error) {
    return fail(res, 400, error.message || "Eroare la analiza SEO.", "AI_ERROR");
  }
});
adminRouter.post("/ai/blog/generate-image-prompt", aiLimiter, (req, res) =>
  handleAiAction(req, res, aiService.generateImagePrompt, "Prompt imagine generat.")
);
adminRouter.post("/ai/blog/generate-image", aiLimiter, async (req, res) => {
  try {
    const db = await getDb();
    const settings = await getAiSettingsRow(db);
    const { provider, model, apiKey } = resolveImageConfig(req.body || {}, settings);
    const prompt = sanitizeNullable(req.body.prompt, 2000);
    if (!prompt) return fail(res, 400, "Prompt-ul pentru imagine este obligatoriu.", "MISSING_PROMPT");
    const result = await aiService.generateImage({ provider, model, prompt, apiKey });
    return ok(res, result, "Imaginea a fost generată.");
  } catch (error) {
    return fail(res, 400, error.message || "Eroare la generarea imaginii.", "AI_ERROR");
  }
});

module.exports = {
  publicRouter,
  adminRouter
};
