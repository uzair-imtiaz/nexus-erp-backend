import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch()
export class GloablExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string = 'An unexpected error occurred';

    // Handle ValidationError[]
    if (
      Array.isArray(exception) &&
      exception.every((e) => e instanceof ValidationError)
    ) {
      const messages = this.formatValidationErrors(exception);
      message = messages.length > 0 ? messages[0] : message;
    } else if (isHttp) {
      const res = exception.getResponse();
      const resMessage = typeof res === 'string' ? res : (res as any)?.message;

      if (Array.isArray(resMessage)) {
        message = resMessage[0];
      } else if (typeof resMessage === 'string') {
        message = resMessage;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    response.status(status).json({
      success: false,
      message,
      statusCode: status,
    });
  }

  private formatValidationErrors(errors: ValidationError[]): string[] {
    const result: string[] = [];

    function recurse(errorList: ValidationError[]) {
      for (const error of errorList) {
        if (error.constraints) {
          for (const key in error.constraints) {
            result.push(`${error.property}: ${error.constraints[key]}`);
          }
        }
        if (error.children?.length) {
          recurse(error.children);
        }
      }
    }

    recurse(errors);
    return result;
  }
}
