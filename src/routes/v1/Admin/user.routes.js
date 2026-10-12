const express = require("express");
const { userController } = require("../../../controllers/Admin");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");
const router = express.Router();

router.use(adminAuthMiddleware.validateJWTtoken, roleMiddleware.isAdmin);

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.deleteUsers);

module.exports = router;
