const express = require("express");
const router = express.Router({ mergeParams: true });

const { reviewController } = require("../../../controllers");
const { userAuthMiddleware } = require("../../../middlewares");

// mergeParams so :placeId from the parent mount (e.g.
// /explore/:placeId/reviews) is visible here.
router.get("/", reviewController.getReviewsForPlace);
router.post("/", [userAuthMiddleware.verifyAuthJWTToken], reviewController.createReview);
router.put("/:id", [userAuthMiddleware.verifyAuthJWTToken], reviewController.updateReview);
router.delete("/:id", [userAuthMiddleware.verifyAuthJWTToken], reviewController.deleteReview);

module.exports = router;