const httpStatus = require("http-status");

const { Faq } = require("../../models");
const ApiError = require("../../utils/ApiError");


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

  // Bulk update returns [affectedCount]; 0 means the id doesn't exist.
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
