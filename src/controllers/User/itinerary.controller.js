const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const { itineraryService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

// req.body.user is set by userAuthMiddleware.verifyAuthJWTToken.
const userId = (req) => req.body.user.id;

const listItineraries = catchAsync(async (req, res) => {
  const itineraries = await itineraryService.listItineraries(userId(req));
  return responseWrapper(res, itineraries, "");
});

const getItinerary = catchAsync(async (req, res) => {
  const itinerary = await itineraryService.getItinerary(userId(req), req.params.id);
  return responseWrapper(res, itinerary, "");
});

const createItinerary = catchAsync(async (req, res) => {
  const itinerary = await itineraryService.createItinerary(userId(req), req.body);
  return responseWrapper(res, itinerary, "Itinerary saved.", httpStatus.CREATED);
});

const updateItinerary = catchAsync(async (req, res) => {
  const itinerary = await itineraryService.updateItinerary(
    userId(req),
    req.params.id,
    req.body
  );
  return responseWrapper(res, itinerary, "Itinerary updated.");
});

const addItem = catchAsync(async (req, res) => {
  const itinerary = await itineraryService.addItem(userId(req), req.params.id, req.body);
  return responseWrapper(res, itinerary, "Added to your itinerary.", httpStatus.CREATED);
});

const deleteItinerary = catchAsync(async (req, res) => {
  await itineraryService.deleteItinerary(userId(req), req.params.id);
  return responseWrapper(res, "", "Itinerary deleted.");
});

module.exports = {
  listItineraries,
  getItinerary,
  createItinerary,
  updateItinerary,
  addItem,
  deleteItinerary,
};
