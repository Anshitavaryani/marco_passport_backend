const express = require("express");
const router = express.Router();

const { userAuthMiddleware } = require("../../../middlewares");
const { itineraryController } = require("../../../controllers");

// Every itinerary route needs a logged-in user. Guests build a draft on the
// frontend and save it with POST / after logging in.
router.use(userAuthMiddleware.verifyAuthJWTToken);

router.get("/", itineraryController.listItineraries);
router.post("/", itineraryController.createItinerary);
router.get("/:id", itineraryController.getItinerary);
router.put("/:id", itineraryController.updateItinerary);
router.delete("/:id", itineraryController.deleteItinerary);
router.post("/:id/items", itineraryController.addItem);

module.exports = router;
