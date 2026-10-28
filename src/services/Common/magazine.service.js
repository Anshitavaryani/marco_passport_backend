const httpStatus = require("http-status");
const { Op, UniqueConstraintError, literal } = require("sequelize");

const { Magazine } = require("../../models");
const ApiError = require("../../utils/ApiError");
const sequelize = require("../../config/central.db");

const STATUSES = ["draft", "published"];

// The page layouts of the admin's magazine builder
// (src/components/magazine-editor/layouts.ts in Marco_passport_admin).
const LAYOUTS = [
  "cover",
  "contents",
  "letter",
  "feature",
  "article",
  "text",
  "quote",
  "photo",
  "gallery",
  "guide",
  "ad_half",
  "ad_cards",
  "image_page",
  "back",
];

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
const MAX_TITLE_LENGTH = 150;
const MAX_SLUG_LENGTH = 160;
const MAX_PAGES = 200;
const MAX_PAGE_ID_LENGTH = 40;
// A 48-page issue with long stories is around 150 KB.
const MAX_PAGES_BYTES = 1024 * 1024;
// Far deeper than any layout goes (page > content > list > item > image).
const MAX_DEPTH = 20;
const MAX_ALT_LENGTH = 200;
const MAX_COVER_IMAGE_LENGTH = 255;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// "www.example.com" or "example.com/menu"; the site puts https:// in front.
const BARE_DOMAIN =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#]\S*)?$/i;

// Optional text: the column's size, and how messages name the field.
const OPTIONAL_TEXT = {
  issue_label: { max: 60, name: "The issue label" },
  season: { max: 60, name: "The season" },
  masthead: { max: 40, name: "The masthead" },
  tagline: { max: 200, name: "The tagline" },
  description: { max: 500, name: "The description" },
};

// The admin who saved last; null once their account is deleted.
const UPDATED_BY_NAME = literal(
  "(SELECT a.name FROM `admins` a WHERE a.id = `Magazine`.`updated_by` AND a.deleted_at IS NULL)"
);

// A row in the admin's list.
const SUMMARY_ATTRIBUTES = [
  "id",
  "title",
  "slug",
  "issue_label",
  "season",
  "publish_date",
  "status",
  "is_featured",
  "cover_image",
  "page_count",
  "created_at",
  "updated_at",
  [UPDATED_BY_NAME, "updated_by_name"],
];

// The issue as the admin edits it.
const FULL_ATTRIBUTES = {
  exclude: ["slug_active", "created_by", "deleted_by", "deleted_at"],
  include: [[UPDATED_BY_NAME, "updated_by_name"]],
};

// An issue in the site's lists; the reader also gets `pages`.
const PUBLIC_ATTRIBUTES = [
  "id",
  "title",
  "slug",
  "issue_label",
  "season",
  "publish_date",
  "masthead",
  "tagline",
  "description",
  "cover_image",
  "page_count",
  "is_featured",
];

// `id` last, so pages of results never overlap.
const NEWEST_FIRST = [
  ["publish_date", "DESC"],
  ["id", "DESC"],
];

const badRequest = (message) => new ApiError(httpStatus.BAD_REQUEST, message);
const notFound = () => new ApiError(httpStatus.NOT_FOUND, "Issue not found.");
// 400, not 409: the admin keeps 409 for the version check.
const slugTaken = (slug) =>
  badRequest(`Another issue already uses the address ${slug}.`);

const isPlainObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const parsePaging = (query) => ({
  limit: Math.min(
    Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  ),
  page: Math.max(parseInt(query.page, 10) || 1, 1),
});

const optionalText = (value, { max, name }) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw badRequest(`${name} must be text.`);
  const text = value.trim();
  if (text.length > max) {
    throw badRequest(`${name} can be at most ${max} characters.`);
  }
  return text || null;
};

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw badRequest("The publish date must be a date in YYYY-MM-DD format.");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw badRequest("The publish date is not a valid date.");
  }
  return value;
};

