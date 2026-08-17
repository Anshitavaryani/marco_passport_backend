const MAX_EMAIL_LENGTH = 254; // practical RFC 5321 ceiling for a real address

const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const validateEmail = (email) => {
  const str = String(email).toLowerCase();

  // Reject absurdly long input before it ever reaches the regex.
  if (str.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  // Was `.match(...)`, which returns null or a match array — not a
  // boolean. Every current call site uses `!validateEmail(x)`, which
  // works fine via truthy coercion, but a function named validateEmail
  // should actually return true/false rather than leave that as an
  // implementation detail. .test() does.
  return EMAIL_REGEX.test(str);
};

module.exports = validateEmail;
