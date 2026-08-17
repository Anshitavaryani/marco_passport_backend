const httpStatus = require("http-status");

const { ContactUs } = require("../../models");
const ApiError = require("../../utils/ApiError");

const createContactUs = async (reqBody) => {
  const contactUsObj = {
    email: reqBody.email,
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
  return !!contactUsDoc;
};

const updateContactUs = async (reqBody, id) => {
  const contactUsDoc = await ContactUs.findByPk(id);
  if (!contactUsDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Data not found");
  }

  // Simplified: `reqBody.email && typeof reqBody.email !== 'undefined' && reqBody.email !== ''`
  // — the typeof check was redundant, `reqBody.email &&` already
  // short-circuits on undefined before typeof is ever reached.
  if (reqBody.email) contactUsDoc.email = reqBody.email;
  if (reqBody.address) contactUsDoc.address = reqBody.address;
  if (reqBody.mobile) contactUsDoc.mobile = reqBody.mobile;

  await contactUsDoc.save();
  return contactUsDoc;
};

const getAllContactUs = async () => {
  const contactUsDoc = await ContactUs.findAll({
    attributes: ["id", "email", "address", "mobile"],
    where: { is_active: true },
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
