const httpStatus = require("http-status");

const { User, UserAttachment, Profile } = require("../../models");
const ApiError = require("../../utils/ApiError");

const getProfile = async (body, headers) => {
  const { user } = body;
  const { role_id } = headers;

  const result = await User.findOne({
    attributes: [
      "id",
      "user_name",
      "email",
      "role_id",
      "stripe_customer_id",
      "socket_id",
      "fcm_token",
      "status",
      "notification_status",
    ],
    include: [
      {
        model: Profile,
        as: "user_profile",
        attributes: [
          "name",
          "dialing_code",
          "mobile",
          "is_active",
          "created_at",
        ],
      },
      {
        model: UserAttachment,
        as: "user_attachments",
        attributes: [
          "id",
          "title",
          "file_type",
          "file_name",
          "file_uri",
          "role_id",
        ],
        order: [["id", "desc"]],
        limit: 1,
      },
    ],
    where: { id: user?.id, is_active: true, role_id: role_id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Profile not found.");
  }
  return result;
};

const deactivateAccount = async (reqBody) => {
  const { user } = reqBody;
  await user.destroy();
  return "";
};

const notificationToggle = async (body) => {
  const { user } = body;
  user.notification_status = !user.notification_status;
  await user.save();
  return user;
};

module.exports = {
  getProfile,
  deactivateAccount,
  notificationToggle,
};