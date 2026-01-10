import api from "./client";
import type { ApiResponse } from "./client";

// Generic Input Type matches RequestParams in client.ts
export interface ApiInput {
    headers?: Record<string, string>;
    body?: any;
    query?: any;
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

export const login = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/auth/login", { headers, body, query });
};

export const logout = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/auth/logout", { headers, body, query });
};

export const checkSessionStatus = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/auth/check-status", { headers, body, query });
};

// =============================================================================
// CLIENTS
// =============================================================================

export const getClients = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/client/get/list", { headers, query: query || body });
};

export const createClient = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/client/create", { headers, body, query });
};

export const getClientDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/client/get/detail", { headers, query: query || body });
};

export const updateClient = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/client/edit", { headers, body, query });
};

export const deleteClient = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/client/delete", { headers, body, query });
};

// =============================================================================
// ORDERS
// =============================================================================

export const getOrders = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/order/get/list", { headers, query: query || body });
};

export const createOrder = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/order/create", { headers, body, query });
};

export const getOrderDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/order/get/detail", { headers, query: query || body });
};

export const updateOrder = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/order/edit", { headers, body, query });
};

export const deleteOrder = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/order/delete", { headers, body, query });
};

export const getOrderStats = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/order/stats/accounting", { headers, query: query || body });
};

// =============================================================================
// QUOTES
// =============================================================================

export const getQuotes = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/quote/get/list", { headers, query: query || body });
};

export const createQuote = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/quote/create", { headers, body, query });
};

export const getQuoteDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/quote/get/detail", { headers, query: query || body });
};

export const updateQuote = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/quote/edit", { headers, body, query });
};

export const deleteQuote = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/quote/delete", { headers, body, query });
};

// =============================================================================
// PARAMETERS
// =============================================================================

export const getParameters = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/parameter/get/list", { headers, query: query || body });
};

export const createParameter = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/parameter/create", { headers, body, query });
};

export const getParameterDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/parameter/get/detail", { headers, query: query || body });
};

export const updateParameter = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/parameter/edit", { headers, body, query });
};

export const deleteParameter = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/parameter/delete", { headers, body, query });
};

// =============================================================================
// MATRICES
// =============================================================================

export const getMatrices = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/matrix/get/list", { headers, query: query || body });
};

export const createMatrix = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/matrix/create", { headers, body, query });
};

export const getMatrixDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/matrix/get/detail", { headers, query: query || body });
};

export const updateMatrix = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/matrix/edit", { headers, body, query });
};

export const deleteMatrix = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/matrix/delete", { headers, body, query });
};

export const searchMatrices = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/matrix/search", { headers, query: query || body });
};

// =============================================================================
// SAMPLE TYPES
// =============================================================================

export const getSampleTypes = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/sample-type/get/list", { headers, query: query || body });
};

export const createSampleType = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/sample-type/create", { headers, body, query });
};

export const getSampleTypeDetail = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.get("/v1/sample-type/get/detail", { headers, query: query || body });
};

export const updateSampleType = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/sample-type/edit", { headers, body, query });
};

export const deleteSampleType = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => {
    return api.post("/v1/sample-type/delete", { headers, body, query });
};

// =============================================================================
// PARAMETER GROUPS
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

// =============================================================================
// EXPORT
// =============================================================================

const apis = {
    auth: { login, logout },
    clients: { getClients, createClient, getClientDetail, updateClient, deleteClient },
    orders: { getOrders, createOrder, getOrderDetail, updateOrder, deleteOrder, getOrderStats },
    quotes: { getQuotes, createQuote, getQuoteDetail, updateQuote, deleteQuote },
    parameters: { getParameters, createParameter, getParameterDetail, updateParameter, deleteParameter },
    matrices: { getMatrices, createMatrix, getMatrixDetail, updateMatrix, deleteMatrix, searchMatrices },
    sampleTypes: { getSampleTypes, createSampleType, getSampleTypeDetail, updateSampleType, deleteSampleType },
    parameterGroups: { getParameterGroups, createParameterGroup, getParameterGroupDetail, updateParameterGroup, deleteParameterGroup },
};

export default apis;
