const express = require("express");
const router = express.Router();

const { faqController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Was completely unauthenticated on every route, including create/edit/
// delete — any anonymous visitor could deface the public FAQ content.
// GET correctly stays public; write operations are now gated. Used
// isEditor (the broadest content-management tier in the role hierarchy)
// rather than isAdmin, since this is content management specifically —
// adjust if a different tier fits.
const requireEditor = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isEditor,
];

router.post("/", requireEditor, faqController.createFaq);
router.get("/", faqController.getAllFaq);
router.put("/:id", requireEditor, faqController.updateFaq);
router.delete("/:id", requireEditor, faqController.deleteFaq);

module.exports = router;
