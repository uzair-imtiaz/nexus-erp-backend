import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RESPONSE_METADATA_KEY } from '../decorators/response-metadata.decorator';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const metadata = Reflect.getMetadata(RESPONSE_METADATA_KEY, handler);

    const success = metadata?.success;
    const message = metadata?.message;

    return next.handle().pipe(
      map((data) => ({
        success,
        message,
        data,
      })),
      catchError((error) => {
        const errorMessage =
          error?.response?.message ?? error.message ?? 'Something went wrong';
        return new Observable((observer) => {
          observer.next({
            success: false,
            message: errorMessage,
          });
        });
      }),
    );
  }
}
