import { Module } from '@nestjs/common';
import { TokenConfig } from '../../core/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [TokenConfig],
      useFactory: (tokenConfig: TokenConfig) => ({
        global: true,
        signOptions: {
          expiresIn: tokenConfig.accessTtl,
        },
        secret: tokenConfig.accessSecret,
      }),
    }),
  ],
  exports: [JwtModule],
})
export class AppJwtModule {}
