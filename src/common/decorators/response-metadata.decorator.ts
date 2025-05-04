import { SetMetadata } from '@nestjs/common';

export const RESPONSE_METADATA_KEY = 'response_metadata';

export interface ResponseMetadata {
  success: boolean;
  message: string;
}

export const ResponseMetadata = (metadata: ResponseMetadata) =>
  SetMetadata(RESPONSE_METADATA_KEY, metadata);
