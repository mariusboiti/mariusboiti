const API = {
  authLogin: "/api/auth/login",
  authLogout: "/api/auth/logout",
  authMe: "/api/auth/me"
};

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard.html" },
  { key: "settings", label: "Setări site", href: "/admin/settings.html" },
  { key: "homepage", label: "Homepage", href: "/admin/homepage.html" },
  { key: "services", label: "Servicii", href: "/admin/services.html" },
  { key: "portfolio", label: "Portofoliu", href: "/admin/portfolio.html" },
  { key: "packages", label: "Pachete", href: "/admin/packages.html" },
  { key: "faq", label: "FAQ", href: "/admin/faq.html" },
  { key: "calculator", label: "Calculator preț", href: "/admin/calculator.html" },
  { key: "leads", label: "Lead-uri", href: "/admin/leads.html" },
  { key: "seo", label: "SEO", href: "/admin/seo.html" },
  { key: "media", label: "Media", href: "/admin/media.html" },
  { key: "project-logos", label: "Logo-uri proiecte", href: "/admin/project-logos.html" },
  { key: "blog", label: "Blog", href: "/admin/blog.html" },
  { key: "blog-categories", label: "Categorii blog", href: "/admin/blog-categories.html" },
  { key: "ai-settings", label: "AI Settings", href: "/admin/ai-settings.html" },
  { key: "backup", label: "Backup", href: "/admin/backup.html" }
];

const state = {
  media: null,
  modals: []
};

function $(sel, root = document) {
  return root.querySelector(sel);
}
function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}
function pageKey() {
  return document.body.dataset.page || "";
}
function esc(v) {
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function slugify(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
function parseLines(v) {
  return String(v || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}
function stringifyLines(v) {
  if (!v) return "";
  if (Array.isArray(v)) return v.join("\n");
  return String(v);
}
function parseJson(v, fallback = null) {
  try {
    return JSON.parse(v);
  } catch (_e) {
    return fallback;
  }
}
function validEmail(v) {
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}
function validUrl(v) {
  if (!v) return true;
  const raw = String(v).trim();
  if (raw.startsWith("/")) return true;
  try {
    const u = new URL(raw);
    return ["http:", "https:"].includes(u.protocol);
  } catch (_e) {
    return false;
  }
}
function validHttpUrl(v) {
  if (!v) return true;
  try {
    const u = new URL(String(v).trim());
    return ["http:", "https:"].includes(u.protocol);
  } catch (_e) {
    return false;
  }
}

function ensureToastRoot() {
  let root = $("#toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    root.className = "toast-root";
    document.body.appendChild(root);
  }
  return root;
}
function toast(msg, type = "success") {
  const root = ensureToastRoot();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("visible"));
  setTimeout(() => {
    el.classList.remove("visible");
    setTimeout(() => el.remove(), 200);
  }, 2600);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(typeof data === "object" && data?.error ? data.error : "A apărut o eroare");
  }
  return data;
}

function formObject(form) {
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());
  $$("input[type='checkbox'][name]", form).forEach((cb) => {
    payload[cb.name] = cb.checked ? 1 : 0;
  });
  return payload;
}
function clearErrors(scope) {
  $$(".field-error", scope).forEach((x) => (x.textContent = ""));
  $$(".invalid", scope).forEach((x) => x.classList.remove("invalid"));
}
function setError(scope, name, msg) {
  const field = $(`[name="${name}"]`, scope);
  if (field) field.classList.add("invalid");
  const label = $(`[data-error-for="${name}"]`, scope);
  if (label) label.textContent = msg;
}
function applyErrors(scope, errors = {}) {
  clearErrors(scope);
  Object.entries(errors).forEach(([k, v]) => setError(scope, k, v));
}

function badge(text, kind = "neutral") {
  return `<span class="badge badge-${kind}">${esc(text)}</span>`;
}
function statusKind(v) {
  const m = {
    new: "new",
    contacted: "info",
    quote_sent: "warn",
    won: "success",
    lost: "danger"
  };
  return m[String(v || "").toLowerCase()] || "neutral";
}

