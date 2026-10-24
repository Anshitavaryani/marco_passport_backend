const adminAuthService = require('./adminAuth.service');
const userService = require('./user.service')
// Not "passportService": services/index.js merges every folder's exports and
// User/ already has one.
const adminPassportService = require('./passport.service');
const statsService = require('./stats.service');


module.exports = {
    adminAuthService,
    userService,
    adminPassportService,
    statsService
};
