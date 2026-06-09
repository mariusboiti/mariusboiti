const NAV_ITEMS = [
  { label: "Acas\u0103", href: "/" },
  { label: "Servicii", href: "/servicii" },
  { label: "Portofoliu", href: "/portofoliu" },
  { label: "Calculator pre\u021B", href: "/calculator-pret" },
  { label: "Proces", href: "/proces" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" }
];

function normalizePath(pathname) {
  if (!pathname) return "/";
  let result = pathname;
  if (result.endsWith("/index.html")) {
    result = result.slice(0, -"/index.html".length) || "/";
  } else if (result.endsWith(".html")) {
    result = result.slice(0, -".html".length) || "/";
  }
  if (!result.startsWith("/")) {
    result = `/${result}`;
  }
  if (result.length > 1 && result.endsWith("/")) {
    result = result.slice(0, -1);
  }
  return result || "/";
}

function getCurrentPath() {
  return normalizePath(window.location.pathname);
}

function trackEvent(eventName, payload = {}) {
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

function renderHeader() {
  const mount = document.getElementById("site-header");
  if (!mount) return;

  const currentPath = getCurrentPath();
  const links = NAV_ITEMS.map((item) => {
    const targetPath = normalizePath(item.href);
    const activeClass = currentPath === targetPath ? "active" : "";
    return `<a class="${activeClass}" href="${item.href}">${item.label}</a>`;
  }).join("");

  const headerJellyCta = `
    <span class="split-jelly-label">Calculeaz&#259; pre&#539;ul</span>
    <span class="split-jelly-bridge" aria-hidden="true"></span>
    <span class="split-jelly-circle" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M7 17L17 7M9 7H17V15"></path>
      </svg>
    </span>
  `;

  mount.innerHTML = `
    <header class="site-header">
      <div class="container nav-wrap header-inner" id="nav-wrap">
        <a class="brand has-logo" href="/"><img src="/assets/logo.svg" alt="Marius Boiti Studio" class="brand-logo" /></a>
        <nav class="menu" aria-label="Naviga&#539;ie principal&#259;">
          ${links}
          <a class="split-jelly-button menu-cta" href="/calculator-pret" data-calculator-cta>${headerJellyCta}</a>
        </nav>
        <a class="split-jelly-button desktop-cta" href="/calculator-pret" data-calculator-cta>${headerJellyCta}</a>
        <button class="mobile-toggle" id="mobile-toggle" aria-label="Deschide meniul" aria-expanded="false">&#9776;</button>
      </div>
    </header>
  `;

  const navWrap = document.getElementById("nav-wrap");
  const toggle = document.getElementById("mobile-toggle");

  if (toggle && navWrap) {
    toggle.addEventListener("click", () => {
      const isOpen = navWrap.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.textContent = isOpen ? "\u2715" : "\u2630";
    });
  }
}

function renderFooter() {
  const mount = document.getElementById("site-footer");
  if (!mount) return;

  mount.innerHTML = `
    <footer class="site-footer">
      <div class="footer-shell">
        <div class="footer-social-rail" id="footer-social-rail" aria-label="Social media" hidden></div>

        <div class="footer-main">
          <div class="footer-cta">
            <p class="footer-eyebrow">Hai să construim ceva clar</p>
            <h2>Îți place ce vezi?</h2>
            <p>Folosește calculatorul de preț și vezi rapid ce buget ar trebui să pregătești pentru site-ul tău.</p>
            <a href="/calculator-pret" class="split-jelly-button footer-cta-button" data-calculator-cta>
              <span class="split-jelly-label">Calculează prețul</span>
              <span class="split-jelly-bridge" aria-hidden="true"></span>
              <span class="split-jelly-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 17L17 7M9 7H17V15"></path>
                </svg>
              </span>
            </a>
          </div>

          <nav class="footer-column" aria-label="Navigare footer">
            <h3>Navigare</h3>
            <a href="/">Acasă</a>
            <a href="/servicii">Servicii</a>
            <a href="/portofoliu">Portofoliu</a>
            <a href="/calculator-pret">Calculator preț</a>
            <a href="/proces">Proces</a>
            <a href="/blog">Blog</a>
            <a href="/contact">Contact</a>
          </nav>

          <nav class="footer-column" aria-label="Servicii footer">
            <h3>Servicii</h3>
            <a href="/servicii">Site-uri & Landing pages</a>
            <a href="/servicii/brand-identitate">Brand & Identitate Vizuală</a>
            <a href="/servicii/continut-copywriting">Conținut & Copywriting</a>
            <a href="/servicii/servicii-ai">Servicii AI pentru afaceri</a>
            <a href="/servicii/audit-optimizare">Audit & Optimizare</a>
            <a href="/servicii/mentenanta-suport">Mentenanță & Suport</a>
          </nav>

          <div class="footer-column footer-contact">
            <h3>Contact</h3>
            <a href="mailto:marius.boiti@gmail.com">marius.boiti@gmail.com</a>
            <a href="/contact">Trimite mesaj</a>
            <a href="/calculator-pret">Începe cu o estimare</a>
          </div>
        </div>

        <div class="footer-bottom">
          <a href="/" class="footer-brand">Marius Boiti Studio</a>
          <div class="footer-bottom-links">
            <span>&copy; <span id="year"></span> Marius Boiti Studio. Toate drepturile rezervate.</span>
            <a href="/privacy-policy">Politica de confidențialitate</a>
            <a href="/termeni-si-conditii">Termeni și condiții</a>
          </div>
        </div>
      </div>
    </footer>
  `;

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
}

function isValidSocialUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function socialIconSvg(platform) {
  const icons = {
    facebook:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.5-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06z"></path></svg>',
    instagram:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 12 16.5 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 12 14.5 2.5 2.5 0 0 0 12 9.5zM17.75 6.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"></path></svg>',
    linkedin:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9h4v12H3V9zm6 0h3.8v1.64h.05c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.79 2.66 4.79 6.12V21h-4v-5.58c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.95V21H9V9z"></path></svg>',
    youtube:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.58 12 3.58 12 3.58s-7.55 0-9.4.5A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.5 9.4.5 9.4.5s7.55 0 9.4-.5a3 3 0 0 0 2.1-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8zM9.75 15.5v-7l6.25 3.5-6.25 3.5z"></path></svg>'
  };
  return icons[platform] || "";
}

function renderFooterSocialLinks(settings = {}) {
  const rail = document.getElementById("footer-social-rail");
  if (!rail) return;

  const entries = [
    { key: "facebook", label: "Facebook", url: settings.facebook_url },
    { key: "instagram", label: "Instagram", url: settings.instagram_url },
    { key: "linkedin", label: "LinkedIn", url: settings.linkedin_url },
    { key: "youtube", label: "YouTube", url: settings.youtube_url }
  ].map((item) => ({ ...item, url: String(item.url || "").trim() }));

  const hasAnyValidUrl = entries.some((item) => isValidSocialUrl(item.url));

  if (!entries.length || !hasAnyValidUrl) {
    const shell = rail.closest(".footer-shell");
    if (shell) shell.classList.remove("has-social-rail");
    rail.hidden = true;
    rail.innerHTML = "";
    return;
  }

  rail.innerHTML = entries
    .filter((item) => isValidSocialUrl(item.url))
    .map((item) => {
      return `<a href="${item.url}" class="footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="${item.label}">${socialIconSvg(item.key)}</a>`;
    })
    .join("");
  const shell = rail.closest(".footer-shell");
  if (shell) {
    if (hasAnyValidUrl) shell.classList.add("has-social-rail");
    else shell.classList.remove("has-social-rail");
  }
  rail.hidden = !hasAnyValidUrl;
}

window.setFooterSocialLinks = renderFooterSocialLinks;

function renderBackToTopButton() {
  if (document.querySelector(".back-to-top-button")) return;
  const button = document.createElement("button");
  button.className = "back-to-top-button";
  button.type = "button";
  button.setAttribute("aria-label", "\u00cenapoi sus");
  button.innerHTML = `
    <svg class="back-to-top-icon" viewBox="0 0 384 512" aria-hidden="true">
      <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2l105.4 105.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"></path>
    </svg>
  `;
  document.body.appendChild(button);
}

function initReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach((target, index) => {
    target.style.transitionDelay = `${index * 40}ms`;
    observer.observe(target);
  });
}

function initFaq() {
  const items = document.querySelectorAll(".faq-item");
  if (!items.length) return;

  items.forEach((item) => {
    const button = item.querySelector("button");
    if (!button) return;

    button.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      items.forEach((other) => {
        other.classList.remove("open");
        const symbol = other.querySelector("button span:last-child");
        if (symbol) symbol.textContent = "+";
      });
      if (!isOpen) {
        item.classList.add("open");
        const symbol = button.querySelector("span:last-child");
        if (symbol) symbol.textContent = "\u2212";
      }
    });
  });
}

