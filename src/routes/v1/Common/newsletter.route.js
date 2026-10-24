const express = require("express");

const router = express.Router();

const { newsletterController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

const requireAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isAdmin,
];

// Public sign-up from the site's newsletter forms.
router.post("/", newsletterController.subscribe);

// The list is subscribers' emails, so reading it is admin-only.
router.get("/", requireAdmin, newsletterController.listSubscribers);
router.get("/export", requireAdmin, newsletterController.exportSubscribers);
router.delete("/:id", requireAdmin, newsletterController.deleteSubscriber);

module.exports = router;
