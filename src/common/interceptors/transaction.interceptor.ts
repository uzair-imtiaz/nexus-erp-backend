import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import {
  Observable,
  catchError,
  finalize,
  from,
  of,
  switchMap,
  throwError,
} from 'rxjs';
import { DataSource } from 'typeorm';

export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const queryRunner = this.dataSource.createQueryRunner();

    return from(queryRunner.connect()).pipe(
      switchMap(() => from(queryRunner.startTransaction())),
      switchMap(() => {
        const req = context.switchToHttp().getRequest();
        req.entityManager = queryRunner.manager;
        return next.handle();
      }),
      switchMap((data) =>
        from(queryRunner.commitTransaction()).pipe(switchMap(() => of(data))),
      ),
      catchError((err) =>
        from(queryRunner.rollbackTransaction()).pipe(
          switchMap(() => throwError(() => err)),
        ),
      ),
      finalize(() => {
        return from(queryRunner.release());
      }),
    );
  }
}
