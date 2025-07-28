import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class DefaultDatePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return value ? value : new Date();
  }
}
