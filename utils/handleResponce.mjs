export const sendErrorResponse = (res, error, statusCode = 500) => {
  return res.status(statusCode).json({
    message: error.message,
  });
};

export const sendSuccessResponse = (
  res,
  data,
  message = "Success",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};
