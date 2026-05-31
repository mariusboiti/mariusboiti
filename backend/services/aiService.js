const { sanitizeText } = require("../utils/security");

function ensureFetch() {
  if (typeof fetch !== "function") {
    throw new Error("Fetch API is not available on this Node.js runtime.");
  }
}

function getProviderModel(provider) {
  if (provider === "openai") {
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
  }
  return process.env.GEMINI_MODEL || "gemini-1.5-flash";
}

function getKey(provider) {
  if (provider === "openai") return process.env.OPENAI_API_KEY || "";
  return process.env.GEMINI_API_KEY || "";
}

function keyError(provider) {
  if (provider === "openai") return "OpenAI API key is not configured.";
  return "Gemini API key is not configured.";
}

function clampTemperature(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.7;
  return Math.min(1.5, Math.max(0, n));
}

function clampTokens(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return 1200;
  return Math.min(4000, n);
}

async function generateText({
  provider = "gemini",
  model,
  prompt,
  systemPrompt = "",
  temperature = 0.7,
  maxTokens = 1200
}) {
  ensureFetch();

  const normalizedProvider = provider === "openai" ? "openai" : "gemini";
  const apiKey = getKey(normalizedProvider);
  if (!apiKey) {
    throw new Error(keyError(normalizedProvider));
  }

  const finalModel = sanitizeText(model || getProviderModel(normalizedProvider), 120);
  const temp = clampTemperature(temperature);
  const tokens = clampTokens(maxTokens);
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) throw new Error("Prompt-ul este obligatoriu.");

  if (normalizedProvider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: finalModel,
        temperature: temp,
        max_tokens: tokens,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: cleanPrompt }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || "OpenAI request failed.";
      throw new Error(msg);
    }

    const text = data?.choices?.[0]?.message?.content || "";
    return {
      provider: normalizedProvider,
      model: finalModel,
      text: String(text || "").trim(),
      raw: data
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(finalModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt ? `${systemPrompt}\n\n` : ""}${cleanPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: temp,
          maxOutputTokens: tokens
        }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || "Gemini request failed.";
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  return {
    provider: normalizedProvider,
    model: finalModel,
    text: String(text || "").trim(),
    raw: data
  };
}

const DEFAULT_SYSTEM_PROMPT =
  "Ești copywriter SEO în limba română. Scrii clar, profesionist, orientat spre antreprenori mici și freelanceri. Evită exagerările și jargonul inutil.";

function extractPromptConfig(input = {}) {
  return {
    provider: input.provider || process.env.AI_DEFAULT_PROVIDER || "gemini",
    model: input.model,
    temperature: input.temperature,
    maxTokens: input.maxTokens
  };
}

async function generateBlogOutline(input = {}) {
  const { topic, focusKeyword, audience, goal, tone } = input;
  const prompt = [
    "Creează un outline detaliat pentru un articol SEO în română.",
    `Topic: ${topic || "-"}`,
    `Focus keyword: ${focusKeyword || "-"}`,
    `Public: ${audience || "antreprenori mici, freelanceri, servicii locale"}`,
    `Obiectiv articol: ${goal || "educare + conversie"}`,
    `Ton: ${tone || "prietenos-profesionist"}`,
    "Include H1, secțiuni H2/H3, puncte cheie, FAQ și CTA spre calculatorul de preț."
  ].join("\n");

  return generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt
  });
}

async function generateBlogArticle(input = {}) {
  const prompt = [
    "Scrie un articol SEO în limba română pentru site-ul Marius Boiti Studio.",
    "Publicul țintă este format din antreprenori mici, freelanceri și persoane care au nevoie de site de prezentare, landing page sau magazin online simplu.",
    "Stilul trebuie să fie clar, prietenos, profesionist și ușor de înțeles. Evită jargonul inutil.",
    "Include subtitluri H2/H3, exemple concrete, liste utile și o concluzie cu CTA către calculatorul de preț.",
    "",
    `Topic: ${input.topic || "-"}`,
    `Focus keyword: ${input.focusKeyword || "-"}`,
    `Audience: ${input.audience || "antreprenori mici și freelanceri"}`,
    `Goal: ${input.goal || "lead generation organic"}`
  ].join("\n");

  return generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt
  });
}

async function improveBlogContent(input = {}) {
  const prompt = [
    "Îmbunătățește articolul de mai jos în limba română.",
    "Păstrează ideile, dar crește claritatea, structura și conversia.",
    "Adaugă subtitluri mai bune, liste unde ajută și flow natural.",
    "",
    `Focus keyword: ${input.focusKeyword || "-"}`,
    "Articol:",
    String(input.content || "")
  ].join("\n");

  return generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt
  });
}

async function generateSeoMetadata(input = {}) {
  const prompt = [
    "Generează un SEO title, meta description, excerpt, tags și keyword-uri secundare în limba română.",
    "Răspunde în format JSON valid cu cheile: seo_title, seo_description, excerpt, tags, secondary_keywords, faq.",
    "",
    `Titlu articol: ${input.title || "-"}`,
    `Focus keyword: ${input.focusKeyword || "-"}`,
    "Conținut:",
    String(input.content || "")
  ].join("\n");

  return generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt
  });
}

async function fixSeoIssues(input = {}) {
  const prompt = [
    "Analizează problemele SEO primite și rescrie articolul sau secțiunile necesare astfel încât să crească scorul SEO, fără keyword stuffing și fără să sune artificial.",
    "Dacă este util, oferă și o listă scurtă de schimbări aplicate.",
    "",
    "Probleme SEO:",
    typeof input.analysis === "string" ? input.analysis : JSON.stringify(input.analysis || {}, null, 2),
    "",
    "Articol curent:",
    String(input.content || "")
  ].join("\n");

  return generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt
  });
}

async function generateImagePrompt(input = {}) {
  const prompt = [
    "Generează un prompt pentru imagine principală de articol (fără branduri sau logo-uri).",
    "Stil: premium, modern, tech-friendly.",
    "Răspunde cu un singur prompt clar, în română.",
    "",
    `Titlu articol: ${input.title || "-"}`,
    `Focus keyword: ${input.focusKeyword || "-"}`,
    `Extragere context: ${input.excerpt || input.content || "-"}`
  ].join("\n");

  return generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt
  });
}

module.exports = {
  generateText,
  generateBlogOutline,
  generateBlogArticle,
  improveBlogContent,
  generateSeoMetadata,
  fixSeoIssues,
  generateImagePrompt
};
