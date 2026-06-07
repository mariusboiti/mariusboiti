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
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
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

function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(raw.slice(first, last + 1));
      } catch (_inner) {
        return null;
      }
    }
  }
  return null;
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\r?\n|,/)
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }
  return [];
}

function looksIncomplete(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return true;
  if (/[:;,\-—]$/.test(cleaned)) return true;
  return !/[.!?…]["')\]]?$/.test(cleaned);
}

function makeArticleTitle(input = {}) {
  const base = String(input.title || input.focusKeyword || input.topic || "").trim();
  if (base) return base;
  return "Articol SEO";
}

function buildArticleTheme(input = {}) {
  return [
    `Topic: ${input.topic || "-"}`,
    `Focus keyword: ${input.focusKeyword || "-"}`,
    `Audience: ${input.audience || "antreprenori mici si freelanceri"}`,
    `Goal: ${input.goal || "lead generation organic"}`,
    `Tone: ${input.tone || "prietenos-profesionist"}`
  ].join("\n");
}

async function generateArticleBlock({
  input,
  articleTitle,
  heading,
  prompt,
  minWords = 180,
  maxTokens = 2200,
  retries = 1
}) {
  let result = await generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt,
    maxTokens
  });

  let text = String(result.text || "").trim();
  let tries = 0;
  while (tries < retries && (wordCount(text) < minWords || looksIncomplete(text))) {
    tries += 1;
    result = await generateText({
      ...extractPromptConfig(input),
      systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      prompt: [
        "Refa doar secțiunea de mai jos astfel încât să fie completă, clară și mai lungă.",
        "Nu repeta ideile din alte secțiuni.",
        "Nu încheia cu fraze tăiate.",
        `Titlu articol: ${articleTitle}`,
        `Secțiune: ${heading}`,
        "",
        prompt
      ].join("\n"),
      maxTokens: Math.max(maxTokens, 2400)
    });
    text = String(result.text || "").trim();
  }

  return { ...result, text };
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
    const finishReason = data?.choices?.[0]?.finish_reason || null;
    return {
      provider: normalizedProvider,
      model: finalModel,
      text: String(text || "").trim(),
      raw: data,
      finishReason,
      truncated: finishReason === "length"
    };
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
  const finishReason = data?.candidates?.[0]?.finishReason || data?.candidates?.[0]?.finish_reason || null;
  return {
    provider: normalizedProvider,
    model: finalModel,
    text: String(text || "").trim(),
    raw: data,
    finishReason,
    truncated: /MAX_TOKENS/i.test(String(finishReason || ""))
  };
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

  // Determine final model name
  const finalModel = sanitizeText(model || "imagen-3.0-generate-002", 120);

  // Gemini native image generation (gemini-* models use generateContent with responseModalities)
  if (finalModel.startsWith("gemini-")) {
    const geminiImgResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(finalModel)}:generateContent?key=${encodeURIComponent(resolvedKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: cleanPrompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] }
        })
      }
    );

    const geminiImgData = await geminiImgResponse.json();
    if (!geminiImgResponse.ok) {
      const msg = geminiImgData?.error?.message || "Gemini image generation failed.";
      throw new Error(msg);
    }

    const parts = geminiImgData?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData);
    if (!imagePart?.inlineData?.data) throw new Error("Gemini nu a returnat date pentru imagine.");

    const mimeType = imagePart.inlineData.mimeType || "image/jpeg";
    const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
    const imgFilename = `ai-img-${Date.now()}.${ext}`;
    const imgFilePath = path.join(uploadDir, imgFilename);
    fs.writeFileSync(imgFilePath, Buffer.from(imagePart.inlineData.data, "base64"));

    return {
      provider: normalizedProvider,
      model: finalModel,
      url: `/uploads/ai-images/${imgFilename}`,
      revisedPrompt: cleanPrompt
    };
  }

  // Imagen 3 via Google Generative AI API (imagen-* models)
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
  const articleTitle = makeArticleTitle(input);
  const baseTheme = buildArticleTheme(input);
  const articleGoal = String(input.goal || "lead generation organic").trim();
  const focusKeyword = String(input.focusKeyword || input.topic || articleTitle).trim();
  const audience = String(input.audience || "antreprenori mici si freelanceri").trim();

  const introPrompt = [
    "Scrie doar introducerea articolului in romana.",
    "Ton: clar, prietenos, profesionist, fara jargon inutil.",
    "Nu include titlul articolului si nu adauga alte sectiuni.",
    "Target: 180-220 cuvinte.",
    "Deschide natural subiectul si explica de ce conteaza.",
    "",
    baseTheme,
    "",
    `Articol: ${articleTitle}`
  ].join("\n");

  const sectionPrompts = [
    {
      heading: "De ce conteaza subiectul",
      prompt: [
        "Scrie doar aceasta sectiune in romana, sub forma unui paragraf sau doua, cu subheadings daca ajuta.",
        "Nu repeta introducerea si nu incheia articolul aici.",
        "Target: 180-240 cuvinte.",
        "Explica problema, contextul si de ce cititorul ar trebui sa ii acorde atentie.",
        "",
        baseTheme,
        "",
        `Articol: ${articleTitle}`,
        `Focus keyword: ${focusKeyword}`
      ].join("\n")
    },
    {
      heading: "Ce trebuie sa rezolve in practica",
      prompt: [
        "Scrie doar aceasta sectiune in romana.",
        "Nu repeta ce s-a spus anterior.",
        "Target: 180-240 cuvinte.",
        "Explica ce rezolva aceasta solutie pentru publicul tinta si cand are sens sa o alegi.",
        "",
        baseTheme,
        "",
        `Articol: ${articleTitle}`,
        `Audience: ${audience}`
      ].join("\n")
    },
    {
      heading: "Cum functioneaza pas cu pas",
      prompt: [
        "Scrie doar aceasta sectiune in romana.",
        "Folosește o structura clara, eventual cu lista numerotata sau bullet-uri daca ajuta.",
        "Target: 180-260 cuvinte.",
        "Explica procesul, etapele si ce trebuie urmarit ca lucrurile sa iasa bine.",
        "",
        baseTheme,
        "",
        `Articol: ${articleTitle}`,
        `Goal: ${articleGoal}`
      ].join("\n")
    },
    {
      heading: "Greseli frecvente si cum le eviti",
      prompt: [
        "Scrie doar aceasta sectiune in romana.",
        "Target: 180-240 cuvinte.",
        "Lista cateva greseli frecvente si explica pe scurt cum pot fi evitate.",
        "Nu repeta introducerea si nu incheia articolul aici.",
        "",
        baseTheme,
        "",
        `Articol: ${articleTitle}`
      ].join("\n")
    },
    {
      heading: "Ce ar trebui sa contina o implementare buna",
      prompt: [
        "Scrie doar aceasta sectiune in romana.",
        "Target: 180-240 cuvinte.",
        "Ajuta cititorul sa inteleaga ce elemente fac diferenta intre o varianta slaba si una buna.",
        "",
        baseTheme,
        "",
        `Articol: ${articleTitle}`,
        `Focus keyword: ${focusKeyword}`
      ].join("\n")
    },
    {
      heading: "Cand are sens sa lucrezi cu un specialist",
      prompt: [
        "Scrie doar aceasta sectiune in romana.",
        "Target: 160-220 cuvinte.",
        "Explica realist cand merita ajutor extern si ce poate face un specialist mai bine.",
        "",
        baseTheme,
        "",
        `Articol: ${articleTitle}`
      ].join("\n")
    }
  ];

  const intro = await generateArticleBlock({
    input,
    articleTitle,
    heading: "Introducere",
    prompt: introPrompt,
    minWords: 180,
    maxTokens: Math.max(Number(input.maxTokens || 0), 1800),
    retries: 1
  });

  const blocks = [`# ${articleTitle}`, String(intro.text || "").trim()];

  for (const section of sectionPrompts) {
    const block = await generateArticleBlock({
      input,
      articleTitle,
      heading: section.heading,
      prompt: section.prompt,
      minWords: 160,
      maxTokens: Math.max(Number(input.maxTokens || 0), 2000),
      retries: 1
    });
    const body = String(block.text || "").trim();
    if (body) {
      blocks.push(`## ${section.heading}\n\n${body}`);
    }
  }

  const faq = await generateArticleBlock({
    input,
    articleTitle,
    heading: "FAQ",
    prompt: [
      "Scrie doar sectiunea FAQ in romana.",
      "Include 4 intrebari si raspunsuri scurte, utile si naturale.",
      "Foloseste format Markdown cu Q si A.",
      "Nu repeta sectiunile anterioare.",
      "",
      baseTheme,
      "",
      `Articol: ${articleTitle}`,
      `Focus keyword: ${focusKeyword}`
    ].join("\n"),
    minWords: 140,
    maxTokens: Math.max(Number(input.maxTokens || 0), 1600),
    retries: 1
  });
  if (String(faq.text || "").trim()) {
    blocks.push(`## FAQ\n\n${String(faq.text || "").trim()}`);
  }

  const conclusion = await generateArticleBlock({
    input,
    articleTitle,
    heading: "Concluzie",
    prompt: [
      "Scrie doar concluzia articolului in romana.",
      "Incheie natural cu un CTA calm spre calculatorul de pret sau contact, fara presiune de vanzare.",
      "Target: 120-180 cuvinte.",
      "Nu repeta sectiunile anterioare si nu lasa fraza neterminata.",
      "",
      baseTheme,
      "",
      `Articol: ${articleTitle}`
    ].join("\n"),
    minWords: 120,
    maxTokens: Math.max(Number(input.maxTokens || 0), 1200),
    retries: 1
  });
  if (String(conclusion.text || "").trim()) {
    blocks.push(`## Concluzie\n\n${String(conclusion.text || "").trim()}`);
  }

  const text = blocks.filter(Boolean).join("\n\n").trim();
  const finalResult = conclusion?.text ? conclusion : faq?.text ? faq : blocks.length ? intro : null;
  return {
    ...(finalResult || intro),
    text
  };
}

