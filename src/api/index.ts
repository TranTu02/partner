import api from "./client";
import type { ApiResponse } from "./client";

// Generic Input Type matches RequestParams in client.ts
export interface ApiInput {
    headers?: Record<string, string>;
    body?: any;
    query?: any;
}

// =============================================================================
// RESPONSE ADAPTER: API v2 returns data + pagination at root level
// Normalize it to our internal { success, data, meta } format
// =============================================================================

function adaptV2Response(raw: any): ApiResponse {
    if (!raw) return { success: false, statusCode: 500 };
    
    // Only skip if it's already fully adapted (has meta)
    if (raw.meta && typeof raw.success === "boolean") return raw;

    const pagination = raw.pagination || raw.meta || {};
    const data = raw.data !== undefined ? raw.data : (raw.items !== undefined ? raw.items : (Array.isArray(raw) ? raw : raw));

    // Safeguard
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

// Wrapper to call API and normalize v2 response
async function getV2<T = any>(path: string, input: ApiInput): Promise<ApiResponse<T>> {
    const raw = await api.get<any>(path, { headers: input.headers, query: input.query || input.body });
    return adaptV2Response(raw) as ApiResponse<T>;
}

async function postV2<T = any>(path: string, input: ApiInput): Promise<ApiResponse<T>> {
    const raw = await api.post<any>(path, { headers: input.headers, body: input.body, query: input.query });
    return adaptV2Response(raw) as ApiResponse<T>;
}

// =============================================================================
// AUTHENTICATION (v2: /v2/auth/...)
// =============================================================================

/** POST /v2/auth/login */
export const login = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/auth/login", { headers, body, query });
};

/** POST /v2/auth/logout */
export const logout = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/auth/logout", { headers, body, query });
};

/** GET /v2/auth/verify */
export const verifyToken = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/auth/verify", { headers, query: query || body });
};

/**
 * @deprecated Alias cho verifyToken để giữ compatibility với AuthContext cũ
 */
export const checkSessionStatus = verifyToken;

// =============================================================================
// CLIENTS  (v2: /v2/clients/...)
// =============================================================================

/** GET /v2/clients/get/list */
export const getClients = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/clients/get/list", { headers, query: query || body });
};

/** POST /v2/clients/create */
export const createClient = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/clients/create", { headers, body, query });
};

/** GET /v2/clients/get/detail?id={clientId} */
export const getClientDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/clients/get/detail", { headers, query: query || body });
};

/** POST /v2/clients/update */
export const updateClient = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/clients/update", { headers, body, query });
};

/**
 * @deprecated API v2 không có delete endpoint trong tài liệu CRM.
 * Endpoint này có thể không hoạt động - xem MISSING_ITEMS.md
 */
export const deleteClient = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/clients/delete", { headers, body, query });
};

// =============================================================================
// ORDERS  (v2: /v2/orders/...)
// =============================================================================

/** GET /v2/orders/get/list */
export const getOrders = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/orders/get/list", { headers, query: query || body });
};

/** POST /v2/orders/create */
export const createOrder = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/orders/create", { headers, body, query });
};

/** GET /v2/orders/get/detail?id={orderId} */
export const getOrderDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/orders/get/detail", { headers, query: query || body });
};

/** POST /v2/orders/update */
export const updateOrder = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/orders/update", { headers, body, query });
};

/**
 * @deprecated API v2 không có delete endpoint trong tài liệu CRM.
 * Endpoint này có thể không hoạt động - xem MISSING_ITEMS.md
 */
export const deleteOrder = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/orders/delete", { headers, body, query });
};

/** GET /v2/orders/get/stats */
export const getOrderStats = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/orders/get/stats", { headers, query: query || body });
};

/** POST /v2/orders/generate-uri */
export const generateOrderUri = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/orders/generate-uri", { headers, body, query });
};

/** POST /v2/orders/check-uri */
export const checkOrderUri = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/orders/check-uri", { headers, body, query });
};

// =============================================================================
// QUOTES  (v2: /v2/quotes/...)
// =============================================================================

/** GET /v2/quotes/get/list */
export const getQuotes = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/quotes/get/list", { headers, query: query || body });
};

/** POST /v2/quotes/create */
export const createQuote = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/quotes/create", { headers, body, query });
};

/** GET /v2/quotes/get/detail?id={quoteId} */
export const getQuoteDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/quotes/get/detail", { headers, query: query || body });
};

/** POST /v2/quotes/update */
export const updateQuote = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/quotes/update", { headers, body, query });
};

/**
 * @deprecated API v2 không có delete endpoint trong tài liệu CRM.
 * Endpoint này có thể không hoạt động - xem MISSING_ITEMS.md
 */
export const deleteQuote = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/quotes/delete", { headers, body, query });
};

// =============================================================================
// PARAMETERS (v2: /v2/parameters/...)
// =============================================================================

/** GET /v2/parameters/get/list */
export const getParameters = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/parameters/get/list", { headers, query: query || body });
};

/** POST /v2/parameters/create */
export const createParameter = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/parameters/create", { headers, body, query });
};

/** GET /v2/parameters/get/detail?parameterId={id} */
export const getParameterDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/parameters/get/detail", { headers, query: query || body });
};

/** GET /v2/parameters/get/full?parameterId={id} */
export const getParameterFull = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/parameters/get/full", { headers, query: query || body });
};

/** POST /v2/parameters/update */
export const updateParameter = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/parameters/update", { headers, body, query });
};

