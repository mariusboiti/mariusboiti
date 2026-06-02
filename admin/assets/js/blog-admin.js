(function () {
  function unwrap(response) {
    if (response && typeof response === "object" && "success" in response) {
      if (!response.success) {
        throw new Error(response.message || response.error || "Request failed");
      }
      return response.data;
    }
    return response;
  }

  async function apiX(url, options) {
    const response = await api(url, options);
    return unwrap(response);
  }

  function scoreBadge(score) {
    const value = Number(score || 0);
    if (value >= 80) return badge(`${value}`, "info");
    if (value >= 50) return badge(`${value}`, "warn");
    return badge(`${value}`, "danger");
  }

  function statusBadge(status) {
    const key = String(status || "draft").toLowerCase();
    if (key === "published") return badge("Publicat", "success");
    if (key === "scheduled") return badge("Programat", "warn");
    if (key === "archived") return badge("Arhivat", "neutral");
    return badge("Draft", "info");
  }

  function readTags(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  function normalizeAiText(text) {
    return String(text || "").trim();
  }

  function buildPostPayload(form) {
    const payload = formObject(form);
    payload.tags_json = readTags(payload.tags_json || "");
    payload.category_id = payload.category_id ? Number(payload.category_id) : null;
    return payload;
  }

  function registerSlugAuto(form, titleFieldName, slugFieldName) {
    const titleField = form.elements.namedItem(titleFieldName);
    const slugField = form.elements.namedItem(slugFieldName);
    if (!titleField || !slugField) return;
    let touched = Boolean(String(slugField.value || "").trim());
    slugField.addEventListener("input", () => { touched = true; });
    titleField.addEventListener("input", () => {
      if (!touched || !String(slugField.value || "").trim()) {
        slugField.value = slugify(titleField.value || "");
      }
    });
  }

  // ─── GEMINI TEXT MODELS ────────────────────────────────────────
  const GEMINI_TEXT_MODELS = [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (recomandat)" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    { value: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B (rapid)" }
  ];
  const GEMINI_IMAGE_MODELS = [
    { value: "imagen-3.0-generate-002", label: "Imagen 3 (recomandat)" },
    { value: "imagen-3.0-fast-generate-001", label: "Imagen 3 Fast" }
  ];
  const OPENAI_TEXT_MODELS = [
    { value: "gpt-4o-mini", label: "GPT-4o Mini (recomandat)" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (economic)" }
  ];
  const OPENAI_IMAGE_MODELS = [
    { value: "dall-e-3", label: "DALL-E 3 (recomandat)" },
    { value: "dall-e-2", label: "DALL-E 2 (economic)" }
  ];

  function modelOptions(models, selected) {
    return models.map((m) =>
      `<option value="${m.value}" ${m.value === selected ? "selected" : ""}>${esc(m.label)}</option>`
    ).join("");
  }

  // ─── BLOG EDITOR ───────────────────────────────────────────────
  async function openBlogEditor({ categories, onSaved, post = null }) {
    const m = modal({
      title: post ? `Editează: ${String(post.title || "articol").slice(0, 50)}` : "Articol nou",
      subtitle: "Conținut · SEO · AI Assist",
      size: "xl"
    });

    const status = post?.status || "draft";
    const tags = Array.isArray(post?.tags_json) ? post.tags_json.join(", ") : "";
    const publishedAt = post?.published_at ? String(post.published_at).slice(0, 16) : "";

    m.body.innerHTML = `
      <div class="tabs-inline" style="margin-bottom:1.2rem;">
        <button type="button" class="btn btn-secondary active" data-tab="content">✏️ Conținut</button>
        <button type="button" class="btn btn-secondary" data-tab="seo">🔍 SEO</button>
        <button type="button" class="btn btn-secondary" data-tab="ai">✨ AI Assist</button>
        <button type="button" class="btn btn-secondary" data-tab="image">🖼️ Generează imagine</button>
      </div>
      <form id="blog-post-form">

        <!-- ── TAB: CONȚINUT ───────────────────────── -->
        <section data-panel="content">
          <div class="grid grid-2" style="gap:.8rem;">
            <div class="field">
              <label>Titlu *</label>
              <input name="title" value="${esc(post?.title || "")}" required placeholder="Titlul articolului…" />
              <small class="field-error" data-error-for="title"></small>
            </div>
            <div class="field">
              <label>Slug *</label>
              <input name="slug" value="${esc(post?.slug || "")}" required placeholder="slug-url" />
              <small class="field-error" data-error-for="slug"></small>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Excerpt <small style="color:#94a3b8;">(rezumat scurt, 1–2 fraze)</small></label>
              <textarea name="excerpt" rows="2" placeholder="Rezumat scurt afișat în listele de articole…">${esc(post?.excerpt || "")}</textarea>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Conținut <small style="color:#94a3b8;">(HTML acceptat)</small></label>
              <textarea name="content" rows="18" placeholder="Scrie sau lipește conținutul articolului. HTML este acceptat (h2, h3, p, ul, strong…)">${esc(post?.content || "")}</textarea>
            </div>
            <div class="field">
              <label>Categorie</label>
              <select name="category_id">
                <option value="">Fără categorie</option>
                ${categories.map((item) =>
                  `<option value="${item.id}" ${Number(post?.category_id || 0) === Number(item.id) ? "selected" : ""}>${esc(item.name)}</option>`
                ).join("")}
              </select>
            </div>
            <div class="field">
              <label>Taguri <small style="color:#94a3b8;">(separate prin virgulă)</small></label>
              <input name="tags_json" value="${esc(tags)}" placeholder="seo, web design, antreprenori…" />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Imagine principală</label>
              <div style="display:flex;gap:.6rem;align-items:flex-start;flex-wrap:wrap;">
                <div style="flex:1;min-width:200px;">${imagePickerMarkup("featured_image", "", ".jpg,.jpeg,.png,.webp,.svg").replace('<div class="field">', '').replace('</div>', '')}</div>
                <div class="field" style="flex:1;min-width:200px;">
                  <label>Alt text imagine</label>
                  <input name="featured_image_alt" value="${esc(post?.featured_image_alt || "")}" placeholder="Descriere imagine pentru SEO…" />
                </div>
              </div>
              ${post?.featured_image ? `<div style="margin-top:.5rem;"><img src="${esc(post.featured_image)}" style="max-height:80px;border-radius:8px;object-fit:cover;" /></div>` : ""}
            </div>
            <div class="field">
              <label>Status publicare</label>
              <select name="status">
                <option value="draft" ${status === "draft" ? "selected" : ""}>📝 Draft</option>
                <option value="published" ${status === "published" ? "selected" : ""}>✅ Publicat</option>
                <option value="scheduled" ${status === "scheduled" ? "selected" : ""}>⏰ Programat</option>
                <option value="archived" ${status === "archived" ? "selected" : ""}>📦 Arhivat</option>
              </select>
            </div>
            <div class="field">
              <label>Data publicării</label>
              <input type="datetime-local" name="published_at" value="${esc(publishedAt)}" />
            </div>
            <div class="field">
              <label>Timp de citire (minute)</label>
              <input type="number" name="reading_time_minutes" min="1" max="60" value="${Number(post?.reading_time_minutes || 0) || ""}" placeholder="calculat automat" />
            </div>
          </div>
        </section>

        <!-- ── TAB: SEO ────────────────────────────── -->
        <section data-panel="seo" style="display:none;">
          <div class="grid grid-2" style="gap:.8rem;">
            <div class="field">
              <label>Focus keyword</label>
              <input name="focus_keyword" value="${esc(post?.focus_keyword || "")}" placeholder="ex: creare site web" />
            </div>
            <div class="field">
              <label>SEO Score</label>
              <input value="${Number(post?.seo_score || 0)}" readonly style="background:rgba(2,6,23,.3);" />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>SEO Title <small style="color:#94a3b8;">(max 60 caractere)</small></label>
              <input name="seo_title" value="${esc(post?.seo_title || "")}" placeholder="Titlu optimizat pentru Google…" maxlength="60" />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Meta Description <small style="color:#94a3b8;">(max 160 caractere)</small></label>
              <textarea name="seo_description" rows="2" maxlength="160" placeholder="Descriere afișată în rezultatele Google…">${esc(post?.seo_description || "")}</textarea>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>OG Title</label>
              <input name="og_title" value="${esc(post?.og_title || "")}" placeholder="Titlu pentru Facebook / LinkedIn…" />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>OG Description</label>
              <textarea name="og_description" rows="2" placeholder="Descriere pentru social media…">${esc(post?.og_description || "")}</textarea>
            </div>
            ${imagePickerMarkup("og_image", "OG Image (1200×630)", ".jpg,.jpeg,.png,.webp,.svg")}
            <div class="field">
              <label>Canonical URL</label>
              <input name="canonical_url" value="${esc(post?.canonical_url || "")}" placeholder="https://mariusboiti.ro/blog/…" />
            </div>
            <div class="field">
              <label>Robots</label>
              <input name="robots" value="${esc(post?.robots || "index,follow")}" />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>SEO Analysis</label>
              <pre id="seo-analysis-box" style="margin:0;padding:.8rem;border:1px solid var(--border);border-radius:10px;background:rgba(2,6,23,.35);max-height:200px;overflow:auto;white-space:pre-wrap;font-size:.78rem;">${esc(post?.seo_analysis_json ? JSON.stringify(post.seo_analysis_json, null, 2) : "Salvează articolul și apasă Analyze SEO.")}</pre>
            </div>
          </div>
        </section>

        <!-- ── TAB: AI ASSIST ─────────────────────── -->
        <section data-panel="ai" style="display:none;">
          <div class="grid grid-2" style="gap:.8rem;">
            <div class="field">
              <label>Provider AI</label>
              <select name="ai_provider">
                <option value="gemini">Gemini (Google)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
              </select>
            </div>
            <div class="field">
              <label>Ton</label>
              <input name="ai_tone" value="prietenos-profesionist" placeholder="prietenos-profesionist" />
            </div>
            <div class="field">
              <label>Topic / Subiect</label>
              <input name="ai_topic" value="${esc(post?.title || "")}" placeholder="ex: de ce ai nevoie de site web" />
            </div>
            <div class="field">
              <label>Focus keyword</label>
              <input name="ai_focus_keyword" value="${esc(post?.focus_keyword || "")}" placeholder="ex: creare site web" />
            </div>
            <div class="field">
              <label>Public țintă</label>
              <input name="ai_audience" value="antreprenori mici, freelanceri" />
            </div>
            <div class="field">
              <label>Obiectiv articol</label>
              <input name="ai_goal" value="educare + lead generation" />
            </div>
            <div class="row row-wrap" style="grid-column:1/-1;gap:.5rem;padding:.6rem;background:rgba(2,6,23,.25);border-radius:10px;">
              <button class="btn btn-secondary" type="button" data-ai-action="outline">📋 Outline</button>
              <button class="btn btn-secondary" type="button" data-ai-action="article">✍️ Generează articol</button>
              <button class="btn btn-secondary" type="button" data-ai-action="improve">💎 Îmbunătățește</button>
              <button class="btn btn-secondary" type="button" data-ai-action="seo">🔍 SEO metadata</button>
              <button class="btn btn-secondary" type="button" data-ai-action="fix-seo">🩹 Repară SEO</button>
              <button class="btn btn-secondary" type="button" data-ai-action="image-prompt">💡 Prompt imagine</button>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label style="display:flex;align-items:center;justify-content:space-between;">
                <span>Rezultat AI</span>
                <small id="ai-char-count" style="color:#64748b;"></small>
              </label>
              <textarea id="ai-preview-box" rows="12" placeholder="Rezultatul generat de AI apare aici. Poți edita înainte de aplicare."></textarea>
            </div>
            <div class="row row-wrap" style="grid-column:1/-1;gap:.5rem;">
              <button class="btn btn-primary" type="button" data-ai-apply="replace">↩ Înlocuiește conținutul</button>
              <button class="btn btn-secondary" type="button" data-ai-apply="append">⬇ Adaugă la final</button>
              <button class="btn btn-secondary" type="button" data-ai-apply="copy">📋 Copiază</button>
              <button class="btn btn-danger" type="button" data-ai-apply="clear">✕ Șterge rezultat</button>
            </div>
          </div>
        </section>

        <!-- ── TAB: GENERARE IMAGINE ──────────────── -->
        <section data-panel="image" style="display:none;">
          <div class="grid grid-2" style="gap:.8rem;">
            <div class="field">
              <label>Provider imagine</label>
              <select name="img_provider" id="img-provider-select">
                <option value="openai">OpenAI (DALL-E)</option>
                <option value="gemini">Google (Imagen)</option>
              </select>
            </div>
            <div class="field">
              <label>Model imagine</label>
              <select name="img_model" id="img-model-select">
                ${modelOptions(OPENAI_IMAGE_MODELS, "dall-e-3")}
              </select>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>
                Prompt imagine
                <button class="btn btn-secondary" type="button" id="ai-suggest-img-prompt" style="margin-left:.5rem;padding:.25rem .6rem;font-size:.8rem;">✨ Sugerează prompt</button>
              </label>
              <textarea name="img_prompt" id="img-prompt-input" rows="4" placeholder="Descrie în engleză imaginea dorită. Ex: A modern Romanian entrepreneur working on a laptop in a bright, minimalist office…"></textarea>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <button class="btn btn-primary" type="button" id="ai-generate-image-btn" style="width:100%;">🎨 Generează imaginea</button>
            </div>
            <div id="ai-image-result" style="grid-column:1/-1;display:none;">
              <div style="border:1px solid var(--border);border-radius:12px;padding:1rem;background:rgba(2,6,23,.3);">
                <img id="ai-generated-img" src="" alt="Imagine generată" style="width:100%;max-height:420px;object-fit:contain;border-radius:8px;margin-bottom:.8rem;" />
                <div style="font-size:.8rem;color:#94a3b8;margin-bottom:.6rem;" id="ai-revised-prompt"></div>
                <div class="row row-wrap" style="gap:.5rem;">
                  <button class="btn btn-primary" type="button" id="use-as-featured-btn">✅ Folosește ca imagine principală</button>
                  <button class="btn btn-secondary" type="button" id="use-as-og-btn">📤 Folosește ca OG image</button>
                  <a id="ai-image-download-link" href="#" download style="display:none;">
                    <button class="btn btn-secondary" type="button">⬇ Descarcă</button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

      </form>
    `;

    // Setup image pickers
    const featuredImageField = m.body.querySelector("[data-image-picker-field='featured_image']");
    if (!featuredImageField) {
      // image picker markup was inlined without wrapper — setup manually
    }
    setupImagePickers(m.body);

    const form = $("#blog-post-form", m.body);
    registerSlugAuto(form, "title", "slug");

    // ── TABS ──────────────────────────────────────────
    const tabButtons = $$("[data-tab]", m.body);
    const panels = $$("[data-panel]", m.body);
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.tab;
        tabButtons.forEach((b) => b.classList.toggle("active", b === button));
        panels.forEach((panel) => {
          panel.style.display = panel.dataset.panel === key ? "" : "none";
        });
      });
    });

    // ── AI TEXT ACTIONS ───────────────────────────────
    const aiPreview = $("#ai-preview-box", m.body);
    const aiCharCount = $("#ai-char-count", m.body);
    const contentField = form.elements.namedItem("content");
    const seoAnalysisBox = $("#seo-analysis-box", m.body);

    aiPreview.addEventListener("input", () => {
      const len = aiPreview.value.length;
      aiCharCount.textContent = len > 0 ? `${len} caractere` : "";
    });

    async function triggerAi(endpoint) {
      const payload = {
        provider: form.elements.namedItem("ai_provider")?.value || "gemini",
        tone: form.elements.namedItem("ai_tone")?.value || "",
        topic: form.elements.namedItem("ai_topic")?.value || "",
        focusKeyword: form.elements.namedItem("ai_focus_keyword")?.value || "",
        audience: form.elements.namedItem("ai_audience")?.value || "",
        goal: form.elements.namedItem("ai_goal")?.value || "",
        title: form.elements.namedItem("title")?.value || "",
        content: contentField?.value || "",
        excerpt: form.elements.namedItem("excerpt")?.value || "",
        analysis: seoAnalysisBox?.textContent || ""
      };

      const result = await apiX(endpoint, { method: "POST", body: JSON.stringify(payload) });
      const text = normalizeAiText(result?.text || result?.data?.text || "");
      aiPreview.value = text || JSON.stringify(result, null, 2);
      aiCharCount.textContent = aiPreview.value.length > 0 ? `${aiPreview.value.length} caractere` : "";
      toast("Răspuns AI primit ✓");
    }

    $$("[data-ai-action]", m.body).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const origText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Se generează…";
        try {
          const action = btn.dataset.aiAction;
          const routes = {
            outline: "/api/admin/ai/blog/generate-outline",
            article: "/api/admin/ai/blog/generate-article",
            improve: "/api/admin/ai/blog/improve-content",
            seo: "/api/admin/ai/blog/generate-seo",
            "fix-seo": "/api/admin/ai/blog/fix-seo",
            "image-prompt": "/api/admin/ai/blog/generate-image-prompt"
          };
          if (routes[action]) await triggerAi(routes[action]);
        } catch (error) {
          toast(error.message, "error");
        } finally {
          btn.disabled = false;
          btn.textContent = origText;
        }
      });
    });

    $$("[data-ai-apply]", m.body).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = btn.dataset.aiApply;
        const value = aiPreview.value || "";
        if (!value && mode !== "clear") { toast("Nu există rezultat AI de aplicat.", "error"); return; }
        if (mode === "replace") { contentField.value = value; toast("Conținut înlocuit."); }
        if (mode === "append") { contentField.value = `${contentField.value || ""}\n\n${value}`.trim(); toast("Adăugat la final."); }
        if (mode === "copy") {
          await navigator.clipboard.writeText(value);
          toast("Copiat în clipboard ✓");
          return;
        }
        if (mode === "clear") { aiPreview.value = ""; aiCharCount.textContent = ""; }
      });
    });

    // ── IMAGE GENERATION ──────────────────────────────
    const imgProviderSelect = $("#img-provider-select", m.body);
    const imgModelSelect = $("#img-model-select", m.body);
    const imgPromptInput = $("#img-prompt-input", m.body);
    const generateImgBtn = $("#ai-generate-image-btn", m.body);
    const imageResult = $("#ai-image-result", m.body);
    const generatedImg = $("#ai-generated-img", m.body);
    const revisedPromptEl = $("#ai-revised-prompt", m.body);
    const suggestPromptBtn = $("#ai-suggest-img-prompt", m.body);
    let lastGeneratedUrl = "";

    imgProviderSelect.addEventListener("change", () => {
      const provider = imgProviderSelect.value;
      const models = provider === "openai" ? OPENAI_IMAGE_MODELS : GEMINI_IMAGE_MODELS;
      const currentDefault = provider === "openai" ? "dall-e-3" : "imagen-3.0-generate-002";
      imgModelSelect.innerHTML = modelOptions(models, currentDefault);
    });

    suggestPromptBtn.addEventListener("click", async () => {
      const origText = suggestPromptBtn.textContent;
      suggestPromptBtn.disabled = true;
      suggestPromptBtn.textContent = "Se generează…";
      try {
        const payload = {
          provider: form.elements.namedItem("ai_provider")?.value || "gemini",
          title: form.elements.namedItem("title")?.value || "",
          focusKeyword: form.elements.namedItem("ai_focus_keyword")?.value || "",
          excerpt: form.elements.namedItem("excerpt")?.value || "",
          content: (contentField?.value || "").slice(0, 400)
        };
        const result = await apiX("/api/admin/ai/blog/generate-image-prompt", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const text = normalizeAiText(result?.text || "");
        if (text) { imgPromptInput.value = text; toast("Prompt sugerat ✓"); }
      } catch (error) {
        toast(error.message, "error");
      } finally {
        suggestPromptBtn.disabled = false;
        suggestPromptBtn.textContent = origText;
      }
    });

    generateImgBtn.addEventListener("click", async () => {
      const prompt = imgPromptInput.value.trim();
      if (!prompt) { toast("Scrie un prompt pentru imagine.", "error"); return; }

      const origText = generateImgBtn.textContent;
      generateImgBtn.disabled = true;
      generateImgBtn.textContent = "⏳ Se generează imaginea…";
      imageResult.style.display = "none";

      try {
        const payload = {
          provider: imgProviderSelect.value,
          model: imgModelSelect.value,
          prompt
        };
        const result = await apiX("/api/admin/ai/blog/generate-image", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        const url = result?.url || result?.data?.url;
        if (!url) throw new Error("Imaginea nu a putut fi generată.");

        lastGeneratedUrl = url;
        generatedImg.src = url;
        revisedPromptEl.textContent = result?.revisedPrompt ? `Prompt final: ${result.revisedPrompt}` : "";

        const downloadLink = $("#ai-image-download-link", m.body);
        if (downloadLink) {
          downloadLink.href = url;
          downloadLink.style.display = "";
        }

        imageResult.style.display = "";
        toast("Imaginea a fost generată ✓");
      } catch (error) {
        toast(error.message, "error");
      } finally {
        generateImgBtn.disabled = false;
        generateImgBtn.textContent = origText;
      }
    });

    // Use generated image as featured image
    const useFeaturedBtn = $("#use-as-featured-btn", m.body);
    if (useFeaturedBtn) {
      useFeaturedBtn.addEventListener("click", () => {
        if (!lastGeneratedUrl) return;
        // Try to set in image picker input, otherwise create a fallback
        const pickers = $$("[data-image-picker-name]", m.body);
        let set = false;
        pickers.forEach((picker) => {
          if (picker.dataset.imagePickerName === "featured_image") {
            const input = picker.closest("[data-image-picker]")?.querySelector("input[type='hidden']")
              || form.elements.namedItem("featured_image");
            if (input) { input.value = lastGeneratedUrl; set = true; }
          }
        });
        // Fallback: set the named input directly
        if (!set) {
          const imgInput = form.elements.namedItem("featured_image");
          if (imgInput) { imgInput.value = lastGeneratedUrl; set = true; }
        }
        toast(set ? "Imagine setată ca featured ✓" : "Nu am putut seta imaginea — copiaz-o manual.", set ? "success" : "error");
      });
    }

    const useOgBtn = $("#use-as-og-btn", m.body);
    if (useOgBtn) {
      useOgBtn.addEventListener("click", () => {
        if (!lastGeneratedUrl) return;
        const ogInput = form.elements.namedItem("og_image");
        if (ogInput) { ogInput.value = lastGeneratedUrl; toast("Imagine setată ca OG image ✓"); }
      });
    }

    // ── FOOTER BUTTONS ────────────────────────────────
    m.foot.innerHTML = `
      <button class="btn btn-secondary" type="button" id="analyze-seo-btn">🔍 Analyze SEO</button>
      <button class="btn btn-secondary" type="button" data-cancel>Anulează</button>
      <button class="btn btn-primary" type="button" id="save-post-btn">💾 Salvează</button>
    `;

    $("[data-cancel]", m.foot).addEventListener("click", m.close);

    $("#analyze-seo-btn", m.foot).addEventListener("click", async () => {
      if (!post?.id) { toast("Salvează articolul înainte de Analyze SEO.", "error"); return; }
      try {
        const analysis = await apiX(`/api/admin/blog/posts/${post.id}/analyze-seo`, { method: "POST" });
        seoAnalysisBox.textContent = JSON.stringify(analysis, null, 2);
        toast("Scor SEO actualizat ✓");
      } catch (error) {
        toast(error.message, "error");
      }
    });

    $("#save-post-btn", m.foot).addEventListener("click", async () => {
      const payload = buildPostPayload(form);
      const errors = {};
      if (!payload.title) errors.title = "Titlul este obligatoriu.";
      if (!payload.slug && !payload.title) errors.slug = "Slug-ul este obligatoriu.";
      if (Object.keys(errors).length) {
        applyErrors(form, errors);
        toast("Completează câmpurile obligatorii.", "error");
        return;
      }
      const btn = $("#save-post-btn", m.foot);
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Se salvează…";
      try {
        clearErrors(form);
        if (post?.id) {
          await apiX(`/api/admin/blog/posts/${post.id}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
          await apiX("/api/admin/blog/posts", { method: "POST", body: JSON.stringify(payload) });
        }
        toast("Salvat cu succes ✓");
        m.close();
        await onSaved();
      } catch (error) {
        toast(error.message, "error");
        btn.disabled = false;
        btn.textContent = origText;
      }
    });
  }

  // ─── BLOG LIST PAGE ────────────────────────────────────────────
  window.initBlogPage = async function initBlogPage() {
    const mount = $("#blog-page");
    if (!mount) return;
    mount.innerHTML = `
      ${pageHeader("Blog", "Gestionează articolele pentru SEO, trafic organic și lead generation.", "+ Articol nou", "blog-add-btn")}
      <section class="card">
        <form id="blog-filters" class="grid grid-3" style="margin-bottom:.8rem;">
          <div class="field">
            <label>Status</label>
            <select name="status">
              <option value="">Toate</option>
              <option value="draft">Draft</option>
              <option value="published">Publicat</option>
              <option value="scheduled">Programat</option>
              <option value="archived">Arhivat</option>
            </select>
          </div>
          <div class="field">
            <label>Categorie</label>
            <select name="category_id" id="blog-filter-category"><option value="">Toate</option></select>
          </div>
          <div class="field">
            <label>Căutare</label>
            <input name="search" placeholder="Caută după titlu…" />
          </div>
        </form>
        <div id="blog-table-wrap"></div>
      </section>
    `;

    const filters = $("#blog-filters", mount);
    const tableWrap = $("#blog-table-wrap", mount);
    const categoryFilter = $("#blog-filter-category", mount);
    const addButton = $("#blog-add-btn", mount);

    let posts = [];
    let categories = [];

    async function loadCategories() {
      categories = await apiX("/api/admin/blog/categories");
      categoryFilter.innerHTML = `<option value="">Toate</option>${categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}`;
    }

    function renderRows() {
      if (!posts.length) {
        emptyState(tableWrap, "Nu există încă articole.", "Adaugă primul articol", () => openBlogEditor({ categories, onSaved: loadData }));
        return;
      }
      tableWrap.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Titlu</th><th>Status</th><th>Categorie</th><th>SEO</th><th>Publicat</th><th>Acțiuni</th></tr></thead>
            <tbody id="blog-posts-body"></tbody>
          </table>
        </div>
      `;
      const body = $("#blog-posts-body", tableWrap);
      body.innerHTML = posts.map((post) => `
        <tr>
          <td style="max-width:300px;"><span style="font-weight:600;">${esc(post.title)}</span></td>
          <td>${statusBadge(post.status)}</td>
          <td>${esc(post.category?.name || "—")}</td>
          <td>${scoreBadge(post.seo_score || 0)}</td>
          <td style="white-space:nowrap;">${post.published_at ? esc(new Date(post.published_at).toLocaleDateString("ro-RO")) : "—"}</td>
          <td class="table-actions row">
            <button class="btn btn-secondary" type="button" data-edit="${post.id}">Edit</button>
            <a class="btn btn-secondary" href="/blog/${encodeURIComponent(post.slug)}" target="_blank" rel="noopener">Preview</a>
            <button class="btn btn-danger" type="button" data-delete="${post.id}">✕</button>
          </td>
        </tr>
      `).join("");

      $$("[data-edit]", body).forEach((button) => {
        button.addEventListener("click", async () => {
          button.textContent = "…";
          button.disabled = true;
          const detailed = await apiX(`/api/admin/blog/posts/${button.dataset.edit}`);
          button.textContent = "Edit";
          button.disabled = false;
          await openBlogEditor({ categories, post: detailed, onSaved: loadData });
        });
      });

      $$("[data-delete]", body).forEach((button) => {
        button.addEventListener("click", async () => {
          const item = posts.find((row) => String(row.id) === button.dataset.delete);
          const confirmed = await confirmModal("Șterge articol", `Sigur vrei să ștergi „${item?.title || "articolul selectat"}"?`);
          if (!confirmed) return;
          await apiX(`/api/admin/blog/posts/${button.dataset.delete}`, { method: "DELETE" });
          toast("Articol șters.");
          await loadData();
        });
      });
    }

    async function loadData() {
      const params = new URLSearchParams(new FormData(filters));
      const result = await apiX(`/api/admin/blog/posts?${params.toString()}`);
      posts = result.items || [];
      renderRows();
    }

    addButton.addEventListener("click", async () => {
      await openBlogEditor({ categories, onSaved: loadData });
    });

    filters.addEventListener("change", loadData);
    filters.addEventListener("submit", (event) => { event.preventDefault(); loadData(); });

    await loadCategories();
    await loadData();
  };

  // ─── BLOG CATEGORIES ───────────────────────────────────────────
  window.initBlogCategoriesPage = async function initBlogCategoriesPage() {
    const mount = $("#blog-categories-page");
    if (!mount) return;
    mount.innerHTML = `
      ${pageHeader("Categorii blog", "Gestionează categoriile folosite pentru articole.", "Adaugă categorie", "blog-category-add-btn")}
      <section class="card">
        <div id="blog-categories-table"></div>
      </section>
    `;

    const tableWrap = $("#blog-categories-table", mount);
    const addButton = $("#blog-category-add-btn", mount);
    let categories = [];

    function renderRows() {
      if (!categories.length) {
        emptyState(tableWrap, "Nu există încă categorii.", "Adaugă prima categorie", () => editCategory());
        return;
      }
      tableWrap.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nume</th><th>Slug</th><th>Sort</th><th>Status</th><th>Acțiuni</th></tr></thead>
            <tbody id="blog-categories-body"></tbody>
          </table>
        </div>
      `;
      const body = $("#blog-categories-body", tableWrap);
      body.innerHTML = categories.map((item) => `
        <tr>
          <td>${esc(item.name)}</td>
          <td>${esc(item.slug)}</td>
          <td>${Number(item.sort_order || 0)}</td>
          <td>${item.is_active ? badge("Activ", "success") : badge("Inactiv", "neutral")}</td>
          <td class="table-actions row">
            <button class="btn btn-secondary" type="button" data-edit="${item.id}">Edit</button>
            <button class="btn btn-danger" type="button" data-delete="${item.id}">✕</button>
          </td>
        </tr>
      `).join("");

      $$("[data-edit]", body).forEach((button) => {
        button.addEventListener("click", () => {
          const item = categories.find((row) => String(row.id) === button.dataset.edit);
          editCategory(item);
        });
      });
      $$("[data-delete]", body).forEach((button) => {
        button.addEventListener("click", async () => {
          const item = categories.find((row) => String(row.id) === button.dataset.delete);
          const confirmed = await confirmModal("Șterge categorie", `Sigur vrei să ștergi „${item?.name || ""}"?`);
          if (!confirmed) return;
          await apiX(`/api/admin/blog/categories/${button.dataset.delete}`, { method: "DELETE" });
          toast("Categorie ștearsă.");
          await load();
        });
      });
    }

    async function load() {
      categories = await apiX("/api/admin/blog/categories");
      renderRows();
    }

    async function editCategory(item = null) {
      const m = modal({
        title: item ? "Editează categorie" : "Adaugă categorie",
        subtitle: "Nume, slug, sort și status",
        size: "lg"
      });
      m.body.innerHTML = `
        <form id="blog-category-form" class="grid grid-2">
          <div class="field">
            <label>Nume</label>
            <input name="name" value="${esc(item?.name || "")}" required />
            <small class="field-error" data-error-for="name"></small>
          </div>
          <div class="field">
            <label>Slug</label>
            <input name="slug" value="${esc(item?.slug || "")}" />
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>Descriere</label>
            <textarea name="description" rows="2">${esc(item?.description || "")}</textarea>
          </div>
          <div class="field">
            <label>Sort order</label>
            <input type="number" name="sort_order" value="${Number(item?.sort_order || 0)}" />
          </div>
          <div class="field" style="display:flex;align-items:center;gap:.5rem;margin-top:1.7rem;">
            <input id="cat-active-cb" type="checkbox" name="is_active" value="1" ${item?.is_active === false ? "" : "checked"} />
            <label for="cat-active-cb">Activ</label>
          </div>
        </form>
      `;
      const form = $("#blog-category-form", m.body);
      registerSlugAuto(form, "name", "slug");
      m.foot.innerHTML = `
        <button class="btn btn-secondary" type="button" data-cancel>Anulează</button>
        <button class="btn btn-primary" type="button" data-save>Salvează</button>
      `;
      $("[data-cancel]", m.foot).addEventListener("click", m.close);
      $("[data-save]", m.foot).addEventListener("click", async () => {
        const payload = formObject(form);
        if (!payload.name) { applyErrors(form, { name: "Numele este obligatoriu." }); return; }
        if (item?.id) {
          await apiX(`/api/admin/blog/categories/${item.id}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
          await apiX("/api/admin/blog/categories", { method: "POST", body: JSON.stringify(payload) });
        }
        toast("Salvat ✓");
        m.close();
        await load();
      });
    }

    addButton.addEventListener("click", () => editCategory());
    await load();
  };

  // ─── AI SETTINGS PAGE ──────────────────────────────────────────
  window.initAiSettingsPage = async function initAiSettingsPage() {
    const mount = $("#ai-settings-page");
    if (!mount) return;
    mount.innerHTML = `
      ${pageHeader("AI Settings", "Configurează cheile API, modelele și parametrii pentru AI Assist în blog.")}

      <div class="grid grid-2" style="gap:1rem;align-items:start;">

        <!-- ─ Gemini ─────────────────────── -->
        <section class="card" style="padding:1.2rem 1.4rem;">
          <h3 style="margin:0 0 .3rem;font-size:1rem;">🔵 Google Gemini</h3>
          <p style="margin:0 0 1rem;color:#94a3b8;font-size:.85rem;">Text generation + Imagen (generare imagini)</p>
          <div class="grid grid-1" style="gap:.7rem;">
            <div class="field">
              <label>API Key</label>
              <div style="display:flex;gap:.4rem;">
                <input type="password" id="gemini-api-key-input" name="gemini_api_key" placeholder="AIza…" autocomplete="off" style="flex:1;" />
                <button type="button" class="btn btn-secondary" id="gemini-key-toggle" title="Arată/ascunde cheia" style="padding:.4rem .7rem;">👁</button>
              </div>
              <small style="color:#64748b;" id="gemini-key-status"></small>
            </div>
            <div class="field">
              <label>Model text</label>
              <select id="gemini-text-model" name="gemini_text_model">
                ${modelOptions(GEMINI_TEXT_MODELS, "gemini-2.0-flash")}
              </select>
            </div>
            <div class="field">
              <label>Model imagine (Imagen)</label>
              <select id="gemini-image-model" name="gemini_image_model">
                ${modelOptions(GEMINI_IMAGE_MODELS, "imagen-3.0-generate-002")}
              </select>
            </div>
          </div>
        </section>

        <!-- ─ OpenAI ─────────────────────── -->
        <section class="card" style="padding:1.2rem 1.4rem;">
          <h3 style="margin:0 0 .3rem;font-size:1rem;">🟢 OpenAI (ChatGPT / DALL-E)</h3>
          <p style="margin:0 0 1rem;color:#94a3b8;font-size:.85rem;">Text GPT-4 + DALL-E generare imagini</p>
          <div class="grid grid-1" style="gap:.7rem;">
            <div class="field">
              <label>API Key</label>
              <div style="display:flex;gap:.4rem;">
                <input type="password" id="openai-api-key-input" name="openai_api_key" placeholder="sk-…" autocomplete="off" style="flex:1;" />
                <button type="button" class="btn btn-secondary" id="openai-key-toggle" title="Arată/ascunde cheia" style="padding:.4rem .7rem;">👁</button>
              </div>
              <small style="color:#64748b;" id="openai-key-status"></small>
            </div>
            <div class="field">
              <label>Model text</label>
              <select id="openai-text-model" name="openai_text_model">
                ${modelOptions(OPENAI_TEXT_MODELS, "gpt-4o-mini")}
              </select>
            </div>
            <div class="field">
              <label>Model imagine (DALL-E)</label>
              <select id="openai-image-model" name="openai_image_model">
                ${modelOptions(OPENAI_IMAGE_MODELS, "dall-e-3")}
              </select>
            </div>
          </div>
        </section>

        <!-- ─ Setări generale ─────────────── -->
        <section class="card" style="padding:1.2rem 1.4rem;grid-column:1/-1;">
          <h3 style="margin:0 0 1rem;font-size:1rem;">⚙️ Setări generale</h3>
          <div class="grid grid-3" style="gap:.7rem;">
            <div class="field">
              <label>Provider default</label>
              <select id="ai-provider-select" name="provider">
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div class="field">
              <label>Temperature <small style="color:#94a3b8;">(0 = precis, 1 = creativ)</small></label>
              <input type="number" step="0.1" min="0" max="1.5" id="ai-temperature" name="temperature" />
            </div>
            <div class="field">
              <label>Max tokens</label>
              <input type="number" min="200" max="4000" id="ai-max-tokens" name="max_tokens" />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>System prompt <small style="color:#94a3b8;">(instrucțiunea de bază pentru AI)</small></label>
              <textarea id="ai-system-prompt" name="system_prompt" rows="4" placeholder="Ești copywriter SEO în română…"></textarea>
            </div>
          </div>
          <div class="row" style="justify-content:flex-end;margin-top:1rem;">
            <button class="btn btn-primary" type="button" id="save-ai-settings-btn">💾 Salvează setările</button>
          </div>
        </section>

      </div>
    `;

    // ── Show/hide toggles ─────────────────────────────
    function setupKeyToggle(inputId, btnId) {
      const input = $(`#${inputId}`, mount);
      const btn = $(`#${btnId}`, mount);
      if (!input || !btn) return;
      btn.addEventListener("click", () => {
        input.type = input.type === "password" ? "text" : "password";
        btn.textContent = input.type === "password" ? "👁" : "🙈";
      });
    }
    setupKeyToggle("gemini-api-key-input", "gemini-key-toggle");
    setupKeyToggle("openai-api-key-input", "openai-key-toggle");

    // ── Load settings ─────────────────────────────────
    async function load() {
      const settings = await apiX("/api/admin/ai/settings");

      // Keys — show masked or placeholder
      const geminiInput = $("#gemini-api-key-input", mount);
      const openaiInput = $("#openai-api-key-input", mount);
      const geminiStatus = $("#gemini-key-status", mount);
      const openaiStatus = $("#openai-key-status", mount);

      if (settings.api_key_status?.gemini) {
        geminiInput.placeholder = settings.gemini_key_masked || "Cheie configurată";
        geminiInput.value = "";
        geminiStatus.textContent = "✅ Cheie configurată — lasă gol ca să nu o schimbi";
        geminiStatus.style.color = "#4ade80";
      } else {
        geminiInput.placeholder = "AIza… — introduceți cheia API";
        geminiStatus.textContent = "⚠️ Cheie lipsă — funcționalitățile AI nu vor funcționa";
        geminiStatus.style.color = "#fb923c";
      }

      if (settings.api_key_status?.openai) {
        openaiInput.placeholder = settings.openai_key_masked || "Cheie configurată";
        openaiInput.value = "";
        openaiStatus.textContent = "✅ Cheie configurată — lasă gol ca să nu o schimbi";
        openaiStatus.style.color = "#4ade80";
      } else {
        openaiInput.placeholder = "sk-… — introduceți cheia API";
        openaiStatus.textContent = "⚠️ Cheie lipsă — funcționalitățile AI nu vor funcționa";
        openaiStatus.style.color = "#fb923c";
      }

      // Models
      const setSelect = (id, value) => {
        const el = $(`#${id}`, mount);
        if (el && value) {
          // If option doesn't exist, add it
          if (!el.querySelector(`option[value="${CSS.escape(value)}"]`)) {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = value;
            el.appendChild(opt);
          }
          el.value = value;
        }
      };

      setSelect("gemini-text-model", settings.gemini_text_model || "gemini-2.0-flash");
      setSelect("openai-text-model", settings.openai_text_model || "gpt-4o-mini");
      setSelect("gemini-image-model", settings.gemini_image_model || "imagen-3.0-generate-002");
      setSelect("openai-image-model", settings.openai_image_model || "dall-e-3");
      setSelect("ai-provider-select", settings.provider || "gemini");

      const tempInput = $("#ai-temperature", mount);
      if (tempInput) tempInput.value = settings.temperature ?? 0.7;
      const tokensInput = $("#ai-max-tokens", mount);
      if (tokensInput) tokensInput.value = settings.max_tokens ?? 1200;
      const systemPromptInput = $("#ai-system-prompt", mount);
      if (systemPromptInput) systemPromptInput.value = settings.system_prompt || "";
    }

    // ── Save ──────────────────────────────────────────
    const saveBtn = $("#save-ai-settings-btn", mount);
    saveBtn.addEventListener("click", async () => {
      const origText = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = "Se salvează…";
      try {
        const payload = {
          provider: $("#ai-provider-select", mount)?.value || "gemini",
          temperature: parseFloat($("#ai-temperature", mount)?.value) || 0.7,
          max_tokens: parseInt($("#ai-max-tokens", mount)?.value, 10) || 1200,
          system_prompt: $("#ai-system-prompt", mount)?.value || "",
          gemini_text_model: $("#gemini-text-model", mount)?.value || "gemini-2.0-flash",
          openai_text_model: $("#openai-text-model", mount)?.value || "gpt-4o-mini",
          gemini_image_model: $("#gemini-image-model", mount)?.value || "imagen-3.0-generate-002",
          openai_image_model: $("#openai-image-model", mount)?.value || "dall-e-3"
        };

        // Include API keys only if user typed something new
        const geminiKey = $("#gemini-api-key-input", mount)?.value?.trim();
        const openaiKey = $("#openai-api-key-input", mount)?.value?.trim();
        if (geminiKey) payload.gemini_api_key = geminiKey;
        if (openaiKey) payload.openai_api_key = openaiKey;

        await apiX("/api/admin/ai/settings", { method: "PUT", body: JSON.stringify(payload) });
        toast("Setări AI salvate ✓");
        await load(); // Reload to update key status
      } catch (error) {
        toast(error.message, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = origText;
      }
    });

    await load();
  };
})();
