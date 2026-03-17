// =============================================================================
// COMMON TYPES - Shared across all modules
// =============================================================================

/**
 * Standard internal API response format.
 * Note: API v2 responses are adapted to this format by adaptV2Response() in api/index.ts.
 * - v2 list: { data, pagination } → normalized to { success, data, meta }
 * - v2 detail: raw object → normalized to { success, data }
 */
export interface ApiResponse<T = any> {
    success: boolean;
    statusCode: number;
    data?: T;
    meta?: {
        page: number;
        total: number;
        totalPages?: number;
        itemsPerPage?: number;
        [key: string]: any;
    };
    error?: {
        code: string;
        message: string;
        traceId?: string;
        [key: string]: any;
    };
}

/**
 * Pagination info như trả về từ API v2.
 * v2 response: { data: [...], pagination: PaginationMeta }
 */
export interface PaginationMeta {
    page: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
}

/**
 * Standard input for API calls.
 */
export interface ApiInput {
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, any>;
}

/**
 * Thống kê kế toán - response từ GET /v2/orders/get/stats
 * @deprecated Sử dụng OrderStats từ types/order.ts thay thế
 */
export interface AccountingStats {
    waitingExportInvoiceCount: number;
    paymentProblemOrderCount: number;
    totalPaymentDifferenceAmount: number;
}

/**
 * Audit fields chung cho tất cả entities.
 */
export interface AuditFields {
    createdAt: string;
    createdById?: string;
    modifiedAt?: string;
    modifiedById?: string;
    deletedAt?: string | null;
}

/**
 * Sort options dùng cho list APIs.
 */
export interface SortOptions {
    sortBy?: string;
    sortColumn?: string;
    sortDirection?: "ASC" | "DESC";
}

/**
 * Common list query parameters cho v2 list APIs.
 */
export interface ListQueryParams extends SortOptions {
    page?: number;
    itemsPerPage?: number;
    search?: string;
    filterFrom?: string;
    filterValue?: string;
    option?: "detail" | "full" | "pkey";
}
