import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from './interfaces/jwt-payload.interface';
import { User } from 'src/user/entity/user.entity';
import { UsersService } from 'src/user/user.service';
import { RefreshTokensService } from 'src/refresh-tokens/refresh-tokens.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshTokensService: RefreshTokensService,
  ) {}

  generateAccessToken(payload: JwtAccessPayload): string {
    try {
      return this.jwtService.sign(payload, {
        expiresIn: '15m',
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      throw new InternalServerErrorException('Error generating access token');
    }
  }

  async validateRefreshToken(refreshToken: string): Promise<JwtRefreshPayload> {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const token = await this.refreshTokensService.findOne(decoded.jti);
      if (!token || token.isRevoked || token.expiresAt < new Date()) {
        throw new Error();
      }

      const isValid = await bcrypt.compare(refreshToken, token.token);
      if (!isValid) {
        throw new Error();
      }

      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        jti: decoded.jti,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.usersService.findOneByEmail(email, [
        'id',
        'email',
        'role',
        'password',
      ]);
      if (!user) {
        throw new ForbiddenException('Invalid credentials');
      }

      const isMatch = await bcrypt.compare(pass, user.password);
      if (!isMatch) {
        throw new ForbiddenException('Invalid credentials');
      }

      const { password, ...result } = user;
      return result;
    } catch (error) {
      throw error;
    }
  }

  async login(user: Omit<User, 'password'>) {
    try {
      const jti = uuidv4();
      const payload: JwtRefreshPayload = {
        email: user.email,
        sub: user.id,
        jti,
        role: user.role,
      };
      const accessToken = this.generateAccessToken(payload);
      const refreshToken = await this.refreshTokensService.create(
        user.id,
        jti,
        payload,
      );
      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error during login process');
    }
  }

  async logout(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      await this.refreshTokensService.revoke(decoded.jti);
      return { message: 'Logout successful' };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.validateRefreshToken(refreshToken);
      const newAccessToken = this.generateAccessToken({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });
      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
