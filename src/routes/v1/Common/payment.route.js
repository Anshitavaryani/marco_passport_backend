const express = require('express');
const router = express.Router();

const { paymentController } = require('../../../controllers');
const { userAuthMiddleware } = require('../../../middlewares');

router.use(userAuthMiddleware.setRoleIdIfNotPresent);

router.get('/stripe/stripe-key', [userAuthMiddleware.verifyAuthJWTToken], paymentController.geStripeKeys);
router.post('/stripe/create-payment-intent', [userAuthMiddleware.verifyAuthJWTToken], paymentController.createPaymentIntent);
router.post('/stripe/charge-intent/webhooks', express.raw({type: 'application/json'}), paymentController.handleChargeAndIntentWebhook);
router.get('/count', paymentController.getNewPaymentCount);
router.get('/sum', paymentController.getNewPaymentTotal);

module.exports = router;