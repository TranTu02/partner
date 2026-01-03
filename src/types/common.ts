export interface ApiResponse<T = any> {
    success: boolean;
    statusCode: number;
    data?: T;
    meta?: {
        page: number;
        total: number;
        [key: string]: any;
    };
    error?: {
        code: string;
        message: string;
        traceId?: string;
        [key: string]: any;
    };
}

export interface ApiInput {
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, any>;
}
