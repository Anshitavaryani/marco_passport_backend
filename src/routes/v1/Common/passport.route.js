const express = require("express");
const router = express.Router();

const { passportController } = require("../../../controllers");
const { userAuthMiddleware } = require("../../../middlewares");

const requireUser = [userAuthMiddleware.verifyAuthJWTToken];

router.get("/", requireUser, passportController.getPassportList);
router.post("/", requireUser, passportController.addToPassport);
router.put("/:id", requireUser, passportController.updateVisitDate);
router.delete("/:id", requireUser, passportController.removeFromPassport);

module.exports = router;