const express = require("express");
const router = express.Router();

const { userOpController } = require("../../../controllers");
const { userAuthMiddleware } = require("../../../middlewares");

router.use(userAuthMiddleware.setRoleIdIfNotPresent);

router.get(
  "/profile",
  [userAuthMiddleware.verifyAuthJWTToken],
  userOpController.getProfile
);
// Was userOpController.notificationToogle (the typo) — user.controller.js
// exports both spellings (an alias added specifically for this
// situation), and this route file is the only confirmed consumer found
// so far, so switching it to the corrected name now.
router.post(
  "/notifications",
  [userAuthMiddleware.verifyAuthJWTToken],
  userOpController.notificationToggle
);
router.delete(
  "/deactivate",
  [userAuthMiddleware.verifyAuthJWTToken],
  userOpController.deactivateAccount
);

module.exports = router;
