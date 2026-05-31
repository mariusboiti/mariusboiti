const { parseJsonField } = require("../database");
const { normalizeDeep } = require("./encoding");

function mapService(row) {
  if (!row) return row;
  return normalizeDeep({
    ...row,
    includes_json: parseJsonField(row.includes_json, []),
    is_featured: Boolean(row.is_featured),
    is_active: Boolean(row.is_active)
  });
}

function mapPortfolio(row) {
  if (!row) return row;
  const builtItemsRaw = parseJsonField(row.built_items_json, []);
  const builtItemsDetailedRaw = parseJsonField(row.built_items_detailed_json, []);
  const resultsItemsRaw = parseJsonField(row.results_items_json, []);
  const technologiesRaw = parseJsonField(row.technologies_json, []);
  const galleryRaw = parseJsonField(row.gallery_json, []);
  const sectionsRaw = parseJsonField(row.project_sections_json, {});

  const normalizeStringArray = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  };

  const normalizeDetailItems = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item, index) => {
        if (typeof item === "string") {
          const title = item.trim();
          if (!title) return null;
          return { title, description: "", icon: "", sort_order: index + 1 };
        }
        const title = String(item?.title || "").trim();
        const description = String(item?.description || "").trim();
        const icon = String(item?.icon || "").trim();
        const sort_order = Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index + 1;
        if (!title && !description) return null;
        return { title, description, icon, sort_order };
      })
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const normalizeResultItems = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item, index) => {
        if (typeof item === "string") {
          const title = item.trim();
          if (!title) return null;
          return { title, description: "", metric: "", label: "", sort_order: index + 1 };
        }
        const title = String(item?.title || "").trim();
        const description = String(item?.description || "").trim();
        const metric = String(item?.metric || "").trim();
        const label = String(item?.label || "").trim();
        const sort_order = Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index + 1;
        if (!title && !description && !metric && !label) return null;
        return { title, description, metric, label, sort_order };
      })
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const normalizeGallery = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item, index) => {
        if (typeof item === "string") {
          const url = item.trim();
          if (!url) return null;
          return { image_url: url, caption: "", alt_text: "", sort_order: index + 1 };
        }
        const image_url = String(item?.image_url || "").trim();
        const caption = String(item?.caption || "").trim();
        const alt_text = String(item?.alt_text || "").trim();
        const sort_order = Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index + 1;
        if (!image_url) return null;
        return { image_url, caption, alt_text, sort_order };
      })
      .filter(Boolean)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  const builtItemsDetailed = normalizeDetailItems(builtItemsDetailedRaw.length ? builtItemsDetailedRaw : builtItemsRaw);
  const builtItemsSimple = normalizeStringArray(
    builtItemsDetailed.length
      ? builtItemsDetailed.map((item) => item.title || item.description || "")
      : builtItemsRaw
  );

  return normalizeDeep({
    ...row,
    built_items_json: builtItemsSimple,
    built_items_detailed_json: builtItemsDetailed,
    results_items_json: normalizeResultItems(resultsItemsRaw),
    technologies_json: normalizeStringArray(technologiesRaw),
    gallery_json: normalizeGallery(galleryRaw),
    project_sections_json:
      sectionsRaw && typeof sectionsRaw === "object" && !Array.isArray(sectionsRaw) ? sectionsRaw : {},
    is_featured: Boolean(row.is_featured),
    is_active: Boolean(row.is_active)
  });
}

function mapPackage(row) {
  if (!row) return row;
  return normalizeDeep({
    ...row,
    features_json: parseJsonField(row.features_json, []),
    is_recommended: Boolean(row.is_recommended),
    is_active: Boolean(row.is_active),
    show_price: Boolean(row.show_price)
  });
}

function mapHomepageSection(row) {
  if (!row) return row;
  return normalizeDeep({
    ...row,
    extra_json: parseJsonField(row.extra_json, {}),
    is_active: Boolean(row.is_active)
  });
}

function mapLead(row) {
  if (!row) return row;
  return normalizeDeep({
    ...row,
    calculator_summary_json: parseJsonField(row.calculator_summary_json, null),
    budget_confirmed: Boolean(row.budget_confirmed)
  });
}

module.exports = {
  mapService,
  mapPortfolio,
  mapPackage,
  mapHomepageSection,
  mapLead
};
