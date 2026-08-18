const express = require("express");
const router = express.Router();

const { paymentController } = require("../../../controllers");
const {
  userAuthMiddleware,
  adminAuthMiddleware,
  roleMiddleware,
} = require("../../../middlewares");

router.use(userAuthMiddleware.setRoleIdIfNotPresent);

router.get(
  "/stripe/stripe-key",
  [userAuthMiddleware.verifyAuthJWTToken],
  paymentController.geStripeKeys
);
router.post(
  "/stripe/create-payment-intent",
  [userAuthMiddleware.verifyAuthJWTToken],
  paymentController.createPaymentIntent
);

// Was: router.post('/stripe/charge-intent/webhooks', express.raw({type: 'application/json'}), ...)
// This express.raw() never actually did anything — app.js's global
// express.json() runs earlier in the middleware chain (registered
// before /api/v1 is ever mounted), so by the time a request reaches
// this route-specific middleware, the body stream has already been
// fully consumed. The real fix now lives in app.js: express.json() was
// given a `verify` callback that captures the raw bytes into
// req.rawBody alongside the normal parse, and the controller already
// uses req.rawBody (not req.body) for Stripe's signature check. No
// route-level middleware is correct here at all — Stripe's own request
// isn't authenticated by a user token; the signature check inside the
// controller *is* the authentication for this route.
router.post(
  "/stripe/charge-intent/webhooks",
  paymentController.handleChargeAndIntentWebhook
);

// Were completely unauthenticated — today's transaction count and
// revenue total are business-confidential figures, not public data.
const requireAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isAdmin,
];
router.get("/count", requireAdmin, paymentController.getNewPaymentCount);
router.get("/sum", requireAdmin, paymentController.getNewPaymentTotal);

module.exports = router;
