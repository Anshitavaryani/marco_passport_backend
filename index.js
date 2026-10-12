const app = require('./app.js');
const config = require('./src/config/config.js');
const logger = require('./src/config/logger.js');
const { scheduleCleanupUnverifiedUsers } = require('./src/jobs/cleanupUnverifiedUsers.js');

process.env.TZ = config.DEFAULT_TIMEZONE;

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

scheduleCleanupUnverifiedUsers();

// graceful shutdown
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  logger.info('SIGTERM received.');
  exitHandler();
});
