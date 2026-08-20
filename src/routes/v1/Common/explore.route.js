const express = require("express");
const router = express.Router();

const { placeController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware, userAuthMiddleware } = require("../../../middlewares");
const upload = require("../../../config/multer");
const reviewRoute = require("./review.route");

const requireAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isAdmin,
];

// ---------------------------------------------------------------------
// Public — business listings (the live site's /explore directory)
// ---------------------------------------------------------------------
router.get("/", userAuthMiddleware.attachUserIfPresent, placeController.getExplore);
router.get("/listing/:slug", userAuthMiddleware.attachUserIfPresent, placeController.findBusinessBySlug);
// Nested — :placeId here is a listing's numeric id, not its slug.
// mergeParams in review.route.js is what makes it visible there.
router.use("/listing/:placeId/reviews", reviewRoute);

// ---------------------------------------------------------------------
// Public — places-to-visit (the live site's /places page)
// ---------------------------------------------------------------------
router.get("/places", userAuthMiddleware.attachUserIfPresent, placeController.getPlacesToVisit);
router.get("/places/:slug", userAuthMiddleware.attachUserIfPresent, placeController.findPlaceToVisitBySlug);
router.use("/places/:placeId/reviews", reviewRoute);

// ---------------------------------------------------------------------
// Admin — generic CRUD for both types
// ---------------------------------------------------------------------
router.get("/admin", placeController.getAllPlacesAdmin);
router.get("/admin/:id", placeController.findPlaceById);
router.post("/admin", upload, requireAdmin, placeController.createPlace);
router.put("/admin/:id", upload, requireAdmin, placeController.updatePlace);
router.delete("/admin/:id", requireAdmin, placeController.deletePlace);

module.exports = router;