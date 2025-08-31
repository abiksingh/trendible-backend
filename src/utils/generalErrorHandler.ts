import { Prisma } from '@prisma/client';

export interface ApiErrorDetails {
  statusCode: number;
  message: string;
  endpoint?: string;
  originalError?: any;
  retryable?: boolean;
}

export class ApiError extends Error {
  public statusCode: number;
  public endpoint?: string;
  public originalError?: any;
  public retryable: boolean;

  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.name = 'ApiError';
    this.statusCode = details.statusCode;
    this.endpoint = details.endpoint;
    this.originalError = details.originalError;
    this.retryable = details.retryable || false;

    Error.captureStackTrace?.(this, ApiError);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      retryable: this.retryable
    };
  }
}

export const handleGeneralError = (error: any, endpoint?: string): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  let statusCode = 500;
  let message = 'Internal server error';
  let retryable = false;

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 400;
        message = 'Unique constraint violation. Record already exists.';
        retryable = false;
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        retryable = false;
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint violation';
        retryable = false;
        break;
      case 'P2004':
        statusCode = 400;
        message = 'Database constraint violation';
        retryable = false;
        break;
      default:
        statusCode = 500;
        message = 'Database operation failed';
        retryable = false;
    }
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500;
    message = 'Unknown database error';
    retryable = false;
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = 500;
    message = 'Database engine error';
    retryable = false;
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    message = 'Database connection failed';
    retryable = true;
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    retryable = false;
  } else if (error.message) {
    message = error.message;
  }

  return new ApiError({
    statusCode,
    message,
    endpoint,
    originalError: error,
    retryable
  });
};