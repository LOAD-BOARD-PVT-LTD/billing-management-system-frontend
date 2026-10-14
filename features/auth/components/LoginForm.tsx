'use client';

import { motion } from 'framer-motion';
import { LoginActions } from './LoginActions';
import { LoginFields } from './LoginFields';
import { useLoginForm } from '@/features/auth/hooks/useLoginForm';

export function LoginForm() {
  const {
    formData,
    errors,
    isSubmitting,
    showPassword,
    capsLockWarning,
    hasValidEmail,
    hasValidPassword,
    handleInputChange,
    handleKeyDown,
    setShowPassword,
    handleSubmit,
  } = useLoginForm();

  return (
    <motion.form
      className="space-y-2.5"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      aria-busy={isSubmitting}
      aria-live="polite"
    >
      <LoginFields
        formData={formData}
        errors={errors}
        showPassword={showPassword}
        capsLockWarning={capsLockWarning}
        hasValidEmail={hasValidEmail}
        hasValidPassword={hasValidPassword}
        handleInputChange={handleInputChange}
        handleKeyDown={handleKeyDown}
        setShowPassword={setShowPassword}
        isSubmitting={isSubmitting}
      />

      <LoginActions
        isSubmitting={isSubmitting}
      />
    </motion.form>
  );
}

