require("dotenv").config();

const bcrypt = require("bcryptjs");
const { getDb, initSchema, resetDatabase, stringifyJsonField } = require("./database");

const homepageSections = [
  {
    section_key: "hero",
    title: "Site-uri moderne care arată bine, se mișcă rapid și aduc clienți",
    subtitle:
      "Construiesc website-uri clare, responsive și orientate spre conversie pentru afaceri mici, freelanceri, servicii locale și proiecte digitale. De la structură și design până la lansare, te ajut să ai un site care inspiră încredere și transformă vizitatorii în cereri de ofertă.",
    content: "",
    button_primary_text: "Cere o ofertă gratuită",
    button_primary_url: "/contact",
    button_secondary_text: "Vezi portofoliul",
    button_secondary_url: "/portofoliu",
    image_url: "",
    extra_json: {
      benefits: [
        "Design modern și responsive",
        "SEO de bază inclus",
        "Structură gândită pentru conversie",
        "Site pregătit pentru promovare"
      ]
    },
    sort_order: 1,
    is_active: 1
  },
  {
    section_key: "benefits",
    title: "Claritate, încredere, conversie",
    subtitle: "Elementele care transformă un site din simplă prezență online într-un instrument de business.",
    content: "",
    button_primary_text: "",
    button_primary_url: "",
    button_secondary_text: "",
    button_secondary_url: "",
    image_url: "",
    extra_json: {
      cards: [
        { title: "Claritate", text: "Vizitatorul înțelege în câteva secunde cine ești și ce oferi." },
        { title: "Încredere", text: "Designul, textele și structura transmit profesionalism." },
        { title: "Conversie", text: "Fiecare secțiune are un scop clar, orientat spre acțiune." }
      ]
    },
    sort_order: 2,
    is_active: 1
  },
  {
    section_key: "problem",
    title: "Un site nu trebuie doar să existe. Trebuie să lucreze pentru tine.",
    subtitle:
      "Mulți antreprenori au un site online, dar vizitatorii nu înțeleg rapid ce oferă, de ce să aibă încredere și ce trebuie să facă mai departe.",
    content:
      "Eu construiesc site-uri cu structură clară, design curat și mesaje care ghidează vizitatorul spre acțiune: apel, formular, comandă sau cerere de ofertă.",
    button_primary_text: "",
    button_primary_url: "",
    button_secondary_text: "",
    button_secondary_url: "",
    image_url: "",
    extra_json: {},
    sort_order: 3,
    is_active: 1
  },
  { section_key: "services_intro", title: "Ce pot construi pentru tine", subtitle: "Servicii orientate spre rezultate", content: "", button_primary_text: "", button_primary_url: "", button_secondary_text: "", button_secondary_url: "", image_url: "", extra_json: {}, sort_order: 4, is_active: 1 },
  { section_key: "portfolio_intro", title: "Proiecte și concepte construite cu gândire de business", subtitle: "Studii de caz și direcții vizuale", content: "", button_primary_text: "", button_primary_url: "", button_secondary_text: "", button_secondary_url: "", image_url: "", extra_json: {}, sort_order: 5, is_active: 1 },
  { section_key: "process_intro", title: "Proces simplu, fără haos digital", subtitle: "De la strategie la lansare", content: "", button_primary_text: "", button_primary_url: "", button_secondary_text: "", button_secondary_url: "", image_url: "", extra_json: {}, sort_order: 6, is_active: 1 },
  { section_key: "about_intro", title: "Salut, sunt Marius.", subtitle: "Construiesc site-uri cu ochi de creator și minte de business.", content: "", button_primary_text: "Hai să discutăm despre site-ul tău", button_primary_url: "/contact", button_secondary_text: "", button_secondary_url: "", image_url: "", extra_json: {}, sort_order: 7, is_active: 1 },
  { section_key: "packages_intro", title: "Alege nivelul potrivit pentru proiectul tău", subtitle: "Pachete flexibile", content: "", button_primary_text: "", button_primary_url: "", button_secondary_text: "", button_secondary_url: "", image_url: "", extra_json: {}, sort_order: 8, is_active: 1 },
  { section_key: "faq_intro", title: "Întrebări frecvente", subtitle: "Răspunsuri rapide înainte de ofertă", content: "", button_primary_text: "", button_primary_url: "", button_secondary_text: "", button_secondary_url: "", image_url: "", extra_json: {}, sort_order: 9, is_active: 1 },
  {
    section_key: "final_cta",
    title: "Ai nevoie de un site care să arate profesionist și să îți aducă cereri?",
    subtitle: "Spune-mi ce vrei să construiești și îți trimit o recomandare clară pentru structură, pagini și pașii următori.",
    content: "",
    button_primary_text: "Cere ofertă gratuită",
    button_primary_url: "/contact",
    button_secondary_text: "",
    button_secondary_url: "",
    image_url: "",
    extra_json: {},
    sort_order: 10,
    is_active: 1
  }
];

