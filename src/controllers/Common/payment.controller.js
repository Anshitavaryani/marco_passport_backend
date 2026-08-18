const httpStatus = require("http-status");
const { Op } = require("sequelize");
const { format } = require("date-fns");
const Stripe = require("stripe");

const { Payment } = require("../../models");
const catchAsync = require("../../utils/catchAsync");
const ApiError = require("../../utils/ApiError");
const responseWrapper = require("../../config/responseWrapper");
const config = require("../../config/config");
const { currencyTypes, paymentModeTypes } = require("../../config/types");
const logger = require("../../config/logger");

const stripePublishableKey = config.STRIPE_PUBLISHABLE_KEY || "";
const stripeSecretKey = config.STRIPE_SECRET_KEY || "";
const stripeWebhookSecretIntentCharge =
  config.STRIPE_WEBHOOK_SECRET_INTENT_CHARGE || "";

function getKeys(payment_method) {
  let secret_key = stripeSecretKey;
  let publishable_key = stripePublishableKey;

  switch (payment_method) {
    case "grabpay":
    case "fpx":
      publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_MY;
      secret_key = process.env.STRIPE_SECRET_KEY_MY;
      break;
    case "au_becs_debit":
      publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_AU;
      secret_key = process.env.STRIPE_SECRET_KEY_AU;
      break;
    case "oxxo":
      publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_MX;
      secret_key = process.env.STRIPE_SECRET_KEY_MX;
      break;
    case "wechat_pay":
      publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_WECHAT;
      secret_key = process.env.STRIPE_SECRET_KEY_WECHAT;
      break;
    case "paypal":
      publishable_key = process.env.STRIPE_PUBLISHABLE_KEY_UK;
      secret_key = process.env.STRIPE_SECRET_KEY_UK;
      break;
    default:
      break;
  }

  return { secret_key, publishable_key };
}

const getCustomer = async (userDoc, paymentMethod) => {
  const customerObj = {
    name: userDoc.user_profile.name,
    email: userDoc.email,
    phone: userDoc.user_profile.mobile,
    description: `${config.app_name}#${userDoc.id}#${userDoc.role_id}#stripeCustomer`,
  };

  const { secret_key } = getKeys(paymentMethod);
  const stripe = new Stripe(secret_key, {
    apiVersion: "2022-11-15",
  });

  let customer;
  if (!userDoc.stripe_customer_id || userDoc.stripe_customer_id === "") {
    customer = await stripe.customers.create(customerObj);
    userDoc.stripe_customer_id = customer.id;
    await userDoc.save();
  } else {
    customer = await stripe.customers.retrieve(userDoc.stripe_customer_id);
  }
  return customer || false;
};

const geStripeKeys = catchAsync(async (req, res) => {
  const { publishable_key } = getKeys(req.query.paymentMethod);
  return responseWrapper(res, { publishable_key }, "");
});

const createPaymentIntent = catchAsync(async (req, res) => {
  const { paymentMethod, amount, currency, post_id, description, user } =
    req.body;
  const { publishable_key, secret_key } = getKeys(paymentMethod);
  const stripe = new Stripe(secret_key, {
    apiVersion: "2022-11-15",
  });

  const customer = await getCustomer(user, paymentMethod);
  const chargeAmount =
    (parseInt(amount, 10) ? parseInt(amount, 10) : config.DEFAULT_AMOUNT) * 100;
  const paymentIntent = await stripe.paymentIntents.create({
    customer: customer.id,
    amount: chargeAmount,
    currency: currency ? currency : currencyTypes.USD,
    payment_method_types: [
      paymentMethod ? paymentMethod : paymentModeTypes.CARD,
    ],
    metadata: {
      name: user.user_profile.name,
      user_name: user.user_name,
      email: user.email,
    },
  });

  const paymentObj = {
    transaction_id: paymentIntent.id,
    amount: chargeAmount,
    currency: currency ? currency : currencyTypes.USD,
    description: description,
    user_id: user.id,
    role_id: user.role_id,
    post_id: post_id,
    payment_method: paymentMethod ? paymentMethod : paymentModeTypes.CARD,
    stripe_customer_id: customer.id,
  };
  const paymentDoc = await Payment.create(paymentObj);
  if (!paymentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to initialize a Payment."
    );
  }

  return responseWrapper(
    res,
    {
      clientSecret: paymentIntent.client_secret,
      customer: customer.id,
      publishableKey: publishable_key,
    },
    ""
  );
});