/** POST /v2/parameters/delete */
export const deleteParameter = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/parameters/delete", { headers, body, query });
};

// =============================================================================
// PROTOCOLS (v2: /v2/protocols/...)
// =============================================================================

/** GET /v2/protocols/get/list */
export const getProtocols = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/protocols/get/list", { headers, query: query || body });
};

/** POST /v2/protocols/create */
export const createProtocol = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/protocols/create", { headers, body, query });
};

/** GET /v2/protocols/get/detail?protocolId={id} */
export const getProtocolDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/protocols/get/detail", { headers, query: query || body });
};

/** GET /v2/protocols/get/full?protocolId={id} */
export const getProtocolFull = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/protocols/get/full", { headers, query: query || body });
};

/** POST /v2/protocols/update */
export const updateProtocol = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/protocols/update", { headers, body, query });
};

/** POST /v2/protocols/delete */
export const deleteProtocol = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/protocols/delete", { headers, body, query });
};

// =============================================================================
// MATRICES (v2: /v2/matrices/...)
// =============================================================================

/** GET /v2/matrices/get/list */
export const getMatrices = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/matrices/get/list", { headers, query: query || body });
};

/** POST /v2/matrices/create */
export const createMatrix = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/matrices/create", { headers, body, query });
};

/** GET /v2/matrices/get/detail?matrixId={id} */
export const getMatrixDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/matrices/get/detail", { headers, query: query || body });
};

/** GET /v2/matrices/get/full?matrixId={id} */
export const getMatrixFull = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/matrices/get/full", { headers, query: query || body });
};

/** POST /v2/matrices/update */
export const updateMatrix = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/matrices/update", { headers, body, query });
};

/** POST /v2/matrices/delete */
export const deleteMatrix = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/matrices/delete", { headers, body, query });
};

/** GET /v2/matrices/search (Legacy wrapper) */
export const searchMatrices = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/matrices/get/list", { headers, query: query || body });
};

// =============================================================================
// SAMPLE TYPES (v2: /v2/sample-types/...)
// =============================================================================

/** GET /v2/sample-types/get/list */
export const getSampleTypes = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/sample-types/get/list", { headers, query: query || body });
};

/** POST /v2/sample-types/create */
export const createSampleType = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/sample-types/create", { headers, body, query });
};

/** GET /v2/sample-types/get/detail?sampleTypeId={id} */
export const getSampleTypeDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/sample-types/get/detail", { headers, query: query || body });
};

/** POST /v2/sample-types/update */
export const updateSampleType = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/sample-types/update", { headers, body, query });
};

/** POST /v2/sample-types/delete */
export const deleteSampleType = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return postV2("/v2/sample-types/delete", { headers, body, query });
};

// =============================================================================
// PARAMETER GROUPS (v1 - chưa có tài liệu v2)
// =============================================================================

export const getParameterGroups = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/parameter-group/get/list", { headers, query: query || body });
};

export const createParameterGroup = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/parameter-group/create", { headers, body, query });
};

export const getParameterGroupDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/parameter-group/get/detail", { headers, query: query || body });
};

export const updateParameterGroup = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/parameter-group/edit", { headers, body, query });
};

export const deleteParameterGroup = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/parameter-group/delete", { headers, body, query });
};

/** POST /v2/convert-html-to-pdf/form-1 (Phiếu gửi mẫu) */
export const convertHtmlToPdfForm1 = async ({ headers, body, query }: ApiInput): Promise<any> => {
    return api.download("/v2/convert-html-to-pdf/form-1", { headers, body, query });
};

/** POST /v2/convert-html-to-pdf/form-2 (Đơn hàng, Báo giá) */
export const convertHtmlToPdfForm2 = async ({ headers, body, query }: ApiInput): Promise<any> => {
    return api.download("/v2/convert-html-to-pdf/form-2", { headers, body, query });
};

/** @deprecated Alias cho convertHtmlToPdfForm2 */
export const convertHtmlToPdf = convertHtmlToPdfForm2;

// =============================================================================
// ENUMS (v2: /v2/enum/...)
// =============================================================================

/** GET /v2/enum/get/list */
export const getEnumList = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return getV2("/v2/enum/get/list", { headers, query: query || body });
};

// =============================================================================
// EXPORT
// =============================================================================

const apis = {
    auth: { login, logout, checkSessionStatus },
    clients: { getClients, createClient, getClientDetail, updateClient, deleteClient },
    orders: { getOrders, createOrder, getOrderDetail, updateOrder, deleteOrder, getOrderStats, generateOrderUri, checkOrderUri },
    quotes: { getQuotes, createQuote, getQuoteDetail, updateQuote, deleteQuote },
    parameters: { getParameters, createParameter, getParameterDetail, getParameterFull, updateParameter, deleteParameter },
    protocols: { getProtocols, createProtocol, getProtocolDetail, getProtocolFull, updateProtocol, deleteProtocol },
    matrices: { getMatrices, createMatrix, getMatrixDetail, getMatrixFull, updateMatrix, deleteMatrix, searchMatrices },
    sampleTypes: { getSampleTypes, createSampleType, getSampleTypeDetail, updateSampleType, deleteSampleType },
    parameterGroups: { getParameterGroups, createParameterGroup, getParameterGroupDetail, updateParameterGroup, deleteParameterGroup },
    utils: { convertHtmlToPdf, convertHtmlToPdfForm1, convertHtmlToPdfForm2 },
    enums: { getEnumList },
};

export default apis;