const services = [
  {
    title: "Site de prezentare",
    slug: "site-de-prezentare",
    short_description: "Pentru firme, freelanceri și afaceri locale care vor o imagine profesionistă online.",
    long_description: "Site complet de prezentare cu pagini esențiale și structură orientată spre cereri.",
    icon: "layout",
    includes_json: ["Homepage", "Pagini servicii", "Despre", "Contact", "Formular cerere ofertă", "Optimizare mobil"],
    suitable_for: "Firme locale, freelanceri, servicii profesionale",
    cta_text: "Solicită ofertă pentru site de prezentare",
    cta_url: "/contact",
    sort_order: 1,
    is_featured: 1,
    is_active: 1,
    seo_title: "Site de prezentare profesional",
    seo_description: "Website de prezentare clar, rapid și orientat spre conversie."
  },
  {
    title: "Landing page de vânzare",
    slug: "landing-page-vanzare",
    short_description: "Pentru promovarea unui produs, serviciu, eveniment, curs sau ofertă specială.",
    long_description: "Landing page persuasiv pentru campanii și lead generation.",
    icon: "mouse-pointer",
    includes_json: ["Structură persuasivă", "Secțiuni beneficii", "CTA-uri clare", "FAQ", "Formular / WhatsApp", "Optimizare reclame"],
    suitable_for: "Campanii ads, lansări, produse digitale",
    cta_text: "Solicită ofertă pentru landing page",
    cta_url: "/contact",
    sort_order: 2,
    is_featured: 1,
    is_active: 1,
    seo_title: "Landing page care convertește",
    seo_description: "Pagini de vânzare optimizate pentru click și conversie."
  },
  {
    title: "Magazin online simplu",
    slug: "magazin-online-simplu",
    short_description: "Pentru produse fizice, produse digitale sau servicii vândute online.",
    long_description: "Structură eCommerce simplă și clară, potrivită pentru lansare rapidă.",
    icon: "shopping-bag",
    includes_json: ["Structură categorii", "Pagini produs", "Coș și checkout", "Metode de plată", "Design responsive", "SEO de bază"],
    suitable_for: "Magazine la început, produse artizanale, produse digitale",
    cta_text: "Solicită ofertă pentru magazin online",
    cta_url: "/contact",
    sort_order: 3,
    is_featured: 1,
    is_active: 1,
    seo_title: "Magazin online simplu",
    seo_description: "Magazin online clar și optimizat pentru vânzări."
  },
  {
    title: "Redesign / optimizare site existent",
    slug: "redesign-optimizare-site",
    short_description: "Pentru site-uri care arată învechit, se mișcă greu sau nu aduc rezultate.",
    long_description: "Audit rapid și refacere structură/design pentru rezultate mai bune.",
    icon: "refresh-cw",
    includes_json: ["Curățare design", "Îmbunătățire UX", "Optimizare viteză", "Structură clară", "SEO on-page de bază"],
    suitable_for: "Site-uri existente cu rată mică de conversie",
    cta_text: "Solicită ofertă pentru redesign",
    cta_url: "/contact",
    sort_order: 4,
    is_featured: 1,
    is_active: 1,
    seo_title: "Redesign și optimizare site",
    seo_description: "Refacere site existent cu accent pe claritate, viteză și conversie."
  }
];

