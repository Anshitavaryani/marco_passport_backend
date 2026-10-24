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

const updateSubmissionStatus = catchAsync(async (req, res) => {
  const submission = await businessSubmissionService.updateSubmissionStatus(
    req.params.id,
    req.body.status,
  );

  return responseWrapper(res, submission, "Business request updated.");
});

module.exports = {
  createSubmission,
  getAllSubmissions,
  updateSubmissionStatus,
};
