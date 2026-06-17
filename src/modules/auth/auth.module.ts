import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthToken } from './entities/token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { AuthTokenService } from './auth-token.service';
import { UserModule } from '../user/user.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, LocalStrategy, JwtStrategy],
  imports: [
    MailModule,
    TypeOrmModule.forFeature([AuthToken, User]),
    forwardRef(() => UserModule),
  ],
  exports: [AuthService, AuthTokenService],
})
export class AuthModule {}
