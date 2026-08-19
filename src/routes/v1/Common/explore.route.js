const express = require("express");
const router = express.Router();

const { placeController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware, userAuthMiddleware } = require("../../../middlewares");
const upload = require("../../../config/multer");

const requireAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isAdmin,
];

// ---------------------------------------------------------------------
// Public — business listings (the live site's /explore directory)
// attachUserIfPresent lets these responses include is_in_passport per
// place when the request happens to come from a logged-in user, while
// staying fully public/anonymous-friendly otherwise.
// ---------------------------------------------------------------------
router.get("/", userAuthMiddleware.attachUserIfPresent, placeController.getExplore);
router.get("/listing/:slug", userAuthMiddleware.attachUserIfPresent, placeController.findBusinessBySlug);

// ---------------------------------------------------------------------
// Public — places-to-visit (the live site's /places page)
// ---------------------------------------------------------------------
router.get("/places", userAuthMiddleware.attachUserIfPresent, placeController.getPlacesToVisit);
router.get("/places/:slug", userAuthMiddleware.attachUserIfPresent, placeController.findPlaceToVisitBySlug);

// ---------------------------------------------------------------------
// Admin — generic CRUD for both types
// ---------------------------------------------------------------------
router.get("/admin", placeController.getAllPlacesAdmin);
router.get("/admin/:id", placeController.findPlaceById);
router.post("/admin", upload, requireAdmin, placeController.createPlace);
router.put("/admin/:id", upload, requireAdmin, placeController.updatePlace);
router.delete("/admin/:id", requireAdmin, placeController.deletePlace);

module.exports = router;