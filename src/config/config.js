const dotenv = require("dotenv");
const path = require("path");
const Joi = require("joi");

dotenv.config({ path: path.join(__dirname, "../../.env") });

// Required in production, optional elsewhere.
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

    FRONTEND_URL: requiredInProd(Joi.string().uri()).description(
      "Public site URL used to build links in emails (verify email, reset password)"
    ),

    DEFAULT_API_DATA_LIMIT: Joi.number().default(15),
    ACCESSDOMAINS: requiredInProd(Joi.string()).description(
      "All allow origin URLs, comma separated"
    ),
    DEFAULT_TIMEZONE: Joi.string()
      .default("UTC")
      .description("Default Timezone for application"),

    SUP_ADM_ROLE_ID: Joi.string(),
    USR_ROLE_ID: Joi.string(),
    ADM_DEPT_ID: Joi.string(),
    SUPER_ADMIN_NAME: Joi.string(),
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
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
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
  frontendUrl: (envVars.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, ""),
  accessDomains: envVars.ACCESSDOMAINS,
  defaultLimit: envVars.DEFAULT_API_DATA_LIMIT,
  DEFAULT_TIMEZONE: envVars.DEFAULT_TIMEZONE,
  SUP_ADM_ROLE_ID: envVars.SUP_ADM_ROLE_ID,
  USR_ROLE_ID: envVars.USR_ROLE_ID,
  ADM_DEPT_ID: envVars.ADM_DEPT_ID,
  SUPER_ADMIN_NAME: envVars.SUPER_ADMIN_NAME,
  SUPER_ADMIN_EMAIL: envVars.SUPER_ADMIN_EMAIL,
};
