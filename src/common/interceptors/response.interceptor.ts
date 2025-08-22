import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_METADATA_KEY } from '../decorators/response-metadata.decorator';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const skipInterceptor = Reflect.getMetadata(
      'skipResponseInterceptor',
      handler,
    );

    if (skipInterceptor) {
      return next.handle();
    }
    const metadata = Reflect.getMetadata(RESPONSE_METADATA_KEY, handler);

    const success = metadata?.success ?? true;
    const message = metadata?.message ?? 'Success';

    return next.handle().pipe(
      map((responseData: any) => {
        if (
          responseData &&
          typeof responseData === 'object' &&
          'data' in responseData &&
          'pagination' in responseData
        ) {
          return {
            success,
            message,
            data: responseData.data,
            pagination: responseData.pagination,
          };
        }

        return {
          success,
          message,
          data: responseData,
        };
      }),
    );
  }
}
