const express = require("express");
const router = express.Router();

const { blogController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");
const upload = require("../../../config/multer");

const requireAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isAdmin,
];

router.get("/", blogController.getAllBlogs);
router.get("/:id", blogController.findBlogById);
router.post("/", upload, requireAdmin, blogController.createBlog);
router.put("/:id", upload, requireAdmin, blogController.updateBlog);
router.delete("/:id", requireAdmin, blogController.deleteBlog);

module.exports = router;