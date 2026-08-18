const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const ApiError = require("../../utils/ApiError");
const { blogService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const getAllBlogs = catchAsync(async (req, res) => {
  const filters = {};
  if (req.query.category_id) {
    filters.category_id = req.query.category_id;
  }
  if (typeof req.query.featured !== "undefined") {
    filters.is_featured = req.query.featured === "true";
  }
  const blogs = await blogService.getAllBlogs(filters);
  return responseWrapper(res, blogs, "");
});

const findBlogBySlug = catchAsync(async (req, res) => {
  const blogDoc = await blogService.findBlogBySlug(req.params.slug);
  if (!blogDoc || (Array.isArray(blogDoc) && blogDoc.length === 0)) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog post not found.");
  }
  return responseWrapper(res, blogDoc, "");
});

const findBlogById = catchAsync(async (req, res) => {
  const blogDoc = await blogService.findBlogById(req.params.id);
  if (!blogDoc || (Array.isArray(blogDoc) && blogDoc.length === 0)) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog post not found.");
  }
  return responseWrapper(res, blogDoc, "");
});

const createBlog = catchAsync(async (req, res) => {
  const blog = await blogService.createBlog({
    ...req.body,
    featured_image: req.files?.images?.[0]
      ? `/images/${req.files.images[0].filename}`
      : req.body.featured_image,
    created_by: req.body.user?.id,
  });
  return responseWrapper(
    res,
    blog,
    "New blog post created successfully",
    httpStatus.CREATED,
  );
});

const updateBlog = catchAsync(async (req, res) => {
  const blogDoc = await blogService.updateBlog(
    {
      ...req.body,
      featured_image: req.files?.images?.[0]
        ? `/images/${req.files.images[0].filename}`
        : req.body.featured_image,
      updated_by: req.body.user?.id,
    },
    req.params.id,
  );
  return responseWrapper(res, blogDoc, "Blog post updated successfully");
});

const deleteBlog = catchAsync(async (req, res) => {
  await blogService.deleteBlog(req.params.id);
  return responseWrapper(res, "", "Deleted Successfully.", httpStatus.OK);
});

module.exports = {
  getAllBlogs,
  findBlogBySlug,
  findBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
};
