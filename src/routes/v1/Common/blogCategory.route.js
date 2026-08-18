const express = require("express");
const router = express.Router();

const { blogCategoryController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Mounted at /admin/blog-category.
const requireAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isAdmin,
];

router.post("/", requireAdmin, blogCategoryController.createCategory);
router.get("/", blogCategoryController.getAllCategories);
router.get("/:id", blogCategoryController.findCategoryById);
router.put("/:id", requireAdmin, blogCategoryController.updateCategory);
router.delete("/:id", requireAdmin, blogCategoryController.deleteCategory);

module.exports = router;
