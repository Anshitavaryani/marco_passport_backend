const contactUsRoute = require('./contactUs.route');
const faqRoute = require('./faq.route');
const roleRoute = require('./role.route');
const departmentRoute = require('./department.route');
const countryRoute = require('./country.route');
const stateRoute = require('./state.route');
const cityRoute = require('./city.route');
const paymentRoute = require('./payment.route');

const commonRoutes = [
    {
        path: '/contactUs',
        route: contactUsRoute,
    },
    {
        path: '/faq',
        route: faqRoute,
    },
    {
        path: '/role',
        route: roleRoute,
    },
    {
        path: '/department',
        route: departmentRoute,
    },
    {
        path: '/country',
        route: countryRoute,
    },
    {
        path: '/state',
        route: stateRoute,
    },
    {
        path: '/city',
        route: cityRoute,
    },
    {
        path: '/payment',
        route: paymentRoute,
    },
];

module.exports = commonRoutes;