const httpStatus = require("http-status");
const catchAsync = require("../../utils/catchAsync");
const { contactUsService } = require("../../services");
const responseWrapper = require("../../config/responseWrapper");

const createContactUs = catchAsync(async (req, res) => {
  // Was discarding the return value (responseWrapper(res, '', ...)) —
  // the service already returns the created record (just fixed to
  // return the actual doc instead of a bare boolean too), matching
  // the same fix just made to faq.controller.js / role.controller.js.
  const contactUsDoc = await contactUsService.createContactUs(req.body);
  return responseWrapper(
    res,
    contactUsDoc,
    "New Contact Us Data Created Successfully.",
    httpStatus.CREATED
  );
});

const updateContactUs = catchAsync(async (req, res) => {
  const contactUsDoc = await contactUsService.updateContactUs(
    req.body,
    req.params.id
  );
  return responseWrapper(res, contactUsDoc, "Update Successfully.");
});

const getAllContactUs = catchAsync(async (req, res) => {
  const contactUs = await contactUsService.getAllContactUs();
  return responseWrapper(res, contactUs, "");
});

const deleteContactUs = catchAsync(async (req, res) => {
  await contactUsService.deleteContactUs(req.params.id);
  // Fixed typo: "Successfull" -> "Successful" (same typo also existed
  // in department.controller.js, fixed there too below).
  return responseWrapper(res, "", "Deleted Successfully.");
});

module.exports = {
  createContactUs,
  getAllContactUs,
  updateContactUs,
  deleteContactUs,
};
