import api from "./client";
import type { ApiResponse } from "./client";
import type { ApiInput } from "./index";
import Cookies from "js-cookie";

// Key names — centralize them so they're easy to change
export const CUSTOMER_TOKEN_KEY = "customerAuthToken";
export const CUSTOMER_DATA_KEY = "customer";

// =============================================================================
// RESPONSE ADAPTER: Customer API v1 returns data + pagination at root level
// =============================================================================

function adaptCustomerResponse(raw: any): ApiResponse {
    if (!raw) return { success: false, statusCode: 500 };

    // Only skip if it's already fully adapted (has meta)
    if (raw.meta && typeof raw.success === "boolean") return raw;

    // Extract the actual payload — backend wraps in { success, data, pagination }
    const hasDataField = raw.data !== undefined;
    const data = hasDataField ? raw.data : raw.items !== undefined ? raw.items : raw;
    const pagination = raw.pagination || raw.meta || {};

    // Safeguard: If backend returns 0 but we have items, use items.length as floor
    let total = Number(pagination.totalItems ?? pagination.total ?? raw.totalItems ?? raw.total ?? 0);
    if (Array.isArray(data) && data.length > total) total = data.length;

    const itemsPerPage = Number(pagination.itemsPerPage ?? raw.itemsPerPage ?? 20);
    const totalPages = Number(pagination.totalPages ?? raw.totalPages ?? (total > 0 ? Math.ceil(total / itemsPerPage) : 0));
    const page = Number(pagination.page ?? raw.page ?? 1);

    // List responses: array data or pagination present
    if (Array.isArray(data) || total > 0) {
        return { success: true, statusCode: 200, data, meta: { page, total, totalPages, itemsPerPage } };
    }
    // Detail responses: single object extracted from raw.data
    // IMPORTANT: return `data` (the extracted payload), NOT `raw` (which still has success/statusCode wrappers)
    return { success: raw.success !== false, statusCode: raw.statusCode || 200, data };
}

/** Build Authorization header from customerAuthToken cookie */
function customerAuthHeader(): Record<string, string> {
    const token = Cookies.get(CUSTOMER_TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getCustomer<T = any>(path: string, input: ApiInput): Promise<ApiResponse<T>> {
    const headers = { ...customerAuthHeader(), ...(input.headers || {}) };
    const raw = await api.get<any>(path, { headers, query: input.query || input.body });
    return adaptCustomerResponse(raw) as ApiResponse<T>;
}

async function postCustomer<T = any>(path: string, input: ApiInput): Promise<ApiResponse<T>> {
    const headers = { ...customerAuthHeader(), ...(input.headers || {}) };
    const raw = await api.post<any>(path, { headers, body: input.body, query: input.query });
    return adaptCustomerResponse(raw) as ApiResponse<T>;
}

// =============================================================================
// CUSTOMER AUTHENTICATION (/customer/v1/auth/:action)
// =============================================================================

/**
 * POST /customer/v1/auth/request-otp
 * Body: { clientId: string }
 * Response: { success, data: { maskedEmail, message } }
 */
export const customerLoginRequest = async (input: ApiInput): Promise<ApiResponse> => {
    return postCustomer("/customer/v1/auth/request-otp", input);
};

/**
 * POST /customer/v1/auth/login
 * Body: { clientId: string, otpCode: string }
 * Response: { success, data: { token: "SC_xxx", identity: { clientId, clientName, roles } } }
 */
export const customerLoginVerify = async (input: ApiInput): Promise<ApiResponse> => {
    return postCustomer("/customer/v1/auth/login", input);
};

/**
 * GET /customer/v1/auth/me
 * Header: Authorization: Bearer <SC_token>
 * Response: { success, data: client profile + permissions }
 */
export const customerMe = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/auth/me", input);
};

/**
 * POST /customer/v1/auth/logout
 * Header: Authorization: Bearer <SC_token>
 * Response: { success, data: null }
 */
export const customerLogout = async (input: ApiInput): Promise<ApiResponse> => {
    return postCustomer("/customer/v1/auth/logout", input);
};

// =============================================================================
// CUSTOMER RESOURCES (/customer/v1/:resource/:action)
// =============================================================================

// --- Clients ---
/** GET /customer/v1/clients/get/detail */
export const customerGetProfile = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/clients/get/detail", input);
};

/** POST /customer/v1/clients/update */
export const customerUpdateProfile = async (input: ApiInput): Promise<ApiResponse> => {
    return postCustomer("/customer/v1/clients/update", input);
};

// --- Orders ---
/** GET /customer/v1/orders/get/list */
export const customerGetOrders = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/orders/get/list", input);
};

