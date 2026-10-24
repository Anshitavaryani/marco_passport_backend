const httpStatus = require("http-status");
const { Op, UniqueConstraintError, fn, col } = require("sequelize");

const { NewsletterSubscriber } = require("../../models");
const ApiError = require("../../utils/ApiError");
const validateEmail = require("../../helpers/validateEmail");

const SOURCES = ["footer", "blog"];
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// Signing up twice is fine: the visitor gets the same thank-you and the
// email is stored once.
const subscribe = async (reqBody = {}) => {
  const email =
    typeof reqBody.email === "string" ? reqBody.email.trim().toLowerCase() : "";

  if (!email || !validateEmail(email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Please enter a valid email address.");
  }

  const source = SOURCES.includes(reqBody.source) ? reqBody.source : null;

  try {
    await NewsletterSubscriber.findOrCreate({
      where: { email },
      defaults: { email, source },
    });
  } catch (error) {
    // Two sign-ups for the same email at once: the other one saved it.
    if (!(error instanceof UniqueConstraintError)) throw error;
  }

  return { email };
};

// ?search= matches the email; ?source=none means sign-ups with no source
// (saved before sources were recorded, or from an unknown form).
const buildWhere = (query) => {
  const where = {};
  const search = typeof query.search === "string" ? query.search.trim() : "";
  if (search) where.email = { [Op.like]: `%${search}%` };
  if (query.source === "none") where.source = null;
  else if (query.source) where.source = String(query.source);
  return where;
};

const listSubscribers = async (query = {}) => {
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const page = Math.max(parseInt(query.page, 10) || 1, 1);

  const [{ count, rows }, sources] = await Promise.all([
    NewsletterSubscriber.findAndCountAll({
      where: buildWhere(query),
      attributes: ["id", "email", "source", "created_at"],
      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset: (page - 1) * limit,
    }),
    NewsletterSubscriber.findAll({
      attributes: ["source", [fn("COUNT", col("id")), "count"]],
      group: ["source"],
      raw: true,
    }),
  ]);

  return {
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
    subscribers: rows,
    sources: sources
      .map((row) => ({ source: row.source, count: Number(row.count) }))
      .sort((a, b) => b.count - a.count),
  };
};

// Spreadsheet apps run cells starting with = + - @ as formulas, so those get
// a leading quote; anything with a comma, quote or line break is quoted.
const csvCell = (value) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Every matching subscriber, newest first, ready to import into a mailing
// service.
const exportSubscribersCsv = async (query = {}) => {
  const rows = await NewsletterSubscriber.findAll({
    where: buildWhere(query),
    attributes: ["email", "source", "created_at"],
    order: [
      ["created_at", "DESC"],
      ["id", "DESC"],
    ],
    raw: true,
  });

  const lines = [["email", "source", "subscribed_at"].join(",")];
  rows.forEach((row) => {
    lines.push(
      [row.email, row.source, new Date(row.created_at).toISOString()]
        .map(csvCell)
        .join(",")
    );
  });
  return `${lines.join("\r\n")}\r\n`;
};

const deleteSubscriber = async (id) => {
  const subscriber = await NewsletterSubscriber.findByPk(id);
  if (!subscriber) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subscriber not found.");
  }
  await subscriber.destroy();
};

module.exports = {
  subscribe,
  listSubscribers,
  exportSubscribersCsv,
  deleteSubscriber,
};
