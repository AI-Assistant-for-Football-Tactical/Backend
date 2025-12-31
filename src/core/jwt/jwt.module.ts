import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        global: true,
        signOptions: {
          expiresIn: config.get<number>('ACCESS_TOKEN_TTL'),
        },
        secret: config.get<string>('ACCESS_TOKEN_SECRET'),
      }),
    }),
  ],
  exports: [JwtModule],
})
export class AppJwtModule {}