function initSmoothScroll() {
  const links = document.querySelectorAll("a[href^='#']");
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId.length < 2) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initCalculatorCtaTracking() {
  document.querySelectorAll("[data-calculator-cta]").forEach((link) => {
    if (link.dataset.tracked === "1") return;
    link.dataset.tracked = "1";
    link.addEventListener("click", () => {
      trackEvent("calculator_cta_clicked", {
        label: link.textContent?.trim() || "calculator_cta",
        href: link.getAttribute("href") || ""
      });
    });
  });
}

function initScrolledHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const updateHeaderState = () => {
    if (window.scrollY > 50) {
      header.classList.add("is-scrolled");
      document.body.classList.add("has-scrolled-header");
    } else {
      header.classList.remove("is-scrolled");
      document.body.classList.remove("has-scrolled-header");
    }
  };

  window.addEventListener("scroll", updateHeaderState, { passive: true });
  window.addEventListener("resize", updateHeaderState);
  updateHeaderState();
}

function initBackToTop() {
  const backToTopButton = document.querySelector(".back-to-top-button");
  if (!backToTopButton) return;

  const toggleBackToTop = () => {
    if (window.scrollY > 350) {
      backToTopButton.classList.add("is-visible");
    } else {
      backToTopButton.classList.remove("is-visible");
    }
  };

  window.addEventListener("scroll", toggleBackToTop, { passive: true });
  backToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  toggleBackToTop();
}

