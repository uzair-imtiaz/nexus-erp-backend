import { Request } from 'express';
import { EntityManager } from 'typeorm';

export interface TransactionRequest extends Request {
  entityManager: EntityManager;
}
