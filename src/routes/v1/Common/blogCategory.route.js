const express = require("express");
const router = express.Router();

const { blogCategoryController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Admins and Editors.
const requireContentEditor = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isContentEditor,
];

router.post("/", requireContentEditor, blogCategoryController.createCategory);
router.get("/", blogCategoryController.getAllCategories);
router.get("/:id", blogCategoryController.findCategoryById);
router.put("/:id", requireContentEditor, blogCategoryController.updateCategory);
router.delete("/:id", requireContentEditor, blogCategoryController.deleteCategory);

module.exports = router;