// Uploaded (/images/...), or a listing's photo picked from Explore, which
// can also be a full address.
const isImageSrc = (src) =>
  typeof src === "string" &&
  (src.startsWith("/images/") || /^https?:\/\//i.test(src));

const checkImage = (image, where) => {
  if (!isImageSrc(image.src)) {
    throw badRequest(
      `${where}: images must be uploaded (/images/...) or a web address (https://...).`
    );
  }
  ["focusX", "focusY"].forEach((key) => {
    const value = image[key];
    if (
      value !== undefined &&
      value !== null &&
      !(typeof value === "number" && value >= 0 && value <= 100)
    ) {
      throw badRequest(`${where}: an image's focus point must be from 0 to 100.`);
    }
  });
  if (
    image.alt !== undefined &&
    image.alt !== null &&
    (typeof image.alt !== "string" || image.alt.length > MAX_ALT_LENGTH)
  ) {
    throw badRequest(
      `${where}: an image's description can be at most ${MAX_ALT_LENGTH} characters.`
    );
  }
};

// Empty, a web address, a path on the site, mailto:, tel: or a bare domain;
// anything else (javascript: and so on) is refused. So are control
// characters: browsers drop tabs and line breaks, which would turn
// "/<tab>/example.com" into another site's address.
const isAllowedLink = (link) => {
  const value = link.trim();
  if (!value) return true;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  return (
    /^https?:\/\/\S/i.test(value) ||
    /^\/(?![/\\])/.test(value) ||
    /^(mailto|tel):\S/i.test(value) ||
    BARE_DOMAIN.test(value)
  );
};

const checkLink = (link, where) => {
  if (link === undefined || link === null) return;
  if (typeof link !== "string" || !isAllowedLink(link)) {
    const shown = typeof link === "string" ? ` "${link.trim().slice(0, 60)}"` : "";
    throw badRequest(
      `${where}: the link${shown} isn't allowed. Use a web address (https://...), a path on the site (/...), mailto: or tel:.`
    );
  }
};

// Every object with a `src` is an image and every `link` or `website` is a
// link, wherever they sit in a page (lists of ads, cards, places...).
const checkPageData = (value, where, depth = 0) => {
  if (depth > MAX_DEPTH) throw badRequest(`${where} is nested too deeply.`);
  if (Array.isArray(value)) {
    value.forEach((item) => checkPageData(item, where, depth + 1));
    return;
  }
  if (!isPlainObject(value)) return;
  if (Object.hasOwn(value, "src")) checkImage(value, where);
  Object.entries(value).forEach(([key, child]) => {
    if (key === "link" || key === "website") checkLink(child, where);
    else checkPageData(child, where, depth + 1);
  });
};

// Pages are stored as sent: content keys the server doesn't know are kept,
// since the admin adds fields over time.
const parsePages = (pages) => {
  if (!Array.isArray(pages) || pages.length === 0) {
    throw badRequest("An issue needs at least one page.");
  }
  if (pages.length > MAX_PAGES) {
    throw badRequest(`An issue can have at most ${MAX_PAGES} pages.`);
  }

  const pageNumberById = new Map();
  pages.forEach((page, index) => {
    const where = `Page ${index + 1}`;
    if (!isPlainObject(page)) throw badRequest(`${where} isn't a page.`);
    const { id, layout, content } = page;
    if (typeof id !== "string" || !id || id.length > MAX_PAGE_ID_LENGTH) {
      throw badRequest(`${where} needs an id of 1 to ${MAX_PAGE_ID_LENGTH} characters.`);
    }
    if (pageNumberById.has(id)) {
      throw badRequest(`${where} has the same id as page ${pageNumberById.get(id)}.`);
    }
    pageNumberById.set(id, index + 1);
    if (!LAYOUTS.includes(layout)) {
      throw badRequest(`${where} has an unknown layout.`);
    }
    if (!isPlainObject(content)) {
      throw badRequest(`${where}'s content must be an object.`);
    }
    checkPageData(page, where);
  });

  if (Buffer.byteLength(JSON.stringify(pages)) > MAX_PAGES_BYTES) {
    throw badRequest(
      "This issue is too large to save (over 1 MB). Shorten some text, or split it into two issues."
    );
  }
  return pages;
};

const parseCoverImage = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (!isImageSrc(value)) {
    throw badRequest(
      "The cover image must be uploaded (/images/...) or a web address (https://...)."
    );
  }
  if (value.length > MAX_COVER_IMAGE_LENGTH) {
    throw badRequest(
      `The cover image's address can be at most ${MAX_COVER_IMAGE_LENGTH} characters.`
    );
  }
  return value;
};