const portfolio = [
  {
    title: "LaserFilesPro",
    slug: "laserfilespro",
    project_type: "Landing page software",
    short_description: "Platformă pentru promovarea unui software desktop dedicat creatorilor de fișiere laser-ready.",
    objective: "Poziționare clară și activare trial.",
    built_items_json: ["Landing page produs", "Structură de trial", "Poziționare pentru creatori", "Secțiuni features și beneficii"],
    results: "Claritate mai bună a ofertei și traseu simplu spre activare.",
    technologies_json: ["HTML", "CSS", "JavaScript"],
    image_url: "",
    project_url: "",
    sort_order: 1,
    is_featured: 1,
    is_active: 1,
    seo_title: "LaserFilesPro - studiu de caz",
    seo_description: "Landing page software orientat spre trial și conversie."
  },
  {
    title: "BioBuddy",
    slug: "biobuddy",
    project_type: "Site conținut + monetizare",
    short_description: "Site de conținut și monetizare în nișa health & wellness.",
    objective: "Creștere audiență și lead magnets.",
    built_items_json: ["Structură blog", "Lead magnets", "Ghiduri descărcabile", "Flux monetizare"],
    results: "Bază pentru trafic organic și afiliere.",
    technologies_json: ["HTML", "CSS", "JavaScript"],
    image_url: "",
    project_url: "",
    sort_order: 2,
    is_featured: 1,
    is_active: 1,
    seo_title: "BioBuddy - studiu de caz",
    seo_description: "Site de conținut cu focus pe captare lead-uri și monetizare."
  },
  {
    title: "LunarSoulMap",
    slug: "lunarsoulmap",
    project_type: "Landing page affiliate",
    short_description: "Landing page de promovare pentru ofertă affiliate, construită pentru conversie.",
    objective: "Conversie din trafic social.",
    built_items_json: ["Copy persuasiv", "Structură de vânzare", "CTA-uri clare", "Design orientat spre click"],
    results: "Flux rapid spre click și acțiune.",
    technologies_json: ["HTML", "CSS", "JavaScript"],
    image_url: "",
    project_url: "",
    sort_order: 3,
    is_featured: 1,
    is_active: 1,
    seo_title: "LunarSoulMap - studiu de caz",
    seo_description: "Landing page affiliate orientat spre conversie."
  },
  {
    title: "Mantra Decor",
    slug: "mantra-decor",
    project_type: "Concept eCommerce",
    short_description: "Concept eCommerce pentru produse personalizate și decoruri handmade.",
    objective: "Structură clară pentru vânzare online.",
    built_items_json: ["Structură magazin", "Categorii produse", "SEO produse", "Design brand artizanal"],
    results: "Experiență mobilă mai clară și arhitectură pregătită de conversie.",
    technologies_json: ["HTML", "CSS", "JavaScript"],
    image_url: "",
    project_url: "",
    sort_order: 4,
    is_featured: 1,
    is_active: 1,
    seo_title: "Mantra Decor - concept",
    seo_description: "Concept eCommerce pentru produse artizanale."
  }
];

const packages = [
  {
    name: "Start",
    slug: "start",
    short_description: "Pentru cei care au nevoie rapid de o prezență online profesionistă.",
    price_from: 1200,
    show_price: 0,
    features_json: ["Site one-page", "Design responsive", "Formular contact", "Buton WhatsApp", "SEO de bază"],
    cta_text: "Cere ofertă pentru Start",
    cta_url: "/contact?pachet=Start",
    sort_order: 1,
    is_recommended: 0,
    is_active: 1
  },
  {
    name: "Business",
    slug: "business",
    short_description: "Pentru firme care au nevoie de un site complet de prezentare.",
    price_from: 2500,
    show_price: 0,
    features_json: ["4-6 pagini", "Structură servicii", "Texte optimizate", "Formular ofertă", "SEO on-page", "Optimizare mobil"],
    cta_text: "Cere ofertă pentru Business",
    cta_url: "/contact?pachet=Business",
    sort_order: 2,
    is_recommended: 1,
    is_active: 1
  },
  {
    name: "Premium",
    slug: "premium",
    short_description: "Pentru proiecte care au nevoie de strategie, conversie și conținut mai bine construit.",
    price_from: 4500,
    show_price: 0,
    features_json: ["Site complet", "Structură conversie", "Copywriting", "SEO de bază", "Studii de caz", "Lead forms", "Optimizare viteză"],
    cta_text: "Cere ofertă pentru Premium",
    cta_url: "/contact?pachet=Premium",
    sort_order: 3,
    is_recommended: 0,
    is_active: 1
  }
];

const faqs = [
  {
    question: "Cât costă un site?",
    answer: "Depinde de complexitate, numărul de pagini, funcționalități și conținut. După ce îmi spui ce ai nevoie, îți pot trimite o ofertă clară.",
    sort_order: 1,
    is_active: 1
  },
  {
    question: "Pot să îmi administrez singur site-ul după lansare?",
    answer: "Da. Pot construi site-ul astfel încât să poți edita texte, imagini și pagini importante fără cunoștințe tehnice avansate.",
    sort_order: 2,
    is_active: 1
  },
  {
    question: "Mă ajuți și cu textele?",
    answer: "Da. Pot ajuta cu structurarea și scrierea textelor astfel încât site-ul să fie clar, convingător și potrivit pentru publicul tău.",
    sort_order: 3,
    is_active: 1
  },
  {
    question: "Site-ul va arăta bine pe telefon?",
    answer: "Da. Designul responsive este obligatoriu. Majoritatea vizitatorilor intră de pe mobil, deci experiența pe telefon este prioritară.",
    sort_order: 4,
    is_active: 1
  },
  {
    question: "Mă ajuți cu domeniul și hostingul?",
    answer: "Da. Te pot ghida cu alegerea domeniului, hostingului și configurarea de bază.",
    sort_order: 5,
    is_active: 1
  }
];

