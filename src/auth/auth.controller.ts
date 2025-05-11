import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CustomAuthGuard } from './guards/custom-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginExpressRequest } from './interfaces/login-express.interface';
import { SkipTenant } from 'src/common/decorators/skip-tenant-check.decorator';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(CustomAuthGuard)
  @SkipTenant()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMetadata({
    success: true,
    message: 'Logged in successfully',
  })
  async login(
    @Req() req: LoginExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, tenantId } =
      await this.authService.login(req.user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    res.cookie('accessToken', accessToken, {
      // httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    res.cookie('tenantId', tenantId, {
      secure: true,
      sameSite: 'strict',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
    });

    return { accessToken };
  }

  // @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMetadata({
    success: true,
    message: 'Logged out successfully',
  })
  async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
    try {
      const refreshToken = req.cookies['refreshToken'];
      if (!refreshToken) {
        throw new BadRequestException('Refresh token is missing');
      }

      res.clearCookie('accessToken');
      // res.clearCookie('refreshToken');
      res.clearCookie('tenantId');

      const response = await this.authService.logout(refreshToken);

      return response;
    } catch (error) {
      console.log('error', error);
    }
  }
}
