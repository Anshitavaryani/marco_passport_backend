/** @format */

const { Op, fn, col, QueryTypes } = require("sequelize");

const sequelize = require("../../config/central.db");
const {
  User,
  Profile,
  Passport,
  PassportItem,
  Place,
  Review,
  NewsletterSubscriber,
  ContactUs,
  BusinessSubmission,
  Blog,
} = require("../../models");
const { userStatusTypes } = require("../../config/types");
const { PASSPORT_ITEM_COUNT } = require("./passport.service");

const RECENT_DAYS = 30;
const TOP_LIMIT = 5;

// Members with the most passports (ties: most places saved, then most
// recent). Deleted accounts are left out.
const TOP_PASSPORT_CREATORS_SQL = `
  SELECT u.id, u.email, p.name,
    COUNT(DISTINCT i.id) AS passports_count,
    COUNT(ii.id) AS places_count,
    MAX(i.created_at) AS last_passport_at
  FROM itineraries i
  JOIN users u ON u.id = i.user_id AND u.deleted_at IS NULL
  LEFT JOIN profiles p ON p.user_id = u.id AND p.deleted_at IS NULL
  LEFT JOIN itinerary_items ii ON ii.itinerary_id = i.id
  GROUP BY u.id, u.email, p.name
  ORDER BY passports_count DESC, places_count DESC, last_passport_at DESC
  LIMIT :limit`;

// Listings saved to the most passports.
const MOST_SAVED_PLACES_SQL = `
  SELECT pl.id, pl.name, pl.type, pl.slug, COUNT(*) AS saves
  FROM itinerary_items ii
  JOIN places pl ON pl.id = ii.place_id AND pl.deleted_at IS NULL
  GROUP BY pl.id, pl.name, pl.type, pl.slug
  ORDER BY saves DESC, pl.name ASC
  LIMIT :limit`;

const selectRows = (sql) =>
  sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: { limit: TOP_LIMIT },
  });

// The admin dashboard's numbers. Counts are of live rows only (not deleted,
// is_active where the table has it); "new" means the last 30 days.
const getStats = async () => {
  const recent = {
    created_at: { [Op.gte]: new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000) },
  };
  const liveUsers = { is_active: true };
  const livePlaces = { is_active: true };
  const liveReviews = { is_active: true };
  const liveMessages = { is_active: true };

  const [
    usersTotal,
    usersVerified,
    usersPending,
    usersBlocked,
    usersNew,
    passportsTotal,
    passportsNew,
    passportOwners,
    placesSaved,
    exploreByType,
    exploreFeatured,
    exploreMissingCoordinates,
    reviewsTotal,
    reviewsAverage,
    newsletterTotal,
    newsletterNew,
    messagesTotal,
    messagesNew,
    requestsTotal,
    requestsPending,
    blogsTotal,
    topCreators,
    mostSaved,
    recentPassports,
  ] = await Promise.all([
    User.count({ where: liveUsers }),
    User.count({ where: { ...liveUsers, status: userStatusTypes.ACCEPTED } }),
    User.count({ where: { ...liveUsers, status: userStatusTypes.PENDING } }),
    User.count({ where: { ...liveUsers, status: userStatusTypes.REJECTED } }),
    User.count({ where: { ...liveUsers, ...recent } }),
    Passport.count(),
    Passport.count({ where: recent }),
    Passport.count({ distinct: true, col: "user_id" }),
    PassportItem.count(),
    Place.count({ where: livePlaces, group: ["type"] }),
    Place.count({ where: { ...livePlaces, is_featured: true } }),
    Place.count({
      where: {
        ...livePlaces,
        [Op.or]: [{ latitude: null }, { longitude: null }],
      },
    }),
    Review.count({ where: liveReviews }),
    Review.findOne({
      where: liveReviews,
      attributes: [[fn("AVG", col("rating")), "average"]],
      raw: true,
    }),
    NewsletterSubscriber.count(),
    NewsletterSubscriber.count({ where: recent }),
    ContactUs.count({ where: liveMessages }),
    ContactUs.count({ where: { ...liveMessages, ...recent } }),
    BusinessSubmission.count(),
    BusinessSubmission.count({ where: { status: "pending" } }),
    Blog.count({ where: { is_active: true } }),
    selectRows(TOP_PASSPORT_CREATORS_SQL),
    selectRows(MOST_SAVED_PLACES_SQL),
    Passport.findAll({
      attributes: ["id", "name", "created_at", [PASSPORT_ITEM_COUNT, "item_count"]],
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "email"],
          paranoid: false,
          include: [
            {
              model: Profile,
              as: "user_profile",
              attributes: ["name"],
              paranoid: false,
            },
          ],
        },
      ],
      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],
      limit: TOP_LIMIT,
    }),
  ]);

  const explore = { total: 0, place: 0, business: 0 };
  exploreByType.forEach((row) => {
    explore[row.type] = Number(row.count);
    explore.total += Number(row.count);
  });

  const average = reviewsAverage?.average;

  return {
    users: {
      total: usersTotal,
      verified: usersVerified,
      pending: usersPending,
      blocked: usersBlocked,
      new_30d: usersNew,
    },
    passports: {
      total: passportsTotal,
      new_30d: passportsNew,
      owners: passportOwners,
      places_saved: placesSaved,
    },
    explore: {
      ...explore,
      featured: exploreFeatured,
      missing_coordinates: exploreMissingCoordinates,
    },
    reviews: {
      total: reviewsTotal,
      average_rating:
        average === null || average === undefined
          ? null
          : Math.round(Number(average) * 10) / 10,
    },
    newsletter: { total: newsletterTotal, new_30d: newsletterNew },
    contact_messages: { total: messagesTotal, new_30d: messagesNew },
    business_requests: { total: requestsTotal, pending: requestsPending },
    blogs: { total: blogsTotal },
    top_passport_creators: topCreators.map((row) => ({
      id: Number(row.id),
      email: row.email,
      name: row.name,
      passports_count: Number(row.passports_count),
      places_count: Number(row.places_count),
      last_passport_at: row.last_passport_at,
    })),
    most_saved_places: mostSaved.map((row) => ({
      id: Number(row.id),
      name: row.name,
      type: row.type,
      slug: row.slug,
      saves: Number(row.saves),
    })),
    recent_passports: recentPassports.map((row) => {
      const passport = row.toJSON();
      return {
        id: passport.id,
        name: passport.name,
        created_at: passport.created_at,
        item_count: Number(passport.item_count) || 0,
        owner: passport.owner
          ? {
              id: passport.owner.id,
              email: passport.owner.email,
              name: passport.owner.user_profile?.name ?? null,
            }
          : null,
      };
    }),
  };
};

module.exports = {
  getStats,
};
