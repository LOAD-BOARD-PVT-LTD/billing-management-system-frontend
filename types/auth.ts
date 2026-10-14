
export enum Role {
    Admin = 'Admin',
    User = 'User',
    Operator = 'Operator',
}

export type UserRole = typeof Role[keyof typeof Role];
export type User= {
   id: string;
    name?: string;
   email: string;
   role: UserRole;
}

export type LoginCredentials = {
    email: string;
    password: string;
}

export type AuthState = {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error : string | null;
}

export type LoginResult =
  | { success: true; user: User }
  | { success: false; error: string };


export type AuthContextType = AuthState & {
    authReady: boolean;
    login: (credentials: LoginCredentials) => Promise<LoginResult>;
    logout: () => void;
    hasRole: (role: UserRole) => boolean;
}