// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errorType = "Server Error";

  // Handle different types of errors
  switch (err.name) {
    case "ValidationError":
      statusCode = 400;
      message = err.message || "Validation failed";
      errorType = "Validation Error";
      break;

    case "DuplicateEmailError":
      statusCode = 409;
      message = err.message || "Email already exists";
      errorType = "Duplicate Email";
      break;

    case "AuthError":
      statusCode = 401;
      message = err.message || "Invalid credentials";
      errorType = "Authentication Error";
      break;

    case "UnauthorizedError": // JWT / Access token errors
      statusCode = 403;
      message = err.message || "You are not authorized to access this resource";
      errorType = "Authorization Error";
      break;

    case "CastError":
      statusCode = 400;
      message = "Invalid ID format";
      errorType = "Invalid ID";
      break;

    case "MongoError":
      if (err.code === 11000) {
        statusCode = 409;
        message = "Duplicate entry found";
        errorType = "Duplicate Error";
      }
      break;

    case "SyntaxError":
      statusCode = 400;
      message = "Invalid JSON format";
      errorType = "Syntax Error";
      break;

    case "TypeError":
      statusCode = 400;
      message = "Invalid data type";
      errorType = "Type Error";
      break;

    default:
      // Log unexpected errors for debugging
      console.error("Unexpected Error:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
      });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: errorType,
    message: message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err.message,
    }),
  });
};

// 404 handler for undefined routes
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
  });
};

// Async error wrapper to catch async errors
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
