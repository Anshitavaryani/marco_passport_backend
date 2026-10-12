const express = require("express");
const router = express.Router();

const { faqController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// GET is public; writes need the editor tier or above.
const requireEditor = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isEditor,
];

router.post("/", requireEditor, faqController.createFaq);
router.get("/", faqController.getAllFaq);
router.put("/:id", requireEditor, faqController.updateFaq);
router.delete("/:id", requireEditor, faqController.deleteFaq);

module.exports = router;