// A create or update body, checked. The admin sends every field, with empty
// ones as null. Text is stored as typed, not HTML-escaped: the admin and the
// site render it as text.
const parseIssue = (body = {}) => {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) throw badRequest("Give the issue a title.");
  if (title.length > MAX_TITLE_LENGTH) {
    throw badRequest(`The title can be at most ${MAX_TITLE_LENGTH} characters.`);
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) throw badRequest("Give the issue a page address.");
  if (slug.length > MAX_SLUG_LENGTH) {
    throw badRequest(`The page address can be at most ${MAX_SLUG_LENGTH} characters.`);
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw badRequest(
      "The page address can only have lowercase letters, numbers and single hyphens, e.g. coastal-escapes-issue-07."
    );
  }
  // /magazine/admin is the admin API, so no issue can live there.
  if (slug === "admin") {
    throw badRequest('The page address "admin" is reserved. Choose another one.');
  }

  if (!STATUSES.includes(body.status)) {
    throw badRequest(`status must be one of: ${STATUSES.join(", ")}.`);
  }
  const isPublished = body.status === "published";

  const publishDate = parseDate(body.publish_date);
  if (isPublished && !publishDate) {
    throw badRequest("Set a publish date before publishing.");
  }

  if (
    body.is_featured !== undefined &&
    body.is_featured !== null &&
    typeof body.is_featured !== "boolean"
  ) {
    throw badRequest("is_featured must be true or false.");
  }
  if (body.is_featured && !isPublished) {
    throw badRequest("Only a published issue can be featured.");
  }

  const issue = {
    title,
    slug,
    status: body.status,
    is_featured: body.is_featured === true,
    publish_date: publishDate,
    cover_image: parseCoverImage(body.cover_image),
  };
  Object.entries(OPTIONAL_TEXT).forEach(([field, rules]) => {
    issue[field] = optionalText(body[field], rules);
  });

  issue.pages = parsePages(body.pages);
  issue.page_count = issue.pages.length;
  if (isPublished && issue.page_count < 2) {
    throw badRequest("An issue needs at least two pages to be published.");
  }
  return issue;
};

const parseVersion = (value) => {
  const version = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(version) || version < 1) {
    throw badRequest("The issue's version is missing. Reload the issue and save again.");
  }
  return version;
};

// The unique index on slug_active is what keeps addresses unique, races
// included. Relying on it also means an update of an issue that's gone or
// was saved meanwhile gets its 404 or 409 first: its UPDATE matches no row,
// so the address is never compared.
const withSlugGuard = async (slug, save) => {
  try {
    return await save();
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw slugTaken(slug);
    throw error;
  }
};

// One featured issue at a time. silent keeps the others' updated_at: nobody
// edited them, and the admin list is ordered by it.
const unfeatureOthers = (id, transaction) =>
  Magazine.update(
    { is_featured: false },
    {
      where: { is_featured: true, ...(id && { id: { [Op.ne]: id } }) },
      transaction,
      silent: true,
    }
  );

// ---------------------------------------------------------------------
// Admin (admins and Editors)
// ---------------------------------------------------------------------

