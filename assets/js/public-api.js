(function () {
  const page = document.body.dataset.publicPage || "";
  const API_BASE_CANDIDATES = [window.location.origin, "http://127.0.0.1:3011"];
  let ACTIVE_API_BASE = window.__MB_API_BASE || window.location.origin;

  function emitTrackingEvent(eventName, payload = {}) {
    const detail = { event: eventName, payload, timestamp: Date.now() };
    window.dispatchEvent(new CustomEvent("mb:tracking", { detail }));

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...payload });
    }

    if (!Array.isArray(window.__mbTrackingQueue)) {
      window.__mbTrackingQueue = [];
    }
    window.__mbTrackingQueue.push(detail);
  }

  async function fetchJson(url, options = {}) {
    const candidates = url.startsWith("/api/")
      ? [ACTIVE_API_BASE, ...API_BASE_CANDIDATES.filter((item) => item !== ACTIVE_API_BASE)]
      : [""];

    let lastError = null;

    for (const base of candidates) {
      const target = base ? `${base}${url}` : url;
      try {
        const response = await fetch(target, {
          credentials: "include",
          ...options
        });

        if (!response.ok) throw new Error("Request failed");
        const data = await response.json();

        if (base) {
          ACTIVE_API_BASE = base;
          window.__MB_API_BASE = base;
        }

        return data;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Request failed");
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && value) el.textContent = value;
  }

  function setLink(selector, text, href) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (text) {
      if (el.classList.contains("split-jelly-button")) {
        const label = el.querySelector(".split-jelly-label");
        if (label) {
          label.textContent = text;
        } else {
          el.textContent = text;
        }
      } else {
        el.textContent = text;
      }
    }
    if (href) el.setAttribute("href", href);
  }

  function setFavicon(faviconUrl) {
    if (!faviconUrl) return;
    const links = [
      { rel: "icon", type: "image/png" },
      { rel: "shortcut icon", type: "image/png" }
    ];
    links.forEach((cfg) => {
      let link = document.querySelector(`link[rel="${cfg.rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", cfg.rel);
        document.head.appendChild(link);
      }
      link.setAttribute("href", faviconUrl);
      link.setAttribute("type", cfg.type);
    });
  }

  function normalizeUrl(url) {
    if (!url) return "#";
    if (url.startsWith("http")) return url;
    if (url === "/") return "/";
    if (url.startsWith("/")) return url.replace(/\.html$/i, "");
    return `/${url.replace(/^\//, "").replace(/\.html$/i, "")}`;
  }

  function asList(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object") {
            return String(item.title || item.name || item.label || item.description || "").trim();
          }
          return "";
        })
        .filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
    return [];
  }

  function asBuiltItemsDetailed(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item, index) => {
        if (typeof item === "string") {
          const title = item.trim();
          return title ? { title, description: "", icon: "", sort_order: index + 1 } : null;
        }
        const title = String(item?.title || "").trim();
        const description = String(item?.description || "").trim();
        const icon = String(item?.icon || "").trim();
        const sortOrder = Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index + 1;
        if (!title && !description) return null;
        return { title, description, icon, sort_order: sortOrder };
      })
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  function asResultItemsDetailed(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item, index) => {
        if (typeof item === "string") {
          const title = item.trim();
          return title ? { title, description: "", metric: "", label: "", sort_order: index + 1 } : null;
        }
        const title = String(item?.title || "").trim();
        const description = String(item?.description || "").trim();
        const metric = String(item?.metric || "").trim();
        const label = String(item?.label || "").trim();
        const sortOrder = Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index + 1;
        if (!title && !description && !metric && !label) return null;
        return { title, description, metric, label, sort_order: sortOrder };
      })
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  function asGalleryItems(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item, index) => {
        if (typeof item === "string") {
          const image_url = item.trim();
          return image_url ? { image_url, caption: "", alt_text: "", sort_order: index + 1 } : null;
        }
        const image_url = String(item?.image_url || "").trim();
        const caption = String(item?.caption || "").trim();
        const alt_text = String(item?.alt_text || "").trim();
        const sortOrder = Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index + 1;
        if (!image_url) return null;
        return { image_url, caption, alt_text, sort_order: sortOrder };
      })
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  function detectVideoMimeType(url) {
    const lower = String(url || "").toLowerCase();
    if (lower.endsWith(".webm")) return "video/webm";
    if (lower.endsWith(".mov")) return "video/quicktime";
    return "video/mp4";
  }

  function applyHeroVideoConfig(heroSection) {
    const shell = document.getElementById("hero-video-shell");
    const video = document.getElementById("hero-video");
    const source = document.getElementById("hero-video-source");
    const placeholder = document.getElementById("hero-video-placeholder");
    if (!shell || !video || !source || !placeholder) return;

    const extra = heroSection?.extra_json && typeof heroSection.extra_json === "object" ? heroSection.extra_json : {};
    const videoUrl = String(extra.hero_video_url || "").trim();
    const posterUrl = String(extra.hero_video_poster_url || heroSection?.image_url || "").trim();

    if (posterUrl) {
      video.setAttribute("poster", posterUrl);
    } else {
      video.removeAttribute("poster");
    }

    if (!videoUrl) {
      source.setAttribute("src", "");
      video.removeAttribute("src");
      video.hidden = true;
      shell.classList.remove("has-video");
      placeholder.hidden = false;
      return;
    }

    source.setAttribute("src", videoUrl);
    source.setAttribute("type", detectVideoMimeType(videoUrl));
    video.hidden = false;
    shell.classList.add("has-video");
    placeholder.hidden = true;
    video.load();
  }

  function renderProjectCard(item, options = {}) {
    const isDetailed = options.mode === "detailed";
    const revealAttr = options.reveal ? ' data-reveal' : "";
    const projectType = item.project_type || "Proiect digital";
    const objective = item.objective || item.initial_problem || "";
    const results = item.results || item.results_text || "";
    const description = item.short_description || "";
    const builtItems = asList(item.built_items_json).slice(0, 4);
    const technologies = asList(item.technologies_json).slice(0, 3);
    const summaryItems = [...builtItems.slice(0, 2), ...technologies].slice(0, 4);
    const summaryMarkup = summaryItems.length
      ? `<ul class="showcase-points">${summaryItems.map((entry) => `<li>${entry}</li>`).join("")}</ul>`
      : "";
    const chips = [projectType, ...technologies].slice(0, 4);
    const chipsMarkup = chips.map((entry) => `<span class="showcase-chip">${entry}</span>`).join("");
    const imagePreview = item.image_url
      ? `<div class="showcase-thumb"><img src="${escHtml(item.image_url)}" alt="${escHtml(item.image_alt || item.title || "Preview proiect")}" loading="lazy" /></div>`
      : `<div class="showcase-thumb showcase-thumb-placeholder">Preview proiect</div>`;
    const detailsMarkup = isDetailed
      ? `<div class="showcase-detail-lines">
          <p><strong>Obiectiv:</strong> ${objective || "-"}</p>
          <p><strong>Rezultat / focus:</strong> ${results || "-"}</p>
        </div>`
      : "";
    const detailSlug = String(item.slug || "").trim();
    const ctaHref = isDetailed && detailSlug ? `/portofoliu/${encodeURIComponent(detailSlug)}` : "/portofoliu";
    const liveUrl = String(item.live_url || item.project_url || "").trim();
    const hasLiveUrl = isHttpUrl(liveUrl);
    const liveCta = hasLiveUrl
      ? `<a class="btn btn-secondary" href="${escHtml(liveUrl)}" target="_blank" rel="noopener noreferrer">Vezi site live</a>`
      : "";
    const ctaTracking = "";

    return `<article class="card showcase-card${isDetailed ? " showcase-card-detail" : ""}"${revealAttr}>
      <div class="showcase-media">
        <div class="showcase-noise" aria-hidden="true"></div>
        <div class="showcase-glow" aria-hidden="true"></div>
        ${isDetailed ? imagePreview : ""}
        <span class="showcase-kicker">${projectType}</span>
        <h3>${item.title}</h3>
        <p>${description || "Concept vizual și structură orientată spre claritate și conversie."}</p>
      </div>
      <div class="showcase-body">
        <div class="showcase-chip-row">${chipsMarkup}</div>
        ${summaryMarkup}
        ${detailsMarkup}
        <div class="btn-row">
          <a class="package-action-button showcase-link" href="${ctaHref}"${ctaTracking}><span>${isDetailed ? "Vezi detalii" : "Vezi proiectul"}</span></a>
          ${liveCta}
        </div>
      </div>
    </article>`;
  }

  function initFaqButtons(root) {
    const items = root.querySelectorAll(".faq-item");
    items.forEach((item) => {
      const button = item.querySelector("button");
      if (!button) return;
      button.addEventListener("click", () => {
        const open = item.classList.contains("open");
        items.forEach((other) => {
          other.classList.remove("open");
          const symbol = other.querySelector("button span:last-child");
          if (symbol) symbol.textContent = "+";
        });
        if (!open) {
          item.classList.add("open");
          const symbol = button.querySelector("span:last-child");
          if (symbol) symbol.textContent = "−";
        }
      });
    });
  }

  function bindCalculatorCtaTracking(root = document) {
    root.querySelectorAll("[data-calculator-cta]").forEach((link) => {
      if (link.dataset.tracked === "1") return;
      link.dataset.tracked = "1";
      link.addEventListener("click", () => {
        emitTrackingEvent("calculator_cta_clicked", {
          label: link.textContent?.trim() || "calculator_cta",
          href: link.getAttribute("href") || ""
        });
      });
    });
  }

  function isHttpUrl(value) {
    if (!value) return false;
    try {
      const u = new URL(String(value).trim(), window.location.origin);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (_error) {
      return false;
    }
  }

  function renderLogoMarquee(logos) {
    const section = document.getElementById("logo-marquee-section");
    const track = document.getElementById("logo-marquee-track");
    if (!section || !track) return;

    const safeLogos = Array.isArray(logos)
      ? logos
          .filter((item) => item && item.logo_url)
          .map((item) => ({
            name: String(item.name || "Proiect"),
            logo_url: String(item.logo_url || "").trim(),
            alt_text: String(item.alt_text || "").trim(),
            project_url: String(item.project_url || "").trim(),
            display_scale: Math.min(180, Math.max(60, Number(item.display_scale || 100))),
            background_mode: ["soft", "light", "dark", "none"].includes(String(item.background_mode || "").toLowerCase())
              ? String(item.background_mode).toLowerCase()
              : "soft",
            invert_on_dark: Boolean(item.invert_on_dark)
          }))
      : [];

    if (!safeLogos.length) {
      section.hidden = true;
      track.innerHTML = "";
      return;
    }

    let repeated = [...safeLogos, ...safeLogos];
    if (safeLogos.length === 1) repeated = Array.from({ length: 10 }, () => safeLogos[0]);
    if (safeLogos.length === 2) repeated = Array.from({ length: 6 }, (_x, i) => safeLogos[i % 2]);
    track.innerHTML = repeated
      .map((item, idx) => {
        const alt = item.alt_text || item.name;
        const scale = (item.display_scale / 100).toFixed(2);
        const invertClass = item.invert_on_dark ? " logo-invert-on-dark" : "";
        const image = `<span class="logo-marquee-logo-box logo-bg-${item.background_mode}" style="--logo-scale:${scale};"><img src="${item.logo_url}" alt="${alt}" draggable="false" loading="${idx < safeLogos.length ? "eager" : "lazy"}" class="${invertClass.trim()}" onerror="this.closest('.logo-marquee-item')?.classList.add('is-broken'); this.remove();" /></span>`;
        if (isHttpUrl(item.project_url)) {
          return `<a class="logo-marquee-item" href="${item.project_url}" target="_blank" rel="noopener noreferrer" aria-label="${alt}">${image}</a>`;
        }
        return `<div class="logo-marquee-item" aria-label="${alt}">${image}</div>`;
      })
      .join("");
    section.hidden = false;
  }

  function activateReveal(root = document) {
    root.querySelectorAll("[data-reveal]").forEach((el) => {
      el.classList.add("visible");
    });
  }

  async function applySeo() {
    const pageMap = {
      index: "index",
      servicii: "servicii",
      portofoliu: "portofoliu",
      despre: "despre",
      contact: "contact",
      proces: "proces",
      "calculator-pret": "calculator-pret",
      blog: "blog",
      "blog-articol": "blog-articol"
    };

    const pageKey = pageMap[page];
    if (!pageKey) return;

    try {
      const seo = await fetchJson(`/api/public/seo/${pageKey}`);
      if (seo.meta_title) document.title = seo.meta_title;

      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && seo.meta_description) {
        metaDescription.setAttribute("content", seo.meta_description);
      }

      const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      if (seo.canonical_url) canonical.setAttribute("href", seo.canonical_url);
      if (!canonical.parentNode) document.head.appendChild(canonical);
    } catch (_error) {
      // fallback to static SEO in html
    }
  }

  function injectGA4(measurementId) {
    if (!measurementId || typeof document === "undefined") return;
    if (document.querySelector('script[src*="googletagmanager.com/gtag"]')) return;
    const s = document.createElement("script");
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    s.async = true;
    document.head.appendChild(s);
    const i = document.createElement("script");
    i.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');`;
    document.head.appendChild(i);
  }

  async function applySettings() {
    try {
      const settings = await fetchJson("/api/public/settings");

      if (settings.ga_measurement_id) {
        injectGA4(settings.ga_measurement_id);
      }

      const brandName = settings.logo_text || settings.site_name;
      if (brandName) {
        document.querySelectorAll(".brand").forEach((brand) => {
          if (settings.logo_image) {
            brand.classList.add("has-logo");
            brand.textContent = "";
            const img = document.createElement("img");
            img.src = settings.logo_image;
            img.alt = brandName;
            img.className = "brand-logo";
            brand.appendChild(img);
          } else if (brand.querySelector(".brand-logo")) {
            // static SVG logo already in place — keep it
          } else if (brand.querySelector("strong")) {
            brand.innerHTML = `<strong>${brandName.split(" ")[0] || "Marius"}</strong> ${brandName.split(" ").slice(1).join(" ") || "Boiti Studio"}`;
          } else {
            brand.textContent = brandName;
          }
        });
      }

      if (settings.favicon) {
        setFavicon(settings.favicon);
      }

      if (settings.whatsapp) {
        document.querySelectorAll('a[href*="wa.me/"]').forEach((link) => {
          link.href = `https://wa.me/${String(settings.whatsapp).replace(/[^\d]/g, "")}`;
        });
      }

      if (typeof window.setFooterSocialLinks === "function") {
        window.setFooterSocialLinks(settings);
      }
    } catch (_error) {
      if (typeof window.setFooterSocialLinks === "function") {
        window.setFooterSocialLinks({});
      }
      // fallback to static header/footer
    }
  }

  async function applyHomepageData() {
    if (page !== "index") return;

    try {
      const [sections, services, portfolio, packagesData, faq] = await Promise.all([
        fetchJson("/api/public/homepage"),
        fetchJson("/api/public/services"),
        fetchJson("/api/public/portfolio"),
        fetchJson("/api/public/packages"),
        fetchJson("/api/public/faq")
      ]);

      try {
        const logos = await fetchJson("/api/public/project-logos");
        renderLogoMarquee(logos);
      } catch (_error) {
        renderLogoMarquee([]);
      }

      const byKey = Object.fromEntries(sections.map((item) => [item.section_key, item]));
      const hero = byKey.hero;
      if (hero) {
        applyHeroVideoConfig(hero);
      }

      const servicesGrid = document.getElementById("homepage-services-grid");
      if (servicesGrid && Array.isArray(services) && services.length) {
        servicesGrid.innerHTML = services
          .map((item) => {
            const chips = asList(item.includes_json).map((v) => `<span class="service-chip">${v}</span>`).join("");
            return `<article class="card service-preview-card" data-reveal>
              <div class="service-preview-top">
                <span class="service-preview-type">${item.title}</span>
                <p>${item.short_description || ""}</p>
              </div>
              <div class="service-chip-row">${chips}</div>
              <a class="service-preview-cta" href="/calculator-pret?calc_site=${encodeURIComponent(item.slug)}" data-calculator-cta>Calculează prețul <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M9 7H17V15"/></svg></a>
            </article>`;
          })
          .join("");
        activateReveal(servicesGrid);
      }

      const portfolioGrid = document.getElementById("homepage-portfolio-grid");
      if (portfolioGrid && Array.isArray(portfolio) && portfolio.length) {
        portfolioGrid.classList.add("showcase-grid");
        portfolioGrid.innerHTML = portfolio
          .slice(0, 4)
          .map((item) => renderProjectCard(item, { reveal: true }))
          .join("");
        activateReveal(portfolioGrid);
      }

      const packagesGrid = document.getElementById("homepage-packages-grid");
      if (packagesGrid && Array.isArray(packagesData) && packagesData.length) {
        const normalized = packagesData.slice(0, 3);
        packagesGrid.innerHTML = normalized
          .map((item) => {
            const features = asList(item.features_json).slice(0, 5).map((v) => `<li>${v}</li>`).join("");
            return `<article class="card neon-card" data-reveal>
              <h3>${item.name}</h3>
              <p>${item.short_description || "Pachet orientativ pentru proiecte web."}</p>
              <ul>${features}</ul>
              <a class="package-action-button" href="/calculator-pret?calc_site=${encodeURIComponent(item.slug || "")}" data-calculator-cta><span>Calculează prețul</span></a>
            </article>`;
          })
          .join("");
        activateReveal(packagesGrid);
      }

      const faqList = document.getElementById("homepage-faq-list");
      if (faqList && Array.isArray(faq) && faq.length) {
        faqList.innerHTML = faq
          .map((item) => `<article class="faq-item">
              <button type="button"><span>${item.question}</span><span>+</span></button>
              <div class="faq-answer"><p>${item.answer}</p></div>
            </article>`)
          .join("");
        initFaqButtons(faqList);
      }

      // Reviews section
      try {
        const reviews = await fetchJson("/api/public/reviews");
        renderReviews(reviews);
      } catch (_error) {
        // keep section hidden
      }

      bindCalculatorCtaTracking(document);
      activateReveal(document);
    } catch (_error) {
      // keep static content
    }
  }

  function renderReviews(reviews) {
    const section = document.getElementById("google-reviews-section");
    const grid = document.getElementById("reviews-grid");
    if (!section || !grid) return;
    if (!Array.isArray(reviews) || !reviews.length) return;

    const activeReviews = reviews.filter((r) => r.is_active);
    if (!activeReviews.length) return;

    const googleSvg = `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;

    function stars(rating) {
      const n = Math.min(5, Math.max(0, rating || 5));
      return Array.from({ length: 5 }, (_, i) => `<span class="review-star" aria-hidden="true">${i < n ? "★" : "☆"}</span>`).join("");
    }

    function avatarInitial(name) {
      return (String(name || "?")[0] || "?").toUpperCase();
    }

    grid.innerHTML = activeReviews.map((r) => {
      const badgeEl = r.reviewer_url
        ? `<a class="review-google-badge" href="${r.reviewer_url}" target="_blank" rel="noopener noreferrer" aria-label="Recenzie pe Google">${googleSvg}<span class="review-google-text">Recenzie pe Google</span></a>`
        : `<div class="review-google-badge">${googleSvg}<span class="review-google-text">Recenzie pe Google</span></div>`;
      return `<article class="review-card">
        <div class="review-card-head">
          <div class="review-avatar" aria-hidden="true">${avatarInitial(r.reviewer_name)}</div>
          <div class="review-meta">
            <p class="review-name">${r.reviewer_name}</p>
            <div class="review-stars" aria-label="${r.rating || 5} stele din 5">${stars(r.rating)}</div>
          </div>
        </div>
        ${r.review_text ? `<p class="review-text">${r.review_text}</p>` : ""}
        ${badgeEl}
      </article>`;
    }).join("");

    // Update summary badge
    const avgRating = (activeReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / activeReviews.length).toFixed(1);
    const summaryEl = document.getElementById("reviews-summary-text");
    if (summaryEl) {
      summaryEl.textContent = `${avgRating} ★ · ${activeReviews.length} ${activeReviews.length === 1 ? "recenzie Google" : "recenzii Google"}`;
    }

    section.hidden = false;
    activateReveal(section);
  }

  async function applyServicesPage() {
    if (page !== "servicii") return;
    const grid = document.getElementById("services-page-grid");
    if (!grid) return;

    try {
      const services = await fetchJson("/api/public/services");
      if (!Array.isArray(services) || !services.length) return;

      grid.innerHTML = services
        .map((item) => {
          const includeList = (item.includes_json || []).map((v) => `<li>${v}</li>`).join("");
          return `<article class="card service-card" id="${item.slug}">
            <h3 class="service-title service-title-reveal" data-text="${item.title}">
              <span class="service-title-base">${item.title}</span>
              <span class="service-title-hover" aria-hidden="true">${item.title}</span>
            </h3>
            <p>${item.short_description || ""}</p>
            <h4>Pentru cine este potrivit</h4>
            <p>${item.suitable_for || "-"}</p>
            <h4>Ce include</h4>
            <ul>${includeList}</ul>
            <a class="split-jelly-button split-jelly-button--small" href="/calculator-pret?calc_site=${encodeURIComponent(item.slug)}" data-calculator-cta><span class="split-jelly-label">Calculează prețul</span><span class="split-jelly-bridge" aria-hidden="true"></span><span class="split-jelly-circle" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7H17V15"></path></svg></span></a>
          </article>`;
        })
        .join("");

      bindCalculatorCtaTracking(grid);
    } catch (_error) {
      // static fallback
    }
  }

  async function applyPortfolioPage() {
    if (page !== "portofoliu") return;
    const grid = document.getElementById("portfolio-page-grid");
    if (!grid) return;

    try {
      const projects = await fetchJson("/api/public/portfolio");
      if (!Array.isArray(projects) || !projects.length) return;

      grid.innerHTML = projects
        .map((item) => renderProjectCard(item, { mode: "detailed", reveal: true }))
        .join("");

      activateReveal(grid);
    } catch (_error) {
      // static fallback
    }
  }

  function createChipList(items, emptyLabel) {
    if (!Array.isArray(items) || !items.length) return `<span class="showcase-chip">${escHtml(emptyLabel)}</span>`;
    return items.map((item) => `<span class="showcase-chip">${escHtml(item)}</span>`).join("");
  }

  function getFallbackPortfolioProject(slug) {
    const map = {
      laserfilespro: {
        title: "LaserFilesPro",
        slug: "laserfilespro",
        project_type: "Landing page software",
        short_description:
          "Landing page pentru o aplicație desktop dedicată creatorilor de fișiere laser-ready.",
        objective:
          "Trial și validare produs pentru creatori și mici afaceri care lucrează cu laser cutting.",
        built_items_json: [
          "Structură landing page orientată pe conversie",
          "Secțiune beneficii și diferențiatori",
          "CTA-uri clare pentru activare trial",
          "Arhitectură simplă pentru trafic ads/social",
          "Optimizare responsive"
        ],
        results:
          "Claritate mai bună a ofertei și traseu simplu spre activare trial.",
        technologies_json: ["HTML", "CSS", "JavaScript"],
        image_url: "",
        project_url: ""
      },
      biobuddy: {
        title: "BioBuddy",
        slug: "biobuddy",
        project_type: "Site de conținut + monetizare",
        short_description:
          "Site de conținut și monetizare în nișa health & wellness, cu identitate vizuală bazată pe mascotă AI.",
        objective:
          "Creștere audiență și captare lead-uri pentru conținut evergreen cu potențial de afiliere.",
        built_items_json: [
          "Structură pentru conținut evergreen",
          "Lead magnets pentru list building",
          "Pagini clare pentru categorii și teme",
          "Bază SEO on-page",
          "Optimizare pentru citire pe mobil"
        ],
        results:
          "Bază clară pentru trafic organic și monetizare graduală prin conținut.",
        technologies_json: ["HTML", "CSS", "JavaScript"],
        image_url: "",
        project_url: ""
      },
      lunarsoulmap: {
        title: "LunarSoulMap",
        slug: "lunarsoulmap",
        project_type: "Landing page affiliate",
        short_description:
          "Landing page de promovare pentru ofertă affiliate, construită pentru conversie și trafic social.",
        objective:
          "Conversie din trafic social către ofertă digitală, cu un flux simplu și clar.",
        built_items_json: [
          "Structură de ofertă în pași simpli",
          "Copy orientat pe claritate și acțiune",
          "CTA-uri repetitive în puncte-cheie",
          "Secțiune FAQ pentru obiecții",
          "Layout responsive"
        ],
        results:
          "Flux mai coerent pentru click și acțiune rapidă din trafic social.",
        technologies_json: ["HTML", "CSS", "JavaScript"],
        image_url: "",
        project_url: ""
      },
      "mantra-decor": {
        title: "Mantra Decor",
        slug: "mantra-decor",
        project_type: "Concept eCommerce",
        short_description:
          "Concept eCommerce pentru produse personalizate, decoruri din lemn, mandale și cadouri handmade.",
        objective:
          "Prezentare clară a categoriilor și susținerea vânzărilor online cu experiență simplă.",
        built_items_json: [
          "Structură categorii produse",
          "Ierarhie pagini produs",
          "Direcție checkout simplificată",
          "Zone de încredere și dovezi sociale",
          "SEO de bază pentru produse"
        ],
        results:
          "Experiență mobilă mai curată și structură potrivită pentru catalog de produse fizice.",
        technologies_json: ["HTML", "CSS", "JavaScript"],
        image_url: "",
        project_url: ""
      },
      moveonsocial: {
        title: "MoveOnSocial",
        slug: "moveonsocial",
        project_type: "Site servicii social media",
        short_description:
          "Site de prezentare pentru servicii social media, cu focus pe claritatea ofertei și lead-uri calificate.",
        objective:
          "Comunicare mai clară a pachetelor și traseu simplu către cerere de colaborare.",
        built_items_json: [
          "Structură servicii și pachete",
          "Mesaje orientate pe rezultate",
          "Lead form simplificat",
          "Secțiuni de încredere",
          "Layout responsive"
        ],
        results:
          "Flux mai direct de la vizitator la cerere, cu poziționare mai clară a serviciilor.",
        technologies_json: ["HTML", "CSS", "JavaScript"],
        image_url: "",
        project_url: ""
      }
    };
    return map[String(slug || "").toLowerCase()] || null;
  }

  async function applyPortfolioProjectPage() {
    if (page !== "portofoliu-proiect") return;

    const slug = window.location.pathname.split("/").filter(Boolean).slice(1).join("/") || "";
    const wrapper = document.getElementById("portfolio-project-page");
    if (!wrapper || !slug) return;

    const notFoundMarkup = `
      <section class="section section-tight">
        <div class="container">
          <article class="card project-detail-card">
            <h1 class="section-title">Proiectul nu a fost găsit.</h1>
            <p class="section-subtitle">Slug-ul cerut nu există sau proiectul nu este activ.</p>
            <div class="btn-row" style="margin-top:1rem;">
              <a class="split-jelly-button split-jelly-button--small" href="/portofoliu">
                <span class="split-jelly-label">Înapoi la portofoliu</span>
                <span class="split-jelly-bridge" aria-hidden="true"></span>
                <span class="split-jelly-circle" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7H17V15"></path></svg></span>
              </a>
            </div>
          </article>
        </div>
      </section>
    `;

    try {
      let project = null;
      try {
        const response = await fetchJson(`/api/public/portfolio/${encodeURIComponent(slug)}`);
        project = response?.success ? response.data : response;
      } catch (_error) {
        project = null;
      }

      if (!project || !project.slug) {
        project = getFallbackPortfolioProject(slug);
      }

      if (!project || !project.slug) {
        wrapper.innerHTML = notFoundMarkup;
        document.title = "Proiectul nu a fost găsit | Portofoliu";
        setMetaTag("robots", "noindex,follow");
        return;
      }

      const builtItemsSimple = asList(project.built_items_json);
      const builtItemsDetailed = asBuiltItemsDetailed(
        Array.isArray(project.built_items_detailed_json) && project.built_items_detailed_json.length
          ? project.built_items_detailed_json
          : project.built_items_json
      );
      const resultItemsDetailed = asResultItemsDetailed(project.results_items_json);
      const galleryItems = asGalleryItems(project.gallery_json);
      const technologies = asList(project.technologies_json);
      const projectSections = project.project_sections_json && typeof project.project_sections_json === "object" ? project.project_sections_json : {};
      const liveUrl = String(project.live_url || project.project_url || "").trim();
      const hasLiveUrl = isHttpUrl(liveUrl);
      const imageUrl = String(project.image_url || "").trim();
      const imageAlt = String(project.image_alt || project.title || "Preview proiect").trim();
      const shortDescription = String(project.short_description || "").trim();
      const objective = String(project.objective || "").trim();
      const longDescription = String(project.long_description || project.solution_text || "").trim();
      const results = String(project.results || "").trim();
      const category = String(project.project_type || "Proiect digital").trim();
      const clientName = String(project.client_name || "").trim();
      const initialProblem = String(project.initial_problem || "").trim();
      const targetAudience = String(project.target_audience || "").trim();
      const challengeTitle = String(project.challenge_title || "Context și obiectiv").trim();
      const challengeText = String(project.challenge_text || "").trim();
      const solutionTitle = String(project.solution_title || "Soluția implementată").trim();
      const resultsTitle = String(project.results_title || "Rezultat și focus").trim();
      const resultsText = String(project.results_text || "").trim();
      const ctaTitle = String(project.cta_title || "Ai nevoie de ceva asemănător?").trim();
      const ctaText = String(project.cta_text || "Poți începe cu o estimare orientativă și vedem dacă proiectul se potrivește.").trim();
      const ctaButtonText = String(project.cta_button_text || "Calculează prețul").trim();
      const ctaButtonUrl = String(project.cta_button_url || "/calculator-pret").trim();
      const heroTitle = String(project.hero_title || project.title || "Proiect").trim();
      const heroSubtitle = String(project.hero_subtitle || shortDescription || "Detalii despre proiect.").trim();
      const focusFallback = results || resultsText;
      const builtFeatures = builtItemsDetailed.length
        ? builtItemsDetailed.map((item) => item.title || item.description).filter(Boolean)
        : builtItemsSimple;
      const metaDescription = project.seo_description || shortDescription || longDescription || objective;
      const canonical = project.canonical_url || `${window.location.origin}/portofoliu/${project.slug}`;
      const ogImage = String(project.og_image || imageUrl || "").trim();

      const contextParagraphs = [
        clientName ? `<p><strong>Pentru cine:</strong> ${escHtml(clientName)}</p>` : "",
        initialProblem ? `<p><strong>Situație inițială:</strong> ${escHtml(initialProblem)}</p>` : "",
        objective ? `<p><strong>Obiectiv:</strong> ${escHtml(objective)}</p>` : "",
        targetAudience ? `<p><strong>Public țintă:</strong> ${escHtml(targetAudience)}</p>` : "",
        challengeText ? `<p>${escHtml(challengeText)}</p>` : ""
      ]
        .filter(Boolean)
        .join("");

      const objectiveSection = contextParagraphs
        ? `<section class="section section-tight">
            <div class="container">
              <article class="card project-detail-card">
                <h2 class="section-title">${escHtml(challengeTitle)}</h2>
                <div class="project-detail-copy">${contextParagraphs}</div>
              </article>
            </div>
          </section>`
        : "";

      const implementedSection = builtItemsDetailed.length
        ? `<section class="section section-tight">
            <div class="container">
              <article class="card project-detail-card">
                <h2 class="section-title">Ce am implementat</h2>
                <div class="project-detail-item-list">
                  ${builtItemsDetailed
                    .map(
                      (entry) => `<article class="project-detail-item">
                          <h3>${escHtml(entry.title || "Implementare")}</h3>
                          ${entry.description ? `<p>${escHtml(entry.description)}</p>` : ""}
                        </article>`
                    )
                    .join("")}
                </div>
              </article>
            </div>
          </section>`
        : "";

      const featuresSection = builtFeatures.length
        ? `<section class="section section-tight">
            <div class="container">
              <article class="card project-detail-card">
                <h2 class="section-title">Funcționalități și secțiuni</h2>
                <div class="showcase-chip-row project-detail-feature-grid">
                  ${createChipList(builtFeatures, "Structură personalizată")}
                </div>
              </article>
            </div>
          </section>`
        : "";

      const resultItemsSection = resultItemsDetailed.length
        ? `<section class="section section-tight">
            <div class="container">
              <article class="card project-detail-card">
                <h2 class="section-title">${escHtml(resultsTitle)}</h2>
                <div class="project-detail-item-list">
                  ${resultItemsDetailed
                    .map((entry) => {
                      const metric = [entry.label, entry.metric].filter(Boolean).join(": ");
                      return `<article class="project-detail-item">
                        <h3>${escHtml(entry.title || "Rezultat")}</h3>
                        ${entry.description ? `<p>${escHtml(entry.description)}</p>` : ""}
                        ${metric ? `<p class="project-detail-metric">${escHtml(metric)}</p>` : ""}
                      </article>`;
                    })
                    .join("")}
                </div>
              </article>
            </div>
          </section>`
        : "";

      const resultSection = focusFallback
        ? `<section class="section section-tight">
            <div class="container">
              <article class="card project-detail-card">
                <h2 class="section-title">${escHtml(resultsTitle)}</h2>
                <p class="section-subtitle">${escHtml(focusFallback)}</p>
              </article>
            </div>
          </section>`
        : "";

      const solutionSection = longDescription
        ? `<section class="section section-tight">
            <div class="container">
              <article class="card project-detail-card">
                <h2 class="section-title">${escHtml(solutionTitle)}</h2>
                <p class="section-subtitle">${escHtml(longDescription)}</p>
              </article>
            </div>
          </section>`
        : "";

      const techSection = technologies.length
        ? `<section class="section section-tight">
            <div class="container">
              <article class="card project-detail-card">
                <h2 class="section-title">Tehnologii folosite</h2>
                <div class="showcase-chip-row project-detail-tech-grid">
                  ${createChipList(technologies, "Stack custom")}
                </div>
              </article>
            </div>
          </section>`
        : "";

      const gallerySection = galleryItems.length
        ? `<section class="section section-tight">
            <div class="container">
              <article class="card project-detail-card">
                <h2 class="section-title">Galerie proiect</h2>
                <div class="project-detail-gallery">
                  ${galleryItems
                    .map(
                      (entry) => `<figure class="project-gallery-item">
                        <img src="${escHtml(entry.image_url)}" alt="${escHtml(entry.alt_text || project.title || "Imagine proiect")}" loading="lazy" />
                        ${entry.caption ? `<figcaption>${escHtml(entry.caption)}</figcaption>` : ""}
                      </figure>`
                    )
                    .join("")}
                </div>
              </article>
            </div>
          </section>`
        : "";

      wrapper.innerHTML = `
        <section class="hero section-tight project-detail-hero">
          <div class="container project-detail-grid">
            <div class="project-detail-content">
              <span class="kicker">${escHtml(category)}</span>
              <h1>${escHtml(heroTitle)}</h1>
              <p style="max-width:760px; color:#cbd5e1;">${escHtml(heroSubtitle || "Detalii despre acest proiect și implementarea realizată.")}</p>
              ${technologies.length ? `<div class="showcase-chip-row project-detail-tech-grid" style="margin-top:0.9rem;">${createChipList(technologies, "Stack custom")}</div>` : ""}
              <div class="btn-row project-detail-actions">
                ${hasLiveUrl ? `<a class="split-jelly-button split-jelly-button--small" href="${escHtml(liveUrl)}" target="_blank" rel="noopener noreferrer"><span class="split-jelly-label">Vezi site-ul live</span><span class="split-jelly-bridge" aria-hidden="true"></span><span class="split-jelly-circle" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7H17V15"></path></svg></span></a>` : ""}
                <a class="btn btn-secondary" href="/portofoliu">Înapoi la portofoliu</a>
              </div>
            </div>
            <div class="card project-detail-media">
              ${imageUrl ? `<img src="${escHtml(imageUrl)}" alt="${escHtml(imageAlt)}" loading="lazy" />` : `<div class="project-detail-placeholder">Preview proiect</div>`}
            </div>
          </div>
        </section>

        ${objectiveSection}
        ${implementedSection}
        ${featuresSection}
        ${solutionSection}
        ${resultItemsSection || resultSection}
        ${techSection}
        ${gallerySection}

        <section class="section section-tight">
          <div class="container">
            <div class="cta-strip" data-reveal>
              <h2 class="section-title">${escHtml(ctaTitle)}</h2>
              <p class="section-subtitle">${escHtml(ctaText)}</p>
              <div class="btn-row">
                <a class="split-jelly-button" href="${escHtml(ctaButtonUrl || "/calculator-pret")}" data-calculator-cta><span class="split-jelly-label">${escHtml(ctaButtonText || "Calculează prețul")}</span><span class="split-jelly-bridge" aria-hidden="true"></span><span class="split-jelly-circle" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7H17V15"></path></svg></span></a>
                <a class="btn btn-secondary" href="/portofoliu">Vezi toate proiectele</a>
              </div>
            </div>
          </div>
        </section>
      `;

      document.title = project.seo_title || `${project.title} | Portofoliu Marius Boiti Studio`;
      setMetaTag("description", metaDescription || "");
      setMetaTag("og:title", project.seo_title || project.title || "", true);
      setMetaTag("og:description", metaDescription || "", true);
      setMetaTag("og:type", "article", true);
      setMetaTag("twitter:card", "summary_large_image");
      if (ogImage) setMetaTag("og:image", ogImage, true);
      updateCanonical(canonical);
      if (project.robots) setMetaTag("robots", project.robots);

      upsertJsonLd("portfolio-project-breadcrumb", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Acasă", item: `${window.location.origin}/` },
          { "@type": "ListItem", position: 2, name: "Portofoliu", item: `${window.location.origin}/portofoliu` },
          { "@type": "ListItem", position: 3, name: project.title || "Proiect", item: `${window.location.origin}/portofoliu/${project.slug}` }
        ]
      });

      upsertJsonLd("portfolio-project-creativework", {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: project.title || "",
        description: metaDescription || "",
        url: `${window.location.origin}/portofoliu/${project.slug}`,
        image: ogImage || undefined,
        keywords: technologies.join(", ")
      });

      bindCalculatorCtaTracking(wrapper);
      activateReveal(wrapper);
    } catch (_error) {
      wrapper.innerHTML = notFoundMarkup;
      document.title = "Proiectul nu a fost găsit | Portofoliu";
      setMetaTag("robots", "noindex,follow");
    }
  }

  function escHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function readingTimeLabel(minutes) {
    const value = Math.max(1, Number(minutes || 1));
    return `${value} min`;
  }

  async function applyBlogPage() {
    if (page !== "blog") return;
    const grid = document.getElementById("blog-list-grid");
    const categoryFilter = document.getElementById("blog-category-filter");
    const form = document.getElementById("blog-filters-form");
    const pagination = document.getElementById("blog-pagination");
    if (!grid || !categoryFilter || !form || !pagination) return;

    let currentPage = 1;
    let currentLimit = 9;

    function renderCards(items) {
      if (!Array.isArray(items) || !items.length) {
        grid.innerHTML = `
          <article class="card blog-card">
            <div class="blog-card-media"></div>
            <div class="blog-card-body">
              <span class="blog-card-category">Blog</span>
              <h3>Nu există încă articole publicate.</h3>
              <p>Revino curând pentru ghiduri noi despre creare site-uri și SEO.</p>
            </div>
          </article>
        `;
        pagination.innerHTML = "";
        return;
      }

      grid.innerHTML = items
        .map((item) => {
          const image = item.featured_image
            ? `<img src="${escHtml(item.featured_image)}" alt="${escHtml(item.featured_image_alt || item.title || "Imagine articol")}" loading="lazy" />`
            : "";
          return `
            <article class="card blog-card" data-reveal>
              <div class="blog-card-media">${image}</div>
              <div class="blog-card-body">
                <span class="blog-card-category">${escHtml(item.category?.name || "Blog")}</span>
                <h3>${escHtml(item.title || "")}</h3>
                <p>${escHtml(item.excerpt || "")}</p>
                <div class="blog-card-meta">
                  <span>${readingTimeLabel(item.reading_time_minutes)}</span>
                  <span>${item.published_at ? escHtml(new Date(item.published_at).toLocaleDateString("ro-RO")) : ""}</span>
                </div>
                <a class="package-action-button" href="/blog/${encodeURIComponent(item.slug)}"><span>Citește articolul</span></a>
              </div>
            </article>
          `;
        })
        .join("");
      activateReveal(grid);
    }

    function renderPagination(meta) {
      if (!meta || Number(meta.totalPages || 1) <= 1) {
        pagination.innerHTML = "";
        return;
      }
      const totalPages = Number(meta.totalPages || 1);
      pagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
        const p = index + 1;
        const cls = p === Number(meta.page) ? "btn-primary-glow" : "btn-secondary-soft";
        return `<button class="${cls}" type="button" data-page="${p}">${p}</button>`;
      }).join("");
      pagination.querySelectorAll("[data-page]").forEach((button) => {
        button.addEventListener("click", async () => {
          currentPage = Number(button.dataset.page || 1);
          await loadPosts();
        });
      });
    }

    async function loadCategories() {
      try {
        const response = await fetchJson("/api/public/blog-categories");
        const categories = response?.success ? response.data : response;
        if (!Array.isArray(categories)) return;
        categoryFilter.innerHTML = `<option value="">Toate categoriile</option>${categories
          .map((item) => `<option value="${escHtml(item.slug)}">${escHtml(item.name)}</option>`)
          .join("")}`;
      } catch (_error) {
        // keep static fallback
      }
    }

    async function loadPosts() {
      try {
        const fd = new FormData(form);
        const params = new URLSearchParams();
        const search = String(fd.get("search") || "").trim();
        const category = String(fd.get("category") || "").trim();
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        params.set("page", String(currentPage));
        params.set("limit", String(currentLimit));
        const response = await fetchJson(`/api/public/blog?${params.toString()}`);
        const data = response?.success ? response.data : response;
        renderCards(data?.items || []);
        renderPagination(data?.pagination || null);
        bindCalculatorCtaTracking(document);
      } catch (_error) {
        // keep fallback cards
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      currentPage = 1;
      await loadPosts();
    });

    await loadCategories();
    await loadPosts();
  }

  function setMetaTag(name, value, isProperty = false) {
    if (!value) return;
    const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      if (isProperty) meta.setAttribute("property", name);
      else meta.setAttribute("name", name);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", value);
  }

  function updateCanonical(url) {
    if (!url) return;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
  }

  function upsertJsonLd(id, payload) {
    if (!id || !payload || typeof payload !== "object") return;
    let script = document.getElementById(id);
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(payload);
  }

  async function applyBlogPostPage() {
    if (page !== "blog-articol") return;
    const titleEl = document.getElementById("blog-post-title");
    const excerptEl = document.getElementById("blog-post-excerpt");
    const categoryEl = document.getElementById("blog-post-category");
    const dateEl = document.getElementById("blog-post-date");
    const readingEl = document.getElementById("blog-post-reading-time");
    const imageEl = document.getElementById("blog-post-image");
    const contentEl = document.getElementById("blog-post-content");
    const tagsEl = document.getElementById("blog-post-tags");
    const similarEl = document.getElementById("blog-similar-list");
    if (!titleEl || !contentEl) return;

    const slug = window.location.pathname.split("/").filter(Boolean).slice(1).join("/") || "";
    if (!slug) return;

    try {
      const response = await fetchJson(`/api/public/blog/${encodeURIComponent(slug)}`);
      const data = response?.success ? response.data : response;
      const post = data?.post;
      if (!post) return;

      titleEl.textContent = post.title || "";
      excerptEl.textContent = post.excerpt || "";
      categoryEl.textContent = post.category?.name || "Blog";
      dateEl.textContent = post.published_at ? new Date(post.published_at).toLocaleDateString("ro-RO") : "-";
      readingEl.textContent = readingTimeLabel(post.reading_time_minutes);
      contentEl.innerHTML = post.content || "<p>Articolul nu conține încă detalii.</p>";

      if (post.featured_image && imageEl) {
        imageEl.src = post.featured_image;
        imageEl.alt = post.featured_image_alt || post.title || "Imagine articol";
        imageEl.hidden = false;
      }

      if (tagsEl) {
        const tags = Array.isArray(post.tags_json) ? post.tags_json : [];
        tagsEl.innerHTML = tags.map((tag) => `<span>${escHtml(tag)}</span>`).join("");
      }

      if (similarEl) {
        const similar = Array.isArray(data?.similar) ? data.similar : [];
        similarEl.innerHTML = similar.length
          ? similar
              .map(
                (item) => `
            <article>
              <a href="/blog/${encodeURIComponent(item.slug)}">${escHtml(item.title)}</a>
              <p class="muted">${escHtml(item.excerpt || "")}</p>
            </article>`
              )
              .join("")
          : "<p class=\"muted\">Nu există articole similare momentan.</p>";
      }

      document.title = post.seo_title || post.title || document.title;
      setMetaTag("description", post.seo_description || post.excerpt || "");
      setMetaTag("og:title", post.og_title || post.seo_title || post.title || "", true);
      setMetaTag("og:description", post.og_description || post.seo_description || post.excerpt || "", true);
      setMetaTag("twitter:card", "summary_large_image");
      setMetaTag("og:image", post.og_image || post.featured_image || "", true);
      updateCanonical(post.canonical_url || `${window.location.origin}/blog/${post.slug}`);

      if (post.robots) {
        setMetaTag("robots", post.robots);
      }

      upsertJsonLd("blog-article-schema", {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title || "",
        description: post.seo_description || post.excerpt || "",
        datePublished: post.published_at || null,
        dateModified: post.updated_at || post.published_at || null,
        author: {
          "@type": "Person",
          name: "Marius Boiti"
        },
        publisher: {
          "@type": "Organization",
          name: "Marius Boiti Studio"
        },
        image: post.og_image || post.featured_image || "",
        mainEntityOfPage: post.canonical_url || `${window.location.origin}/blog/${post.slug}`
      });

      upsertJsonLd("blog-article-breadcrumb", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Acasă", item: `${window.location.origin}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${window.location.origin}/blog` },
          { "@type": "ListItem", position: 3, name: post.title || "Articol", item: post.canonical_url || `${window.location.origin}/blog/${post.slug}` }
        ]
      });
    } catch (_error) {
      // keep fallback content
    }
  }

  async function bindContactForms() {
    if (page !== "contact") return;

    const generalForm = document.getElementById("formular-contact-general-form");
    const generalMsg = document.getElementById("general-contact-message");
    const quoteForm = document.getElementById("formular-oferta-finala");
    const quoteMsg = document.getElementById("quote-contact-message");
    const quoteSection = document.getElementById("formular-oferta-final-section");
    const gateSection = document.getElementById("calculator-gate-section");

    let calculatorPayload = null;
    const rawStored = localStorage.getItem("mb_price_calculator_payload");
    if (rawStored) {
      try {
        calculatorPayload = JSON.parse(rawStored);
      } catch (_error) {
        calculatorPayload = null;
      }
    }

    if (quoteForm && quoteSection && gateSection) {
      if (calculatorPayload) {
        quoteSection.hidden = false;
        gateSection.hidden = true;
        emitTrackingEvent("final_quote_request_started", {
          source: "price_calculator",
          recommendedPackage: calculatorPayload.recommendedPackage || ""
        });

        const estimateField = document.getElementById("estimare-calculator");
        const typeField = document.getElementById("oferta-tip-proiect");
        const budgetField = document.getElementById("oferta-buget-maxim");

        if (estimateField) {
          const extras = Array.isArray(calculatorPayload.extras) ? calculatorPayload.extras.join(", ") : "-";
          estimateField.value = [
            `Salut, am completat calculatorul de preț și estimarea mea este ${calculatorPayload.estimate || "-"}.`,
            "",
            "Detalii:",
            `Tip site: ${calculatorPayload.siteType || "-"}`,
            `Număr pagini: ${calculatorPayload.pages || "-"}`,
            `Texte / conținut: ${calculatorPayload.content || "-"}`,
            `Funcționalități extra: ${extras}`,
            `Nivel design: ${calculatorPayload.design || "-"}`,
            `Termen livrare: ${calculatorPayload.deadline || "-"}`,
            `Interval estimativ: ${calculatorPayload.estimate || "-"}`,
            `Pachet recomandat: ${calculatorPayload.recommendedPackage || "-"}`,
            calculatorPayload.maxBudget ? `Buget maxim orientativ: ${calculatorPayload.maxBudget}` : null
          ]
            .filter(Boolean)
            .join("\n");
        }

        if (budgetField && calculatorPayload.maxBudget) {
          budgetField.value = calculatorPayload.maxBudget;
        }

        if (typeField && !typeField.value) {
          typeField.value = calculatorPayload.siteType || "";
        }

        quoteForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const fd = new FormData(quoteForm);
          const payload = Object.fromEntries(fd.entries());

          if (!payload.nume || !payload.email || !payload.mesaj) {
            if (quoteMsg) {
              quoteMsg.style.color = "#fca5a5";
              quoteMsg.textContent = "Completează nume, email și mesaj.";
            }
            return;
          }

          if (!payload.confirm_estimare) {
            if (quoteMsg) {
              quoteMsg.style.color = "#fca5a5";
              quoteMsg.textContent = "Confirmă estimarea înainte de trimitere.";
            }
            return;
          }

          const estimatedMin = Number.isFinite(Number(calculatorPayload?.estimatedMin))
            ? Number(calculatorPayload.estimatedMin)
            : (Number.isFinite(Number(calculatorPayload?.total)) ? Number(calculatorPayload.total) : null);
          const estimatedMax = Number.isFinite(Number(calculatorPayload?.estimatedMax))
            ? Number(calculatorPayload.estimatedMax)
            : (estimatedMin !== null ? Math.round(estimatedMin * 1.2) : null);

          const leadPayload = {
            name: payload.nume,
            email: payload.email,
            phone: payload.telefon || "",
            project_type: payload.tip_proiect || "",
            budget_range: payload.buget_maxim || "",
            timeline: "",
            message: payload.mesaj,
            calculator_summary_json: {
              ...(calculatorPayload || {}),
              maxBudget: payload.buget_maxim || calculatorPayload?.maxBudget || ""
            },
            estimated_min: estimatedMin,
            estimated_max: estimatedMax,
            recommended_package: calculatorPayload?.recommendedPackage || "",
            source: "price_calculator",
            budget_confirmed: Boolean(payload.confirm_estimare)
          };

          try {
            await fetchJson("/api/public/leads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(leadPayload)
            });
          } catch (_error) {
            if (quoteMsg) {
              quoteMsg.style.color = "#fca5a5";
              quoteMsg.textContent = "Nu am putut trimite cererea acum. Te rog încearcă din nou.";
            }
            return;
          }

          emitTrackingEvent("final_quote_request_submitted", {
            source: "price_calculator",
            recommendedPackage: calculatorPayload?.recommendedPackage || ""
          });

          quoteForm.reset();
          if (quoteMsg) {
            quoteMsg.style.color = "#86efac";
            quoteMsg.textContent = "Cererea pentru oferta finală a fost trimisă cu succes.";
          }
        });
      } else {
        quoteSection.hidden = true;
        gateSection.hidden = false;
      }
    }

    if (generalForm) {
      generalForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const fd = new FormData(generalForm);
        const payload = Object.fromEntries(fd.entries());

        if (!payload.nume || !payload.email || !payload.mesaj) {
          if (generalMsg) {
            generalMsg.style.color = "#fca5a5";
            generalMsg.textContent = "Completează nume, email și mesaj.";
          }
          return;
        }

        const leadPayload = {
          name: payload.nume,
          email: payload.email,
          phone: payload.telefon || "",
          project_type: "Mesaj general",
          budget_range: "",
          timeline: "",
          message: payload.mesaj,
          calculator_summary_json: null,
          estimated_min: null,
          estimated_max: null,
          recommended_package: "",
          source: "general_contact",
          budget_confirmed: false
        };

        try {
          await fetchJson("/api/public/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(leadPayload)
          });
        } catch (_error) {
          if (generalMsg) {
            generalMsg.style.color = "#fca5a5";
            generalMsg.textContent = "Nu am putut trimite mesajul acum. Te rog încearcă din nou.";
          }
          return;
        }

        emitTrackingEvent("general_contact_submitted", { source: "general_contact" });

        generalForm.reset();
        if (generalMsg) {
          generalMsg.style.color = "#86efac";
          generalMsg.textContent = "Mesajul tău a fost trimis. Revin cât mai curând.";
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await applySeo();
    await applySettings();
    await applyHomepageData();
    await applyServicesPage();
    await applyPortfolioPage();
    await applyPortfolioProjectPage();
    await applyBlogPage();
    await applyBlogPostPage();
    await bindContactForms();
    bindCalculatorCtaTracking(document);
  });
})();
