import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Interface for the common error object structure returned by NestJS
 * (e.g., from ValidationPipe or custom exceptions).
 */
interface NestErrorObject {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * Global exception filter to standardize the format of all error responses.
 * Catches all exceptions and maps them to a consistent JSON structure.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine the status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get the response body or set a default string
    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    let message: string | string[] = 'Server Error';
    let errorName: string = 'InternalServerError';

    // Type Narrowing and Assignment
    if (typeof errorResponse === 'object' && errorResponse !== null) {
      const errorObject = errorResponse as NestErrorObject;

      // Assign message, checking for existence first
      if (errorObject.message) {
        message = errorObject.message;
      }

      // Assign error name, checking for existence first
      if (errorObject.error) {
        errorName = errorObject.error;
      }
    } else {
      // The errorResponse is a string (e.g., from a basic HttpException throw)
      message = errorResponse;
    }

    // Fallback for generic exceptions (if message still hasn't been set reliably)
    if (message === 'Server Error' && (exception as Error).message) {
      message = (exception as Error).message;
    }

    // Fallback error name to the exception's class name
    if (
      errorName === 'InternalServerError' &&
      exception instanceof HttpException
    ) {
      errorName = exception.constructor.name;
    }

    // Construct the standardized error body
    const errorBody = {
      statusCode: status,
      success: false,
      error: errorName,
      message: Array.isArray(message) ? message.join(', ') : message,
      path: request.url.split('?')[0],
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorBody);
  }
}
