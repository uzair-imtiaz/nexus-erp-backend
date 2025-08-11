import { PartialType } from '@nestjs/mapped-types';
import { Request } from 'express';
import { User } from 'src/user/entity/user.entity';
import { QueryRunner } from 'typeorm';

export interface TransactionRequest extends Request {
  queryRunner: QueryRunner;
}

export interface RequestWithUser extends Request {
  user?: User;
}
