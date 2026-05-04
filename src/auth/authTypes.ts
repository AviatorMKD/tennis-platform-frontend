export type AuthUser = {
    id: number;
    token: string;
    email: string;
    username: string;
    role: string;
    emailVerified: boolean;
    isActive: boolean;
};

export type AuthContextValue = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (user: AuthUser) => void;
    logout: () => void;
};