function pageHeader(title, desc, btnText = "", btnId = "") {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">${esc(title)}</h1>
        <p class="muted">${esc(desc || "")}</p>
      </div>
      ${btnText ? `<button class="btn btn-primary" id="${btnId}">${esc(btnText)}</button>` : ""}
    </div>
  `;
}

function modal({ title, subtitle = "", size = "lg" }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal ${size === "xl" ? "modal-xl" : "modal-lg"}">
      <div class="modal-head">
        <div><h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
        <button type="button" class="icon-btn" data-close>×</button>
      </div>
      <div class="modal-body" data-body></div>
      <div class="modal-foot sticky" data-foot></div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");
  state.modals.push(overlay);
  const close = () => {
    overlay.remove();
    state.modals = state.modals.filter((m) => m !== overlay);
    if (!state.modals.length) document.body.classList.remove("modal-open");
  };
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  $("[data-close]", overlay).addEventListener("click", close);
  return { close, body: $("[data-body]", overlay), foot: $("[data-foot]", overlay), overlay };
}

function confirmModal(title, message, confirmText = "Delete") {
  return new Promise((resolve) => {
    const m = modal({ title, subtitle: "Confirmare" });
    m.body.innerHTML = `<p class="muted">${esc(message)}</p>`;
    m.foot.innerHTML = `
      <button class="btn btn-secondary" type="button" data-cancel>Cancel</button>
      <button class="btn btn-danger" type="button" data-confirm>${esc(confirmText)}</button>
    `;
    $("[data-cancel]", m.foot).addEventListener("click", () => {
      m.close();
      resolve(false);
    });
    $("[data-confirm]", m.foot).addEventListener("click", () => {
      m.close();
      resolve(true);
    });
  });
}

function emptyState(el, msg, btn = "", cb = null) {
  el.innerHTML = `
    <div class="empty-state">
      <p>${esc(msg)}</p>
      ${btn ? `<button class="btn btn-primary" type="button" data-empty-btn>${esc(btn)}</button>` : ""}
    </div>
  `;
  const b = $("[data-empty-btn]", el);
  if (b && cb) b.addEventListener("click", cb);
}

async function authGuard() {
  try {
    const data = await api(API.authMe);
    return data.admin;
  } catch (_e) {
    location.href = "/admin/login.html";
    return null;
  }
}

function renderShell(admin) {
  const side = $("#sidebar");
  const top = $("#topbar");
  if (side) {
    side.innerHTML = `
      <p class="brand"><strong>Marius Boiti</strong> Studio</p>
      <nav class="nav">
        ${NAV_ITEMS.map((it) => `<a class="${it.key === pageKey() ? "active" : ""}" href="${it.href}">${it.label}</a>`).join("")}
      </nav>
    `;
  }
  if (top) {
    top.innerHTML = `
      <small>Admin CMS</small>
      <div class="row" style="align-items:center;">
        <small>${esc(admin?.name || "Admin")}</small>
        <button id="logout-btn" type="button" class="btn btn-secondary">Logout</button>
      </div>
    `;
    $("#logout-btn", top).addEventListener("click", async () => {
      await api(API.authLogout, { method: "POST" });
      location.href = "/admin/login.html";
    });
  }
}

function imagePickerMarkup(name, label, accept, help = "Poți lipi un URL sau poți încărca o imagine.", icon = false) {
  return `
    <div class="field" data-image-picker="${name}" data-accept="${esc(accept)}" data-icon-preview="${icon ? "1" : "0"}">
      <label>${esc(label)}</label>
      <input name="${name}" data-image-url />
      <small class="hint">${esc(help)}</small>
      <div class="row media-row">
        <button class="btn btn-secondary" type="button" data-upload>Upload</button>
        <button class="btn btn-secondary" type="button" data-library>Choose from Media</button>
        <button class="btn btn-danger" type="button" data-clear>Clear</button>
      </div>
      <div class="image-preview-wrap" data-preview-wrap hidden><img alt="preview" data-preview /></div>
      <small class="field-error" data-error-for="${name}"></small>
    </div>
  `;
}

function videoPickerMarkup(name, label, accept, help = "Poți lipi un URL sau poți încărca un video (.mp4, .webm, .mov).") {
  return `
    <div class="field" data-video-picker="${name}" data-accept="${esc(accept)}">
      <label>${esc(label)}</label>
      <input name="${name}" data-video-url />
      <small class="hint">${esc(help)}</small>
      <div class="row media-row">
        <button class="btn btn-secondary" type="button" data-upload-video>Upload</button>
        <button class="btn btn-danger" type="button" data-clear-video>Clear</button>
      </div>
      <div class="image-preview-wrap" data-video-preview-wrap hidden>
        <video data-video-preview controls playsinline preload="metadata" style="width:100%;max-height:240px;border-radius:12px;background:#020617;"></video>
      </div>
      <small class="field-error" data-error-for="${name}"></small>
    </div>
  `;
}

async function fetchMedia(force = false) {
  if (!force && Array.isArray(state.media)) return state.media;
  state.media = await api("/api/admin/media");
  return state.media;
}

function setupImagePickers(scope) {
  $$("[data-image-picker]", scope).forEach((wrap) => {
    const field = $("[data-image-url]", wrap);
    const accept = wrap.dataset.accept || ".jpg,.jpeg,.png,.webp,.svg";
    const previewWrap = $("[data-preview-wrap]", wrap);
    const preview = $("[data-preview]", wrap);
    const isIcon = wrap.dataset.iconPreview === "1";
    if (isIcon) previewWrap.classList.add("icon-preview");
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = accept;
    fileInput.hidden = true;
    wrap.appendChild(fileInput);

    const refresh = () => {
      const v = String(field.value || "").trim();
      if (!v) {
        previewWrap.hidden = true;
        preview.removeAttribute("src");
        return;
      }
      preview.src = v;
      previewWrap.hidden = false;
    };

    async function upload(file) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        credentials: "include",
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload eșuat");
      state.media = null;
      return data;
    }

    field.addEventListener("input", refresh);
    $("[data-upload]", wrap)?.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const r = await upload(file);
        field.value = r.url || r?.data?.url || "";
        refresh();
        toast("Upload successful");
      } catch (e) {
        toast(e.message, "error");
      }
      fileInput.value = "";
    });
    $("[data-clear]", wrap)?.addEventListener("click", () => {
      field.value = "";
      refresh();
    });
    $("[data-library]", wrap)?.addEventListener("click", async () => {
      const items = await fetchMedia();
      const m = modal({ title: "Choose from Media", subtitle: "Selectează imagine" });
      if (!items.length) {
        m.body.innerHTML = `<p class="muted">Nu există imagini în media library.</p>`;
      } else {
        m.body.innerHTML = `<div class="media-grid">${items
          .map(
            (it) => `
            <button class="media-tile" type="button" data-url="${esc(it.url)}">
              <img src="${esc(it.url)}" alt="${esc(it.alt_text || it.filename)}" />
              <small>${esc(it.filename)}</small>
            </button>
          `
          )
          .join("")}</div>`;
        $$("[data-url]", m.body).forEach((b) =>
          b.addEventListener("click", () => {
            field.value = b.dataset.url;
            refresh();
            m.close();
          })
        );
      }
      m.foot.innerHTML = `<button class="btn btn-secondary" type="button" data-close-lib>Close</button>`;
      $("[data-close-lib]", m.foot).addEventListener("click", m.close);
    });
    refresh();
  });
}

function setupVideoPickers(scope) {
  $$("[data-video-picker]", scope).forEach((wrap) => {
    const field = $("[data-video-url]", wrap);
    const accept = wrap.dataset.accept || ".mp4,.webm,.mov";
    const previewWrap = $("[data-video-preview-wrap]", wrap);
    const preview = $("[data-video-preview]", wrap);
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = accept;
    fileInput.hidden = true;
    wrap.appendChild(fileInput);

    const refresh = () => {
      const v = String(field.value || "").trim();
      if (!v) {
        previewWrap.hidden = true;
        preview.removeAttribute("src");
        preview.load();
        return;
      }
      preview.src = v;
      previewWrap.hidden = false;
      preview.load();
    };

    async function upload(file) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media/upload-video", {
        method: "POST",
        credentials: "include",
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload eșuat");
      return data;
    }

    field.addEventListener("input", refresh);
    $("[data-upload-video]", wrap)?.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const r = await upload(file);
        field.value = r.url || r?.data?.url || "";
        refresh();
        toast("Upload successful");
      } catch (e) {
        toast(e.message, "error");
      }
      fileInput.value = "";
    });
    $("[data-clear-video]", wrap)?.addEventListener("click", () => {
      field.value = "";
      refresh();
    });
    refresh();
  });
}

function listEditorMarkup(name, label) {
  return `
    <div class="field list-field" data-list-editor="${name}">
      <label>${esc(label)}</label>
      <input type="hidden" name="${name}" data-list-value />
      <div class="list-editor" data-list-items></div>
      <button class="btn btn-secondary" type="button" data-list-add>Adaugă item</button>
      <small class="field-error" data-error-for="${name}"></small>
    </div>
  `;
}

function setupListEditor(wrap, initial = []) {
  const hidden = $("[data-list-value]", wrap);
  const list = $("[data-list-items]", wrap);
  const add = $("[data-list-add]", wrap);
  let items = Array.isArray(initial) ? [...initial] : parseLines(initial);
  function sync() {
    hidden.value = JSON.stringify(items.filter((x) => String(x || "").trim()));
  }
  function render() {
    list.innerHTML = "";
    if (!items.length) list.innerHTML = `<div class="mini-empty">Nu există itemuri.</div>`;
    items.forEach((v, i) => {
      const row = document.createElement("div");
      row.className = "list-item-row";
      row.innerHTML = `<input value="${esc(v)}" data-item /><button class="btn btn-danger" type="button" data-remove>×</button>`;
      $("[data-item]", row).addEventListener("input", (e) => {
        items[i] = e.target.value;
        sync();
      });
      $("[data-remove]", row).addEventListener("click", () => {
        items.splice(i, 1);
        render();
        sync();
      });
      list.appendChild(row);
    });
    sync();
  }
  add.addEventListener("click", () => {
    items.push("");
    render();
  });
  render();
  return { getValue: () => items.filter((x) => String(x || "").trim()) };
}

function tagsEditorMarkup(name, label) {
  return `
    <div class="field" data-tags-editor="${name}">
      <label>${esc(label)}</label>
      <input type="hidden" name="${name}" data-tags-value />
      <div class="tags-box" data-tags-box></div>
      <input data-tag-input placeholder="Scrie tag și apasă Enter" />
      <small class="field-error" data-error-for="${name}"></small>
    </div>
  `;
}
function setupTagsEditor(wrap, initial = []) {
  const hidden = $("[data-tags-value]", wrap);
  const box = $("[data-tags-box]", wrap);
  const input = $("[data-tag-input]", wrap);
  let tags = Array.isArray(initial) ? [...initial] : parseLines(initial);
  function sync() {
    hidden.value = JSON.stringify(tags.filter(Boolean));
  }
  function render() {
    box.innerHTML = tags.length
      ? tags
          .map((t, i) => `<span class="tag-chip">${esc(t)} <button type="button" data-rm="${i}">×</button></span>`)
          .join("")
      : `<span class="mini-empty">Niciun tag.</span>`;
    $$("[data-rm]", box).forEach((b) =>
      b.addEventListener("click", () => {
        tags.splice(Number(b.dataset.rm), 1);
        render();
        sync();
      })
    );
    sync();
  }
  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    if (!tags.includes(v)) tags.push(v);
    input.value = "";
    render();
  });
  render();
  return { getValue: () => tags.filter(Boolean) };
}

function cardsEditorMarkup(name, label) {
  return `
    <div class="field" data-cards-editor="${name}">
      <label>${esc(label)}</label>
      <input type="hidden" name="${name}" data-cards-value />
      <div class="cards-editor" data-cards-items></div>
      <button class="btn btn-secondary" type="button" data-cards-add>Adaugă card</button>
      <small class="field-error" data-error-for="${name}"></small>
    </div>
  `;
}
function setupCardsEditor(wrap, initial = []) {
  const hidden = $("[data-cards-value]", wrap);
  const list = $("[data-cards-items]", wrap);
  const add = $("[data-cards-add]", wrap);
  const cards = Array.isArray(initial)
    ? initial.map((x) => ({ title: String(x?.title || ""), text: String(x?.text || "") }))
    : [];
  function sync() {
    hidden.value = JSON.stringify(cards.filter((x) => x.title.trim() || x.text.trim()));
  }
  function render() {
    list.innerHTML = "";
    if (!cards.length) list.innerHTML = `<div class="mini-empty">Nu există carduri.</div>`;
    cards.forEach((card, i) => {
      const row = document.createElement("div");
      row.className = "cards-item-row";
      row.innerHTML = `
        <input value="${esc(card.title)}" data-title placeholder="Titlu card" />
        <textarea data-text placeholder="Text card">${esc(card.text)}</textarea>
        <button class="btn btn-danger" type="button" data-remove>Șterge</button>
      `;
      $("[data-title]", row).addEventListener("input", (e) => {
        cards[i].title = e.target.value;
        sync();
      });
      $("[data-text]", row).addEventListener("input", (e) => {
        cards[i].text = e.target.value;
        sync();
      });
      $("[data-remove]", row).addEventListener("click", () => {
        cards.splice(i, 1);
        render();
        sync();
      });
      list.appendChild(row);
    });
    sync();
  }
  add.addEventListener("click", () => {
    cards.push({ title: "", text: "" });
    render();
  });
  render();
  return { getValue: () => cards.filter((x) => x.title.trim() || x.text.trim()) };
}

function previewCard(el) {
  el.innerHTML = `
    <div class="preview-card">
      <div class="preview-image" data-p-img>Fără imagine</div>
      <div class="preview-content">
        <p class="preview-title" data-p-title>Titlu</p>
        <p class="preview-desc" data-p-desc>Descriere</p>
        <div class="row" data-p-badges></div>
        <p class="preview-cta" data-p-cta></p>
      </div>
    </div>
  `;
}
function updatePreview(el, payload) {
  const title = payload.title || payload.name || "Titlu";
  const desc = payload.short_description || payload.subtitle || "Descriere";
  const image = payload.image_url || payload.logo_image || "";
  $("[data-p-title]", el).textContent = title;
  $("[data-p-desc]", el).textContent = desc;
  $("[data-p-cta]", el).textContent = payload.cta_text ? `CTA: ${payload.cta_text}` : "";
  const img = $("[data-p-img]", el);
  if (image) img.innerHTML = `<img src="${esc(image)}" alt="preview" />`;
  else img.textContent = "Fără imagine";
  const b = $("[data-p-badges]", el);
  b.innerHTML = `${badge(payload.is_active ? "Active" : "Inactive", payload.is_active ? "success" : "neutral")}${
    payload.is_featured || payload.is_recommended ? badge("Featured", "feature") : ""
  }`;
}

function bindSlug(form, titleName = "title", slugName = "slug") {
  const title = form.elements.namedItem(titleName);
  const slug = form.elements.namedItem(slugName);
  if (!title || !slug) return;
  let manual = Boolean(slug.value);
  slug.addEventListener("input", () => {
    manual = Boolean(slug.value.trim());
  });
  title.addEventListener("input", () => {
    if (!manual) slug.value = slugify(title.value);
  });
}

function actionButtons(id, label) {
  return `
    <div class="row table-actions">
      <button class="btn btn-secondary" type="button" data-edit="${id}">Edit</button>
      <button class="btn btn-danger" type="button" data-delete="${id}" data-label="${esc(label || "item")}">Delete</button>
    </div>
  `;
}

function crud(config) {
  const root = $(`#${config.rootId}`);
  if (!root) return;
  let items = [];
  const topAddBtn = config.addBtnId ? document.getElementById(config.addBtnId) : null;
  async function load() {
    items = await api(config.list);
    render();
  }
  function render() {
    const wrap = $(".table-wrap", root);
    if (!items.length) {
      emptyState(wrap, config.emptyText, config.emptyBtn, () => openModal());
      return;
    }
    wrap.innerHTML = config.table();
    const body = $("tbody", wrap);
    body.innerHTML = items.map((x) => `<tr>${config.row(x)}<td>${actionButtons(x.id, x[config.labelField])}</td></tr>`).join("");
    $$("[data-edit]", body).forEach((b) =>
      b.addEventListener("click", () => {
        const it = items.find((x) => String(x.id) === b.dataset.edit);
        if (it) openModal(it);
      })
    );
    $$("[data-delete]", body).forEach((b) =>
      b.addEventListener("click", async () => {
        const ok = await confirmModal("Confirm delete", `Sigur vrei să ștergi acest item? (${b.dataset.label})`);
        if (!ok) return;
        await api(`${config.del}/${b.dataset.delete}`, { method: "DELETE" });
        toast("Deleted successfully");
        await load();
      })
    );
  }
  function openModal(item = null) {
    const draftItem = item || (typeof config.getNewItem === "function" ? config.getNewItem(items) : {});
    const m = modal({
      title: item ? config.editTitle : config.addTitle,
      subtitle: "Completează câmpurile necesare",
      size: "xl"
    });
    m.body.innerHTML = config.form(draftItem);
    const form = $("form", m.body);
    bindSlug(form, config.titleField || "title", config.slugField || "slug");
    setupImagePickers(form);
    const listEditors = {};
    (config.listFields || []).forEach((name) => {
      const w = $(`[data-list-editor="${name}"]`, form);
      if (w) listEditors[name] = setupListEditor(w, draftItem?.[name] || []);
    });
    (config.tagsFields || []).forEach((name) => {
      const w = $(`[data-tags-editor="${name}"]`, form);
      if (w) listEditors[name] = setupTagsEditor(w, draftItem?.[name] || []);
    });
    const prevHost = $("[data-preview-host]", form);
    if (prevHost) {
      previewCard(prevHost);
      const update = () => updatePreview(prevHost, formObject(form));
      form.addEventListener("input", update);
      update();
    }
    if (typeof config.onModalReady === "function") {
      config.onModalReady({ form, modal: m, item, draftItem, items, listEditors });
    }
    m.foot.innerHTML = `
      <button class="btn btn-secondary" type="button" data-cancel>Cancel</button>
      <button class="btn btn-secondary" type="button" data-reset>Reset</button>
      <button class="btn btn-primary" type="button" data-save>Save</button>
    `;
    $("[data-cancel]", m.foot).addEventListener("click", m.close);
    $("[data-reset]", m.foot).addEventListener("click", () => {
      if (typeof config.onReset === "function") {
        config.onReset({ form, modal: m, item, draftItem, items, listEditors, openModal });
        return;
      }
      if (config.resetToAdd) {
        m.close();
        openModal();
        return;
      }
      form.reset();
      setupImagePickers(form);
    });
    const saveBtn = $("[data-save]", m.foot);
    saveBtn.addEventListener("click", async () => {
      const payload = formObject(form);
      Object.entries(listEditors).forEach(([k, ed]) => (payload[k] = ed.getValue()));
      const errs = config.validate ? config.validate(payload) : {};
      if (Object.keys(errs).length) {
        applyErrors(form, errs);
        toast("Please complete required fields", "error");
        return;
      }
      clearErrors(form);
      const initialLabel = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = "Se salvează...";
      try {
        if (item?.id) await api(`${config.upd}/${item.id}`, { method: "PUT", body: JSON.stringify(payload) });
        else await api(config.create, { method: "POST", body: JSON.stringify(payload) });
        m.close();
        toast(config.saveSuccessMessage || "Saved successfully");
        await load();
      } catch (error) {
        toast(error.message || "Nu am putut salva proiectul.", "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = initialLabel;
      }
    });
  }
  root.addEventListener("click", (e) => {
    if (e.target.id === config.addBtnId) openModal();
  });
  if (topAddBtn && !topAddBtn.dataset.boundCrud) {
    topAddBtn.dataset.boundCrud = "1";
    topAddBtn.addEventListener("click", () => openModal());
  }
  load();
}

async function initLogin() {
  const form = $("#login-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await api(API.authLogin, { method: "POST", body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }) });
      location.href = "/admin/dashboard.html";
    } catch (err) {
      toast(err.message, "error");
    }
  });
}

