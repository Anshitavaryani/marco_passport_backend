const nodemailer = require("nodemailer");
const config = require("../../config/config");
const logger = require("../../config/logger");
const forgotPasswordSendOTPFormat = require("../../templates/email/forgotPasswordOTP");
const actionLinkFormat = require("../../templates/email/actionLink");

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

const sendVerificationEmail = async (to, url) => {
  const message = {
    from: config.email.from,
    to,
    subject: `Verify your ${config.app_name} email`,
    text: `Welcome to ${config.app_name}! Verify your email by opening this link (valid for 24 hours): ${url}\n\nIf you didn't sign up, you can ignore this email; the account will be removed automatically.`,
    html: actionLinkFormat({
      title: "Verify your email",
      intro: `Welcome to ${config.app_name}! Please confirm your email address to activate your account. This link is valid for 24 hours.`,
      buttonText: "Verify email",
      url,
      footnote:
        "If you didn't sign up, you can ignore this email; the account will be removed automatically.",
    }),
  };
  return transport.sendMail(message);
};

const sendPasswordResetEmail = async (to, url) => {
  const message = {
    from: config.email.from,
    to,
    subject: `Reset your ${config.app_name} password`,
    text: `Reset your ${config.app_name} password by opening this link (valid for 1 hour): ${url}\n\nIf you didn't request a password reset, you can ignore this email; your password won't change.`,
    html: actionLinkFormat({
      title: "Reset your password",
      intro: `A password reset was requested for your ${config.app_name} account. Click the button below to choose a new password. This link is valid for 1 hour.`,
      buttonText: "Reset password",
      url,
      footnote:
        "If you didn't request a password reset, you can ignore this email; your password won't change.",
    }),
  };
  return transport.sendMail(message);
};

const sendAdminCredentials = async (to, password) => {
	const subject = "Welcome to  Marco Passport: Your Login Credentials";
	const text = `Dear User,

  Welcome to  Marco Passport! You have been successfully registered by our admin. Please find your login credentials below:

  Email Address: ${to}
  Temporary Password: ${password}

  
  For security reasons, we highly recommend changing your password after your first login. If you did not create this account, please ignore this email.
  
  Best Regards,
  Marco Passport Team`;
	return await sendEmail(to, subject, text);
};

module.exports = {
  sendForgotPasswordOTP,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAdminCredentials
};
