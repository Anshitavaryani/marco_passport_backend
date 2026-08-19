const userAuthRoute = require('./auth.route');
const userRoute = require('./user.route');

const customerRoutes = [
    {
        path: '/user/auth/',
        route: userAuthRoute,
    },
    {
        path: '/user/',
        route: userRoute,
    }
];

module.exports = customerRoutes;