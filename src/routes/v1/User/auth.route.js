const express = require("express");
const router = express.Router();

const { userAuthController } = require("../../../controllers");
const { userAuthMiddleware } = require("../../../middlewares");

router.use(userAuthMiddleware.setRoleIdIfNotPresent);

// OTP-based email verification is disabled for now — this site uses
// frontend captcha for bot prevention at signup instead. Not deleted,
// just unmounted; uncomment these two lines plus the corresponding
// block in auth.service.js's register() to restore it.
// router.post("/otp", userAuthController.sendOTP);
// router.post("/verify-otp", userAuthController.verifyOTP);

router.post(
  "/register",
  [userAuthMiddleware.validateRegisterUserBody],
  userAuthController.register,
);
router.post(
  "/login",
  [userAuthMiddleware.validateSignInReqBody],
  userAuthController.login,
);
router.post(
  "/reset-password",
  [
    userAuthMiddleware.validateResetPassordBody,
    userAuthMiddleware.verifyAuthJWTToken,
  ],
  userAuthController.resetPassword,
);
router.post(
  "/forgot-password",
  [userAuthMiddleware.validateForgetPassordToken],
  userAuthController.forgotPassword,
);
router.get(
  "/logout",
  [userAuthMiddleware.verifyAuthJWTToken],
  userAuthController.logout,
);

module.exports = router;
