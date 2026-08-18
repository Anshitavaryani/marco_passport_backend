const nodemailer = require("nodemailer");
const config = require("../../config/config");
const logger = require("../../config/logger");
// Moved from public/Email_Template — that folder was served as static
// content by express.static in app.js (mounted at the root, unprefixed),
// meaning these template files' raw source was directly fetchable by
// anyone at e.g. GET /Email_Template/sendForgotPasswordOTPtemplate.js.
// Relocated to live next to the service that actually uses them.

const ApiError = require("../../utils/ApiError");
const forgotPasswordSendOTPFormat = require("../../../public/Email_Template/sendForgotPasswordOTPtemplate");
const emailVerificationFormat = require("../../../public/Email_Template/sendEmailVerificationFormat");

const transport = nodemailer.createTransport(config.email.smtp);

if (config.env !== "test") {
  transport
    .verify()
    .then(() => logger.info("Connected to email server successfully😊."))
    .catch(() =>
      logger.warn(
        "Unable to connect to email server. Make sure you have configured the SMTP options in .env 🥺"
      )
    );
}

const sendEmail = async (to, subject, text) => {
  const msg = { from: config.email.from, to, subject, text };
  return transport.sendMail(msg);
};

const sendEmailVerification = async (to, otp) => {
  const message = {
    from: config.email.from,
    to: to,
    subject: "Please verify your email",
    // Was: "Please click on the following link to verify your email"
    // — there is no link, this is an OTP code flow. The plain-text
    // fallback is what shows in clients that don't render HTML
    // (some corporate mail filters, screen readers, etc.), so it
    // should describe what's actually being asked of the user.
    text: `Your ${config.app_name} verification code is ${otp}. It is valid for 5 minutes. If you did not request this, you can ignore this email.`,
    html: emailVerificationFormat(otp),
  };
  // Was: transport.sendMail(message, (error, info) => { ... }) — the
  // callback's return true/false never propagated anywhere (this
  // function is async but never itself returned anything, so it
  // always resolved to undefined regardless of outcome), and on
  // failure it only did console.log(...) — the error was completely
  // swallowed. A genuine SMTP failure meant a user's verification
  // email silently never sent, with success still reported to the
  // caller and nothing surfaced anywhere except a buried console.log.
  // nodemailer's sendMail returns a real Promise when no callback is
  // passed — using that lets a real send failure propagate as an
  // actual thrown error, which now reaches errorHandler.js (full
  // stack trace logged, safe generic message to the client) instead
  // of vanishing.
  return transport.sendMail(message);
};

const sendForgotPasswordOTP = async (to, otp) => {
  const message = {
    from: config.email.from,
    to: to,
    subject: "Forgot Password Request",
    text: `Your ${config.app_name} password reset code is ${otp}. It is valid for 5 minutes. If you did not request a password reset, you can ignore this email.`,
    html: forgotPasswordSendOTPFormat(otp),
  };
  return transport.sendMail(message);
};

const sendResetPasswordConfirmationMail = async (to) => {
  const subject = "Successfully Changed password";
  const text = `Dear user,
    Your password has been changed successfully.
    If you did not request this password reset, please contact support immediately.`;
  return sendEmail(to, subject, text);
};

module.exports = {
  sendForgotPasswordOTP,
  sendResetPasswordConfirmationMail,
  sendEmailVerification,
};
