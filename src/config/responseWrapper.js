function responseWrapper(res, data, message, status = 200) {
  // Was hardcoded `true` regardless of `status` — every 4xx/5xx response
  // sent through this function (which is nearly all of them across the
  // controllers/middleware reviewed so far) claimed success in the body
  // even on failure. Any client checking `response.data.success` instead
  // of the HTTP status code would treat every error as a success.
  const success = status >= 200 && status < 300;

  return res.status(status).json({
    success,
    status,
    message,
    data,
  });
}

module.exports = responseWrapper;
