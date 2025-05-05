import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

export const paginate = async <T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  page = 1,
  limit = 10,
): Promise<Paginated<T>> => {
  const skip = (page - 1) * limit;
  const [data, total] = await queryBuilder
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  };
};
