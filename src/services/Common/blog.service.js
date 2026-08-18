const httpStatus = require("http-status");
const slugify = require("slugify");

const { Blog, BlogCategory } = require("../../models");
const ApiError = require("../../utils/ApiError");

const CATEGORY_INCLUDE = {
  model: BlogCategory,
  as: "blog_category",
  attributes: ["id", "name", "slug"],
};

const assertCategoryExists = async (category_id) => {
  const categoryDoc = await BlogCategory.findOne({
    where: { id: category_id, is_active: true },
  });
  if (!categoryDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid category_id.");
  }
};

const createBlog = async (reqBody) => {
  const { category_id, title, description, content, written_by } = reqBody;

  if (!category_id || !title || !description || !content || !written_by) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please enter required fields: [category_id, title, description, content, written_by]"
    );
  }

  await assertCategoryExists(category_id);

  const slug = reqBody.slug
    ? slugify(reqBody.slug, { lower: true, strict: true })
    : slugify(title, { lower: true, strict: true });

  if (await Blog.isSlugTaken(slug)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "A blog post with this slug already exists."
    );
  }

  const blogObj = {
    category_id,
    title,
    slug,
    description,
    content,
    featured_image: reqBody.featured_image || null,
    written_by,
    read_time_minutes: reqBody.read_time_minutes || null,
    is_featured: !!reqBody.is_featured,
    published_at: reqBody.published_at || new Date(),
    created_by: reqBody.created_by || null,
  };

  const blogDoc = await Blog.create(blogObj);
  if (!blogDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new blog post"
    );
  }
  return blogDoc;
};

const updateBlog = async (reqBody, id) => {
  const blogDoc = await Blog.findByPk(id);
  if (!blogDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog post not found");
  }

  if (reqBody.category_id) {
    await assertCategoryExists(reqBody.category_id);
    blogDoc["category_id"] = reqBody.category_id;
  }

  if (reqBody.title) {
    blogDoc["title"] = reqBody.title;
  }

  if (reqBody.slug) {
    const newSlug = slugify(reqBody.slug, { lower: true, strict: true });
    if (newSlug !== blogDoc.slug && (await Blog.isSlugTaken(newSlug))) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "A blog post with this slug already exists."
      );
    }
    blogDoc["slug"] = newSlug;
  }

  if (reqBody.description) {
    blogDoc["description"] = reqBody.description;
  }

  if (reqBody.content) {
    blogDoc["content"] = reqBody.content;
  }

  if (typeof reqBody.featured_image !== "undefined") {
    blogDoc["featured_image"] = reqBody.featured_image;
  }

  if (reqBody.written_by) {
    blogDoc["written_by"] = reqBody.written_by;
  }

  if (typeof reqBody.read_time_minutes !== "undefined") {
    blogDoc["read_time_minutes"] = reqBody.read_time_minutes;
  }

  if (typeof reqBody.is_featured !== "undefined") {
    blogDoc["is_featured"] = !!reqBody.is_featured;
  }

  if (reqBody.published_at) {
    blogDoc["published_at"] = reqBody.published_at;
  }

  if (reqBody.updated_by) {
    blogDoc["updated_by"] = reqBody.updated_by;
  }

  await blogDoc.save();
  return blogDoc;
};

const getAllBlogs = async (filters = {}) => {
  const where = { is_active: true };
  if (filters.category_id) {
    where.category_id = filters.category_id;
  }
  if (typeof filters.is_featured !== "undefined") {
    where.is_featured = filters.is_featured;
  }

  const blogDocs = await Blog.findAll({
    where,
    include: [CATEGORY_INCLUDE],
    order: [["published_at", "DESC"]],
  });
  return blogDocs;
};

const findBlogById = async (id) => {
  const blogDoc = await Blog.findOne({
    where: { id, is_active: true },
    include: [CATEGORY_INCLUDE],
  });
  return blogDoc ? blogDoc : [];
};

const findBlogBySlug = async (slug) => {
  const blogDoc = await Blog.findOne({
    where: { slug, is_active: true },
    include: [CATEGORY_INCLUDE],
  });
  return blogDoc ? blogDoc : [];
};

const deleteBlog = async (id) => {
  const blogDoc = await Blog.findByPk(Number(id));
  if (!blogDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog post not found");
  }
  return await blogDoc.destroy();
};

module.exports = {
  createBlog,
  updateBlog,
  getAllBlogs,
  findBlogById,
  findBlogBySlug,
  deleteBlog,
};