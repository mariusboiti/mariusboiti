const REPLACEMENTS = [
  ["CautÄƒ", "Caută"],
  ["FiltreazÄƒ", "Filtrează"],
  ["preÈ>", "preț"],
  ["ÃŽ", "Î"],
  ["Ã®", "î"],
  ["Ã¢", "â"],
  ["Ã‚", "Â"],
  ["Ä‚", "Ă"],
  ["Äƒ", "ă"],
  ["È˜", "Ș"],
  ["È™", "ș"],
  ["Èš", "Ț"],
  ["È›", "ț"],
  ["Ã„â€š", "Ă"],
  ["Ã„Æ’", "ă"],
  ["Ã‚Â", " "],
  ["Â ", " "]
];

function normalizeRomanianText(value) {
  if (typeof value !== "string" || !value) return value;
  let output = value;
  for (const [from, to] of REPLACEMENTS) {
    output = output.split(from).join(to);
  }
  return output;
}

function normalizeDeep(value) {
  if (typeof value === "string") {
    return normalizeRomanianText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeDeep(item));
  }
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      next[key] = normalizeDeep(entry);
    }
    return next;
  }
  return value;
}

module.exports = {
  normalizeRomanianText,
  normalizeDeep,
  REPLACEMENTS
};
