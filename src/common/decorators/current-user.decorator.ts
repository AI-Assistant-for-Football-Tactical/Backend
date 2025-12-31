import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from 'src/modules/auth/constants/token-payload.type';
import type { RequestWithUser } from '../interfaces/Request.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const request: RequestWithUser = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
