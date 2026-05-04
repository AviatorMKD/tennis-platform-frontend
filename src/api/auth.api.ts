import { apiClient } from './client';

export type LoginRequest = {
    email: string;
    password: string;
};

export type LoginResponse = {
    id: number;
    token: string;
    email: string;
    username: string;
    role: string;
    emailVerified: boolean;
    isActive: boolean;
};

export type RegisterRequest = {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
    phone: string;
    birthYear: number | null;
    gender: string;
    experienceLevel: number | null;
    turnstileToken: string;
};

export type RegisterResponse = {
    id: number;
    email: string;
    username: string;
    fullName: string;
    emailVerified: boolean;
    message: string;
};

export type VerifyEmailRequest = {
    token: string;
};

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/Auth/login', payload);
    return response.data;
}

export async function registerRequest(payload: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/api/Auth/register', payload);
    return response.data;
}

export async function verifyEmailRequest(payload: VerifyEmailRequest): Promise<void> {
    await apiClient.post('/api/Auth/verify-email', payload);
}