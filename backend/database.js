const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { REPLACEMENTS } = require("./utils/encoding");

const DEFAULT_DB_PATH = path.resolve(process.cwd(), process.env.DATABASE_PATH || "./backend/data/site.db");

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(path.dirname(DEFAULT_DB_PATH), { recursive: true });

  dbInstance = await open({
    filename: DEFAULT_DB_PATH,
    driver: sqlite3.Database
  });

  await dbInstance.exec("PRAGMA foreign_keys = ON;");
  return dbInstance;
}

async function initSchema() {
  const db = await getDb();
  const schemaPath = path.resolve(process.cwd(), "backend/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await db.exec(schemaSql);
  await runMigrations(db);
}

async function runMigrations(db) {
  const siteSettingsColumns = await db.all("PRAGMA table_info(site_settings)");
  const hasYoutubeUrl = siteSettingsColumns.some((column) => column.name === "youtube_url");
  if (!hasYoutubeUrl) {
    await db.exec("ALTER TABLE site_settings ADD COLUMN youtube_url TEXT");
  }

  const leadColumns = await db.all("PRAGMA table_info(leads)");
  const hasBudgetConfirmed = leadColumns.some((column) => column.name === "budget_confirmed");
  if (!hasBudgetConfirmed) {
    await db.exec("ALTER TABLE leads ADD COLUMN budget_confirmed INTEGER NOT NULL DEFAULT 0");
  }

  const aiSettingsColumns = await db.all("PRAGMA table_info(ai_settings)");
  const ensureAiSettingsColumn = async (name, sqlType) => {
    if (!aiSettingsColumns.some((column) => column.name === name)) {
      await db.exec(`ALTER TABLE ai_settings ADD COLUMN ${name} ${sqlType}`);
    }
  };

  await ensureAiSettingsColumn("gemini_api_key", "TEXT");
  await ensureAiSettingsColumn("openai_api_key", "TEXT");
  await ensureAiSettingsColumn("gemini_text_model", "TEXT");
  await ensureAiSettingsColumn("openai_text_model", "TEXT");
  await ensureAiSettingsColumn("gemini_image_model", "TEXT");
  await ensureAiSettingsColumn("openai_image_model", "TEXT");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS blog_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT,
      content TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'scheduled', 'archived')),
      featured_image TEXT,
      featured_image_alt TEXT,
      category_id INTEGER,
      tags_json TEXT,
      focus_keyword TEXT,
      seo_title TEXT,
      seo_description TEXT,
      og_title TEXT,
      og_description TEXT,
      og_image TEXT,
      canonical_url TEXT,
      robots TEXT,
      seo_score INTEGER,
      seo_analysis_json TEXT,
      reading_time_minutes INTEGER,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE SET NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL DEFAULT 'gemini' CHECK(provider IN ('openai', 'gemini')),
      model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
      temperature REAL NOT NULL DEFAULT 0.7,
      max_tokens INTEGER NOT NULL DEFAULT 1200,
      system_prompt TEXT,
      gemini_api_key TEXT,
      openai_api_key TEXT,
      gemini_text_model TEXT,
      openai_text_model TEXT,
      gemini_image_model TEXT,
      openai_image_model TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS project_logos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      alt_text TEXT,
      project_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_scale INTEGER NOT NULL DEFAULT 100,
      background_mode TEXT NOT NULL DEFAULT 'soft',
      invert_on_dark INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const projectLogoColumns = await db.all("PRAGMA table_info(project_logos)");
  if (!projectLogoColumns.some((column) => column.name === "display_scale")) {
    await db.exec("ALTER TABLE project_logos ADD COLUMN display_scale INTEGER NOT NULL DEFAULT 100");
  }
  if (!projectLogoColumns.some((column) => column.name === "background_mode")) {
    await db.exec("ALTER TABLE project_logos ADD COLUMN background_mode TEXT NOT NULL DEFAULT 'soft'");
  }
  if (!projectLogoColumns.some((column) => column.name === "invert_on_dark")) {
    await db.exec("ALTER TABLE project_logos ADD COLUMN invert_on_dark INTEGER NOT NULL DEFAULT 0");
  }

  const portfolioColumns = await db.all("PRAGMA table_info(portfolio_projects)");
  const ensurePortfolioColumn = async (name, sqlType) => {
    if (!portfolioColumns.some((column) => column.name === name)) {
      await db.exec(`ALTER TABLE portfolio_projects ADD COLUMN ${name} ${sqlType}`);
    }
  };

  await ensurePortfolioColumn("long_description", "TEXT");
  await ensurePortfolioColumn("live_url", "TEXT");
  await ensurePortfolioColumn("image_alt", "TEXT");
  await ensurePortfolioColumn("client_name", "TEXT");
  await ensurePortfolioColumn("initial_problem", "TEXT");
  await ensurePortfolioColumn("target_audience", "TEXT");
  await ensurePortfolioColumn("tone_style", "TEXT");
  await ensurePortfolioColumn("built_items_detailed_json", "TEXT");
  await ensurePortfolioColumn("results_items_json", "TEXT");
  await ensurePortfolioColumn("gallery_json", "TEXT");
  await ensurePortfolioColumn("project_sections_json", "TEXT");
  await ensurePortfolioColumn("hero_title", "TEXT");
  await ensurePortfolioColumn("hero_subtitle", "TEXT");
  await ensurePortfolioColumn("challenge_title", "TEXT");
  await ensurePortfolioColumn("challenge_text", "TEXT");
  await ensurePortfolioColumn("solution_title", "TEXT");
  await ensurePortfolioColumn("solution_text", "TEXT");
  await ensurePortfolioColumn("results_title", "TEXT");
  await ensurePortfolioColumn("results_text", "TEXT");
  await ensurePortfolioColumn("cta_title", "TEXT");
  await ensurePortfolioColumn("cta_text", "TEXT");
  await ensurePortfolioColumn("cta_button_text", "TEXT");
  await ensurePortfolioColumn("cta_button_url", "TEXT");
  await ensurePortfolioColumn("og_image", "TEXT");
  await ensurePortfolioColumn("canonical_url", "TEXT");
  await ensurePortfolioColumn("focus_keyword", "TEXT");
  await ensurePortfolioColumn("robots", "TEXT");

  const moveOnSocial = await db.get("SELECT id FROM portfolio_projects WHERE slug = 'moveonsocial' LIMIT 1");
  if (!moveOnSocial) {
    await db.run(
      `INSERT INTO portfolio_projects
      (title, slug, project_type, short_description, objective, built_items_json, results, technologies_json, sort_order, is_featured, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "MoveOnSocial",
        "moveonsocial",
        "Site servicii social media",
        "Site de prezentare pentru servicii social media, orientat pe claritate și lead-uri.",
        "Comunicare clară a ofertei și traseu simplu spre contact.",
        JSON.stringify(["Structură servicii", "Secțiuni de încredere", "Formular contact", "Design responsive"]),
        "Flux mai direct de la vizitator la cerere de colaborare.",
        JSON.stringify(["HTML", "CSS", "JavaScript"]),
        5,
        0,
        1,
        nowIso(),
        nowIso()
      ]
    );
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS google_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_name TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      review_text TEXT,
      reviewer_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const reviewCount = await db.get("SELECT COUNT(*) as cnt FROM google_reviews");
  if (reviewCount.cnt === 0) {
    const googleMapsUrl = "https://www.google.com/maps/place/Marius+Boiti+Studio/@45.9829471,24.2652369,8.25z/data=!4m18!1m9!3m8!1s0xaa0b29cea216664b:0x23844c3754a1fefe!2sMarius+Boiti+Studio!8m2!3d45.9425072!4d25.0201084!9m1!1b1!16s%2Fg%2F11z8k4kmkk!3m7!1s0xaa0b29cea216664b:0x23844c3754a1fefe!8m2!3d45.9425072!4d25.0201084!9m1!1b1!16s%2Fg%2F11z8k4kmkk?entry=ttu";
    await db.run(
      `INSERT INTO google_reviews (reviewer_name, rating, review_text, reviewer_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
      ["Bogdan Moldovan", 5, "", googleMapsUrl, 1, 1]
    );
    await db.run(
      `INSERT INTO google_reviews (reviewer_name, rating, review_text, reviewer_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
      ["Loren Morar", 5, "O experiență de nota 10! Marius Boiti Studio a dat dovadă de profesionalism, promptitudine și seriozitate. Site-ul a fost creat rapid, exact cum am planificat. Îl recomand cu toată încrederea!", googleMapsUrl, 2, 1]
    );
    await db.run(
      `INSERT INTO google_reviews (reviewer_name, rating, review_text, reviewer_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
      ["Cristian Madar", 5, "Am colaborat cu Marius Boiti pentru dezvoltarea unui site web de la zero și pot spune că experiența a fost excelentă. A înțeles rapid ce îmi doream și a creat site-ul exact conform cerințelor mele. Pe toată durata proiectului a demonstrat profesionalism, seriozitate și atenție la detalii. Comunicarea a fost foarte bună, termenul de livrare scurt, iar prețul mai mult decât corect pentru calitatea serviciilor oferite. Îl recomand cu căldură oricui are nevoie de servicii de web design și dezvoltare.", googleMapsUrl, 3, 1]
    );
  }

  await repairEncodingIssues(db);
}

async function repairEncodingIssues(db) {
  const tableRows = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

  for (const { name: table } of tableRows) {
    const columns = await db.all(`PRAGMA table_info(${table})`);
    const textColumns = columns
      .filter((column) => String(column.type || "").toUpperCase().includes("TEXT"))
      .map((column) => column.name);
    if (!textColumns.length) continue;

    const rows = await db.all(`SELECT rowid AS _rowid, * FROM ${table}`);
    for (const row of rows) {
      const updates = {};
      for (const column of textColumns) {
        const value = row[column];
        if (typeof value !== "string" || !value) continue;

        let fixed = value;
        for (const [from, to] of REPLACEMENTS) {
          if (fixed.includes(from)) {
            fixed = fixed.split(from).join(to);
          }
        }
        if (fixed !== value) {
          updates[column] = fixed;
        }
      }

      const changedColumns = Object.keys(updates);
      if (!changedColumns.length) continue;

      const setClauses = changedColumns.map((column) => `${column} = ?`);
      const args = changedColumns.map((column) => updates[column]);

      if (columns.some((column) => column.name === "updated_at")) {
        setClauses.push("updated_at = ?");
        args.push(nowIso());
      }

      const useId = columns.some((column) => column.name === "id") && row.id !== undefined && row.id !== null;
      args.push(useId ? row.id : row._rowid);
      await db.run(`UPDATE ${table} SET ${setClauses.join(", ")} WHERE ${useId ? "id" : "rowid"} = ?`, args);
    }
  }
}

async function resetDatabase() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }

  if (fs.existsSync(DEFAULT_DB_PATH)) {
    fs.unlinkSync(DEFAULT_DB_PATH);
  }

  await initSchema();
}

function nowIso() {
  return new Date().toISOString();
}

function parseJsonField(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function stringifyJsonField(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

module.exports = {
  getDb,
  initSchema,
  resetDatabase,
  nowIso,
  parseJsonField,
  stringifyJsonField,
  DEFAULT_DB_PATH
};
