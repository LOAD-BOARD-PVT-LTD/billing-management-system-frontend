'use client';

import { useAuth } from '@/contexts/auth-context';
import { t } from '@/utils/translations';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface LoginFormData {
  email: string;
  password: string;
}

export function getLoginErrorTranslationKey(error: string | null | undefined): string {
  if (error === 'AccessDenied') return 'errors.unauthorized';
  if (error === 'RATE_LIMITED') return 'errors.generic';
  if (error === 'ORGANIZATION_NOT_PROVISIONED') return 'errors.serverError';
  return 'errors.loginFailed';
}

interface UseLoginFormReturn {
  formData: LoginFormData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  showPassword: boolean;
  capsLockWarning: boolean;
  hasValidEmail: boolean;
  hasValidPassword: boolean;
  setFormData: (data: LoginFormData) => void;
  setErrors: (errors: Record<string, string>) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setShowPassword: (show: boolean) => void;
  setCapsLockWarning: (warning: boolean) => void;
  setRememberMe: (remember: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  validateForm: () => boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useLoginForm(): UseLoginFormReturn {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockWarning, setCapsLockWarning] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) return;

    setErrors((prev) => ({ ...prev, general: t(getLoginErrorTranslationKey(error)) }));
  }, [searchParams]);

                                                                                
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.getModifierState('CapsLock')) {
      setCapsLockWarning(true);
    } else {
      setCapsLockWarning(false);
    }
  }, []);

                                                                                
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    const normalizedEmail = formData.email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!normalizedEmail) {
      newErrors.email = t('validation.emailRequired');
    } else if (!isValidEmail) {
      newErrors.email = t('validation.emailInvalid');
    }

    if (!formData.password.trim()) {
      newErrors.password = t('validation.passwordRequired');
    } else if (formData.password.length < 3) {
      newErrors.password = t('validation.passwordMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

                                                                                
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (result.success) {
                                                    
                                                              
        await new Promise(resolve => setTimeout(resolve, 500));
                                                                          
        router.push('/dashboard');
      } else {
        setErrors({ general: result.error || t('errors.loginFailed') });
      }
    } catch {
      setErrors({ general: t('auth.serverError') });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, rememberMe, validateForm, login, router]);

                                                                                
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

                                          
    setErrors((prev) => {
      if (prev[name]) {
        return { ...prev, [name]: '' };
      }
      return prev;
    });
  }, []);

  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) && !errors.email;
  const hasValidPassword = formData.password.length >= 3 && !errors.password;

  return {
    formData,
    errors,
    isSubmitting,
    showPassword,
    capsLockWarning,
    hasValidEmail,
    hasValidPassword,
    setFormData,
    setErrors,
    setIsSubmitting,
    setShowPassword,
    setCapsLockWarning,
    setRememberMe,
    handleInputChange,
    handleKeyDown,
    validateForm,
    handleSubmit,
  };
}
