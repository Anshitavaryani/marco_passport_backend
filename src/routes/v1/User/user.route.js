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
