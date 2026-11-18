const PHONE_PATTERN = /^\+?[0-9][0-9 ]{5,18}[0-9]$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildTelUri(phone: string): string | null {
  const trimmed = phone.trim();
  if (!PHONE_PATTERN.test(trimmed)) return null;
  return `tel:${trimmed.replace(/ /g, '')}`;
}

export function buildMailUri(email: string): string | null {
  const trimmed = email.trim();
  if (!EMAIL_PATTERN.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}
