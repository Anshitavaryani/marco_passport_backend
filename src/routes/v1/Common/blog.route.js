const express = require("express");
const router = express.Router();

const { blogController, mediaController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");
const upload = require("../../../config/multer");

// Admins and Editors.
const requireContentEditor = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isContentEditor,
];

router.get("/", blogController.getAllBlogs);
router.get("/category/:slug", blogController.getBlogsByCategorySlug);
router.get("/:id", blogController.findBlogById);
router.post("/", requireContentEditor, upload, blogController.createBlog);
router.put("/:id", requireContentEditor, upload, blogController.updateBlog);
router.delete("/:id", requireContentEditor, blogController.deleteBlog);


router.post(
  "/upload-image",
  [adminAuthMiddleware.validateJWTtoken, upload],
  mediaController.uploadImage
);

module.exports = router;