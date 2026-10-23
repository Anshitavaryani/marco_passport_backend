const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const { newsletterService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const subscribe = catchAsync(async (req, res) => {
  const subscriber = await newsletterService.subscribe(req.body);

  return responseWrapper(
    res,
    subscriber,
    "Thanks for signing up.",
    httpStatus.CREATED,
  );
});

module.exports = {
  subscribe,
};