renderHeader();
renderFooter();
renderBackToTopButton();
initReveal();
initFaq();
initSmoothScroll();
initCalculatorCtaTracking();
initBackToTop();
initScrolledHeader();
initCookieBanner();

let heroVantaEffect = null;
let servicesVantaEffect = null;
let portfolioVantaEffect = null;
let servicesVantaResizeTimer = null;
let blogVantaEffect = null;
let contactVantaEffect = null;
let processVantaEffect = null;
let calculatorVantaEffect = null;

function initHeroVanta() {
  const target = document.querySelector("#hero-vanta-bg");

  if (!target) return;
  if (typeof VANTA === "undefined" || !VANTA.GLOBE) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedMotion || isMobile) return;

  if (heroVantaEffect) {
    heroVantaEffect.destroy();
    heroVantaEffect = null;
  }

  heroVantaEffect = VANTA.GLOBE({
    el: "#hero-vanta-bg",
    mouseControls: true,
    touchControls: false,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.0,
    scaleMobile: 1.0,
    backgroundColor: 0x060c1a,
    color: 0x38bdf8,
    color2: 0x1a5fa8,
    size: 1.1,
    xOffset: 0.28,
    yOffset: 0.0
  });
}

function initServicesVanta() {
  const target = document.querySelector("#services-vanta-bg");
  if (!target) return;
  if (typeof VANTA === "undefined" || !VANTA.GLOBE) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedMotion || isMobile) {
    if (servicesVantaEffect) {
      servicesVantaEffect.destroy();
      servicesVantaEffect = null;
    }
    return;
  }

  if (servicesVantaEffect) {
    servicesVantaEffect.destroy();
    servicesVantaEffect = null;
  }

  servicesVantaEffect = VANTA.GLOBE({
    el: "#services-vanta-bg",
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.0,
    scaleMobile: 1.0,
    backgroundColor: 0x050816,
    color: 0x2c8fd8,
    color2: 0x1b4d8f,
    size: 0.95,
    xOffset: 0.35,
    yOffset: 0.02
  });
}

