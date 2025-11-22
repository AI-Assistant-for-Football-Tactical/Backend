import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { StandardResponse } from '../interfaces/response.interface';

/**
 * Interceptor to standardize the format of all successful API responses (2xx status codes).
 * It wraps the controller's raw return value (type T) into a StandardResponse object.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const ctx = context.switchToHttp();
    const response: Response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode,
        success: true,
        message: 'Request successful',
        data: (data === undefined ? null : data) as T,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