const calculatorOptions = [
  ["site_type", "Ce tip de site ai nevoie?", "Site one-page", "site-one-page", "single", 0, 1200, 1],
  ["site_type", "Ce tip de site ai nevoie?", "Landing page de vânzare", "landing-page-vanzare", "single", 0, 1500, 2],
  ["site_type", "Ce tip de site ai nevoie?", "Site de prezentare", "site-de-prezentare", "single", 0, 2500, 3],
  ["site_type", "Ce tip de site ai nevoie?", "Magazin online simplu", "magazin-online-simplu", "single", 0, 4000, 4],
  ["site_type", "Ce tip de site ai nevoie?", "Redesign site existent", "redesign-site", "single", 0, 1800, 5],
  ["site_type", "Ce tip de site ai nevoie?", "Nu sunt sigur", "nu-sunt-sigur", "single", 0, 2500, 6],

  ["pages", "Câte pagini estimezi că va avea site-ul?", "1 pagină", "1-pagina", "single", 0, 0, 1],
  ["pages", "Câte pagini estimezi că va avea site-ul?", "2-4 pagini", "2-4-pagini", "single", 600, 0, 2],
  ["pages", "Câte pagini estimezi că va avea site-ul?", "5-7 pagini", "5-7-pagini", "single", 1200, 0, 3],
  ["pages", "Câte pagini estimezi că va avea site-ul?", "8-12 pagini", "8-12-pagini", "single", 2000, 0, 4],
  ["pages", "Câte pagini estimezi că va avea site-ul?", "Peste 12 pagini", "peste-12-pagini", "single", 3000, 0, 5],

  ["content", "Ai textele pregătite?", "Da, am textele pregătite", "texte-pregatite", "single", 0, 0, 1],
  ["content", "Ai textele pregătite?", "Am idei, dar trebuie aranjate", "idei-aranjate", "single", 500, 0, 2],
  ["content", "Ai textele pregătite?", "Vreau texte scrise de la zero", "texte-zero", "single", 1200, 0, 3],

  ["features", "Ce funcționalități extra ai nevoie?", "Formular de contact avansat", "formular-avansat", "checkbox", 300, 0, 1],
  ["features", "Ce funcționalități extra ai nevoie?", "Buton WhatsApp + tracking click", "whatsapp-tracking", "checkbox", 150, 0, 2],
  ["features", "Ce funcționalități extra ai nevoie?", "Galerie / portofoliu", "galerie-portofoliu", "checkbox", 400, 0, 3],
  ["features", "Ce funcționalități extra ai nevoie?", "Blog", "blog", "checkbox", 700, 0, 4],
  ["features", "Ce funcționalități extra ai nevoie?", "Sistem programări", "sistem-programari", "checkbox", 900, 0, 5],
  ["features", "Ce funcționalități extra ai nevoie?", "Newsletter / Mailchimp", "newsletter-mailchimp", "checkbox", 500, 0, 6],
  ["features", "Ce funcționalități extra ai nevoie?", "Integrare plăți online", "plati-online", "checkbox", 1200, 0, 7],
  ["features", "Ce funcționalități extra ai nevoie?", "Magazin cu produse", "magazin-produse", "checkbox", 1500, 0, 8],
  ["features", "Ce funcționalități extra ai nevoie?", "Multilingv RO/EN", "multilingv-ro-en", "checkbox", 1000, 0, 9],
  ["features", "Ce funcționalități extra ai nevoie?", "SEO de bază extins", "seo-extins", "checkbox", 800, 0, 10],
  ["features", "Ce funcționalități extra ai nevoie?", "Optimizare viteză extra", "viteza-extra", "checkbox", 600, 0, 11],
  ["features", "Ce funcționalități extra ai nevoie?", "Training scurt după livrare", "training-scurt", "checkbox", 300, 0, 12],

  ["design_level", "Ce nivel de design îți dorești?", "Design simplu și curat", "design-simplu", "single", 0, 0, 1],
  ["design_level", "Ce nivel de design îți dorești?", "Design premium personalizat", "design-premium", "single", 1000, 0, 2],
  ["design_level", "Ce nivel de design îți dorești?", "Design avansat cu animații și secțiuni speciale", "design-avansat", "single", 2000, 0, 3],

  ["deadline", "Cât de repede ai nevoie de site?", "Nu mă grăbesc", "nu-ma-grabesc", "single", 0, 0, 1],
  ["deadline", "Cât de repede ai nevoie de site?", "În 2-3 săptămâni", "2-3-saptamani", "single", 0, 0, 2],
  ["deadline", "Cât de repede ai nevoie de site?", "În 7-10 zile", "7-10-zile", "single", 700, 0, 3],
  ["deadline", "Cât de repede ai nevoie de site?", "Urgent, sub 7 zile", "urgent-sub-7", "single", 1500, 0, 4]
];

