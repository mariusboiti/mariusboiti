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

  function ensureTextInSplitButton(button) {
    if (!button) return;
    const hasLabel = button.querySelector(".split-jelly-label");
    if (!hasLabel) return;
    const labelText = button.dataset.label || hasLabel.textContent || "";
    hasLabel.textContent = labelText;
  }

  function normalizeAiText(text) {
    const raw = String(text || "").trim();
    if (!raw) return "";
    return raw;
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
    slugField.addEventListener("input", () => {
      touched = true;
    });
    titleField.addEventListener("input", () => {
      if (!touched || !String(slugField.value || "").trim()) {
        slugField.value = slugify(titleField.value || "");
      }
    });
  }

  async function openBlogEditor({ categories, onSaved, post = null }) {
    const m = modal({
      title: post ? "Editează articol" : "Adaugă articol",
      subtitle: "Conținut, SEO și AI Assist",
      size: "xl"
    });

    const status = post?.status || "draft";
    const tags = Array.isArray(post?.tags_json) ? post.tags_json.join(", ") : "";
    const publishedAt = post?.published_at ? String(post.published_at).slice(0, 16) : "";

    m.body.innerHTML = `
      <div class="tabs-inline">
        <button type="button" class="btn btn-secondary active" data-tab="content">Conținut</button>
        <button type="button" class="btn btn-secondary" data-tab="seo">SEO</button>
        <button type="button" class="btn btn-secondary" data-tab="ai">AI Assist</button>
      </div>
      <form id="blog-post-form" class="grid grid-2" style="margin-top:1rem;">
        <section data-panel="content" style="grid-column:1/-1;">
          <div class="grid grid-2">
            <div class="field">
              <label>Titlu</label>
              <input name="title" value="${esc(post?.title || "")}" required />
              <small class="field-error" data-error-for="title"></small>
            </div>
            <div class="field">
              <label>Slug</label>
              <input name="slug" value="${esc(post?.slug || "")}" required />
              <small class="field-error" data-error-for="slug"></small>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Excerpt</label>
              <textarea name="excerpt" rows="3">${esc(post?.excerpt || "")}</textarea>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Conținut (HTML permis)</label>
              <textarea name="content" rows="16">${esc(post?.content || "")}</textarea>
            </div>
            <div class="field">
              <label>Categorie</label>
              <select name="category_id">
                <option value="">Fără categorie</option>
                ${categories
                  .map((item) => `<option value="${item.id}" ${Number(post?.category_id || 0) === Number(item.id) ? "selected" : ""}>${esc(item.name)}</option>`)
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label>Taguri (separate prin virgulă)</label>
              <input name="tags_json" value="${esc(tags)}" />
            </div>
            ${imagePickerMarkup("featured_image", "Imagine principală", ".jpg,.jpeg,.png,.webp,.svg")}
            <div class="field">
              <label>Alt text imagine</label>
              <input name="featured_image_alt" value="${esc(post?.featured_image_alt || "")}" />
            </div>
            <div class="field">
              <label>Status</label>
              <select name="status">
                <option value="draft" ${status === "draft" ? "selected" : ""}>Draft</option>
                <option value="published" ${status === "published" ? "selected" : ""}>Publicat</option>
                <option value="scheduled" ${status === "scheduled" ? "selected" : ""}>Programat</option>
                <option value="archived" ${status === "archived" ? "selected" : ""}>Arhivat</option>
              </select>
            </div>
            <div class="field">
              <label>Published at</label>
              <input type="datetime-local" name="published_at" value="${esc(publishedAt)}" />
            </div>
          </div>
        </section>

        <section data-panel="seo" style="grid-column:1/-1;display:none;">
          <div class="grid grid-2">
            <div class="field">
              <label>Focus keyword</label>
              <input name="focus_keyword" value="${esc(post?.focus_keyword || "")}" />
            </div>
            <div class="field">
              <label>SEO score</label>
              <input value="${Number(post?.seo_score || 0)}" readonly />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>SEO title</label>
              <input name="seo_title" value="${esc(post?.seo_title || "")}" />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>SEO description</label>
              <textarea name="seo_description" rows="3">${esc(post?.seo_description || "")}</textarea>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>OG title</label>
              <input name="og_title" value="${esc(post?.og_title || "")}" />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>OG description</label>
              <textarea name="og_description" rows="3">${esc(post?.og_description || "")}</textarea>
            </div>
            ${imagePickerMarkup("og_image", "OG image", ".jpg,.jpeg,.png,.webp,.svg")}
            <div class="field">
              <label>Canonical URL</label>
              <input name="canonical_url" value="${esc(post?.canonical_url || "")}" />
            </div>
            <div class="field">
              <label>Robots</label>
              <input name="robots" value="${esc(post?.robots || "index,follow")}" />
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>SEO Analysis</label>
              <pre id="seo-analysis-box" style="margin:0;padding:.8rem;border:1px solid var(--border);border-radius:10px;background:rgba(2,6,23,.35);max-height:220px;overflow:auto;">${esc(post?.seo_analysis_json ? JSON.stringify(post.seo_analysis_json, null, 2) : "Rulează Analyze SEO după salvare.")}</pre>
            </div>
          </div>
        </section>

        <section data-panel="ai" style="grid-column:1/-1;display:none;">
          <div class="grid grid-2">
            <div class="field">
              <label>Provider</label>
              <select name="ai_provider">
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div class="field">
              <label>Tone</label>
              <input name="ai_tone" value="prietenos-profesionist" />
            </div>
            <div class="field">
              <label>Topic</label>
              <input name="ai_topic" value="${esc(post?.title || "")}" />
            </div>
            <div class="field">
              <label>Focus keyword</label>
              <input name="ai_focus_keyword" value="${esc(post?.focus_keyword || "")}" />
            </div>
            <div class="field">
              <label>Audience</label>
              <input name="ai_audience" value="antreprenori mici, freelanceri" />
            </div>
            <div class="field">
              <label>Goal</label>
              <input name="ai_goal" value="educare + lead generation" />
            </div>
            <div class="row row-wrap" style="grid-column:1/-1;">
              <button class="btn btn-secondary" type="button" data-ai-action="outline">Generează outline</button>
              <button class="btn btn-secondary" type="button" data-ai-action="article">Generează articol</button>
              <button class="btn btn-secondary" type="button" data-ai-action="improve">Îmbunătățește articolul</button>
              <button class="btn btn-secondary" type="button" data-ai-action="seo">Generează SEO metadata</button>
              <button class="btn btn-secondary" type="button" data-ai-action="fix-seo">Repară probleme SEO</button>
              <button class="btn btn-secondary" type="button" data-ai-action="image-prompt">Generează prompt imagine</button>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Rezultat AI</label>
              <textarea id="ai-preview-box" rows="12" placeholder="Rezultatul AI apare aici înainte de aplicare."></textarea>
            </div>
            <div class="row row-wrap" style="grid-column:1/-1;">
              <button class="btn btn-primary" type="button" data-ai-apply="replace">Aplică în articol</button>
              <button class="btn btn-secondary" type="button" data-ai-apply="append">Adaugă la final</button>
              <button class="btn btn-secondary" type="button" data-ai-apply="copy">Copiază</button>
              <button class="btn btn-danger" type="button" data-ai-apply="clear">Anulează</button>
            </div>
          </div>
        </section>
      </form>
    `;

    setupImagePickers(m.body);
    const form = $("#blog-post-form", m.body);
    registerSlugAuto(form, "title", "slug");

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

    const aiPreview = $("#ai-preview-box", m.body);
    const contentField = form.elements.namedItem("content");
    const seoAnalysisBox = $("#seo-analysis-box", m.body);

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

      const result = await apiX(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const text = normalizeAiText(result?.text || result?.data?.text || "");
      aiPreview.value = text || JSON.stringify(result, null, 2);
      toast("Răspuns AI primit.");
    }

    $$("[data-ai-action]", m.body).forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const action = btn.dataset.aiAction;
          if (action === "outline") await triggerAi("/api/admin/ai/blog/generate-outline");
          if (action === "article") await triggerAi("/api/admin/ai/blog/generate-article");
          if (action === "improve") await triggerAi("/api/admin/ai/blog/improve-content");
          if (action === "seo") await triggerAi("/api/admin/ai/blog/generate-seo");
          if (action === "fix-seo") await triggerAi("/api/admin/ai/blog/fix-seo");
          if (action === "image-prompt") await triggerAi("/api/admin/ai/blog/generate-image-prompt");
        } catch (error) {
          toast(error.message, "error");
        }
      });
    });

    $$("[data-ai-apply]", m.body).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = btn.dataset.aiApply;
        const value = aiPreview.value || "";
        if (!value && mode !== "clear") {
          toast("Nu există rezultat AI de aplicat.", "error");
          return;
        }
        if (mode === "replace") contentField.value = value;
        if (mode === "append") contentField.value = `${contentField.value || ""}\n\n${value}`.trim();
        if (mode === "copy") {
          await navigator.clipboard.writeText(value);
          toast("Copiat în clipboard.");
          return;
        }
        if (mode === "clear") aiPreview.value = "";
      });
    });

    m.foot.innerHTML = `
      <button class="btn btn-secondary" type="button" data-analyze-seo>Analyze SEO</button>
      <button class="btn btn-secondary" type="button" data-cancel>Cancel</button>
      <button class="btn btn-primary" type="button" data-save>Save</button>
    `;

    $("[data-cancel]", m.foot).addEventListener("click", m.close);

    $("[data-analyze-seo]", m.foot).addEventListener("click", async () => {
      if (!post?.id) {
        toast("Salvează articolul înainte de Analyze SEO.", "error");
        return;
      }
      try {
        const analysis = await apiX(`/api/admin/blog/posts/${post.id}/analyze-seo`, { method: "POST" });
        seoAnalysisBox.textContent = JSON.stringify(analysis, null, 2);
        toast("Scor SEO actualizat.");
      } catch (error) {
        toast(error.message, "error");
      }
    });

    $("[data-save]", m.foot).addEventListener("click", async () => {
      const payload = buildPostPayload(form);
      const errors = {};
      if (!payload.title) errors.title = "Titlul este obligatoriu.";
      if (!payload.slug && !payload.title) errors.slug = "Slug-ul este obligatoriu.";
      if (Object.keys(errors).length) {
        applyErrors(form, errors);
        toast("Please complete required fields", "error");
        return;
      }

      try {
        clearErrors(form);
        if (post?.id) {
          await apiX(`/api/admin/blog/posts/${post.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
        } else {
          await apiX("/api/admin/blog/posts", {
            method: "POST",
            body: JSON.stringify(payload)
          });
        }
        toast("Saved successfully");
        m.close();
        await onSaved();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  window.initBlogPage = async function initBlogPage() {
    const mount = $("#blog-page");
    if (!mount) return;
    mount.innerHTML = `
      ${pageHeader("Blog", "Gestionează articolele pentru SEO, trafic organic și lead generation.", "Adaugă articol", "blog-add-btn")}
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
            <input name="search" placeholder="Caută după titlu sau excerpt" />
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
            <thead><tr><th>Titlu</th><th>Status</th><th>Categorie</th><th>SEO score</th><th>Publicat</th><th>Acțiuni</th></tr></thead>
            <tbody id="blog-posts-body"></tbody>
          </table>
        </div>
      `;

      const body = $("#blog-posts-body", tableWrap);
      body.innerHTML = posts
        .map((post) => `
          <tr>
            <td>${esc(post.title)}</td>
            <td>${statusBadge(post.status)}</td>
            <td>${esc(post.category?.name || "-")}</td>
            <td>${scoreBadge(post.seo_score || 0)}</td>
            <td>${post.published_at ? esc(new Date(post.published_at).toLocaleString("ro-RO")) : "-"}</td>
            <td class="table-actions row">
              <button class="btn btn-secondary" type="button" data-edit="${post.id}">Edit</button>
              <a class="btn btn-secondary" href="/blog/${encodeURIComponent(post.slug)}" target="_blank" rel="noopener">Preview</a>
              <button class="btn btn-danger" type="button" data-delete="${post.id}">Delete</button>
            </td>
          </tr>
        `)
        .join("");

      $$("[data-edit]", body).forEach((button) => {
        button.addEventListener("click", async () => {
          const detailed = await apiX(`/api/admin/blog/posts/${button.dataset.edit}`);
          await openBlogEditor({
            categories,
            post: detailed,
            onSaved: loadData
          });
        });
      });

      $$("[data-delete]", body).forEach((button) => {
        button.addEventListener("click", async () => {
          const item = posts.find((row) => String(row.id) === button.dataset.delete);
          const confirmed = await confirmModal("Confirm delete", `Sigur vrei să ștergi articolul „${item?.title || "selectat"}”?`);
          if (!confirmed) return;
          await apiX(`/api/admin/blog/posts/${button.dataset.delete}`, { method: "DELETE" });
          toast("Deleted successfully");
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
    filters.addEventListener("submit", (event) => {
      event.preventDefault();
      loadData();
    });

    await loadCategories();
    await loadData();
  };

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
      body.innerHTML = categories
        .map((item) => `
          <tr>
            <td>${esc(item.name)}</td>
            <td>${esc(item.slug)}</td>
            <td>${Number(item.sort_order || 0)}</td>
            <td>${item.is_active ? badge("Activ", "success") : badge("Inactiv", "neutral")}</td>
            <td class="table-actions row">
              <button class="btn btn-secondary" type="button" data-edit="${item.id}">Edit</button>
              <button class="btn btn-danger" type="button" data-delete="${item.id}">Delete</button>
            </td>
          </tr>
        `)
        .join("");

      $$("[data-edit]", body).forEach((button) => {
        button.addEventListener("click", () => {
          const item = categories.find((row) => String(row.id) === button.dataset.edit);
          editCategory(item);
        });
      });
      $$("[data-delete]", body).forEach((button) => {
        button.addEventListener("click", async () => {
          const item = categories.find((row) => String(row.id) === button.dataset.delete);
          const confirmed = await confirmModal("Confirm delete", `Sigur vrei să ștergi categoria „${item?.name || ""}”?`);
          if (!confirmed) return;
          await apiX(`/api/admin/blog/categories/${button.dataset.delete}`, { method: "DELETE" });
          toast("Deleted successfully");
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
            <textarea name="description" rows="3">${esc(item?.description || "")}</textarea>
          </div>
          <div class="field">
            <label>Sort order</label>
            <input type="number" name="sort_order" value="${Number(item?.sort_order || 0)}" />
          </div>
          <div class="field" style="display:flex;align-items:center;gap:.5rem;margin-top:1.7rem;">
            <input id="blog-category-active" type="checkbox" name="is_active" value="1" ${item?.is_active === false ? "" : "checked"} />
            <label for="blog-category-active">Activ</label>
          </div>
        </form>
      `;
      const form = $("#blog-category-form", m.body);
      registerSlugAuto(form, "name", "slug");
      m.foot.innerHTML = `
        <button class="btn btn-secondary" type="button" data-cancel>Cancel</button>
        <button class="btn btn-primary" type="button" data-save>Save</button>
      `;
      $("[data-cancel]", m.foot).addEventListener("click", m.close);
      $("[data-save]", m.foot).addEventListener("click", async () => {
        const payload = formObject(form);
        if (!payload.name) {
          applyErrors(form, { name: "Numele este obligatoriu." });
          return;
        }
        if (item?.id) {
          await apiX(`/api/admin/blog/categories/${item.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
        } else {
          await apiX("/api/admin/blog/categories", {
            method: "POST",
            body: JSON.stringify(payload)
          });
        }
        toast("Saved successfully");
        m.close();
        await load();
      });
    }

    addButton.addEventListener("click", () => editCategory());
    await load();
  };

  window.initAiSettingsPage = async function initAiSettingsPage() {
    const mount = $("#ai-settings-page");
    if (!mount) return;
    mount.innerHTML = `
      ${pageHeader("AI Settings", "Configurează providerul și parametrii pentru AI Assist în blog.")}
      <section class="card">
        <form id="ai-settings-form" class="grid grid-2">
          <div class="field">
            <label>Provider default</label>
            <select name="provider">
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div class="field">
            <label>Model</label>
            <input name="model" />
          </div>
          <div class="field">
            <label>Temperature</label>
            <input type="number" step="0.1" min="0" max="1.5" name="temperature" />
          </div>
          <div class="field">
            <label>Max tokens</label>
            <input type="number" min="200" max="4000" name="max_tokens" />
          </div>
          <div class="field" style="grid-column:1/-1;">
            <label>System prompt default</label>
            <textarea name="system_prompt" rows="6"></textarea>
          </div>
          <div class="field">
            <label>Gemini API key</label>
            <input name="gemini_status" readonly />
          </div>
          <div class="field">
            <label>OpenAI API key</label>
            <input name="openai_status" readonly />
          </div>
          <div class="row" style="grid-column:1/-1;justify-content:flex-end;">
            <button class="btn btn-primary" type="submit">Save</button>
          </div>
        </form>
      </section>
    `;

    const form = $("#ai-settings-form", mount);

    async function load() {
      const settings = await apiX("/api/admin/ai/settings");
      form.elements.namedItem("provider").value = settings.provider || "gemini";
      form.elements.namedItem("model").value = settings.model || "";
      form.elements.namedItem("temperature").value = settings.temperature ?? 0.7;
      form.elements.namedItem("max_tokens").value = settings.max_tokens ?? 1200;
      form.elements.namedItem("system_prompt").value = settings.system_prompt || "";
      form.elements.namedItem("gemini_status").value = settings.api_key_status?.gemini ? "configured" : "missing";
      form.elements.namedItem("openai_status").value = settings.api_key_status?.openai ? "configured" : "missing";
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formObject(form);
      await apiX("/api/admin/ai/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      toast("Saved successfully");
      await load();
    });

    await load();
  };
})();
