import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokensModule } from 'src/refresh-tokens/refresh-tokens.module';
import { UsersModule } from 'src/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/jwt-local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [UsersModule, RefreshTokensModule, JwtModule],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
})
export class AuthModule {}
