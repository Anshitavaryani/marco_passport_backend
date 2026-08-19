const express = require("express");
const router = express.Router();

const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");
const { placeCategoryController } = require("../../../controllers");
const upload = require("../../../config/multer");

const requireAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isAdmin,
];

router.get("/", placeCategoryController.getAllCategories);
router.get("/:id", placeCategoryController.findCategoryById);
router.post("/", upload, requireAdmin, placeCategoryController.createCategory);
router.put("/:id", upload, requireAdmin, placeCategoryController.updateCategory);
router.delete("/:id", requireAdmin, placeCategoryController.deleteCategory);

module.exports = router;