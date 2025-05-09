import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class CustomAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email, password } = request.body;

    if (!email || !password) {
      throw new UnauthorizedException('Email and password are required');
    }

    try {
      const user = await this.authService.validateUser(email, password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      // Attach the user to the request object
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
} 