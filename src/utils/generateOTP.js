const crypto = require('crypto');

// crypto.randomInt: cryptographically strong, no modulo bias.
function generateOTP(digits = 4) {
    const max = 10 ** digits;
    return crypto.randomInt(0, max).toString().padStart(digits, '0');
}

module.exports = generateOTP;
