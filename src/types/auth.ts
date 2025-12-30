export interface User {
    id: string;
    username: string;
    email?: string;
    role: 'court_owner';
}

export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    expiresIn: number;
    user: User;
}

export interface RefreshTokenResponse {
    accessToken: string;
    expiresIn: number;
    expiresAt: string;
    tokenType: string;
}
