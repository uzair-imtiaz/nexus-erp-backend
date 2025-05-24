import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const refreshToken = req.cookies?.['refreshToken'];

    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (err) {
      if (!refreshToken) throw new UnauthorizedException('Login required');

      // Validate refresh token and generate new access token
      const payload = await this.authService.validateRefreshToken(refreshToken);
      const newAccessToken = this.authService.generateAccessToken(payload);

      // Update request headers for subsequent guards/controllers
      req.headers.authorization = `Bearer ${newAccessToken}`;

      // Optionally set new access token in response
      const res = context.switchToHttp().getResponse();
      res.cookie('accessToken', newAccessToken, {
        secure: true,
        sameSite: 'strict',
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
      });

      return true; // Allow the request to proceed
    }
  }

  handleRequest(err, user, info) {
    if (err || !user) throw err || new UnauthorizedException();
    return user;
  }
}
