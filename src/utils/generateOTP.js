const crypto = require('crypto');

// Replaces `randomatic` (unmaintained, had past CVEs — already dropped
// from package.json on the assumption this swap would land here).
// crypto.randomInt is cryptographically strong and has no modulo bias.
function generateOTP(digits = 4) {
    const max = 10 ** digits;
    return crypto.randomInt(0, max).toString().padStart(digits, '0');
}

module.exports = generateOTP;
