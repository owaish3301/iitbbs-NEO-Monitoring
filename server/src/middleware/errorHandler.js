const { Prisma } = require('@prisma/client');
const { AppError } = require('../errors/appError');

const mapPrismaKnownError = (err) => {
  switch (err.code) {
    case 'P2002':
      return new AppError('Duplicate value for unique field', 409, 'PRISMA_UNIQUE', {
        target: err.meta?.target,
      });
    case 'P2004':
      return new AppError('Database constraint failed', 400, 'PRISMA_CONSTRAINT');
    case 'P2003':
      return new AppError('Invalid relation reference', 400, 'PRISMA_FOREIGN_KEY', {
        field: err.meta?.field_name,
      });
    case 'P2025':
      return new AppError('Record not found', 404, 'PRISMA_NOT_FOUND');
    case 'P2001':
      return new AppError('Record not found', 404, 'PRISMA_NOT_FOUND');
    case 'P2016':
      return new AppError('Query returned no results', 404, 'PRISMA_NO_RESULT');
    case 'P2017':
      return new AppError('Records for relation are not connected', 400, 'PRISMA_RELATION');
    case 'P2014':
      return new AppError('Invalid relation', 400, 'PRISMA_RELATION');
    case 'P2019':
      return new AppError('Invalid input', 400, 'PRISMA_INPUT');
    case 'P2021':
      return new AppError('Table does not exist', 500, 'PRISMA_TABLE_MISSING');
    case 'P2022':
      return new AppError('Column does not exist', 500, 'PRISMA_COLUMN_MISSING');
    case 'P2034':
      return new AppError('Transaction failed due to a write conflict', 409, 'PRISMA_TX_CONFLICT');
    default:
      return new AppError('Database error', 500, 'PRISMA_ERROR', {
        code: err.code,
      });
  }
};

const errorHandler = (err, req, res, next) => {
  let finalError = err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    finalError = mapPrismaKnownError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    finalError = new AppError('Invalid database input', 400, 'PRISMA_VALIDATION');
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    finalError = new AppError('Database connection failed', 500, 'PRISMA_INIT');
  } else if (!(err instanceof AppError)) {
    finalError = new AppError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }

  const payload = {
    error: finalError.message,
    code: finalError.code,
  };

  if (finalError.details) {
    payload.details = finalError.details;
  }

  res.status(finalError.statusCode || 500).json(payload);
};

module.exports = errorHandler;
