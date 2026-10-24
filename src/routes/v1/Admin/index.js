const adminAuthRoute = require('./adminAuth.route');
const userRoute = require('./user.routes')
const passportRoute = require('./passport.route');
const statsRoute = require('./stats.route');


const adminRoutes = [
    {
        path: '/admin/auth/',
        route: adminAuthRoute,
    },
     {
        path: '/admin/user/',
        route: userRoute,
    },
    {
        path: '/admin/passports',
        route: passportRoute,
    },
    {
        path: '/admin/stats',
        route: statsRoute,
    },
];

module.exports = adminRoutes;
