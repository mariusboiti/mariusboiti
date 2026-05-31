const PRICE_CALCULATOR_CONFIG = {
  siteType: [
    { id: "one-page", label: "Site one-page", basePrice: 1200 },
    { id: "sales-landing", label: "Landing page de vânzare", basePrice: 1500 },
    { id: "presentation", label: "Site de prezentare", basePrice: 2500 },
    { id: "simple-shop", label: "Magazin online simplu", basePrice: 4000 },
    { id: "redesign", label: "Redesign site existent", basePrice: 1800 },
    { id: "not-sure", label: "Nu sunt sigur", basePrice: 2500 }
  ],
  pages: [
    { id: "1", label: "1 pagină", add: 0 },
    { id: "2-4", label: "2-4 pagini", add: 600 },
    { id: "5-7", label: "5-7 pagini", add: 1200 },
    { id: "8-12", label: "8-12 pagini", add: 2000 },
    { id: "12+", label: "Peste 12 pagini", add: 3000 },
    { id: "not-sure", label: "Nu știu încă", add: 1000 }
  ],
  content: [
    { id: "ready", label: "Da, am textele pregătite", add: 0 },
    { id: "ideas", label: "Am idei, dar trebuie aranjate", add: 500 },
    { id: "from-scratch", label: "Vreau texte scrise de la zero", add: 1200 },
    { id: "not-sure", label: "Nu știu încă", add: 600 }
  ],
  extras: [
    { id: "advanced-form", label: "Formular de contact avansat", add: 300 },
    { id: "whatsapp-track", label: "Buton WhatsApp + tracking click", add: 150 },
    { id: "gallery", label: "Galerie / portofoliu", add: 400 },
    { id: "blog", label: "Blog", add: 700 },
    { id: "booking", label: "Sistem programări", add: 900 },
    { id: "calendly", label: "Integrare Calendly (programări online)", add: 500 },
    { id: "conditional-form", label: "Formular condițional / multi-step", add: 400 },
    { id: "newsletter", label: "Newsletter / Mailchimp", add: 500 },
    { id: "payments", label: "Integrare plăți online", add: 1200 },
    { id: "shop-products", label: "Magazin cu produse", add: 1500 },
    { id: "multilingual", label: "Multilingv RO/EN", add: 1000 },
    { id: "pwa", label: "PWA – aplicație mobilă din site", add: 800 },
    { id: "seo-extended", label: "SEO de bază extins", add: 800 },
    { id: "speed-extra", label: "Optimizare viteză extra", add: 600 },
    { id: "content-migration", label: "Migrare conținut site existent", add: 600 },
    { id: "ai-chatbot", label: "Chatbot AI <span class='calc-badge-new'>NOU</span>", add: 1500 },
    { id: "copywriting-pkg", label: "Pachet copywriting inclus", add: 800 },
    { id: "training", label: "Training scurt după livrare", add: 300 }
  ],
  design: [
    { id: "simple", label: "Design simplu și curat", add: 0 },
    { id: "premium", label: "Design premium personalizat", add: 1000 },
    { id: "advanced", label: "Design avansat cu animații și secțiuni speciale", add: 2000 },
    { id: "not-sure", label: "Nu știu încă", add: 700 }
  ],
  deadline: [
    { id: "not-rush", label: "Nu mă grăbesc", add: 0 },
    { id: "2-3-weeks", label: "În 2-3 săptămâni", add: 0 },
    { id: "7-10-days", label: "În 7-10 zile", add: 700 },
    { id: "under-7", label: "Urgent, sub 7 zile", add: 1500 },
    { id: "not-sure", label: "Nu știu încă", add: 300 }
  ]
};

