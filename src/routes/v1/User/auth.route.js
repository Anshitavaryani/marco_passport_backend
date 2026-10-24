const express = require("express");
const router = express.Router();

const { userAuthController } = require("../../../controllers");
const { userAuthMiddleware } = require("../../../middlewares");
const {
  registerEmailLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
} = require("../../../middlewares/rateLimiter");

router.use(userAuthMiddleware.setRoleIdIfNotPresent);

router.post(
  "/register",
  [registerEmailLimiter, userAuthMiddleware.validateRegisterUserBody],
  userAuthController.register,
);
router.post("/verify-email", userAuthController.verifyEmail);
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  userAuthController.resendVerification,
);
router.post(
  "/login",
  [userAuthMiddleware.validateSignInReqBody],
  userAuthController.login,
);
router.post("/forgot-password", forgotPasswordLimiter, userAuthController.forgotPassword);
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
