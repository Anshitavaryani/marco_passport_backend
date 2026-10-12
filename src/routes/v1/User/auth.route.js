const express = require("express");
const router = express.Router();

const { userAuthController } = require("../../../controllers");
const { userAuthMiddleware } = require("../../../middlewares");
const { emailLimiter } = require("../../../middlewares/rateLimiter");

router.use(userAuthMiddleware.setRoleIdIfNotPresent);

router.post(
  "/register",
  [emailLimiter, userAuthMiddleware.validateRegisterUserBody],
  userAuthController.register,
);
router.post("/verify-email", userAuthController.verifyEmail);
router.post(
  "/resend-verification",
  emailLimiter,
  userAuthController.resendVerification,
);
router.post(
  "/login",
  [userAuthMiddleware.validateSignInReqBody],
  userAuthController.login,
);
router.post("/forgot-password", emailLimiter, userAuthController.forgotPassword);
router.post("/reset-password", userAuthController.resetPassword);
router.post(
  "/change-password",
  [
    userAuthMiddleware.validateResetPassordBody,
    userAuthMiddleware.verifyAuthJWTToken,
  ],
  userAuthController.changePassword,
);
router.get(
  "/logout",
  [userAuthMiddleware.verifyAuthJWTToken],
  userAuthController.logout,
);

module.exports = router;
