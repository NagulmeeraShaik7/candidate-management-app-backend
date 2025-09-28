// error.middleware.js

/**
 * Global Error Handling Middleware
 * - Provides user-friendly error messages.
 * - Does not expose stack traces or internal details to clients.
 * - Logs unexpected errors to the console for debugging.
 */

export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = "Something went wrong. Please try again later.";
  let errorType = "Server Error";

  switch (err.name) {
    case "ValidationError":
      statusCode = 400;
      message = err.message || "Validation failed. Please check your input.";
      errorType = "Validation Error";
      break;

    case "DuplicateEmailError":
      statusCode = 409;
      message = err.message || "Email address already exists.";
      errorType = "Duplicate Email";
      break;

    case "AuthError":
      statusCode = 401;
      message = err.message || "Invalid credentials provided.";
      errorType = "Authentication Error";
      break;

    case "UnauthorizedError":
      statusCode = 403;
      message = err.message || "You are not authorized to access this resource.";
      errorType = "Authorization Error";
      break;

    case "CastError":
      statusCode = 400;
      message = "Invalid ID format provided.";
      errorType = "Invalid ID";
      break;

    case "MongoError":
      if (err.code === 11000) {
        statusCode = 409;
        message = "Duplicate entry detected.";
        errorType = "Duplicate Error";
      }
      break;

    case "SyntaxError":
      statusCode = 400;
      message = "Invalid JSON format in request body.";
      errorType = "Syntax Error";
      break;

    case "TypeError":
      statusCode = 400;
      message = "Invalid data type provided.";
      errorType = "Type Error";
      break;

    case "AppError":
      // Custom application error class
      statusCode = err.code || 500;
      message = err.message || "Application error occurred.";
      errorType = err.name || "Application Error";
      break;

    default:
      // Log unexpected/unhandled errors internally
      console.error("Unexpected Error:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
      });
      break;
  }

  res.status(statusCode).json({
    success: false,
    error: errorType,
    message: message,
  });
};

/**
 * 404 Handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `The requested route ${req.originalUrl} was not found.`,
  });
};

/**
 * Async Error Wrapper
 * - Catches errors in async route handlers and passes to errorHandler.
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export class AppError extends Error {
  constructor(message, code = 500, name = "AppError") {
    super(message);
    this.code = code;
    this.name = name;
  }
}