async function initDashboard() {
  const stats = await api("/api/admin/dashboard/stats");
  const statsCards = $("#stats-cards");
  const recent = $("#recent-leads");
  if (statsCards) {
    statsCards.innerHTML = `
      <article class="stat"><h3>${stats.totalLeads}</h3><p>Total lead-uri</p></article>
      <article class="stat"><h3>${stats.newLeads}</h3><p>Lead-uri noi</p></article>
      <article class="stat"><h3>${stats.activeServices}</h3><p>Servicii active</p></article>
      <article class="stat"><h3>${stats.activePortfolio}</h3><p>Proiecte portofoliu active</p></article>
    `;
  }
  if (recent) {
    recent.innerHTML = (stats.recentLeads || [])
      .map((lead) => `<tr><td>${esc(lead.name)}</td><td>${esc(lead.email)}</td><td>${badge(lead.status, statusKind(lead.status))}</td><td>${new Date(lead.created_at).toLocaleString("ro-RO")}</td></tr>`)
      .join("");
  }
}

async function initSettings() {
  const mount = $("#settings-page");
  if (!mount) return;
  const data = await api("/api/admin/settings");
  mount.innerHTML = `
    ${pageHeader("Setări site", "Actualizează datele generale, logo-ul și favicon-ul.")}
    <form class="card grid" id="settings-form">
      <details class="accordion" open><summary>Informații generale</summary>
        <div class="accordion-body grid grid-2">
          <div class="field"><label>Site name</label><input name="site_name" value="${esc(data.site_name || "")}" required /><small class="field-error" data-error-for="site_name"></small></div>
          <div class="field"><label>Tagline</label><input name="tagline" value="${esc(data.tagline || "")}" /></div>
          <div class="field"><label>Email</label><input name="email" value="${esc(data.email || "")}" /><small class="field-error" data-error-for="email"></small></div>
          <div class="field"><label>Telefon</label><input name="phone" value="${esc(data.phone || "")}" /></div>
          <div class="field"><label>WhatsApp</label><input name="whatsapp" value="${esc(data.whatsapp || "")}" /></div>
          <div class="field"><label>Logo text</label><input name="logo_text" value="${esc(data.logo_text || "")}" /></div>
        </div>
      </details>
      <details class="accordion" open><summary>Brand assets</summary>
        <div class="accordion-body grid grid-2">
          ${imagePickerMarkup("logo_image", "Logo image", ".png,.jpg,.jpeg,.webp,.svg", "Poți lipi un URL sau poți încărca un logo. Recomandat logo orizontal.")}
          ${imagePickerMarkup("favicon", "Favicon", ".png,.jpg,.jpeg,.webp,.svg,.ico", "Poți lipi un URL sau poți încărca favicon. Recomandat 256x256 sau 512x512.", true)}
        </div>
      </details>
      <details class="accordion"><summary>Social</summary>
        <div class="accordion-body grid grid-2">
          <div class="field"><label>Facebook URL</label><input name="facebook_url" value="${esc(data.facebook_url || "")}" placeholder="https://facebook.com/..." /><small class="field-error" data-error-for="facebook_url"></small></div>
          <div class="field"><label>Instagram URL</label><input name="instagram_url" value="${esc(data.instagram_url || "")}" placeholder="https://instagram.com/..." /><small class="field-error" data-error-for="instagram_url"></small></div>
          <div class="field"><label>LinkedIn URL</label><input name="linkedin_url" value="${esc(data.linkedin_url || "")}" placeholder="https://linkedin.com/in/..." /><small class="field-error" data-error-for="linkedin_url"></small></div>
          <div class="field"><label>YouTube URL</label><input name="youtube_url" value="${esc(data.youtube_url || "")}" placeholder="https://youtube.com/@..." /><small class="field-error" data-error-for="youtube_url"></small></div>
        </div>
      </details>
      <details class="accordion"><summary>SEO implicit</summary>
        <div class="accordion-body grid grid-2">
          <div class="field"><label>Default meta title</label><input name="default_meta_title" value="${esc(data.default_meta_title || "")}" /></div>
          <div class="field" style="grid-column:1/-1;"><label>Default meta description</label><textarea name="default_meta_description">${esc(data.default_meta_description || "")}</textarea></div>
        </div>
      </details>
      <div class="sticky-actions"><button class="btn btn-primary" type="submit">Save</button></div>
    </form>
  `;
  const form = $("#settings-form");
  setupImagePickers(form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = formObject(form);
    const errs = {};
    if (!String(payload.site_name || "").trim()) errs.site_name = "Site name este obligatoriu.";
    if (!validEmail(payload.email)) errs.email = "Email invalid.";
    ["facebook_url", "instagram_url", "linkedin_url", "youtube_url"].forEach((name) => {
      if (!validHttpUrl(payload[name])) errs[name] = "URL invalid. Folosește http:// sau https://.";
    });
    ["logo_image", "favicon"].forEach((name) => {
      if (!validUrl(payload[name])) errs[name] = "URL invalid.";
    });
    if (Object.keys(errs).length) {
      applyErrors(form, errs);
      toast("Please complete required fields", "error");
      return;
    }
    clearErrors(form);
    await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
    toast("Saved successfully");
  });
}

async function initServices() {
  const mount = $("#services-page");
  if (!mount) return;
  mount.innerHTML = `
    ${pageHeader("Servicii", "Gestionează serviciile. Formularele Add/Edit apar în modal.", "Adaugă serviciu", "services-add-btn")}
    <section class="card" id="services-root"><div class="table-wrap"></div></section>
  `;
  crud({
    rootId: "services-root",
    list: "/api/admin/services",
    create: "/api/admin/services",
    upd: "/api/admin/services",
    del: "/api/admin/services",
    addBtnId: "services-add-btn",
    addTitle: "Adaugă serviciu",
    editTitle: "Editează serviciu",
    labelField: "title",
    emptyText: "Nu există încă servicii.",
    emptyBtn: "Adaugă primul serviciu",
    table: () => `<table><thead><tr><th>Titlu</th><th>Slug</th><th>Sort</th><th>Status</th><th>Acțiuni</th></tr></thead><tbody></tbody></table>`,
    row: (it) => `<td>${esc(it.title)}</td><td>${esc(it.slug)}</td><td>${it.sort_order || 0}</td><td>${badge(it.is_active ? "Active" : "Inactive", it.is_active ? "success" : "neutral")} ${it.is_featured ? badge("Featured", "feature") : ""}</td>`,
    listFields: ["includes_json"],
    form: (it) => `
      <form class="grid grid-2">
        <details class="accordion" open><summary>Informații principale</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>Titlu</label><input name="title" value="${esc(it.title || "")}" required /><small class="field-error" data-error-for="title"></small></div>
          <div class="field"><label>Slug</label><input name="slug" value="${esc(it.slug || "")}" required /><small class="field-error" data-error-for="slug"></small></div>
          <div class="field" style="grid-column:1/-1;"><label>Short description</label><textarea name="short_description">${esc(it.short_description || "")}</textarea><small class="field-error" data-error-for="short_description"></small></div>
          <div class="field" style="grid-column:1/-1;"><label>Long description</label><textarea name="long_description">${esc(it.long_description || "")}</textarea></div>
          <div class="field"><label>Icon</label><input name="icon" value="${esc(it.icon || "")}" /></div>
          <div class="field"><label>Suitable for</label><input name="suitable_for" value="${esc(it.suitable_for || "")}" /></div>
        </div></details>
        <details class="accordion" open><summary>Ce include</summary><div class="accordion-body">${listEditorMarkup("includes_json", "Includes")}</div></details>
        <details class="accordion"><summary>CTA</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>CTA text</label><input name="cta_text" value="${esc(it.cta_text || "")}" /></div>
          <div class="field"><label>CTA URL</label><input name="cta_url" value="${esc(it.cta_url || "")}" /></div>
        </div></details>
        <details class="accordion"><summary>SEO</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>SEO title</label><input name="seo_title" value="${esc(it.seo_title || "")}" /></div>
          <div class="field"><label>SEO description</label><input name="seo_description" value="${esc(it.seo_description || "")}" /></div>
        </div></details>
        <details class="accordion"><summary>Vizibilitate</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="${it.sort_order || 0}" /></div>
          <div class="row" style="align-items:center;margin-top:1.8rem;"><label class="check-inline"><input type="checkbox" name="is_featured" value="1" ${it.is_featured ? "checked" : ""} /> Featured</label><label class="check-inline"><input type="checkbox" name="is_active" value="1" ${it.is_active === 0 ? "" : "checked"} /> Active</label></div>
        </div></details>
        <div data-preview-host style="grid-column:1/-1;"></div>
      </form>
    `,
    validate: (p) => {
      const e = {};
      if (!String(p.title || "").trim()) e.title = "Title obligatoriu.";
      if (!String(p.slug || "").trim()) e.slug = "Slug obligatoriu.";
      return e;
    }
  });
}

