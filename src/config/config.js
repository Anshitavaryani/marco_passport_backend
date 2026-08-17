const dotenv = require("dotenv");
const path = require("path");
const Joi = require("joi");

dotenv.config({ path: path.join(__dirname, "../../.env") });

// Small helper: mark a var as required in production, optional elsewhere.
// Lets local/dev/test run with a lighter .env while still failing fast in
// prod if something genuinely required (DB password, CORS allow-list,
// SMTP creds the OTP flow depends on) is missing.
const requiredInProd = (schema) =>
  schema.when("NODE_ENV", {
    is: "production",
    then: schema.required(),
    otherwise: schema.optional(),
  });

const envVarsSchema = Joi.object()
  .keys({
    APP_NAME: Joi.string().required().description("Your Application Name"),
    NODE_ENV: Joi.string()
      .valid("production", "development", "test")
      .required(),
    PORT: Joi.number().default(5000),

    CENTRAL_MYSQL_HOST: Joi.string()
      .required()
      .description("Central Mysql Host"),
    CENTRAL_MYSQL_USER: Joi.string()
      .required()
      .description("Central Mysql User"),
    CENTRAL_MYSQL_PASSWORD: requiredInProd(Joi.string().allow("")).description(
      "Central Mysql Password"
    ),
    CENTRAL_MYSQL_DB: Joi.string().required().description("Central Mysql DB"),
    CENTRAL_MYSQL_PORT: Joi.number()
      .default(3306)
      .description("Central Mysql Port"),

    JWT_SECRET: Joi.string().required().description("JWT secret key"),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
      .default(30)
      .description("minutes after which access tokens expire"),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
      .default(30)
      .description("days after which refresh tokens expire"),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description("minutes after which reset password token expires"),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description("minutes after which verify email token expires"),

    SMTP_HOST: requiredInProd(Joi.string()).description(
      "server that will send the emails"
    ),
    SMTP_PORT: requiredInProd(Joi.number()).description(
      "port to connect to the email server"
    ),
    SMTP_USERNAME: requiredInProd(Joi.string()).description(
      "username for email server"
    ),
    SMTP_PASSWORD: requiredInProd(Joi.string()).description(
      "password for email server"
    ),
    EMAIL_FROM: requiredInProd(Joi.string()).description(
      "the from field in the emails sent by the app"
    ),

    DEFAULT_API_DATA_LIMIT: Joi.number().default(15),
    ACCESSDOMAINS: requiredInProd(Joi.string()).description(
      "All allow origin URLs, comma separated"
    ),
    STORY_VALIDATION_TIME_SPAN_HOURS: Joi.string().description(
      "How much time a story is valid to show"
    ),
    API_BASE_URL: Joi.string().description("Base url for apis"),
    ADMIN_BASE_URL: Joi.string().description("Base url for Admin apis"),
    DEFAULT_TIMEZONE: Joi.string()
      .default("UTC")
      .description("Default Timezone for application"),

    STRIPE_PUBLISHABLE_KEY: Joi.string().description("Stripe Publishable Key"),
    STRIPE_SECRET_KEY: Joi.string().description("Stripe Secret Key"),
    STRIPE_WEBHOOK_SECRET_INTENT_CHARGE: Joi.string().description(
      "Stripe webhook secret (charge intent)"
    ),
    STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE: Joi.string().description(
      "Stripe webhook secret (invoice price)"
    ),

    // Redis is optional infra for now — see note in redis.js. Defaults
    // match what was previously hardcoded so behavior doesn't change
    // for anyone not setting these.
    REDIS_HOST: Joi.string().default("127.0.0.1").description("Redis host"),
    REDIS_PORT: Joi.number().default(6379).description("Redis port"),
    REDIS_PASSWORD: Joi.string()
      .allow("")
      .default("")
      .description("Redis password, if any"),
    REDIS_DB: Joi.number().default(0).description("Redis logical DB index"),

    SUP_ADM_ROLE_ID: Joi.string(),
    ADM_ROLE_ID: Joi.string(),
    SUB_ADM_ROLE_ID: Joi.string(),
    ENG_ROLE_ID: Joi.string(),
    EDTR_ROLE_ID: Joi.string(),
    USR_ROLE_ID: Joi.string(),
    SP_ROLE_ID: Joi.string(),
    ADM_DEPT_ID: Joi.string(),
    DEFAULT_AMOUNT: Joi.number().default(5),
    DEFAULT_CATEGORY_ID: Joi.number().default(1),
    SUPER_ADMIN_NAME: Joi.string(),
    SUPER_ADMIN_PASSWORD: Joi.string(),
    SUPER_ADMIN_EMAIL: Joi.string(),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: "key" } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  app_name: envVars.APP_NAME,
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  databases: {
    central: {
      db: envVars.CENTRAL_MYSQL_DB,
      port: envVars.CENTRAL_MYSQL_PORT,
      host: envVars.CENTRAL_MYSQL_HOST,
      user: envVars.CENTRAL_MYSQL_USER,
      passwd: envVars.CENTRAL_MYSQL_PASSWORD,
    },
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    db: envVars.REDIS_DB,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    // Fixed: this previously read JWT_ACCESS_EXPIRATION_DAYS, which
    // isn't a real env var, so access tokens were expiring based on
    // `undefined` (see token.service.js when that file comes through).
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes:
      envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  accessDomains: envVars.ACCESSDOMAINS,
  defaultLimit: envVars.DEFAULT_API_DATA_LIMIT,
  API_BASE_URL: envVars.API_BASE_URL,
  ADMIN_BASE_URL: envVars.ADMIN_BASE_URL,
  DEFAULT_TIMEZONE: envVars.DEFAULT_TIMEZONE,
  STORY_VALIDATION_TIME_SPAN_HOURS: envVars.STORY_VALIDATION_TIME_SPAN_HOURS,

  STRIPE_PUBLISHABLE_KEY: envVars.STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY: envVars.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET_INTENT_CHARGE:
    envVars.STRIPE_WEBHOOK_SECRET_INTENT_CHARGE,
  STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE:
    envVars.STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE,

  SUP_ADM_ROLE_ID: envVars.SUP_ADM_ROLE_ID,
  ADM_ROLE_ID: envVars.ADM_ROLE_ID,
  SUB_ADM_ROLE_ID: envVars.SUB_ADM_ROLE_ID,
  ENG_ROLE_ID: envVars.ENG_ROLE_ID,
  EDTR_ROLE_ID: envVars.EDTR_ROLE_ID,
  USR_ROLE_ID: envVars.USR_ROLE_ID,
  SP_ROLE_ID: envVars.SP_ROLE_ID,
  ADM_DEPT_ID: envVars.ADM_DEPT_ID,
  DEFAULT_AMOUNT: envVars.DEFAULT_AMOUNT,
  DEFAULT_CATEGORY_ID: envVars.DEFAULT_CATEGORY_ID,
  SUPER_ADMIN_NAME: envVars.SUPER_ADMIN_NAME,
  SUPER_ADMIN_PASSWORD: envVars.SUPER_ADMIN_PASSWORD,
  SUPER_ADMIN_EMAIL: envVars.SUPER_ADMIN_EMAIL,
};
