/**
 * Centralized Error Handling Middleware
 * Manages operational and system errors with standardized JSON responses.
 * Masks stack traces and internal secrets in non-development environments.
 */

const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Invalid request', details = null) {
    super(message, 400, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict or duplicate entry') {
    super(message, 409);
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service failure', statusCode = 502, details = null) {
    super(message, statusCode, details);
  }
}

/**
 * 404 Not Found Middleware for undefined endpoints
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`
  });
}

/**
 * Central Express Error Handler
 */
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Handle JSON parsing errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload in request body';
    details = err.message;
  }

  // Handle better-sqlite3 UNIQUE constraint violations
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
    statusCode = 409;
    message = 'A duplicate record already exists with the provided unique fields';
    if (err.message && err.message.includes('followups.appointment_id')) {
      message = 'A follow-up is already scheduled for this appointment on the specified date';
    }
  }

  // Handle better-sqlite3 FOREIGN KEY constraint violations
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (err.message && err.message.includes('FOREIGN KEY constraint failed'))) {
    statusCode = 400;
    message = 'Referenced related record does not exist';
  }

  // Log error using structured logger
  if (statusCode >= 500) {
    logger.error(`Server Error: ${message}`, {
      path: req.originalUrl,
      method: req.method,
      errorName: err.name,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } else {
    logger.warn(`Client Error [${statusCode}]: ${message}`, {
      path: req.originalUrl,
      method: req.method,
      details
    });
  }

  const response = {
    success: false,
    error: message
  };

  if (details) {
    response.details = details;
  }

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  AppError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  ExternalServiceError,
  notFoundHandler,
  errorHandler
};
