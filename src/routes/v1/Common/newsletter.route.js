const express = require("express");

const router = express.Router();

const { newsletterController } = require("../../../controllers");

// Public sign-up from the site's newsletter forms.
router.post("/", newsletterController.subscribe);

module.exports = router;