async function generateBlogTitleExcerpt(input = {}) {
  const prompt = [
    "Genereaza doar JSON valid, fara markdown si fara explicatii.",
    "Intoarce cheile: title, excerpt.",
    "title: un titlu atractiv, clar, SEO-friendly, in limba romana, 45-70 caractere.",
    "excerpt: un rezumat de 1-2 fraze, 120-180 caractere, prietenos si clar.",
    "",
    `Topic: ${input.topic || "-"}`,
    `Focus keyword: ${input.focusKeyword || "-"}`,
    `Audience: ${input.audience || "antreprenori mici si freelanceri"}`,
    `Goal: ${input.goal || "lead generation organic"}`,
    `Current title: ${input.title || "-"}`,
    "Continut existent:",
    String(input.content || "")
  ].join("\n");

  const result = await generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt,
    maxTokens: Math.max(Number(input.maxTokens || 0), 1200)
  });

  const parsed = extractJsonObject(result.text) || {};
  const fallbackLines = String(result.text || "")
    .split(/\r?\n/)
    .map((line) => String(line || "").trim())
    .filter(Boolean);
  let title = String(parsed.title || "").trim();
  let excerpt = String(parsed.excerpt || "").trim();
  if (!title) title = fallbackLines[0] || String(input.title || "").trim();
  if (!excerpt) excerpt = fallbackLines.slice(1, 3).join(" ") || String(input.excerpt || "").trim();
  return {
    ...result,
    title,
    excerpt,
    text: [title, excerpt].filter(Boolean).join("\n\n") || result.text
  };
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
    prompt,
    maxTokens: 4000
  });
}

