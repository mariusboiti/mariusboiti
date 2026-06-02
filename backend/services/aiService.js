const path = require("path");
const fs = require("fs");
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
  return process.env.GEMINI_MODEL || "gemini-2.0-flash";
}

function getKey(provider, dbKey) {
  const k = dbKey || (provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY) || "";
  return String(k || "").trim();
}

function keyError(provider) {
  if (provider === "openai") return "OpenAI API key is not configured. Add it in Admin → AI Settings.";
  return "Gemini API key is not configured. Add it in Admin → AI Settings.";
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
  maxTokens = 1200,
  apiKey
}) {
  ensureFetch();

  const normalizedProvider = provider === "openai" ? "openai" : "gemini";
  const resolvedKey = getKey(normalizedProvider, apiKey);
  if (!resolvedKey) throw new Error(keyError(normalizedProvider));

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
        Authorization: `Bearer ${resolvedKey}`
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
    return { provider: normalizedProvider, model: finalModel, text: String(text || "").trim(), raw: data };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(finalModel)}:generateContent?key=${encodeURIComponent(resolvedKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt ? `${systemPrompt}\n\n` : ""}${cleanPrompt}` }] }],
        generationConfig: { temperature: temp, maxOutputTokens: tokens }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || "Gemini request failed.";
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  return { provider: normalizedProvider, model: finalModel, text: String(text || "").trim(), raw: data };
}

async function generateImage({
  provider = "openai",
  model,
  prompt,
  apiKey,
  size = "1024x1024"
}) {
  ensureFetch();

  const normalizedProvider = provider === "openai" ? "openai" : "gemini";
  const resolvedKey = getKey(normalizedProvider, apiKey);
  if (!resolvedKey) throw new Error(keyError(normalizedProvider));

  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) throw new Error("Prompt-ul pentru imagine este obligatoriu.");

  // Ensure save directory exists
  const uploadDir = path.resolve(process.cwd(), "backend/uploads/ai-images");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const filename = `ai-img-${Date.now()}.png`;
  const filePath = path.join(uploadDir, filename);
  const publicUrl = `/uploads/ai-images/${filename}`;

  if (normalizedProvider === "openai") {
    const finalModel = model || "dall-e-3";
    // DALL-E 3 supports 1024x1024, 1024x1792, 1792x1024
    const validSizes = ["1024x1024", "1024x1792", "1792x1024"];
    const finalSize = validSizes.includes(size) ? size : "1024x1024";

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resolvedKey}`
      },
      body: JSON.stringify({
        model: finalModel,
        prompt: cleanPrompt,
        n: 1,
        size: finalSize,
        response_format: "url"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || "OpenAI image generation failed.";
      throw new Error(msg);
    }

    const imageUrl = data?.data?.[0]?.url;
    const revisedPrompt = data?.data?.[0]?.revised_prompt || cleanPrompt;
    if (!imageUrl) throw new Error("OpenAI nu a returnat o imagine.");

    // Download and save the image
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error("Nu am putut descărca imaginea generată.");
    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return { provider: normalizedProvider, model: finalModel, url: publicUrl, revisedPrompt };
  }

  // Imagen 3 via Google Generative AI API
  const finalModel = model || "imagen-3.0-generate-002";
  const imagenResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(finalModel)}:generateImages?key=${encodeURIComponent(resolvedKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: { text: cleanPrompt },
        sampleCount: 1,
        aspectRatio: "1:1"
      })
    }
  );

  const imagenData = await imagenResponse.json();
  if (!imagenResponse.ok) {
    const msg = imagenData?.error?.message || "Gemini Imagen request failed.";
    throw new Error(msg);
  }

  const b64 = imagenData?.predictions?.[0]?.bytesBase64Encoded;
  const mimeType = imagenData?.predictions?.[0]?.mimeType || "image/png";
  if (!b64) throw new Error("Imagen nu a returnat date pentru imagine.");

  const ext = mimeType.includes("jpeg") ? "jpg" : "png";
  const imgFilename = `ai-img-${Date.now()}.${ext}`;
  const imgFilePath = path.join(uploadDir, imgFilename);
  fs.writeFileSync(imgFilePath, Buffer.from(b64, "base64"));

  return {
    provider: normalizedProvider,
    model: finalModel,
    url: `/uploads/ai-images/${imgFilename}`,
    revisedPrompt: cleanPrompt
  };
}

const DEFAULT_SYSTEM_PROMPT =
  "Ești copywriter SEO în limba română. Scrii clar, profesionist, orientat spre antreprenori mici și freelanceri. Evită exagerările și jargonul inutil.";

function extractPromptConfig(input = {}) {
  return {
    provider: input.provider || process.env.AI_DEFAULT_PROVIDER || "gemini",
    model: input.model,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    apiKey: input.apiKey
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
    "Publicul țintă: antreprenori mici, freelanceri, persoane care au nevoie de site de prezentare, landing page sau magazin online.",
    "Stil: clar, prietenos, profesionist, fără jargon inutil.",
    "Include subtitluri H2/H3, exemple concrete, liste utile și o concluzie cu CTA spre calculatorul de preț.",
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
    "Generează un prompt în engleză pentru generare de imagine AI (DALL-E sau Imagen).",
    "Stil: premium, modern, tech-friendly. Fără branduri, logo-uri sau persoane reale.",
    "Răspunde cu un singur prompt clar, în engleză, gata de copiat.",
    "",
    `Titlu articol: ${input.title || "-"}`,
    `Focus keyword: ${input.focusKeyword || "-"}`,
    `Context: ${input.excerpt || (String(input.content || "").slice(0, 300)) || "-"}`
  ].join("\n");

  return generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt
  });
}

module.exports = {
  generateText,
  generateImage,
  generateBlogOutline,
  generateBlogArticle,
  improveBlogContent,
  generateSeoMetadata,
  fixSeoIssues,
  generateImagePrompt
};