// Most recently edited first. ?search= matches the title, issue label and
// season; `counts` follow the search but not ?status=, for the tabs.
const listMagazinesAdmin = async (query = {}) => {
  let status = null;
  if (query.status && query.status !== "all") {
    if (!STATUSES.includes(query.status)) {
      throw badRequest(`Invalid status. Must be one of: all, ${STATUSES.join(", ")}`);
    }
    status = query.status;
  }
  const { limit, page } = parsePaging(query);

  const where = {};
  const search = typeof query.search === "string" ? query.search.trim() : "";
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [{ title: like }, { issue_label: like }, { season: like }];
  }

  const [{ count, rows }, statusCounts] = await Promise.all([
    Magazine.findAndCountAll({
      where: status ? { ...where, status } : where,
      attributes: SUMMARY_ATTRIBUTES,
      order: [
        ["updated_at", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset: (page - 1) * limit,
    }),
    Magazine.count({ where, group: ["status"] }),
  ]);

  const counts = { all: 0, draft: 0, published: 0 };
  statusCounts.forEach((row) => {
    counts[row.status] = Number(row.count);
    counts.all += Number(row.count);
  });

  return {
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
    magazines: rows,
    counts,
  };
};

const getMagazineAdmin = async (id) => {
  const magazineId = parseId(id);
  const magazineDoc =
    magazineId &&
    (await Magazine.findByPk(magazineId, { attributes: FULL_ATTRIBUTES }));
  if (!magazineDoc) throw notFound();
  return magazineDoc;
};

const createMagazine = async (body, adminId) => {
  const issue = parseIssue(body);

  const magazineDoc = await withSlugGuard(issue.slug, () =>
    sequelize.transaction(async (transaction) => {
      if (issue.is_featured) await unfeatureOthers(null, transaction);
      return Magazine.create(
        {
          ...issue,
          slug_active: issue.slug,
          version: 1,
          created_by: adminId,
          updated_by: adminId,
        },
        { transaction }
      );
    })
  );
  return getMagazineAdmin(magazineDoc.id);
};

// Refused with 409 when `version` isn't the issue's current one: someone
// else saved it since this editor loaded it.
const updateMagazine = async (id, body, adminId) => {
  const magazineId = parseId(id);
  if (!magazineId) throw notFound();
  const issue = parseIssue(body);
  const version = parseVersion(body.version);

  await withSlugGuard(issue.slug, () =>
    sequelize.transaction(async (transaction) => {
      if (issue.is_featured) await unfeatureOthers(magazineId, transaction);
      // Check the version and save in one statement, so two saves of the
      // same version can't both pass.
      const [updated] = await Magazine.update(
        {
          ...issue,
          slug_active: issue.slug,
          version: literal("`version` + 1"),
          updated_by: adminId,
        },
        { where: { id: magazineId, version }, transaction }
      );
      if (updated === 0) {
        const exists = await Magazine.count({
          where: { id: magazineId },
          transaction,
        });
        if (!exists) throw notFound();
        throw new ApiError(
          httpStatus.CONFLICT,
          "This issue was saved by someone else since you opened it."
        );
      }
    })
  );
  return getMagazineAdmin(magazineId);
};

// Soft delete. Uploaded photos stay: another issue may use them.
const deleteMagazine = async (id, adminId) => {
  const magazineId = parseId(id);
  const magazineDoc = magazineId && (await Magazine.findByPk(magazineId));
  if (!magazineDoc) throw notFound();
  magazineDoc.deleted_by = adminId;
  await magazineDoc.destroy();
};

// ---------------------------------------------------------------------
// Public (the site): published issues only
// ---------------------------------------------------------------------

// The issue marked as featured, or the newest one if none is.
const findFeatured = async () =>
  (await Magazine.findOne({
    where: { status: "published", is_featured: true },
    attributes: PUBLIC_ATTRIBUTES,
  })) ||
  Magazine.findOne({
    where: { status: "published" },
    attributes: PUBLIC_ATTRIBUTES,
    order: NEWEST_FIRST,
  });

const listMagazines = async (query = {}) => {
  const { limit, page } = parsePaging(query);

  const [{ count, rows }, featured] = await Promise.all([
    Magazine.findAndCountAll({
      where: { status: "published" },
      attributes: PUBLIC_ATTRIBUTES,
      order: NEWEST_FIRST,
      limit,
      offset: (page - 1) * limit,
    }),
    findFeatured(),
  ]);

  return {
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
    magazines: rows,
    featured,
  };
};

const getMagazineBySlug = async (slug) => {
  const magazineDoc =
    SLUG_PATTERN.test(slug) &&
    (await Magazine.findOne({
      where: { slug_active: slug, status: "published" },
      attributes: [...PUBLIC_ATTRIBUTES, "pages"],
    }));
  if (!magazineDoc) throw notFound();
  return magazineDoc;
};

module.exports = {
  listMagazinesAdmin,
  getMagazineAdmin,
  createMagazine,
  updateMagazine,
  deleteMagazine,
  listMagazines,
  getMagazineBySlug,
};
