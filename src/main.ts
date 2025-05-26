import { Logger, ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import * as CookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import * as session from 'express-session';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const allowedOrigins = [
    'http://localhost:80',
    'http://localhost:5173',
    'http://app:80',
    'http://localhost'
  ];

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
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

  // if (process.env.NODE_ENV === 'development') {
  //   const dataSource = app.get(DataSource);
  //   await seedAccounts(dataSource);
  // }

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
  app.use((_: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; object-src 'none';",
    );
    next();
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
