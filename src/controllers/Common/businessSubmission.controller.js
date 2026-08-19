const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const { businessSubmissionService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const createSubmission = catchAsync(async (req, res) => {
  const submission = await businessSubmissionService.createSubmission(req.body);

  return responseWrapper(
    res,
    submission,
    "Business submission received successfully.",
    httpStatus.CREATED,
  );
});

const getAllSubmissions = catchAsync(async (req, res) => {
  const submissions = await businessSubmissionService.getAllSubmissions();

  return responseWrapper(res, submissions, "");
});

module.exports = {
  createSubmission,
  getAllSubmissions,
};
