const express = require("express");
const router = express.Router();

const { contactUsController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Was completely unauthenticated on every route, including listing every
// submission ever made (real PII — names, emails, phone numbers,
// addresses) and deleting/editing any of them by id. POST (the actual
// public contact form) correctly stays open; everything else is now
// admin-gated. Adjust the role tier (currently isAdmin) if a different
// one fits your intended access level.
router.post("/", contactUsController.createContactUs);
router.put(
  "/:id",
  [adminAuthMiddleware.validateJWTtoken, roleMiddleware.isAdmin],
  contactUsController.updateContactUs
);
router.get(
  "/",
  [adminAuthMiddleware.validateJWTtoken, roleMiddleware.isAdmin],
  contactUsController.getAllContactUs
);
router.delete(
  "/:id",
  [adminAuthMiddleware.validateJWTtoken, roleMiddleware.isAdmin],
  contactUsController.deleteContactUs
);

module.exports = router;
