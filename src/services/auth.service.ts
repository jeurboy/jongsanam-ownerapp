import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginCredentials, LoginResponse, RefreshTokenResponse, User } from '../types/auth';
import env from '../config/env';

const API_BASE_URL = env.apiUrl;

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER: 'user',
};

export const authService = {
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            console.log('Attempting login to:', `${API_BASE_URL}/api/auth/login`);

            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...credentials,
                    role: 'court_owner',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle validation errors from Zod (returned in details)
                if (data.details && Array.isArray(data.details.issues)) {
                    const errorMessages = data.details.issues.map((err: any) => {
                        const field = err.path?.join('.') || 'field';
                        return `${field}: ${err.message}`;
                    }).join('\n');
                    throw new Error(errorMessages || 'Validation error');
                }
                // Handle validation errors array format
                if (data.errors && Array.isArray(data.errors)) {
                    const errorMessages = data.errors.map((err: any) => {
                        if (err.path && err.message) {
                            return `${err.path.join('.')}: ${err.message}`;
                        }
                        return err.message || err;
                    }).join('\n');
                    throw new Error(errorMessages || 'Validation error');
                }
                throw new Error(data.error || data.message || 'Login failed');
            }

            // Store tokens and user
            await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
            await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async refreshAccessToken(): Promise<string | null> {
        try {
            const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

            if (!refreshToken) {
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                // Refresh token is invalid/expired - clear all tokens
                await this.logout();
                return null;
            }

            const data: RefreshTokenResponse = await response.json();

            // Store new access token
            await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);

            return data.accessToken;
        } catch (error) {
            console.error('Refresh token error:', error);
            return null;
        }
    },

    async logout(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.ACCESS_TOKEN,
                STORAGE_KEYS.REFRESH_TOKEN,
                STORAGE_KEYS.USER,
            ]);
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    },

    async getStoredAccessToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        } catch (error) {
            console.error('Get access token error:', error);
            return null;
        }
    },

    async getStoredRefreshToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        } catch (error) {
            console.error('Get refresh token error:', error);
            return null;
        }
    },

    async getStoredUser(): Promise<User | null> {
        try {
            const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    },

    async updateStoredAccessToken(token: string): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    },
};
