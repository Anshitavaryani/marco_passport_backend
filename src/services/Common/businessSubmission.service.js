const httpStatus = require("http-status");

const { BusinessSubmission } = require("../../models");
const ApiError = require("../../utils/ApiError");

const PLAN_PRICES = {
  full_page: 500,
  half_page: 300,
  business_card: 150,
};

const createSubmission = async (reqBody) => {
  const {
    business_name,
    contact_name,
    email,
    phone,
    website,
    plan,
    additional_details,
  } = reqBody;

  if (!business_name || !contact_name || !email || !phone || !plan) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please enter required fields: [business_name, contact_name, email, phone, plan]",
    );
  }

  if (!PLAN_PRICES[plan]) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid plan. Must be one of: full_page, half_page, business_card",
    );
  }

  const submission = await BusinessSubmission.create({
    business_name,
    contact_name,
    email,
    phone,
    website: website || null,
    plan,
    amount: PLAN_PRICES[plan],
    additional_details: additional_details || null,
    status: "pending",
  });

  if (!submission) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to submit business request.",
    );
  }

  return submission;
};

const getAllSubmissions = async () => {
  return await BusinessSubmission.findAll({
    order: [["created_at", "DESC"]],
  });
};

module.exports = {
  createSubmission,
  getAllSubmissions,
};
