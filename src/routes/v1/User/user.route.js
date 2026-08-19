const express = require("express");
const router = express.Router();

const { userAuthMiddleware } = require("../../../middlewares");
const { userController } = require("../../../controllers");

router.use(userAuthMiddleware.setRoleIdIfNotPresent);

router.get(
  "/profile",
  [userAuthMiddleware.verifyAuthJWTToken],
  userController.getProfile
);
// Was userController.notificationToogle (the typo) — user.controller.js
// exports both spellings (an alias added specifically for this
// situation), and this route file is the only confirmed consumer found
// so far, so switching it to the corrected name now.
router.post(
  "/notifications",
  [userAuthMiddleware.verifyAuthJWTToken],
  userController.notificationToggle
);
router.delete(
  "/deactivate",
  [userAuthMiddleware.verifyAuthJWTToken],
  userController.deactivateAccount
);

module.exports = router;
