const MAX_EMAIL_LENGTH = 254; // practical RFC 5321 ceiling for a real address

const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const validateEmail = (email) => {
  const str = String(email).toLowerCase();

  // Reject absurdly long input before it ever reaches the regex.
  if (str.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  return EMAIL_REGEX.test(str);
};

module.exports = validateEmail;
