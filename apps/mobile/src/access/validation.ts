export type LoginErrors = { identifier?: 'required'; password?: 'required' };

export function validateLogin(identifier: string, password: string): LoginErrors {
  return {
    ...(identifier.trim() ? {} : { identifier: 'required' as const }),
    ...(password ? {} : { password: 'required' as const }),
  };
}

export function validateEmail(email: string): 'required' | 'invalid' | undefined {
  const value = email.trim();
  if (!value) return 'required';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : 'invalid';
}
