const express = require("express");
const router = express.Router();

const { blogController, mediaController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");
const upload = require("../../../config/multer");

const requireAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isAdmin,
];

router.get("/", blogController.getAllBlogs);
router.get("/category/:slug", blogController.getBlogsByCategorySlug);
router.get("/:id", blogController.findBlogById);
router.post("/", requireAdmin, upload, blogController.createBlog);
router.put("/:id", requireAdmin, upload, blogController.updateBlog);
router.delete("/:id", requireAdmin, blogController.deleteBlog);


router.post(
  "/upload-image",
  [adminAuthMiddleware.validateJWTtoken, upload],
  mediaController.uploadImage
);

module.exports = router;