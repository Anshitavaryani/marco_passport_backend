const userAuthRoute = require('./auth.route');
const userRoute = require('./user.route');
const passportRoute = require('./passport.route');

const customerRoutes = [
    {
        path: '/user/auth/',
        route: userAuthRoute,
    },
    {
        path: '/user/passports',
        route: passportRoute,
    },
    // Old path, same router: the deployed frontend still calls it during the
    // deploy window. Remove once it only uses /user/passports.
    {
        path: '/user/itineraries',
        route: passportRoute,
    },
    {
        path: '/user/',
        route: userRoute,
    }
];

module.exports = customerRoutes;