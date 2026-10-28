const express = require("express");
const router = express.Router();

const { magazineController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Admins and Editors.
const requireContentEditor = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isContentEditor,
];

// ---------------------------------------------------------------------
// Admin: every issue, drafts included. Registered before /:slug; saving
// refuses the slug "admin", so no issue can sit behind these. app.js gives
// these routes a 2 MB JSON body limit, since an issue is saved whole.
// ---------------------------------------------------------------------
router.get("/admin", requireContentEditor, magazineController.listMagazinesAdmin);
router.get("/admin/:id", requireContentEditor, magazineController.getMagazineAdmin);
router.post("/admin", requireContentEditor, magazineController.createMagazine);
router.put("/admin/:id", requireContentEditor, magazineController.updateMagazine);
router.delete("/admin/:id", requireContentEditor, magazineController.deleteMagazine);

// ---------------------------------------------------------------------
// Public: published issues, for the site
// ---------------------------------------------------------------------
router.get("/", magazineController.listMagazines);
router.get("/:slug", magazineController.getMagazineBySlug);

module.exports = router;