const seoPages = [
  ["index", "Acasă", "Creare Site-uri Web Profesionale | Marius Boiti Studio", "Construiesc site-uri moderne, rapide și orientate spre conversie pentru afaceri mici, freelanceri și proiecte digitale. Calculează estimarea proiectului tău.", "https://mariusboiti.ro/"],
  ["servicii", "Servicii", "Servicii Web Design și Creare Site-uri | Marius Boiti Studio", "Site-uri de prezentare, landing page-uri, magazine online simple și redesign pentru afaceri care vor o prezență online profesionistă.", "https://mariusboiti.ro/servicii"],
  ["portofoliu", "Portofoliu", "Portofoliu Web Design | Proiecte și Studii de Caz", "Vezi exemple de proiecte digitale, landing page-uri, site-uri de conținut și concepte eCommerce construite cu structură clară și design modern.", "https://mariusboiti.ro/portofoliu"],
  ["calculator-pret", "Calculator preț", "Calculator Preț Site Web | Marius Boiti Studio", "Calculează rapid costul estimativ al site-ului tău și vezi dacă proiectul se potrivește cu bugetul disponibil.", "https://mariusboiti.ro/calculator-pret"],
  ["despre", "Despre", "Despre Marius Boiti | Web Design și Site-uri Profesionale", "Află cum lucrez și de ce construiesc site-uri clare, rapide și orientate spre conversie pentru afaceri mici și proiecte digitale.", "https://mariusboiti.ro/despre"],
  ["contact", "Contact", "Contact Marius Boiti Studio | Întrebări generale și ofertă finală", "Pentru site-uri noi folosește calculatorul de preț, iar pentru întrebări generale trimite un mesaj direct.", "https://mariusboiti.ro/contact"],
  ["proces", "Proces", "Proces de Creare Site | Marius Boiti Studio", "Descoperă procesul în 6 pași pentru construirea unui site clar, modern și orientat spre conversie, de la strategie până la lansare.", "https://mariusboiti.ro/proces"],
  ["blog", "Blog", "Blog Web Design și SEO | Marius Boiti Studio", "Idei, ghiduri și explicații simple despre site-uri, web design, SEO și prezență online pentru afaceri mici.", "https://mariusboiti.ro/blog"],
  ["blog-articol", "Articol Blog", "Articol Blog | Marius Boiti Studio", "Articole practice despre creare site-uri, SEO și conversie pentru antreprenori.", "https://mariusboiti.ro/blog"]
];

const blogCategories = [
  { name: "Web Design", slug: "web-design", description: "Design modern, UX și structură clară pentru site-uri de business.", sort_order: 1, is_active: 1 },
  { name: "SEO", slug: "seo", description: "Optimizare on-page, conținut și vizibilitate organică.", sort_order: 2, is_active: 1 },
  { name: "Creare site", slug: "creare-site", description: "Ghiduri practice despre pașii de construire a unui site eficient.", sort_order: 3, is_active: 1 },
  { name: "Landing Page", slug: "landing-page", description: "Structuri de landing page orientate spre conversie.", sort_order: 4, is_active: 1 },
  { name: "Magazin Online", slug: "magazin-online", description: "Bune practici pentru magazine online simple și eficiente.", sort_order: 5, is_active: 1 },
  { name: "Ghiduri pentru afaceri mici", slug: "ghiduri-afaceri-mici", description: "Recomandări simple pentru prezența online a business-urilor locale.", sort_order: 6, is_active: 1 }
];