async function initPortfolio() {
  const mount = $("#portfolio-page");
  if (!mount) return;
  mount.innerHTML = `
    ${pageHeader("Portofoliu", "Gestionează proiectele. Formularele Add/Edit apar în modal.", "Adaugă proiect", "portfolio-add-btn")}
    <section class="card" id="portfolio-root"><div class="table-wrap"></div></section>
  `;

  function objectListMarkup(name, label, helpText = "") {
    return `
      <div class="field" data-object-list="${name}">
        <label>${esc(label)}</label>
        ${helpText ? `<small class="hint">${esc(helpText)}</small>` : ""}
        <input type="hidden" name="${name}" data-object-hidden />
        <div class="object-list-items" data-object-items></div>
        <button class="btn btn-secondary" type="button" data-object-add>Adaugă item</button>
      </div>
    `;
  }

  function setupBuiltItemsEditor(wrap, initial = []) {
    const hidden = $("[data-object-hidden]", wrap);
    const itemsHost = $("[data-object-items]", wrap);
    const addBtn = $("[data-object-add]", wrap);
    let items = Array.isArray(initial)
      ? initial.map((it, idx) => ({
          title: String(it?.title || it || "").trim(),
          description: String(it?.description || "").trim(),
          icon: String(it?.icon || "").trim(),
          sort_order: Number.isFinite(Number(it?.sort_order)) ? Number(it.sort_order) : idx + 1
        }))
      : [];

    function sync() {
      hidden.value = JSON.stringify(
        items
          .filter((it) => it.title || it.description)
          .map((it, idx) => ({ ...it, sort_order: Number(it.sort_order || idx + 1) }))
      );
    }

    function render() {
      itemsHost.innerHTML = "";
      if (!items.length) {
        itemsHost.innerHTML = `<div class="mini-empty">Nu există item-uri.</div>`;
        sync();
        return;
      }
      items
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .forEach((item, index) => {
          const row = document.createElement("div");
          row.className = "cards-item-row";
          row.innerHTML = `
            <input data-title placeholder="Titlu" value="${esc(item.title)}" />
            <textarea data-description placeholder="Descriere">${esc(item.description)}</textarea>
            <input data-icon placeholder="Icon opțional (ex: layout)" value="${esc(item.icon)}" />
            <input data-sort type="number" placeholder="Sort" value="${Number(item.sort_order || index + 1)}" />
            <button class="btn btn-danger" type="button" data-remove>Șterge</button>
          `;
          $("[data-title]", row).addEventListener("input", (e) => {
            item.title = e.target.value.trim();
            sync();
          });
          $("[data-description]", row).addEventListener("input", (e) => {
            item.description = e.target.value.trim();
            sync();
          });
          $("[data-icon]", row).addEventListener("input", (e) => {
            item.icon = e.target.value.trim();
            sync();
          });
          $("[data-sort]", row).addEventListener("input", (e) => {
            item.sort_order = Number.parseInt(e.target.value || `${index + 1}`, 10) || index + 1;
            sync();
          });
          $("[data-remove]", row).addEventListener("click", () => {
            items = items.filter((x) => x !== item);
            render();
          });
          itemsHost.appendChild(row);
        });
      sync();
    }

    addBtn.addEventListener("click", () => {
      items.push({ title: "", description: "", icon: "", sort_order: items.length + 1 });
      render();
    });

    render();
    return {
      getValue: () =>
        items
          .filter((it) => it.title || it.description)
          .map((it, idx) => ({ ...it, sort_order: Number(it.sort_order || idx + 1) }))
    };
  }

  function setupResultsEditor(wrap, initial = []) {
    const hidden = $("[data-object-hidden]", wrap);
    const itemsHost = $("[data-object-items]", wrap);
    const addBtn = $("[data-object-add]", wrap);
    let items = Array.isArray(initial)
      ? initial.map((it, idx) => ({
          title: String(it?.title || it || "").trim(),
          description: String(it?.description || "").trim(),
          metric: String(it?.metric || "").trim(),
          label: String(it?.label || "").trim(),
          sort_order: Number.isFinite(Number(it?.sort_order)) ? Number(it.sort_order) : idx + 1
        }))
      : [];

    function sync() {
      hidden.value = JSON.stringify(
        items
          .filter((it) => it.title || it.description || it.metric || it.label)
          .map((it, idx) => ({ ...it, sort_order: Number(it.sort_order || idx + 1) }))
      );
    }

    function render() {
      itemsHost.innerHTML = "";
      if (!items.length) {
        itemsHost.innerHTML = `<div class="mini-empty">Nu există rezultate adăugate.</div>`;
        sync();
        return;
      }
      items
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .forEach((item, index) => {
          const row = document.createElement("div");
          row.className = "cards-item-row";
          row.innerHTML = `
            <input data-title placeholder="Titlu rezultat" value="${esc(item.title)}" />
            <textarea data-description placeholder="Descriere">${esc(item.description)}</textarea>
            <input data-metric placeholder="Metrică opțională" value="${esc(item.metric)}" />
            <input data-label placeholder="Label opțional" value="${esc(item.label)}" />
            <input data-sort type="number" placeholder="Sort" value="${Number(item.sort_order || index + 1)}" />
            <button class="btn btn-danger" type="button" data-remove>Șterge</button>
          `;
          $("[data-title]", row).addEventListener("input", (e) => {
            item.title = e.target.value.trim();
            sync();
          });
          $("[data-description]", row).addEventListener("input", (e) => {
            item.description = e.target.value.trim();
            sync();
          });
          $("[data-metric]", row).addEventListener("input", (e) => {
            item.metric = e.target.value.trim();
            sync();
          });
          $("[data-label]", row).addEventListener("input", (e) => {
            item.label = e.target.value.trim();
            sync();
          });
          $("[data-sort]", row).addEventListener("input", (e) => {
            item.sort_order = Number.parseInt(e.target.value || `${index + 1}`, 10) || index + 1;
            sync();
          });
          $("[data-remove]", row).addEventListener("click", () => {
            items = items.filter((x) => x !== item);
            render();
          });
          itemsHost.appendChild(row);
        });
      sync();
    }

    addBtn.addEventListener("click", () => {
      items.push({ title: "", description: "", metric: "", label: "", sort_order: items.length + 1 });
      render();
    });

    render();
    return {
      getValue: () =>
        items
          .filter((it) => it.title || it.description || it.metric || it.label)
          .map((it, idx) => ({ ...it, sort_order: Number(it.sort_order || idx + 1) }))
    };
  }

  function setupGalleryEditor(wrap, initial = []) {
    const hidden = $("[data-object-hidden]", wrap);
    const itemsHost = $("[data-object-items]", wrap);
    const addBtn = $("[data-object-add]", wrap);
    const uploadInput = document.createElement("input");
    uploadInput.type = "file";
    uploadInput.accept = ".jpg,.jpeg,.png,.webp";
    uploadInput.hidden = true;
    wrap.appendChild(uploadInput);

    let items = Array.isArray(initial)
      ? initial
          .map((it, idx) => ({
            image_url: String(it?.image_url || it || "").trim(),
            caption: String(it?.caption || "").trim(),
            alt_text: String(it?.alt_text || "").trim(),
            sort_order: Number.isFinite(Number(it?.sort_order)) ? Number(it.sort_order) : idx + 1
          }))
          .filter((it) => it.image_url)
      : [];

    async function upload(file) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        credentials: "include",
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload eșuat");
      return data.url || data?.data?.url || "";
    }

    function sync() {
      hidden.value = JSON.stringify(
        items
          .filter((it) => it.image_url)
          .map((it, idx) => ({ ...it, sort_order: Number(it.sort_order || idx + 1) }))
      );
    }

    function rowPreviewMarkup(url) {
      if (!url) return `<div class="preview-image">Fără imagine</div>`;
      return `<div class="preview-image"><img src="${esc(url)}" alt="preview galerie" /></div>`;
    }

    function render() {
      itemsHost.innerHTML = "";
      if (!items.length) {
        itemsHost.innerHTML = `<div class="mini-empty">Galeria este goală.</div>`;
        sync();
        return;
      }
      items
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .forEach((item, index) => {
          const row = document.createElement("div");
          row.className = "cards-item-row";
          row.innerHTML = `
            ${rowPreviewMarkup(item.image_url)}
            <input data-image placeholder="Image URL" value="${esc(item.image_url)}" />
            <input data-caption placeholder="Caption" value="${esc(item.caption)}" />
            <input data-alt placeholder="Alt text" value="${esc(item.alt_text)}" />
            <input data-sort type="number" placeholder="Sort" value="${Number(item.sort_order || index + 1)}" />
            <button class="btn btn-danger" type="button" data-remove>Șterge</button>
          `;
          $("[data-image]", row).addEventListener("input", (e) => {
            item.image_url = e.target.value.trim();
            const preview = $(".preview-image", row);
            preview.innerHTML = item.image_url ? `<img src=\"${esc(item.image_url)}\" alt=\"preview galerie\" />` : "Fără imagine";
            sync();
          });
          $("[data-caption]", row).addEventListener("input", (e) => {
            item.caption = e.target.value.trim();
            sync();
          });
          $("[data-alt]", row).addEventListener("input", (e) => {
            item.alt_text = e.target.value.trim();
            sync();
          });
          $("[data-sort]", row).addEventListener("input", (e) => {
            item.sort_order = Number.parseInt(e.target.value || `${index + 1}`, 10) || index + 1;
            sync();
          });
          $("[data-remove]", row).addEventListener("click", () => {
            items = items.filter((x) => x !== item);
            render();
          });
          itemsHost.appendChild(row);
        });
      sync();
    }

    addBtn.insertAdjacentHTML(
      "afterend",
      `<button class="btn btn-secondary" type="button" data-gallery-upload style="margin-left:.6rem;">Upload imagine</button>`
    );

    const uploadBtn = $("[data-gallery-upload]", wrap);
    uploadBtn.addEventListener("click", () => uploadInput.click());
    uploadInput.addEventListener("change", async () => {
      const file = uploadInput.files?.[0];
      if (!file) return;
      try {
        const imageUrl = await upload(file);
        if (imageUrl) {
          items.push({ image_url: imageUrl, caption: "", alt_text: "", sort_order: items.length + 1 });
          render();
          toast("Imagine încărcată.");
        }
      } catch (error) {
        toast(error.message || "Nu am putut încărca imaginea.", "error");
      } finally {
        uploadInput.value = "";
      }
    });

    addBtn.addEventListener("click", () => {
      items.push({ image_url: "", caption: "", alt_text: "", sort_order: items.length + 1 });
      render();
    });

    render();
    return {
      getValue: () =>
        items
          .filter((it) => it.image_url)
          .map((it, idx) => ({ ...it, sort_order: Number(it.sort_order || idx + 1) }))
    };
  }

  function safeJsonObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    return {};
  }

  crud({
    rootId: "portfolio-root",
    list: "/api/admin/portfolio",
    create: "/api/admin/portfolio",
    upd: "/api/admin/portfolio",
    del: "/api/admin/portfolio",
    addBtnId: "portfolio-add-btn",
    addTitle: "Adaugă proiect",
    editTitle: "Editează proiect",
    labelField: "title",
    saveSuccessMessage: "Proiect salvat.",
    emptyText: "Nu există încă proiecte.",
    emptyBtn: "Adaugă primul proiect",
    table: () => `<table><thead><tr><th>Titlu</th><th>Tip</th><th>Sort</th><th>Status</th><th>Acțiuni</th></tr></thead><tbody></tbody></table>`,
    row: (it) => `<td>${esc(it.title)}</td><td>${esc(it.project_type || "-")}</td><td>${it.sort_order || 0}</td><td>${badge(it.is_active ? "Active" : "Inactive", it.is_active ? "success" : "neutral")} ${it.is_featured ? badge("Featured", "feature") : ""}</td>`,
    getNewItem: (items) => ({
      title: "",
      slug: "",
      project_type: "",
      short_description: "",
      long_description: "",
      objective: "",
      initial_problem: "",
      target_audience: "",
      tone_style: "",
      image_url: "",
      image_alt: "",
      project_url: "",
      live_url: "",
      built_items_json: [],
      built_items_detailed_json: [],
      results: "",
      results_items_json: [],
      technologies_json: [],
      gallery_json: [],
      hero_title: "",
      hero_subtitle: "",
      challenge_title: "",
      challenge_text: "",
      solution_title: "",
      solution_text: "",
      results_title: "",
      results_text: "",
      cta_title: "",
      cta_text: "",
      cta_button_text: "",
      cta_button_url: "/calculator-pret",
      seo_title: "",
      seo_description: "",
      og_image: "",
      canonical_url: "",
      focus_keyword: "",
      robots: "index,follow",
      sort_order: items.length ? Math.max(...items.map((x) => Number(x.sort_order || 0))) + 1 : 0,
      is_featured: 0,
      is_active: 1
    }),
    tagsFields: ["technologies_json"],
    form: (it) => `
      <form class="grid grid-2">
        <details class="accordion" open><summary>Informații principale</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>Titlu</label><input name="title" value="${esc(it.title || "")}" required /><small class="field-error" data-error-for="title"></small></div>
          <div class="field"><label>Slug</label><input name="slug" value="${esc(it.slug || "")}" required /><small class="field-error" data-error-for="slug"></small></div>
          <div class="field"><label>Tip proiect</label><input name="project_type" value="${esc(it.project_type || "")}" /><small class="field-error" data-error-for="project_type"></small></div>
          <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="${it.sort_order || 0}" /></div>
          <div class="field" style="grid-column:1/-1;"><label>Short description</label><textarea name="short_description">${esc(it.short_description || "")}</textarea></div>
          <div class="field" style="grid-column:1/-1;"><label>Long description</label><textarea name="long_description">${esc(it.long_description || "")}</textarea></div>
        </div></details>
        <details class="accordion" open><summary>Linkuri și preview</summary><div class="accordion-body grid grid-2">
          ${imagePickerMarkup("image_url", "Image URL", ".png,.jpg,.jpeg,.webp,.svg")}
          <div class="field"><label>Alt text imagine</label><input name="image_alt" value="${esc(it.image_alt || "")}" /></div>
          <div class="field"><label>Project URL</label><input name="project_url" value="${esc(it.project_url || "")}" placeholder="https://..." /><small class="field-error" data-error-for="project_url"></small></div>
          <div class="field"><label>Live site URL</label><input name="live_url" value="${esc(it.live_url || "")}" placeholder="https://..." /><small class="field-error" data-error-for="live_url"></small></div>
          <div class="field" style="grid-column:1/-1;">
            <button class="btn btn-secondary" type="button" data-generate-preview>Generează preview din URL</button>
            <small class="hint">Folosește project/live URL pentru screenshot automat. Dacă nu merge, poți urca imagine manual.</small>
          </div>
        </div></details>
        <details class="accordion" open><summary>Context proiect</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>Pentru cine a fost proiectul</label><input name="client_name" value="${esc(it.client_name || "")}" /></div>
          <div class="field"><label>Public țintă</label><input name="target_audience" value="${esc(it.target_audience || "")}" /></div>
          <div class="field" style="grid-column:1/-1;"><label>Problema / situația inițială</label><textarea name="initial_problem">${esc(it.initial_problem || "")}</textarea></div>
          <div class="field" style="grid-column:1/-1;"><label>Objective</label><textarea name="objective">${esc(it.objective || "")}</textarea></div>
          <div class="field" style="grid-column:1/-1;"><label>Ton / stil dorit</label><input name="tone_style" value="${esc(it.tone_style || "")}" /></div>
        </div></details>
        <details class="accordion" open><summary>Ce am construit</summary><div class="accordion-body grid grid-2">
          ${objectListMarkup("built_items_detailed_json", "Built items", "Adaugă secțiuni/funcționalități cu titlu, descriere, icon opțional și sort order.")}
          <input type="hidden" name="built_items_json" />
        </div></details>
        <details class="accordion" open><summary>Rezultate / focus</summary><div class="accordion-body grid grid-2">
          ${objectListMarkup("results_items_json", "Results items", "Nu adăuga metrici inventate. Completează doar ce există real.")}
          <div class="field" style="grid-column:1/-1;"><label>Rezultat sumar</label><textarea name="results">${esc(it.results || "")}</textarea></div>
          ${tagsEditorMarkup("technologies_json", "Technologies")}
        </div></details>
        <details class="accordion"><summary>Galerie proiect</summary><div class="accordion-body grid grid-2">
          ${objectListMarkup("gallery_json", "Imagini galerie", "Poți adăuga URL direct sau upload în galerie.")}
        </div></details>
        <details class="accordion"><summary>Secțiuni pagină proiect</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>Hero title</label><input name="hero_title" value="${esc(it.hero_title || "")}" /></div>
          <div class="field"><label>Hero subtitle</label><input name="hero_subtitle" value="${esc(it.hero_subtitle || "")}" /></div>
          <div class="field"><label>Challenge title</label><input name="challenge_title" value="${esc(it.challenge_title || "")}" /></div>
          <div class="field" style="grid-column:1/-1;"><label>Challenge text</label><textarea name="challenge_text">${esc(it.challenge_text || "")}</textarea></div>
          <div class="field"><label>Solution title</label><input name="solution_title" value="${esc(it.solution_title || "")}" /></div>
          <div class="field" style="grid-column:1/-1;"><label>Solution text</label><textarea name="solution_text">${esc(it.solution_text || "")}</textarea></div>
          <div class="field"><label>Results title</label><input name="results_title" value="${esc(it.results_title || "")}" /></div>
          <div class="field" style="grid-column:1/-1;"><label>Results text</label><textarea name="results_text">${esc(it.results_text || "")}</textarea></div>
          <div class="field"><label>CTA title</label><input name="cta_title" value="${esc(it.cta_title || "")}" /></div>
          <div class="field" style="grid-column:1/-1;"><label>CTA text</label><textarea name="cta_text">${esc(it.cta_text || "")}</textarea></div>
          <div class="field"><label>CTA button text</label><input name="cta_button_text" value="${esc(it.cta_button_text || "")}" /></div>
          <div class="field"><label>CTA button URL</label><input name="cta_button_url" value="${esc(it.cta_button_url || "")}" /></div>
        </div></details>
        <details class="accordion"><summary>SEO</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>SEO title</label><input name="seo_title" value="${esc(it.seo_title || "")}" /></div>
          <div class="field"><label>SEO description</label><input name="seo_description" value="${esc(it.seo_description || "")}" /></div>
          <div class="field"><label>OG image</label><input name="og_image" value="${esc(it.og_image || "")}" /></div>
          <div class="field"><label>Canonical URL</label><input name="canonical_url" value="${esc(it.canonical_url || "")}" /></div>
          <div class="field"><label>Focus keyword</label><input name="focus_keyword" value="${esc(it.focus_keyword || "")}" /></div>
          <div class="field"><label>Robots</label><input name="robots" value="${esc(it.robots || "index,follow")}" /></div>
        </div></details>
        <details class="accordion"><summary>Vizibilitate</summary><div class="accordion-body row">
          <label class="check-inline"><input type="checkbox" name="is_featured" value="1" ${it.is_featured ? "checked" : ""} /> Featured</label>
          <label class="check-inline"><input type="checkbox" name="is_active" value="1" ${it.is_active === 0 ? "" : "checked"} /> Active</label>
        </div></details>
        <div data-preview-host style="grid-column:1/-1;"></div>
      </form>
    `,
    onModalReady: ({ form, item, listEditors, openModal }) => {
      const builtWrap = $("[data-object-list='built_items_detailed_json']", form);
      const resultsWrap = $("[data-object-list='results_items_json']", form);
      const galleryWrap = $("[data-object-list='gallery_json']", form);

      const builtEditor = builtWrap ? setupBuiltItemsEditor(builtWrap, item?.built_items_detailed_json || item?.built_items_json || []) : null;
      const resultsEditor = resultsWrap ? setupResultsEditor(resultsWrap, item?.results_items_json || []) : null;
      const galleryEditor = galleryWrap ? setupGalleryEditor(galleryWrap, item?.gallery_json || []) : null;

      if (builtEditor) {
        listEditors.built_items_detailed_json = builtEditor;
        listEditors.built_items_json = {
          getValue: () =>
            builtEditor
              .getValue()
              .map((entry) => String(entry.title || "").trim())
              .filter(Boolean)
        };
      }
      if (resultsEditor) listEditors.results_items_json = resultsEditor;
      if (galleryEditor) listEditors.gallery_json = galleryEditor;

      listEditors.project_sections_json = {
        getValue: () => {
          const payload = formObject(form);
          return {
            hero_title: payload.hero_title || "",
            hero_subtitle: payload.hero_subtitle || "",
            challenge_title: payload.challenge_title || "",
            challenge_text: payload.challenge_text || "",
            solution_title: payload.solution_title || "",
            solution_text: payload.solution_text || "",
            results_title: payload.results_title || "",
            results_text: payload.results_text || "",
            cta_title: payload.cta_title || "",
            cta_text: payload.cta_text || "",
            cta_button_text: payload.cta_button_text || "",
            cta_button_url: payload.cta_button_url || ""
          };
        }
      };

      const genBtn = $("[data-generate-preview]", form);
      if (genBtn) {
        genBtn.addEventListener("click", async () => {
          const projectUrlField = form.elements.namedItem("project_url");
          const liveUrlField = form.elements.namedItem("live_url");
          const imageUrlField = form.elements.namedItem("image_url");
          const targetUrl = String(liveUrlField?.value || projectUrlField?.value || "").trim();
          if (!validHttpUrl(targetUrl)) {
            toast("URL invalid pentru preview. Folosește http:// sau https://.", "error");
            return;
          }
          const previousText = genBtn.textContent;
          genBtn.disabled = true;
          genBtn.textContent = "Generez preview...";
          try {
            const response = await api("/api/admin/portfolio/preview", {
              method: "POST",
              body: JSON.stringify({ url: targetUrl })
            });
            const imageUrl = response?.url || response?.data?.url || "";
            if (!imageUrl) throw new Error("Preview indisponibil.");
            imageUrlField.value = imageUrl;
            imageUrlField.dispatchEvent(new Event("input", { bubbles: true }));
            toast("Preview generat.");
          } catch (error) {
            toast(error.message || "Nu am putut genera preview-ul automat. Poți urca manual o imagine.", "error");
          } finally {
            genBtn.disabled = false;
            genBtn.textContent = previousText;
          }
        });
      }

      const prevHost = $("[data-preview-host]", form);
      if (prevHost) {
        const refreshPreview = () => {
          previewCard(prevHost);
          const payload = formObject(form);
          payload.short_description = payload.short_description || payload.long_description || "";
          payload.cta_text = payload.cta_button_text || "";
          updatePreview(prevHost, payload);
        };
        form.addEventListener("input", refreshPreview);
        refreshPreview();
      }

      form.dataset.reopenState = JSON.stringify(safeJsonObject(item || {}));
      form.dataset.hasOpenModal = "1";
      form.dataset._resetMode = item?.id ? "edit" : "add";
      form.dataset._openModalRef = "1";
      form._openPortfolioModal = () => openModal(item || null);
    },
    onReset: ({ form }) => {
      if (form && typeof form._openPortfolioModal === "function") {
        const reopen = form._openPortfolioModal;
        const modalEl = form.closest(".modal-overlay");
        const closeBtn = modalEl ? $("[data-close]", modalEl) : null;
        if (closeBtn) closeBtn.click();
        setTimeout(() => reopen(), 10);
      }
    },
    validate: (p) => {
      const e = {};
      if (!String(p.title || "").trim()) e.title = "Title obligatoriu.";
      if (!String(p.slug || "").trim()) e.slug = "Slug obligatoriu.";
      if (p.project_url && !validHttpUrl(p.project_url)) e.project_url = "URL invalid.";
      if (p.live_url && !validHttpUrl(p.live_url)) e.live_url = "URL invalid.";
      if (p.image_url && !validUrl(p.image_url)) e.image_url = "Image URL invalid.";
      if (p.og_image && !validUrl(p.og_image)) e.og_image = "OG image invalid.";
      if (p.canonical_url && !validHttpUrl(p.canonical_url)) e.canonical_url = "Canonical URL invalid.";
      if (p.cta_button_url && !validUrl(p.cta_button_url)) e.cta_button_url = "CTA URL invalid.";
      return e;
    }
  });
}

