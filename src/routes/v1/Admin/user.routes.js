/** @format */

const express = require("express");
const { userController } = require("../../../controllers/Admin");
const router = express.Router();

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.deleteUsers);

module.exports = router;
