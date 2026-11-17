export function getApiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object' || !('message' in body)) return fallback;

  const { message } = body;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && message.length > 0 && message.every((item) => typeof item === 'string')) {
    return message.join('\n');
  }
  return fallback;
}