async function initPackages() {
  const mount = $("#packages-page");
  if (!mount) return;
  mount.innerHTML = `
    ${pageHeader("Pachete", "Gestionează pachetele. Formularele Add/Edit apar în modal.", "Adaugă pachet", "packages-add-btn")}
    <section class="card" id="packages-root"><div class="table-wrap"></div></section>
  `;
  crud({
    rootId: "packages-root",
    list: "/api/admin/packages",
    create: "/api/admin/packages",
    upd: "/api/admin/packages",
    del: "/api/admin/packages",
    addBtnId: "packages-add-btn",
    addTitle: "Adaugă pachet",
    editTitle: "Editează pachet",
    labelField: "name",
    emptyText: "Nu există încă pachete.",
    emptyBtn: "Adaugă primul pachet",
    table: () => `<table><thead><tr><th>Nume</th><th>Price from</th><th>Status</th><th>Acțiuni</th></tr></thead><tbody></tbody></table>`,
    row: (it) => `<td>${esc(it.name)}</td><td>${it.price_from ? `${Number(it.price_from).toLocaleString("ro-RO")} lei` : "-"}</td><td>${badge(it.is_active ? "Active" : "Inactive", it.is_active ? "success" : "neutral")} ${it.is_recommended ? badge("Featured", "feature") : ""}</td>`,
    listFields: ["features_json"],
    form: (it) => `
      <form class="grid grid-2">
        <details class="accordion" open><summary>Informații principale</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>Nume</label><input name="name" value="${esc(it.name || "")}" required /><small class="field-error" data-error-for="name"></small></div>
          <div class="field"><label>Slug</label><input name="slug" value="${esc(it.slug || "")}" required /><small class="field-error" data-error-for="slug"></small></div>
          <div class="field" style="grid-column:1/-1;"><label>Short description</label><textarea name="short_description">${esc(it.short_description || "")}</textarea></div>
          <div class="field"><label>Price from</label><input type="number" name="price_from" value="${it.price_from || ""}" /></div>
          <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="${it.sort_order || 0}" /></div>
        </div></details>
        <details class="accordion"><summary>Features</summary><div class="accordion-body">${listEditorMarkup("features_json", "Features")}</div></details>
        <details class="accordion"><summary>CTA</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>CTA text</label><input name="cta_text" value="${esc(it.cta_text || "")}" /></div>
          <div class="field"><label>CTA URL</label><input name="cta_url" value="${esc(it.cta_url || "")}" /></div>
        </div></details>
        <details class="accordion"><summary>Vizibilitate</summary><div class="accordion-body row">
          <label class="check-inline"><input type="checkbox" name="show_price" value="1" ${it.show_price ? "checked" : ""} /> Show price</label>
          <label class="check-inline"><input type="checkbox" name="is_recommended" value="1" ${it.is_recommended ? "checked" : ""} /> Recommended</label>
          <label class="check-inline"><input type="checkbox" name="is_active" value="1" ${it.is_active === 0 ? "" : "checked"} /> Active</label>
        </div></details>
        <div data-preview-host style="grid-column:1/-1;"></div>
      </form>
    `,
    validate: (p) => {
      const e = {};
      if (!String(p.name || "").trim()) e.name = "Name obligatoriu.";
      if (!String(p.slug || "").trim()) e.slug = "Slug obligatoriu.";
      return e;
    },
    titleField: "name"
  });
}