const blogPosts = [
  {
    title: "Cât costă un site de prezentare în România?",
    slug: "cat-costa-un-site-de-prezentare-in-romania",
    excerpt: "Află ce influențează bugetul pentru un site de prezentare și cum poți stabili o estimare realistă înainte de ofertă.",
    content: `
      <p>Întrebarea „cât costă un site de prezentare” apare în aproape fiecare discuție inițială. Prețul final depinde de structură, numărul de pagini, nivelul de design, conținut și funcționalități.</p>
      <h2>Ce influențează costul unui site de prezentare</h2>
      <p>În practică, costul crește odată cu claritatea obiectivului și complexitatea implementării. Un one-page simplu este diferit de un site complet cu mai multe servicii și formulare personalizate.</p>
      <ul>
        <li>număr de pagini și secțiuni</li>
        <li>calitatea textelor și a imaginilor</li>
        <li>nivelul de personalizare vizuală</li>
        <li>integrarea cu formulare, tracking sau newsletter</li>
      </ul>
      <h2>Intervale orientative de buget</h2>
      <p>Pentru proiecte mici, bugetul poate porni de la un pachet de bază. Pentru un site cu structură completă, design premium și optimizare, intervalul este mai mare.</p>
      <h3>Când ai nevoie de un buget mai mare</h3>
      <p>Dacă ai nevoie de copywriting, structură SEO, pagini multiple, integrare lead forms și optimizare de viteză, proiectul intră într-o zonă premium.</p>
      <h2>FAQ</h2>
      <h3>Pot lansa întâi o versiune simplă?</h3>
      <p>Da. Este o strategie bună: lansare rapidă + extinderi în etape.</p>
      <p>Dacă vrei o estimare personalizată, folosește calculatorul de preț și vezi imediat intervalul potrivit proiectului tău.</p>
    `,
    status: "published",
    featured_image: "",
    featured_image_alt: "",
    category_slug: "creare-site",
    tags_json: ["cost site", "site de prezentare", "buget web design"],
    focus_keyword: "cât costă un site de prezentare",
    seo_title: "Cât costă un site de prezentare în România? Ghid practic",
    seo_description: "Vezi ce influențează prețul unui site de prezentare și cum obții o estimare realistă pentru afacerea ta.",
    published_at: new Date().toISOString()
  },
  {
    title: "Ce trebuie să conțină un site pentru o afacere mică?",
    slug: "ce-trebuie-sa-contina-un-site-pentru-o-afacere-mica",
    excerpt: "Un ghid clar cu secțiunile esențiale care transformă un site simplu într-un instrument real de vânzare.",
    content: `
      <p>Un site pentru afacere mică trebuie să transmită rapid cine ești, ce oferi și cum poate clientul să ia legătura cu tine.</p>
      <h2>Secțiuni esențiale</h2>
      <ul>
        <li>homepage cu mesaj clar</li>
        <li>pagină de servicii cu beneficii</li>
        <li>despre + elemente de încredere</li>
        <li>contact cu formular simplu</li>
      </ul>
      <h2>Structură pentru conversie</h2>
      <p>Fiecare secțiune trebuie să ducă spre o acțiune: cerere ofertă, apel sau mesaj.</p>
      <h3>Greșeli comune</h3>
      <p>Texte vagi, lipsa CTA-urilor și design aglomerat sunt motive frecvente pentru care un site nu convertește.</p>
      <h2>FAQ</h2>
      <h3>Este suficient un one-page?</h3>
      <p>Pentru unele servicii locale da, dar dacă ai oferte multiple, un site cu pagini dedicate performează mai bine.</p>
    `,
    status: "draft",
    featured_image: "",
    featured_image_alt: "",
    category_slug: "ghiduri-afaceri-mici",
    tags_json: ["afacere mică", "structură site", "conversie"],
    focus_keyword: "site pentru afacere mică",
    seo_title: "Site pentru afacere mică: ce trebuie să conțină",
    seo_description: "Descoperă secțiunile esențiale pentru un site de afacere mică orientat spre încredere și conversie.",
    published_at: null
  },
  {
    title: "Landing page sau site de prezentare: ce alegi pentru proiectul tău?",
    slug: "landing-page-sau-site-de-prezentare-ce-alegi",
    excerpt: "Comparăm cele două opțiuni ca să alegi formatul potrivit pentru obiectivele și bugetul tău.",
    content: `
      <p>Diferența dintre landing page și site de prezentare ține de obiectiv. Un landing page vinde o ofertă specifică. Un site de prezentare susține imaginea generală a afacerii.</p>
      <h2>Când alegi landing page</h2>
      <p>Landing page-ul este ideal pentru campanii ads, lansări, servicii punctuale sau validare rapidă.</p>
      <h2>Când alegi site de prezentare</h2>
      <p>Site-ul de prezentare este potrivit când ai servicii multiple, vrei poziționare pe termen lung și SEO constant.</p>
      <h3>Poți combina cele două?</h3>
      <p>Da. Multe proiecte performante folosesc site-ul principal + landing page-uri dedicate campaniilor.</p>
      <h2>FAQ</h2>
      <h3>Care variantă este mai ieftină?</h3>
      <p>De regulă, landing page-ul are cost mai mic inițial, dar depinde de nivelul de personalizare.</p>
    `,
    status: "draft",
    featured_image: "",
    featured_image_alt: "",
    category_slug: "landing-page",
    tags_json: ["landing page", "site de prezentare", "strategie web"],
    focus_keyword: "landing page sau site de prezentare",
    seo_title: "Landing page sau site de prezentare: ghid de alegere",
    seo_description: "Vezi diferențele dintre landing page și site de prezentare și alege varianta corectă pentru proiectul tău.",
    published_at: null
  }
];

