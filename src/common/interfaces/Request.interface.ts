import type { AccessTokenPayload } from 'src/modules/auth/constants/token-payload.type';

export interface RequestWithUser extends Request {
  user: AccessTokenPayload;
}
