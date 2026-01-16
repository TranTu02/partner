import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import { toast } from "sonner";

// Define the standard response format
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

// Environment variables
const BASE_URL = import.meta.env.VITE_BACKEND_URL;
const APP_UID = import.meta.env.VITE_APP_UID;
const ACCESS_KEY = import.meta.env.VITE_ACCESS_KEY;

// Create Axios instance
const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${Cookies.get("authToken")}`,
        "Content-Type": "application/json",
        "x-app-uid": APP_UID,
        "x-access-key": ACCESS_KEY,
    },
});

// Request interceptor to add Bearer token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = Cookies.get("authToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Response interceptor for global error handling
axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error) => {
        const status = error.response?.status;
        const data = error.response?.data;

        // Custom Error Handling based on status
        if (status === 401) {
            // Don't redirect if we're already on the login page or if it's a login request
            const isLoginRequest = error.config?.url?.includes("/v1/auth/login");

            if (!isLoginRequest) {
                toast.error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");

                // Clear auth data
                Cookies.remove("authToken");
                localStorage.removeItem("user");
                localStorage.removeItem("sessionId");

                // Redirect to login (root)
                if (window.location.pathname !== "/") {
                    // Use a small delay to allow the toast to be noticed
                    setTimeout(() => {
                        window.location.href = "/?reason=401";
                    }, 1000);
                }
            }
        } else if (status === 403) {
            toast.error("Forbidden: You do not have permission.");
        } else if (status >= 500) {
            toast.error("Server Error: Something went wrong.");
        } else {
            // If the backend returns a structured error message
            if (data?.error?.message) {
                toast.error(data.error.message);
            } else {
                toast.error("An unexpected error occurred.");
            }
        }

        return Promise.reject(error);
    },
);

// Generic API Function Types
export interface RequestParams {
    headers?: Record<string, string>;
    body?: any;
    params?: any; // Legacy support
    query?: any; // New standard for Query Parameters
}

// Helper functions
const api = {
    get: async <T>(url: string, { headers, params, query }: RequestParams = {}): Promise<ApiResponse<T>> => {
        try {
            // merge params and query, preferring query if both exist
            const finalParams = { ...params, ...query };
            const response = await axiosInstance.get<ApiResponse<T>>(url, { headers, params: finalParams });
            return response.data;
        } catch (error: any) {
            return (
                error.response?.data || {
                    success: false,
                    statusCode: error.response?.status || 500,
                    error: {
                        code: "UNKNOWN_ERROR",
                        message: error.message || "An unknown error occurred",
                    },
                }
            );
        }
    },

    post: async <T>(url: string, { headers, body, query }: RequestParams = {}): Promise<ApiResponse<T>> => {
        try {
            const response = await axiosInstance.post<ApiResponse<T>>(url, body, { headers, params: query });
            return response.data;
        } catch (error: any) {
            return (
                error.response?.data || {
                    success: false,
                    statusCode: error.response?.status || 500,
                    error: {
                        code: "UNKNOWN_ERROR",
                        message: error.message || "An unknown error occurred",
                    },
                }
            );
        }
    },

    put: async <T>(url: string, { headers, body, query }: RequestParams = {}): Promise<ApiResponse<T>> => {
        try {
            const response = await axiosInstance.put<ApiResponse<T>>(url, body, { headers, params: query });
            return response.data;
        } catch (error: any) {
            return (
                error.response?.data || {
                    success: false,
                    statusCode: error.response?.status || 500,
                    error: {
                        code: "UNKNOWN_ERROR",
                        message: error.message || "An unknown error occurred",
                    },
                }
            );
        }
    },

    delete: async <T>(url: string, { headers, body, query }: RequestParams = {}): Promise<ApiResponse<T>> => {
        try {
            const response = await axiosInstance.delete<ApiResponse<T>>(url, { headers, data: body, params: query });
            return response.data;
        } catch (error: any) {
            return (
                error.response?.data || {
                    success: false,
                    statusCode: error.response?.status || 500,
                    error: {
                        code: "UNKNOWN_ERROR",
                        message: error.message || "An unknown error occurred",
                    },
                }
            );
        }
    },
};

export default api;
