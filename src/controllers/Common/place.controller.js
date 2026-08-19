const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const ApiError = require("../../utils/ApiError");
const { placeService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const buildListFilters = (query, type) => {
  const filters = { type };
  if (query.category_id) filters.category_id = query.category_id;
  if (query.price_level) filters.price_level = query.price_level;
  if (query.neighborhood) filters.neighborhood = query.neighborhood;
  if (query.min_rating) filters.min_rating = query.min_rating;
  if (typeof query.featured !== "undefined") {
    filters.is_featured = query.featured === "true";
  }
  if (typeof query.top_pick !== "undefined") {
    filters.is_top_pick = query.top_pick === "true";
  }
  if (query.search) filters.search = query.search;
  if (query.sort) filters.sort = query.sort;
  if (query.page) filters.page = query.page;
  if (query.limit) filters.limit = query.limit;
  return filters;
};

const buildImageFields = (req) => {
  const uploadedFiles = req.files?.images;

  if (uploadedFiles && uploadedFiles.length > 0) {
    const paths = uploadedFiles.map((file) => `/images/${file.filename}`);
    return {
      featured_image: paths[0],
      gallery_images: paths,
    };
  }

  const result = {};
  if (typeof req.body.featured_image !== "undefined") {
    result.featured_image = req.body.featured_image;
  }
  if (typeof req.body.gallery_images !== "undefined") {
    result.gallery_images = Array.isArray(req.body.gallery_images)
      ? req.body.gallery_images
      : String(req.body.gallery_images)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
  }
  return result;
};

const getExplore = catchAsync(async (req, res) => {
  const result = await placeService.getAllPlaces(
    buildListFilters(req.query, "business"),
    req.body.user?.id
  );
  return responseWrapper(res, result, "");
});

const findBusinessBySlug = catchAsync(async (req, res) => {
  const placeDoc = await placeService.findPlaceBySlug(
    req.params.slug,
    "business",
    req.body.user?.id
  );
  if (!placeDoc || (Array.isArray(placeDoc) && placeDoc.length === 0)) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
  }
  return responseWrapper(res, placeDoc, "");
});

const getPlacesToVisit = catchAsync(async (req, res) => {
  const result = await placeService.getAllPlaces(
    buildListFilters(req.query, "place"),
    req.body.user?.id
  );
  return responseWrapper(res, result, "");
});

const findPlaceToVisitBySlug = catchAsync(async (req, res) => {
  const placeDoc = await placeService.findPlaceBySlug(
    req.params.slug,
    "place",
    req.body.user?.id
  );
  if (!placeDoc || (Array.isArray(placeDoc) && placeDoc.length === 0)) {
    throw new ApiError(httpStatus.NOT_FOUND, "Place not found.");
  }
  return responseWrapper(res, placeDoc, "");
});

const getAllPlacesAdmin = catchAsync(async (req, res) => {
  const result = await placeService.getAllPlaces(req.query);
  return responseWrapper(res, result, "");
});

const findPlaceById = catchAsync(async (req, res) => {
  const placeDoc = await placeService.findPlaceById(req.params.id);
  if (!placeDoc || (Array.isArray(placeDoc) && placeDoc.length === 0)) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
  }
  return responseWrapper(res, placeDoc, "");
});

const createPlace = catchAsync(async (req, res) => {
  const place = await placeService.createPlace({
    ...req.body,
    ...buildImageFields(req),
    created_by: req.body.user?.id,
  });
  return responseWrapper(
    res,
    place,
    "New listing created successfully",
    httpStatus.CREATED
  );
});

const updatePlace = catchAsync(async (req, res) => {
  const placeDoc = await placeService.updatePlace(
    {
      ...req.body,
      ...buildImageFields(req),
      updated_by: req.body.user?.id,
    },
    req.params.id
  );
  return responseWrapper(res, placeDoc, "Listing updated successfully");
});

const deletePlace = catchAsync(async (req, res) => {
  await placeService.deletePlace(req.params.id);
  return responseWrapper(res, "", "Deleted Successfully.", httpStatus.OK);
});

module.exports = {
  getExplore,
  findBusinessBySlug,
  getPlacesToVisit,
  findPlaceToVisitBySlug,
  getAllPlacesAdmin,
  findPlaceById,
  createPlace,
  updatePlace,
  deletePlace,
};