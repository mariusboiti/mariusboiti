const { getDb, nowIso } = require("../database");

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

const LITERAL_REPLACEMENTS = [
  [
    "Site-uri moderne care arata bine, se mi?ca rapid ?i aduc clien?i",
    "Site-uri moderne care arată bine, se mișcă rapid și aduc clienți"
  ],
  [
    "Construiesc website-uri clare, responsive ?i orientate spre conversie pentru afaceri mici, freelanceri, servicii locale ?i proiecte digitale. De la structura ?i design p�na la lansare, te ajut sa ai un site care inspira �ncredere ?i transforma vizitatorii �n cereri de oferta.",
    "Construiesc website-uri clare, responsive și orientate spre conversie pentru afaceri mici, freelanceri, servicii locale și proiecte digitale. De la structură și design până la lansare, te ajut să ai un site care inspiră încredere și transformă vizitatorii în cereri de ofertă."
  ],
  ["Landing page de v�nzare", "Landing page de vânzare"],
  ["Sec?iuni beneficii", "Secțiuni beneficii"],
  ["Optimizare reclame", "Optimizare reclame"],
  ["Site de prezentare", "Site de prezentare"],
  ["Formular cerere ofertă", "Formular cerere ofertă"],
  ["Redesign / optimizare site existent", "Redesign / optimizare site existent"],
  ["Calculează prețul", "Calculează prețul"],
  ["Calculează prețul site-ului tău", "Calculează prețul site-ului tău"],
  [
    "Estimare rapidă în 1 minut. Vezi dacă proiectul se potrivește cu bugetul tău.",
    "Estimare rapidă în 1 minut. Vezi dacă proiectul se potrivește cu bugetul tău."
  ],
  ["v�nzare", "vânzare"],
  ["v�ndute", "vândute"],
  ["v�nzari", "vânzări"],
  ["Sec?iuni", "Secțiuni"],
  ["sec?iuni", "secțiuni"],
  ["sec?iune", "secțiune"],
  ["clien?i", "clienți"],
  ["mi?ca", "mișcă"],
  ["p�na", "până"],
  ["C�t", "Cât"],
  ["c�t", "cât"],
  ["�n", "în"],
  ["�N", "ÎN"],
  ["�?i", "îți"],
  ["�mbunata?ire", "îmbunătățire"],
  ["g�ndita", "gândită"],
  ["g�ndire", "gândire"],
  ["ofertă speciala.", "ofertă specială."],
  ["imagine profesionista online.", "imagine profesionistă online."],
  ["Structura persuasiva", "Structură persuasivă"],
  ["�mi", "îmi"],
  ["�mpreuna", "împreună"],
  ["Mul?i", "Mulți"],
  ["Cura?are", "Curățare"],
  ["anima?ii", "animații"],
  ["priorita?ile", "prioritățile"],
  ["în?elege", "înțelege"],
  ["în?eleg", "înțeleg"]
];

const REGEX_REPLACEMENTS = [
  [/\bfunc\?ionalita\?i\b/gi, "funcționalități"],
  [/\bcon\?inut\b/gi, "conținut"],
  [/\bprezen\?a\b/gi, "prezența"],
  [/\bexperien\?a\b/gi, "experiența"],
  [/\baudien\?a\b/gi, "audiența"],
  [/\bpozi\?ionare\b/gi, "poziționare"],
  [/\bac\?iune\b/gi, "acțiune"],
  [/\bac\?iuni\b/gi, "acțiuni"],
  [/\bcuno\?tin\?e\b/gi, "cunoștințe"],
  [/\bîn\?eleg\b/gi, "înțeleg"],
  [/\bîn\?elege\b/gi, "înțelege"],
  [/\bconstruie\?ti\b/gi, "construiești"],
  [/\be\?ti\b/gi, "ești"],
  [/\bpo\?i\b/gi, "poți"],
  [/\bprime\?te\b/gi, "primește"],
  [/\baju\?i\b/gi, "ajuți"],
  [/\bdore\?ti\b/gi, "dorești"],
  [/\bni\?a\b/gi, "nișa"],
  [/\bco\?\b/gi, "coș"],
  [/\bpla\?i\b/gi, "plăți"],
  [/\bpa\?ii\b/gi, "pașii"],
  [/\bpa\?i\b/gi, "pași"],
  [/\bcre\?tere\b/gi, "creștere"],
  [/\bfi\?iere\b/gi, "fișiere"],
  [/\bfunc\?ionalit\?i\b/gi, "funcționalități"],
  [/\bdirec\?ii\b/gi, "direcții"],
  [/\besen\?iale\b/gi, "esențiale"],
  [/\bconverte\?te\b/gi, "convertește"],
  [/\b(oferta|ofera)\b/gi, (m) => (m === "oferta" ? "ofertă" : "oferă")],
  [/\b(inainte|inaintea)\b/gi, (m) => (m === "inainte" ? "înainte" : "înaintea")],
  [/\b(strategie) p(â|a)na\b/gi, "strategie până"],
  [/(^|[\s(])\?i(?=[\s,.;:!?])/g, "$1și"],
  [/(^|[\s(])\?n(?=[\s,.;:!?])/g, "$1în"]
];

function fixRomanianText(input) {
  if (typeof input !== "string" || !input.length) return input;
  let output = input;

  for (const [from, to] of LITERAL_REPLACEMENTS) {
    output = output.split(from).join(to);
  }

  for (const [pattern, to] of REGEX_REPLACEMENTS) {
    output = output.replace(pattern, to);
  }

  return output;
}

async function main() {
  const db = await getDb();
  let updatedRows = 0;
  const tableUpdates = {};

  for (const table of TABLES) {
    const columns = await db.all(`PRAGMA table_info(${table})`);
    const textColumns = columns.filter((col) => /TEXT/i.test(col.type)).map((col) => col.name);
    if (!textColumns.length) continue;

    const rows = await db.all(`SELECT * FROM ${table}`);
    tableUpdates[table] = 0;

    for (const row of rows) {
      const changes = {};
      for (const col of textColumns) {
        const value = row[col];
        if (typeof value !== "string") continue;
        const fixed = fixRomanianText(value);
        if (fixed !== value) {
          changes[col] = fixed;
        }
      }

      const changedCols = Object.keys(changes);
      if (!changedCols.length) continue;

      const setParts = changedCols.map((col) => `${col} = ?`);
      const values = changedCols.map((col) => changes[col]);
      if (columns.some((col) => col.name === "updated_at")) {
        setParts.push("updated_at = ?");
        values.push(nowIso());
      }
      values.push(row.id);

      await db.run(`UPDATE ${table} SET ${setParts.join(", ")} WHERE id = ?`, values);
      updatedRows += 1;
      tableUpdates[table] += 1;
    }
  }

  console.log("Rânduri actualizate:");
  Object.entries(tableUpdates).forEach(([table, count]) => {
    console.log(`- ${table}: ${count}`);
  });
  console.log(`Total: ${updatedRows}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