async function generateSeoMetadata(input = {}) {
  const prompt = [
    "Genereaza doar JSON valid, fara markdown si fara explicatii.",
    "Raspunde in romana cu cheile: title, seo_title, seo_description, excerpt, tags, secondary_keywords, faq.",
    "title: un titlu de articol clar si SEO-friendly.",
    "seo_title: 45-60 caractere.",
    "seo_description: 120-160 caractere.",
    "excerpt: 120-180 caractere.",
    "tags: array cu 5-10 tag-uri.",
    "secondary_keywords: array cu 5-10 keyword-uri secundare.",
    "faq: array cu 3-5 intrebari FAQ scurte, utile.",
    "",
    `Titlu articol: ${input.title || "-"}`,
    `Focus keyword: ${input.focusKeyword || "-"}`,
    "Continut:",
    String(input.content || "")
  ].join("\n");

  const result = await generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt,
    maxTokens: Math.max(Number(input.maxTokens || 0), 1400)
  });

  const parsed = extractJsonObject(result.text) || {};
  const tags = normalizeStringList(parsed.tags);
  const secondaryKeywords = normalizeStringList(parsed.secondary_keywords || parsed.secondaryKeywords);
  const faq = Array.isArray(parsed.faq) ? parsed.faq : normalizeStringList(parsed.faq);
  const cleanContent = String(input.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const fallbackExcerpt = String(input.excerpt || cleanContent.slice(0, 160) || input.title || "").trim();
  const payload = {
    title: String(parsed.title || input.title || "").trim(),
    seo_title: String(parsed.seo_title || input.title || "").trim(),
    seo_description: String(parsed.seo_description || fallbackExcerpt).trim(),
    excerpt: String(parsed.excerpt || fallbackExcerpt).trim(),
    tags: tags.length ? tags : normalizeStringList(input.focusKeyword ? [input.focusKeyword, input.topic].filter(Boolean) : []),
    secondary_keywords: secondaryKeywords.length ? secondaryKeywords : normalizeStringList(input.focusKeyword || input.topic || ""),
    faq: faq.length ? faq : [
      `Ce include articolul despre ${String(input.title || input.topic || "acest subiect").toLowerCase()}?`,
      `Cât durează să pui în practică ideile din articol?`,
      `Când are sens să apelezi la un specialist?`
    ]
  };

  return {
    ...result,
    ...payload,
    text: JSON.stringify(payload, null, 2)
  };
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
    prompt,
    maxTokens: 4000
  });
}

