class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode || 500;
    this.code = code || 'APP_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class InvalidTokenError extends AppError {
  constructor(details) {
    super('Invalid or expired token', 401, 'INVALID_TOKEN', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(details) {
    super('Unauthorized', 401, 'UNAUTHORIZED', details);
  }
}

class ForbiddenError extends AppError {
  constructor(details) {
    super('Forbidden', 403, 'FORBIDDEN', details);
  }
}

class NotFoundError extends AppError {
  constructor(details) {
    super('Not found', 404, 'NOT_FOUND', details);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message || 'Validation error', 400, 'VALIDATION_ERROR', details);
  }
}

module.exports = {
  AppError,
  InvalidTokenError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
};
