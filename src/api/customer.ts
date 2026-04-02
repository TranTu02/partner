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

    const data = raw.data !== undefined ? raw.data : (raw.items !== undefined ? raw.items : (Array.isArray(raw) ? raw : raw));
    const pagination = raw.pagination || raw.meta || {};
    
    // Safeguard: If backend returns 0 but we have items, use items.length as floor
    let total = Number(pagination.totalItems ?? pagination.total ?? raw.totalItems ?? raw.total ?? 0);
    if (Array.isArray(data) && data.length > total) total = data.length;

    const itemsPerPage = Number(pagination.itemsPerPage ?? raw.itemsPerPage ?? 20);
    const totalPages = Number(pagination.totalPages ?? raw.totalPages ?? (total > 0 ? Math.ceil(total / itemsPerPage) : 0));
    const page = Number(pagination.page ?? raw.page ?? 1);

    if (Array.isArray(data) || total > 0) {
        return { success: true, statusCode: 200, data, meta: { page, total, totalPages, itemsPerPage } };
    }
    return { success: true, statusCode: 200, data: raw };
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
