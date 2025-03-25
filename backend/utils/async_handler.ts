import { Response } from 'express';

// Custom error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: any[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: any[]) {
    super(400, message, errors);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(401, message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(403, message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, message);
    this.name = 'DatabaseError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
  code?: string; // Optional error code for specific error types
}

// Helper functions for common error scenarios
export const handleValidationError = (errors: any[]): ErrorResponse => ({
  success: false,
  message: 'Kesalahan validasi',
  errors: errors.map(err => ({
    field: err.field,
    message: err.message
  }))
});

export const handleDatabaseError = (error: Error): ErrorResponse => {
  // Handle unique constraint violations
  if (error.message.includes('Unique constraint')) {
    return {
      success: false,
      message: 'Data sudah ada dalam database',
      code: 'DUPLICATE_DATA'
    };
  }

  // Handle foreign key constraint violations
  if (error.message.includes('Foreign key constraint')) {
    return {
      success: false,
      message: 'Data referensi tidak valid',
      code: 'INVALID_REFERENCE'
    };
  }

  // Log database errors for debugging
  console.error('Database Error:', error);

  return {
    success: false,
    message: 'Terjadi kesalahan pada database',
    code: 'DATABASE_ERROR'
  };
};

export const handleRateLimitError = (): ErrorResponse => ({
  success: false,
  message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
  code: 'RATE_LIMIT_EXCEEDED'
});

// Main error handler function
export const handleError = (error: unknown, res: Response): void => {
  console.error('Error:', error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors,
      code: error.name // Include error code for better client-side handling
    });
    return;
  }

  if (error instanceof Error) {
    // Handle database-specific errors
    if (error.message.includes('Prisma') || error.message.includes('database')) {
      res.status(500).json(handleDatabaseError(error));
      return;
    }

    // Handle generic errors
    res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan pada server',
      code: 'INTERNAL_SERVER_ERROR'
    });
    return;
  }

  // Default error response for unknown errors
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    code: 'UNKNOWN_ERROR'
  });
};

// Utility function to wrap async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => handleError(error, res));
  };
};