async function clearTables(db) {
  const tables = [
    "admins",
    "site_settings",
    "homepage_sections",
    "services",
    "portfolio_projects",
    "packages",
    "faq_items",
    "calculator_options",
    "calculator_settings",
    "leads",
    "seo_pages",
    "media",
    "blog_posts",
    "blog_categories",
    "ai_settings"
  ];

  for (const table of tables) {
    await db.run(`DELETE FROM ${table}`);
  }
}

async function seedDatabase() {
  const db = await getDb();

  await clearTables(db);

  const adminEmail = process.env.ADMIN_EMAIL || "marius.boiti@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "change-this-password";
  const adminName = process.env.ADMIN_NAME || "Marius";

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await db.run(
    `INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)`,
    [adminName, adminEmail, passwordHash]
  );

  await db.run(
    `INSERT INTO site_settings
      (site_name, tagline, email, phone, whatsapp, facebook_url, instagram_url, linkedin_url, logo_text, logo_image, favicon, default_meta_title, default_meta_description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Marius Boiti Studio",
      "Site-uri clare, rapide și orientate spre conversie.",
      "marius.boiti@gmail.com",
      "",
      "",
      "",
      "",
      "",
      "Marius Boiti Studio",
      "",
      "",
      "Creare Site-uri Web Profesionale | Marius Boiti Studio",
      "Construiesc site-uri moderne, rapide și orientate spre conversie pentru afaceri mici, freelanceri și proiecte digitale."
    ]
  );

  for (const section of homepageSections) {
    await db.run(
      `INSERT INTO homepage_sections
        (section_key, title, subtitle, content, button_primary_text, button_primary_url, button_secondary_text, button_secondary_url, image_url, extra_json, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        section.section_key,
        section.title,
        section.subtitle,
        section.content,
        section.button_primary_text,
        section.button_primary_url,
        section.button_secondary_text,
        section.button_secondary_url,
        section.image_url,
        stringifyJsonField(section.extra_json),
        section.sort_order,
        section.is_active
      ]
    );
  }

  for (const item of services) {
    await db.run(
      `INSERT INTO services
        (title, slug, short_description, long_description, icon, includes_json, suitable_for, cta_text, cta_url, sort_order, is_featured, is_active, seo_title, seo_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.title,
        item.slug,
        item.short_description,
        item.long_description,
        item.icon,
        stringifyJsonField(item.includes_json),
        item.suitable_for,
        item.cta_text,
        item.cta_url,
        item.sort_order,
        item.is_featured,
        item.is_active,
        item.seo_title,
        item.seo_description
      ]
    );
  }

  for (const item of portfolio) {
    await db.run(
      `INSERT INTO portfolio_projects
        (title, slug, project_type, short_description, objective, built_items_json, results, technologies_json, image_url, project_url, sort_order, is_featured, is_active, seo_title, seo_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.title,
        item.slug,
        item.project_type,
        item.short_description,
        item.objective,
        stringifyJsonField(item.built_items_json),
        item.results,
        stringifyJsonField(item.technologies_json),
        item.image_url,
        item.project_url,
        item.sort_order,
        item.is_featured,
        item.is_active,
        item.seo_title,
        item.seo_description
      ]
    );
  }

  for (const item of packages) {
    await db.run(
      `INSERT INTO packages
        (name, slug, short_description, price_from, show_price, features_json, cta_text, cta_url, sort_order, is_recommended, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.name,
        item.slug,
        item.short_description,
        item.price_from,
        item.show_price,
        stringifyJsonField(item.features_json),
        item.cta_text,
        item.cta_url,
        item.sort_order,
        item.is_recommended,
        item.is_active
      ]
    );
  }

  for (const item of faqs) {
    await db.run(
      `INSERT INTO faq_items (question, answer, sort_order, is_active) VALUES (?, ?, ?, ?)`,
      [item.question, item.answer, item.sort_order, item.is_active]
    );
  }

  for (const option of calculatorOptions) {
    await db.run(
      `INSERT INTO calculator_options (step_key, step_title, option_label, option_value, option_type, price_add, base_price, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      option
    );
  }

  await db.run(
    `INSERT INTO calculator_settings
      (max_multiplier, round_to, start_threshold, business_threshold, premium_threshold, custom_threshold, result_intro_text, under_budget_message, start_message, business_message, premium_message, custom_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1.2,
      100,
      2000,
      4500,
      7000,
      7000,
      "Pe baza răspunsurilor tale, proiectul se încadrează aproximativ în acest buget.",
      "Dacă estimarea este peste bugetul disponibil, putem simplifica prima versiune a site-ului și adăuga funcționalități ulterior.",
      "Acesta pare un proiect potrivit pentru un site simplu sau one-page. Este o variantă bună dacă vrei o prezență online rapidă și profesionistă.",
      "Acesta pare un proiect potrivit pentru un site de prezentare complet, cu structură clară și funcționalități esențiale.",
      "Acesta pare un proiect mai complex, potrivit pentru un site premium, cu strategie, design personalizat și funcționalități avansate.",
      "Acesta pare un proiect complex, care necesită o ofertă personalizată. Putem stabili împreună prioritățile și o etapizare."
    ]
  );

  for (const row of seoPages) {
    await db.run(
      `INSERT INTO seo_pages (page_key, page_title, meta_title, meta_description, og_title, og_description, og_image, canonical_url, robots)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [row[0], row[1], row[2], row[3], row[2], row[3], "", row[4] || "", "index,follow"]
    );
  }

  for (const category of blogCategories) {
    await db.run(
      `INSERT INTO blog_categories (name, slug, description, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category.name, category.slug, category.description, category.sort_order, category.is_active, new Date().toISOString(), new Date().toISOString()]
    );
  }

  for (const post of blogPosts) {
    const category = await db.get("SELECT id FROM blog_categories WHERE slug = ?", [post.category_slug]);
    await db.run(
      `INSERT INTO blog_posts
        (title, slug, excerpt, content, status, featured_image, featured_image_alt, category_id, tags_json, focus_keyword, seo_title, seo_description, og_title, og_description, og_image, canonical_url, robots, seo_score, seo_analysis_json, reading_time_minutes, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        post.title,
        post.slug,
        post.excerpt,
        post.content,
        post.status,
        post.featured_image,
        post.featured_image_alt,
        category?.id || null,
        stringifyJsonField(post.tags_json),
        post.focus_keyword,
        post.seo_title,
        post.seo_description,
        post.seo_title,
        post.seo_description,
        post.featured_image || "",
        `https://mariusboiti.ro/blog/${post.slug}`,
        "index,follow",
        null,
        null,
        Math.max(1, Math.ceil(post.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 220)),
        post.published_at,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
  }

  const aiProvider = process.env.AI_DEFAULT_PROVIDER === "openai" ? "openai" : "gemini";
  const aiModel = aiProvider === "openai"
    ? (process.env.OPENAI_MODEL || "gpt-4o-mini")
    : (process.env.GEMINI_MODEL || "gemini-2.5-flash");
  await db.run(
    `INSERT INTO ai_settings (provider, model, temperature, max_tokens, system_prompt, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      aiProvider,
      aiModel,
      0.7,
      1200,
      "Ești copywriter SEO în limba română. Scrii clar, prietenos-profesionist și orientat spre rezultate.",
      new Date().toISOString(),
      new Date().toISOString()
    ]
  );
}

async function main() {
  const args = process.argv.slice(2);
  const initOnly = args.includes("--init-only");
  const seedOnly = args.includes("--seed-only");
  const reset = args.includes("--reset");

  if (reset) {
    await resetDatabase();
    await seedDatabase();
    console.log("Database reset + seed completed.");
    return;
  }

  if (initOnly) {
    await initSchema();
    console.log("Database schema initialized.");
    return;
  }

  if (seedOnly) {
    await initSchema();
    await seedDatabase();
    console.log("Database seeded.");
    return;
  }

  await initSchema();
  await seedDatabase();
  console.log("Database initialized and seeded.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
