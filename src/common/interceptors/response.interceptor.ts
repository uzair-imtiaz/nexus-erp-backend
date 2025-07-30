import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RESPONSE_METADATA_KEY } from '../decorators/response-metadata.decorator';
import { ValidationError } from 'class-validator';

const formatValidationErrors = (errors: ValidationError[]): string[] => {
  const result: string[] = [];

  function recursiveExtract(errorList: ValidationError[]) {
    for (const error of errorList) {
      if (error.constraints) {
        for (const constraintKey in error.constraints) {
          result.push(`${error.property}: ${error.constraints[constraintKey]}`);
        }
      }
      if (error.children && error.children.length) {
        recursiveExtract(error.children);
      }
    }
  }

  recursiveExtract(errors);
  return result;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
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
      catchError((error) => {
        if (
          Array.isArray(error) &&
          error.every((e) => e instanceof ValidationError)
        ) {
          const formattedErrors = formatValidationErrors(error);

          return throwError(() => ({
            success: false,
            message: 'Validation failed',
            errors: formattedErrors,
            statusCode: 400,
          }));
        }

        if (error.getStatus && error.getResponse) {
          const status = error.getStatus();
          const response = error.getResponse();

          return throwError(() => ({
            success: false,
            message:
              typeof response === 'string'
                ? response
                : (response as any).message || 'An error occurred',
            errors:
              typeof response === 'object' && (response as any).message
                ? (response as any).message
                : null,
            statusCode: status,
          }));
        }

        // For unknown errors, return generic message
        return throwError(() => ({
          success: false,
          message:
            process.env.NODE_ENV === 'development'
              ? error.message || 'Internal server error'
              : 'Network Error',
          statusCode: 500,
          ...error,
        }));
      }),
    );
  }
}
