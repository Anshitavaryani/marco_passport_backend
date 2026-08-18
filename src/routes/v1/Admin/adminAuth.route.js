const express = require("express");
const router = express.Router();

const { adminAuthController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// CRITICAL, now fixed: this had zero authentication — validateCreateAdminBody
// only checks the request body's shape (required fields present, the
// requested role_id isn't literally the super-admin role, email not
// taken); it never checks who is making the request. That meant anyone,
// with no login at all, could create a new Admin/SubAdmin/Engineer/
// Editor account by POSTing here. Gated to super-admin-only, matching
// the same tier as role management — creating admin accounts is exactly
// the kind of operation that should require an existing super admin,
// not be open to the internet.
router.post(
  "/register",
  [
    adminAuthMiddleware.validateJWTtoken,
    roleMiddleware.isSuperAdmin,
    adminAuthMiddleware.validateCreateAdminBody,
  ],
  adminAuthController.createAdminUser
);
router.post(
  "/login",
  [adminAuthMiddleware.validateLoginAdminBody],
  adminAuthController.loginAdminUser
);
router.post(
  "/change-password",
  [
    adminAuthMiddleware.validateResetPassordBody,
    adminAuthMiddleware.validateJWTtoken,
  ],
  adminAuthController.resetAdminPassword
);
// otp / verify-otp / forgot-password correctly stay unauthenticated —
// this is the admin "I forgot my password and can't log in" recovery
// flow, which can't require a valid JWT by definition.
router.post("/otp", adminAuthController.sendOTP);
router.post("/verify-otp", adminAuthController.verifyOTP);
router.post("/forgot-password", adminAuthController.forgotAdminPassword);

module.exports = router;
