function sanitizeText(value, maxLength = 5000) {
  if (value === undefined || value === null) return "";
  const str = String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .trim();
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

function sanitizeNullable(value, maxLength = 5000) {
  const clean = sanitizeText(value, maxLength);
  return clean.length ? clean : null;
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBoolInt(value) {
  if (value === true || value === "true" || value === 1 || value === "1") return 1;
  return 0;
}

function parseJsonInput(value, fallback = []) {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;

  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch (_error) {
    if (typeof value === "string") {
      return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }
    return fallback;
  }
}

function slugify(value) {
  return sanitizeText(value, 200)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

module.exports = {
  sanitizeText,
  sanitizeNullable,
  toInt,
  toBoolInt,
  parseJsonInput,
  slugify,
  validateEmail
};