const PRICE_CALCULATOR_STEPS = [
  { key: "siteType", type: "single", title: "Ce tip de site ai nevoie?", priceField: "basePrice", optionsKey: "siteType" },
  { key: "pages", type: "single", title: "Câte pagini estimezi că va avea site-ul?", priceField: "add", optionsKey: "pages" },
  { key: "content", type: "single", title: "Ai textele pregătite?", priceField: "add", optionsKey: "content" },
  { key: "extras", type: "multi", title: "Ce funcționalități extra ai nevoie?", priceField: "add", optionsKey: "extras" },
  { key: "design", type: "single", title: "Ce nivel de design îți dorești?", priceField: "add", optionsKey: "design" },
  { key: "deadline", type: "single", title: "Cât de repede ai nevoie de site?", priceField: "add", optionsKey: "deadline" }
];

const PRICE_CALCULATOR_STEP_HELPERS = {
  siteType: "Hai să estimăm aproximativ. Alege varianta cea mai apropiată.",
  pages: "Nu trebuie să fie exact. Poți alege intervalul care se potrivește cel mai bine.",
  content: "Dacă nu ești sigur, poți selecta «Nu știu încă».",
  extras: "Bifează doar funcționalitățile importante pentru lansare.",
  design: "Poți începe simplu și rafina ulterior.",
  deadline: "Dacă nu e urgent, poți păstra un termen flexibil."
};

let API_CALCULATOR_CONFIG = null;
let API_CALCULATOR_SETTINGS = null;

function formatLei(value) {
  return `${Math.round(value).toLocaleString("ro-RO")} lei`;
}

function roundToNearestHundred(value) {
  const step = Number(API_CALCULATOR_SETTINGS?.round_to || 100);
  return Math.round(value / step) * step;
}

function getRecommendedPackage(total) {
  const startThreshold = Number(API_CALCULATOR_SETTINGS?.start_threshold || 2000);
  const businessThreshold = Number(API_CALCULATOR_SETTINGS?.business_threshold || 4500);
  const premiumThreshold = Number(API_CALCULATOR_SETTINGS?.premium_threshold || 7000);
  if (total < startThreshold) return "Start";
  if (total <= businessThreshold) return "Business";
  if (total <= premiumThreshold) return "Premium";
  return "Proiect personalizat";
}

function getQualificationMessage(total) {
  const startThreshold = Number(API_CALCULATOR_SETTINGS?.start_threshold || 2000);
  const businessThreshold = Number(API_CALCULATOR_SETTINGS?.business_threshold || 4500);
  const premiumThreshold = Number(API_CALCULATOR_SETTINGS?.premium_threshold || 7000);

  if (total < startThreshold) {
    return API_CALCULATOR_SETTINGS?.start_message || "Acesta pare un proiect potrivit pentru un site simplu sau one-page. Este o variantă bună dacă vrei o prezență online rapidă și profesionistă.";
  }
  if (total <= businessThreshold) {
    return API_CALCULATOR_SETTINGS?.business_message || "Acesta pare un proiect potrivit pentru un site de prezentare complet, cu structură clară și funcționalități esențiale.";
  }
  if (total <= premiumThreshold) {
    return API_CALCULATOR_SETTINGS?.premium_message || "Acesta pare un proiect mai complex, potrivit pentru un site premium, cu strategie, design personalizat și funcționalități avansate.";
  }
  return API_CALCULATOR_SETTINGS?.custom_message || "Acesta pare un proiect complex, care necesită o ofertă personalizată. Putem stabili împreună prioritățile și o etapizare.";
}

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

function mapPreselectedSiteType(rawValue) {
  const normalized = String(rawValue || "").trim().toLowerCase();
  const aliases = {
    "site-de-prezentare": "presentation",
    "landing-page-de-vanzare": "sales-landing",
    "magazin-online-simplu": "simple-shop",
    "redesign-site-existent": "redesign",
    "redesign": "redesign",
    "one-page": "one-page",
    "start": "one-page",
    "business": "presentation",
    "premium": "simple-shop"
  };
  return aliases[normalized] || null;
}

