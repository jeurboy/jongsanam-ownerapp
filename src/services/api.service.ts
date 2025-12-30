import { authService } from './auth.service';
import env from '../config/env';

const API_BASE_URL = env.apiUrl;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiRequestOptions {
    method?: HttpMethod;
    body?: any;
    headers?: Record<string, string>;
    skipAuth?: boolean;
}

interface ApiResponse<T = any> {
    data: T | null;
    error: string | null;
    status: number;
}

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Callback to notify AuthContext when refresh fails
let onAuthFailure: (() => void) | null = null;

export const apiService = {
    setOnAuthFailure(callback: () => void) {
        onAuthFailure = callback;
    },

    async request<T = any>(
        endpoint: string,
        options: ApiRequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const { method = 'GET', body, headers = {}, skipAuth = false } = options;

        const makeRequest = async (token: string | null): Promise<Response> => {
            const requestHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                ...headers,
            };

            if (!skipAuth && token) {
                requestHeaders['Authorization'] = `Bearer ${token}`;
            }

            return fetch(`${API_BASE_URL}${endpoint}`, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
            });
        };

        try {
            let token = await authService.getStoredAccessToken();
            let response = await makeRequest(token);

            // If unauthorized, try to refresh the token
            if (response.status === 401 && !skipAuth) {
                const responseData = await response.clone().json().catch(() => ({}));
                const errorStr = (responseData.error || responseData.message || '').toLowerCase();
                const isTokenExpired =
                    errorStr.includes('expired') ||
                    errorStr.includes('jwt expired') ||
                    errorStr.includes('invalid token');
                const isMissingToken =
                    errorStr.includes('missing authorization') ||
                    !token;

                if (isTokenExpired || isMissingToken) {
                    // Ensure only one refresh happens at a time
                    if (!isRefreshing) {
                        isRefreshing = true;
                        refreshPromise = authService.refreshAccessToken();
                    }

                    const newToken = await refreshPromise;
                    isRefreshing = false;
                    refreshPromise = null;

                    if (newToken) {
                        // Retry the request with new token
                        response = await makeRequest(newToken);
                    } else {
                        // Refresh failed - notify auth context
                        if (onAuthFailure) {
                            onAuthFailure();
                        }
                        return {
                            data: null,
                            error: 'Session expired. Please login again.',
                            status: 401,
                        };
                    }
                } else {
                    // Not a token expiry issue
                    if (onAuthFailure) {
                        onAuthFailure();
                    }
                    return {
                        data: null,
                        error: responseData.error || 'Unauthorized',
                        status: 401,
                    };
                }
            }

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    data: null,
                    error: data?.error || data?.message || `Request failed with status ${response.status}`,
                    status: response.status,
                };
            }

            return {
                data,
                error: null,
                status: response.status,
            };
        } catch (error) {
            console.error('API request error:', error);
            return {
                data: null,
                error: error instanceof Error ? error.message : 'Network error',
                status: 0,
            };
        }
    },

    // Convenience methods
    async get<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    },

    async post<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...options, method: 'POST', body });
    },

    async put<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...options, method: 'PUT', body });
    },

    async patch<T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
    },

    async delete<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    },
};
