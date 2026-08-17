const httpStatus = require("http-status");

const { Faq } = require("../../models");
const ApiError = require("../../utils/ApiError");

// Removed from this file: bcrypt, crypto, Sequelize/QueryTypes/Op,
// moment, randomatic, axios, sequelize (central.db), Admin, Role,
// Timezone, validateEmail, validatePassword — none of these were used
// by any of the four actual FAQ functions below. They look like
// leftovers from copy-pasting an admin-auth-style file as a starting
// point. Also removed: a `createTimezone`/`main()` function that called
// a third-party API (timeapi.io) to seed the Timezone table — completely
// unrelated to FAQs, not exported, and its only caller (`main()`) was
// commented out, so it was 100% dead/unreachable code. If you still need
// one-time timezone seeding, that belongs in src/seeders/, not a live
// service file — happy to set that up properly if it's still needed.

const createFaq = async (reqBody) => {
  const faqObj = {
    question: reqBody.question,
    answer: reqBody.answer,
  };
  const faqDoc = await Faq.create(faqObj);
  if (!faqDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new FAQ"
    );
  }
  return faqDoc;
};

const getAllFaq = async () => {
  const faqDoc = await Faq.findAll({
    attributes: ["id", "question", "answer"],
    where: { is_active: true },
  });
  return faqDoc;
};

const updateFaq = async (reqBody, id) => {
  const { question, answer } = reqBody;
  const faqObj = {};

  if (question && typeof question === "string" && question !== "")
    faqObj["question"] = question;
  if (answer && typeof answer === "string" && answer !== "")
    faqObj["answer"] = answer;

  // Was: `if (!faqDoc) throw ...` right after Faq.update(...). Bulk
  // .update() returns [affectedCount] — an array, which is always
  // truthy even when affectedCount is 0 (e.g. `id` doesn't exist). That
  // check could never actually trigger, so updating a non-existent FAQ
  // silently "succeeded" with no error at all.
  const [affectedCount] = await Faq.update(faqObj, { where: { id: id } });
  if (affectedCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found");
  }

  const updatedFaq = await Faq.findByPk(id);
  return updatedFaq;
};

const deleteFaq = async (id) => {
  const faqDoc = await Faq.findOne({ where: { id: id, is_active: true } });
  if (!faqDoc) {
    // Was httpStatus.INTERNAL_SERVER_ERROR (500) for a plain invalid
    // id — that's a client input problem, not a server malfunction.
    throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found");
  }
  await faqDoc.destroy();
  return "";
};

module.exports = {
  createFaq,
  getAllFaq,
  updateFaq,
  deleteFaq,
};