class PriceCalculator {
  constructor(root) {
    this.root = root;
    this.state = {
      currentStep: 0,
      started: false,
      completed: false,
      siteType: null,
      pages: null,
      content: null,
      extras: [],
      design: null,
      deadline: null,
      maxBudget: ""
    };

    this.stepContent = root.querySelector("[data-calculator-step-content]");
    this.progress = root.querySelector("[data-calculator-progress]");
    this.progressMeta = root.querySelector("[data-calculator-progress-meta]");
    this.resultBox = root.querySelector("[data-calculator-result]");

    this.startedTracked = false;
    this.completedTracked = false;
  }

  init() {
    this.applyPreselectionFromQuery();
    this.renderProgress();
    this.renderStep();
    this.renderResult();
    this.attachEvents();
  }

  applyPreselectionFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const preselectedSite = mapPreselectedSiteType(params.get("calc_site"));
    if (!preselectedSite) return;

    const option = this.getOptionById("siteType", preselectedSite);
    if (!option) return;

    this.state.siteType = preselectedSite;
    this.state.started = true;
    if (!this.startedTracked) {
      emitTrackingEvent("calculator_started", { step: "siteType", preselected: true });
      this.startedTracked = true;
    }
  }

  attachEvents() {
    this.root.addEventListener("click", (event) => {
      const singleOption = event.target.closest("[data-single-option]");
      if (singleOption) {
        this.handleSingleSelection(singleOption.dataset.stepKey, singleOption.dataset.optionId);
        return;
      }

      const nextButton = event.target.closest("[data-action='next-step']");
      if (nextButton) {
        this.goNext();
        return;
      }

      const backButton = event.target.closest("[data-action='prev-step']");
      if (backButton) {
        this.goBack();
        return;
      }

      const resetButton = event.target.closest("[data-action='reset-calculator']");
      if (resetButton) {
        this.reset();
        return;
      }

      const quoteButton = event.target.closest("[data-action='go-quote']");
      if (quoteButton) {
        this.goToQuote();
        return;
      }
    });

    this.root.addEventListener("change", (event) => {
      const budgetInput = event.target.closest("[data-budget-max-input]");
      if (budgetInput) {
        this.state.maxBudget = String(budgetInput.value || "").trim();
        this.renderResult();
        return;
      }

      const multiOption = event.target.closest("[data-multi-option]");
      if (multiOption) {
        this.handleMultiSelection(multiOption.dataset.stepKey, multiOption.dataset.optionId, multiOption.checked);
      }
    });
  }

  getStepConfig() {
    return PRICE_CALCULATOR_STEPS[this.state.currentStep];
  }

  getCompletionStats() {
    const requiredKeys = ["siteType", "pages", "content", "design", "deadline"];
    const requiredDone = requiredKeys.filter((key) => Boolean(this.state[key])).length;

    const answeredSteps = PRICE_CALCULATOR_STEPS.filter((step) => {
      const value = this.state[step.key];
      if (step.type === "multi") return Array.isArray(value) && value.length > 0;
      return Boolean(value);
    }).length;

    const progressPercent = Math.round((answeredSteps / PRICE_CALCULATOR_STEPS.length) * 100);

    return {
      requiredDone,
      requiredTotal: requiredKeys.length,
      answeredSteps,
      totalSteps: PRICE_CALCULATOR_STEPS.length,
      progressPercent
    };
  }

  getOptionsByStep(step) {
    if (API_CALCULATOR_CONFIG && API_CALCULATOR_CONFIG[step.optionsKey]) {
      return API_CALCULATOR_CONFIG[step.optionsKey];
    }
    return PRICE_CALCULATOR_CONFIG[step.optionsKey] || [];
  }

  getOptionById(stepKey, optionId) {
    const step = PRICE_CALCULATOR_STEPS.find((item) => item.key === stepKey);
    if (!step) return null;
    return this.getOptionsByStep(step).find((option) => option.id === optionId) || null;
  }

  handleSingleSelection(stepKey, optionId) {
    if (!this.state.started) {
      this.state.started = true;
      if (!this.startedTracked) {
        emitTrackingEvent("calculator_started", { step: stepKey });
        this.startedTracked = true;
      }
    }

    this.state[stepKey] = optionId;
    this.renderStep();
    this.renderResult();
  }

  handleMultiSelection(stepKey, optionId, checked) {
    if (!Array.isArray(this.state[stepKey])) {
      this.state[stepKey] = [];
    }

    if (!this.state.started) {
      this.state.started = true;
      if (!this.startedTracked) {
        emitTrackingEvent("calculator_started", { step: stepKey });
        this.startedTracked = true;
      }
    }

    if (checked) {
      if (!this.state[stepKey].includes(optionId)) {
        this.state[stepKey].push(optionId);
      }
    } else {
      this.state[stepKey] = this.state[stepKey].filter((value) => value !== optionId);
    }

    this.renderResult();
  }

  canContinueCurrentStep() {
    const step = this.getStepConfig();
    if (!step) return false;

    if (step.type === "single") {
      return Boolean(this.state[step.key]);
    }

    return true;
  }

  goNext() {
    if (!this.canContinueCurrentStep()) {
      return;
    }

    if (this.state.currentStep < PRICE_CALCULATOR_STEPS.length - 1) {
      this.state.currentStep += 1;
      this.renderProgress();
      this.renderStep();
      return;
    }

    this.state.completed = true;
    const calculation = this.calculate();
    if (calculation && !this.completedTracked) {
      emitTrackingEvent("calculator_completed", {
        total: calculation.total,
        recommendedPackage: calculation.recommendedPackage
      });
      this.completedTracked = true;
    }

    this.renderResult();
  }

  goBack() {
    if (this.state.currentStep === 0) return;

    this.state.currentStep -= 1;
    this.renderProgress();
    this.renderStep();
  }

  reset() {
    this.state = {
      currentStep: 0,
      started: false,
      completed: false,
      siteType: null,
      pages: null,
      content: null,
      extras: [],
      design: null,
      deadline: null,
      maxBudget: ""
    };

    this.startedTracked = false;
    this.completedTracked = false;

    this.renderProgress();
    this.renderStep();
    this.renderResult();
  }

  renderProgress() {
    const totalSteps = PRICE_CALCULATOR_STEPS.length;
    const activeStep = this.state.currentStep + 1;
    const stats = this.getCompletionStats();

    if (this.progressMeta) {
      this.progressMeta.innerHTML = `
        <span>Pasul ${activeStep} din ${totalSteps}</span>
        <strong>${stats.progressPercent}% completat</strong>
      `;
    }

    if (!this.progress) return;

    const items = PRICE_CALCULATOR_STEPS.map((step, index) => {
      const isDone = index < this.state.currentStep;
      const isActive = index === this.state.currentStep;
      const classes = ["calc-progress-item"];
      if (isDone) classes.push("done");
      if (isActive) classes.push("active");

      return `
        <li class="${classes.join(" ")}">
          <span class="calc-progress-badge">${isDone ? "✓" : index + 1}</span>
          <small>${step.title}</small>
        </li>
      `;
    }).join("");

    this.progress.innerHTML = items;
  }

  renderStep() {
    const step = this.getStepConfig();
    if (!step || !this.stepContent) return;

    const options = this.getOptionsByStep(step);
    const selectedValue = this.state[step.key];
    const isMulti = step.type === "multi";
    const helperText = PRICE_CALCULATOR_STEP_HELPERS[step.key] || "Selectează opțiunea care se potrivește cel mai bine.";

    const optionsMarkup = options
      .map((option) => {
        if (isMulti) {
          const checked = Array.isArray(selectedValue) && selectedValue.includes(option.id) ? "checked" : "";
          const activeClass = checked ? "active" : "";
          return `
            <label class="calc-option calc-option-check ${activeClass}">
              <input type="checkbox" ${checked} data-multi-option data-step-key="${step.key}" data-option-id="${option.id}" />
              <span class="calc-option-main">
                <span class="calc-option-indicator" aria-hidden="true">${checked ? "✓" : ""}</span>
                <span class="calc-option-label">${option.label}</span>
              </span>
              <span class="calc-option-price">+ ${formatLei(option.add)}</span>
            </label>
          `;
        }

        const isActive = selectedValue === option.id;
        const baseOrAdd = step.priceField === "basePrice" ? option.basePrice : option.add;
        const sign = baseOrAdd > 0 ? "+ " : "";

        return `
          <button
            type="button"
            class="calc-option ${isActive ? "active" : ""}"
            data-single-option
            data-step-key="${step.key}"
            data-option-id="${option.id}"
            aria-pressed="${isActive ? "true" : "false"}"
          >
            <span class="calc-option-main">
              <span class="calc-option-indicator" aria-hidden="true">${isActive ? "✓" : ""}</span>
              <span class="calc-option-label">${option.label}</span>
            </span>
            <span class="calc-option-price">${sign}${formatLei(baseOrAdd)}</span>
          </button>
        `;
      })
      .join("");

    const nextLabel = this.state.currentStep === PRICE_CALCULATOR_STEPS.length - 1 ? "Vezi estimarea" : "Continuă";

    this.stepContent.innerHTML = `
      <h3 class="calc-step-title">${step.title}</h3>
      <p class="calc-step-helper">${helperText}</p>
      <div class="calc-options">${optionsMarkup}</div>
      <div class="calc-actions">
        <button type="button" class="btn btn-secondary calc-nav-secondary" data-action="prev-step" ${this.state.currentStep === 0 ? "disabled" : ""}>Înapoi</button>
        <button type="button" class="btn btn-primary calc-nav-primary" data-action="next-step" ${!this.canContinueCurrentStep() ? "disabled" : ""}>${nextLabel}</button>
      </div>
    `;
  }

  parseBudgetValue() {
    const raw = String(this.state.maxBudget || "").trim();
    if (!raw) return null;
    const normalized = raw.replace(/[^\d]/g, "");
    if (!normalized) return null;
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  }

  calculate() {
    const requiredKeys = ["siteType", "pages", "content", "design", "deadline"];
    const hasMissingRequired = requiredKeys.some((key) => !this.state[key]);
    if (hasMissingRequired) return null;

    const site = this.getOptionById("siteType", this.state.siteType);
    const pages = this.getOptionById("pages", this.state.pages);
    const content = this.getOptionById("content", this.state.content);
    const design = this.getOptionById("design", this.state.design);
    const deadline = this.getOptionById("deadline", this.state.deadline);
    const extras = (this.state.extras || [])
      .map((id) => this.getOptionById("extras", id))
      .filter(Boolean);

    const additions = [pages?.add || 0, content?.add || 0, design?.add || 0, deadline?.add || 0].reduce((sum, value) => sum + value, 0);
    const extrasTotal = extras.reduce((sum, item) => sum + item.add, 0);

    const total = (site?.basePrice || 0) + additions + extrasTotal;
    const minEstimate = total;
    const multiplier = Number(API_CALCULATOR_SETTINGS?.max_multiplier || 1.2);
    const maxEstimate = roundToNearestHundred(total * multiplier);
    const recommendedPackage = getRecommendedPackage(total);

    const selections = {
      siteType: site?.label || "-",
      pages: pages?.label || "-",
      content: content?.label || "-",
      extras: extras.length ? extras.map((item) => item.label) : ["Fără extra"],
      design: design?.label || "-",
      deadline: deadline?.label || "-"
    };

    const maxBudgetValue = this.parseBudgetValue();
    const isOverBudget = Number.isFinite(maxBudgetValue) ? minEstimate > maxBudgetValue : false;

    return {
      total,
      minEstimate,
      maxEstimate,
      recommendedPackage,
      qualificationMessage: getQualificationMessage(total),
      selections,
      estimateLabel: `${formatLei(minEstimate)} - ${formatLei(maxEstimate)}`,
      maxBudgetValue,
      isOverBudget
    };
  }

  renderResult() {
    if (!this.resultBox) return;

    const calculation = this.calculate();
    const stats = this.getCompletionStats();
    if (!calculation) {
      this.resultBox.innerHTML = `
        <h3 class="calc-result-title">Estimarea ta</h3>
        <div class="calc-summary-progress">
          <div class="calc-summary-progress-head">
            <span>Progres configurare</span>
            <strong>${stats.progressPercent}%</strong>
          </div>
          <div class="calc-summary-progress-bar"><span style="width:${stats.progressPercent}%"></span></div>
        </div>
        <p class="section-subtitle" style="margin-top:0.6rem;">Nu trebuie să știi tot de la început. Completează pașii principali pentru a vedea intervalul estimat.</p>
        <div class="calc-result-placeholder">
          <strong>${stats.requiredDone}/${stats.requiredTotal}</strong> pași obligatorii completați.<br />
          Alege varianta cea mai apropiată, iar estimarea se actualizează live.
        </div>
      `;
      return;
    }

    const extrasList = calculation.selections.extras.map((item) => `<li>${item}</li>`).join("");

    this.resultBox.innerHTML = `
      <h3 class="calc-result-title">Estimarea ta</h3>
      <div class="calc-summary-progress">
        <div class="calc-summary-progress-head">
          <span>Progres configurare</span>
          <strong>${stats.progressPercent}%</strong>
        </div>
        <div class="calc-summary-progress-bar"><span style="width:${stats.progressPercent}%"></span></div>
      </div>
      <p class="calc-result-copy">
        ${API_CALCULATOR_SETTINGS?.result_intro_text || "Estimarea te ajută să vezi dacă suntem în aceeași zonă de buget. Este orientativă și poate varia în funcție de conținut, funcționalități și complexitate."}
      </p>
      <p class="calc-estimate-range">Estimare proiect: <strong>${calculation.estimateLabel}</strong></p>
      <p class="calc-package">Pachet recomandat: <strong>${calculation.recommendedPackage}</strong></p>
      <p class="calc-selection-heading">Selecțiile tale</p>
      <ul class="calc-selection-list">
        <li><strong>Tip site:</strong> ${calculation.selections.siteType}</li>
        <li><strong>Pagini:</strong> ${calculation.selections.pages}</li>
        <li><strong>Texte:</strong> ${calculation.selections.content}</li>
        <li><strong>Nivel design:</strong> ${calculation.selections.design}</li>
        <li><strong>Termen:</strong> ${calculation.selections.deadline}</li>
        <li><strong>Extra:</strong><ul class="calc-selection-sublist">${extrasList}</ul></li>
      </ul>
      <p class="calc-qualification">${calculation.qualificationMessage}</p>
      <div class="calc-budget-input-wrap">
        <label for="calc-max-budget-input">Bugetul meu maxim este…</label>
        <input id="calc-max-budget-input" type="text" inputmode="numeric" placeholder="Ex: 3000 lei" value="${this.state.maxBudget || ""}" data-budget-max-input />
        <small>Nu este obligatoriu. Mă ajută doar să îți propun o variantă realistă.</small>
      </div>
      ${calculation.isOverBudget ? `<p class="calc-budget-warning">Estimarea pare puțin peste bugetul introdus. Putem simplifica proiectul, reduce numărul de pagini sau începe cu o variantă mai mică.</p>` : ""}
      <p class="calc-budget-note">${API_CALCULATOR_SETTINGS?.under_budget_message || "Dacă estimarea este peste bugetul disponibil, putem simplifica prima versiune și adăuga funcționalități ulterior."}</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" data-action="go-quote">Trimite estimarea către Marius</button>
        <button type="button" class="btn btn-secondary" data-action="reset-calculator">Recalculează</button>
      </div>
      <div class="btn-row" style="margin-top:0.75rem;">
        <a class="btn btn-light" href="/contact?fromCalculator=1#formular-oferta-final-section">Mergi la contact</a>
      </div>
      <p class="calc-services-hint">Ai nevoie și de brand, copywriting sau mentenanță? <a href="/servicii">Explorează toate serviciile →</a></p>
    `;
  }

  goToQuote() {
    const calculation = this.calculate();
    if (!calculation) return;

    const payload = {
      source: "price_calculator",
      siteType: calculation.selections.siteType,
      pages: calculation.selections.pages,
      content: calculation.selections.content,
      extras: calculation.selections.extras,
      design: calculation.selections.design,
      deadline: calculation.selections.deadline,
      estimate: calculation.estimateLabel,
      maxBudget: calculation.maxBudgetValue ? `${calculation.maxBudgetValue} lei` : "",
      recommendedPackage: calculation.recommendedPackage,
      total: calculation.total,
      estimatedMin: calculation.minEstimate,
      estimatedMax: calculation.maxEstimate,
      selectedOptions: {
        siteType: this.state.siteType,
        pages: this.state.pages,
        content: this.state.content,
        extras: this.state.extras,
        design: this.state.design,
        deadline: this.state.deadline
      }
    };

    localStorage.setItem("mb_price_calculator_payload", JSON.stringify(payload));
    window.location.href = "/contact?fromCalculator=1#formular-oferta-final-section";
  }
}

