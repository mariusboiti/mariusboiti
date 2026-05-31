const express = require("express");
const { getDb, stringifyJsonField } = require("../database");

const publicRouter = express.Router();
const adminRouter = express.Router();

const EXPORT_TABLES = [
  "site_settings",
  "homepage_sections",
  "services",
  "portfolio_projects",
  "packages",
  "faq_items",
  "calculator_options",
  "calculator_settings",
  "seo_pages",
  "blog_categories",
  "blog_posts",
  "ai_settings"
];

adminRouter.get("/backup/export", async (_req, res) => {
  const db = await getDb();
  const payload = {
    exported_at: new Date().toISOString(),
    version: 1,
    data: {}
  };

  for (const table of EXPORT_TABLES) {
    payload.data[table] = await db.all(`SELECT * FROM ${table} ORDER BY id ASC`);
  }

  return res.json(payload);
});

adminRouter.post("/backup/import", async (req, res) => {
  const input = req.body;
  if (!input || typeof input !== "object" || !input.data || typeof input.data !== "object") {
    return res.status(400).json({ error: "Payload backup invalid." });
  }

  const db = await getDb();
  await db.exec("BEGIN TRANSACTION");

  try {
    for (const table of EXPORT_TABLES) {
      await db.run(`DELETE FROM ${table}`);
    }

    const siteSettings = Array.isArray(input.data.site_settings) ? input.data.site_settings : [];
    for (const row of siteSettings) {
      await db.run(
        `INSERT INTO site_settings
        (site_name, tagline, email, phone, whatsapp, facebook_url, instagram_url, linkedin_url, logo_text, logo_image, favicon, default_meta_title, default_meta_description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.site_name || "",
          row.tagline || null,
          row.email || null,
          row.phone || null,
          row.whatsapp || null,
          row.facebook_url || null,
          row.instagram_url || null,
          row.linkedin_url || null,
          row.logo_text || null,
          row.logo_image || null,
          row.favicon || null,
          row.default_meta_title || null,
          row.default_meta_description || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const homepageSections = Array.isArray(input.data.homepage_sections) ? input.data.homepage_sections : [];
    for (const row of homepageSections) {
      await db.run(
        `INSERT INTO homepage_sections
        (section_key, title, subtitle, content, button_primary_text, button_primary_url, button_secondary_text, button_secondary_url, image_url, extra_json, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.section_key,
          row.title || null,
          row.subtitle || null,
          row.content || null,
          row.button_primary_text || null,
          row.button_primary_url || null,
          row.button_secondary_text || null,
          row.button_secondary_url || null,
          row.image_url || null,
          typeof row.extra_json === "string" ? row.extra_json : stringifyJsonField(row.extra_json || {}),
          Number(row.sort_order || 0),
          row.is_active ? 1 : 0,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const services = Array.isArray(input.data.services) ? input.data.services : [];
    for (const row of services) {
      await db.run(
        `INSERT INTO services
        (title, slug, short_description, long_description, icon, includes_json, suitable_for, cta_text, cta_url, sort_order, is_featured, is_active, seo_title, seo_description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.title || "",
          row.slug || "",
          row.short_description || null,
          row.long_description || null,
          row.icon || null,
          typeof row.includes_json === "string" ? row.includes_json : stringifyJsonField(row.includes_json || []),
          row.suitable_for || null,
          row.cta_text || null,
          row.cta_url || null,
          Number(row.sort_order || 0),
          row.is_featured ? 1 : 0,
          row.is_active ? 1 : 0,
          row.seo_title || null,
          row.seo_description || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const portfolio = Array.isArray(input.data.portfolio_projects) ? input.data.portfolio_projects : [];
    for (const row of portfolio) {
      await db.run(
        `INSERT INTO portfolio_projects
        (title, slug, project_type, short_description, objective, built_items_json, results, technologies_json, image_url, project_url, sort_order, is_featured, is_active, seo_title, seo_description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.title || "",
          row.slug || "",
          row.project_type || null,
          row.short_description || null,
          row.objective || null,
          typeof row.built_items_json === "string" ? row.built_items_json : stringifyJsonField(row.built_items_json || []),
          row.results || null,
          typeof row.technologies_json === "string" ? row.technologies_json : stringifyJsonField(row.technologies_json || []),
          row.image_url || null,
          row.project_url || null,
          Number(row.sort_order || 0),
          row.is_featured ? 1 : 0,
          row.is_active ? 1 : 0,
          row.seo_title || null,
          row.seo_description || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const packages = Array.isArray(input.data.packages) ? input.data.packages : [];
    for (const row of packages) {
      await db.run(
        `INSERT INTO packages
        (name, slug, short_description, price_from, show_price, features_json, cta_text, cta_url, sort_order, is_recommended, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.name || "",
          row.slug || "",
          row.short_description || null,
          row.price_from ?? null,
          row.show_price ? 1 : 0,
          typeof row.features_json === "string" ? row.features_json : stringifyJsonField(row.features_json || []),
          row.cta_text || null,
          row.cta_url || null,
          Number(row.sort_order || 0),
          row.is_recommended ? 1 : 0,
          row.is_active ? 1 : 0,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const faq = Array.isArray(input.data.faq_items) ? input.data.faq_items : [];
    for (const row of faq) {
      await db.run(
        `INSERT INTO faq_items (question, answer, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          row.question || "",
          row.answer || "",
          Number(row.sort_order || 0),
          row.is_active ? 1 : 0,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const calculatorOptions = Array.isArray(input.data.calculator_options) ? input.data.calculator_options : [];
    for (const row of calculatorOptions) {
      await db.run(
        `INSERT INTO calculator_options
        (step_key, step_title, option_label, option_value, option_type, price_add, base_price, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.step_key || "",
          row.step_title || null,
          row.option_label || "",
          row.option_value || null,
          row.option_type === "checkbox" ? "checkbox" : "single",
          Number(row.price_add || 0),
          Number(row.base_price || 0),
          Number(row.sort_order || 0),
          row.is_active ? 1 : 0,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const calculatorSettings = Array.isArray(input.data.calculator_settings) ? input.data.calculator_settings : [];
    for (const row of calculatorSettings) {
      await db.run(
        `INSERT INTO calculator_settings
        (max_multiplier, round_to, start_threshold, business_threshold, premium_threshold, custom_threshold, result_intro_text, under_budget_message, start_message, business_message, premium_message, custom_message, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(row.max_multiplier || 1.2),
          Number(row.round_to || 100),
          Number(row.start_threshold || 2000),
          Number(row.business_threshold || 4500),
          Number(row.premium_threshold || 7000),
          Number(row.custom_threshold || 7000),
          row.result_intro_text || null,
          row.under_budget_message || null,
          row.start_message || null,
          row.business_message || null,
          row.premium_message || null,
          row.custom_message || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const seoPages = Array.isArray(input.data.seo_pages) ? input.data.seo_pages : [];
    for (const row of seoPages) {
      await db.run(
        `INSERT INTO seo_pages
        (page_key, page_title, meta_title, meta_description, og_title, og_description, og_image, canonical_url, robots, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.page_key || "",
          row.page_title || null,
          row.meta_title || null,
          row.meta_description || null,
          row.og_title || null,
          row.og_description || null,
          row.og_image || null,
          row.canonical_url || null,
          row.robots || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const blogCategories = Array.isArray(input.data.blog_categories) ? input.data.blog_categories : [];
    for (const row of blogCategories) {
      await db.run(
        `INSERT INTO blog_categories
        (name, slug, description, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.name || "",
          row.slug || "",
          row.description || null,
          Number(row.sort_order || 0),
          row.is_active ? 1 : 0,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const blogPosts = Array.isArray(input.data.blog_posts) ? input.data.blog_posts : [];
    for (const row of blogPosts) {
      await db.run(
        `INSERT INTO blog_posts
        (title, slug, excerpt, content, status, featured_image, featured_image_alt, category_id, tags_json, focus_keyword, seo_title, seo_description, og_title, og_description, og_image, canonical_url, robots, seo_score, seo_analysis_json, reading_time_minutes, published_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.title || "",
          row.slug || "",
          row.excerpt || null,
          row.content || null,
          row.status || "draft",
          row.featured_image || null,
          row.featured_image_alt || null,
          row.category_id || null,
          typeof row.tags_json === "string" ? row.tags_json : stringifyJsonField(row.tags_json || []),
          row.focus_keyword || null,
          row.seo_title || null,
          row.seo_description || null,
          row.og_title || null,
          row.og_description || null,
          row.og_image || null,
          row.canonical_url || null,
          row.robots || "index,follow",
          row.seo_score ?? null,
          typeof row.seo_analysis_json === "string" ? row.seo_analysis_json : stringifyJsonField(row.seo_analysis_json || null),
          Number(row.reading_time_minutes || 1),
          row.published_at || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    const aiSettings = Array.isArray(input.data.ai_settings) ? input.data.ai_settings : [];
    for (const row of aiSettings) {
      await db.run(
        `INSERT INTO ai_settings
        (provider, model, temperature, max_tokens, system_prompt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.provider || "gemini",
          row.model || "gemini-1.5-flash",
          Number(row.temperature || 0.7),
          Number(row.max_tokens || 1200),
          row.system_prompt || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || new Date().toISOString()
        ]
      );
    }

    await db.exec("COMMIT");
    return res.json({ ok: true, message: "Backup importat cu succes." });
  } catch (error) {
    await db.exec("ROLLBACK");
    return res.status(400).json({ error: `Import eșuat: ${error.message}` });
  }
});

module.exports = {
  publicRouter,
  adminRouter
};
