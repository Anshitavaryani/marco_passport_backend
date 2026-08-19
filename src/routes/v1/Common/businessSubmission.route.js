const express = require("express");

const router = express.Router();

const { businessSubmissionController } = require("../../../controllers");

router.post("/", businessSubmissionController.createSubmission);

router.get("/", businessSubmissionController.getAllSubmissions);

module.exports = router;
