const express = require("express");
const router = express.Router();

const { adminAuthController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

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
router.post("/otp", adminAuthController.sendOTP);
router.post("/verify-otp", adminAuthController.verifyOTP);
router.post("/forgot-password", adminAuthController.forgotAdminPassword);

// The logged-in admin's own profile — registered before the /:id
// route below so "/profile" is never accidentally captured as a
// dynamic :id.
router.get(
  "/profile",
  [adminAuthMiddleware.validateJWTtoken],
  adminAuthController.getProfile
);

// Admin management (viewing/editing/removing OTHER admin accounts) —
// gated to super-admin only, matching /register's existing precedent.
router.get(
  "/all",
  [adminAuthMiddleware.validateJWTtoken, roleMiddleware.isSuperAdmin],
  adminAuthController.getAllAdmins
);
router.get(
  "/:id",
  [adminAuthMiddleware.validateJWTtoken, roleMiddleware.isSuperAdmin],
  adminAuthController.findAdminById
);
router.put(
  "/:id",
  [adminAuthMiddleware.validateJWTtoken, roleMiddleware.isSuperAdmin],
  adminAuthController.updateAdmin
);
router.delete(
  "/:id",
  [adminAuthMiddleware.validateJWTtoken, roleMiddleware.isSuperAdmin],
  adminAuthController.deleteAdmin
);

module.exports = router;