function mapApiCalculatorOptions(options) {
  const map = {
    site_type: "siteType",
    pages: "pages",
    content: "content",
    features: "extras",
    design_level: "design",
    deadline: "deadline"
  };

  const output = {};
  Object.entries(map).forEach(([apiKey, localKey]) => {
    const filtered = (options || [])
      .filter((item) => item.step_key === apiKey && item.is_active)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    if (!filtered.length) return;

    output[localKey] = filtered.map((item) => ({
      id: item.option_value || item.option_label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: item.option_label,
      add: Number(item.price_add || 0),
      basePrice: Number(item.base_price || 0)
    }));
  });

  const ensureUnknownOption = (key, fallbackAdd = 0) => {
    if (!Array.isArray(output[key]) || output[key].some((item) => item.id === "not-sure")) return;
    output[key].push({ id: "not-sure", label: "Nu știu încă", add: fallbackAdd, basePrice: 0 });
  };

  ensureUnknownOption("pages", 1000);
  ensureUnknownOption("content", 600);
  ensureUnknownOption("design", 700);
  ensureUnknownOption("deadline", 300);

  return output;
}

async function loadCalculatorApiConfig() {
  const bases = [window.__MB_API_BASE || window.location.origin, "http://127.0.0.1:3011"];
  try {
    for (const base of bases) {
      const response = await fetch(`${base}/api/public/calculator`);
      if (!response.ok) continue;
      const data = await response.json();
      const mapped = mapApiCalculatorOptions(data.options);
      if (Object.keys(mapped).length) {
        API_CALCULATOR_CONFIG = mapped;
      }
      if (data.settings) {
        API_CALCULATOR_SETTINGS = data.settings;
      }
      window.__MB_API_BASE = base;
      break;
    }
  } catch (_error) {
    // fallback to static options
  }
}

async function initPriceCalculator() {
  await loadCalculatorApiConfig();
  const calculatorRoot = document.querySelector("[data-price-calculator]");
  if (!calculatorRoot) return;

  const calculator = new PriceCalculator(calculatorRoot);
  calculator.init();
}

initPriceCalculator();
