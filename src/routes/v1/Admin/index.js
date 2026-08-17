const adminAuthRoute = require('./adminAuth.route');


const adminRoutes = [
    {
        path: '/admin/auth/',
        route: adminAuthRoute,
    },
];

module.exports = adminRoutes;