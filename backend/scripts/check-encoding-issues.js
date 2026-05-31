const { getDb } = require("../database");

const TABLES = [
  "site_settings",
  "homepage_sections",
  "services",
  "portfolio_projects",
  "packages",
  "faq_items",
  "calculator_options",
  "calculator_settings",
  "seo_pages"
];

const SUSPECT_PATTERNS = [
  { label: "replacement-char", regex: /\uFFFD/g },
  { label: "question-mark-inside-word", regex: /\b[\p{L}]+\?[\p{L}]+\b/gu },
  { label: "known:clien?i", regex: /clien\?i/gi },
  { label: "known:mi?ca", regex: /mi\?ca/gi },
  { label: "known:sec?iuni", regex: /sec\?iuni/gi },
  { label: "known:v?nzare", regex: /v\?nzare/gi },
  { label: "known:p?na", regex: /p\?na/gi },
  { label: "known:v�nzare", regex: /v�nzare/gi },
  { label: "known:p�na", regex: /p�na/gi }
];

function summarize(value) {
  return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}

function isUrlLike(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

async function main() {
  const db = await getDb();
  let issueCount = 0;

  for (const table of TABLES) {
    const columns = await db.all(`PRAGMA table_info(${table})`);
    const textColumns = columns.filter((col) => /TEXT/i.test(col.type)).map((col) => col.name);
    if (!textColumns.length) continue;

    const rows = await db.all(`SELECT rowid AS _rowid, * FROM ${table}`);
    for (const row of rows) {
      for (const col of textColumns) {
        const value = row[col];
        if (typeof value !== "string" || !value.length) continue;

        const matches = SUSPECT_PATTERNS
          .filter((entry) => {
            if (entry.label === "question-mark-inside-word" && isUrlLike(value)) {
              return false;
            }
            return entry.regex.test(value);
          })
          .map((entry) => entry.label);
        SUSPECT_PATTERNS.forEach((entry) => {
          entry.regex.lastIndex = 0;
        });

        if (!matches.length) continue;

        issueCount += 1;
        const rowId = row.id ?? row._rowid;
        console.log(`[${table}] id=${rowId} col=${col} -> ${matches.join(", ")}`);
        console.log(`  ${summarize(value)}`);
      }
    }
  }

  if (!issueCount) {
    console.log("Nu au fost găsite probleme de encoding în tabelele verificate.");
    return;
  }

  console.log(`Total câmpuri suspecte: ${issueCount}`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
