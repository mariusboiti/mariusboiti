/**
 * Shared slug utilities — single source of truth for both blog.js and portfolio.js.
 */

const { slugify } = require("./security");

const MAX_SLUG_ATTEMPTS = 200;

/**
 * Generates a slug that is unique within `table`, avoiding `currentId` (for updates).
 * Falls back to a timestamp suffix after MAX_SLUG_ATTEMPTS to prevent unbounded loops.
 *
 * @param {import('sqlite').Database} db
 * @param {string} table  — table name (must be a safe constant, never user input)
 * @param {string} slug   — desired slug (will be slugified)
 * @param {number|null} currentId — row being updated (its own slug is not a conflict)
 * @returns {Promise<string>}
 */
async function ensureUniqueSlug(db, table, slug, currentId = null) {
  let base = slugify(slug);
  if (!base) base = "item";

  let candidate = base;
  let attempt = 2;

  while (attempt <= MAX_SLUG_ATTEMPTS) {
    const row = await db.get(`SELECT id FROM ${table} WHERE slug = ?`, [candidate]);
    if (!row || (currentId !== null && row.id === currentId)) {
      return candidate;
    }
    candidate = `${base}-${attempt}`;
    attempt += 1;
  }

  // Safety fallback: append timestamp to guarantee uniqueness
  return `${base}-${Date.now()}`;
}

module.exports = { ensureUniqueSlug };
