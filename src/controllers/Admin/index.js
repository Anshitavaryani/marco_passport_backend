const adminAuthController = require('./adminAuth.controller');
const userController = require('./user.controller')
// Not "passportController": controllers/index.js merges every folder's
// exports and User/ already has one.
const adminPassportController = require('./passport.controller');
const statsController = require('./stats.controller');


module.exports = {
    adminAuthController,
    userController,
    adminPassportController,
    statsController
};
