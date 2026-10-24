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

const listSubscribers = catchAsync(async (req, res) => {
  const result = await newsletterService.listSubscribers(req.query);
  return responseWrapper(res, result, "");
});

// A CSV file rather than the usual JSON wrapper, so it downloads as is.
const exportSubscribers = catchAsync(async (req, res) => {
  const csv = await newsletterService.exportSubscribersCsv(req.query);
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="newsletter-subscribers-${date}.csv"`,
  );
  // Lets the admin panel (another origin) read the file name.
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  return res.status(httpStatus.OK).send(csv);
});

const deleteSubscriber = catchAsync(async (req, res) => {
  await newsletterService.deleteSubscriber(req.params.id);
  return responseWrapper(res, "", "Subscriber removed.");
});

module.exports = {
  subscribe,
  listSubscribers,
  exportSubscribers,
  deleteSubscriber,
};
