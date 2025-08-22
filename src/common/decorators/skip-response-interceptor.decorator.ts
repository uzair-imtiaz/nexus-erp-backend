import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_INTERCEPTOR = 'skipResponseInterceptor';

export const SkipResponseMetadata = () =>
  SetMetadata(SKIP_RESPONSE_INTERCEPTOR, true);
