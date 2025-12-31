import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dtos/error-response.dto';

interface IHttpExceptionResponse {
  statusCode: number;
  error: string;
  message: string | string[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getStatus(exception);
    const errorType = this.getErrorType(exception);
    const messages = this.getErrorMessages(exception);

    if (status === (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
      this.logger.error(
        `End Request for ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Construct DTO response
    const errorResponse: ErrorResponseDto = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      success: false, // literal enforced by the DTO
      errorType,
      messages,
      path: request.url.split('?')[0],
    };

    response.status(status).json(errorResponse);
  }

  private getStatus(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorType(exception: unknown): string {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null && 'error' in res) {
        return (res as IHttpExceptionResponse).error;
      }

      return exception.constructor.name;
    }

    return 'InternalServerError';
  }

  private getErrorMessages(exception: unknown): string[] {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return [res];
      }

      if (typeof res === 'object' && res !== null) {
        const message = (res as IHttpExceptionResponse).message;

        if (Array.isArray(message)) return message;
        if (typeof message === 'string') return [message];
      }
    }

    return exception instanceof Error
      ? [exception.message]
      : ['Internal Server Error'];
  }
}