function initCalculatorVanta() {
  const target = document.querySelector("#calc-vanta-bg");
  if (!target) return;
  if (typeof VANTA === "undefined" || !VANTA.GLOBE) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedMotion || isMobile) {
    if (calculatorVantaEffect) {
      calculatorVantaEffect.destroy();
      calculatorVantaEffect = null;
    }
    return;
  }

  if (calculatorVantaEffect) {
    calculatorVantaEffect.destroy();
    calculatorVantaEffect = null;
  }

  calculatorVantaEffect = VANTA.GLOBE({
    el: "#calc-vanta-bg",
    mouseControls: true,
    touchControls: false,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.0,
    scaleMobile: 1.0,
    backgroundColor: 0x050816,
    color: 0x2c8fd8,
    color2: 0x1b4d8f,
    size: 0.9,
    xOffset: 0.32,
    yOffset: 0.0
  });
}

function initPortfolioVanta() {
  const target = document.querySelector("#portfolio-vanta-bg");
  if (!target) return;
  if (typeof VANTA === "undefined" || !VANTA.DOTS) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedMotion || isMobile) {
    if (portfolioVantaEffect) {
      portfolioVantaEffect.destroy();
      portfolioVantaEffect = null;
    }
    return;
  }

  if (portfolioVantaEffect) {
    portfolioVantaEffect.destroy();
    portfolioVantaEffect = null;
  }

  portfolioVantaEffect = VANTA.DOTS({
    el: "#portfolio-vanta-bg",
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.0,
    scaleMobile: 1.0,
    color: 0x2f8fd8,
    color2: 0x1d5ca0,
    backgroundColor: 0x050816,
    size: 3.2,
    spacing: 30.0,
    showLines: true
  });
}

function initBlogVanta() {
  const target = document.querySelector("#blog-vanta-bg");
  if (!target) return;
  if (typeof VANTA === "undefined" || !VANTA.TOPOLOGY) return;
  if (typeof window.p5 === "undefined") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedMotion || isMobile) {
    if (blogVantaEffect) {
      blogVantaEffect.destroy();
      blogVantaEffect = null;
    }
    return;
  }

  if (blogVantaEffect) {
    blogVantaEffect.destroy();
    blogVantaEffect = null;
  }

  blogVantaEffect = VANTA.TOPOLOGY({
    el: "#blog-vanta-bg",
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.0,
    scaleMobile: 1.0,
    backgroundColor: 0x050816,
    color: 0x2d87cc
  });
}

function initContactVanta() {
  const target = document.querySelector("#contact-vanta-bg");
  if (!target) return;
  if (typeof VANTA === "undefined" || !VANTA.CELLS) return;
  if (typeof window.p5 === "undefined") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedMotion || isMobile) {
    if (contactVantaEffect) {
      contactVantaEffect.destroy();
      contactVantaEffect = null;
    }
    return;
  }

  if (contactVantaEffect) {
    contactVantaEffect.destroy();
    contactVantaEffect = null;
  }

  contactVantaEffect = VANTA.CELLS({
    el: "#contact-vanta-bg",
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.0,
    scaleMobile: 1.0,
    color1: 0x2f8fd8,
    color2: 0x1b4f8e,
    size: 1.05,
    speed: 0.6
  });
}

function initProcessVanta() {
  const target = document.querySelector("#process-vanta-bg");
  if (!target) return;
  if (typeof VANTA === "undefined" || !VANTA.TRUNK) return;
  if (typeof window.p5 === "undefined") return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedMotion || isMobile) {
    if (processVantaEffect) {
      processVantaEffect.destroy();
      processVantaEffect = null;
    }
    return;
  }

  if (processVantaEffect) {
    processVantaEffect.destroy();
    processVantaEffect = null;
  }

  processVantaEffect = VANTA.TRUNK({
    el: "#process-vanta-bg",
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.0,
    scaleMobile: 1.0,
    color: 0x2e8dd4,
    backgroundColor: 0x050816,
    spacing: 4.2,
    chaos: 1.5
  });
}

