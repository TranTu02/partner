export const PAGINATION_SIZE = [20, 50, 100, 200] as const;

export type PaginationSize = (typeof PAGINATION_SIZE)[number];

export const DEFAULT_PAGINATION_SIZE: PaginationSize = 20;

export const MAX_UPLOAD = 10 * 1024 * 1024; // 10MB
