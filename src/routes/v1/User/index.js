const userAuthRoute = require('./auth.route');
const userRoute = require('./user.route');
const itineraryRoute = require('./itinerary.route');

const customerRoutes = [
    {
        path: '/user/auth/',
        route: userAuthRoute,
    },
    {
        path: '/user/itineraries',
        route: itineraryRoute,
    },
    {
        path: '/user/',
        route: userRoute,
    }
];

module.exports = customerRoutes;