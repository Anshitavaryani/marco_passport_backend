const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const { reviewService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

// Public — GET /places/:placeId/reviews or /explore/:placeId/reviews
const getReviewsForPlace = catchAsync(async (req, res) => {
  const reviews = await reviewService.getReviewsForPlace(req.params.placeId);
  return responseWrapper(res, reviews, "");
});

// Requires a logged-in Passport user — req.body.user comes from
// userAuthMiddleware.verifyAuthJWTToken (same shape used across the
// User auth flow already in this app), not the admin auth chain.
const createReview = catchAsync(async (req, res) => {
  const review = await reviewService.createReview({
    ...req.body,
    place_id: req.params.placeId,
    user_id: req.body.user?.id,
  });
  return responseWrapper(
    res,
    review,
    "Review submitted successfully",
    httpStatus.CREATED
  );
});

const updateReview = catchAsync(async (req, res) => {
  const review = await reviewService.updateReview(
    req.body,
    req.params.id,
    req.body.user?.id
  );
  return responseWrapper(res, review, "Review updated successfully");
});

const deleteReview = catchAsync(async (req, res) => {
  await reviewService.deleteReview(req.params.id, req.body.user?.id);
  return responseWrapper(res, "", "Review deleted successfully.", httpStatus.OK);
});

module.exports = {
  getReviewsForPlace,
  createReview,
  updateReview,
  deleteReview,
};