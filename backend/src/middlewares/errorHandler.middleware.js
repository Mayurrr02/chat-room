const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url} ->`, err);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred on the server',
    },
  });
};

module.exports = errorHandler;
