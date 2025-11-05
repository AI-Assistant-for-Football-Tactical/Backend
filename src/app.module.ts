import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { UserModule } from './user/user.module';

/**
 * The root module of the application and the starting point.
 *
 * It imports all other.
 */
@Module({
  imports: [CoreModule, UserModule],
})
export class AppModule {}