/** GET /customer/v1/orders/get/detail */
export const customerGetOrderDetail = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/orders/get/detail", input);
};

/** POST /customer/v1/orders/create */
export const customerCreateOrder = async (input: ApiInput): Promise<ApiResponse> => {
    return postCustomer("/customer/v1/orders/create", input);
};

/** POST /customer/v1/orders/update */
export const customerUpdateOrder = async (input: ApiInput): Promise<ApiResponse> => {
    return postCustomer("/customer/v1/orders/update", input);
};

// --- Quotes ---
/** GET /customer/v1/quotes/get/list */
export const customerGetQuotes = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/quotes/get/list", input);
};

/** GET /customer/v1/quotes/get/detail */
export const customerGetQuoteDetail = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/quotes/get/detail", input);
};

/** POST /customer/v1/quotes/create */
export const customerCreateQuote = async (input: ApiInput): Promise<ApiResponse> => {
    return postCustomer("/customer/v1/quotes/create", input);
};

/** POST /customer/v1/quotes/update */
export const customerUpdateQuote = async (input: ApiInput): Promise<ApiResponse> => {
    return postCustomer("/customer/v1/quotes/update", input);
};

// --- Parameters (Read-only) ---
/** GET /customer/v1/parameters/get/list */
export const customerGetParameters = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/parameters/get/list", input);
};

// --- Matrices (Read-only) ---
/** GET /customer/v1/matrices/get/list */
export const customerGetMatrices = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/matrices/get/list", input);
};

/** GET /customer/v1/matrices/get/detail?matrixId=... */
export const customerGetMatrixDetail = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/matrices/get/detail", input);
};

// --- Parameter Groups (Read-only) ---
/** GET /customer/v1/parameterGroups/get/list */
export const customerGetParameterGroups = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/parameterGroups/get/list", input);
};

/** GET /customer/v1/parameterGroups/get/full */
export const customerGetParameterGroupFull = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/parameterGroups/get/full", input);
};

// --- Sample Types (Read-only) ---
/** GET /customer/v1/sampleTypes/get/list — default itemsPerPage: 100 */
export const customerGetSampleTypes = async (input: ApiInput): Promise<ApiResponse> => {
    const query = { itemsPerPage: 100, ...(input.query || {}) };
    return getCustomer("/customer/v1/sampleTypes/get/list", { ...input, query });
};

/** GET /customer/v1/sampleTypes/get/detail?sampleTypeId=... */
export const customerGetSampleTypeDetail = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/customer/v1/sampleTypes/get/detail", input);
};

// =============================================================================
// FILE & DOCUMENT APIs (/v2/files/:action)
// =============================================================================

/**
 * POST /v2/files/upload
 * Content-Type: multipart/form-data
 */
export const fileUpload = async (input: ApiInput): Promise<ApiResponse> => {
    const headers = { ...customerAuthHeader(), ...(input.headers || {}) };
    const raw = await api.post<any>("/v2/files/upload", { headers, body: input.body, query: input.query });
    return adaptCustomerResponse(raw);
};

/** Helper: build a FormData for file upload with optional commonKeys & fileTags */
export function buildFileUploadFormData(file: File, opts?: { commonKeys?: string[]; fileTags?: string[] }): FormData {
    const fd = new FormData();

    // Sanitize filename for the multipart header to avoid encoding issues
    const sanitizedName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^\x00-\x7F]/g, ""); // Remove any remaining non-ASCII characters

    fd.append("file", file, sanitizedName);
    fd.append("fileName", file.name); // Send the original Vietnamese name as a separate field

    if (opts?.commonKeys?.length) fd.append("commonKeys", JSON.stringify(opts.commonKeys));
    if (opts?.fileTags?.length) fd.append("fileTags", JSON.stringify(opts.fileTags));
    return fd;
}

/**
 * GET /v2/files/get/url
 * Query: { id: string, expiresIn?: number }
 */
export const fileGetUrl = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/v2/files/get/url", input);
};

/**
 * GET /v2/files/get/detail
 * Query: { id: string }
 */
export const fileGetDetail = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/v2/files/get/detail", input);
};

/**
 * GET /v2/files/get/list
 * Query: { page, itemsPerPage, search, ... }
 */
export const fileGetList = async (input: ApiInput): Promise<ApiResponse> => {
    return getCustomer("/v2/files/get/list", input);
};

/**
 * POST /v2/files/delete
 * Body: { fileId: string }
 */
export const fileDelete = async (input: ApiInput): Promise<ApiResponse> => {
    return postCustomer("/v2/files/delete", input);
};
