# Marius Boiti Studio - Backend + Admin CMS

 Website personal: https://mariusboiti.ro

## 1) Instalare

```bash
npm install
```

Copiază variabilele de mediu:

```bash
cp .env.example .env
```

Setează obligatoriu în `.env`:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `JWT_SECRET`

Pentru AI Assist în Blog:
- `OPENAI_API_KEY` (opțional)
- `OPENAI_MODEL`
- `GEMINI_API_KEY` (opțional)
- `GEMINI_MODEL`
- `AI_DEFAULT_PROVIDER`

## 2) Inițializare DB

```bash
npm run db:init
npm run db:seed
```

sau reset complet:

```bash
npm run db:reset
```

## 3) Pornire backend

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Backend pornește implicit pe `http://localhost:3001`.

## 4) Admin CMS

Admin login:
- URL: `http://localhost:3001/admin/login.html`
- Credențiale: din `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)

Paginile admin:
- Dashboard
- Setări site
- Homepage
- Servicii
- Portofoliu
- Pachete
- FAQ
- Calculator preț
- Lead-uri
- SEO
- Media
- Blog
- Categorii blog
- AI Settings
- Backup (export/import JSON)

## 5) API public

Endpoint-uri publice disponibile:
- `GET /api/public/settings`
- `GET /api/public/homepage`
- `GET /api/public/services`
- `GET /api/public/services/:slug`
- `GET /api/public/portfolio`
- `GET /api/public/portfolio/:slug`
- `GET /api/public/packages`
- `GET /api/public/faq`
- `GET /api/public/calculator`
- `GET /api/public/seo/:pageKey`
- `POST /api/public/leads`
- `GET /api/public/blog`
- `GET /api/public/blog/:slug`
- `GET /api/public/blog-categories`

Endpoint-uri admin pentru Blog:
- `GET /api/admin/blog/posts`
- `POST /api/admin/blog/posts`
- `GET /api/admin/blog/posts/:id`
- `PUT /api/admin/blog/posts/:id`
- `DELETE /api/admin/blog/posts/:id`
- `POST /api/admin/blog/posts/:id/analyze-seo`
- `GET /api/admin/blog/categories`
- `POST /api/admin/blog/categories`
- `PUT /api/admin/blog/categories/:id`
- `DELETE /api/admin/blog/categories/:id`
- `GET /api/admin/ai/settings`
- `PUT /api/admin/ai/settings`
- `POST /api/admin/ai/blog/generate-outline`
- `POST /api/admin/ai/blog/generate-article`
- `POST /api/admin/ai/blog/improve-content`
- `POST /api/admin/ai/blog/generate-seo`
- `POST /api/admin/ai/blog/fix-seo`
- `POST /api/admin/ai/blog/generate-image-prompt`

## 6) Schimbare parolă admin

Parola admin este creată din `.env` la seed.

Pași recomandați:
1. actualizează `ADMIN_PASSWORD` în `.env`
2. rulează `npm run db:seed` (sau `npm run db:reset` dacă vrei reset complet)

Alternativ, poți face update direct în tabela `admins` cu un hash bcrypt.

## 7) SMTP opțional (notificare lead)

Dacă setezi:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `LEAD_NOTIFY_EMAIL`

se trimite email la lead nou.

## 8) Repair encoding/diacritice (UTF-8)

Verificare texte suspecte în DB:

```bash
npm run db:check-encoding
```

Reparare diacritice corupte în DB:

```bash
npm run db:fix-diacritics
```

După reparare:
1. repornește backend-ul
2. fă hard refresh în browser (`Ctrl + F5`)
