import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { MoreThan, Repository, UpdateResult } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtRefreshPayload } from 'src/auth/interfaces/jwt-payload.interface';
import * as bcrypt from 'bcryptjs';
import { Cron } from '@nestjs/schedule';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async create(
    userId: string,
    jti: string,
    payload: JwtRefreshPayload,
  ): Promise<string> {
    try {
      const tenantId = this.tenantContextService.getTenantId();
      const token = this.jwtService.sign(payload, {
        expiresIn: '30d',
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const activeTokens = await this.refreshTokenRepository.find({
        where: {
          user: { id: userId },
          isRevoked: false,
          expiresAt: MoreThan(new Date()),
          tenant: { id: tenantId },
        },
      });
      if (activeTokens.length >= 3) {
        const tokenToDelete = activeTokens.reduce((prev, curr) => {
          return prev.expiresAt < curr.expiresAt ? prev : curr;
        });
        await this.refreshTokenRepository.delete({ id: tokenToDelete.id });
      }
      const hashedToken = await bcrypt.hash(token, 10);
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        const errorMessage = `User with ID ${userId} not found.`;
        throw new NotFoundException(errorMessage);
      }
      const refreshToken = this.refreshTokenRepository.create({
        user,
        jti,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tenant: { id: tenantId },
      });
      await this.refreshTokenRepository.save(refreshToken);
      return token;
    } catch (error) {
      throw new InternalServerErrorException('Error creating refresh token');
    }
  }

  async findOne(jti: string): Promise<RefreshToken> {
    const tenantId = this.tenantContextService.getTenantId();
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { jti, tenant: { id: tenantId } },
    });
    if (!refreshToken) {
      const errorMessage = `Refresh token with ID ${jti} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return refreshToken;
  }

  async revoke(jti: string) {
    const tenantId = this.tenantContextService.getTenantId();
    const updated = await this.refreshTokenRepository.update(
      { jti, tenant: { id: tenantId } },
      { isRevoked: true },
    );
    return updated;
  }

  async revokeAll(userId: string) {
    const tenantId = this.tenantContextService.getTenantId();
    const updated = await this.refreshTokenRepository.update(
      { user: { id: userId }, tenant: { id: tenantId } },
      { isRevoked: true },
    );
    return updated;
  }

  async deleteExpiredTokens() {
    const tenantId = this.tenantContextService.getTenantId();
    const deleted = await this.refreshTokenRepository.delete({
      expiresAt: MoreThan(new Date()),
      tenant: { id: tenantId },
    });
    return deleted;
  }

  @Cron('0 0 */7 * *')
  async handleExpiredTokensDeletion() {
    await this.deleteExpiredTokens();
  }
}
