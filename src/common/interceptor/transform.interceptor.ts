import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { SuccessResponseDto } from '../dtos/success-response.dto';
import type { Response } from 'express';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponseDto> {
    const response: Response = context.switchToHttp().getResponse();
    const customMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data: unknown): SuccessResponseDto => {
        return {
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
          success: true,
          message: customMessage || 'Request successful',
          data: data || null,
        };
      }),
    );
  }
}