async function initFaq() {
  const mount = $("#faq-page");
  if (!mount) return;
  mount.innerHTML = `
    ${pageHeader("FAQ", "Gestionează întrebările frecvente. Formularele Add/Edit apar în modal.", "Adaugă întrebare", "faq-add-btn")}
    <section class="card" id="faq-root"><div class="table-wrap"></div></section>
  `;
  crud({
    rootId: "faq-root",
    list: "/api/admin/faq",
    create: "/api/admin/faq",
    upd: "/api/admin/faq",
    del: "/api/admin/faq",
    addBtnId: "faq-add-btn",
    addTitle: "Adaugă FAQ",
    editTitle: "Editează FAQ",
    labelField: "question",
    emptyText: "Nu există încă întrebări FAQ.",
    emptyBtn: "Adaugă primul FAQ",
    table: () => `<table><thead><tr><th>Întrebare</th><th>Sort</th><th>Status</th><th>Acțiuni</th></tr></thead><tbody></tbody></table>`,
    row: (it) => `<td>${esc(it.question)}</td><td>${it.sort_order || 0}</td><td>${badge(it.is_active ? "Active" : "Inactive", it.is_active ? "success" : "neutral")}</td>`,
    form: (it) => `
      <form class="grid grid-2">
        <div class="field" style="grid-column:1/-1;"><label>Întrebare</label><input name="question" value="${esc(it.question || "")}" required /><small class="field-error" data-error-for="question"></small></div>
        <div class="field" style="grid-column:1/-1;"><label>Răspuns</label><textarea name="answer" required>${esc(it.answer || "")}</textarea><small class="field-error" data-error-for="answer"></small></div>
        <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="${it.sort_order || 0}" /></div>
        <div class="row" style="align-items:center;margin-top:1.8rem;"><label class="check-inline"><input type="checkbox" name="is_active" value="1" ${it.is_active === 0 ? "" : "checked"} /> Active</label></div>
      </form>
    `,
    validate: (p) => {
      const e = {};
      if (!String(p.question || "").trim()) e.question = "Question obligatoriu.";
      if (!String(p.answer || "").trim()) e.answer = "Answer obligatoriu.";
      return e;
    }
  });
}

async function initHomepage() {
  const mount = $("#homepage-page");
  if (!mount) return;
  let sections = await api("/api/admin/homepage");
  mount.innerHTML = `
    ${pageHeader("Homepage", "Editează fiecare secțiune într-un modal compact.")}
    <section class="card"><div id="homepage-cards" class="grid grid-3"></div></section>
  `;
  const cards = $("#homepage-cards");
  function render() {
    if (!sections.length) {
      emptyState(cards, "Nu există secțiuni homepage.");
      return;
    }
    cards.innerHTML = sections
      .map(
        (s) => `
      <article class="card section-card">
        <p class="muted">${esc(s.section_key)}</p>
        <h4>${esc(s.title || "(fără titlu)")}</h4>
        <div class="row">${badge(s.is_active ? "Active" : "Inactive", s.is_active ? "success" : "neutral")}</div>
        <div class="row" style="margin-top:0.8rem;"><button class="btn btn-secondary" type="button" data-edit="${esc(s.section_key)}">Edit</button></div>
      </article>`
      )
      .join("");
    $$("[data-edit]", cards).forEach((b) =>
      b.addEventListener("click", () => {
        const sec = sections.find((x) => x.section_key === b.dataset.edit);
        if (sec) openEditor(sec);
      })
    );
  }
  function openEditor(sec) {
    const m = modal({ title: `Edit: ${sec.section_key}`, subtitle: "Text principal, butoane, imagine, extra_json", size: "xl" });
    const extra = sec.extra_json || {};
    const heroVideoUrl = String(extra.hero_video_url || "");
    const heroVideoPosterUrl = String(extra.hero_video_poster_url || "");
    m.body.innerHTML = `
      <form class="grid grid-2">
        <input type="hidden" name="section_key" value="${esc(sec.section_key)}" />
        <details class="accordion" open><summary>Text principal</summary><div class="accordion-body grid grid-2">
          <div class="field" style="grid-column:1/-1;"><label>Titlu</label><input name="title" value="${esc(sec.title || "")}" /></div>
          <div class="field" style="grid-column:1/-1;"><label>Subtitlu</label><textarea name="subtitle">${esc(sec.subtitle || "")}</textarea></div>
          <div class="field" style="grid-column:1/-1;"><label>Conținut</label><textarea name="content">${esc(sec.content || "")}</textarea></div>
          <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="${sec.sort_order || 0}" /></div>
          <div class="row" style="align-items:center;margin-top:1.8rem;"><label class="check-inline"><input type="checkbox" name="is_active" value="1" ${sec.is_active === 0 ? "" : "checked"} /> Active</label></div>
        </div></details>
        <details class="accordion"><summary>Butoane</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>Primary text</label><input name="button_primary_text" value="${esc(sec.button_primary_text || "")}" /></div>
          <div class="field"><label>Primary URL</label><input name="button_primary_url" value="${esc(sec.button_primary_url || "")}" /></div>
          <div class="field"><label>Secondary text</label><input name="button_secondary_text" value="${esc(sec.button_secondary_text || "")}" /></div>
          <div class="field"><label>Secondary URL</label><input name="button_secondary_url" value="${esc(sec.button_secondary_url || "")}" /></div>
        </div></details>
        <details class="accordion"><summary>Imagine</summary><div class="accordion-body grid grid-2">
          ${imagePickerMarkup("image_url", "Image URL", ".png,.jpg,.jpeg,.webp,.svg")}
          ${sec.section_key === "hero" ? videoPickerMarkup("hero_video_url", "Hero video URL", ".mp4,.webm,.mov", "Poți lipi un URL sau poți încărca un video local pentru hero.") : ""}
          ${sec.section_key === "hero" ? imagePickerMarkup("hero_video_poster_url", "Hero video poster URL", ".png,.jpg,.jpeg,.webp,.svg", "Poster imagine pentru video-ul din hero.") : ""}
        </div></details>
        <details class="accordion" open><summary>Extra data</summary><div class="accordion-body grid grid-2">
          ${listEditorMarkup("benefits", "Benefits")}
          ${listEditorMarkup("highlights", "Highlights")}
          ${cardsEditorMarkup("cards", "Cards (title + text)")}
          <div class="field" style="grid-column:1/-1;"><label>Advanced JSON</label><textarea name="extra_json_raw">${esc(JSON.stringify(extra, null, 2))}</textarea><small class="field-error" data-error-for="extra_json_raw"></small></div>
        </div></details>
      </form>
    `;
    const form = $("form", m.body);
    setupImagePickers(form);
    setupVideoPickers(form);
    if (sec.section_key === "hero") {
      const heroVideoField = $('[name="hero_video_url"]', form);
      const heroVideoPosterField = $('[name="hero_video_poster_url"]', form);
      if (heroVideoField) heroVideoField.value = heroVideoUrl;
      if (heroVideoPosterField) heroVideoPosterField.value = heroVideoPosterUrl;
    }
    const benefits = setupListEditor($('[data-list-editor="benefits"]', form), extra.benefits || []);
    const highlights = setupListEditor($('[data-list-editor="highlights"]', form), extra.highlights || []);
    const cards = setupCardsEditor($('[data-cards-editor="cards"]', form), extra.cards || []);
    m.foot.innerHTML = `<button class="btn btn-secondary" type="button" data-cancel>Cancel</button><button class="btn btn-primary" type="button" data-save>Save</button>`;
    $("[data-cancel]", m.foot).addEventListener("click", m.close);
    $("[data-save]", m.foot).addEventListener("click", async () => {
      const payload = formObject(form);
      const parsed = parseJson(payload.extra_json_raw, null);
      if (payload.extra_json_raw && parsed === null) {
        setError(form, "extra_json_raw", "Invalid JSON");
        toast("Invalid JSON", "error");
        return;
      }
      const extraJson = parsed || {};
      extraJson.benefits = benefits.getValue();
      extraJson.highlights = highlights.getValue();
      extraJson.cards = cards.getValue();
      if (sec.section_key === "hero") {
        const videoUrl = String(payload.hero_video_url || "").trim();
        const posterUrl = String(payload.hero_video_poster_url || "").trim();
        if (videoUrl) extraJson.hero_video_url = videoUrl;
        else delete extraJson.hero_video_url;
        if (posterUrl) extraJson.hero_video_poster_url = posterUrl;
        else delete extraJson.hero_video_poster_url;
      }
      payload.extra_json = extraJson;
      delete payload.extra_json_raw;
      delete payload.benefits;
      delete payload.highlights;
      delete payload.cards;
      delete payload.hero_video_url;
      delete payload.hero_video_poster_url;
      await api(`/api/admin/homepage/${encodeURIComponent(sec.section_key)}`, { method: "PUT", body: JSON.stringify(payload) });
      sections = await api("/api/admin/homepage");
      render();
      m.close();
      toast("Saved successfully");
    });
  }
  render();
}

async function initSeo() {
  const mount = $("#seo-page");
  if (!mount) return;
  let pages = await api("/api/admin/seo");
  mount.innerHTML = `
    ${pageHeader("SEO pagini", "Editează meta title, meta description și OG pentru fiecare pagină.")}
    <section class="card"><div class="table-wrap"><table><thead><tr><th>Page key</th><th>Meta title</th><th>Canonical</th><th>Acțiuni</th></tr></thead><tbody id="seo-rows"></tbody></table></div></section>
  `;
  const rows = $("#seo-rows");
  function render() {
    rows.innerHTML = pages
      .map((p) => `<tr><td>${esc(p.page_key)}</td><td>${esc(p.meta_title || "-")}</td><td>${esc(p.canonical_url || "-")}</td><td><button class="btn btn-secondary" type="button" data-edit="${esc(p.page_key)}">Edit</button></td></tr>`)
      .join("");
    $$("[data-edit]", rows).forEach((b) =>
      b.addEventListener("click", () => {
        const p = pages.find((x) => x.page_key === b.dataset.edit);
        if (p) edit(p);
      })
    );
  }
  function edit(p) {
    const m = modal({ title: `SEO: ${p.page_key}`, subtitle: "Editare metadate", size: "xl" });
    m.body.innerHTML = `
      <form class="grid grid-2">
        <div class="field"><label>Page key</label><input name="page_key" value="${esc(p.page_key)}" readonly /></div>
        <div class="field"><label>Page title</label><input name="page_title" value="${esc(p.page_title || "")}" /></div>
        <div class="field" style="grid-column:1/-1;"><label>Meta title</label><input name="meta_title" value="${esc(p.meta_title || "")}" /></div>
        <div class="field" style="grid-column:1/-1;"><label>Meta description</label><textarea name="meta_description">${esc(p.meta_description || "")}</textarea></div>
        <div class="field"><label>OG title</label><input name="og_title" value="${esc(p.og_title || "")}" /></div>
        ${imagePickerMarkup("og_image", "OG image", ".png,.jpg,.jpeg,.webp,.svg")}
        <div class="field" style="grid-column:1/-1;"><label>OG description</label><textarea name="og_description">${esc(p.og_description || "")}</textarea></div>
        <div class="field"><label>Canonical URL</label><input name="canonical_url" value="${esc(p.canonical_url || "")}" /><small class="field-error" data-error-for="canonical_url"></small></div>
        <div class="field"><label>Robots</label><input name="robots" value="${esc(p.robots || "")}" /></div>
      </form>
    `;
    const form = $("form", m.body);
    setupImagePickers(form);
    m.foot.innerHTML = `<button class="btn btn-secondary" type="button" data-cancel>Cancel</button><button class="btn btn-primary" type="button" data-save>Save</button>`;
    $("[data-cancel]", m.foot).addEventListener("click", m.close);
    $("[data-save]", m.foot).addEventListener("click", async () => {
      const payload = formObject(form);
      const errs = {};
      if (!validUrl(payload.canonical_url)) errs.canonical_url = "URL invalid.";
      if (Object.keys(errs).length) {
        applyErrors(form, errs);
        toast("Please complete required fields", "error");
        return;
      }
      await api(`/api/admin/seo/${encodeURIComponent(payload.page_key)}`, { method: "PUT", body: JSON.stringify(payload) });
      pages = await api("/api/admin/seo");
      render();
      m.close();
      toast("Saved successfully");
    });
  }
  render();
}

