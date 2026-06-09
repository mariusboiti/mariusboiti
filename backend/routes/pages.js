const express = require("express");
const { getDb } = require("../database");
const { asyncHandler } = require("../utils/asyncHandler");

const adminRouter = express.Router();
const publicRouter = express.Router();

adminRouter.get("/pages", asyncHandler(async (_req, res) => {
  const db = await getDb();
  const seoPages = await db.all("SELECT page_key, page_title FROM seo_pages ORDER BY page_key ASC");
  const homepageSections = await db.all("SELECT section_key, title FROM homepage_sections ORDER BY sort_order ASC");
  return res.json({ seoPages, homepageSections });
}));

adminRouter.get("/dashboard/stats", asyncHandler(async (_req, res) => {
  const db = await getDb();

  const [
    totalLeads,
    newLeads,
    activeServices,
    activePortfolio,
    recentLeads
  ] = await Promise.all([
    db.get("SELECT COUNT(*) AS total FROM leads"),
    db.get("SELECT COUNT(*) AS total FROM leads WHERE status = 'new'"),
    db.get("SELECT COUNT(*) AS total FROM services WHERE is_active = 1"),
    db.get("SELECT COUNT(*) AS total FROM portfolio_projects WHERE is_active = 1"),
    db.all("SELECT id, name, email, phone, status, created_at FROM leads ORDER BY created_at DESC LIMIT 5")
  ]);

  return res.json({
    totalLeads: totalLeads?.total || 0,
    newLeads: newLeads?.total || 0,
    activeServices: activeServices?.total || 0,
    activePortfolio: activePortfolio?.total || 0,
    recentLeads
  });
}));

module.exports = {
  publicRouter,
  adminRouter
};
