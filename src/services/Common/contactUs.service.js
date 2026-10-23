const httpStatus = require("http-status");

const { ContactUs } = require("../../models");
const ApiError = require("../../utils/ApiError");
const validateEmail = require("../../helpers/validateEmail");

const MAX_NAME_LENGTH = 150;
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

const text = (value) => (typeof value === "string" ? value.trim() : "");

// The public contact form: name, email and message are required.
const createContactUs = async (reqBody) => {
  const name = text(reqBody.name);
  const email = text(reqBody.email).toLowerCase();
  const subject = text(reqBody.subject);
  const message = text(reqBody.message);

  if (!name || !email || !message) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please enter required fields: [name, email, message]"
    );
  }
  if (!validateEmail(email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Please enter a valid email address.");
  }
  if (
    name.length > MAX_NAME_LENGTH ||
    subject.length > MAX_SUBJECT_LENGTH ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Please keep the name under ${MAX_NAME_LENGTH} characters, the subject under ${MAX_SUBJECT_LENGTH} and the message under ${MAX_MESSAGE_LENGTH}.`
    );
  }

  const contactUsObj = {
    name,
    email,
    subject: subject || null,
    message,
    mobile: reqBody.mobile,
    address: reqBody.address,
  };

  const contactUsDoc = await ContactUs.create(contactUsObj);
  if (!contactUsDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new ContactUs"
    );
  }
  return contactUsDoc;
};

const updateContactUs = async (reqBody, id) => {
  const contactUsDoc = await ContactUs.findByPk(id);
  if (!contactUsDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Data not found");
  }

  if (reqBody.email) contactUsDoc.email = reqBody.email;
  if (reqBody.address) contactUsDoc.address = reqBody.address;
  if (reqBody.mobile) contactUsDoc.mobile = reqBody.mobile;

  await contactUsDoc.save();
  return contactUsDoc;
};

const getAllContactUs = async () => {
  const contactUsDoc = await ContactUs.findAll({
    attributes: [
      "id",
      "name",
      "email",
      "subject",
      "message",
      "address",
      "mobile",
      "created_at",
    ],
    where: { is_active: true },
    order: [["created_at", "DESC"]],
  });
  return contactUsDoc;
};

const deleteContactUs = async (id) => {
  const contactUsDoc = await ContactUs.findByPk(id);
  if (!contactUsDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Data not found");
  }
  await contactUsDoc.destroy();
};

module.exports = {
  createContactUs,
  getAllContactUs,
  updateContactUs,
  deleteContactUs,
};
