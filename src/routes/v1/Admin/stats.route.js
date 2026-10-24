const express = require("express");
const { statsController } = require("../../../controllers/Admin");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");
const router = express.Router();

// Dashboard numbers: members, passports, listings, sign-ups.
router.get(
  "/",
  [adminAuthMiddleware.validateJWTtoken, roleMiddleware.isAdmin],
  statsController.getStats
);

module.exports = router;