// IMPORTANT, now fixed: this was calling
//   stripe.webhooks.constructEvent(req.body, sig, ...)
// but req.body is already JSON-parsed by app.js's global express.json()
// by the time it reaches this handler. Stripe's signature is computed
// over the exact raw request bytes — verifying against a parsed-then-
// implicitly-restringified object never matches the signature Stripe
// actually sent. This meant EVERY real webhook call from Stripe failed
// signature verification and threw, unconditionally — this endpoint has
// never worked. Fixed by using req.rawBody (captured via a `verify`
// callback added to express.json() in app.js) instead of req.body here.
const handleChargeAndIntentWebhook = catchAsync(async (req, res) => {
  const sig = req.headers["stripe-signature"];

  // Was: getKeys(paymentMethod = '') — `paymentMethod` was never
  // declared anywhere in this function. Without `const`/`let`, that
  // assignment silently created an implicit global variable (a classic
  // JS "sloppy mode" footgun) as a side effect of what was almost
  // certainly meant to just be getKeys(''). It happened to still work
  // because `x = y` evaluates to `y`, so the intended value did reach
  // getKeys() — but it was leaking a global on every single webhook
  // call in the meantime.
  const { secret_key } = getKeys("");
  const stripe = new Stripe(secret_key, {
    apiVersion: "2022-11-15",
  });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      stripeWebhookSecretIntentCharge
    );
  } catch (err) {
    logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Webhook signature verification failed."
    );
  }

  // NOTE: this switch statement has a case for ~30 Stripe event types,
  // but every single case is an empty stub — it destructures
  // event.data.object into an unused local variable and does nothing
  // else. None of them update the Payment record's payment_status
  // (PENDING/SUCCESS/REJECTED/REFUNDED) despite that column clearly
  // being designed for exactly this. This looks like an unfinished
  // feature rather than a bug I should silently "fix" by inventing
  // business logic for 30 event types on your behalf — happy to
  // implement the handlers for the events that map directly onto
  // payment_status (payment_intent.succeeded -> SUCCESS,
  // payment_intent.payment_failed -> REJECTED, charge.refunded ->
  // REFUNDED, at minimum) if you want that done now.
  switch (event.type) {
    default:
      logger.info(`Unhandled Stripe webhook event type: ${event.type}`);
  }

  logger.info(`Stripe webhook event received: ${event.type}`);
  return res.status(httpStatus.OK).json({ received: true });
});

const getNewPaymentCount = catchAsync(async (req, res) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const paymentDoc = await Payment.findAll({
    attributes: ["id"],
    where: {
      created_at: { [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`] },
      payment_status: "SUCCESS",
    },
  });
  return responseWrapper(res, paymentDoc.length, "");
});

const getNewPaymentTotal = catchAsync(async (req, res) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const paymentDoc = await Payment.findAll({
    attributes: ["id", "amount"],
    where: {
      created_at: { [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`] },
      payment_status: "SUCCESS",
    },
  });
  const totalPayment = paymentDoc
    .map((obj) => obj.amount)
    .reduce((a, b) => a + b, 0);
  return responseWrapper(res, totalPayment, "");
});

module.exports = {
  geStripeKeys,
  createPaymentIntent,
  handleChargeAndIntentWebhook,
  getNewPaymentCount,
  getNewPaymentTotal,
};
