const express = require("express");
const router = express.Router();

const { userAuthController } = require("../../../controllers");
const { userAuthMiddleware } = require("../../../middlewares");

router.use(userAuthMiddleware.setRoleIdIfNotPresent);

router.post("/otp", userAuthController.sendOTP);
router.post("/verify-otp", userAuthController.verifyOTP);
router.post(
  "/register",
  [userAuthMiddleware.validateRegisterUserBody],
  userAuthController.register
);
router.post(
  "/login",
  [userAuthMiddleware.validateSignInReqBody],
  userAuthController.login
);
// Was missing validateResetPassordBody entirely — unlike the admin-side
// equivalent (/change-password), which correctly chains it. Without it,
// nothing checks that old_password/new_password/confirm_password are
// even present, or that new_password === confirm_password, before this
// reaches the controller (which only validates new/confirm, not whether
// old_password was provided at all) and then the service (which would
// call bcrypt.compare with an undefined old_password rather than
// rejecting with a clear "missing field" message).
router.post(
  "/reset-password",
  [
    userAuthMiddleware.validateResetPassordBody,
    userAuthMiddleware.verifyAuthJWTToken,
  ],
  userAuthController.resetPassword
);
router.post(
  "/forgot-password",
  [userAuthMiddleware.validateForgetPassordToken],
  userAuthController.forgotPassword
);
router.get(
  "/logout",
  [userAuthMiddleware.verifyAuthJWTToken],
  userAuthController.logout
);

module.exports = router;