async function generateImagePrompt(input = {}) {
  const prompt = [
    "Genereaza JSON valid, fara markdown si fara explicatii.",
    "Intoarce cheile: primary_prompt, prompts.",
    "primary_prompt: un prompt principal in engleza pentru imaginea featured a articolului.",
    "prompts: un array cu exact 3 prompturi diferite, in engleza, fiecare adaptat la un unghi vizual usor diferit.",
    "Stil: premium, modern, tech-friendly. Fara branduri, logo-uri sau persoane reale.",
    "",
    `Titlu articol: ${input.title || "-"}`,
    `Focus keyword: ${input.focusKeyword || "-"}`,
    `Context: ${input.excerpt || (String(input.content || "").slice(0, 300)) || "-"}`
  ].join("\n");

  const result = await generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt,
    maxTokens: Math.max(Number(input.maxTokens || 0), 1200)
  });

  const parsed = extractJsonObject(result.text) || {};
  const prompts = normalizeStringList(parsed.prompts).slice(0, 3);
  const primaryPrompt = String(parsed.primary_prompt || prompts[0] || result.text).trim();
  const fallbackPrompts = [
    primaryPrompt || `A premium featured image for an article about ${String(input.title || input.focusKeyword || "web design").trim()}.`,
    `${primaryPrompt || String(input.title || input.focusKeyword || "web design")} with a slightly wider composition and more negative space.`,
    `${primaryPrompt || String(input.title || input.focusKeyword || "web design")} with a more editorial, polished and premium visual direction.`
  ];
  const fullPrompts = (prompts.length ? prompts : fallbackPrompts).slice(0, 3);
  return {
    ...result,
    primary_prompt: primaryPrompt,
    prompts: fullPrompts,
    text: fullPrompts.map((item, index) => `${index + 1}. ${item}`).join("\n\n")
  };
}

async function fixSeoIssueItem(input = {}) {
  const recommendation = String(input.recommendation || "").trim();
  if (!recommendation) throw new Error("Recomandarea SEO este obligatorie.");

  const prompt = [
    "Aplică fix-ul SEO indicat în articolul de mai jos.",
    "Modifică MINIMAL conținutul pentru a rezolva DOAR problema indicată.",
    "Returnează articolul COMPLET, corectat, în română.",
    "Nu adăuga explicații sau comentarii — returnează DOAR conținutul articolului.",
    "",
    `Fix necesar: ${recommendation}`,
    "",
    `Focus keyword: ${input.focusKeyword || "-"}`,
    "",
    "Articol curent:",
    String(input.content || "")
  ].join("\n");

  return generateText({
    ...extractPromptConfig(input),
    systemPrompt: input.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    prompt,
    maxTokens: 4000
  });
}

module.exports = {
  generateText,
  generateImage,
  generateBlogOutline,
  generateBlogArticle,
  generateBlogTitleExcerpt,
  improveBlogContent,
  generateSeoMetadata,
  fixSeoIssues,
  fixSeoIssueItem,
  generateImagePrompt
};
