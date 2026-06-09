const express = require("express");
const rateLimit = require("express-rate-limit");
const { getDb } = require("../database");
const { sanitizeText, sanitizeNullable } = require("../utils/security");
const { asyncHandler } = require("../utils/asyncHandler");
const aiService = require("../services/aiService");

const publicRouter = express.Router();
const adminRouter = express.Router();

// ─── Rate limiting ────────────────────────────────────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 40,                  // 40 messages per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Prea multe mesaje intr-un timp scurt. Incearca din nou in cateva minute." }
});

// ─── Context cache (rebuilt every 5 min) ─────────────────────────────────────
let _contextCache = null;
let _contextCacheTime = 0;
const CONTEXT_TTL = 5 * 60 * 1000;

async function getBusinessContext(db) {
  const now = Date.now();
  if (_contextCache && (now - _contextCacheTime) < CONTEXT_TTL) {
    return _contextCache;
  }

  const [settings, services, packages, faq] = await Promise.all([
    db.get("SELECT site_name, email, phone, whatsapp, default_meta_description FROM site_settings ORDER BY id DESC LIMIT 1"),
    db.all("SELECT title, short_description FROM services WHERE is_active = 1 ORDER BY sort_order ASC LIMIT 10"),
    db.all("SELECT name, price_from, show_price, short_description FROM packages WHERE is_active = 1 ORDER BY sort_order ASC LIMIT 8"),
    db.all("SELECT question, answer FROM faq_items WHERE is_active = 1 ORDER BY sort_order ASC LIMIT 15")
  ]);

  const studioName = settings?.site_name || "Marius Boiti Studio";
  const contactEmail = settings?.email || "contact@mariusboiti.ro";
  const contactPhone = settings?.phone || settings?.whatsapp || null;

  const lines = [];

  lines.push(`Esti asistentul virtual al ${studioName}, un studio de web design si dezvoltare web din Romania, condus de Marius Boiti.`);
  lines.push("");
  lines.push("MISIUNE: Ajuti vizitatorii sa inteleaga serviciile, raspunzi la intrebarile despre preturi si proces, si ii indrumi spre contact cand sunt interesati de un proiect.");
  lines.push("");
  lines.push("REGULI STRICTE:");
  lines.push("- Raspunde INTOTDEAUNA in limba in care te intreaba vizitatorul (romana sau engleza).");
  lines.push("- Fii concis si cald — maxim 3-4 propozitii per mesaj.");
  lines.push("- Nu inventa preturi exacte sau termene precise. Spune ca 'depind de proiect' sau 'de la X EUR'.");
  lines.push("- Nu promite nimic specific ce nu este confirmat de Marius personal.");
  lines.push("- Nu raspunde la intrebari complet irelevante (politica, stiri, etc.).");
  lines.push(`- Pentru proiecte concrete, indruma spre contact: ${contactEmail} sau pagina /contact.`);
  lines.push("");

  if (services?.length) {
    lines.push("SERVICII OFERITE:");
    for (const s of services) {
      const desc = s.short_description ? ` — ${s.short_description}` : "";
      lines.push(`• ${s.title}${desc}`);
    }
    lines.push("");
  }

  if (packages?.length) {
    lines.push("PACHETE DISPONIBILE:");
    for (const p of packages) {
      const price = p.show_price && p.price_from ? ` (de la ${p.price_from} EUR)` : "";
      const desc = p.short_description ? ` — ${p.short_description}` : "";
      lines.push(`• ${p.name}${price}${desc}`);
    }
    lines.push("");
  }

  if (faq?.length) {
    lines.push("INTREBARI FRECVENTE:");
    for (const f of faq) {
      lines.push(`I: ${f.question}`);
      lines.push(`R: ${f.answer}`);
      lines.push("");
    }
  }

  lines.push("DATE CONTACT:");
  lines.push(`Email: ${contactEmail}`);
  if (contactPhone) lines.push(`Telefon/WhatsApp: ${contactPhone}`);
  lines.push("Pagina contact: https://mariusboiti.ro/contact");

  _contextCache = lines.join("\n");
  _contextCacheTime = now;
  return _contextCache;
}

// ─── Sanitize history from client ─────────────────────────────────────────────
function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-20) // max 10 turns (20 messages)
    .filter((h) => h && typeof h === "object")
    .map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: sanitizeText(String(h.content || ""), 2000)
    }))
    .filter((h) => h.content);
}

// ─── Chat endpoint (public) ───────────────────────────────────────────────────
publicRouter.post("/chat", chatLimiter, asyncHandler(async (req, res) => {
  const message = sanitizeText(req.body.message, 1000);
  if (!message) {
    return res.status(400).json({ error: "Mesajul este obligatoriu." });
  }

  const history = sanitizeHistory(req.body.history);

  const db = await getDb();

  // Load AI settings
  let aiRow = await db.get("SELECT * FROM ai_settings ORDER BY id ASC LIMIT 1");
  if (!aiRow) {
    // No AI configured — graceful fallback
    return res.json({
      response: "Momentan nu pot procesa mesaje automat. Te rog contacteaza-ma direct la contact@mariusboiti.ro si iti raspund personal."
    });
  }

  // Resolve key and model
  const provider = aiRow.provider === "openai" ? "openai" : "gemini";
  const apiKey = (provider === "openai" ? aiRow.openai_api_key : aiRow.gemini_api_key)
    || (provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY)
    || "";

  if (!apiKey) {
    return res.json({
      response: "Momentan nu pot procesa mesaje automat. Te rog contacteaza-ma direct la contact@mariusboiti.ro si iti raspund personal."
    });
  }

  const model = provider === "openai"
    ? (aiRow.openai_text_model || aiRow.model || "gpt-4o-mini")
    : (aiRow.gemini_text_model || aiRow.model || "gemini-2.5-flash");

  // Build system prompt from DB context
  const systemPrompt = await getBusinessContext(db);

  // Call AI
  const result = await aiService.chatCompletion({
    provider,
    model,
    apiKey,
    temperature: 0.7,
    maxTokens: 600,
    systemPrompt,
    history,
    message
  });

  return res.json({ response: result.text || "Nu am putut genera un raspuns. Incearca din nou." });
}));

// ─── Admin: invalidate context cache ─────────────────────────────────────────
adminRouter.post("/chat/cache/clear", asyncHandler(async (_req, res) => {
  _contextCache = null;
  _contextCacheTime = 0;
  return res.json({ ok: true, message: "Cache context chatbot resetat." });
}));

module.exports = { publicRouter, adminRouter };
