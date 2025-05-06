import { Request } from 'express';
import { User } from 'src/user/entity/user.entity';

export interface LoginExpressRequest extends Request {
  user: Omit<User, 'password'>;
  cookies: {
    [key: string]: string;
  };
}
