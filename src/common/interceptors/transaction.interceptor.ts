import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, finalize, from, switchMap, tap } from 'rxjs';
import { DataSource } from 'typeorm';

export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const queryRunner = this.dataSource.createQueryRunner();

    return from(queryRunner.connect()).pipe(
      switchMap(() => from(queryRunner.startTransaction())),
      switchMap(() => {
        const req = context.switchToHttp().getRequest();
        req.entityManager = queryRunner.manager;
        return next.handle();
      }),
      tap(() => from(queryRunner.commitTransaction())),
      catchError(async (err) => {
        await queryRunner.rollbackTransaction();
        throw err;
      }),
      finalize(async () => await queryRunner.release()),
    );
  }
}
