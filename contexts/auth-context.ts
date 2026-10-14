'use client';

import type {
  AuthContextType,
  AuthState,
  LoginCredentials,
  LoginResult,
  User,
  UserRole,
} from '@/types/auth';
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslations } from '@/utils/translations';
import {
  loginRequest,
  logoutRequest,
  currentUserRequest,
} from '@/features/auth/api/auth-client';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslations();
  const [state, setState] = useState<AuthState>(initialState);
  const [authReady, setAuthReady] = useState(false);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const user = await currentUserRequest();

      setState({
        user,
        isAuthenticated: Boolean(user),
        isLoading: false,
        error: null,
      });

      return user;
    } catch {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      return null;
    }
  }, []);

  useEffect(() => {
    void refreshUser().finally(() => {
      setAuthReady(true);
    });
  }, [refreshUser]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResult> => {
      setState((previous) => ({
        ...previous,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await loginRequest(credentials);

        setState({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        return {
          success: true,
          user: result.user,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t('errors.loginFailed');

        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: message,
        });

        return {
          success: false,
          error: message,
        };
      }
    },
    [t],
  );

  const logout = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isLoading: true,
      error: null,
    }));

    try {
      await logoutRequest();
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const hasRole = useCallback(
    (role: UserRole) => state.user?.role.trim().toLowerCase() === role.trim().toLowerCase(),
    [state.user?.role],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      authReady,
      login,
      logout,
      refreshUser: async () => {
        await refreshUser();
      },
      hasRole,
    }),
    [state, authReady, login, logout, refreshUser, hasRole],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