window.addEventListener("load", initHeroVanta);
window.addEventListener("load", initServicesVanta);
window.addEventListener("load", initCalculatorVanta);
window.addEventListener("load", initPortfolioVanta);
window.addEventListener("load", initBlogVanta);
window.addEventListener("load", initContactVanta);
window.addEventListener("load", initProcessVanta);
window.addEventListener("resize", () => {
  const hasServicesVanta = Boolean(document.querySelector("#services-vanta-bg"));
  const hasCalculatorVanta = Boolean(document.querySelector("#calc-vanta-bg"));
  const hasPortfolioVanta = Boolean(document.querySelector("#portfolio-vanta-bg"));
  const hasBlogVanta = Boolean(document.querySelector("#blog-vanta-bg"));
  const hasContactVanta = Boolean(document.querySelector("#contact-vanta-bg"));
  const hasProcessVanta = Boolean(document.querySelector("#process-vanta-bg"));
  if (!hasServicesVanta && !hasCalculatorVanta && !hasPortfolioVanta && !hasBlogVanta && !hasContactVanta && !hasProcessVanta) return;
  if (servicesVantaResizeTimer) {
    clearTimeout(servicesVantaResizeTimer);
  }
  servicesVantaResizeTimer = window.setTimeout(() => {
    if (hasServicesVanta) initServicesVanta();
    if (hasCalculatorVanta) initCalculatorVanta();
    if (hasPortfolioVanta) initPortfolioVanta();
    if (hasBlogVanta) initBlogVanta();
    if (hasContactVanta) initContactVanta();
    if (hasProcessVanta) initProcessVanta();
  }, 180);
});

window.addEventListener("beforeunload", () => {
  if (heroVantaEffect) {
    heroVantaEffect.destroy();
  }
  if (servicesVantaEffect) {
    servicesVantaEffect.destroy();
  }
  if (portfolioVantaEffect) {
    portfolioVantaEffect.destroy();
  }
  if (blogVantaEffect) {
    blogVantaEffect.destroy();
  }
  if (contactVantaEffect) {
    contactVantaEffect.destroy();
  }
  if (processVantaEffect) {
    processVantaEffect.destroy();
  }
});

/* ══════════════════════════════════════════════════
   Cookie Consent Banner
   ══════════════════════════════════════════════════ */
function initCookieBanner() {
  var CONSENT_KEY = "mb_cookie_consent";
  var existing = localStorage.getItem(CONSENT_KEY);

  // Inject banner HTML
  var banner = document.createElement("div");
  banner.id = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Consimtamant cookie-uri");
  banner.innerHTML =
    '<div class="cb-inner">' +
      '<p class="cb-text">Folosim cookie-uri esentiale pentru functionarea site-ului si, cu acordul tau, cookie-uri analitice (Google Analytics) pentru a intelege cum este utilizat site-ul.' +
      ' <a href="/privacy-policy">Afla mai multe</a>.</p>' +
      '<div class="cb-actions">' +
        '<button class="cb-btn-accept" id="cb-accept-all" type="button">Accept toate</button>' +
        '<button class="cb-btn-essential" id="cb-essential-only" type="button">Doar esentiale</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(banner);

  // Floating re-open button (cookie icon)
  var settingsBtn = document.createElement("button");
  settingsBtn.id = "cookie-settings-btn";
  settingsBtn.type = "button";
  settingsBtn.setAttribute("aria-label", "Setari cookie-uri");
  settingsBtn.setAttribute("title", "Setari cookie-uri");
  settingsBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path></svg>';
  document.body.appendChild(settingsBtn);

  function hideBanner() {
    banner.classList.remove("cb-visible");
    banner.classList.add("cb-hidden");
    settingsBtn.classList.add("csb-visible");
  }

  function showBanner() {
    banner.classList.remove("cb-hidden");
    setTimeout(function () { banner.classList.add("cb-visible"); }, 50);
    settingsBtn.classList.remove("csb-visible");
  }

  function giveConsent(level) {
    localStorage.setItem(CONSENT_KEY, level);
    hideBanner();
    if (level === "all") {
      window.dispatchEvent(new CustomEvent("mb:cookie-consent", { detail: { level: "all" } }));
    }
  }

  document.getElementById("cb-accept-all").addEventListener("click", function () {
    giveConsent("all");
  });
  document.getElementById("cb-essential-only").addEventListener("click", function () {
    giveConsent("essential");
  });
  settingsBtn.addEventListener("click", function () {
    localStorage.removeItem(CONSENT_KEY);
    showBanner();
  });

  // Show banner if no consent recorded yet
  if (!existing) {
    setTimeout(function () { showBanner(); }, 800);
  } else {
    settingsBtn.classList.add("csb-visible");
    // If already consented to all, fire event for GA4
    if (existing === "all") {
      window.dispatchEvent(new CustomEvent("mb:cookie-consent", { detail: { level: "all" } }));
    }
  }
}

