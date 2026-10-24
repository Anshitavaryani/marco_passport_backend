const express = require("express");
const { userController } = require("../../../controllers/Admin");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");
const router = express.Router();

router.use(adminAuthMiddleware.validateJWTtoken, roleMiddleware.isAdmin);

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
// Soft-deletes the users in body.user_id (a list, so several can go at once).
router.post("/", userController.deleteUsers);

module.exports = router;
