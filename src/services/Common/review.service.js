const httpStatus = require("http-status");

const { Review, Place, User, Profile } = require("../../models");
const ApiError = require("../../utils/ApiError");
const { recalculatePlaceRating } = require("./place.service");

const createReview = async (reqBody) => {
  const { place_id, user_id, rating } = reqBody;

  if (!place_id || !user_id || !rating) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please enter required fields: [place_id, rating]"
    );
  }

  if (rating < 1 || rating > 5) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Rating must be between 1 and 5.");
  }

  const placeDoc = await Place.findOne({
    where: { id: place_id, is_active: true },
  });
  if (!placeDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
  }

  const existing = await Review.findOne({
    where: { place_id, user_id, is_active: true },
  });
  if (existing) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You've already reviewed this listing — update your existing review instead."
    );
  }

  const reviewDoc = await Review.create({
    place_id,
    user_id,
    rating,
    comment: reqBody.comment || null,
  });

  await recalculatePlaceRating(place_id);

  return reviewDoc;
};

const updateReview = async (reqBody, id, user_id) => {
  const reviewDoc = await Review.findOne({
    where: { id, user_id, is_active: true },
  });
  if (!reviewDoc) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Review not found, or doesn't belong to you."
    );
  }

  if (reqBody.rating) {
    if (reqBody.rating < 1 || reqBody.rating > 5) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Rating must be between 1 and 5.");
    }
    reviewDoc.rating = reqBody.rating;
  }

  if (typeof reqBody.comment !== "undefined") {
    reviewDoc.comment = reqBody.comment;
  }

  await reviewDoc.save();
  await recalculatePlaceRating(reviewDoc.place_id);

  return reviewDoc;
};

// Pulls the reviewer's display name via User -> Profile, matching the
// same association chain used elsewhere (User.user_profile /
// Profile.profile_user) rather than inventing a shortcut alias.
const getReviewsForPlace = async (place_id) => {
  const reviews = await Review.findAll({
    where: { place_id, is_active: true },
    include: [
      {
        model: User,
        as: "reviewer",
        attributes: ["id"],
        include: [
          {
            model: Profile,
            as: "user_profile",
            attributes: ["name"],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
  return reviews;
};

const deleteReview = async (id, user_id) => {
  const reviewDoc = await Review.findOne({
    where: { id, user_id, is_active: true },
  });
  if (!reviewDoc) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Review not found, or doesn't belong to you."
    );
  }

  const placeId = reviewDoc.place_id;
  await reviewDoc.destroy();
  await recalculatePlaceRating(placeId);

  return true;
};

module.exports = {
  createReview,
  updateReview,
  getReviewsForPlace,
  deleteReview,
};