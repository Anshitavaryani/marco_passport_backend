const httpStatus = require("http-status");
const { UniqueConstraintError } = require("sequelize");

const { NewsletterSubscriber } = require("../../models");
const ApiError = require("../../utils/ApiError");
const validateEmail = require("../../helpers/validateEmail");

const SOURCES = ["footer", "blog"];

// Signing up twice is fine: the visitor gets the same thank-you and the
// email is stored once.
const subscribe = async (reqBody) => {
  const email =
    typeof reqBody.email === "string" ? reqBody.email.trim().toLowerCase() : "";

  if (!email || !validateEmail(email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Please enter a valid email address.");
  }

  const source = SOURCES.includes(reqBody.source) ? reqBody.source : null;

  try {
    await NewsletterSubscriber.findOrCreate({
      where: { email },
      defaults: { email, source },
    });
  } catch (error) {
    // Two sign-ups for the same email at once: the other one saved it.
    if (!(error instanceof UniqueConstraintError)) throw error;
  }

  return { email };
};

module.exports = {
  subscribe,
};
