const express = require("express");
const router = express.Router();

const { userAuthMiddleware } = require("../../../middlewares");
const { passportController } = require("../../../controllers");

// Every passport route needs a logged-in user. Guests build a draft on the
// frontend and save it with POST / after logging in.
router.use(userAuthMiddleware.verifyAuthJWTToken);

router.get("/", passportController.listPassports);
router.post("/", passportController.createPassport);
router.get("/:id", passportController.getPassport);
router.put("/:id", passportController.updatePassport);
router.delete("/:id", passportController.deletePassport);
router.post("/:id/items", passportController.addItem);

module.exports = router;
