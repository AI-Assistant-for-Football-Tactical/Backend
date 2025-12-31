import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  mixin,
  Type,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import type { Request } from 'express';

/**
 * A factory function that creates a dynamic NestJS Guard to validate the request body against a DTO.
 * * convert the plain request body into a class instance  and `class-validator` to perform validation.
 * * only use it if you want validate request body before guards
 *
 * @template T - The type of the DTO class.
 * @param {Type<T>} dto - The DTO class/constructor to validate the request body against.
 * @returns {Type<CanActivate>} A Mixin class that implements the `CanActivate` interface.
 * @example
 * // Usage in a Controller:
 * -@UseGuards(ValidationGuard(LoginDto), LocalAuthGuard)
 * -@Post('login')
 * -async login(@Request() req) { ... }
 *
 *  @throws {BadRequestException} Thrown if validation fails, containing a flat list of strings.
 */
export const ValidationGuard = <T extends object>(
  dto: Type<T>,
): Type<CanActivate> => {
  @Injectable()
  class ValidationGuardMixin implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request: Request = context.switchToHttp().getRequest();
      const dtoInstance: T = plainToInstance(dto, request.body);

      const errors: ValidationError[] = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        throw new BadRequestException(this.formatErrors(errors));
      }

      request.body = dtoInstance;
      return true;
    }

    /**
     * Recursively flattens all validation constraints into a single string array.
     */
    formatErrors(errors: ValidationError[]): string[] {
      return errors.reduce((acc: string[], err) => {
        // 1. Get messages from the current level
        if (err.constraints) {
          acc.push(...Object.values(err.constraints));
        }
        // 2. If there are nested objects, get those messages too
        if (err.children && err.children.length > 0) {
          acc.push(...this.formatErrors(err.children));
        }
        return acc;
      }, []);
    }
  }

  return mixin(ValidationGuardMixin);
};
