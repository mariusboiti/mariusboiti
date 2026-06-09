require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

const { getDb, initSchema } = require("./database"); // getDb used in /health
const { requireAuth } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/site-settings");
const pagesRoutes = require("./routes/pages");
const homepageRoutes = require("./routes/homepage");
const servicesRoutes = require("./routes/services");
const portfolioRoutes = require("./routes/portfolio");
const packagesRoutes = require("./routes/packages");
const faqRoutes = require("./routes/faq");
const calculatorRoutes = require("./routes/calculator");
const leadsRoutes = require("./routes/leads");
const mediaRoutes = require("./routes/media");
const seoRoutes = require("./routes/seo");
const backupRoutes = require("./routes/backup");
const blogRoutes = require("./routes/blog");
const projectLogosRoutes = require("./routes/project-logos");
const reviewsRoutes = require("./routes/reviews");
const chatRoutes = require("./routes/chat");

const app = express();
app.set("trust proxy", 1); // Passenger/LiteSpeed proxy on shared hosting
const PORT = Number(process.env.PORT || 3001);
const publicSiteUrl = process.env.PUBLIC_SITE_URL || "http://localhost:3000";
const jwtSecret = process.env.JWT_SECRET || "change-this-secret";
const siteBaseUrl = (process.env.SITE_BASE_URL || "https://mariusboiti.ro").replace(/\/+$/, "");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Prea multe încercări de login. Reîncearcă mai târziu." }
});

const leadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Prea multe cereri trimise într-un timp scurt." }
});

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin: [publicSiteUrl, /http:\/\/127\.0\.0\.1:\d+$/, /http:\/\/localhost:\d+$/],
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

app.use("/api", (_req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

app.use("/uploads", express.static(path.resolve(process.cwd(), "backend/uploads")));

app.use("/api/auth/login", loginLimiter);
app.use("/api/public/leads", leadLimiter);

app.use("/api/auth", authRoutes);

const publicRouter = express.Router();
publicRouter.use(settingsRoutes.publicRouter);
publicRouter.use(homepageRoutes.publicRouter);
publicRouter.use(servicesRoutes.publicRouter);
publicRouter.use(portfolioRoutes.publicRouter);
publicRouter.use(packagesRoutes.publicRouter);
publicRouter.use(faqRoutes.publicRouter);
publicRouter.use(calculatorRoutes.publicRouter);
publicRouter.use(leadsRoutes.publicRouter);
publicRouter.use(seoRoutes.publicRouter);
publicRouter.use(mediaRoutes.publicRouter);
publicRouter.use(pagesRoutes.publicRouter);
publicRouter.use(backupRoutes.publicRouter);
publicRouter.use(blogRoutes.publicRouter);
publicRouter.use(projectLogosRoutes.publicRouter);
publicRouter.use(reviewsRoutes.publicRouter);
publicRouter.use(chatRoutes.publicRouter);

app.use("/api/public", publicRouter);

const adminRouter = express.Router();
adminRouter.use(requireAuth);
adminRouter.use(settingsRoutes.adminRouter);
adminRouter.use(homepageRoutes.adminRouter);
adminRouter.use(servicesRoutes.adminRouter);
adminRouter.use(portfolioRoutes.adminRouter);
adminRouter.use(packagesRoutes.adminRouter);
adminRouter.use(faqRoutes.adminRouter);
adminRouter.use(calculatorRoutes.adminRouter);
adminRouter.use(leadsRoutes.adminRouter);
adminRouter.use(seoRoutes.adminRouter);
adminRouter.use(mediaRoutes.adminRouter);
adminRouter.use(pagesRoutes.adminRouter);
adminRouter.use(backupRoutes.adminRouter);
adminRouter.use(blogRoutes.adminRouter);
adminRouter.use(projectLogosRoutes.adminRouter);
adminRouter.use(reviewsRoutes.adminRouter);
adminRouter.use(chatRoutes.adminRouter);

app.use("/api/admin", adminRouter);

function isAdminAuthenticated(req) {
  const token = req.cookies?.admin_token;
  if (!token) return false;

  try {
    jwt.verify(token, jwtSecret);
    return true;
  } catch (_error) {
    return false;
  }
}

function sanitizeSlug(value) {
  const slug = String(value || "").toLowerCase().trim();
  return /^[a-z0-9-]{1,140}$/.test(slug);
}

const adminRoot = path.resolve(process.cwd(), "admin");
if (fs.existsSync(adminRoot)) {
  app.use(
    "/admin/assets",
    express.static(path.join(adminRoot, "assets"), {
      setHeaders: (res, filePath) => {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");
        if (filePath.endsWith(".html")) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
        } else if (filePath.endsWith(".js")) {
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        } else if (filePath.endsWith(".css")) {
          res.setHeader("Content-Type", "text/css; charset=utf-8");
        }
      }
    })
  );

  app.get("/admin", (req, res) => {
    if (!isAdminAuthenticated(req)) {
      return res.redirect("/admin/login.html");
    }
    return res.redirect("/admin/dashboard.html");
  });

  app.get("/admin/*.html", (req, res, next) => {
    if (req.path.endsWith("/login.html")) return next();

    if (!isAdminAuthenticated(req)) {
      return res.redirect("/admin/login.html");
    }

    return next();
  });

app.use(
  "/admin",
  express.static(adminRoot, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
        }
      }
    })
  );
}

function xmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

app.get("/robots.txt", (_req, res) => {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /admin/",
    "",
    `Sitemap: ${siteBaseUrl}/sitemap.xml`
  ];
  res.type("text/plain; charset=utf-8");
  return res.send(lines.join("\n"));
});

app.get("/sitemap.xml", async (_req, res) => {
  try {
    const db = await getDb();
    const staticUrls = ["/", "/servicii", "/portofoliu", "/calculator-pret", "/proces", "/blog", "/contact", "/despre", "/web-design-cluj", "/servicii/brand-identitate", "/servicii/continut-copywriting", "/servicii/servicii-ai", "/servicii/audit-optimizare", "/servicii/mentenanta-suport"];
    const projects = await db.all("SELECT slug, updated_at FROM portfolio_projects WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
    const articles = await db.all("SELECT slug, updated_at, published_at FROM blog_posts WHERE status = 'published' ORDER BY COALESCE(published_at, created_at) DESC, id DESC");

    const urlNodes = [];
    for (const pathName of staticUrls) {
      urlNodes.push({
        loc: `${siteBaseUrl}${pathName === "/" ? "/" : pathName}`,
        lastmod: null
      });
    }
    for (const project of projects) {
      if (!project.slug) continue;
      urlNodes.push({
        loc: `${siteBaseUrl}/portofoliu/${encodeURIComponent(project.slug)}`,
        lastmod: project.updated_at || null
      });
    }
    for (const article of articles) {
      if (!article.slug) continue;
      urlNodes.push({
        loc: `${siteBaseUrl}/blog/${encodeURIComponent(article.slug)}`,
        lastmod: article.updated_at || article.published_at || null
      });
    }

    const urlset = urlNodes
      .map((entry) => {
        const lastmod = entry.lastmod ? `<lastmod>${xmlEscape(new Date(entry.lastmod).toISOString())}</lastmod>` : "";
        return `<url><loc>${xmlEscape(entry.loc)}</loc>${lastmod}</url>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    return res.send(xml);
  } catch (_error) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${xmlEscape(siteBaseUrl + "/")}</loc></url>
</urlset>`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    return res.send(xml);
  }
});

// Keep clean public URLs (/servicii) mapped to existing .html files when app is served via Passenger.
app.get(/^\/([a-z0-9-]+)\.html$/i, (req, res, next) => {
  const slug = String(req.params[0] || "").toLowerCase();
  if (slug === "index") return res.redirect(301, "/");
  if (["admin", "api", "assets", "backend", "uploads"].includes(slug)) return next();

  const htmlPath = path.resolve(process.cwd(), `${slug}.html`);
  if (fs.existsSync(htmlPath)) {
    return res.redirect(301, `/${slug}`);
  }
  return next();
});

app.use(
  express.static(path.resolve(process.cwd()), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
      }
    }
  })
);

app.get("/blog/:slug", (req, res, next) => {
  if (!sanitizeSlug(req.params.slug)) return next();
  const htmlPath = path.resolve(process.cwd(), "blog-articol.html");
  if (!fs.existsSync(htmlPath)) return next();
  return res.sendFile(htmlPath);
});

app.get("/portofoliu/:slug", (req, res, next) => {
  if (!sanitizeSlug(req.params.slug)) return next();
  const htmlPath = path.resolve(process.cwd(), "portofoliu-proiect.html");
  if (!fs.existsSync(htmlPath)) return next();
  return res.sendFile(htmlPath);
});

app.get(/^\/([a-z0-9-]+)\/?$/i, (req, res, next) => {
  const slug = String(req.params[0] || "").toLowerCase();
  if (["admin", "api", "assets", "backend", "uploads", "health"].includes(slug)) return next();

  const htmlPath = path.resolve(process.cwd(), `${slug}.html`);
  if (fs.existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }
  return next();
});

app.get("/health", async (_req, res) => {
  try {
    const db = await getDb();
    await db.get("SELECT 1");
    res.json({ ok: true, db: "ok" });
  } catch (_err) {
    res.status(503).json({ ok: false, db: "error" });
  }
});

// Global error handler — distinguishes client errors from server errors
// and never leaks raw DB error messages to the public.
app.use((err, req, res, _next) => {
  const isClientError = err.status && err.status >= 400 && err.status < 500;
  const status = err.status || (isClientError ? 400 : 500);
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd || status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} →`, err.message || err);
  }

  const message = isClientError && err.message
    ? err.message
    : "A apărut o eroare de server. Încearcă din nou.";

  return res.status(status).json({ error: message });
});

async function assertConfig() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-this-secret") {
    if (process.env.NODE_ENV === "production") {
      console.error("[FATAL] JWT_SECRET is not set or uses the default placeholder. Set a strong secret in .env before running in production.");
      process.exit(1);
    } else {
      console.warn("[WARN] JWT_SECRET is using the default placeholder. Set a strong secret in .env.");
    }
  }
}

async function bootstrap() {
  await assertConfig();
  await initSchema();

  app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Backend running on http://localhost:${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
