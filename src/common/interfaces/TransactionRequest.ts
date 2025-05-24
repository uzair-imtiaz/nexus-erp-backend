import { Request } from 'express';
import { QueryRunner } from 'typeorm';

export interface TransactionRequest extends Request {
  queryRunner: QueryRunner;
}
