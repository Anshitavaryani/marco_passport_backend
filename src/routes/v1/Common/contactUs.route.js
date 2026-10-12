const express = require("express");
const router = express.Router();

const { contactUsController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// POST (the public contact form) is open; everything else is admin-only.
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
