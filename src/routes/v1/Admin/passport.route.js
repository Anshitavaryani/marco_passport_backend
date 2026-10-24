const express = require("express");
const { adminPassportController } = require("../../../controllers/Admin");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");
const router = express.Router();

// Members' passports, read-only for admins.
router.use(adminAuthMiddleware.validateJWTtoken, roleMiddleware.isAdmin);

router.get("/", adminPassportController.listPassports);
router.get("/:id", adminPassportController.getPassport);

module.exports = router;
