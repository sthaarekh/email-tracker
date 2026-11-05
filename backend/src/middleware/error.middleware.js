import { env } from "../config/env.js";

const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || error.status || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message || "Something went wrong",
    ...(env.NODE_ENV === "development" && {
      stack: error.stack,
    }),
  });
};

export default errorHandler;