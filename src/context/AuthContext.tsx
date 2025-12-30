import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { apiService } from '../services/api.service';
import { AuthState, LoginCredentials } from '../types/auth';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    tryRefreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: true,
        isAuthenticated: false,
    });

    const handleAuthFailure = useCallback(() => {
        setState({
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            isAuthenticated: false,
        });
    }, []);

    useEffect(() => {
        // Register auth failure callback with API service
        apiService.setOnAuthFailure(handleAuthFailure);
        checkAuth();
    }, [handleAuthFailure]);

    const checkAuth = async () => {
        try {
            const accessToken = await authService.getStoredAccessToken();
            const refreshTokenValue = await authService.getStoredRefreshToken();
            const user = await authService.getStoredUser();

            if (accessToken && refreshTokenValue && user) {
                setState({
                    user,
                    accessToken,
                    refreshToken: refreshTokenValue,
                    isLoading: false,
                    isAuthenticated: true,
                });
            } else {
                setState({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isLoading: false,
                    isAuthenticated: false,
                });
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setState({
                user: null,
                accessToken: null,
                refreshToken: null,
                isLoading: false,
                isAuthenticated: false,
            });
        }
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            setState(prev => ({ ...prev, isLoading: true }));
            const response = await authService.login(credentials);

            setState({
                user: response.user,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
                isLoading: false,
                isAuthenticated: true,
            });
        } catch (error) {
            setState(prev => ({ ...prev, isLoading: false }));
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
            setState({
                user: null,
                accessToken: null,
                refreshToken: null,
                isLoading: false,
                isAuthenticated: false,
            });
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    };

    const tryRefreshToken = async (): Promise<boolean> => {
        try {
            const newToken = await authService.refreshAccessToken();
            if (newToken) {
                setState(prev => ({ ...prev, accessToken: newToken }));
                return true;
            }
            handleAuthFailure();
            return false;
        } catch (error) {
            console.error('Refresh token error:', error);
            handleAuthFailure();
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout, tryRefreshToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
