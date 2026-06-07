function stripHtml(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = String(haystack || "").toLowerCase().match(new RegExp(escaped.toLowerCase(), "g"));
  return matches ? matches.length : 0;
}

function addCheck(checks, id, label, status, points, recommendation = "") {
  checks.push({ id, label, status, points, recommendation });
}

function findHeadings(content) {
  const h2 = [...String(content || "").matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripHtml(m[1]));
  const h3 = [...String(content || "").matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => stripHtml(m[1]));
  return [...h2, ...h3];
}

function hasFaqSection(content) {
  const text = String(content || "").toLowerCase();
  return text.includes("faq") || text.includes("întrebări frecvente") || text.includes("intrebari frecvente");
}

function analyzeBlogPost(post) {
  const checks = [];
  const keyword = String(post.focus_keyword || "").trim().toLowerCase();
  const title = String(post.title || "").trim();
  const seoTitle = String(post.seo_title || "").trim();
  const seoDescription = String(post.seo_description || "").trim();
  const slug = String(post.slug || "").trim();
  const content = String(post.content || "");
  const plainContent = stripHtml(content);
  const words = plainContent ? plainContent.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const firstParagraph = (content.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || plainContent.slice(0, 260);
  const headings = findHeadings(content);
  const internalLinkCount = (content.match(/href\s*=\s*["']\/[^"']*["']/gi) || []).length;
  const externalLinkCount = (content.match(/href\s*=\s*["']https?:\/\/[^"']*["']/gi) || []).length;
  const hasList = /<(ul|ol)[^>]*>[\s\S]*?<\/\1>/i.test(content);
  const paragraphCount = (content.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []).length;
  const longParagraphCount = (content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []).filter((p) => stripHtml(p).split(/\s+/).length > 90).length;
  const keywordOccurrences = countOccurrences(plainContent, keyword);

  let score = 0;
  const recommendations = [];
  const recommendationItems = [];

  function collectRecommendation(message, id = "", target = "content") {
    if (message && !recommendations.includes(message)) {
      recommendations.push(message);
      recommendationItems.push({ id: id || `rec_${recommendationItems.length}`, target, message });
    }
  }

  if (keyword) {
    addCheck(checks, "focus_keyword_exists", "Focus keyword setat", "pass", 5);
    score += 5;
  } else {
    addCheck(checks, "focus_keyword_exists", "Focus keyword setat", "fail", 0, "Adaugă un focus keyword principal.");
    collectRecommendation("Adaugă un focus keyword principal.", "focus_keyword_exists", "focus_keyword");
  }

  if (keyword && title.toLowerCase().includes(keyword)) {
    addCheck(checks, "keyword_in_title", "Cuvântul cheie apare în titlu", "pass", 8);
    score += 8;
  } else {
    addCheck(checks, "keyword_in_title", "Cuvântul cheie apare în titlu", keyword ? "warning" : "fail", 2, "Include focus keyword în titlu.");
    score += keyword ? 2 : 0;
    if (keyword) collectRecommendation("Include focus keyword în titlu.", "keyword_in_title", "title");
  }

  if (keyword && stripHtml(firstParagraph).toLowerCase().includes(keyword)) {
    addCheck(checks, "keyword_in_first_paragraph", "Keyword în primul paragraf", "pass", 7);
    score += 7;
  } else {
    addCheck(checks, "keyword_in_first_paragraph", "Keyword în primul paragraf", keyword ? "warning" : "fail", 2, "Folosește focus keyword în primul paragraf.");
    score += keyword ? 2 : 0;
    if (keyword) collectRecommendation("Folosește focus keyword în primul paragraf.", "keyword_in_first_paragraph", "content");
  }

  if (keyword && headings.some((h) => h.toLowerCase().includes(keyword))) {
    addCheck(checks, "keyword_in_heading", "Keyword în H2/H3", "pass", 6);
    score += 6;
  } else {
    addCheck(checks, "keyword_in_heading", "Keyword în H2/H3", keyword ? "warning" : "fail", 2, "Include keyword în cel puțin un subtitlu.");
    score += keyword ? 2 : 0;
    if (keyword) collectRecommendation("Include keyword în cel puțin un subtitlu H2/H3.", "keyword_in_heading", "content");
  }

  if (keyword && seoTitle.toLowerCase().includes(keyword)) {
    addCheck(checks, "keyword_in_meta_title", "Keyword în SEO title", "pass", 5);
    score += 5;
  } else {
    addCheck(checks, "keyword_in_meta_title", "Keyword în SEO title", "warning", 1, "Include focus keyword în SEO title.");
    score += 1;
    if (keyword) collectRecommendation("Include focus keyword în SEO title.", "keyword_in_meta_title", "seo_title");
  }

  if (keyword && seoDescription.toLowerCase().includes(keyword)) {
    addCheck(checks, "keyword_in_meta_description", "Keyword în meta description", "pass", 5);
    score += 5;
  } else {
    addCheck(checks, "keyword_in_meta_description", "Keyword în meta description", "warning", 1, "Include focus keyword în meta description.");
    score += 1;
    if (keyword) collectRecommendation("Include focus keyword în meta description.", "keyword_in_meta_description", "seo_description");
  }

  if (keywordOccurrences >= 3) {
    addCheck(checks, "keyword_density", "Keyword apare natural în conținut", "pass", 6);
    score += 6;
  } else if (keywordOccurrences > 0) {
    addCheck(checks, "keyword_density", "Keyword apare natural în conținut", "warning", 3, "Folosește keyword de câteva ori, natural.");
    score += 3;
    collectRecommendation("Folosește keyword-ul de câteva ori, natural, în conținut.", "keyword_density", "content");
  } else {
    addCheck(checks, "keyword_density", "Keyword apare natural în conținut", "fail", 0, "Include keyword în conținut.");
    collectRecommendation("Include keyword-ul în conținut.", "keyword_density", "content");
  }

  const titleLength = title.length;
  if (titleLength >= 35 && titleLength <= 75) {
    addCheck(checks, "title_length", "Titlu cu lungime bună", "pass", 5);
    score += 5;
  } else if (titleLength > 0) {
    addCheck(checks, "title_length", "Titlu cu lungime bună", "warning", 2, "Recomandat: 35-75 caractere.");
    score += 2;
    collectRecommendation("Ajustează titlul la aproximativ 35-75 caractere.", "title_length", "title");
  } else {
    addCheck(checks, "title_length", "Titlu cu lungime bună", "fail", 0, "Titlul este obligatoriu.");
    collectRecommendation("Adaugă un titlu clar pentru articol.", "title_length", "title");
  }

  if (seoTitle.length >= 45 && seoTitle.length <= 60) {
    addCheck(checks, "seo_title_length", "SEO title optim (45-60)", "pass", 6);
    score += 6;
  } else if (seoTitle.length > 0) {
    addCheck(checks, "seo_title_length", "SEO title optim (45-60)", "warning", 3, "Ajustează SEO title la 45-60 caractere.");
    score += 3;
    collectRecommendation("Ajustează SEO title la 45-60 caractere.", "seo_title_length", "seo_title");
  } else {
    addCheck(checks, "seo_title_length", "SEO title optim (45-60)", "fail", 0, "Adaugă SEO title.");
    collectRecommendation("Adaugă un SEO title.", "seo_title_length", "seo_title");
  }

  if (seoDescription.length >= 120 && seoDescription.length <= 160) {
    addCheck(checks, "seo_description_length", "Meta descriere optimă (120-160)", "pass", 6);
    score += 6;
  } else if (seoDescription.length > 0) {
    addCheck(checks, "seo_description_length", "Meta descriere optimă (120-160)", "warning", 3, "Ajustează meta descrierea la 120-160 caractere.");
    score += 3;
    collectRecommendation("Ajustează meta descrierea la 120-160 caractere.", "seo_description_length", "seo_description");
  } else {
    addCheck(checks, "seo_description_length", "Meta descriere optimă (120-160)", "fail", 0, "Adaugă meta descriere.");
    collectRecommendation("Adaugă o meta descriere.", "seo_description_length", "seo_description");
  }

  const slugValid = slug && slug === slug.toLowerCase() && /^[a-z0-9-]+$/.test(slug);
  if (slugValid) {
    addCheck(checks, "slug_valid", "Slug valid (lowercase fără diacritice)", "pass", 5);
    score += 5;
  } else {
    addCheck(checks, "slug_valid", "Slug valid (lowercase fără diacritice)", "fail", 0, "Slug-ul trebuie să fie lowercase, fără caractere speciale.");
    collectRecommendation("Fă slug-ul lowercase, fără diacritice și fără caractere speciale.", "slug_valid", "slug");
  }

  if (!keyword || !slug || slug.includes(keyword.replace(/\s+/g, "-"))) {
    addCheck(checks, "slug_contains_keyword", "Slug conține keyword", "pass", 3);
    score += 3;
  } else {
    addCheck(checks, "slug_contains_keyword", "Slug conține keyword", "warning", 1, "Dacă se poate, include keyword în slug.");
    score += 1;
    collectRecommendation("Dacă se poate, include keyword-ul în slug.", "slug_contains_keyword", "slug");
  }

  if (wordCount >= 900) {
    addCheck(checks, "content_length", "Conținut suficient (900+ cuvinte)", "pass", 10);
    score += 10;
  } else if (wordCount >= 600) {
    addCheck(checks, "content_length", "Conținut suficient (minim 600 cuvinte)", "warning", 7, "Pentru SEO mai bun, încearcă 900+ cuvinte.");
    score += 7;
    collectRecommendation("Pentru SEO mai bun, extinde articolul la 900+ cuvinte.", "content_length", "content");
  } else if (wordCount > 0) {
    addCheck(checks, "content_length", "Conținut suficient (minim 600 cuvinte)", "fail", 2, "Conținutul este prea scurt pentru un articol SEO.");
    score += 2;
    collectRecommendation("Conținutul este prea scurt. Țintește minim 600 cuvinte, ideal 900+.", "content_length", "content");
  } else {
    addCheck(checks, "content_length", "Conținut suficient (minim 600 cuvinte)", "fail", 0, "Adaugă conținut în articol.");
    collectRecommendation("Adaugă conținut în articol.", "content_length", "content");
  }

  if (headings.length >= 2) {
    addCheck(checks, "headings", "Structură cu H2/H3", "pass", 4);
    score += 4;
  } else {
    addCheck(checks, "headings", "Structură cu H2/H3", "warning", 1, "Adaugă subtitluri H2/H3.");
    score += 1;
    collectRecommendation("Adaugă subtitluri H2/H3.", "headings", "content");
  }

  if (hasList) {
    addCheck(checks, "lists", "Conținutul include liste", "pass", 3);
    score += 3;
  } else {
    addCheck(checks, "lists", "Conținutul include liste", "warning", 1, "Adaugă o listă bullet sau numerotată.");
    score += 1;
    collectRecommendation("Adaugă o listă bullet sau numerotată.", "lists", "content");
  }

  if (hasFaqSection(content)) {
    addCheck(checks, "faq_section", "Secțiune FAQ prezentă", "pass", 3);
    score += 3;
  } else {
    addCheck(checks, "faq_section", "Secțiune FAQ prezentă", "warning", 1, "Adaugă o secțiune FAQ unde este relevant.");
    score += 1;
    collectRecommendation("Adaugă o secțiune FAQ relevantă.", "faq_section", "content");
  }

  if (internalLinkCount >= 1) {
    addCheck(checks, "internal_links", "Link intern prezent", "pass", 3);
    score += 3;
  } else {
    addCheck(checks, "internal_links", "Link intern prezent", "warning", 1, "Adaugă cel puțin un link intern.");
    score += 1;
    collectRecommendation("Adaugă cel puțin un link intern.", "internal_links", "content");
  }

  if (externalLinkCount >= 1) {
    addCheck(checks, "external_links", "Link extern prezent", "pass", 2);
    score += 2;
  } else {
    addCheck(checks, "external_links", "Link extern prezent", "warning", 1, "Poți adăuga un link extern relevant.");
    score += 1;
    collectRecommendation("Adaugă un link extern relevant, dacă are sens.", "external_links", "content");
  }

  const hasImage = Boolean(post.featured_image);
  const hasAlt = Boolean(String(post.featured_image_alt || "").trim());
  if (hasImage) {
    addCheck(checks, "featured_image", "Imagine principală setată", "pass", 3);
    score += 3;
  } else {
    addCheck(checks, "featured_image", "Imagine principală setată", "warning", 1, "Adaugă imagine principală.");
    score += 1;
    collectRecommendation("Adaugă o imagine principală.", "featured_image", "featured_image");
  }
  if (hasImage && hasAlt) {
    addCheck(checks, "featured_image_alt", "ALT text pentru imagine", "pass", 3);
    score += 3;
  } else if (hasImage) {
    addCheck(checks, "featured_image_alt", "ALT text pentru imagine", "warning", 1, "Adaugă alt text relevant pentru imagine.");
    score += 1;
    collectRecommendation("Adaugă alt text relevant pentru imagine.", "featured_image_alt", "featured_image_alt");
  } else {
    addCheck(checks, "featured_image_alt", "ALT text pentru imagine", "fail", 0, "ALT text va fi util după ce adaugi imagine.");
  }

  if (paragraphCount > 0 && longParagraphCount <= Math.max(1, Math.floor(paragraphCount * 0.3))) {
    addCheck(checks, "readability", "Lizibilitate bună (paragrafe echilibrate)", "pass", 5);
    score += 5;
  } else if (paragraphCount > 0) {
    addCheck(checks, "readability", "Lizibilitate bună (paragrafe echilibrate)", "warning", 2, "Scurtează paragrafele foarte lungi.");
    score += 2;
    collectRecommendation("Scurtează paragrafele foarte lungi.", "readability", "content");
  } else {
    addCheck(checks, "readability", "Lizibilitate bună (paragrafe echilibrate)", "fail", 0, "Nu există paragrafe de analizat.");
    collectRecommendation("Adaugă paragrafe clare și bine separate.", "readability", "content");
  }

  if (score > 100) score = 100;

  let summary = "Articolul este bine optimizat.";
  if (score < 50) {
    summary = "Articolul are nevoie de optimizări SEO semnificative.";
  } else if (score < 80) {
    summary = "Articolul este aproape optimizat, dar are nevoie de ajustări pentru un scor mai bun.";
  }

  return {
    score,
    checks,
    summary,
    recommendations,
    recommendationItems,
    stats: {
      wordCount,
      headingCount: headings.length,
      internalLinkCount,
      externalLinkCount,
      keywordOccurrences
    }
  };
}

module.exports = {
  analyzeBlogPost
};
