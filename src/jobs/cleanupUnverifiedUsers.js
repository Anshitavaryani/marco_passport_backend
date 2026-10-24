const { Op } = require("sequelize");

const sequelize = require("../config/central.db");
const logger = require("../config/logger");
const { User, Profile, UserToken, UserAttachment } = require("../models");
const { userStatusTypes, tokenTypes } = require("../config/types");
const { UNVERIFIED_ACCOUNT_TTL_MS } = require("../services/User/auth.service");

const RUN_EVERY_MS = 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 60 * 1000; // give the DB connection time to come up

// Hard-deletes accounts that never verified their email within 24h of
// signing up (they can't log in, so they have no passports or reviews),
// and clears out expired email-link tokens.
const cleanupUnverifiedUsers = async () => {
  const cutoff = new Date(Date.now() - UNVERIFIED_ACCOUNT_TTL_MS);
  const stale = await User.findAll({
    where: { status: userStatusTypes.PENDING, created_at: { [Op.lt]: cutoff } },
    attributes: ["id"],
    paranoid: false,
  });
  const userIds = stale.map((user) => user.id);

  await sequelize.transaction(async (transaction) => {
    if (userIds.length) {
      const where = { user_id: userIds };
      await UserToken.destroy({ where, force: true, transaction });
      await UserAttachment.destroy({ where, force: true, transaction });
      await Profile.destroy({ where, force: true, transaction });
      await User.destroy({ where: { id: userIds }, force: true, transaction });
    }
    await UserToken.destroy({
      where: {
        token_type: [tokenTypes.VERIFY_EMAIL, tokenTypes.FORGOT_PASSWORD],
        expired_at: { [Op.lt]: new Date() },
      },
      force: true,
      transaction,
    });
  });

  if (userIds.length) {
    logger.info(`Deleted ${userIds.length} unverified account(s) older than 24h.`);
  }
};

// In-process scheduler: pm2 runs a single instance, and the job is safe to
// run twice anyway (it only deletes what's already expired).
const scheduleCleanupUnverifiedUsers = () => {
  const run = () =>
    cleanupUnverifiedUsers().catch((error) =>
      logger.error(`Unverified-account cleanup failed: ${error.message}`)
    );
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, RUN_EVERY_MS).unref();
};

module.exports = {
  cleanupUnverifiedUsers,
  scheduleCleanupUnverifiedUsers,
};