async function initCalculator() {
  const mount = $("#calculator-page");
  if (!mount) return;
  mount.innerHTML = `
    ${pageHeader("Calculator preț", "Gestionează opțiunile și setările calculatorului.", "Adaugă opțiune", "calc-add-btn")}
    <section class="card"><div class="table-wrap"><table><thead><tr><th>Step</th><th>Label</th><th>Type</th><th>Base</th><th>Add</th><th>Sort</th><th>Status</th><th>Acțiuni</th></tr></thead><tbody id="calc-rows"></tbody></table></div></section>
    <section class="card" style="margin-top:1rem;"><h3 style="margin-top:0;">Setări calculator</h3><form id="calc-settings" class="grid grid-3"></form><div class="sticky-actions"><button class="btn btn-primary" type="button" id="calc-save-settings">Save settings</button><button class="btn btn-secondary" type="button" id="calc-preview-btn">Preview calculator</button></div><p id="calc-preview" class="muted"></p></section>
  `;
  let options = await api("/api/admin/calculator/options");
  let settings = await api("/api/admin/calculator/settings");
  const rows = $("#calc-rows");
  const settingsForm = $("#calc-settings");
  const preview = $("#calc-preview");

  function renderRows() {
    rows.innerHTML = options
      .map((o) => `<tr><td>${esc(o.step_key)}</td><td>${esc(o.option_label)}</td><td>${esc(o.option_type)}</td><td>${o.base_price || 0}</td><td>${o.price_add || 0}</td><td>${o.sort_order || 0}</td><td>${badge(o.is_active ? "Active" : "Inactive", o.is_active ? "success" : "neutral")}</td><td>${actionButtons(o.id, o.option_label)}</td></tr>`)
      .join("");
    $$("[data-edit]", rows).forEach((b) =>
      b.addEventListener("click", () => {
        const o = options.find((x) => String(x.id) === b.dataset.edit);
        if (o) editOption(o);
      })
    );
    $$("[data-delete]", rows).forEach((b) =>
      b.addEventListener("click", async () => {
        const ok = await confirmModal("Confirm delete", `Sigur vrei să ștergi această opțiune? (${b.dataset.label})`);
        if (!ok) return;
        await api(`/api/admin/calculator/options/${b.dataset.delete}`, { method: "DELETE" });
        options = await api("/api/admin/calculator/options");
        renderRows();
        toast("Deleted successfully");
      })
    );
  }
  function editOption(o = null) {
    const m = modal({ title: o ? "Editează opțiune" : "Adaugă opțiune", subtitle: "Calculator option" });
    m.body.innerHTML = `
      <form class="grid grid-3">
        <div class="field"><label>Step key</label><input name="step_key" value="${esc(o?.step_key || "")}" required /><small class="field-error" data-error-for="step_key"></small></div>
        <div class="field"><label>Step title</label><input name="step_title" value="${esc(o?.step_title || "")}" /></div>
        <div class="field"><label>Option label</label><input name="option_label" value="${esc(o?.option_label || "")}" required /><small class="field-error" data-error-for="option_label"></small></div>
        <div class="field"><label>Option value</label><input name="option_value" value="${esc(o?.option_value || "")}" /></div>
        <div class="field"><label>Type</label><select name="option_type"><option value="single" ${o?.option_type === "single" ? "selected" : ""}>single</option><option value="checkbox" ${o?.option_type === "checkbox" ? "selected" : ""}>checkbox</option></select></div>
        <div class="field"><label>Sort</label><input type="number" name="sort_order" value="${o?.sort_order || 0}" /></div>
        <div class="field"><label>Base price</label><input type="number" name="base_price" value="${o?.base_price || 0}" /></div>
        <div class="field"><label>Price add</label><input type="number" name="price_add" value="${o?.price_add || 0}" /></div>
        <div class="row" style="align-items:center;margin-top:1.8rem;"><label class="check-inline"><input type="checkbox" name="is_active" value="1" ${o?.is_active === 0 ? "" : "checked"} /> Active</label></div>
      </form>
    `;
    const form = $("form", m.body);
    m.foot.innerHTML = `<button class="btn btn-secondary" type="button" data-cancel>Cancel</button><button class="btn btn-primary" type="button" data-save>Save</button>`;
    $("[data-cancel]", m.foot).addEventListener("click", m.close);
    $("[data-save]", m.foot).addEventListener("click", async () => {
      const payload = formObject(form);
      const errs = {};
      if (!payload.step_key) errs.step_key = "step_key obligatoriu.";
      if (!payload.option_label) errs.option_label = "option_label obligatoriu.";
      if (Object.keys(errs).length) {
        applyErrors(form, errs);
        toast("Please complete required fields", "error");
        return;
      }
      if (o?.id) await api(`/api/admin/calculator/options/${o.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/admin/calculator/options", { method: "POST", body: JSON.stringify(payload) });
      options = await api("/api/admin/calculator/options");
      renderRows();
      m.close();
      toast("Saved successfully");
    });
  }

  $("#calc-add-btn").addEventListener("click", () => editOption());
  settingsForm.innerHTML = `
    <div class="field"><label>max_multiplier</label><input name="max_multiplier" type="number" step="0.1" value="${settings.max_multiplier || 1.2}" /></div>
    <div class="field"><label>round_to</label><input name="round_to" type="number" value="${settings.round_to || 100}" /></div>
    <div class="field"><label>start_threshold</label><input name="start_threshold" type="number" value="${settings.start_threshold || 2000}" /></div>
    <div class="field"><label>business_threshold</label><input name="business_threshold" type="number" value="${settings.business_threshold || 4500}" /></div>
    <div class="field"><label>premium_threshold</label><input name="premium_threshold" type="number" value="${settings.premium_threshold || 7000}" /></div>
    <div class="field"><label>custom_threshold</label><input name="custom_threshold" type="number" value="${settings.custom_threshold || 7000}" /></div>
    <div class="field" style="grid-column:1/-1;"><label>result_intro_text</label><textarea name="result_intro_text">${esc(settings.result_intro_text || "")}</textarea></div>
    <div class="field" style="grid-column:1/-1;"><label>under_budget_message</label><textarea name="under_budget_message">${esc(settings.under_budget_message || "")}</textarea></div>
    <div class="field" style="grid-column:1/-1;"><label>start_message</label><textarea name="start_message">${esc(settings.start_message || "")}</textarea></div>
    <div class="field" style="grid-column:1/-1;"><label>business_message</label><textarea name="business_message">${esc(settings.business_message || "")}</textarea></div>
    <div class="field" style="grid-column:1/-1;"><label>premium_message</label><textarea name="premium_message">${esc(settings.premium_message || "")}</textarea></div>
    <div class="field" style="grid-column:1/-1;"><label>custom_message</label><textarea name="custom_message">${esc(settings.custom_message || "")}</textarea></div>
  `;
  $("#calc-save-settings").addEventListener("click", async () => {
    const payload = formObject(settingsForm);
    await api("/api/admin/calculator/settings", { method: "PUT", body: JSON.stringify(payload) });
    settings = await api("/api/admin/calculator/settings");
    toast("Saved successfully");
  });
  $("#calc-preview-btn").addEventListener("click", () => {
    const base = options.find((x) => x.step_key === "site_type")?.base_price || 2500;
    const adds = options.filter((x) => ["pages", "content", "features", "design_level", "deadline"].includes(x.step_key)).slice(0, 5).reduce((sum, x) => sum + Number(x.price_add || 0), 0);
    const total = base + adds;
    const maxMultiplier = Number(settingsForm.elements.namedItem("max_multiplier")?.value || 1.2);
    const roundTo = Number(settingsForm.elements.namedItem("round_to")?.value || 100);
    const max = Math.round((total * maxMultiplier) / roundTo) * roundTo;
    preview.textContent = `Preview estimare: ${total.toLocaleString("ro-RO")} - ${max.toLocaleString("ro-RO")} lei`;
  });
  renderRows();
}

async function initLeads() {
  const filters = $("#leads-filters");
  const detail = $("#lead-detail-form");
  const summary = $("#lead-summary");
  const tableWrap = $("#leads-table-wrap");
  if (!filters || !detail || !summary || !tableWrap) return;
  let leads = [];
  let selected = null;
  async function load() {
    const params = new URLSearchParams(new FormData(filters));
    leads = await api(`/api/admin/leads?${params.toString()}`);
    render();
  }
  function render() {
    if (!leads.length) {
      emptyState(tableWrap, "Nu există încă lead-uri.");
      return;
    }
    tableWrap.innerHTML = `<table><thead><tr><th>Nume</th><th>Email</th><th>Telefon</th><th>Status</th><th>Source</th><th>Data</th><th>Acțiuni</th></tr></thead><tbody id="leads-body"></tbody></table>`;
    const body = $("#leads-body", tableWrap);
    body.innerHTML = leads
      .map((l) => `<tr><td>${esc(l.name)}</td><td>${esc(l.email)}</td><td>${esc(l.phone || "-")}</td><td>${badge(l.status, statusKind(l.status))}</td><td>${esc(l.source || "-")}</td><td>${new Date(l.created_at).toLocaleString("ro-RO")}</td><td><button class="btn btn-secondary" type="button" data-view="${l.id}">View</button> <button class="btn btn-danger" type="button" data-delete="${l.id}">Delete</button></td></tr>`)
      .join("");
    $$("[data-view]", body).forEach((b) =>
      b.addEventListener("click", async () => {
        const lead = await api(`/api/admin/leads/${b.dataset.view}`);
        selected = lead.id;
        ["name", "email", "phone", "project_type", "budget_range", "timeline", "message", "status", "internal_notes"].forEach((k) => {
          const f = detail.elements.namedItem(k);
          if (f) f.value = lead[k] || "";
        });
        $("[data-lead-meta]", detail).textContent = `Estimare: ${lead.estimated_min || "-"} - ${lead.estimated_max || "-"} | Pachet: ${lead.recommended_package || "-"}`;
        summary.textContent = lead.calculator_summary_json ? JSON.stringify(lead.calculator_summary_json, null, 2) : "-";
        const mail = $("#lead-mailto");
        if (mail) mail.href = `mailto:${lead.email}`;
        const wa = $("#lead-whatsapp");
        if (wa) {
          if (lead.phone) {
            wa.href = `https://wa.me/${String(lead.phone).replace(/[^\d]/g, "")}`;
            wa.classList.remove("hidden");
          } else {
            wa.classList.add("hidden");
          }
        }
      })
    );
    $$("[data-delete]", body).forEach((b) =>
      b.addEventListener("click", async () => {
        const ok = await confirmModal("Confirm delete", "Sigur vrei să ștergi acest lead?");
        if (!ok) return;
        await api(`/api/admin/leads/${b.dataset.delete}`, { method: "DELETE" });
        toast("Deleted successfully");
        await load();
      })
    );
  }
  filters.addEventListener("submit", async (e) => {
    e.preventDefault();
    await load();
  });
  detail.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selected) return;
    await api(`/api/admin/leads/${selected}`, { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(detail).entries())) });
    toast("Saved successfully");
    await load();
  });
  await load();
}

