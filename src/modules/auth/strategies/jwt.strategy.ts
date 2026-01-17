import { Injectable } from '@nestjs/common';
import { TokenConfig } from '../../../core/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from '../constants/token-payload.type';
import { PinoLogger } from 'nestjs-pino';

/**
 * Passport strategy for authenticating users via JSON Web Tokens (JWT).
 * * This strategy extracts the Bearer token from the 'Authorization' header,
 * verifies the signature using the secret key, and validates the payload.
 * * @class JwtStrategy
 * @extends {PassportStrategy(Strategy)}
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  /**
   * Configures the JWT strategy with options from the JwtConfig.
   * @param {TokenConfig} TokenConfig - NestJS service to access environment variables.
   * @throws {Error} If ACCESS_TOKEN_SECRET is not defined in environment variables.
   */
  constructor(
    private readonly TokenConfig: TokenConfig,
    private readonly logger: PinoLogger,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: TokenConfig.accessSecret,
    });
  }

  /**
   * Validates the decoded JWT payload.
   * The object returned here is attached to the request object as `req.user`.
   * * @param {AccessTokenPayload} payload - The decoded content of the JWT.
   * @returns {{ id: string; username: string }} The user data to be attached to the request.
   */
  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
