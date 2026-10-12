function responseWrapper(res, data, message, status = 200) {
  const success = status >= 200 && status < 300;

  return res.status(status).json({
    success,
    status,
    message,
    data,
  });
}

module.exports = responseWrapper;