async function initMedia() {
  const mount = $("#media-page");
  if (!mount) return;
  mount.innerHTML = `
    ${pageHeader("Media", "Upload, copiere URL și gestionare imagini.")}
    <section class="card">
      <form id="media-upload-form" class="row" enctype="multipart/form-data">
        <input type="file" name="file" accept=".jpg,.jpeg,.png,.webp,.svg,.ico" required />
        <input name="alt_text" placeholder="Alt text" />
        <button class="btn btn-primary" type="submit">Upload</button>
      </form>
      <div id="media-grid-wrap" style="margin-top:1rem;"></div>
    </section>
  `;
  const form = $("#media-upload-form");
  const wrap = $("#media-grid-wrap");
  async function load() {
    const items = await api("/api/admin/media");
    state.media = items;
    if (!items.length) {
      emptyState(wrap, "Nu există încă fișiere media.");
      return;
    }
    wrap.innerHTML = `<div class="media-grid">${items
      .map(
        (it) => `
      <article class="media-card">
        <img src="${esc(it.url)}" alt="${esc(it.alt_text || it.filename)}" />
        <p class="media-name">${esc(it.filename)}</p>
        <small class="muted">${Math.round(it.size / 1024)} KB</small>
        <input data-alt="${it.id}" value="${esc(it.alt_text || "")}" placeholder="Alt text" />
        <div class="row">
          <button class="btn btn-secondary" type="button" data-copy="${esc(it.url)}">Copy URL</button>
          <button class="btn btn-secondary" type="button" data-save-alt="${it.id}">Save alt</button>
          <button class="btn btn-danger" type="button" data-del="${it.id}">Delete</button>
        </div>
      </article>
    `
      )
      .join("")}</div>`;
    $$("[data-copy]", wrap).forEach((b) => b.addEventListener("click", async () => {
      await navigator.clipboard.writeText(b.dataset.copy);
      toast("URL copiat în clipboard");
    }));
    $$("[data-save-alt]", wrap).forEach((b) =>
      b.addEventListener("click", async () => {
        const input = $(`[data-alt="${b.dataset.saveAlt}"]`, wrap);
        await api(`/api/admin/media/${b.dataset.saveAlt}`, { method: "PUT", body: JSON.stringify({ alt_text: input.value }) });
        toast("Saved successfully");
      })
    );
    $$("[data-del]", wrap).forEach((b) =>
      b.addEventListener("click", async () => {
        const ok = await confirmModal("Confirm delete", "Sigur vrei să ștergi fișierul media?");
        if (!ok) return;
        await api(`/api/admin/media/${b.dataset.del}`, { method: "DELETE" });
        toast("Deleted successfully");
        await load();
      })
    );
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const res = await fetch("/api/admin/media/upload", { method: "POST", credentials: "include", body: fd });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Upload eșuat", "error");
      return;
    }
    toast("Upload successful");
    form.reset();
    await load();
  });
  await load();
}

async function initProjectLogos() {
  const mount = $("#project-logos-page");
  if (!mount) return;
  const SCALE_MIN = 60;
  const SCALE_MAX = 180;
  const BG_MODES = ["soft", "light", "dark", "none"];
  const clampScale = (value) => Math.max(SCALE_MIN, Math.min(SCALE_MAX, Number(value || 100)));
  const safeBg = (value) => (BG_MODES.includes(String(value || "").toLowerCase()) ? String(value).toLowerCase() : "soft");
  const invertClass = (value) => (value === true || value === 1 || value === "1" ? " logo-invert-on-dark" : "");
  function logoPreviewBox(item = {}) {
    const alt = item.alt_text || item.name || "logo";
    const mode = safeBg(item.background_mode);
    const scale = (clampScale(item.display_scale) / 100).toFixed(2);
    const classes = `logo-marquee-logo-box logo-bg-${mode}`;
    if (!item.logo_url) {
      return `<span class="${classes}"><small class="muted">Fără logo</small></span>`;
    }
    return `<span class="${classes}" style="--logo-scale:${scale};"><img src="${esc(item.logo_url)}" alt="${esc(alt)}" class="${invertClass(item.invert_on_dark).trim()}" /></span>`;
  }

  mount.innerHTML = `
    ${pageHeader("Logo-uri proiecte", "Adaugă logo-uri ale proiectelor/site-urilor create. Acestea apar în caruselul de sub hero.", "Adaugă logo", "project-logos-add-btn")}
    <section class="card" id="project-logos-root"><div class="table-wrap"></div></section>
  `;

  crud({
    rootId: "project-logos-root",
    list: "/api/admin/project-logos",
    create: "/api/admin/project-logos",
    upd: "/api/admin/project-logos",
    del: "/api/admin/project-logos",
    addBtnId: "project-logos-add-btn",
    addTitle: "Adaugă logo proiect",
    editTitle: "Editează logo proiect",
    resetToAdd: true,
    labelField: "name",
    getNewItem: (rows) => ({
      name: "",
      logo_url: "",
      alt_text: "",
      project_url: "",
      sort_order: (rows || []).reduce((max, row) => Math.max(max, Number(row.sort_order || 0)), 0) + 1,
      is_active: 1,
      display_scale: 100,
      background_mode: "soft",
      invert_on_dark: 0
    }),
    emptyText: "Nu ai adăugat încă logo-uri.",
    emptyBtn: "Adaugă primul logo",
    table: () =>
      `<table><thead><tr><th>Preview</th><th>Nume</th><th>URL proiect</th><th>Sort</th><th>Activ</th><th>Acțiuni</th></tr></thead><tbody></tbody></table>`,
    row: (it) => `
      <td><div class="logo-marquee-item admin-preview-logo-item">${logoPreviewBox(it)}</div></td>
      <td>${esc(it.name)}</td>
      <td>${it.project_url ? `<a href="${esc(it.project_url)}" target="_blank" rel="noopener noreferrer">${esc(it.project_url)}</a>` : "-"}</td>
      <td>${Number(it.sort_order || 0)}</td>
      <td>${badge(it.is_active ? "Active" : "Inactive", it.is_active ? "success" : "neutral")}</td>
    `,
    form: (it) => `
      <form class="grid grid-2">
        <details class="accordion" open><summary>Informații logo</summary><div class="accordion-body grid grid-2">
          <div class="field"><label>Nume proiect / brand</label><input name="name" value="${esc(it.name || "")}" required /><small class="field-error" data-error-for="name"></small></div>
          <div class="field"><label>Alt text</label><input name="alt_text" value="${esc(it.alt_text || "")}" /></div>
          <div class="field" style="grid-column:1/-1;">
            ${imagePickerMarkup("logo_url", "Logo URL", ".png,.jpg,.jpeg,.webp,.svg", "Poți lipi un URL sau poți încărca un logo. Recomandat: PNG/SVG cu fundal transparent.")}
          </div>
          <div class="field"><label>URL proiect</label><input name="project_url" value="${esc(it.project_url || "")}" placeholder="https://..." /><small class="field-error" data-error-for="project_url"></small></div>
          <div class="field"><label>Sort order</label><input type="number" name="sort_order" value="${Number(it.sort_order || 0)}" /></div>
          <div class="row" style="align-items:center;margin-top:1.8rem;"><label class="check-inline"><input type="checkbox" name="is_active" value="1" ${it.is_active === false || it.is_active === 0 ? "" : "checked"} /> Active</label></div>
        </div></details>
        <details class="accordion" open><summary>Afișare în carusel</summary><div class="accordion-body grid grid-2">
          <div class="field" style="grid-column:1/-1;">
            <label>Mărime logo</label>
            <div class="inline-range">
              <input type="range" name="display_scale" min="${SCALE_MIN}" max="${SCALE_MAX}" step="5" value="${clampScale(it.display_scale || 100)}" />
              <strong class="range-value" data-logo-scale-value>${clampScale(it.display_scale || 100)}%</strong>
            </div>
            <small class="hint">80% pentru logo-uri foarte mari, 100% standard, 130-160% pentru logo-uri mici sau cu spațiu gol.</small>
            <small class="field-error" data-error-for="display_scale"></small>
          </div>
          <div class="field">
            <label>Fundal logo</label>
            <select name="background_mode">
              <option value="soft" ${safeBg(it.background_mode) === "soft" ? "selected" : ""}>Soft glass</option>
              <option value="light" ${safeBg(it.background_mode) === "light" ? "selected" : ""}>Light</option>
              <option value="dark" ${safeBg(it.background_mode) === "dark" ? "selected" : ""}>Dark</option>
              <option value="none" ${safeBg(it.background_mode) === "none" ? "selected" : ""}>None</option>
            </select>
            <small class="field-error" data-error-for="background_mode"></small>
          </div>
          <div class="row" style="align-items:center;margin-top:1.8rem;"><label class="check-inline"><input type="checkbox" name="invert_on_dark" value="1" ${it.invert_on_dark ? "checked" : ""} /> Inversează culorile pentru fundal închis</label></div>
          <div class="field full" style="grid-column:1/-1;">
            <small class="hint">Folosește asta doar dacă logo-ul este prea închis și nu se vede pe fundal dark.</small>
          </div>
        </div></details>
        <div class="admin-logo-preview-panel" data-logo-preview-panel>
          <p>Preview în carusel</p>
          <div data-logo-preview-content></div>
        </div>
      </form>
    `,
    onModalReady: ({ form }) => {
      const scaleInput = form.elements.namedItem("display_scale");
      const scaleValue = $("[data-logo-scale-value]", form);
      const previewWrap = $("[data-logo-preview-content]", form);
      const syncPreview = () => {
        const payload = formObject(form);
        const scale = clampScale(payload.display_scale || 100);
        if (scaleValue) scaleValue.textContent = `${scale}%`;
        if (!String(payload.logo_url || "").trim()) {
          previewWrap.innerHTML = `<p class="muted" style="margin:0;">Încarcă un logo ca să vezi preview-ul.</p>`;
          return;
        }
        const model = {
          name: payload.name,
          logo_url: payload.logo_url,
          alt_text: payload.alt_text,
          display_scale: scale,
          background_mode: payload.background_mode,
          invert_on_dark: payload.invert_on_dark
        };
        previewWrap.innerHTML = `<div class="logo-marquee-item admin-preview-logo-item">${logoPreviewBox(model)}</div>`;
      };
      form.addEventListener("input", syncPreview);
      form.addEventListener("change", syncPreview);
      syncPreview();
    },
    validate: (p) => {
      const e = {};
      if (!String(p.name || "").trim()) e.name = "Numele este obligatoriu.";
      if (!String(p.logo_url || "").trim()) e.logo_url = "Logo URL este obligatoriu.";
      if (!validUrl(p.logo_url)) e.logo_url = "URL logo invalid.";
      if (!validHttpUrl(p.project_url)) e.project_url = "URL proiect invalid. Folosește http:// sau https://.";
      const scale = Number(p.display_scale);
      if (!Number.isFinite(scale) || scale < SCALE_MIN || scale > SCALE_MAX) e.display_scale = "Mărimea trebuie să fie între 60 și 180.";
      if (!BG_MODES.includes(String(p.background_mode || "").toLowerCase())) e.background_mode = "Fundal invalid.";
      return e;
    }
  });
}

async function initBackup() {
  const downloadBtn = $("#download-backup-btn");
  const importForm = $("#backup-import-form");
  const importFile = $("#backup-file");
  if (!downloadBtn || !importForm || !importFile) return;
  downloadBtn.addEventListener("click", async () => {
    try {
      const data = await api("/api/admin/backup/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mariusboiti-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Backup exportat.");
    } catch (e) {
      toast(e.message, "error");
    }
  });
  importForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = importFile.files?.[0];
    if (!file) {
      toast("Selectează un fișier backup JSON.", "error");
      return;
    }
    const ok = await confirmModal("Confirm import", "Importul va înlocui conținutul curent. Continui?", "Import");
    if (!ok) return;
    try {
      const payload = JSON.parse(await file.text());
      await api("/api/admin/backup/import", { method: "POST", body: JSON.stringify(payload) });
      toast("Backup importat cu succes.");
    } catch (e) {
      toast(e.message || "Import eșuat.", "error");
    }
  });
}

async function initCurrentPage() {
  if (pageKey() === "login") {
    await initLogin();
    return;
  }
  const admin = await authGuard();
  if (!admin) return;
  renderShell(admin);
  try {
    if (pageKey() === "dashboard") await initDashboard();
    if (pageKey() === "settings") await initSettings();
    if (pageKey() === "homepage") await initHomepage();
    if (pageKey() === "services") await initServices();
    if (pageKey() === "portfolio") await initPortfolio();
    if (pageKey() === "packages") await initPackages();
    if (pageKey() === "faq") await initFaq();
    if (pageKey() === "calculator") await initCalculator();
    if (pageKey() === "leads") await initLeads();
    if (pageKey() === "seo") await initSeo();
    if (pageKey() === "media") await initMedia();
    if (pageKey() === "project-logos") await initProjectLogos();
    if (pageKey() === "backup") await initBackup();
    if (pageKey() === "blog" && typeof window.initBlogPage === "function") await window.initBlogPage();
    if (pageKey() === "blog-categories" && typeof window.initBlogCategoriesPage === "function") await window.initBlogCategoriesPage();
    if (pageKey() === "ai-settings" && typeof window.initAiSettingsPage === "function") await window.initAiSettingsPage();
  } catch (e) {
    toast(e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", initCurrentPage);

