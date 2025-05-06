import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import * as CookieParser from 'cookie-parser';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const corsOptions: CorsOptions = {
    origin: 'http://localhost:5174',
    credentials: true,
  };
  app.enableCors(corsOptions);
  app.use(CookieParser());
  app.use(
    session({
      name: 'session',
      secret: process.env.COOKIE_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: false,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        logger.error(`Validation failed: ${JSON.stringify(errors)}`);
        return errors;
      },
    }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
