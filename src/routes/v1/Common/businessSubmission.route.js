const express = require("express");

const router = express.Router();

const { businessSubmissionController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Public form; the list contains submitters' contact details, so it's admin-only.
router.post("/", businessSubmissionController.createSubmission);

router.get(
  "/",
  [adminAuthMiddleware.validateJWTtoken, roleMiddleware.isAdmin],
  businessSubmissionController.getAllSubmissions
);

module.exports = router;
