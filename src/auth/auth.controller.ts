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
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { CustomAuthGuard } from './guards/custom-auth.guard';
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      domain:
        process.env.NODE_ENV === 'production' ? '.mintsbook.com' : undefined,
    });
    res.cookie('accessToken', accessToken, {
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
      domain:
        process.env.NODE_ENV === 'production' ? '.mintsbook.com' : undefined,
    });
    res.cookie('tenantId', tenantId, {
      secure: true,
      domain:
        process.env.NODE_ENV === 'production' ? '.mintsbook.com' : undefined,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
    });

    return { accessToken };
  }

  // @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @SkipTenant()
  @ResponseMetadata({
    success: true,
    message: 'Logged out successfully',
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const cookies = req.cookies as Record<string, string>;
      const refreshToken = cookies?.['refreshToken'];
      if (!refreshToken) {
        throw new BadRequestException('Refresh token is missing');
      }

      const cookieOptions = {
        domain:
          process.env.NODE_ENV === 'production' ? '.mintsbook.com' : undefined,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite:
          process.env.NODE_ENV === 'production'
            ? ('none' as const)
            : ('lax' as const),
      };
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);
      res.clearCookie('tenantId', cookieOptions);

      const response = await this.authService.logout(refreshToken);

      return response;
    } catch (error) {
      console.log('error', error);
    }
  }
}
