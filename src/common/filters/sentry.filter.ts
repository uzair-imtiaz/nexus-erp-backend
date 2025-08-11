import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { RequestWithUser } from '../interfaces/request.interfaces';

@Catch()
export class SentryFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();
    const response = ctx.getResponse();

    const shouldIgnore = this.shouldIgnoreException(exception);

    if (!shouldIgnore) {
      Sentry.withScope((scope) => {
        scope.setContext('request', {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body,
          query: request.query,
          params: request.params,
        });

        if (request.user) {
          scope.setUser({
            id: request.user.id,
            email: request.user.email,
          });
        }

        Sentry.captureException(exception);
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();
      response.status(status).json(responseBody);
    } else {
      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  }

  private shouldIgnoreException(exception: unknown): boolean {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      // Ignore 400s, validation issues, and unauthorized requests
      return (
        status === 400 || status === 401 || status === 403 || status === 404
      );
    }

    return false;
  }
}
